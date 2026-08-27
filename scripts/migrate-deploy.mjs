#!/usr/bin/env node
/**
 * Menerapkan migrasi basis data, dengan DIRECT_URL yang boleh tidak diisi.
 *
 * Skema mendeklarasikan directUrl karena `prisma migrate` tidak bisa berjalan
 * lewat pooler transaction-mode: pooler memutus sesi di antara pernyataan,
 * sedangkan migrasi butuh advisory lock yang hidup sepanjang sesi.
 *
 * Tapi DIRECT_URL yang kosong belum tentu berarti tidak ada koneksi langsung.
 * Neon dan Vercel Postgres menyuntikkan miliknya dengan nama lain, jadi nama-nama
 * itu diperiksa lebih dulu. Baru bila benar-benar tidak ada, DATABASE_URL yang
 * dipakai — cukup untuk Postgres tanpa pooler, dan disertai peringatan bagi yang
 * memakainya.
 *
 * Prisma Client saat runtime tidak pernah memakai directUrl, jadi nilai
 * pengganti ini hanya hidup selama proses migrasi.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Membaca satu kunci dari berkas .env.
 *
 * Prisma memuat .env sendiri, jadi variabel bisa ada di sana walau tidak ada di
 * process.env. Tanpa memeriksanya, nilai pengganti akan menimpa DIRECT_URL yang
 * sebenarnya sudah diisi dengan benar untuk pengembangan lokal.
 */
function readFromEnvFile(key) {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`, 'm'));
    if (!match) return undefined;
    return match[1].trim().replace(/^["']|["']$/g, '') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Urutan pencarian koneksi langsung.
 *
 * Penyedia Postgres terkelola menyuntikkan variabelnya sendiri ke Vercel dengan
 * nama masing-masing, dan namanya bukan DIRECT_URL. Memakainya lebih dulu
 * membuat integrasi Neon maupun Supabase langsung jalan tanpa variabel tambahan
 * yang harus disalin tangan — dan salah salin di sini berarti migrasi berjalan
 * lewat pooler, yang gagal dengan pesan yang tidak menunjuk penyebabnya.
 *
 * DATABASE_URL sengaja tidak masuk daftar ini: ia justru koneksi ber-pooler yang
 * ingin dihindari. Ia hanya dipakai sebagai jalan terakhir, dengan peringatan.
 */
const DIRECT_CANDIDATES = [
  'DIRECT_URL', // diisi sendiri oleh pengguna
  'DATABASE_URL_UNPOOLED', // integrasi Neon di Vercel
  'POSTGRES_URL_NON_POOLING', // Vercel Postgres & varian lama Neon
];

function resolve(key) {
  return process.env[key] || readFromEnvFile(key);
}

const found = DIRECT_CANDIDATES.map((key) => [key, resolve(key)]).find(([, value]) => value);

if (!found) {
  const database = resolve('DATABASE_URL');
  if (!database) {
    // Tanpa penjagaan ini Prisma mengeluhkan DIRECT_URL — variabel yang memang
    // boleh kosong — dan menyembunyikan bahwa DATABASE_URL yang sebenarnya hilang.
    console.error(
      'DATABASE_URL belum diisi, jadi tidak ada basis data yang bisa dimigrasi.\n' +
        'Isi DATABASE_URL dengan koneksi PostgreSQL Anda. Lihat .env.example.',
    );
    process.exit(1);
  }
  process.env.DIRECT_URL = database;
  console.log(
    'Tidak ada koneksi langsung yang ditemukan; migrasi memakai DATABASE_URL.\n' +
      'Bila basis data berada di balik connection pooler, migrasi ini akan gagal —\n' +
      'isi DIRECT_URL dengan koneksi langsungnya (host tanpa "-pooler").',
  );
} else if (found[0] !== 'DIRECT_URL') {
  process.env.DIRECT_URL = found[1];
  console.log(`Migrasi memakai koneksi langsung dari ${found[0]}.`);
}

const result = spawnSync('prisma', ['migrate', 'deploy'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
