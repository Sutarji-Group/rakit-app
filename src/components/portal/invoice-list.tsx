import { AlertTriangle, ReceiptText } from 'lucide-react';
import { Alert, Badge, Card, EmptyState, Stat } from '@/components/ui';
import {
  INVOICE_KIND_LABEL,
  INVOICE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from '@/lib/domain/enums';
import { formatDate, formatRupiah } from '@/lib/format';
import { INVOICE_STATUS_TONE, PAYMENT_STATUS_TONE } from './status';
import type { PortalInvoice } from '@/lib/services/portal';

/** Status yang berarti tagihan masih menunggu pembayaran klien. */
const OUTSTANDING = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'];

/**
 * Riwayat pembayaran dan invoice (J5).
 *
 * Invoice berstatus DRAFT sengaja tetap ditampilkan namun ditandai jelas:
 * klien perlu tahu tagihan berikutnya sedang disiapkan, tetapi tidak boleh
 * mengira dirinya sudah harus membayar.
 */
export function InvoiceList({ invoices }: { invoices: PortalInvoice[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText className="size-8" aria-hidden="true" />}
        title="Belum ada tagihan"
        description="Tagihan pertama terbit setelah kontrak dan termin pembayaran disepakati."
      />
    );
  }

  const billed = invoices
    .filter((invoice) => invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED')
    .reduce((total, invoice) => total + invoice.total, 0);
  const paid = invoices.reduce((total, invoice) => total + invoice.paidAmount, 0);
  const outstanding = Math.max(0, billed - paid);

  const overdue = invoices.filter(
    (invoice) => OUTSTANDING.includes(invoice.status) && new Date(invoice.dueAt) < new Date(),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Sudah ditagihkan" value={formatRupiah(billed)} />
        <Stat label="Sudah dibayar" value={formatRupiah(paid)} tone="success" />
        <Stat
          label="Sisa tagihan"
          value={formatRupiah(outstanding)}
          tone={outstanding > 0 ? 'warning' : 'neutral'}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {overdue.length > 0 && (
        <Alert
          tone="danger"
          title={`${overdue.length} tagihan melewati tanggal jatuh tempo`}
          icon={<AlertTriangle className="size-4" aria-hidden="true" />}
        >
          Tagihan yang tertahan dapat menghentikan pekerjaan pada tahap berikutnya. Hubungi PM Anda
          bila ada kendala pembayaran.
        </Alert>
      )}

      <ul className="flex flex-col gap-3">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="tabular text-base font-semibold leading-tight text-fg">
                      {invoice.number}
                    </h3>
                    <Badge variant={INVOICE_STATUS_TONE[invoice.status]}>
                      {INVOICE_STATUS_LABEL[invoice.status]}
                    </Badge>
                    <Badge variant="outline">{INVOICE_KIND_LABEL[invoice.kind]}</Badge>
                  </div>
                  {invoice.milestoneName && (
                    <p className="mt-1 text-sm text-fg-muted">{invoice.milestoneName}</p>
                  )}
                </div>

                <div className="text-right">
                  <p className="tabular text-base font-semibold text-fg">
                    {formatRupiah(invoice.total)}
                  </p>
                  <p className="tabular text-xs text-fg-subtle">
                    termasuk PPN {formatRupiah(invoice.taxAmount)}
                  </p>
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-fg-subtle">Terbit</dt>
                  <dd className="mt-0.5 text-sm text-fg">{formatDate(invoice.issuedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">Jatuh tempo</dt>
                  <dd className="mt-0.5 text-sm text-fg">{formatDate(invoice.dueAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">Dibayar</dt>
                  <dd className="tabular mt-0.5 text-sm text-fg">
                    {invoice.paidAmount > 0 ? formatRupiah(invoice.paidAmount) : '—'}
                  </dd>
                </div>
              </dl>

              {invoice.payments.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                    Pembayaran diterima
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {invoice.payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-fg-muted">
                          {PAYMENT_METHOD_LABEL[payment.method]} · {formatDate(payment.paidAt)}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="tabular font-medium text-fg">
                            {formatRupiah(payment.amount)}
                          </span>
                          <Badge variant={PAYMENT_STATUS_TONE[payment.status]}>
                            {PAYMENT_STATUS_LABEL[payment.status]}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
