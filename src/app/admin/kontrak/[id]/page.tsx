import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageBody, PageHeader } from '@/components/admin';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DescRow,
  FeatureTypeBadge,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { getContract } from '@/lib/services/contract';
import { CONTRACT_STATUS_LABEL, type ContractStatus, type FeatureType } from '@/lib/domain/enums';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format';
import { ContractActions } from '@/components/admin/contract/contract-actions';

export const dynamic = 'force-dynamic';

/** Detail satu kontrak beserta Lampiran A — Scope of Work (I1, I2). */
export default async function KontrakDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('leads');
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) notFound();

  const body = contract.parsedBody;
  const featureCount = body.scopeOfWork.reduce((sum, g) => sum + g.items.length, 0);
  const status = contract.status as ContractStatus;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Kontrak', href: '/admin/kontrak' }, { label: contract.number }]}
        title={contract.number}
        description={
          <>
            {contract.lead.company ?? contract.lead.contactName} · dari penawaran{' '}
            {contract.lead.quoteNumber} · {featureCount} fitur pada Lampiran A
          </>
        }
        actions={
          <>
            <Badge variant={status === 'SIGNED' ? 'success' : status === 'CANCELLED' ? 'danger' : 'neutral'} size="md">
              {CONTRACT_STATUS_LABEL[status]}
            </Badge>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/rakit/${contract.lead.configuration.publicToken}/ringkasan`}>
                Lihat rakitan asal
              </Link>
            </Button>
          </>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <ContractActions
          contractId={contract.id}
          status={status}
          defaultSignerName={contract.lead.contactName}
          defaultSignerEmail={contract.lead.email}
          signedAt={contract.signedAt?.toISOString() ?? null}
          signerName={contract.signerName}
        />

        {contract.signedAt && (
          <Alert tone="success" title="Kontrak sudah ditandatangani">
            Ditandatangani oleh {contract.signerName} pada {formatDateTime(contract.signedAt)}.
            Pencatatan ini dilakukan tim internal; bukti dari penyedia tanda tangan elektronik
            akan menggantikannya setelah integrasi tersedia.
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="flex min-w-0 flex-col gap-5">
            {body.sections.map((section) => (
              <Card key={section.heading}>
                <CardHeader>
                  <CardTitle>{section.heading}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {section.paragraphs?.map((paragraph, index) => (
                    <p key={index} className="text-sm leading-relaxed text-fg-muted">
                      {paragraph}
                    </p>
                  ))}
                  {section.rows && section.rows.length > 0 && (
                    <dl className="divide-y divide-border">
                      {section.rows.map((row) => (
                        <DescRow key={row.label} label={row.label} value={row.value} />
                      ))}
                    </dl>
                  )}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-fg-muted">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden="true" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Lampiran A — Scope of Work (I2) */}
            <Card>
              <CardHeader>
                <CardTitle>Lampiran A — Scope of Work</CardTitle>
                <p className="text-sm text-fg-muted">
                  {featureCount} item pekerjaan beserta kriteria penerimaannya. Daftar ini
                  diturunkan dari konfigurasi yang dimenangkan, bukan ditulis ulang.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {body.scopeOfWork.map((group) => (
                  <section key={group.group}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                      {group.group}
                    </h3>
                    <ol className="flex flex-col gap-2.5">
                      {group.items.map((item) => (
                        <li
                          key={item.name}
                          className="rounded-lg border border-border bg-surface-sunken/40 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-fg">{item.name}</p>
                            <FeatureTypeBadge type={item.type as FeatureType} />
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                            <span className="font-medium text-fg-subtle">Kriteria penerimaan:</span>{' '}
                            {item.acceptance}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside>
            <Card className="sticky top-6">
              <CardContent className="p-5">
                <dl className="divide-y divide-border">
                  <DescRow label="Nilai kontrak" value={formatRupiah(contract.totalValue)} emphasis />
                  <DescRow label="Nomor penawaran" value={contract.lead.quoteNumber} />
                  <DescRow label="Dibuat" value={formatDate(contract.createdAt)} />
                  <DescRow label="Rakitan" value={contract.lead.configuration.name} />
                  <DescRow label="Item pekerjaan" value={`${featureCount} fitur`} />
                </dl>
                <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
                  <Link href={`/admin/pipeline/${contract.lead.id}`}>Buka lead di pipeline</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
