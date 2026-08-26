import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import {
  DEVIATION_THRESHOLD,
  deviationTone,
  type VarianceRow,
} from '@/components/admin/project/shared';
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
import { requireArea } from '@/lib/auth/guards';
import { formatManDay, formatNumber, formatPercent } from '@/lib/format';
import { loadVarianceReport } from '../_lib/queries';

export const metadata = { title: 'Varians Estimasi vs Aktual' };

/**
 * Laporan varians estimasi vs aktual per fitur (P5).
 *
 * Ini umpan balik yang memperbaiki akurasi katalog dari waktu ke waktu (PRD R2,
 * metrik 4.3: deviasi man-day aktual vs estimasi ≤ 15%). Setiap baris yang
 * ditandai punya tautan langsung ke halaman edit fiturnya, supaya jarak antara
 * "tahu estimasinya meleset" dan "estimasinya diperbaiki" hanya satu klik.
 */
export default async function VarianceReportPage() {
  await requireArea('projects', '/admin/proyek/varians');

  const { features, projects, averageDeviationPct, totalSamples } = await loadVarianceReport();

  const needsRecalibration = features.filter((row) => row.needsRecalibration);
  const underestimated = features.filter((row) => row.deviationPct > DEVIATION_THRESHOLD);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Proyek & Milestone', href: '/admin/proyek' }, { label: 'Varians' }]}
        title="Varians Estimasi vs Aktual"
        description="Perbandingan man-day yang dijual pada penawaran dengan man-day yang benar-benar dihabiskan tim. Fitur yang konsisten meleset lebih dari 15% perlu diestimasi ulang sebelum dijual lagi."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/proyek">Kembali ke daftar proyek</Link>
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-5">
        {features.length === 0 ? (
          <EmptyState
            title="Belum ada man-day aktual yang tercatat"
            description="Laporan ini terisi sendiri begitu tim mencatat man-day aktual pada item pekerjaan di papan proyek. Setelah itu, tabel akan membandingkan estimasi yang dijual dengan aktualnya per fitur, menandai yang meleset lebih dari 15%, dan menautkannya ke halaman edit fitur di katalog."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin/proyek">Buka papan proyek</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Fitur terukur"
                value={formatNumber(features.length)}
                hint={`dari ${formatNumber(totalSamples)} item pekerjaan tercatat`}
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
                hint="aktual di atas estimasi — margin proyek tergerus"
              />
              <Stat
                label="Rata-rata deviasi"
                value={formatPercent(averageDeviationPct, 1)}
                tone={averageDeviationPct > DEVIATION_THRESHOLD ? 'warning' : 'success'}
                hint="nilai mutlak; target metrik 4.3 ≤ 15%"
              />
            </div>

            {averageDeviationPct > DEVIATION_THRESHOLD && (
              <Alert tone="warning" title="Deviasi rata-rata masih di atas target">
                Metrik 4.3 menargetkan deviasi man-day aktual terhadap estimasi tidak lebih dari
                15%. Selama angka ini belum turun, harga jual yang dihitung mesin harga berdiri di
                atas estimasi yang belum bisa dipercaya. Perbaiki man-day fitur yang ditandai di
                bawah lebih dulu, baru sesuaikan tarif.
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Varians per fitur</CardTitle>
                <CardDescription>
                  Estimasi adalah titik tengah man-day pada snapshot konfigurasi — angka yang
                  benar-benar dijual ke klien. Man-day referensi adalah nilai yang berlaku di
                  katalog saat ini; keduanya bisa berbeda karena penawaran lama tidak berubah
                  ketika katalog diperbarui (BR-07).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FeatureVarianceTable rows={features} />
              </CardContent>
            </Card>

            {projects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Varians per proyek</CardTitle>
                  <CardDescription>
                    Membaca deviasi per proyek membantu memisahkan dua sebab yang berbeda: estimasi
                    katalog yang memang meleset, atau satu proyek yang berjalan tidak normal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th className="min-w-56">Proyek</Th>
                          <Th className="min-w-32 text-right">Estimasi</Th>
                          <Th className="min-w-32 text-right">Aktual</Th>
                          <Th className="min-w-28 text-right">Deviasi</Th>
                          <Th className="min-w-36 text-right">Item tercatat</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project) => (
                          <Tr key={project.id}>
                            <Td>
                              <Link
                                href={`/admin/proyek/${project.id}`}
                                className="font-medium text-brand hover:underline"
                              >
                                {project.name}
                              </Link>
                              <p className="tabular text-xs text-fg-subtle">{project.code}</p>
                            </Td>
                            <Td className="tabular text-right text-fg-muted">
                              {formatManDay(project.estimateManDay)}
                            </Td>
                            <Td className="tabular text-right">
                              {formatManDay(project.actualManDay)}
                            </Td>
                            <Td className="text-right">
                              <Badge variant={deviationTone(project.deviationPct)}>
                                <span className="tabular">
                                  {project.deviationPct > 0 ? '+' : ''}
                                  {formatPercent(project.deviationPct, 1)}
                                </span>
                              </Badge>
                            </Td>
                            <Td className="tabular text-right text-fg-muted">
                              {project.recordedTasks}/{project.totalTasks}
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrapper>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}

function FeatureVarianceTable({ rows }: { rows: VarianceRow[] }) {
  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <Th className="min-w-64">Fitur</Th>
            <Th className="min-w-32 text-right">Estimasi dijual</Th>
            <Th className="min-w-32 text-right">Aktual</Th>
            <Th className="min-w-28 text-right">Deviasi</Th>
            <Th className="min-w-24 text-right">Sampel</Th>
            <Th className="min-w-32 text-right">Referensi katalog</Th>
            <Th className="min-w-40 text-right">Tindakan</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.key} className={row.needsRecalibration ? 'bg-warning-soft/30' : undefined}>
              <Td>
                <div className="flex flex-col gap-1">
                  <span className="font-medium leading-snug text-fg">{row.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <FeatureTypeBadge type={row.type} />
                    <span className="text-xs text-fg-subtle">{row.categoryName}</span>
                    {row.needsRecalibration && <Badge variant="warning">Perlu kalibrasi</Badge>}
                  </span>
                </div>
              </Td>
              <Td className="tabular text-right text-fg-muted">
                {formatManDay(row.estimateManDay)}
              </Td>
              <Td className="tabular text-right">{formatManDay(row.actualManDay)}</Td>
              <Td className="text-right">
                <Badge variant={deviationTone(row.deviationPct)}>
                  <span className="tabular">
                    {row.deviationPct > 0 ? '+' : ''}
                    {formatPercent(row.deviationPct, 1)}
                  </span>
                </Badge>
              </Td>
              <Td className="tabular text-right text-fg-muted">{row.samples}</Td>
              <Td className="tabular text-right text-fg-muted">
                {row.refManDay === null ? '—' : formatManDay(row.refManDay)}
              </Td>
              <Td className="text-right">
                {row.editHref ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={row.editHref}>Perbaiki di katalog</Link>
                  </Button>
                ) : (
                  <span className="text-xs text-fg-subtle">
                    Belum ada entri katalog
                  </span>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrapper>
  );
}
