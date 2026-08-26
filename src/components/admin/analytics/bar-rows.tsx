import { cn } from '@/lib/utils';
import { barWidth, CHART_BAR_CLASS, type ChartTone } from './shared';

export interface BarRowItem {
  key: string;
  label: string;
  /** Nilai mentah yang menentukan panjang batang. */
  value: number;
  /** Angka siap baca di sisi kanan label. */
  display: string;
  hint?: string;
  tone?: ChartTone;
}

/**
 * Deret batang horizontal berlabel.
 *
 * Label dan angka selalu tercetak di samping batang, bukan disembunyikan di
 * balik hover: papan ini dibaca sambil rapat, sering dari proyektor, dan
 * kadang dari tangkapan layar yang tidak bisa disentuh sama sekali.
 */
export function BarRows({
  items,
  className,
}: {
  items: BarRowItem[];
  className?: string;
}) {
  const max = items.reduce((highest, item) => Math.max(highest, item.value), 0);

  return (
    <ul className={cn('flex flex-col gap-3.5', className)}>
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="min-w-0 text-sm leading-snug text-fg">{item.label}</span>
            <span className="tabular shrink-0 text-sm font-semibold text-fg">{item.display}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div
              className={cn('h-full rounded-full', CHART_BAR_CLASS[item.tone ?? 'brand'])}
              style={{ width: barWidth(item.value, max) }}
            />
          </div>
          {item.hint && <p className="text-xs leading-snug text-fg-subtle">{item.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
