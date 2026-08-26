import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import { FeatureForm } from '@/components/admin/catalog/feature-form';
import { emptyFeatureValues } from '@/components/admin/catalog/shared';
import { Button, EmptyState } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { getActivePricingRule } from '@/lib/services/pricing-rule';
import { getCategoryBySlugOrNotFound, loadCategoryWorkspace } from '../../../_lib/queries';

export const metadata = { title: 'Fitur baru' };

export default async function NewFeaturePage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  await requireArea('catalog');
  const { categorySlug } = await params;

  const category = await getCategoryBySlugOrNotFound(categorySlug);
  const [workspace, rule] = await Promise.all([
    loadCategoryWorkspace(category.id),
    getActivePricingRule(),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Katalog', href: '/admin/katalog' },
          { label: category.shortName || category.name, href: `/admin/katalog/${category.slug}` },
          { label: 'Fitur baru' },
        ]}
        title="Tambah fitur"
        description={`Entri baru untuk katalog ${category.name}. Fitur tersimpan sebagai draft sampai Anda menerbitkannya.`}
      />

      <PageBody>
        {workspace.groups.length === 0 ? (
          <EmptyState
            title="Buat kelompok fitur lebih dulu"
            description="Setiap fitur wajib berada di satu kelompok, karena kelompoklah yang menjadi navigasi konfigurator di hadapan klien."
            action={
              <Button asChild>
                <Link href={`/admin/katalog/${category.slug}`}>Kelola kelompok fitur</Link>
              </Button>
            }
          />
        ) : (
          <FeatureForm
            mode="create"
            categoryId={category.id}
            categorySlug={category.slug}
            groups={workspace.groups.map((group) => ({ id: group.id, name: group.name }))}
            rule={rule}
            initialValues={emptyFeatureValues(
              workspace.groups[0].id,
              workspace.features.length + 1,
            )}
          />
        )}
      </PageBody>
    </>
  );
}
