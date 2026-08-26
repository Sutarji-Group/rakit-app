import { Badge } from '@/components/ui';
import { formatPercent } from '@/lib/format';

/**
 * Lencana kesehatan margin.
 *
 * PRD Lampiran C: proyek besar tidak otomatis proyek sehat. Karena itu
 * proyeksi gross margin selalu tampil berdampingan dengan nilai proyek di
 * seluruh papan internal, agar tim tidak mengejar nilai kontrak sambil
 * mengabaikan margin.
 */
export function MarginBadge({
  value,
  minThreshold = 0.4,
  targetMin = 0.5,
  size = 'sm',
}: {
  value: number;
  minThreshold?: number;
  targetMin?: number;
  size?: 'sm' | 'md';
}) {
  const variant = value < minThreshold ? 'danger' : value < targetMin ? 'warning' : 'success';
  const title =
    value < minThreshold
      ? `Di bawah ambang bahaya ${formatPercent(minThreshold)} — wajib approval (BR-17)`
      : value < targetMin
        ? `Di bawah target ${formatPercent(targetMin)}`
        : 'Margin sehat';

  return (
    <Badge variant={variant} size={size} title={title}>
      <span className="tabular">GM {formatPercent(value, 1)}</span>
    </Badge>
  );
}
