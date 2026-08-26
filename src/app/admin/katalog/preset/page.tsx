import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import { PresetManager } from '@/components/admin/catalog/preset-manager';
import { Button } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { loadPresetWorkspace } from '../_lib/queries';

export const metadata = { title: 'Preset' };

export default async function PresetPage() {
  await requireArea('catalog');
  const workspace = await loadPresetWorkspace();

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Katalog', href: '/admin/katalog' }, { label: 'Preset' }]}
        title="Preset per kategori"
        description="Titik mulai yang direkomendasikan untuk klien. Saat disimpan, sistem memeriksa apakah ada fitur yang prasyaratnya belum tercantum memakai mesin dependensi yang sama dengan konfigurator."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/katalog">Kategori &amp; fitur</Link>
          </Button>
        }
      />

      <PageBody>
        <PresetManager
          categories={workspace.categories}
          presets={workspace.presets}
          features={workspace.features}
          edges={workspace.edges.map((edge) => ({
            featureId: edge.featureId,
            targetFeatureId: edge.targetFeatureId,
            kind: edge.kind,
            note: edge.note,
          }))}
        />
      </PageBody>
    </>
  );
}
