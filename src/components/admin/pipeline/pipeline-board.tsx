'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { MarginBadge } from '@/components/admin/margin-badge';
import { Badge, Input, Select } from '@/components/ui';
import {
  LEAD_STAGE_LABEL,
  LOST_REASON_LABEL,
  type LeadStage,
  type LostReason,
} from '@/lib/domain/enums';
import { formatDuration, formatRupiahRange, formatRupiahShort } from '@/lib/format';
import { moveStage } from '@/app/admin/pipeline/actions';
import { LostReasonDialog } from './lost-reason-dialog';
import { usePipelineAction } from './use-pipeline-action';
import type { LeadCardData } from './shared';

/**
 * Papan kanban pipeline (O1).
 *
 * Perpindahan memakai menu pilih tahap, bukan drag-and-drop: menu dapat
 * dijalankan lewat keyboard, tetap terbaca pembaca layar, dan bekerja di layar
 * sempit — tiga hal yang sulit dijamin oleh seret-lepas.
 */
export function PipelineBoard({
  stages,
  leads,
}: {
  stages: LeadStage[];
  leads: LeadCardData[];
}) {
  const { pending, run } = usePipelineAction();
  const [query, setQuery] = useState('');
  const [lostTarget, setLostTarget] = useState<LeadCardData | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) =>
      [lead.contactName, lead.company ?? '', lead.quoteNumber, lead.categoryName]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [leads, query]);

  const handleStageChange = (lead: LeadCardData, next: LeadStage) => {
    if (next === lead.stage) return;
    // O5: tahap Kalah tidak pernah berpindah langsung — alasan dulu.
    if (next === 'LOST') {
      setLostTarget(lead);
      return;
    }
    run(() => moveStage({ leadId: lead.id, stage: next }));
  };

  const confirmLost = (reason: LostReason, note: string) => {
    if (!lostTarget) return;
    run(
      () =>
        moveStage({
          leadId: lostTarget.id,
          stage: 'LOST',
          lostReason: reason,
          lostNote: note,
        }),
      { onSuccess: () => setLostTarget(null) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, perusahaan, atau nomor penawaran…"
            aria-label="Cari lead di papan"
          />
        </div>
        <p className="text-xs text-fg-muted">
          Menampilkan <span className="tabular font-medium text-fg">{filtered.length}</span> dari{' '}
          <span className="tabular">{leads.length}</span> lead.
        </p>
      </div>

      {/* Papan menggulir horizontal sendiri hingga tepi layar, halaman tidak ikut bergeser. */}
      <div className="-mx-5 overflow-x-auto px-5 pb-2 scrollbar-slim sm:-mx-8 sm:px-8">
        <div className="flex min-w-max items-start gap-3">
          {stages.map((stage) => {
            const columnLeads = filtered.filter((lead) => lead.stage === stage);
            const valueMin = columnLeads.reduce((sum, lead) => sum + lead.totalMin, 0);
            const valueMax = columnLeads.reduce((sum, lead) => sum + lead.totalMax, 0);

            return (
              <section
                key={stage}
                aria-label={`Kolom ${LEAD_STAGE_LABEL[stage]}`}
                className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface-sunken/50"
              >
                <header className="border-b border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-fg">{LEAD_STAGE_LABEL[stage]}</h3>
                    <Badge variant={stage === 'WON' ? 'success' : stage === 'LOST' ? 'danger' : 'neutral'}>
                      <span className="tabular">{columnLeads.length}</span>
                    </Badge>
                  </div>
                  <p className="tabular mt-1 text-xs text-fg-muted">
                    {columnLeads.length > 0 ? formatRupiahRange(valueMin, valueMax) : '—'}
                  </p>
                </header>

                <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto p-2 scrollbar-slim">
                  {columnLeads.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-fg-subtle">
                      Belum ada lead di tahap ini.
                    </p>
                  ) : (
                    columnLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        stages={stages}
                        pending={pending}
                        onStageChange={handleStageChange}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <LostReasonDialog
        open={lostTarget !== null}
        leadName={lostTarget?.contactName ?? ''}
        pending={pending}
        onClose={() => setLostTarget(null)}
        onConfirm={confirmLost}
      />
    </div>
  );
}

function LeadCard({
  lead,
  stages,
  pending,
  onStageChange,
}: {
  lead: LeadCardData;
  stages: LeadStage[];
  pending: boolean;
  onStageChange: (lead: LeadCardData, next: LeadStage) => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-3 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/admin/pipeline/${lead.id}`}
          className="min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <p className="truncate text-sm font-medium text-fg hover:text-brand">{lead.contactName}</p>
          <p className="truncate text-xs text-fg-muted">{lead.company ?? 'Perorangan'}</p>
        </Link>
        {/* Nilai internal — hanya pernah tampil di area admin (PRD 6.4). */}
        <MarginBadge value={lead.grossMarginPct} />
      </div>

      <p className="mt-2 truncate text-xs text-fg-subtle">{lead.categoryName}</p>
      <p className="tabular mt-0.5 text-sm font-semibold text-fg">
        {formatRupiahRange(lead.totalMin, lead.totalMax)}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {lead.overdueReminders > 0 && (
          <Badge variant="danger" title="Pengingat follow-up sudah lewat jatuh tempo">
            {lead.overdueReminders} pengingat lewat
          </Badge>
        )}
        {lead.overrideStatus === 'PENDING_APPROVAL' && (
          <Badge variant="warning" title="Override harga menunggu persetujuan (BR-16)">
            Override menunggu
          </Badge>
        )}
        {lead.needsDeepDiscovery && (
          <Badge variant="accent" title="Porsi fitur custom melebihi batas (BR-15)">
            Perlu discovery
          </Badge>
        )}
        {lead.lostReason && (
          <Badge variant="neutral">{LOST_REASON_LABEL[lead.lostReason]}</Badge>
        )}
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-subtle">
        <div className="flex gap-1">
          <dt>Penanggung jawab</dt>
          <dd className="text-fg-muted">{lead.ownerName ?? 'belum ada'}</dd>
        </div>
        <div className="flex gap-1">
          {/* Waktu di konfigurator adalah sinyal kualifikasi yang murah (O2). */}
          <dt>Di konfigurator</dt>
          <dd className="tabular text-fg-muted">{formatDuration(lead.timeSpentSeconds)}</dd>
        </div>
      </dl>

      <div className="mt-2.5 border-t border-border pt-2.5">
        <Select
          className="h-8 text-[13px]"
          value={lead.stage}
          disabled={pending}
          aria-label={`Pindahkan ${lead.contactName} ke tahap lain`}
          onChange={(event) => onStageChange(lead, event.target.value as LeadStage)}
        >
          {stages.map((stage) => (
            <option key={stage} value={stage}>
              {LEAD_STAGE_LABEL[stage]}
            </option>
          ))}
        </Select>
      </div>

      <p className="tabular mt-2 text-[11px] text-fg-subtle">
        {lead.quoteNumber} · nilai atas {formatRupiahShort(lead.totalMax)}
      </p>
    </article>
  );
}
