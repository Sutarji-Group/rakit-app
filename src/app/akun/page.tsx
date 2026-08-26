import Link from 'next/link';
import type { Metadata } from 'next';
import { LogOut, Plus } from 'lucide-react';
import { Button, Stat } from '@/components/ui';
import { PageIntro } from '@/components/portal/page-intro';
import { ProjectCard } from '@/components/portal/project-card';
import { SavedConfigurationList } from '@/components/portal/saved-configuration-list';
import { requireUser } from '@/lib/auth/guards';
import { getClientProjects } from '@/lib/services/portal';
import { listSavedConfigurations } from './_lib/queries';

export const metadata: Metadata = { title: 'Akun saya' };

export default async function AkunPage() {
  const user = await requireUser('/akun');

  const [configurations, projects] = await Promise.all([
    listSavedConfigurations(user.id),
    getClientProjects(user.id),
  ]);

  // Angka yang paling ingin dilihat lebih dulu: apa yang menunggu tindakan
  // klien. Sisanya sekadar konteks.
  const waiting = projects.reduce(
    (total, project) => total + project.awaitingApprovalCount + project.unpaidInvoiceCount,
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        eyebrow={`Halo, ${user.name}`}
        title="Rakitan dan proyek Anda"
        description={
          user.company
            ? `Semua yang tersimpan atas nama ${user.company} ada di halaman ini.`
            : 'Semua rakitan yang Anda simpan dan proyek yang sedang berjalan ada di halaman ini.'
        }
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/aplikasi">
                <Plus className="size-4" aria-hidden="true" />
                Rakitan baru
              </Link>
            </Button>
            <form action="/keluar" method="post">
              <Button type="submit" size="sm" variant="ghost">
                <LogOut className="size-4" aria-hidden="true" />
                Keluar
              </Button>
            </form>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Rakitan tersimpan" value={configurations.length} />
        <Stat label="Proyek berjalan" value={projects.length} />
        <Stat
          label="Menunggu Anda"
          value={waiting}
          tone={waiting > 0 ? 'warning' : 'neutral'}
          hint={waiting > 0 ? 'Persetujuan milestone atau tagihan' : 'Tidak ada yang tertunda'}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">Rakitan tersimpan</h2>
          <p className="text-sm text-fg-muted">
            Centang dua rakitan untuk membandingkannya berdampingan.
          </p>
        </div>
        <SavedConfigurationList items={configurations} />
      </section>

      {projects.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">Proyek Anda</h2>
            <Link
              href="/portal"
              className="text-sm font-medium text-brand underline-offset-4 hover:underline"
            >
              Lihat semua di portal
            </Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
