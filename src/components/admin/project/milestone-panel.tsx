'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABEL, INVOICE_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatPercent, formatRupiah } from '@/lib/format';
import { addMilestone, setMilestoneStatus } from '@/app/admin/proyek/actions';
import { useProjectAction } from './use-project-action';
import {
  INVOICE_STATUS_TONE,
  MILESTONE_STATUS_TONE,
  type MilestoneRow,
} from './shared';

/**
 * Milestone proyek beserta status persetujuan klien (H4, J4).
 *
 * Persetujuan boleh datang dari dua jalur — klien menekan tombol di portal,
 * atau PM mencatat berita acara yang ditandatangani di luar sistem — dan
 * keduanya berakhir pada baris yang sama supaya tidak pernah ada dua versi
 * kebenaran tentang termin mana yang sudah diterima.
 */
export function MilestonePanel({
  projectId,
  milestones,
  contractValue,
}: {
  projectId: string;
  milestones: MilestoneRow[];
  contractValue: number;
}) {
  const [open, setOpen] = useState(false);
  const usedPct = milestones.reduce((sum, milestone) => sum + milestone.percentage, 0);
  const remainingPct = Math.max(0, Math.round((100 - usedPct) * 10) / 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">
          Termin terpakai{' '}
          <span className="tabular font-medium text-fg">{formatPercent(usedPct / 100, 0)}</span> dari
          nilai kontrak {formatRupiah(contractValue)}.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Tambah milestone
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {milestones.map((milestone) => (
          <MilestoneItem key={milestone.id} milestone={milestone} />
        ))}
      </ul>

      <AddMilestoneDialog
        projectId={projectId}
        open={open}
        remainingPct={remainingPct}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

function MilestoneItem({ milestone }: { milestone: MilestoneRow }) {
  const { pending, run } = useProjectAction();

  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-fg">{milestone.name}</p>
            <Badge variant={MILESTONE_STATUS_TONE[milestone.status]}>
              {MILESTONE_STATUS_LABEL[milestone.status]}
            </Badge>
          </div>
          {milestone.description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">
              {milestone.description}
            </p>
          )}
          <p className="mt-2 text-xs text-fg-subtle">
            Jatuh tempo {formatDate(milestone.dueDate)}
            {milestone.approvedAt && ` · disetujui ${formatDate(milestone.approvedAt)}`}
          </p>
        </div>

        <div className="text-right">
          <p className="tabular text-sm font-semibold text-fg">{formatRupiah(milestone.amount)}</p>
          <p className="tabular text-xs text-fg-subtle">
            {formatPercent(milestone.percentage / 100, 0)} dari nilai kontrak
          </p>
          {milestone.invoiceNumber && milestone.invoiceStatus && (
            <Badge variant={INVOICE_STATUS_TONE[milestone.invoiceStatus]} className="mt-2">
              {milestone.invoiceNumber} · {INVOICE_STATUS_LABEL[milestone.invoiceStatus]}
            </Badge>
          )}
        </div>
      </div>

      {milestone.status === 'REVISION_REQUESTED' && milestone.clientNote && (
        <Alert tone="danger" title="Klien meminta revisi" className="mt-3">
          {milestone.clientNote}
        </Alert>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field label="Status milestone" className="w-full max-w-64" htmlFor={`status-${milestone.id}`}>
          <Select
            id={`status-${milestone.id}`}
            value={milestone.status}
            disabled={pending}
            className="h-9"
            onChange={(event) =>
              run(() =>
                setMilestoneStatus({
                  milestoneId: milestone.id,
                  status: event.target.value as MilestoneRow['status'],
                }),
              )
            }
          >
            {MILESTONE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {MILESTONE_STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>

        {milestone.status !== 'APPROVED' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={pending}
            onClick={() =>
              run(() => setMilestoneStatus({ milestoneId: milestone.id, status: 'APPROVED' }))
            }
          >
            Catat persetujuan klien
          </Button>
        )}
      </div>

      {milestone.status === 'APPROVED' && milestone.hasDraftInvoice && (
        <p className="mt-2 text-xs text-fg-subtle">
          Invoice terminnya masih draft — terbitkan dari daftar invoice di bawah.
        </p>
      )}
    </li>
  );
}

function AddMilestoneDialog({
  projectId,
  open,
  remainingPct,
  onClose,
}: {
  projectId: string;
  open: boolean;
  remainingPct: number;
  onClose: () => void;
}) {
  const { pending, error, run, reset } = useProjectAction();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [percentage, setPercentage] = useState('0');
  const [dueDate, setDueDate] = useState('');

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    run(
      () =>
        addMilestone({
          projectId,
          name,
          description: description || null,
          percentage,
          dueDate: dueDate || null,
        }),
      {
        onSuccess: () => {
          setName('');
          setDescription('');
          setPercentage('0');
          setDueDate('');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Tambah milestone"
      description="Milestone bertermin otomatis dibuatkan invoice draft, sehingga tidak ada termin yang disepakati tetapi lupa ditagih."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={pending}>
            Batal
          </Button>
          <Button type="button" onClick={submit} isLoading={pending}>
            Simpan milestone
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <Field label="Nama milestone" htmlFor="milestone-name" required>
          <Input
            id="milestone-name"
            value={name}
            maxLength={120}
            placeholder="Serah Terima Modul Laporan"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field
          label="Kriteria penerimaan"
          htmlFor="milestone-description"
          hint="Tuliskan apa yang harus terlihat klien agar termin ini dianggap selesai."
        >
          <Textarea
            id="milestone-description"
            value={description}
            maxLength={1000}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Porsi termin (%)"
            htmlFor="milestone-pct"
            hint={`Sisa yang belum dialokasikan: ${remainingPct}%. Isi 0 untuk milestone tanpa tagihan.`}
          >
            <Input
              id="milestone-pct"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={5}
              className="tabular"
              value={percentage}
              onChange={(event) => setPercentage(event.target.value)}
            />
          </Field>

          <Field label="Jatuh tempo" htmlFor="milestone-due">
            <Input
              id="milestone-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
