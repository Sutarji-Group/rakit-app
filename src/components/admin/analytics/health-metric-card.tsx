import { Badge, Progress } from '@/components/ui';
import { cn } from '@/lib/utils';
import { TARGET_STATUS_LABEL, TARGET_STATUS_VARIANT, type TargetStatus } from './shared';

/**
 * Kartu satu metrik kesehatan produk (PRD 4.3).
 *
 * Angka tanpa targetnya adalah trivia. Karena itu target selalu ikut tercetak
 * di kartu yang sama, bukan disimpan di dokumen lain — dan dua metrik yang
 * paling cepat menghabiskan uang, deviasi estimasi dan gross margin, diberi
 * bingkai berbeda supaya tidak tenggelam di antara metrik lain.
 */
export function HealthMetricCard({
  label,
  value,
  target,
  status,
  hint,
  emphasis = false,
  meter,
}: {
  label: string;
  value: string;
  /** Kalimat targetnya, mis. "Target ≤ 15%". */
  target: string;
  /** Dikosongkan untuk metrik yang hanya dipantau arahnya, tanpa ambang lulus. */
  status?: TargetStatus;
  hint?: string;
  emphasis?: boolean;
  meter?: { pct: number; tone: 'brand' | 'success' | 'warning' | 'danger' };
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-surface p-4',
        emphasis ? 'border-brand/45 shadow-xs' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
        {emphasis && <Badge variant="brand">Paling menentukan</Badge>}
      </div>

      <p
        className={cn(
          'tabular text-2xl font-semibold tracking-[-0.02em]',
          status === 'BELUM' ? 'text-danger' : 'text-fg',
        )}
      >
        {value}
      </p>

      {meter && <Progress value={meter.pct} tone={meter.tone} />}

      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-xs text-fg-muted">{target}</span>
        {status && (
          <Badge variant={TARGET_STATUS_VARIANT[status]}>{TARGET_STATUS_LABEL[status]}</Badge>
        )}
      </div>

      {hint && <p className="text-xs leading-snug text-fg-subtle">{hint}</p>}
    </div>
  );
}
