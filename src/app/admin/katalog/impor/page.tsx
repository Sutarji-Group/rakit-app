import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import { CsvImportPanel } from '@/components/admin/catalog/csv-import-panel';
import { Button } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { listAllCategoriesLite } from '../_lib/queries';

export const metadata = { title: 'Impor & ekspor katalog' };

export default async function CatalogImportPage() {
  await requireArea('catalog');
  const categories = await listAllCategoriesLite();

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Katalog', href: '/admin/katalog' }, { label: 'Impor / ekspor' }]}
        title="Impor & ekspor katalog"
        description="Jalur cepat untuk mengalibrasi banyak fitur sekaligus di spreadsheet. Batas lebar rentang man-day (BR-05) tetap ditegakkan pada setiap baris impor."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/katalog">Kembali ke katalog</Link>
          </Button>
        }
      />

      <PageBody>
        <CsvImportPanel
          categories={categories.map((category) => ({
            slug: category.slug,
            name: category.name,
          }))}
        />
      </PageBody>
    </>
  );
}
