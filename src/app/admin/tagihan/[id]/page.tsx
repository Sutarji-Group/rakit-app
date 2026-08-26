import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageBody, PageHeader } from '@/components/admin';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DescRow,
  EmptyState,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { getInvoiceDetail } from '@/lib/services/billing';
import {
  INVOICE_KIND_LABEL,
  INVOICE_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type InvoiceKind,
  type InvoiceStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@/lib/domain/enums';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format';
import { InvoiceActions } from '@/components/admin/billing/invoice-actions';

export const dynamic = 'force-dynamic';

/** Detail invoice dan pencatatan pembayarannya (H1, H2, H3). */
export default async function TagihanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('projects');
  const { id } = await params;
  const invoice = await getInvoiceDetail(id);
  if (!invoice) notFound();

  const remaining = Math.max(0, invoice.total - invoice.paidAmount);
  const status = invoice.status as InvoiceStatus;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Tagihan', href: '/admin/tagihan' }, { label: invoice.number }]}
        title={invoice.number}
        description={
          <>
            {invoice.project.client?.company ?? invoice.project.client?.name ?? 'Klien'} ·{' '}
            {invoice.project.name} ·{' '}
            {invoice.milestone?.name ?? INVOICE_KIND_LABEL[invoice.kind as InvoiceKind]}
          </>
        }
        actions={
          <>
            <Badge
              variant={status === 'PAID' ? 'success' : status === 'OVERDUE' ? 'danger' : 'neutral'}
              size="md"
            >
              {INVOICE_STATUS_LABEL[status]}
            </Badge>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/admin/proyek/${invoice.project.id}`}>Buka proyek</Link>
            </Button>
          </>
        }
      />

      <PageBody className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Rincian tagihan</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <DescRow label="Nilai sebelum pajak" value={formatRupiah(invoice.subtotal)} />
                <DescRow
                  label={`PPN ${invoice.taxPct}%`}
                  value={formatRupiah(invoice.taxAmount)}
                />
                <DescRow label="Total tagihan" value={formatRupiah(invoice.total)} emphasis />
                <DescRow label="Sudah diterima" value={formatRupiah(invoice.paidAmount)} />
                <DescRow
                  label="Sisa tagihan"
                  value={remaining > 0 ? formatRupiah(remaining) : 'Lunas'}
                  emphasis
                />
                <DescRow label="Diterbitkan" value={formatDate(invoice.issuedAt)} />
                <DescRow label="Jatuh tempo" value={formatDate(invoice.dueAt)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat pembayaran</CardTitle>
              <p className="text-sm text-fg-muted">
                Transfer manual masuk berstatus menunggu verifikasi sampai buktinya diperiksa.
              </p>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <EmptyState
                  title="Belum ada pembayaran tercatat"
                  description="Catat pembayaran lewat panel di sebelah kanan setelah dana benar-benar masuk."
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {invoice.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-sunken/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="tabular text-sm font-medium text-fg">
                          {formatRupiah(payment.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {PAYMENT_METHOD_LABEL[payment.method as PaymentMethod]}
                          {payment.reference && ` · ${payment.reference}`}
                          {payment.paidAt && ` · ${formatDateTime(payment.paidAt)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant={
                            payment.status === 'SETTLED'
                              ? 'success'
                              : payment.status === 'FAILED'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {PAYMENT_STATUS_LABEL[payment.status as PaymentStatus]}
                        </Badge>
                        {payment.status === 'AWAITING_VERIFICATION' && (
                          <InvoiceActions
                            mode="verify"
                            invoiceId={invoice.id}
                            paymentId={payment.id}
                            remaining={remaining}
                            invoiceStatus={status}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside>
          <div className="sticky top-6">
            <InvoiceActions
              mode="record"
              invoiceId={invoice.id}
              remaining={remaining}
              invoiceStatus={status}
            />
          </div>
        </aside>
      </PageBody>
    </>
  );
}
