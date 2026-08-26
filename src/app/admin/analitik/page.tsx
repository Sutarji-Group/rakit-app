import Link from 'next/link';

import { MarginBadge, PageBody, PageHeader } from '@/components/admin';
import {
  ANALYTICS_PERIODS,
  BarRows,
  DEFAULT_ANALYTICS_PERIOD,
  DeviationBar,
  FunnelChart,
  abandonStepLabel,
  deviationReading,
  resolvePeriodDays,
  type BarRowItem,
} from '@/components/admin/analytics';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FeatureTypeBadge,
  Stat,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import {
  abandonmentPoints,
  buildFunnel,
  calibrationReport,
  configurationValueDistribution,
  customDemandReport,
  featureMovement,
} from '@/lib/analytics/report';
import { requireArea } from '@/lib/auth/guards';
import { FEATURE_TYPES, coerceEnum } from '@/lib/domain/enums';
import {
  formatDuration,
  formatManDay,
  formatNumber,
  formatPercent,
  formatRupiahShort,
} from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Analitik' };

/** Permintaan custom dikumpulkan pada jendela tetap agar polanya sempat terbentuk. */
const CUSTOM_DEMAND_DAYS = 90;

/**
 * Papan analitik lengkap (modul Q, PRD bagian 4 & 13).
 *
 * Urutannya bukan selera: corong lebih dulu karena di sanalah uang bocor
 * paling banyak, lalu titik pengabaian yang menjelaskan penyebab kebocoran,
 * baru sinyal katalog dan estimasi yang perbaikannya berjalan mingguan.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  await requireArea('analytics', '/admin/analitik');

  const query = await searchParams;
  const activePeriod =
    ANALYTICS_PERIODS.find((period) => period.value === query.periode)?.value ??
    DEFAULT_ANALYTICS_PERIOD;
  const days = resolvePeriodDays(activePeriod);

  const [funnel, movement, abandonment, distribution, demand, calibration] = await Promise.all([
    buildFunnel(days),
    featureMovement(days),
    abandonmentPoints(days),
    configurationValueDistribution(),
    customDemandReport(CUSTOM_DEMAND_DAYS),
    calibrationReport(),
  ]);

  const missedStages = funnel.filter((row) => row.meetsTarget === false);
  const hasFunnelData = funnel.some((row) => row.count > 0);

  const abandonmentByStep: BarRowItem[] = abandonment.bySteps.map((row) => ({
    key: row.step,
    label: abandonStepLabel(row.step),
    value: row.count,
    display: `${formatNumber(row.count)} sesi`,
    hint: `Rata-rata keranjang ${formatRupiahShort(row.avgValue)} · ditinggal setelah ${formatDuration(row.avgTimeSeconds)}`,
    tone: 'accent',
  }));

  const abandonmentByValue: BarRowItem[] = abandonment.byValueBucket.map((bucket) => ({
    key: bucket.label,
    label: bucket.label,
    value: bucket.count,
    display: `${formatNumber(bucket.count)} sesi`,
    hint:
      abandonment.total > 0
        ? `${formatPercent(bucket.count / abandonment.total, 1)} dari seluruh pengabaian`
        : undefined,
    tone: bucket.max === Infinity || bucket.max > 150_000_000 ? 'danger' : 'info',
  }));

  const valueBuckets: BarRowItem[] = distribution.buckets.map((bucket) => ({
    key: bucket.label,
    label: bucket.label,
    value: bucket.count,
    display: `${formatNumber(bucket.count)} konfigurasi`,
    hint:
      distribution.total > 0
        ? `${formatPercent(bucket.count / distribution.total, 1)} dari seluruh konfigurasi terkirim`
        : undefined,
    tone: bucket.min < 50_000_000 ? 'warning' : 'brand',
  }));

  // Agregat kalibrasi dihitung dari baris yang sama dengan tabelnya agar
  // ringkasan di atas tidak pernah berbeda dari rincian di bawahnya (Q5).
  const calibrationSamples = calibration.reduce((total, row) => total + row.samples, 0);
  const calibrationAvgDeviation =
    calibrationSamples > 0
      ? calibration.reduce((total, row) => total + Math.abs(row.deviationPct) * row.samples, 0) /
        calibrationSamples
      : null;
  const needsRecalibration = calibration.filter((row) => row.needsRecalibration);

  const demandTotal = demand.reduce((total, row) => total + row.count, 0);

  return (
    <>
      <PageHeader
        title="Analitik"
        description="Corong konversi, titik pengabaian, dan sinyal katalog dari data mentah event konfigurator — bukan dari perasaan siapa pun tentang minggu ini."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-fg-subtle">Periode</span>
            {ANALYTICS_PERIODS.map((period) => (
              <Button
                key={period.value}
                asChild
                size="sm"
                variant={period.value === activePeriod ? 'primary' : 'secondary'}
              >
                <Link href={`/admin/analitik?periode=${period.value}`}>{period.label}</Link>
              </Button>
            ))}
          </div>
        }
      />

      <PageBody className="flex flex-col gap-6">
        {/* ------------------------------------------------------------- Q1 */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Corong konversi</CardTitle>
                <CardDescription>
                  Jumlah sesi per tahap {days} hari terakhir, konversi dari tahap sebelumnya, dan
                  target enam bulan yang kami janjikan pada diri sendiri (PRD 4.2).
                </CardDescription>
              </div>
              {hasFunnelData && (
                <Badge variant={missedStages.length > 0 ? 'danger' : 'success'} size="md">
                  {missedStages.length > 0
                    ? `${missedStages.length} tahap belum memenuhi target`
                    : 'Seluruh tahap memenuhi target'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!hasFunnelData ? (
              <EmptyState
                title="Belum ada event konfigurator yang terekam"
                description="Begitu pengunjung membuka landing, memilih kategori, dan masuk konfigurator, tiap tahap akan muncul di sini lengkap dengan jumlah sesi, angka drop-off, dan perbandingannya terhadap target enam bulan."
              />
            ) : (
              <>
                {missedStages.length > 0 && (
                  <Alert tone="danger" title="Tahap yang belum memenuhi target enam bulan">
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {missedStages.map((stage) => (
                        <li key={stage.key} className="tabular">
                          {stage.label} — konversi{' '}
                          {stage.conversionRate !== null
                            ? formatPercent(stage.conversionRate, 1)
                            : '—'}{' '}
                          terhadap target {stage.target !== null ? formatPercent(stage.target) : '—'}
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <FunnelChart rows={funnel} />

                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Tahap</Th>
                        <Th className="text-right">Sesi</Th>
                        <Th className="text-right">Pergi dari tahap sebelumnya</Th>
                        <Th className="text-right">Konversi</Th>
                        <Th className="text-right">Target</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnel.map((row) => (
                        <Tr key={row.key}>
                          <Td className="font-medium">{row.label}</Td>
                          <Td className="tabular text-right">{formatNumber(row.count)}</Td>
                          <Td className="tabular text-right text-fg-muted">
                            {row.dropOff > 0 ? formatNumber(row.dropOff) : '—'}
                          </Td>
                          <Td className="tabular text-right">
                            {row.conversionRate !== null
                              ? formatPercent(row.conversionRate, 1)
                              : '—'}
                          </Td>
                          <Td className="tabular text-right text-fg-muted">
                            {row.target !== null ? `≥ ${formatPercent(row.target)}` : '—'}
                          </Td>
                          <Td>
                            {row.meetsTarget === null ? (
                              <span className="text-xs text-fg-subtle">Tanpa target</span>
                            ) : (
                              <Badge variant={row.meetsTarget ? 'success' : 'danger'}>
                                {row.meetsTarget ? 'Memenuhi' : 'Belum memenuhi'}
                              </Badge>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrapper>
              </>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- Q6 */}
        <Card>
          <CardHeader>
            <CardTitle>Titik pengabaian di konfigurator</CardTitle>
            <CardDescription>
              Di langkah mana klien pergi, dan di harga berapa. Keduanya perlu dibaca berpasangan:
              pengabaian di pita Rp 300 juta adalah prospek besar yang lepas dan pantas dikejar
              manusia, sedangkan pengabaian di pita Rp 28 juta justru pagar pengaman nilai proyek
              minimum yang bekerja sebagaimana mestinya (BR-13).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {abandonment.total === 0 ? (
              <EmptyState
                title="Belum ada konfigurasi yang ditinggalkan"
                description="Saat pengunjung menutup konfigurator sebelum mengirim, sistem mencatat langkah terakhirnya, nilai keranjang saat itu, dan lama waktu yang sudah ia habiskan. Rekapnya muncul di sini."
              />
            ) : (
              <>
                <Stat
                  label="Total sesi ditinggalkan"
                  value={formatNumber(abandonment.total)}
                  hint={`Dalam ${days} hari terakhir.`}
                  tone="warning"
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-fg">Per langkah terakhir</h3>
                    <BarRows items={abandonmentByStep} />
                  </section>

                  <section className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-fg">Per pita nilai keranjang</h3>
                    <BarRows items={abandonmentByValue} />
                  </section>
                </div>

                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Langkah terakhir</Th>
                        <Th className="text-right">Sesi</Th>
                        <Th className="text-right">Rata-rata nilai keranjang</Th>
                        <Th className="text-right">Rata-rata waktu dihabiskan</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {abandonment.bySteps.map((row) => (
                        <Tr key={row.step}>
                          <Td className="font-medium">{abandonStepLabel(row.step)}</Td>
                          <Td className="tabular text-right">{formatNumber(row.count)}</Td>
                          <Td className="tabular text-right">{formatRupiahShort(row.avgValue)}</Td>
                          <Td className="tabular text-right text-fg-muted">
                            {formatDuration(row.avgTimeSeconds)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrapper>
              </>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- Q2 */}
        <Card>
          <CardHeader>
            <CardTitle>Fitur paling sering dipilih dan paling sering dihapus</CardTitle>
            <CardDescription>
              Penghapusan yang terjadi karena dependensi ikut tercabut sudah disaring keluar oleh
              service — yang tersisa hanyalah keputusan sadar klien, satu-satunya sinyal jujur
              tentang nilai sebuah fitur di mata pembeli.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movement.mostAdded.length === 0 && movement.mostRemoved.length === 0 ? (
              <EmptyState
                title="Belum ada pergerakan fitur yang terekam"
                description="Setiap kali klien menambah atau mencabut fitur di konfigurator, kejadiannya dicatat. Sepuluh fitur teratas di masing-masing arah akan muncul di sini."
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <MovementTable
                  title="Paling sering ditambahkan"
                  description="Kandidat kuat untuk masuk preset dan naik ke urutan atas kartu kategori."
                  rows={movement.mostAdded}
                  tone="success"
                />
                <MovementTable
                  title="Paling sering dihapus manual"
                  description="Periksa nama, deskripsi manfaat, dan harganya — atau pertimbangkan menurunkannya dari preset."
                  rows={movement.mostRemoved}
                  tone="danger"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- Q3 */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Fitur custom paling sering diminta</CardTitle>
                <CardDescription>
                  Antrean kandidat modul baru dari {CUSTOM_DEMAND_DAYS} hari terakhir. Selama sebuah
                  permintaan tetap berstatus custom, ia diestimasi ulang oleh manusia setiap kali
                  dan dijual dengan pengali tertinggi — persis pekerjaan yang paling layak
                  dipromosikan ke katalog (PRD 2.3).
                </CardDescription>
              </div>
              <Button asChild variant="secondary">
                <Link href="/admin/custom/kandidat">Buka kandidat promosi</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {demand.length === 0 ? (
              <EmptyState
                title="Belum ada permintaan fitur custom"
                description="Permintaan yang klien tulis sendiri di konfigurator dikelompokkan berdasarkan nama yang dinormalkan, lalu diurutkan dari yang paling sering muncul. Dari sinilah roadmap modul berikutnya disusun."
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/admin/custom">Lihat antrean fitur custom</Link>
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-fg-muted">
                  <span className="tabular font-semibold text-fg">{formatNumber(demandTotal)}</span>{' '}
                  permintaan custom terkumpul dalam{' '}
                  <span className="tabular">{formatNumber(demand.length)}</span> kelompok kebutuhan.
                </p>

                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Kebutuhan yang diminta</Th>
                        <Th>Kategori</Th>
                        <Th className="text-right">Permintaan</Th>
                        <Th className="text-right">Sudah dipromosikan</Th>
                        <Th className="text-right">Rata-rata effort</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {demand.map((row) => (
                        <Tr key={`${row.label}-${row.category}`}>
                          <Td className="font-medium">{row.label}</Td>
                          <Td className="text-fg-muted">{row.category}</Td>
                          <Td className="text-right">
                            <Badge variant={row.count >= 3 ? 'accent' : 'neutral'}>
                              <span className="tabular">{formatNumber(row.count)}×</span>
                            </Badge>
                          </Td>
                          <Td className="tabular text-right text-fg-muted">
                            {row.promoted > 0 ? formatNumber(row.promoted) : '—'}
                          </Td>
                          <Td className="tabular text-right">
                            {row.avgManDay > 0 ? formatManDay(row.avgManDay) : '—'}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrapper>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- Q4 */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi nilai konfigurasi</CardTitle>
            <CardDescription>
              Sebaran nilai seluruh konfigurasi yang sudah keluar dari status draft, berikut margin
              rata-ratanya. Proyek besar tidak otomatis proyek sehat — karena itu keduanya selalu
              dibaca berdampingan (PRD Lampiran C).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {distribution.total === 0 ? (
              <EmptyState
                title="Belum ada konfigurasi di luar draft"
                description="Setelah klien mengirim rakitannya, nilai proyek dikelompokkan ke dalam pita harga di sini — bersama gross margin rata-rata dan porsi fitur custom yang membebaninya."
              />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat
                    label="Konfigurasi terhitung"
                    value={formatNumber(distribution.total)}
                    hint="Seluruh konfigurasi di luar status draft."
                  />
                  <div className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                      Gross margin rata-rata
                    </p>
                    <p className="tabular mt-2 text-2xl font-semibold tracking-[-0.02em] text-fg">
                      {formatPercent(distribution.avgMargin, 1)}
                    </p>
                    <div className="mt-2">
                      <MarginBadge value={distribution.avgMargin} />
                    </div>
                  </div>
                  <Stat
                    label="Porsi custom rata-rata"
                    value={formatPercent(distribution.avgCustomShare, 1)}
                    tone={distribution.avgCustomShare > 0.4 ? 'warning' : 'neutral'}
                    hint="Di atas 40% berarti katalog belum cukup menjawab kebutuhan pasar."
                  />
                </div>

                <BarRows items={valueBuckets} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------- Q5 */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Akurasi estimasi per fitur</CardTitle>
                <CardDescription>
                  Man-day referensi katalog dibandingkan realisasi di proyek. Setelah sekitar
                  sepuluh proyek, tabel ini menjadi keunggulan estimasi yang tidak dapat disalin
                  kompetitor — asalkan angkanya benar-benar dikoreksi, bukan sekadar dilihat.
                </CardDescription>
              </div>
              <Button asChild variant="secondary">
                <Link href="/admin/harga/kalibrasi">Laporan kalibrasi</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {calibration.length === 0 ? (
              <EmptyState
                title="Belum ada tugas proyek dengan realisasi man-day"
                description="Begitu tim mengisi man-day aktual pada tugas proyek, setiap fitur katalog dibandingkan dengan angka referensinya di sini — lengkap dengan penanda fitur yang konsisten meleset lebih dari 15%."
              />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat
                    label="Deviasi rata-rata"
                    value={
                      calibrationAvgDeviation !== null
                        ? formatPercent(calibrationAvgDeviation, 1)
                        : '—'
                    }
                    tone={
                      calibrationAvgDeviation !== null && calibrationAvgDeviation > 0.15
                        ? 'danger'
                        : 'success'
                    }
                    hint="Rata-rata tertimbang jumlah sampel. Target ≤ 15%."
                  />
                  <Stat
                    label="Fitur perlu dikalibrasi ulang"
                    value={formatNumber(needsRecalibration.length)}
                    tone={needsRecalibration.length > 0 ? 'warning' : 'neutral'}
                    hint="Meleset lebih dari 15% dengan minimal dua sampel."
                  />
                  <Stat
                    label="Sampel tugas terpakai"
                    value={formatNumber(calibrationSamples)}
                    hint={`Tersebar di ${formatNumber(calibration.length)} fitur katalog.`}
                  />
                </div>

                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Fitur</Th>
                        <Th>Kategori</Th>
                        <Th className="text-right">Referensi</Th>
                        <Th className="text-right">Aktual</Th>
                        <Th className="text-right">Deviasi</Th>
                        <Th>Arah</Th>
                        <Th className="text-right">Sampel</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {calibration.map((row) => (
                        <Tr key={row.featureId}>
                          <Td>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{row.name}</span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <FeatureTypeBadge
                                  type={coerceEnum(row.type, FEATURE_TYPES, 'STANDARD')}
                                />
                                {row.needsRecalibration && (
                                  <Badge variant="warning">Perlu kalibrasi ulang</Badge>
                                )}
                              </div>
                            </div>
                          </Td>
                          <Td className="text-fg-muted">{row.category}</Td>
                          <Td className="tabular text-right">{formatManDay(row.refManDay)}</Td>
                          <Td className="tabular text-right">{formatManDay(row.actualManDay)}</Td>
                          <Td
                            className={cn(
                              'tabular text-right font-medium',
                              Math.abs(row.deviationPct) > 0.15
                                ? row.deviationPct > 0
                                  ? 'text-danger'
                                  : 'text-warning'
                                : 'text-fg-muted',
                            )}
                          >
                            {row.deviationPct > 0 ? '+' : ''}
                            {formatPercent(row.deviationPct, 1)}
                          </Td>
                          <Td>
                            <div className="flex items-center gap-2">
                              <DeviationBar value={row.deviationPct} />
                              <span className="text-xs text-fg-subtle">
                                {deviationReading(row.deviationPct)}
                              </span>
                            </div>
                          </Td>
                          <Td className="tabular text-right text-fg-muted">
                            {formatNumber(row.samples)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrapper>
              </div>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

interface MovementRow {
  featureId: string;
  name: string;
  type: string;
  category: string;
  count: number;
}

/** Tabel ringkas satu arah pergerakan fitur (Q2). */
function MovementTable({
  title,
  description,
  rows,
  tone,
}: {
  title: string;
  description: string;
  rows: MovementRow[];
  tone: 'success' | 'danger';
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="text-xs leading-snug text-fg-muted">{description}</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-fg-subtle">
          Belum ada data pada periode ini.
        </p>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>Fitur</Th>
                <Th>Kategori</Th>
                <Th className="text-right">Jumlah</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.featureId}>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{row.name}</span>
                      <FeatureTypeBadge
                        type={coerceEnum(row.type, FEATURE_TYPES, 'STANDARD')}
                        className="self-start"
                      />
                    </div>
                  </Td>
                  <Td className="text-fg-muted">{row.category}</Td>
                  <Td className="text-right">
                    <Badge variant={tone}>
                      <span className="tabular">{formatNumber(row.count)}×</span>
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </section>
  );
}
