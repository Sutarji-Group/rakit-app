import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import { CogsTable } from '@/components/admin/pricing/cogs-table';
import { VersionActions } from '@/components/admin/pricing/version-actions';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescRow,
  EmptyState,
  Stat,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { FROZEN_CONFIGURATION_STATUSES } from '@/lib/domain/enums';
import { formatDate, formatNumber, formatPercent, formatRupiah } from '@/lib/format';
import { toPricingRuleSnapshot } from '@/lib/pricing';

export const metadata = { title: 'Mesin Harga' };

const PRIMARY_LINK =
  'inline-flex h-9 select-none items-center justify-center rounded-lg bg-brand px-4 text-sm ' +
  'font-medium text-brand-fg shadow-xs transition-colors hover:bg-brand-hover ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const SECONDARY_LINK =
  'inline-flex h-9 select-none items-center justify-center rounded-lg border border-border ' +
  'bg-surface-sunken px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-raised ' +
  'hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/**
 * Papan mesin harga (M1–M4, M8).
 *
 * Menampilkan aturan yang sedang dipakai konfigurasi baru beserta seluruh
 * riwayat versinya. Riwayat penting karena setiap penawaran terbit terikat pada
 * versi aturannya sendiri — perubahan tarif tidak berlaku surut (BR-07).
 */
export default async function PricingEnginePage() {
  await requireArea('pricing', '/admin/harga');

  const [rules, issuedGroups] = await Promise.all([
    prisma.pricingRule.findMany({
      orderBy: { version: 'desc' },
      include: {
        author: { select: { name: true } },
        _count: { select: { configurations: true, priceSnapshots: true } },
      },
    }),
    prisma.configuration.groupBy({
      by: ['pricingRuleId'],
      where: { status: { in: FROZEN_CONFIGURATION_STATUSES } },
      _count: { _all: true },
    }),
  ]);

  // Konfigurasi terbit per versi: inilah yang membekukan sebuah versi menjadi
  // arsip harga dan memaksa perubahan berikutnya menjadi versi baru (M8).
  const issuedByRule = new Map(
    issuedGroups.map((group) => [group.pricingRuleId, group._count._all]),
  );

  const active = rules.find((rule) => rule.isActive) ?? null;
  const snapshot = active ? toPricingRuleSnapshot(active) : null;

  return (
    <>
      <PageHeader
        title="Mesin Harga"
        description="Tarif referensi, pengali, asumsi biaya internal, dan pagar pengaman komersial yang menjadi dasar setiap angka di seluruh platform (PRD bagian 6)."
        actions={
          <>
            <Link href="/admin/harga/simulator" className={SECONDARY_LINK}>
              Simulator harga
            </Link>
            <Link href="/admin/harga/baru" className={PRIMARY_LINK}>
              Versi aturan baru
            </Link>
          </>
        }
      />

      <PageBody className="flex flex-col gap-5">
        {rules.length === 0 ? (
          <EmptyState
            title="Belum ada versi aturan harga"
            description="Di sini akan tampil aturan harga yang sedang dipakai konfigurator beserta seluruh riwayat versinya: tarif referensi per man-day, pengali tipe fitur, asumsi biaya internal, diskon skala, dan pagar pengaman komersial. Buat versi pertama dari nilai bawaan PRD untuk memulai."
            action={
              <Link href="/admin/harga/baru" className={PRIMARY_LINK}>
                Buat versi pertama
              </Link>
            }
          />
        ) : (
          <>
            {!active && (
              <Alert tone="danger" title="Tidak ada versi aturan yang aktif">
                Konfigurator memerlukan satu versi aktif untuk menghitung harga. Aktifkan salah satu
                versi di tabel riwayat di bawah.
              </Alert>
            )}

            {active && snapshot && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat
                    label="Tarif referensi"
                    value={formatRupiah(snapshot.referenceRatePerManDay)}
                    hint="per man-day referensi (M1)"
                  />
                  <Stat
                    label="Paket dasar Core"
                    value={formatRupiah(snapshot.corePackagePrice)}
                    hint="tarif tetap, bukan penjumlahan fitur Core"
                  />
                  <Stat
                    label="Biaya setup"
                    value={formatRupiah(snapshot.setupFee)}
                    hint="tetap, tidak ikut didiskon (BR-14)"
                  />
                  <Stat
                    label="Nilai proyek minimum"
                    value={formatRupiah(snapshot.minProjectValue)}
                    hint="BR-13"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      Aturan aktif — v{active.version} · {active.label}
                    </CardTitle>
                    <CardDescription>
                      Berlaku sejak {formatDate(active.effectiveFrom)}
                      {active.author?.name ? ` · disimpan oleh ${active.author.name}` : ''}. Seluruh
                      konfigurasi baru memakai versi ini; konfigurasi lama tetap memakai versinya
                      sendiri (BR-07).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 lg:grid-cols-2">
                    <dl>
                      <DescRow
                        label="Pengali Standard"
                        value={`${formatNumber(snapshot.multiplierStandard, 2)}×`}
                      />
                      <DescRow
                        label="Pengali Configurable"
                        value={`${formatNumber(snapshot.multiplierConfigurable, 2)}×`}
                      />
                      <DescRow
                        label="Pengali Custom"
                        value={`${formatNumber(snapshot.multiplierCustom, 2)}×`}
                      />
                      <DescRow
                        label="Diskon skala tertinggi"
                        value={formatPercent(
                          Math.max(
                            0,
                            ...snapshot.volumeDiscountTiers.map((tier) => tier.discountPct),
                          ),
                        )}
                      />
                      <DescRow
                        label="Pita margin sehat"
                        value={`${formatPercent(snapshot.targetGrossMarginMin)} – ${formatPercent(snapshot.targetGrossMarginMax)}`}
                      />
                      <DescRow
                        label="Ambang margin wajib approval"
                        value={`${formatPercent(snapshot.minGrossMarginPct)} (BR-17)`}
                      />
                      <DescRow
                        label="Kuota override sales"
                        value={`${formatPercent(snapshot.salesOverrideQuotaPct)} (BR-16)`}
                      />
                      <DescRow
                        label="Masa berlaku penawaran"
                        value={`${snapshot.quoteValidityDays} hari (BR-06)`}
                      />
                    </dl>

                    <div className="flex flex-col gap-3">
                      {active.notes && (
                        <Alert tone="neutral" title="Catatan perubahan">
                          {active.notes}
                        </Alert>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/harga/${active.id}`} className={PRIMARY_LINK}>
                          Ubah aturan aktif
                        </Link>
                        <Link
                          href={`/admin/harga/baru?dari=${active.id}`}
                          className={SECONDARY_LINK}
                        >
                          Salin jadi versi baru
                        </Link>
                      </div>
                      <p className="text-xs leading-relaxed text-fg-subtle">
                        Untuk perubahan tarif yang berdampak luas, salin dulu menjadi versi draft,
                        uji di simulator, baru aktifkan. Dengan begitu penawaran yang sedang berjalan
                        tidak ikut bergeser.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Penurunan COGS per man-day</CardTitle>
                    <CardDescription>
                      PRD 6.2. Angka inilah yang menjadi dasar seluruh proyeksi margin di papan
                      internal, dan tidak pernah ditampilkan ke klien.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CogsTable rule={snapshot} />
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Riwayat versi</CardTitle>
                <CardDescription>
                  Setiap versi adalah arsip harga. Versi yang sudah dipakai penawaran terbit tidak
                  dapat diubah maupun dihapus — perubahan berikutnya melahirkan versi baru (BR-07 /
                  M8).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th className="min-w-16">Versi</Th>
                        <Th className="min-w-56">Nama</Th>
                        <Th className="min-w-32">Status</Th>
                        <Th className="min-w-36">Berlaku sejak</Th>
                        <Th className="min-w-40 text-right">Tarif referensi</Th>
                        <Th className="min-w-44 text-right">Konfigurasi terikat</Th>
                        <Th className="min-w-40">Disimpan oleh</Th>
                        <Th className="w-40 text-right">Aksi</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => {
                        const issued = issuedByRule.get(rule.id) ?? 0;
                        return (
                          <Tr key={rule.id}>
                            <Td className="tabular font-semibold">v{rule.version}</Td>
                            <Td>
                              <Link
                                href={`/admin/harga/${rule.id}`}
                                className="font-medium text-fg hover:text-brand hover:underline"
                              >
                                {rule.label}
                              </Link>
                              {rule.notes && (
                                <span className="block max-w-md truncate text-xs text-fg-subtle">
                                  {rule.notes}
                                </span>
                              )}
                            </Td>
                            <Td>
                              {rule.isActive ? (
                                <Badge variant="success">Aktif</Badge>
                              ) : issued > 0 ? (
                                <Badge variant="neutral">Arsip</Badge>
                              ) : (
                                <Badge variant="outline">Draft</Badge>
                              )}
                            </Td>
                            <Td className="tabular text-fg-muted">
                              {formatDate(rule.effectiveFrom)}
                            </Td>
                            <Td className="tabular text-right">
                              {formatRupiah(rule.referenceRatePerManDay)}
                            </Td>
                            <Td className="tabular text-right">
                              {rule._count.configurations}
                              <span className="text-fg-subtle"> · {issued} terbit</span>
                            </Td>
                            <Td className="text-fg-muted">{rule.author?.name ?? '—'}</Td>
                            <Td>
                              <VersionActions
                                ruleId={rule.id}
                                version={rule.version}
                                isActive={rule.isActive}
                                usageCount={
                                  rule._count.configurations + rule._count.priceSnapshots
                                }
                              />
                            </Td>
                          </Tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </TableWrapper>
              </CardContent>
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}
