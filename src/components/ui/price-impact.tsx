import { cn } from '@/lib/utils';
import type { PriceImpactLevel } from '@/lib/pricing';

const LABEL: Record<PriceImpactLevel, string> = {
  1: 'Dampak harga ringan',
  2: 'Dampak harga sedang',
  3: 'Dampak harga besar',
};

/**
 * Indikator dampak harga bertingkat (C2.4).
 *
 * PRD sengaja tidak menampilkan rupiah per fitur di kartu: angka per item
 * mengundang perbandingan mikro dengan kompetitor dan memicu tawar-menawar.
 * Rincian rupiah tetap tersedia lewat tautan "lihat rincian".
 */
export function PriceImpact({
  level,
  className,
  showLabel = false,
}: {
  level: PriceImpactLevel;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      title={LABEL[level]}
      aria-label={LABEL[level]}
    >
      <span className="tabular inline-flex items-baseline gap-px text-[11px] font-semibold leading-none">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            aria-hidden="true"
            className={cn(
              'transition-colors',
              step <= level ? 'text-accent-strong' : 'text-fg-subtle/35',
            )}
          >
            Rp
          </span>
        ))}
      </span>
      {showLabel && <span className="text-xs text-fg-subtle">{LABEL[level]}</span>}
    </span>
  );
}
