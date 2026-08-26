'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  Field,
  Input,
  Select,
  useToast,
} from '@/components/ui';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  type InvoiceStatus,
} from '@/lib/domain/enums';
import { formatRupiah } from '@/lib/format';
import {
  recordPaymentAction,
  sendInvoiceAction,
  verifyPaymentAction,
} from '@/app/admin/tagihan/actions';

/**
 * Pencatatan dan verifikasi pembayaran (H1, H2).
 *
 * Pemisahan "catat" dan "verifikasi" disengaja: bukti transfer yang diunggah
 * klien belum tentu benar, dan invoice yang terlanjur ditandai lunas sulit
 * dikoreksi tanpa meninggalkan jejak yang membingungkan.
 */
export function InvoiceActions({
  mode,
  invoiceId,
  paymentId,
  remaining,
  invoiceStatus,
}: {
  mode: 'record' | 'verify';
  invoiceId: string;
  paymentId?: string;
  remaining: number;
  invoiceStatus: InvoiceStatus;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState<string>('MANUAL_TRANSFER');
  const [reference, setReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [verified, setVerified] = useState(true);

  const run = (action: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      toast({
        title: result.ok ? 'Tersimpan' : 'Gagal',
        description: result.message,
        tone: result.ok ? 'success' : 'danger',
      });
      if (result.ok) router.refresh();
    });

  if (mode === 'verify') {
    return (
      <span className="flex gap-1">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => verifyPaymentAction(paymentId!, invoiceId, true))}
        >
          Verifikasi
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => verifyPaymentAction(paymentId!, invoiceId, false))}
        >
          Tolak
        </Button>
      </span>
    );
  }

  if (invoiceStatus === 'CANCELLED') {
    return (
      <Alert tone="neutral" title="Invoice dibatalkan">
        Tidak ada pembayaran yang dapat dicatat pada invoice yang sudah dibatalkan.
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-fg">Catat pembayaran</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Sisa tagihan <span className="tabular font-medium">{formatRupiah(remaining)}</span>
          </p>
        </div>

        {invoiceStatus === 'DRAFT' && (
          <Alert tone="warning" title="Invoice masih draft">
            Terbitkan invoice lebih dulu supaya jatuh temponya mulai berjalan.
            <Button
              size="sm"
              className="mt-2"
              disabled={pending}
              onClick={() => run(() => sendInvoiceAction(invoiceId))}
            >
              Terbitkan invoice
            </Button>
          </Alert>
        )}

        {remaining <= 0 ? (
          <Alert tone="success" title="Tagihan ini sudah lunas">
            Seluruh nilai invoice sudah diterima dan terverifikasi.
          </Alert>
        ) : (
          <>
            <Field label="Nominal diterima" required htmlFor="pay-amount">
              <Input
                id="pay-amount"
                type="number"
                min={1}
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>

            <Field label="Cara pembayaran" htmlFor="pay-method">
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Nomor referensi"
              hint="Nomor transaksi dari rekening koran atau bukti transfer."
              htmlFor="pay-ref"
            >
              <Input
                id="pay-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TRF/2026/00381"
              />
            </Field>

            <Field
              label="Tautan bukti transfer"
              hint="Opsional. Tempel tautan berkas bukti yang dikirim klien."
              htmlFor="pay-proof"
            >
              <Input
                id="pay-proof"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>

            <Checkbox
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              label="Saya sudah memeriksa dana benar-benar masuk"
              hint="Bila belum diperiksa, pembayaran dicatat sebagai menunggu verifikasi dan belum mengurangi sisa tagihan."
            />

            <Button
              isLoading={pending}
              disabled={!amount || Number(amount) <= 0}
              onClick={() =>
                run(() =>
                  recordPaymentAction({
                    invoiceId,
                    amount: Number(amount),
                    method,
                    reference: reference || undefined,
                    proofUrl: proofUrl || undefined,
                    verified,
                  }),
                )
              }
            >
              Catat pembayaran
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
