#!/usr/bin/env node
/**
 * Menerapkan migrasi basis data, dengan DIRECT_URL yang boleh tidak diisi.
 *
 * Skema mendeklarasikan directUrl karena `prisma migrate` tidak bisa berjalan
 * lewat pooler transaction-mode: pooler memutus sesi di antara pernyataan,
 * sedangkan migrasi butuh advisory lock yang hidup sepanjang sesi.
 *
 * Tapi tidak semua penggelaran memakai pooler. Untuk basis data yang disambung
 * langsung, dua variabel dengan isi yang sama hanyalah satu langkah tambahan
 * yang gampang terlupa — dan lupanya baru ketahuan saat build gagal. Karena itu
 * DIRECT_URL yang kosong diisi dari DATABASE_URL, bukan dijadikan kesalahan.
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

const direct = process.env.DIRECT_URL || readFromEnvFile('DIRECT_URL');

if (!direct) {
  const database = process.env.DATABASE_URL || readFromEnvFile('DATABASE_URL');
  if (database) {
    process.env.DIRECT_URL = database;
    console.log(
      'DIRECT_URL tidak diisi; migrasi memakai DATABASE_URL.\n' +
        'Bila basis data berada di balik connection pooler, isi DIRECT_URL dengan\n' +
        'koneksi langsungnya — migrasi tidak bisa berjalan lewat pooler.',
    );
  }
  else {
    // Tanpa penjagaan ini Prisma mengeluhkan DIRECT_URL — variabel yang memang
    // boleh kosong — dan menyembunyikan bahwa DATABASE_URL yang sebenarnya hilang.
    console.error(
      'DATABASE_URL belum diisi, jadi tidak ada basis data yang bisa dimigrasi.\n' +
        'Isi DATABASE_URL dengan koneksi PostgreSQL Anda. Lihat .env.example.',
    );
    process.exit(1);
  }
}

const result = spawnSync('prisma', ['migrate', 'deploy'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
