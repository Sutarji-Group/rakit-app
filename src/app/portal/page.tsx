import Link from 'next/link';
import type { Metadata } from 'next';
import { Button, EmptyState } from '@/components/ui';
import { PageIntro } from '@/components/portal/page-intro';
import { ProjectCard } from '@/components/portal/project-card';
import { requireUser } from '@/lib/auth/guards';
import { getClientProjects } from '@/lib/services/portal';

export const metadata: Metadata = { title: 'Portal proyek' };

export default async function PortalPage() {
  const user = await requireUser('/portal');
  const projects = await getClientProjects(user.id);

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        title="Proyek Anda"
        description="Satu tempat untuk melihat sampai mana pekerjaan berjalan, apa yang menunggu keputusan Anda, dan tagihan mana yang sudah terbit."
      />

      {projects.length === 0 ? (
        <EmptyState
          title="Belum ada proyek berjalan"
          description="Portal ini aktif setelah penawaran Anda disepakati dan proyek dimulai. Sementara itu, rakitan yang Anda simpan tetap dapat dilanjutkan kapan saja."
          action={
            <Button asChild>
              <Link href="/akun">Lihat rakitan saya</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
