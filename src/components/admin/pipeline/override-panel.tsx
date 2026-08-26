'use client';

import { useMemo, useState } from 'react';

import { MarginBadge } from '@/components/admin/margin-badge';
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
  Field,
  Input,
  Textarea,
} from '@/components/ui';
import { OVERRIDE_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDateTime, formatPercent, formatRupiah } from '@/lib/format';
import {
  evaluatePriceOverride,
  type PriceBreakdown,
  type PricingRuleSnapshot,
} from '@/lib/pricing';
import { approveOverride, overridePrice } from '@/app/admin/pipeline/actions';
import { usePipelineAction } from './use-pipeline-action';
import { OVERRIDE_STATUS_TONE, type OverrideState } from './shared';

/**
 * Override harga sales (O6, BR-16 & BR-17).
 *
 * Pratinjau memakai evaluatePriceOverride() — fungsi yang sama persis dengan
 * yang dijalankan server saat menyimpan. Sales karena itu melihat konsekuensi
 * diskon (kuota dan sisa margin) sebelum menekan tombol, bukan setelah
 * permintaannya ditolak.
 */
export function OverridePanel({
  leadId,
  rule,
  breakdown,
  current,
  canApprove,
  isPriceLocked,
}: {
  leadId: string;
  rule: PricingRuleSnapshot;
  breakdown: PriceBreakdown;
  current: OverrideState;
  canApprove: boolean;
  isPriceLocked: boolean;
}) {
  const { pending, run } = usePipelineAction();

  const base = breakdown.totalMax;
  const sliderMin = Math.max(0, Math.round((base * 0.6) / 250_000) * 250_000);
  const [price, setPrice] = useState<number>(current.value ?? base);
  const [reason, setReason] = useState('');

  const evaluation = useMemo(
    () => evaluatePriceOverride(rule, breakdown, price),
    [rule, breakdown, price],
  );

  const belowMinProjectValue = price < rule.minProjectValue;
  const canSubmit = price > 0 && reason.trim().length >= 10 && !isPriceLocked;

  const tone = evaluation.belowMinMargin
    ? 'danger'
    : !evaluation.withinQuota
      ? 'warning'
      : evaluation.requestedPct > 0
        ? 'success'
        : 'neutral';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Override harga</CardTitle>
        <CardDescription>
          Kuota diskon bebas persetujuan {formatPercent(rule.salesOverrideQuotaPct)} dari nilai
          penawaran (BR-16). Biaya setup {formatRupiah(rule.setupFee)} tidak ikut didiskon (BR-14).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {current.status !== 'NONE' && (
          <div className="rounded-lg border border-border bg-surface-sunken/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={OVERRIDE_STATUS_TONE[current.status]}>
                {OVERRIDE_STATUS_LABEL[current.status]}
              </Badge>
              {current.status === 'PENDING_APPROVAL' && canApprove && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={pending}
                  disabled={pending}
                  onClick={() => run(() => approveOverride({ leadId }))}
                >
                  Setujui override
                </Button>
              )}
            </div>
            <dl className="mt-2">
              <DescRow
                label="Harga override"
                value={current.value != null ? formatRupiah(current.value) : '—'}
                emphasis
              />
              <DescRow
                label="Potongan"
                value={current.pct != null ? formatPercent(current.pct, 1) : '—'}
              />
              {current.approvedAt && (
                <DescRow
                  label="Disetujui"
                  value={`${current.approvedByName ?? 'pengguna'} · ${formatDateTime(current.approvedAt)}`}
                />
              )}
            </dl>
            {current.reason && (
              <p className="mt-2 border-t border-border pt-2 text-xs leading-relaxed text-fg-muted">
                Alasan tercatat: {current.reason}
              </p>
            )}
            {current.status === 'PENDING_APPROVAL' && !canApprove && (
              <p className="mt-2 text-xs text-fg-muted">
                Menunggu persetujuan consultant atau super admin. Harga lama masih berlaku sampai
                disetujui.
              </p>
            )}
          </div>
        )}

        {isPriceLocked ? (
          <Alert tone="info" title="Harga sudah dikunci">
            Override tidak dapat diterapkan pada penawaran yang harganya sudah dikunci (BR-11).
            Hitung ulang penawaran lebih dulu bila memang perlu diubah.
          </Alert>
        ) : (
          <>
            <dl>
              <DescRow label="Nilai penawaran (batas atas)" value={formatRupiah(base)} emphasis />
              <DescRow
                label="Proyeksi COGS"
                value={formatRupiah(breakdown.internal.cogsProjection)}
              />
            </dl>

            <Field
              label="Harga hasil negosiasi"
              htmlFor="harga-override"
              hint="Geser atau ketik langsung. Dampaknya dihitung seketika."
            >
              <div className="flex flex-col gap-2">
                <Input
                  id="harga-override"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={250_000}
                  value={price}
                  disabled={pending}
                  className="tabular"
                  onChange={(event) => setPrice(Math.max(0, Math.round(Number(event.target.value) || 0)))}
                />
                <input
                  type="range"
                  min={sliderMin}
                  max={base}
                  step={250_000}
                  value={Math.min(Math.max(price, sliderMin), base)}
                  disabled={pending}
                  aria-label="Geser harga hasil negosiasi"
                  className="w-full accent-[var(--brand)]"
                  onChange={(event) => setPrice(Number(event.target.value))}
                />
              </div>
            </Field>

            <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-fg-subtle">Potongan</p>
                <p className="tabular mt-0.5 text-lg font-semibold text-fg">
                  {formatPercent(Math.max(evaluation.requestedPct, 0), 1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-fg-subtle">Kuota sales</p>
                <p className="mt-1">
                  <Badge variant={evaluation.withinQuota ? 'success' : 'warning'}>
                    {evaluation.withinQuota ? 'Di dalam kuota' : 'Di luar kuota'}
                  </Badge>
                </p>
              </div>
              <div>
                <p className="text-xs text-fg-subtle">Sisa gross margin</p>
                <p className="mt-1">
                  <MarginBadge
                    value={evaluation.resultingMarginPct}
                    minThreshold={rule.minGrossMarginPct}
                    targetMin={rule.targetGrossMarginMin}
                  />
                </p>
              </div>
            </div>

            <Alert tone={tone}>{evaluation.message}</Alert>

            {belowMinProjectValue && (
              <Alert tone="warning" title="Di bawah nilai proyek minimum">
                {formatRupiah(price)} berada di bawah batas {formatRupiah(rule.minProjectValue)}{' '}
                (BR-13). Proyek sekecil ini sulit dikerjakan dengan sehat — pertimbangkan mengurangi
                ruang lingkup, bukan harga.
              </Alert>
            )}

            <Field
              label="Alasan override"
              htmlFor="alasan-override"
              required
              hint="Tercatat permanen di audit log dan dibaca saat kalibrasi harga. Minimal 10 karakter."
            >
              <Textarea
                id="alasan-override"
                value={reason}
                maxLength={1000}
                disabled={pending}
                invalid={reason.trim().length > 0 && reason.trim().length < 10}
                placeholder="Contoh: kompetitor menawarkan Rp 92 jt, klien komit dua fase tambahan tahun depan."
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>

            <Button
              type="button"
              variant={evaluation.needsApproval && !canApprove ? 'secondary' : 'primary'}
              isLoading={pending}
              disabled={pending || !canSubmit}
              className="self-start"
              onClick={() =>
                run(() => overridePrice({ leadId, requestedPrice: price, reason }), {
                  // Alasan dikosongkan agar pengajuan berikutnya tidak diam-diam
                  // mewarisi alasan lama yang sudah tidak relevan.
                  onSuccess: () => setReason(''),
                })
              }
            >
              {evaluation.needsApproval && !canApprove
                ? 'Ajukan untuk persetujuan'
                : 'Terapkan override'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
