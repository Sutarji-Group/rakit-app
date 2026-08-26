import Link from 'next/link';
import { ArrowRight, CalendarClock, ExternalLink } from 'lucide-react';
import { Badge, Card, Progress } from '@/components/ui';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatRupiah } from '@/lib/format';
import { PROJECT_STATUS_TONE } from './status';
import type { ClientProjectSummary } from '@/lib/services/portal';

/** Kartu ringkas satu proyek untuk daftar portal dan halaman akun (J). */
export function ProjectCard({ project }: { project: ClientProjectSummary }) {
  const needsAttention = project.awaitingApprovalCount > 0 || project.unpaidInvoiceCount > 0;

  return (
    <Card interactive className="p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold leading-tight text-fg">{project.name}</h3>
              <Badge variant={PROJECT_STATUS_TONE[project.status]}>
                {PROJECT_STATUS_LABEL[project.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              {project.code} · {project.categoryName}
            </p>
          </div>
          <p className="tabular text-right text-sm font-semibold text-fg">
            {formatRupiah(project.contractValue)}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-xs text-fg-subtle">
              {project.taskDone} dari {project.taskTotal} pekerjaan selesai
            </span>
            <span className="tabular text-sm font-semibold text-fg">{project.progressPct}%</span>
          </div>
          <Progress value={project.progressPct} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4 text-fg-subtle" aria-hidden="true" />
            Target selesai {formatDate(project.targetEndDate)}
          </span>
          {project.stagingUrl && (
            <a
              href={project.stagingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-brand underline-offset-4 hover:underline"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Lingkungan uji coba
            </a>
          )}
        </div>

        {needsAttention && (
          <div className="flex flex-wrap gap-2">
            {project.awaitingApprovalCount > 0 && (
              <Badge variant="warning">
                {project.awaitingApprovalCount} milestone menunggu persetujuan Anda
              </Badge>
            )}
            {project.unpaidInvoiceCount > 0 && (
              <Badge variant="info">{project.unpaidInvoiceCount} tagihan belum lunas</Badge>
            )}
          </div>
        )}

        <Link
          href={`/portal/${project.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Buka portal proyek
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
