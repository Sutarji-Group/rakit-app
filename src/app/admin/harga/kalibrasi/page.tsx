import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import {
  Alert,
  Badge,
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
import { requireArea } from '@/lib/auth/guards';
import { calibrationReport } from '@/lib/analytics/report';
import { FEATURE_TYPES, coerceEnum } from '@/lib/domain/enums';
import { formatManDay, formatNumber, formatPercent } from '@/lib/format';

export const metadata = { title: 'Laporan Kalibrasi' };

const SECONDARY_LINK =
  'inline-flex h-9 select-none items-center justify-center rounded-lg border border-border ' +
  'bg-surface-sunken px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-raised ' +
  'hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/** Ambang deviasi yang menandai fitur perlu dikalibrasi ulang (metrik 4.3). */
const DEVIATION_THRESHOLD = 0.15;

/**
 * Laporan kalibrasi man-day referensi vs aktual (M9).
 *
 * Setelah sekitar sepuluh proyek, tabel ini menjadi keunggulan estimasi yang
 * tidak dapat disalin kompetitor: harga berhenti menjadi tebakan dan mulai
 * menjadi hasil pengukuran. Selama data aktual masih tipis, angka di sini harus
 * dibaca sebagai indikasi, bukan kesimpulan.
 */
export default async function CalibrationPage() {
  await requireArea('pricing', '/admin/harga/kalibrasi');

  const rows = await calibrationReport();

  const needsRecalibration = rows.filter((row) => row.needsRecalibration);
  const underestimated = rows.filter((row) => row.deviationPct > DEVIATION_THRESHOLD);
  const totalSamples = rows.reduce((sum, row) => sum + row.samples, 0);
  const averageDeviation =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + Math.abs(row.deviationPct), 0) / rows.length
      : 0;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Mesin Harga', href: '/admin/harga' }, { label: 'Kalibrasi' }]}
        title="Laporan Kalibrasi"
        description="Perbandingan man-day referensi di katalog dengan man-day aktual yang tercatat di papan proyek. Fitur yang konsisten meleset lebih dari 15% perlu diestimasi ulang sebelum tarif dinaikkan."
        actions={
          <Link href="/admin/harga" className={SECONDARY_LINK}>
            Kembali ke mesin harga
          </Link>
        }
      />

      <PageBody className="flex flex-col gap-5">
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada data aktual untuk dibandingkan"
            description="Laporan ini terisi sendiri begitu tugas proyek yang terhubung ke fitur katalog dicatat man-day aktualnya. Setelah itu, tabel akan menampilkan man-day referensi, man-day aktual rata-rata, selisihnya, dan menandai fitur yang konsisten meleset lebih dari 15%."
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Fitur terkalibrasi"
                value={formatNumber(rows.length)}
                hint={`dari ${formatNumber(totalSamples)} tugas proyek tercatat`}
              />
              <Stat
                label="Perlu kalibrasi ulang"
                value={formatNumber(needsRecalibration.length)}
                tone={needsRecalibration.length > 0 ? 'warning' : 'success'}
                hint="meleset >15% dengan minimal 2 sampel"
              />
              <Stat
                label="Estimasi terlalu ringan"
                value={formatNumber(underestimated.length)}
                tone={underestimated.length > 0 ? 'danger' : 'success'}
                hint="aktual lebih besar dari referensi — margin tergerus"
              />
              <Stat
                label="Rata-rata deviasi"
                value={formatPercent(averageDeviation, 1)}
                hint="nilai mutlak, seluruh fitur"
              />
            </div>

            {underestimated.length > 0 && (
              <Alert tone="warning" title="Beberapa fitur dikerjakan lebih lama dari perkiraan">
                {underestimated.length} fitur memakan man-day aktual di atas 15% dari referensinya.
                Selama man-day referensi belum diperbaiki, harga jual fitur-fitur ini terlalu murah
                dan gross margin proyek yang memuatnya akan lebih rendah dari proyeksi di papan
                internal. Perbaiki man-day di katalog lebih dulu, baru sesuaikan tarif.
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Man-day referensi vs aktual</CardTitle>
                <CardDescription>
                  Man-day referensi adalah effort seandainya fitur dibangun dari nol (BR-18) dan
                  menjadi dasar harga. Man-day aktual adalah rata-rata catatan tim di papan proyek.
                  Urutan tabel mengikuti besar deviasi.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th className="min-w-56">Fitur</Th>
                        <Th className="min-w-36">Kategori</Th>
                        <Th className="min-w-32">Tipe</Th>
                        <Th className="min-w-32 text-right">Referensi</Th>
                        <Th className="min-w-32 text-right">Aktual</Th>
                        <Th className="min-w-32 text-right">Deviasi</Th>
                        <Th className="min-w-24 text-right">Sampel</Th>
                        <Th className="min-w-44">Tindak lanjut</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <Tr
                          key={row.featureId}
                          className={row.needsRecalibration ? 'bg-warning-soft/40' : undefined}
                        >
                          <Td className="font-medium">{row.name}</Td>
                          <Td className="text-fg-muted">{row.category}</Td>
                          <Td>
                            <FeatureTypeBadge
                              type={coerceEnum(row.type, FEATURE_TYPES, 'STANDARD')}
                            />
                          </Td>
                          <Td className="tabular text-right">{formatManDay(row.refManDay)}</Td>
                          <Td className="tabular text-right">{formatManDay(row.actualManDay)}</Td>
                          <Td
                            className={
                              Math.abs(row.deviationPct) > DEVIATION_THRESHOLD
                                ? 'tabular text-right font-semibold text-danger'
                                : 'tabular text-right text-fg-muted'
                            }
                          >
                            {row.deviationPct > 0 ? '+' : '−'}
                            {formatPercent(Math.abs(row.deviationPct), 1)}
                          </Td>
                          <Td className="tabular text-right text-fg-muted">{row.samples}</Td>
                          <Td>
                            {row.needsRecalibration ? (
                              <Badge variant={row.deviationPct > 0 ? 'danger' : 'warning'}>
                                {row.deviationPct > 0
                                  ? 'Naikkan man-day referensi'
                                  : 'Turunkan man-day referensi'}
                              </Badge>
                            ) : row.samples < 2 ? (
                              <Badge variant="outline">Sampel belum cukup</Badge>
                            ) : (
                              <Badge variant="success">Sesuai</Badge>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrapper>
              </CardContent>
            </Card>

            <Alert tone="neutral" title="Kalibrasi man-day dulu, tarif belakangan">
              Deviasi man-day dan asumsi utilisasi billable adalah dua sumber kesalahan margin yang
              berbeda. Bila fitur ternyata dikerjakan lebih lama, yang salah adalah man-day
              referensi di katalog — bukan tarif per man-day. Menambal deviasi man-day dengan
              menaikkan tarif membuat harga fitur yang estimasinya sudah benar ikut naik tanpa
              alasan.
            </Alert>
          </>
        )}
      </PageBody>
    </>
  );
}
