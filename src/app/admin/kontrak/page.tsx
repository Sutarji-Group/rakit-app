import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/admin';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { listContracts } from '@/lib/services/contract';
import { prisma } from '@/lib/db/prisma';
import { CONTRACT_STATUS_LABEL, type ContractStatus } from '@/lib/domain/enums';
import { formatDate, formatRupiah } from '@/lib/format';
import { GenerateContractButton } from '@/components/admin/contract/generate-button';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<ContractStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  SENT: 'info',
  SIGNED: 'success',
  CANCELLED: 'danger',
};

/** Modul I — daftar kontrak digital. */
export default async function KontrakPage() {
  await requireArea('leads');

  const [contracts, readyLeads] = await Promise.all([
    listContracts(),
    // Lead yang sudah dimenangkan tetapi belum punya kontrak.
    prisma.lead.findMany({
      where: { stage: 'WON', contract: { is: null } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        quoteNumber: true,
        contactName: true,
        company: true,
        configuration: {
          select: { totalMax: true, lockedPrice: true, category: { select: { shortName: true } } },
        },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Kontrak Digital"
        description={
          <>
            Kontrak disusun dari konfigurasi yang dimenangkan, bukan diketik ulang. Lampiran
            Scope of Work-nya diturunkan langsung dari daftar fitur pada penawaran, sehingga
            mustahil ada fitur yang ada di penawaran tetapi hilang di kontrak.
          </>
        }
      />

      <PageBody className="flex flex-col gap-6">
        {readyLeads.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-fg">
              Siap dibuatkan kontrak ({readyLeads.length})
            </h2>
            <div className="flex flex-col gap-2">
              {readyLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">
                      {lead.company ?? lead.contactName}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {lead.quoteNumber} · {lead.configuration.category.shortName} ·{' '}
                      <span className="tabular">
                        {formatRupiah(lead.configuration.lockedPrice ?? lead.configuration.totalMax)}
                      </span>
                      {lead.configuration.lockedPrice ? ' (harga terkunci)' : ' (batas atas rentang)'}
                    </p>
                  </div>
                  <GenerateContractButton leadId={lead.id} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-fg">Kontrak yang sudah dibuat</h2>
          {contracts.length === 0 ? (
            <EmptyState
              title="Belum ada kontrak"
              description={
                readyLeads.length > 0
                  ? 'Buat kontrak dari salah satu lead yang sudah dimenangkan di atas.'
                  : 'Kontrak muncul di sini setelah sebuah lead dipindahkan ke tahap Menang di pipeline.'
              }
              action={
                <Button asChild variant="secondary">
                  <Link href="/admin/pipeline">Buka pipeline lead</Link>
                </Button>
              }
            />
          ) : (
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>Nomor</Th>
                    <Th>Klien</Th>
                    <Th>Penawaran</Th>
                    <Th className="text-right">Nilai</Th>
                    <Th>Status</Th>
                    <Th>Ditandatangani</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <Tr key={contract.id}>
                      <Td className="font-medium">{contract.number}</Td>
                      <Td>
                        {contract.lead.company ?? contract.lead.contactName}
                        <span className="ml-1.5 text-xs text-fg-subtle">
                          {contract.lead.configuration.category.shortName}
                        </span>
                      </Td>
                      <Td className="text-fg-muted">{contract.lead.quoteNumber}</Td>
                      <Td className="tabular text-right">{formatRupiah(contract.totalValue)}</Td>
                      <Td>
                        <Badge variant={STATUS_VARIANT[contract.status as ContractStatus]}>
                          {CONTRACT_STATUS_LABEL[contract.status as ContractStatus]}
                        </Badge>
                      </Td>
                      <Td className="text-fg-muted">
                        {contract.signedAt ? formatDate(contract.signedAt) : '—'}
                      </Td>
                      <Td className="text-right">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/admin/kontrak/${contract.id}`}>Buka</Link>
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          )}
        </section>

        <Alert tone="neutral" title="Tanda tangan elektronik belum tersambung">
          Penandatanganan saat ini dicatat manual oleh tim beserta nama, email, dan waktunya.
          Integrasi ke penyedia lokal seperti Privy atau Digisign membutuhkan akun dan perjanjian
          tersendiri; kolom bukti tanda tangan sudah disiapkan agar alur di sekitarnya tidak
          perlu berubah saat integrasi itu dilakukan.
        </Alert>
      </PageBody>
    </>
  );
}
