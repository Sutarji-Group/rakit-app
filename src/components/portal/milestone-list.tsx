'use client';

import { useState } from 'react';
import { CheckCircle2, PenLine } from 'lucide-react';
import { Alert, Badge, Button, Card, Dialog, Field, Textarea } from '@/components/ui';
import { MILESTONE_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatPercent, formatRupiah } from '@/lib/format';
import {
  approveMilestoneAction,
  requestMilestoneRevisionAction,
} from '@/app/portal/actions';
import { MILESTONE_STATUS_TONE } from './status';
import { portalFieldError, usePortalAction } from './use-portal-action';
import type { PortalMilestone } from '@/lib/services/portal';

/**
 * Persetujuan milestone oleh klien (J4).
 *
 * "Minta revisi" selalu memaksa catatan. Persetujuan tanpa alasan bisa
 * dilakukan sekali klik; penolakan tanpa alasan hanya memindahkan kebingungan
 * ke tim pengerjaan dan berakhir jadi rentetan pesan susulan.
 */
export function MilestoneList({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: PortalMilestone[];
}) {
  const { pending, result, run, reset } = usePortalAction();
  const [revisionFor, setRevisionFor] = useState<PortalMilestone | null>(null);
  const [note, setNote] = useState('');

  function approve(milestone: PortalMilestone) {
    run(() => approveMilestoneAction(projectId, milestone.id));
  }

  function submitRevision() {
    if (!revisionFor) return;
    run(
      () => requestMilestoneRevisionAction(projectId, revisionFor.id, note),
      () => {
        setRevisionFor(null);
        setNote('');
      },
    );
  }

  const awaiting = milestones.filter((milestone) => milestone.status === 'AWAITING_APPROVAL');

  return (
    <div className="flex flex-col gap-4">
      {awaiting.length > 0 && (
        <Alert tone="warning" title={`${awaiting.length} milestone menunggu keputusan Anda`}>
          Selama belum disetujui atau diminta revisi, tim kami menahan pekerjaan tahap berikutnya.
        </Alert>
      )}

      <ol className="flex flex-col gap-3">
        {milestones.map((milestone, index) => (
          <li key={milestone.id}>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tabular text-xs font-semibold text-fg-subtle">
                      Tahap {index + 1}
                    </span>
                    <h3 className="text-base font-semibold leading-tight text-fg">
                      {milestone.name}
                    </h3>
                    <Badge variant={MILESTONE_STATUS_TONE[milestone.status]}>
                      {MILESTONE_STATUS_LABEL[milestone.status]}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                      {milestone.description}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="tabular text-sm font-semibold text-fg">
                    {formatRupiah(milestone.amount)}
                  </p>
                  {milestone.percentage > 0 && (
                    <p className="tabular text-xs text-fg-subtle">
                      {formatPercent(milestone.percentage / 100)} dari nilai proyek
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
                <span>Jatuh tempo {formatDate(milestone.dueDate)}</span>
                {milestone.approvedAt && (
                  <span className="text-success">
                    Disetujui {formatDate(milestone.approvedAt)}
                  </span>
                )}
              </div>

              {milestone.status === 'REVISION_REQUESTED' && milestone.clientNote && (
                <div className="mt-3">
                  <Alert tone="danger" title="Catatan revisi Anda">
                    {milestone.clientNote}
                  </Alert>
                </div>
              )}

              {milestone.status === 'AWAITING_APPROVAL' && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    size="sm"
                    onClick={() => approve(milestone)}
                    isLoading={pending}
                    leadingIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
                  >
                    Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      reset();
                      setNote('');
                      setRevisionFor(milestone);
                    }}
                    leadingIcon={<PenLine className="size-4" aria-hidden="true" />}
                  >
                    Minta revisi
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ol>

      <Dialog
        open={Boolean(revisionFor)}
        onClose={() => setRevisionFor(null)}
        title="Minta revisi"
        description={
          revisionFor
            ? `Tahap: ${revisionFor.name}. Tuliskan apa yang perlu diperbaiki.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevisionFor(null)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submitRevision} isLoading={pending}>
              Kirim permintaan revisi
            </Button>
          </>
        }
      >
        <Field
          label="Catatan revisi"
          htmlFor="catatan-revisi"
          required
          error={portalFieldError(result, 'note')}
          hint="Sebutkan bagian mana yang belum sesuai dan seperti apa yang Anda harapkan."
        >
          <Textarea
            id="catatan-revisi"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Contoh: laporan stok harian belum bisa difilter per gudang, padahal kami punya tiga gudang."
            invalid={Boolean(portalFieldError(result, 'note'))}
          />
        </Field>
      </Dialog>
    </div>
  );
}
