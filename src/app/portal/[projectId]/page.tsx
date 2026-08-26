import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CalendarClock, ExternalLink, MonitorPlay, UserRound } from 'lucide-react';
import { Alert, Badge, Card, Progress, Stat } from '@/components/ui';
import { TrackedLink } from '@/components/catalog';
import { ChangeRequestLauncher } from '@/components/portal/change-request-launcher';
import { DocumentList } from '@/components/portal/document-list';
import { InvoiceList } from '@/components/portal/invoice-list';
import { MilestoneList } from '@/components/portal/milestone-list';
import { PageIntro } from '@/components/portal/page-intro';
import { PortalTabs } from '@/components/portal/portal-tabs';
import { PROJECT_STATUS_TONE } from '@/components/portal/status';
import { TaskBoard } from '@/components/portal/task-board';
import { requireUser } from '@/lib/auth/guards';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatRupiah } from '@/lib/format';
import { getProjectForClient } from '@/lib/services/portal';

export const metadata: Metadata = { title: 'Detail proyek' };

export default async function ProyekPortalPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser(`/portal/${projectId}`);
  const project = await getProjectForClient(projectId, user.id);

  // Proyek milik orang lain diperlakukan seperti tidak ada, bukan "ditolak":
  // keberadaan proyek pun bukan informasi yang perlu bocor.
  if (!project) notFound();

  const awaitingApproval = project.milestones.filter(
    (milestone) => milestone.status === 'AWAITING_APPROVAL',
  ).length;
  const unpaidInvoices = project.invoices.filter((invoice) =>
    ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status),
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        eyebrow={`${project.code} · ${project.categoryName}`}
        title={project.name}
        description={
          project.managerName ? (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4 text-fg-subtle" aria-hidden="true" />
              Project Manager Anda: {project.managerName}
            </span>
          ) : undefined
        }
        actions={
          <Badge variant={PROJECT_STATUS_TONE[project.status]} size="md">
            {PROJECT_STATUS_LABEL[project.status]}
          </Badge>
        }
      />

      {awaitingApproval > 0 && (
        <Alert tone="warning" title={`${awaitingApproval} milestone menunggu persetujuan Anda`}>
          Buka tab Milestone untuk menyetujui atau meminta revisi. Tahap berikutnya baru dimulai
          setelah keputusan Anda masuk.
        </Alert>
      )}

      {/* J2 — progres keseluruhan dan per fase. */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-fg-muted">Progres keseluruhan</p>
            <p className="tabular mt-0.5 text-3xl font-semibold tracking-[-0.02em] text-fg">
              {project.progressPct}%
            </p>
          </div>
          <p className="text-sm text-fg-muted">
            {/* APPROVED ikut dihitung selesai: klien sendiri yang menyetujuinya,
                sisanya hanya penutupan administratif di sisi tim. */}
            {
              project.tasks.filter(
                (task) => task.status === 'DONE' || task.status === 'APPROVED',
              ).length
            }{' '}
            dari {project.tasks.length} pekerjaan selesai
          </p>
        </div>
        <Progress value={project.progressPct} className="mt-3" />

        {project.phases.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
              Progres per fase
            </p>
            {project.phases.map((phase) => (
              <div key={phase.name}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-fg">{phase.name}</span>
                  <span className="tabular text-xs text-fg-muted">
                    {phase.done}/{phase.total} selesai · {phase.progressPct}%
                  </span>
                </div>
                <Progress value={phase.progressPct} tone={phase.progressPct === 100 ? 'success' : 'brand'} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Nilai proyek" value={formatRupiah(project.contractValue)} />
        <Stat
          label="Mulai"
          value={formatDate(project.startDate)}
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
        />
        <Stat
          label="Target selesai"
          value={formatDate(project.targetEndDate)}
          tone="brand"
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
        />
        <Stat
          label="Menunggu Anda"
          value={awaitingApproval + unpaidInvoices}
          tone={awaitingApproval + unpaidInvoices > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {/* J3 — tautan lingkungan uji coba. */}
      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-fg">Coba sendiri hasilnya</h2>
        {project.stagingUrl || project.demoUrl ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              Data di lingkungan ini boleh Anda utak-atik sebebasnya — tidak terhubung ke data
              operasional Anda.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.stagingUrl && (
                <a
                  href={project.stagingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <MonitorPlay className="size-4 text-fg-subtle" aria-hidden="true" />
                  Lingkungan uji coba (staging)
                  <ExternalLink className="size-3.5 text-fg-subtle" aria-hidden="true" />
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <MonitorPlay className="size-4 text-fg-subtle" aria-hidden="true" />
                  Demo untuk tim Anda
                  <ExternalLink className="size-3.5 text-fg-subtle" aria-hidden="true" />
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            Tautan uji coba akan muncul di sini begitu fase pertama siap dicoba.
          </p>
        )}
      </Card>

      <ChangeRequestLauncher
        projectId={project.id}
        openCount={project.openChangeRequestCount}
        totalCount={project.changeRequestCount}
      />

      <PortalTabs
        panels={[
          {
            value: 'pekerjaan',
            label: 'Pekerjaan',
            count: project.tasks.length,
            content: <TaskBoard projectId={project.id} tasks={project.tasks} />,
          },
          {
            value: 'milestone',
            label: 'Milestone',
            count: project.milestones.length,
            content: (
              <MilestoneList projectId={project.id} milestones={project.milestones} />
            ),
          },
          {
            value: 'tagihan',
            label: 'Tagihan',
            count: project.invoices.length,
            content: <InvoiceList invoices={project.invoices} />,
          },
          {
            value: 'dokumen',
            label: 'Dokumen',
            count: project.documents.length,
            content: <DocumentList documents={project.documents} />,
          },
        ]}
      />

      <p className="text-xs leading-relaxed text-fg-subtle">
        Ada yang tidak sesuai?{' '}
        <TrackedLink
          href="/konsultasi"
          event="consultant_requested"
          payload={{ from_step: 'portal', cart_total_min: project.contractValue }}
          className="underline underline-offset-2 hover:text-fg-muted"
        >
          Hubungi tim kami
        </TrackedLink>{' '}
        atau tulis langsung pada item pekerjaan yang bersangkutan supaya konteksnya tidak hilang.
      </p>
    </div>
  );
}
