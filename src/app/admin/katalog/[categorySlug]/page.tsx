import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import { FeatureTable } from '@/components/admin/catalog/feature-table';
import { GroupPanel } from '@/components/admin/catalog/group-panel';
import { Badge, Button, Stat } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { PUBLISH_STATUS_LABEL } from '@/lib/domain/enums';
import { getActivePricingRule } from '@/lib/services/pricing-rule';
import { isReviewStale, PUBLISH_STATUS_VARIANT } from '@/components/admin/catalog/shared';
import { getCategoryBySlugOrNotFound, loadCategoryWorkspace } from '../_lib/queries';

export const metadata = { title: 'Katalog kategori' };

export default async function CategoryWorkspacePage({
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

  const published = workspace.features.filter((feature) => feature.status === 'PUBLISHED').length;
  const drafts = workspace.features.filter((feature) => feature.status === 'DRAFT').length;
  const stale = workspace.features.filter(
    (feature) => feature.status !== 'ARCHIVED' && isReviewStale(feature.lastReviewedAt),
  ).length;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Katalog', href: '/admin/katalog' },
          { label: category.shortName || category.name },
        ]}
        title={category.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={PUBLISH_STATUS_VARIANT[category.status]}>
              {PUBLISH_STATUS_LABEL[category.status]}
            </Badge>
            <span>{category.tagline}</span>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href={`/admin/katalog/${category.slug}/dependensi`}>Editor dependensi</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/admin/katalog/preset">Preset</Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/katalog/${category.slug}/fitur/baru`}>Tambah fitur</Link>
            </Button>
          </>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total fitur" value={workspace.features.length} />
          <Stat
            label="Terbit"
            value={published}
            tone="success"
            hint={`Ambang kelayakan kategori ini ${category.minViableFeatureCount} fitur`}
          />
          <Stat
            label="Draft"
            value={drafts}
            tone={drafts > 0 ? 'warning' : 'neutral'}
            hint="Belum terlihat klien di konfigurator"
          />
          <Stat
            label="Perlu ditinjau"
            value={stale}
            tone={stale > 0 ? 'warning' : 'success'}
            hint="Man-day lama tidak dikalibrasi (R8)"
          />
        </div>

        <GroupPanel categoryId={category.id} groups={workspace.groups} />

        <FeatureTable
          categorySlug={category.slug}
          rows={workspace.features}
          groups={workspace.groups.map((group) => ({ id: group.id, name: group.name }))}
          rule={rule}
        />
      </PageBody>
    </>
  );
}
