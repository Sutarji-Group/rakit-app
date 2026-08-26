import Link from 'next/link';
import { Compass } from 'lucide-react';

/**
 * Kartu penutup katalog: "aplikasi lain" atau "belum yakin" (A3).
 *
 * Sebagian pengunjung datang dengan kebutuhan yang tidak persis masuk salah
 * satu kategori. Tanpa pintu keluar yang jelas, mereka menutup tab. Kartu ini
 * sengaja dibuat berbeda (garis putus-putus) agar terbaca sebagai jalur lain,
 * bukan sebagai kategori kelima.
 */
export function ConsultationCard() {
  return (
    <Link
      href="/konsultasi"
      className="group flex h-full flex-col gap-3 rounded-xl border border-dashed border-border bg-surface-sunken/40 p-5 transition-[border-color,background-color] hover:border-brand hover:bg-brand-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-lg bg-surface text-fg-muted group-hover:text-brand">
        <Compass className="size-6" strokeWidth={1.75} aria-hidden="true" />
      </span>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold leading-tight tracking-[-0.01em] text-fg">
          Aplikasi lain, atau belum yakin?
        </h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Ceritakan pekerjaan yang ingin Anda rapikan — misalnya penjadwalan servis, absensi
          lapangan, atau penagihan berulang. Tim kami membantu memetakannya menjadi daftar fitur
          beserta perkiraan biayanya.
        </p>
      </div>

      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand">
        Bicarakan kebutuhan Anda
        <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
          <path
            d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
