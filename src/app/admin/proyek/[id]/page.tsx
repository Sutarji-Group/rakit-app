import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@/components/admin';
import { MarginBadge } from '@/components/admin/margin-badge';
import { DocumentPanel } from '@/components/admin/project/document-panel';
import { InvoiceTable } from '@/components/admin/project/invoice-table';
import { MilestonePanel } from '@/components/admin/project/milestone-panel';
import { TaskBoard } from '@/components/admin/project/task-board';
import {
  PROJECT_STATUS_TONE,
  deviationTone,
  progressTone,
} from '@/components/admin/project/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescRow,
  EmptyState,
  Progress,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatManDay, formatPercent, formatRupiah } from '@/lib/format';
import { getProjectDetailView } from '../_lib/queries';

export const metadata = { title: 'Detail Proyek' };

/**
 * Detail satu proyek (P2–P4 dan H4).
 *
 * Halaman ini menyatukan empat hal yang biasanya tercecer di tempat berbeda —
 * papan pekerjaan, milestone, invoice, dan dokumen — karena keempatnya bergerak
 * bersama: pekerjaan selesai menggerakkan milestone, milestone yang disetujui
 * membuka invoice, dan dokumennya menjadi bukti serah terima.
 */
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireArea('projects', `/admin/proyek/${id}`);

  const view = await getProjectDetailView(id);
  if (!view) notFound();

  const { project, phases, milestones, invoices, documents, assignees, effort } = view;

  const tasks = phases.flatMap((phase) => phase.tasks);
  const missingActual = tasks.filter(
    (task) => task.actualManDay === null && (task.status === 'DONE' || task.status === 'APPROVED'),
  ).length;
  const awaitingApproval = milestones.filter(
    (milestone) => milestone.status === 'AWAITING_APPROVAL',
  ).length;
  const overdueInvoices = invoices.filter((invoice) => invoice.isOverdue).length;
  const isLate =
    project.targetEndDate !== null &&
    new Date(project.targetEndDate).getTime() < Date.now() &&
    project.progressPct < 100;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Proyek & Milestone', href: '/admin/proyek' }, { label: project.code }]}
        title={project.name}
        description={
          <>
            {project.categoryName} · {project.clientLabel}
            {project.quoteNumber && ` · penawaran ${project.quoteNumber}`}
          </>
        }
        actions={
          <>
            {project.leadId && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/pipeline/${project.leadId}`}>Lihat lead</Link>
              </Button>
            )}
            {project.stagingUrl && (
              <Button asChild variant="ghost" size="sm">
                <a href={project.stagingUrl} target="_blank" rel="noreferrer">
                  Buka staging
                </a>
              </Button>
            )}
          </>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Progres proyek</CardTitle>
                <Badge variant={PROJECT_STATUS_TONE[project.status]}>
                  {PROJECT_STATUS_LABEL[project.status]}
                </Badge>
              </div>
              <CardDescription>
                Dihitung dari bobot status seluruh item pekerjaan. Angka yang sama inilah yang
                dilihat klien di portal, jadi tidak pernah ada dua versi kemajuan proyek.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="tabular text-3xl font-semibold tracking-[-0.02em] text-fg">
                  {project.progressPct}%
                </span>
                <span className="tabular text-sm text-fg-muted">
                  {tasks.filter((task) => task.status === 'DONE').length}/{tasks.length} item
                  pekerjaan selesai
                </span>
              </div>
              <Progress value={project.progressPct} tone={progressTone(project.progressPct, isLate)} />
              <dl className="mt-2 divide-y divide-border">
                <DescRow label="Mulai" value={formatDate(project.startDate)} />
                <DescRow
                  label="Target selesai"
                  value={
                    <span className={isLate ? 'text-danger' : undefined}>
                      {formatDate(project.targetEndDate)}
                    </span>
                  }
                />
                <DescRow label="Project Manager" value={project.managerName ?? 'Belum ditetapkan'} />
                <DescRow
                  label="Klien"
                  value={project.clientEmail ?? project.clientLabel}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nilai & effort</CardTitle>
              <CardDescription>
                COGS dan gross margin hanya tampil di area admin (PRD 6.4).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular text-xl font-semibold text-fg">
                  {formatRupiah(project.contractValue)}
                </span>
                <MarginBadge value={project.grossMarginPct} />
              </div>
              <dl className="divide-y divide-border">
                <DescRow label="Proyeksi COGS" value={formatRupiah(project.cogsProjection)} />
                <DescRow
                  label="Estimasi man-day tercatat"
                  value={formatManDay(effort.estimateManDay)}
                />
                <DescRow label="Man-day aktual" value={formatManDay(effort.actualManDay)} />
                <DescRow
                  label="Deviasi"
                  emphasis
                  value={
                    effort.deviationPct === null ? (
                      '—'
                    ) : (
                      <Badge variant={deviationTone(effort.deviationPct)}>
                        <span className="tabular">
                          {effort.deviationPct > 0 ? '+' : ''}
                          {formatPercent(effort.deviationPct, 1)}
                        </span>
                      </Badge>
                    )
                  }
                />
              </dl>
              <p className="text-xs leading-relaxed text-fg-subtle">
                {effort.recordedTasks} dari {effort.totalTasks} item pekerjaan sudah dicatat man-day
                aktualnya. Semakin lengkap catatannya, semakin akurat estimasi proyek berikutnya.
              </p>
            </CardContent>
          </Card>
        </div>

        {(awaitingApproval > 0 || overdueInvoices > 0 || missingActual > 0) && (
          <div className="flex flex-col gap-3">
            {awaitingApproval > 0 && (
              <Alert tone="warning" title="Milestone menunggu persetujuan klien">
                {awaitingApproval} milestone tertahan di meja klien. Selama belum disetujui, invoice
                terminnya tidak boleh diterbitkan.
              </Alert>
            )}
            {overdueInvoices > 0 && (
              <Alert tone="danger" title="Ada invoice lewat jatuh tempo">
                {overdueInvoices} invoice sudah melewati tempo dan belum lunas.
              </Alert>
            )}
            {missingActual > 0 && (
              <Alert tone="neutral" title="Man-day aktual belum lengkap">
                {missingActual} item pekerjaan sudah selesai tetapi man-day aktualnya belum dicatat.
                Data inilah yang membuat kalibrasi estimasi mungkin (P4) — isikan langsung di kolom
                man-day pada papan di bawah.
              </Alert>
            )}
          </div>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">Papan pekerjaan</h2>
              <p className="text-sm text-fg-muted">
                Satu fitur pada konfigurasi = satu item pekerjaan. Estimasi man-day diambil dari
                snapshot penawaran, bukan diketik ulang.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/proyek/varians">Bandingkan estimasi vs aktual</Link>
            </Button>
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              title="Belum ada item pekerjaan"
              description="Item pekerjaan dibuat otomatis dari fitur pada konfigurasi ketika proyek dikonversi. Proyek ini belum memilikinya."
            />
          ) : (
            <TaskBoard phases={phases} assignees={assignees} />
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Milestone & termin pembayaran</CardTitle>
            <CardDescription>
              Termin bawaan 30/40/30 dibuat saat konversi. Setiap milestone menahan invoicenya
              sampai klien menyatakan menerima hasil kerjanya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <EmptyState
                title="Belum ada milestone"
                description="Milestone menentukan kapan sebuah termin boleh ditagih. Tambahkan minimal satu agar invoice punya dasar."
              />
            ) : (
              <MilestonePanel
                projectId={project.id}
                milestones={milestones}
                contractValue={project.contractValue}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
            <CardDescription>
              Nilai proyek dan biaya berulang selalu terpisah (BR-12). Invoice di sini hanya
              menagih termin proyek.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoiceTable invoices={invoices} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repositori dokumen</CardTitle>
            <CardDescription>
              Kontrak, Scope of Work, berita acara, dan manual pengguna dalam satu tempat yang juga
              dapat dibuka klien dari portalnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentPanel projectId={project.id} documents={documents} />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
