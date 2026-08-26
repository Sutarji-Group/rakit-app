import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import { FeatureForm } from '@/components/admin/catalog/feature-form';
import { Badge, Button } from '@/components/ui';
import { PUBLISH_STATUS_VARIANT } from '@/components/admin/catalog/shared';
import { requireArea } from '@/lib/auth/guards';
import { PUBLISH_STATUS_LABEL } from '@/lib/domain/enums';
import { getActivePricingRule } from '@/lib/services/pricing-rule';
import {
  getCategoryBySlugOrNotFound,
  getFeatureDetail,
  loadCategoryWorkspace,
} from '../../../_lib/queries';

export const metadata = { title: 'Ubah fitur' };

export default async function EditFeaturePage({
  params,
}: {
  params: Promise<{ categorySlug: string; featureId: string }>;
}) {
  await requireArea('catalog');
  const { categorySlug, featureId } = await params;

  const category = await getCategoryBySlugOrNotFound(categorySlug);
  const [feature, workspace, rule] = await Promise.all([
    getFeatureDetail(category.id, featureId),
    loadCategoryWorkspace(category.id),
    getActivePricingRule(),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Katalog', href: '/admin/katalog' },
          { label: category.shortName || category.name, href: `/admin/katalog/${category.slug}` },
          { label: feature.name },
        ]}
        title={feature.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={PUBLISH_STATUS_VARIANT[feature.status]}>
              {PUBLISH_STATUS_LABEL[feature.status]}
            </Badge>
            <span>/{feature.slug}</span>
          </span>
        }
        actions={
          <Button variant="secondary" asChild>
            <Link href={`/admin/katalog/${category.slug}/dependensi?fitur=${feature.id}`}>
              Atur dependensi
            </Link>
          </Button>
        }
      />

      <PageBody>
        <FeatureForm
          mode="edit"
          featureId={feature.id}
          categoryId={category.id}
          categorySlug={category.slug}
          groups={workspace.groups.map((group) => ({ id: group.id, name: group.name }))}
          rule={rule}
          lastReviewedAt={feature.lastReviewedAt}
          promotedFromRequestId={feature.promotedFromRequestId}
          initialValues={{
            id: feature.id,
            groupId: feature.groupId,
            slug: feature.slug,
            name: feature.name,
            clientDescription: feature.clientDescription,
            internalDescription: feature.internalDescription,
            type: feature.type,
            manDayMin: String(feature.manDayMin),
            manDayMax: String(feature.manDayMax),
            effortRatioOverride:
              feature.effortRatioOverride === null ? '' : String(feature.effortRatioOverride),
            isEssential: feature.isEssential,
            keywords: feature.keywords.join(', '),
            status: feature.status,
            sortOrder: String(feature.sortOrder),
            seoTitle: feature.seoTitle,
            seoDescription: feature.seoDescription,
            media: feature.media.map((item) => ({
              id: item.id,
              kind: item.kind,
              url: item.url,
              caption: item.caption,
            })),
          }}
        />
      </PageBody>
    </>
  );
}
