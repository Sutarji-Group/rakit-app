import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import { DependencyEditor } from '@/components/admin/catalog/dependency-editor';
import { Button } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { getCategoryBySlugOrNotFound, loadDependencyWorkspace } from '../../_lib/queries';

export const metadata = { title: 'Editor dependensi' };

export default async function DependencyPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ fitur?: string }>;
}) {
  await requireArea('catalog');
  const [{ categorySlug }, query] = await Promise.all([params, searchParams]);

  const category = await getCategoryBySlugOrNotFound(categorySlug);
  const workspace = await loadDependencyWorkspace(category.id);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Katalog', href: '/admin/katalog' },
          { label: category.shortName || category.name, href: `/admin/katalog/${category.slug}` },
          { label: 'Dependensi' },
        ]}
        title={`Dependensi ${category.name}`}
        description="Prinsip Produk #2: keranjang yang mustahil dibangun tidak boleh bisa dibuat. Relasi di sini dijalankan mesin dependensi pada setiap penyimpanan rakitan klien."
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/admin/katalog/${category.slug}`}>Kembali ke daftar fitur</Link>
          </Button>
        }
      />

      <PageBody>
        <DependencyEditor
          categorySlug={category.slug}
          features={workspace.features}
          edges={workspace.edges}
          initialFeatureId={query.fitur}
        />
      </PageBody>
    </>
  );
}
