import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import { CategoryBoard, type CategoryBoardRow } from '@/components/admin/catalog/category-board';
import { Button, Card, CardContent, CardHeader, CardTitle, Stat } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { formatDateTime } from '@/lib/format';
import { listRecentCatalogAudit } from './_lib/audit';
import { listAdminCategories, listCategoryOverview } from './_lib/queries';

export const metadata = { title: 'Kategori & Fitur' };

export default async function CatalogPage() {
  await requireArea('catalog');

  const [overview, editable, audit] = await Promise.all([
    listCategoryOverview(),
    listAdminCategories(),
    listRecentCatalogAudit(8),
  ]);

  // Statistik dan kolom yang dapat disunting datang dari dua kueri berbeda agar
  // agregat fitur tetap dihitung di basis data; keduanya disatukan di sini.
  const editableById = new Map(editable.map((category) => [category.id, category]));
  const rows: CategoryBoardRow[] = overview.map((row) => {
    const detail = editableById.get(row.id);
    return {
      ...row,
      description: detail?.description ?? '',
      longDescription: detail?.longDescription ?? '',
      benefits: detail?.benefits ?? [],
      seoTitle: detail?.seoTitle ?? '',
      seoDescription: detail?.seoDescription ?? '',
    };
  });

  const totalFeatures = rows.reduce((sum, row) => sum + row.featureTotal, 0);
  const publishedFeatures = rows.reduce((sum, row) => sum + row.featurePublished, 0);
  const draftFeatures = rows.reduce((sum, row) => sum + row.featureDraft, 0);
  const staleFeatures = rows.reduce((sum, row) => sum + row.staleCount, 0);

  return (
    <>
      <PageHeader
        title="Kategori & Fitur"
        description="Sumber kebenaran katalog: apa yang dapat dirakit klien, berapa man-day referensinya, dan mana yang sudah boleh tampil di konfigurator."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/admin/katalog/preset">Preset</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/admin/katalog/wizard">Aturan wizard</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/admin/katalog/impor">Impor / ekspor CSV</Link>
            </Button>
          </>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Kategori" value={rows.length} hint="Termasuk draft dan arsip" />
          <Stat
            label="Fitur terbit"
            value={publishedFeatures}
            tone="success"
            hint={`dari ${totalFeatures} entri katalog`}
          />
          <Stat
            label="Menunggu terbit"
            value={draftFeatures}
            tone={draftFeatures > 0 ? 'warning' : 'neutral'}
            hint="Fitur draft belum terlihat klien (L7)"
          />
          <Stat
            label="Perlu ditinjau ulang"
            value={staleFeatures}
            tone={staleFeatures > 0 ? 'warning' : 'success'}
            hint="Man-day lama tidak dikalibrasi — risiko R8"
          />
        </div>

        <CategoryBoard categories={rows} />

        <Card>
          <CardHeader>
            <CardTitle>Jejak perubahan katalog</CardTitle>
          </CardHeader>
          <CardContent>
            {audit.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Belum ada perubahan tercatat. Setiap penyimpanan katalog dan harga akan muncul di
                sini beserta pelakunya.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {audit.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                    <p className="text-sm leading-snug text-fg">{entry.summary}</p>
                    <p className="text-xs text-fg-subtle">
                      {entry.actorLabel} · {formatDateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
