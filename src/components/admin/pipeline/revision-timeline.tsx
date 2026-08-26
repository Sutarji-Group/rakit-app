import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@/components/ui';
import { formatDateTime, formatRupiahRange } from '@/lib/format';
import { REVISION_ACTION_LABEL, type RevisionItem } from './shared';

/**
 * Riwayat perubahan keranjang (O2).
 *
 * Urutan fitur yang ditambah lalu dibuang menceritakan keraguan klien: itulah
 * bahan percakapan discovery yang paling berguna, dan tidak muncul di angka
 * akhir mana pun.
 */
export function RevisionTimeline({ revisions }: { revisions: RevisionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat perubahan keranjang</CardTitle>
        <CardDescription>
          Jejak versi konfigurasi sejak dibuat sampai penawaran terbit, lengkap dengan pergerakan
          nilainya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {revisions.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat versi"
            description="Setiap penambahan fitur, penerapan preset, dan perubahan konfigurasi proyek akan tercatat di sini sebagai versi bernomor."
          />
        ) : (
          <ol className="flex flex-col">
            {revisions.map((revision) => (
              <li
                key={revision.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border py-2.5 last:border-b-0"
              >
                <span className="tabular w-10 shrink-0 text-xs font-semibold text-fg-subtle">
                  v{revision.version}
                </span>
                <Badge variant="outline">{REVISION_ACTION_LABEL[revision.action]}</Badge>
                <span className="min-w-0 flex-1 text-sm text-fg">{revision.summary}</span>
                <span className="tabular text-xs text-fg-muted">
                  {formatRupiahRange(revision.totalMin, revision.totalMax)}
                </span>
                <span className="tabular w-full text-xs text-fg-subtle sm:w-auto">
                  {revision.actorLabel} · {formatDateTime(revision.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
