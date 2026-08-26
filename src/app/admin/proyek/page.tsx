import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import { ConvertLeadButton } from '@/components/admin/project/convert-lead-button';
import {
  PROJECT_STATUS_TONE,
  progressTone,
  type ConvertibleLeadRow,
  type ProjectRow,
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
  EmptyState,
  Progress,
  Stat,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatNumber, formatRupiah, formatRupiahShort } from '@/lib/format';
import { loadProjectBoard } from './_lib/queries';

export const metadata = { title: 'Proyek & Milestone' };

/**
 * Daftar proyek delivery (P1).
 *
 * Bagian teratas halaman ini sengaja bukan tabel proyek, melainkan antrean
 * penawaran yang sudah dimenangkan tetapi belum dikonversi: selama ia masih
 * berisi, ada pekerjaan yang sudah dibayar tetapi belum punya papan.
 */
export default async function ProjectListPage() {
  await requireArea('projects', '/admin/proyek');

  const { projects, convertible, stats } = await loadProjectBoard();

  if (projects.length === 0 && convertible.length === 0) {
    return (
      <>
        <PageHeader
          title="Proyek & Milestone"
          description="Papan pekerjaan, termin pembayaran, dan dokumen setiap proyek yang berjalan."
        />
        <PageBody>
          <EmptyState
            title="Belum ada proyek berjalan"
            description="Begitu sebuah penawaran dipindahkan ke tahap Menang di pipeline, ia muncul di sini lengkap dengan tombol Jadikan proyek. Satu klik akan mengubah setiap fitur pada konfigurasi menjadi item pekerjaan beserta estimasi man-day-nya, plus termin 30/40/30 dan invoice draft-nya."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin/pipeline">Buka pipeline lead</Link>
              </Button>
            }
          />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Proyek & Milestone"
        description="Setiap fitur pada konfigurasi yang dimenangkan menjadi satu item pekerjaan. Tidak ada scope yang ditulis ulang secara manual."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/proyek/varians">Laporan varians</Link>
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Proyek berjalan"
            value={formatNumber(stats.activeProjects)}
            hint={`Nilai kontrak ${formatRupiahShort(stats.contractValueActive)}`}
          />
          <Stat
            label="Rata-rata progres"
            value={`${stats.averageProgress}%`}
            tone="brand"
            hint="Dihitung dari bobot status item pekerjaan, bukan diketik manual."
          />
          <Stat
            label="Milestone menunggu persetujuan"
            value={formatNumber(stats.awaitingApproval)}
            tone={stats.awaitingApproval > 0 ? 'warning' : 'neutral'}
            hint="Termin yang tertahan di meja klien."
          />
          <Stat
            label="Invoice lewat tempo"
            value={formatNumber(stats.overdueInvoices)}
            tone={stats.overdueInvoices > 0 ? 'danger' : 'neutral'}
            hint="Tagihan terbit yang belum lunas melewati jatuh tempo."
          />
        </div>

        {convertible.length > 0 && <ConvertibleSection leads={convertible} />}

        {projects.length === 0 ? (
          <EmptyState
            title="Belum ada proyek yang dibuat"
            description="Konversi salah satu penawaran yang dimenangkan di atas untuk membuat papan pekerjaan pertama."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Proyek berjalan</CardTitle>
              <CardDescription>
                Progres, nilai kontrak, dan tagihan yang belum lunas untuk setiap proyek. Angka
                progres di sini identik dengan yang dilihat klien di portalnya.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectTable projects={projects} />
            </CardContent>
          </Card>
        )}
      </PageBody>
    </>
  );
}

/** Antrean konversi satu klik (P1). */
function ConvertibleSection({ leads }: { leads: ConvertibleLeadRow[] }) {
  const pendingCustom = leads.reduce((sum, lead) => sum + lead.pendingCustomCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Siap dijadikan proyek</CardTitle>
        <CardDescription>
          Penawaran yang sudah bertahap Menang tetapi belum punya papan pekerjaan. Konfigurasinya
          langsung menjadi Scope of Work — setiap fitur berubah menjadi item pekerjaan beserta
          estimasi man-day dari snapshot penawaran.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {pendingCustom > 0 && (
          <Alert tone="warning" title="Ada fitur custom yang belum diestimasi">
            {pendingCustom} fitur custom masih menunggu estimasi manusia. Fitur seperti itu tidak
            ikut menjadi item pekerjaan (BR-02) — selesaikan estimasinya lebih dulu bila memang
            termasuk ruang lingkup yang dijanjikan.
          </Alert>
        )}

        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th className="min-w-52">Penawaran</Th>
                <Th className="min-w-36">Kategori</Th>
                <Th className="min-w-40">Isi rakitan</Th>
                <Th className="min-w-36 text-right">Nilai kontrak</Th>
                <Th className="min-w-32">Dimenangkan</Th>
                <Th className="min-w-36 text-right">Tindakan</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <Tr key={lead.id}>
                  <Td>
                    <Link
                      href={`/admin/pipeline/${lead.id}`}
                      className="tabular font-medium text-brand hover:underline"
                    >
                      {lead.quoteNumber}
                    </Link>
                    <p className="text-xs text-fg-subtle">
                      {lead.company ?? lead.contactName}
                      {lead.ownerName && ` · ${lead.ownerName}`}
                    </p>
                  </Td>
                  <Td className="text-fg-muted">{lead.categoryName}</Td>
                  <Td>
                    <span className="tabular text-fg">{lead.featureCount} fitur</span>
                    {lead.estimatedCustomCount > 0 && (
                      <Badge variant="brand" className="ml-1.5">
                        +{lead.estimatedCustomCount} custom
                      </Badge>
                    )}
                    {lead.pendingCustomCount > 0 && (
                      <Badge variant="warning" className="ml-1.5">
                        {lead.pendingCustomCount} belum diestimasi
                      </Badge>
                    )}
                  </Td>
                  <Td className="tabular text-right">
                    {formatRupiah(lead.contractValue)}
                    <p className="text-xs text-fg-subtle">
                      {lead.valueSource === 'OVERRIDE'
                        ? 'dari override disetujui'
                        : lead.valueSource === 'LOCKED'
                          ? 'dari harga terkunci'
                          : 'dari batas atas penawaran'}
                    </p>
                  </Td>
                  <Td className="text-fg-muted">{formatDate(lead.wonAt)}</Td>
                  <Td className="text-right">
                    <ConvertLeadButton leadId={lead.id} quoteNumber={lead.quoteNumber} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      </CardContent>
    </Card>
  );
}

function ProjectTable({ projects }: { projects: ProjectRow[] }) {
  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <Th className="min-w-56">Proyek</Th>
            <Th className="min-w-40">Klien</Th>
            <Th className="min-w-32">Status</Th>
            <Th className="min-w-44">Progres</Th>
            <Th className="min-w-36 text-right">Nilai kontrak</Th>
            <Th className="min-w-36 text-right">Belum tertagih lunas</Th>
            <Th className="min-w-36">Target selesai</Th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <Tr key={project.id}>
              <Td>
                <Link
                  href={`/admin/proyek/${project.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {project.name}
                </Link>
                <p className="tabular text-xs text-fg-subtle">
                  {project.code}
                  {project.managerName && ` · PM ${project.managerName}`}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {project.awaitingApproval > 0 && (
                    <Badge variant="warning">
                      {project.awaitingApproval} milestone menunggu klien
                    </Badge>
                  )}
                  {project.missingActual > 0 && (
                    <Badge variant="outline" title="Man-day aktual belum dicatat (P4)">
                      {project.missingActual} man-day belum dicatat
                    </Badge>
                  )}
                </div>
              </Td>
              <Td className="text-fg-muted">{project.clientLabel}</Td>
              <Td>
                <Badge variant={PROJECT_STATUS_TONE[project.status]}>
                  {PROJECT_STATUS_LABEL[project.status]}
                </Badge>
              </Td>
              <Td>
                <Progress
                  value={project.progressPct}
                  tone={progressTone(project.progressPct, project.isLate)}
                  showLabel
                />
                <p className="tabular mt-1 text-xs text-fg-subtle">
                  {project.taskDone}/{project.taskTotal} item selesai
                </p>
              </Td>
              <Td className="tabular text-right">{formatRupiah(project.contractValue)}</Td>
              <Td className="tabular text-right text-fg-muted">
                {formatRupiah(project.outstandingInvoice)}
              </Td>
              <Td className={project.isLate ? 'text-danger' : 'text-fg-muted'}>
                {formatDate(project.targetEndDate)}
                {project.isLate && (
                  <p className="text-xs font-medium text-danger">Lewat target</p>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrapper>
  );
}
