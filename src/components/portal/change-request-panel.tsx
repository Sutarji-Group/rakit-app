'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CirclePlus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { Alert, Badge, Button, Card, Dialog, EmptyState } from '@/components/ui';
import { CHANGE_REQUEST_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatRupiah, formatRupiahRange } from '@/lib/format';
import {
  approveChangeRequestAction,
  cancelChangeRequestAction,
  createChangeRequestAction,
} from '@/app/portal/actions';
import { CHANGE_REQUEST_STATUS_TONE } from './status';
import { usePortalAction } from './use-portal-action';
import type { ChangeRequestImpact, PortalChangeRequest } from '@/lib/services/portal';

/**
 * Permintaan perubahan / addendum (modul K).
 *
 * Dampak terhadap tanggal selesai selalu ditampilkan SEBELUM tombol setujui
 * ditekan (K4). Kejutan jadwal adalah keluhan nomor satu pada proyek addendum,
 * dan satu-satunya cara mencegahnya adalah menyebutkan tanggal barunya secara
 * eksplisit, bukan sekadar "akan sedikit mundur".
 */
export function ChangeRequestPanel({
  projectId,
  requests,
}: {
  projectId: string;
  requests: PortalChangeRequest[];
}) {
  const { pending, run } = usePortalAction();
  const [approving, setApproving] = useState<PortalChangeRequest | null>(null);
  const [cancelling, setCancelling] = useState<PortalChangeRequest | null>(null);

  function startNew() {
    // Aksi ini mengarahkan langsung ke konfigurator bila berhasil, sehingga
    // hasilnya hanya terlihat ketika gagal.
    run(() => createChangeRequestAction(projectId));
  }

  function approve() {
    if (!approving) return;
    run(() => approveChangeRequestAction(projectId, approving.id), () => setApproving(null));
  }

  function cancel() {
    if (!cancelling) return;
    run(() => cancelChangeRequestAction(projectId, cancelling.id), () => setCancelling(null));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-fg">Butuh fitur tambahan?</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-fg-muted">
              Konfigurator akan terbuka berisi seluruh fitur yang sudah terpasang di proyek ini,
              ditandai supaya Anda tahu mana yang sudah dibayar. Tambahkan fitur baru, lalu kembali
              ke halaman ini untuk melihat dampaknya terhadap biaya dan tanggal selesai.
            </p>
          </div>
          <Button
            onClick={startNew}
            isLoading={pending}
            leadingIcon={<CirclePlus className="size-4" aria-hidden="true" />}
          >
            Tambah fitur ke proyek ini
          </Button>
        </div>
      </Card>

      {requests.length === 0 ? (
        <EmptyState
          title="Belum ada permintaan perubahan"
          description="Semua penambahan fitur di luar lingkup awal akan tercatat di sini beserta nilai dan dampak jadwalnya."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <li key={request.id}>
              <RequestCard
                request={request}
                onApprove={() => setApproving(request)}
                onCancel={() => setCancelling(request)}
                disabled={pending}
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        size="lg"
        title="Setujui addendum"
        description="Periksa sekali lagi sebelum menyetujui. Setelah disetujui, nilai dan tanggal di bawah ini mengikat kedua belah pihak."
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproving(null)} disabled={pending}>
              Batal
            </Button>
            <Button
              onClick={approve}
              isLoading={pending}
              leadingIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
            >
              Ya, setujui addendum
            </Button>
          </>
        }
      >
        {approving?.impact && (
          <div className="flex flex-col gap-4">
            <ImpactDetail impact={approving.impact} />
            <Alert tone="warning" title="Yang terjadi setelah Anda menyetujui">
              <ul className="ml-4 list-disc space-y-1">
                <li>Invoice addendum terbit dengan tempo pembayaran 14 hari.</li>
                <li>Satu tahap pembayaran baru ditambahkan ke daftar milestone.</li>
                <li>Tanggal target selesai proyek diperbarui menjadi tanggal baru di atas.</li>
                <li>
                  Nilai yang disepakati memakai batas atas rentang, sehingga tidak ada tagihan
                  susulan untuk lingkup yang sama.
                </li>
              </ul>
            </Alert>
          </div>
        )}
      </Dialog>

      <Dialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title="Batalkan permintaan perubahan"
        description={
          cancelling
            ? `${cancelling.number} akan ditutup. Rakitan addendumnya tetap tersimpan di akun Anda.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelling(null)} disabled={pending}>
              Tidak jadi
            </Button>
            <Button variant="danger" onClick={cancel} isLoading={pending}>
              Ya, batalkan
            </Button>
          </>
        }
      />
    </div>
  );
}

function RequestCard({
  request,
  onApprove,
  onCancel,
  disabled,
}: {
  request: PortalChangeRequest;
  onApprove: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const impact = request.impact;
  const isOpen = ['DRAFT', 'SUBMITTED', 'ESTIMATED'].includes(request.status);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular text-xs font-semibold text-fg-subtle">{request.number}</span>
            <h3 className="text-base font-semibold leading-tight text-fg">{request.title}</h3>
            <Badge variant={CHANGE_REQUEST_STATUS_TONE[request.status]}>
              {CHANGE_REQUEST_STATUS_LABEL[request.status]}
            </Badge>
          </div>
          {request.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{request.description}</p>
          )}
          <p className="mt-1 text-xs text-fg-subtle">Dibuat {formatDate(request.createdAt)}</p>
        </div>

        {request.status === 'APPROVED' && request.approvedPrice !== null && (
          <div className="text-right">
            <p className="tabular text-base font-semibold text-fg">
              {formatRupiah(request.approvedPrice)}
            </p>
            <p className="text-xs text-fg-subtle">Disetujui {formatDate(request.approvedAt)}</p>
          </div>
        )}
      </div>

      {impact && (
        <div className="mt-4 border-t border-border pt-4">
          <ImpactDetail impact={impact} compact />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        {request.addendumToken && (
          <Button asChild size="sm" variant={isOpen ? 'primary' : 'secondary'}>
            <Link href={`/rakit/${request.addendumToken}`}>
              {isOpen ? 'Lanjutkan merakit addendum' : 'Lihat rakitan addendum'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        )}

        {isOpen && impact?.canApprove && (
          <Button
            size="sm"
            variant="accent"
            onClick={onApprove}
            disabled={disabled}
            leadingIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
          >
            Setujui addendum
          </Button>
        )}

        {isOpen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={disabled}
            leadingIcon={<Trash2 className="size-4" aria-hidden="true" />}
          >
            Batalkan
          </Button>
        )}
      </div>
    </Card>
  );
}

/** Rincian dampak addendum: fitur baru, nilai, dan pergeseran tanggal (K2, K4). */
function ImpactDetail({ impact, compact = false }: { impact: ChangeRequestImpact; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Fitur tambahan ({impact.additions.length})
        </p>
        {impact.additions.length === 0 ? (
          <p className="mt-1.5 text-sm text-fg-muted">
            Belum ada fitur baru di rakitan addendum ini.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {impact.additions.map((addition) => (
              <li key={addition.id}>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2 py-1 text-[13px] text-fg">
                  {addition.name}
                  {addition.isCustom && (
                    <Badge variant={addition.isEstimated ? 'accent' : 'warning'}>
                      {addition.isEstimated ? 'Custom' : 'Menunggu estimasi'}
                    </Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-sunken/60 p-3">
          <dt className="text-xs text-fg-subtle">Tambahan biaya proyek</dt>
          <dd className="tabular mt-1 text-lg font-semibold text-fg">
            {formatRupiahRange(impact.priceMin, impact.priceMax, false)}
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface-sunken/60 p-3">
          <dt className="text-xs text-fg-subtle">Tambahan waktu pengerjaan</dt>
          <dd className="tabular mt-1 text-lg font-semibold text-fg">
            {impact.extraWeeksMax === 0
              ? 'Tidak menggeser jadwal'
              : `+${impact.extraWeeksMax} minggu`}
          </dd>
        </div>
      </dl>

      {/* K4 — tanggal selesai lama versus baru, disebutkan eksplisit. */}
      <div className="rounded-lg border border-accent/25 bg-accent-soft p-3.5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-soft-fg">
          <CalendarClock className="size-4" aria-hidden="true" />
          Dampak terhadap tanggal selesai
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm text-accent-soft-fg line-through opacity-70">
            {formatDate(impact.currentTargetEndDate)}
          </span>
          <ArrowRight className="size-4 text-accent-soft-fg" aria-hidden="true" />
          <span className="text-base font-semibold text-accent-soft-fg">
            {formatDate(impact.newTargetEndDate)}
          </span>
        </div>
      </div>

      {impact.blockReason && !compact && (
        <Alert
          tone="warning"
          icon={<TriangleAlert className="size-4" aria-hidden="true" />}
          title="Belum dapat disetujui"
        >
          {impact.blockReason}
        </Alert>
      )}
      {impact.blockReason && compact && (
        <p className="text-sm text-warning-soft-fg">{impact.blockReason}</p>
      )}
    </div>
  );
}
