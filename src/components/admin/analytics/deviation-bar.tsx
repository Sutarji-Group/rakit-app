import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CHART_BAR_CLASS, deviationReading, deviationTone } from './shared';

/**
 * Batang dua arah dari garis nol untuk deviasi estimasi (Q5).
 *
 * Bentuk dua arah dipilih karena arah melesetnya bermakna: ke kanan berarti
 * pengerjaan lebih lama dari referensi (margin tergerus), ke kiri berarti
 * referensi terlalu longgar (harga kami kemahalan).
 */
export function DeviationBar({
  value,
  max = 0.6,
  tolerance = 0.15,
  className,
}: {
  value: number;
  /** Deviasi yang dianggap "mentok" di ujung batang. */
  max?: number;
  tolerance?: number;
  className?: string;
}) {
  const clamped = Math.max(-max, Math.min(max, value));
  const half = (Math.abs(clamped) / max) * 50;
  const positive = clamped >= 0;
  const tone = deviationTone(value, tolerance);

  return (
    <div
      role="img"
      aria-label={`Deviasi ${formatPercent(value, 1)} — ${deviationReading(value, tolerance)}`}
      title={deviationReading(value, tolerance)}
      className={cn('relative h-2.5 w-24 overflow-hidden rounded-full bg-surface-sunken', className)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong"
      />
      <span
        aria-hidden="true"
        className={cn('absolute inset-y-0 rounded-full', CHART_BAR_CLASS[tone])}
        style={positive ? { left: '50%', width: `${half}%` } : { right: '50%', width: `${half}%` }}
      />
    </div>
  );
}
