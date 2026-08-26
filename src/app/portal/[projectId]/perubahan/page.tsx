import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { ChangeRequestPanel } from '@/components/portal/change-request-panel';
import { PageIntro } from '@/components/portal/page-intro';
import { requireUser } from '@/lib/auth/guards';
import { getProjectForClient, listChangeRequests } from '@/lib/services/portal';

export const metadata: Metadata = { title: 'Permintaan perubahan' };

export default async function PerubahanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser(`/portal/${projectId}/perubahan`);

  const project = await getProjectForClient(projectId, user.id);
  if (!project) notFound();

  const requests = await listChangeRequests(project.id, user.id);

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        eyebrow={`${project.code} · ${project.name}`}
        title="Permintaan perubahan"
        description="Setiap penambahan fitur di luar lingkup awal tercatat sebagai addendum: apa yang ditambahkan, berapa nilainya, dan berapa lama tanggal selesai bergeser."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link href={`/portal/${project.id}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali ke proyek
            </Link>
          </Button>
        }
      />

      <ChangeRequestPanel projectId={project.id} requests={requests} />

      <p className="text-xs leading-relaxed text-fg-subtle">
        Nilai addendum dihitung sebagai selisih terhadap rakitan proyek yang berjalan, sehingga
        biaya setup dan diskon volume tidak dihitung dua kali. Biaya berulang bulanan tetap
        terpisah dari nilai proyek.
      </p>
    </div>
  );
}
