import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Stat,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { listInvoiceBoard } from '@/lib/services/billing';
import { INVOICE_KIND_LABEL, INVOICE_STATUS_LABEL, type InvoiceKind } from '@/lib/domain/enums';
import { formatDate, formatRupiah } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT = {
  DRAFT: 'neutral',
  SENT: 'info',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
} as const;

/** Modul H — papan tagihan lintas proyek dengan penandaan jatuh tempo (H5). */
export default async function TagihanPage() {
  await requireArea('projects');
  const invoices = await listInvoiceBoard();

  const outstanding = invoices
    .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((sum, i) => sum + i.remaining, 0);
  const overdue = invoices.filter((i) => i.isOverdue);
  const awaitingVerification = invoices.filter((i) => i.pendingVerificationCount > 0);
  const collected = invoices.reduce((sum, i) => sum + i.paidAmount, 0);

  return (
    <>
      <PageHeader
        title="Tagihan & Pembayaran"
        description={
          <>
            Termin mengikuti milestone proyek (30/40/30). Invoice baru dapat ditagihkan setelah
            milestone-nya disetujui klien di portal.
          </>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Belum tertagih" value={formatRupiah(outstanding)} hint="Sisa seluruh invoice berjalan" />
          <Stat label="Sudah diterima" value={formatRupiah(collected)} tone="success" hint="Pembayaran terverifikasi" />
          <Stat
            label="Lewat jatuh tempo"
            value={overdue.length}
            tone={overdue.length > 0 ? 'danger' : 'neutral'}
            hint={overdue.length > 0 ? 'Perlu ditindaklanjuti hari ini' : 'Tidak ada yang terlambat'}
          />
          <Stat
            label="Menunggu verifikasi"
            value={awaitingVerification.length}
            tone={awaitingVerification.length > 0 ? 'warning' : 'neutral'}
            hint="Bukti transfer belum diperiksa"
          />
        </div>

        {overdue.length > 0 && (
          <Alert tone="danger" title={`${overdue.length} invoice sudah lewat jatuh tempo`}>
            {overdue
              .map((i) => `${i.number} (${i.clientName}, terlambat ${Math.abs(i.daysUntilDue)} hari)`)
              .join(' · ')}
            . Pengiriman pengingat otomatis membutuhkan layanan email yang belum tersambung, jadi
            daftar ini disiapkan untuk ditindaklanjuti manusia — bukan janji pengingat yang
            sebenarnya tidak pernah terkirim.
          </Alert>
        )}

        {invoices.length === 0 ? (
          <EmptyState
            title="Belum ada invoice"
            description="Invoice terbit otomatis bersama milestone saat sebuah konfigurasi yang dimenangkan dikonversi menjadi proyek."
            action={
              <Button asChild variant="secondary">
                <Link href="/admin/proyek">Buka daftar proyek</Link>
              </Button>
            }
          />
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Nomor</Th>
                  <Th>Proyek & klien</Th>
                  <Th>Termin</Th>
                  <Th className="text-right">Nilai</Th>
                  <Th className="text-right">Sisa</Th>
                  <Th>Jatuh tempo</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <Tr key={invoice.id}>
                    <Td className="font-medium">{invoice.number}</Td>
                    <Td>
                      <span className="block">{invoice.clientName}</span>
                      <span className="text-xs text-fg-subtle">{invoice.projectName}</span>
                    </Td>
                    <Td className="text-fg-muted">
                      {invoice.milestoneName ?? INVOICE_KIND_LABEL[invoice.kind as InvoiceKind]}
                    </Td>
                    <Td className="tabular text-right">{formatRupiah(invoice.total)}</Td>
                    <Td className="tabular text-right">
                      {invoice.remaining > 0 ? formatRupiah(invoice.remaining) : '—'}
                    </Td>
                    <Td>
                      <span className={invoice.isOverdue ? 'text-danger' : 'text-fg-muted'}>
                        {formatDate(invoice.dueAt)}
                      </span>
                      {invoice.isOverdue && (
                        <span className="block text-xs text-danger">
                          terlambat {Math.abs(invoice.daysUntilDue)} hari
                        </span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={STATUS_VARIANT[invoice.status]}>
                          {INVOICE_STATUS_LABEL[invoice.status]}
                        </Badge>
                        {invoice.pendingVerificationCount > 0 && (
                          <Badge variant="warning">
                            {invoice.pendingVerificationCount} bukti
                          </Badge>
                        )}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/admin/tagihan/${invoice.id}`}>Buka</Link>
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}

        <Alert tone="neutral" title="Payment gateway belum tersambung">
          Pembayaran dicatat lewat transfer manual dengan konfirmasi bukti. Pemilihan penyedia
          gateway (Midtrans atau Xendit) masih pertanyaan terbuka pada PRD, dan integrasinya
          membutuhkan akun sungguhan. Saat penyedia dipilih, webhook-nya cukup memanggil
          pencatatan pembayaran yang sama — sisa alurnya tidak berubah.
        </Alert>
      </PageBody>
    </>
  );
}
