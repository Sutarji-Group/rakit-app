import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import { WizardManager } from '@/components/admin/catalog/wizard-manager';
import { Button } from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { loadWizardWorkspace } from '../_lib/queries';

export const metadata = { title: 'Aturan wizard' };

export default async function WizardPage() {
  await requireArea('catalog');
  const workspace = await loadWizardWorkspace();

  // Dropdown pemetaan hanya butuh nama, kelompok, dan status fitur — sisanya
  // tidak perlu ikut menyeberang ke browser.
  const featuresByCategory = Object.fromEntries(
    Object.entries(workspace.featuresByCategory).map(([id, features]) => [
      id,
      features.map((feature) => ({
        id: feature.id,
        name: feature.name,
        groupName: feature.groupName,
        type: feature.type,
        status: feature.status,
      })),
    ]),
  );

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Katalog', href: '/admin/katalog' }, { label: 'Aturan wizard' }]}
        title="Aturan pemetaan wizard"
        description="Pertanyaan → opsi jawaban → fitur beserta alasannya. Maksimal enam pertanyaan per kategori agar klien sampai ke konfigurator, bukan berhenti di tengah kuesioner."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/admin/katalog/preset">Preset</Link>
          </Button>
        }
      />

      <PageBody>
        <WizardManager
          categories={workspace.categories}
          questions={workspace.questions}
          featuresByCategory={featuresByCategory}
          presetsByCategory={workspace.presetsByCategory}
        />
      </PageBody>
    </>
  );
}
