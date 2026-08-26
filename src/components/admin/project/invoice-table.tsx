'use client';

import {
  Badge,
  Button,
  EmptyState,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { INVOICE_STATUS_LABEL } from '@/lib/domain/enums';
import { formatDate, formatRupiah } from '@/lib/format';
import { sendInvoice } from '@/app/admin/proyek/actions';
import { useProjectAction } from './use-project-action';
import { INVOICE_STATUS_TONE, type InvoiceRow } from './shared';

/**
 * Daftar invoice proyek beserta statusnya (H4).
 *
 * Invoice draft hanya dapat diterbitkan setelah milestone-nya disetujui:
 * menagih termin yang belum diterima klien adalah cara tercepat merusak
 * kepercayaan yang dibangun portal.
 */
export function InvoiceTable({ invoices }: { invoices: InvoiceRow[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        title="Belum ada invoice"
        description="Invoice termin dibuat otomatis saat konfigurasi dikonversi menjadi proyek, dan tampil di sini beserta status pembayarannya."
      />
    );
  }

  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <Th className="min-w-36">Nomor</Th>
            <Th className="min-w-44">Termin</Th>
            <Th className="min-w-32 text-right">Nilai</Th>
            <Th className="min-w-32 text-right">Dibayar</Th>
            <Th className="min-w-32">Jatuh tempo</Th>
            <Th className="min-w-32">Status</Th>
            <Th className="min-w-32 text-right">Tindakan</Th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <InvoiceLine key={invoice.id} invoice={invoice} />
          ))}
        </tbody>
      </Table>
    </TableWrapper>
  );
}

function InvoiceLine({ invoice }: { invoice: InvoiceRow }) {
  const { pending, run } = useProjectAction();

  return (
    <Tr>
      <Td>
        <span className="tabular font-medium text-fg">{invoice.number}</span>
        <p className="text-xs text-fg-subtle">{invoice.kindLabel}</p>
      </Td>
      <Td className="text-fg-muted">{invoice.milestoneName ?? '—'}</Td>
      <Td className="tabular text-right">
        {formatRupiah(invoice.total)}
        <p className="text-xs text-fg-subtle">termasuk PPN {formatRupiah(invoice.taxAmount)}</p>
      </Td>
      <Td className="tabular text-right text-fg-muted">{formatRupiah(invoice.paidAmount)}</Td>
      <Td className={invoice.isOverdue ? 'text-danger' : 'text-fg-muted'}>
        {formatDate(invoice.dueAt)}
      </Td>
      <Td>
        <Badge variant={INVOICE_STATUS_TONE[invoice.status]}>
          {INVOICE_STATUS_LABEL[invoice.status]}
        </Badge>
        {invoice.isOverdue && invoice.status !== 'OVERDUE' && (
          <Badge variant="danger" className="ml-1">
            Lewat tempo
          </Badge>
        )}
      </Td>
      <Td className="text-right">
        {invoice.status === 'DRAFT' ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={pending}
            onClick={() => run(() => sendInvoice({ invoiceId: invoice.id }))}
          >
            Terbitkan
          </Button>
        ) : (
          <span className="text-xs text-fg-subtle">Terbit {formatDate(invoice.issuedAt)}</span>
        )}
      </Td>
    </Tr>
  );
}
