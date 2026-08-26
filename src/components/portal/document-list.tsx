import { Download, FileText } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABEL, type DocumentKind } from '@/lib/domain/enums';
import { formatDate } from '@/lib/format';
import type { PortalDocument } from '@/lib/services/portal';

/**
 * Repositori dokumen proyek (J7).
 *
 * Dikelompokkan per jenis supaya kontrak dan SOW — dua dokumen yang paling
 * sering dicari saat ada perbedaan pendapat soal lingkup — selalu berada di
 * urutan teratas.
 */
export function DocumentList({ documents }: { documents: PortalDocument[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-8" aria-hidden="true" />}
        title="Belum ada dokumen"
        description="Kontrak, SOW, manual pengguna, dan materi pelatihan akan muncul di sini begitu tersedia."
      />
    );
  }

  const groups = DOCUMENT_KINDS.map((kind) => ({
    kind: kind as DocumentKind,
    items: documents.filter((document) => document.kind === kind),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.kind} className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold text-fg">{DOCUMENT_KIND_LABEL[group.kind]}</h3>
          <ul className="flex flex-col gap-2">
            {group.items.map((document) => (
              <li key={document.id}>
                <Card className="flex flex-wrap items-center gap-3 p-3.5">
                  <FileText className="size-5 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{document.name}</p>
                    <p className="text-xs text-fg-subtle">
                      Diunggah {formatDate(document.createdAt)}
                      {document.sizeLabel && ` · ${document.sizeLabel}`}
                    </p>
                  </div>
                  {document.url && document.url !== '#' ? (
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Unduh
                    </a>
                  ) : (
                    <Badge variant="outline">Menunggu unggahan</Badge>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
