import { Badge } from '@/components/ui';
import type { FunnelRow } from '@/lib/analytics/report';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  barWidth,
  CHART_BAR_CLASS,
  TARGET_STATUS_LABEL,
  TARGET_STATUS_VARIANT,
  targetStatus,
  type ChartTone,
} from './shared';

/**
 * Corong konversi beserta target enam bulan tiap tahap (Q1, PRD 4.2).
 *
 * Angka absolut saja menipu: tahap dengan jumlah terbesar selalu tampak paling
 * sehat padahal justru di situ kebocorannya. Karena itu setiap tahap memikul
 * tiga angka sekaligus — jumlah, konversi dari tahap sebelumnya, dan target —
 * dan batang tahap yang meleset diberi warna bahaya supaya terlihat dari jauh.
 */
export function FunnelChart({ rows }: { rows: FunnelRow[] }) {
  const max = rows.reduce((highest, row) => Math.max(highest, row.count), 0);

  return (
    <ol className="flex flex-col">
      {rows.map((row, index) => {
        const previous = index > 0 ? rows[index - 1] : null;
        const dropShare = previous && previous.count > 0 ? row.dropOff / previous.count : null;
        const status = targetStatus(row.meetsTarget);
        const tone: ChartTone =
          status === 'BELUM' ? 'danger' : status === 'MEMENUHI' ? 'success' : 'brand';

        return (
          <li key={row.key}>
            {previous && (
              <div className="ml-4 flex items-center gap-2 border-l-2 border-dashed border-border py-2 pl-4 text-xs text-fg-muted">
                <span aria-hidden="true">&darr;</span>
                <span className="tabular">
                  {row.dropOff > 0
                    ? `Pergi ${formatNumber(row.dropOff)} sesi${
                        dropShare !== null ? ` (${formatPercent(dropShare, 1)} dari tahap sebelumnya)` : ''
                      }`
                    : 'Tidak ada yang pergi di antara dua tahap ini'}
                </span>
              </div>
            )}

            <div
              className={cn(
                'flex flex-col gap-2 rounded-xl border bg-surface p-3.5',
                status === 'BELUM' ? 'border-danger/35' : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-fg">
                  <span className="tabular text-fg-subtle">{index + 1}.</span> {row.label}
                </span>
                <span className="tabular text-base font-semibold text-fg">
                  {formatNumber(row.count)}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className={cn('h-full rounded-full', CHART_BAR_CLASS[tone])}
                  style={{ width: barWidth(row.count, max) }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                {row.conversionRate !== null ? (
                  <span className="tabular text-fg-muted">
                    Konversi dari tahap sebelumnya{' '}
                    <span className="font-semibold text-fg">
                      {formatPercent(row.conversionRate, 1)}
                    </span>
                  </span>
                ) : (
                  <span className="text-fg-muted">Tahap pertama — jadi pembagi tahap berikutnya</span>
                )}

                {row.target !== null && (
                  <>
                    <span className="tabular text-fg-subtle">
                      Target 6 bulan &ge; {formatPercent(row.target)}
                    </span>
                    <Badge variant={TARGET_STATUS_VARIANT[status]}>
                      {TARGET_STATUS_LABEL[status]}
                    </Badge>
                  </>
                )}
              </div>

              {row.targetLabel && (
                <p className="text-[11px] leading-snug text-fg-subtle">{row.targetLabel}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
