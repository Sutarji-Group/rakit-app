import { Quote } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Bukti sosial landing (PRD A5).
 *
 * Seluruh logo di bawah adalah wordmark SVG buatan sendiri untuk perusahaan
 * fiktif: tidak ada berkas gambar yang diunduh dari internet, sehingga bagian
 * ini tidak menambah satu pun permintaan jaringan pada koneksi seluler.
 * Nama-nama sengaja dibuat generik agar tidak menyerupai merek yang nyata.
 */

interface ClientMark {
  name: string;
  /** Sektor usaha — dipakai sebagai keterangan bagi pembaca layar. */
  sector: string;
  /** Bentuk penanda di depan nama, dibangun dari SVG sederhana. */
  glyph: 'blok' | 'gelombang' | 'daun' | 'segitiga' | 'lingkaran' | 'kotak';
}

const CLIENT_MARKS: ClientMark[] = [
  { name: 'Nusantara Logistik', sector: 'Distribusi & pergudangan', glyph: 'blok' },
  { name: 'Sinar Rejeki Group', sector: 'Grosir bahan bangunan', glyph: 'segitiga' },
  { name: 'Griya Pangan', sector: 'Produsen makanan olahan', glyph: 'daun' },
  { name: 'Bahtera Mandiri', sector: 'Ekspedisi laut', glyph: 'gelombang' },
  { name: 'Karya Tani Jaya', sector: 'Agribisnis', glyph: 'lingkaran' },
  { name: 'Mitra Sehat Farma', sector: 'Distribusi alat kesehatan', glyph: 'kotak' },
];

function Glyph({ shape }: { shape: ClientMark['glyph'] }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" aria-hidden="true">
      {shape === 'blok' && (
        <>
          <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9" />
          <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.45" />
        </>
      )}
      {shape === 'segitiga' && (
        <path d="M12 3.5 21 20H3L12 3.5Z" fill="currentColor" opacity="0.85" />
      )}
      {shape === 'daun' && (
        <path
          d="M20 4c0 9-5 14-13 15C7 10 12 5 20 4Z"
          fill="currentColor"
          opacity="0.85"
        />
      )}
      {shape === 'gelombang' && (
        <>
          <path
            d="M2 9c3.5-3 6.5 3 10 0s6.5-3 10 0"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M2 16c3.5-3 6.5 3 10 0s6.5-3 10 0"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </>
      )}
      {shape === 'lingkaran' && (
        <>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
        </>
      )}
      {shape === 'kotak' && (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function ClientLogos({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6',
        className,
      )}
    >
      {CLIENT_MARKS.map((mark) => (
        <li
          key={mark.name}
          className="flex items-center justify-center gap-2 text-fg-subtle transition-colors hover:text-fg-muted"
        >
          <Glyph shape={mark.glyph} />
          <span className="text-[13px] font-semibold uppercase tracking-[0.06em]">
            {mark.name}
          </span>
          <span className="sr-only">— {mark.sector}</span>
        </li>
      ))}
    </ul>
  );
}

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  /** Inisial untuk avatar berbasis CSS — tidak ada foto yang perlu dimuat. */
  initials: string;
}

/**
 * Testimoni ditulis seperti orang bercerita, bukan seperti materi iklan:
 * ada keberatan awal, ada angka yang spesifik, dan ada hal yang tetap tidak
 * sempurna. Pembaca Indonesia langsung mencium testimoni pesanan.
 */
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Terus terang saya sudah kapok. Dua vendor sebelumnya minta meeting dulu baru mau kasih ' +
      'angka, ujungnya harganya jauh di atas budget dan waktu saya habis. Di sini saya rakit ' +
      'sendiri malam-malam, langsung ketahuan kena berapa. Waktu konsultasi tinggal bahas ' +
      'gudang saya yang punya dua lokasi, harganya naik sedikit tapi tidak ada kejutan.',
    name: 'Hendra Wijaya',
    role: 'Direktur Operasional',
    company: 'Nusantara Logistik',
    initials: 'HW',
  },
  {
    quote:
      'Yang paling membantu justru waktu saya melepas fitur. Awalnya saya centang semua, ' +
      'totalnya hampir dua kali lipat. Setelah dilihat lagi, ada modul yang memang belum kami ' +
      'butuhkan tahun ini. Jadi kami mulai dari yang penting dulu, sisanya menyusul tahun depan.',
    name: 'Ratna Kusuma',
    role: 'Pemilik',
    company: 'Griya Pangan',
    initials: 'RK',
  },
  {
    quote:
      'Saya bukan orang IT, jadi biasanya bingung dengar istilah vendor. Di sini fiturnya ' +
      'ditulis seperti pekerjaan sehari-hari tim saya, misalnya “cocokkan barang datang dengan ' +
      'PO”. Sekali baca langsung paham. Pengerjaannya molor seminggu dari perkiraan, tapi ' +
      'diberitahu dari jauh hari, bukan diam-diam.',
    name: 'Bagus Prasetyo',
    role: 'Kepala Cabang',
    company: 'Sinar Rejeki Group',
    initials: 'BP',
  },
];

export function Testimonials({ className }: { className?: string }) {
  return (
    <ul className={cn('grid gap-4 md:grid-cols-3', className)}>
      {TESTIMONIALS.map((item) => (
        <li key={item.name}>
          <Card className="flex h-full flex-col gap-4 p-5">
            <Quote className="size-5 text-brand-soft-fg" aria-hidden="true" />
            <blockquote className="flex-1 text-[15px] leading-relaxed text-fg">
              {item.quote}
            </blockquote>
            <footer className="flex items-center gap-3 border-t border-border pt-4">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-soft-fg"
                aria-hidden="true"
              >
                {item.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                <p className="truncate text-xs text-fg-muted">
                  {item.role}, {item.company}
                </p>
              </div>
            </footer>
          </Card>
        </li>
      ))}
    </ul>
  );
}
