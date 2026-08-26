'use client';

import { useState } from 'react';

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
  Dialog,
  Field,
  Input,
} from '@/components/ui';
import { LEAD_STAGE_LABEL, type LeadStage } from '@/lib/domain/enums';
import { formatDate, formatRupiah } from '@/lib/format';
import { lockLeadPrice } from '@/app/admin/pipeline/actions';
import { canLockPriceAt } from './shared';
import { usePipelineAction } from './use-pipeline-action';

/**
 * Penguncian harga tetap (BR-11, PRD 6.9).
 *
 * Tombol sengaja mati sampai lead melewati Discovery Terjadwal: sebelum
 * discovery call, ruang lingkup belum cukup pasti untuk dijanjikan sebagai
 * angka tetap, dan janji itulah yang paling mahal untuk ditarik kembali.
 */
export function LockPricePanel({
  leadId,
  stage,
  canApprove,
  isPriceLocked,
  lockedPrice,
  lockedUntil,
  suggestedPrice,
  validityDays,
}: {
  leadId: string;
  stage: LeadStage;
  canApprove: boolean;
  isPriceLocked: boolean;
  lockedPrice: number | null;
  lockedUntil: string | null;
  suggestedPrice: number;
  validityDays: number;
}) {
  const { pending, run } = usePipelineAction();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState<number>(lockedPrice ?? suggestedPrice);

  const stageReady = canLockPriceAt(stage);
  const blockedReason = !canApprove
    ? 'Hanya consultant atau super admin yang dapat mengunci harga (BR-11).'
    : !stageReady
      ? `Tahap saat ini "${LEAD_STAGE_LABEL[stage]}". Harga baru boleh dikunci setelah Discovery Terjadwal.`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kunci harga tetap</CardTitle>
        <CardDescription>
          Setelah dikunci, harga berlaku {validityDays} hari dan penawaran berpindah ke tahap
          Proposal Final.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isPriceLocked ? (
          <>
            <Badge variant="success" size="md" className="self-start">
              Harga terkunci
            </Badge>
            <dl>
              <DescRow
                label="Nilai terkunci"
                value={lockedPrice != null ? formatRupiah(lockedPrice) : '—'}
                emphasis
              />
              <DescRow label="Berlaku sampai" value={formatDate(lockedUntil)} />
            </dl>
            <p className="text-xs leading-relaxed text-fg-muted">
              Setelah masa berlaku habis, penawaran harus dihitung ulang dengan aturan harga yang
              berlaku saat itu.
            </p>
          </>
        ) : (
          <>
            {blockedReason && <Alert tone="neutral">{blockedReason}</Alert>}
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              disabled={pending || blockedReason !== null}
              onClick={() => setOpen(true)}
            >
              Kunci harga tetap
            </Button>
          </>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        dismissible={!pending}
        title="Kunci harga penawaran"
        description="Angka ini menjadi harga tetap yang dijanjikan ke klien selama masa berlaku penawaran."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button
              type="button"
              isLoading={pending}
              disabled={pending || price <= 0}
              onClick={() =>
                run(() => lockLeadPrice({ leadId, lockedPrice: price }), {
                  onSuccess: () => setOpen(false),
                })
              }
            >
              Kunci harga
            </Button>
          </>
        }
      >
        <Field
          label="Harga tetap"
          htmlFor="harga-kunci"
          required
          hint={`Usulan sistem: ${formatRupiah(suggestedPrice)} — nilai penawaran terakhir setelah override yang disetujui.`}
        >
          <Input
            id="harga-kunci"
            type="number"
            inputMode="numeric"
            min={0}
            step={250_000}
            value={price}
            disabled={pending}
            className="tabular"
            onChange={(event) => setPrice(Math.max(0, Math.round(Number(event.target.value) || 0)))}
          />
        </Field>
      </Dialog>
    </Card>
  );
}
