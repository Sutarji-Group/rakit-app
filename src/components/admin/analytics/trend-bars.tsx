import { cn } from '@/lib/utils';
import { CHART_BAR_CLASS, type ChartTone } from './shared';

export interface TrendPoint {
  key: string;
  /** Label sumbu X, mis. "Agu 26". */
  label: string;
  value: number;
  display: string;
  /** Periode berjalan ditandai agar tidak dibaca setara bulan yang sudah penuh. */
  current?: boolean;
}

/**
 * Grafik kolom tren bulanan.
 *
 * Tinggi kolom dibatasi 84% dari tinggi wadah karena angka dicetak di atas
 * batang; tanpa batas itu kolom tertinggi akan menabrak angkanya sendiri.
 */
export function TrendBars({
  points,
  tone = 'brand',
  className,
}: {
  points: TrendPoint[];
  tone?: ChartTone;
  className?: string;
}) {
  const max = points.reduce((highest, point) => Math.max(highest, point.value), 0);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex h-32 items-end gap-1.5 sm:gap-2.5">
        {points.map((point) => (
          <div key={point.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
            <span className="tabular text-center text-[11px] font-semibold text-fg">
              {point.display}
            </span>
            <div
              className={cn(
                'w-full rounded-t-md',
                point.current ? CHART_BAR_CLASS[tone] : 'bg-brand-soft',
              )}
              style={{ height: `${max > 0 ? 4 + (point.value / max) * 84 : 4}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 sm:gap-2.5">
        {points.map((point) => (
          <span
            key={point.key}
            className={cn(
              'min-w-0 flex-1 truncate text-center text-[11px]',
              point.current ? 'font-semibold text-fg' : 'text-fg-subtle',
            )}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
