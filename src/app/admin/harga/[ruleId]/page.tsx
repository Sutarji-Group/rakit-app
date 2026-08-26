import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@/components/admin';
import { GuardrailForm } from '@/components/admin/pricing/guardrail-form';
import { PricingRuleForm } from '@/components/admin/pricing/rule-form';
import { ruleToFormValues, ruleToGuardrailValues } from '@/components/admin/pricing/rule-values';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import {
  CONFIGURATION_STATUS_LABEL,
  FROZEN_CONFIGURATION_STATUSES,
  type ConfigurationStatus,
} from '@/lib/domain/enums';
import { formatDate, formatDateTime } from '@/lib/format';

export const metadata = { title: 'Detail Aturan Harga' };

const SECONDARY_LINK =
  'inline-flex h-9 select-none items-center justify-center rounded-lg border border-border ' +
  'bg-surface-sunken px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-raised ' +
  'hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * Detail satu versi aturan harga (M1–M4, M7, M8).
 *
 * Form tarif dan form pagar pengaman sengaja terpisah karena keduanya adalah
 * keputusan yang berbeda: yang satu kalibrasi biaya, yang lain kebijakan
 * komersial. Jejak auditnya pun terpisah.
 */
export default async function PricingRuleDetailPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = await params;
  await requireArea('pricing', `/admin/harga/${ruleId}`);

  const rule = await prisma.pricingRule.findUnique({
    where: { id: ruleId },
    include: { author: { select: { name: true } } },
  });
  if (!rule) notFound();

  const [issuedCount, totalBound, boundConfigurations, auditEntries] = await Promise.all([
    prisma.configuration.count({
      where: { pricingRuleId: ruleId, status: { in: FROZEN_CONFIGURATION_STATUSES } },
    }),
    prisma.configuration.count({ where: { pricingRuleId: ruleId } }),
    prisma.configuration.findMany({
      where: { pricingRuleId: ruleId },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { id: true, name: true, status: true, updatedAt: true },
    }),
    prisma.auditLog.findMany({
      where: { entity: 'PricingRule', entityId: ruleId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, actorLabel: true, action: true, summary: true, createdAt: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Mesin Harga', href: '/admin/harga' },
          { label: `v${rule.version}` },
        ]}
        title={`v${rule.version} · ${rule.label}`}
        description={
          <span>
            Berlaku sejak {formatDate(rule.effectiveFrom)}
            {rule.author?.name ? ` · disimpan oleh ${rule.author.name}` : ''}. Terakhir diperbarui{' '}
            {formatDateTime(rule.updatedAt)}.
          </span>
        }
        actions={
          <>
            <Badge variant={rule.isActive ? 'success' : issuedCount > 0 ? 'neutral' : 'outline'} size="md">
              {rule.isActive ? 'Aktif' : issuedCount > 0 ? 'Arsip' : 'Draft'}
            </Badge>
            <Link href={`/admin/harga/simulator?banding=${rule.id}`} className={SECONDARY_LINK}>
              Uji di simulator
            </Link>
            <Link href={`/admin/harga/baru?dari=${rule.id}`} className={SECONDARY_LINK}>
              Salin jadi versi baru
            </Link>
          </>
        }
      />

      <PageBody className="flex flex-col gap-5">
        {issuedCount > 0 && (
          <Alert tone="warning" title="Versi ini sudah menjadi arsip harga">
            {issuedCount} konfigurasi terbit dihitung dengan tarif versi ini. Setiap penyimpanan —
            baik tarif maupun pagar pengaman — akan melahirkan versi baru dan membiarkan versi ini
            utuh, karena perubahan tarif tidak boleh berlaku surut (BR-07 / PRD 6.9).
          </Alert>
        )}

        <PricingRuleForm
          mode="edit"
          ruleId={rule.id}
          version={rule.version}
          isActive={rule.isActive}
          issuedConfigCount={issuedCount}
          initialValues={ruleToFormValues(rule)}
          guardrails={ruleToGuardrailValues(rule)}
        />

        <GuardrailForm
          ruleId={rule.id}
          version={rule.version}
          issuedConfigCount={issuedCount}
          initialValues={ruleToGuardrailValues(rule)}
        />

        <Card>
          <CardHeader>
            <CardTitle>Konfigurasi yang terikat versi ini</CardTitle>
            <CardDescription>
              {totalBound} konfigurasi memakai v{rule.version}, {issuedCount} di antaranya sudah
              terbit dan harganya terkunci pada tarif versi ini (M8).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {boundConfigurations.length === 0 ? (
              <EmptyState
                title="Belum ada konfigurasi yang memakai versi ini"
                description="Selama belum dipakai konfigurasi mana pun, versi ini masih boleh diubah langsung maupun dihapus."
              />
            ) : (
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th className="min-w-56">Konfigurasi</Th>
                      <Th className="min-w-44">Status</Th>
                      <Th className="min-w-40">Diperbarui</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {boundConfigurations.map((configuration) => (
                      <Tr key={configuration.id}>
                        <Td className="font-medium">{configuration.name}</Td>
                        <Td className="text-fg-muted">
                          {CONFIGURATION_STATUS_LABEL[configuration.status as ConfigurationStatus] ??
                            configuration.status}
                        </Td>
                        <Td className="tabular text-fg-muted">
                          {formatDateTime(configuration.updatedAt)}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jejak audit</CardTitle>
            <CardDescription>
              Setiap perubahan tarif berdampak langsung ke angka yang dilihat calon klien, sehingga
              siapa mengubah apa selalu tercatat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditEntries.length === 0 ? (
              <EmptyState
                title="Belum ada perubahan tercatat"
                description="Riwayat siapa mengubah tarif atau pagar pengaman versi ini akan muncul di sini setelah penyimpanan pertama."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{entry.action}</Badge>
                      <span className="text-sm font-medium text-fg">{entry.actorLabel}</span>
                      <span className="tabular text-xs text-fg-subtle">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-fg-muted">{entry.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
