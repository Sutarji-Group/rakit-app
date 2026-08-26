import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import {
  AttentionList,
  HealthMetricCard,
  TrendBars,
  targetStatus,
  type AttentionItem,
  type TrendPoint,
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
  Stat,
} from '@/components/ui';
import { healthMetrics, northStarMetric } from '@/lib/analytics/report';
import { requireInternal } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import {
  formatDuration,
  formatNumber,
  formatPercent,
  formatRupiahShort,
} from '@/lib/format';

export const metadata = { title: 'Dashboard' };

/** Berapa bulan tren North Star ditampilkan di baris teratas. */
const TREND_MONTHS = 6;

/** Status antrean custom yang masih menunggu keputusan reviewer. */
const OPEN_CUSTOM_STATUSES = ['PENDING', 'IN_REVIEW', 'NEEDS_CLARIFICATION'];

/** Ambang "sebentar lagi lewat SLA" — sama dengan penghitung kuning di N1. */
const SLA_WARNING_MS = 4 * 3_600_000;

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTH_SHORT[Number(month) - 1] ?? month} ${year.slice(2)}`;
}

/**
 * Halaman depan area admin (modul Q, PRD 4.1 & 4.3).
 *
 * Penjaga aksesnya sengaja hanya requireInternal, bukan requireArea: guard area
 * mengembalikan pengguna yang ditolak ke halaman ini, jadi kalau halaman ini
 * ikut menuntut area tertentu, penolakan akan berputar tanpa ujung. Query
 * ?akses=ditolak dari guard itulah yang dijawab dengan peringatan di bawah.
 */
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ akses?: string }>;
}) {
  await requireInternal('/admin');

  const now = new Date();
  const slaWarningAt = new Date(now.getTime() + SLA_WARNING_MS);

  const [
    query,
    northStar,
    health,
    slaBreached,
    slaSoon,
    unassignedLeads,
    openConsultations,
    milestonesAwaiting,
    overdueInvoices,
  ] = await Promise.all([
    searchParams,
    northStarMetric(TREND_MONTHS),
    healthMetrics(30),
    prisma.customFeatureRequest.count({
      where: { status: { in: OPEN_CUSTOM_STATUSES }, slaDueAt: { lt: now } },
    }),
    prisma.customFeatureRequest.count({
      where: { status: { in: OPEN_CUSTOM_STATUSES }, slaDueAt: { gte: now, lt: slaWarningAt } },
    }),
    prisma.lead.count({ where: { stage: 'NEW', ownerId: null } }),
    prisma.consultationRequest.count({ where: { status: 'NEW' } }),
    prisma.milestone.count({ where: { status: 'AWAITING_APPROVAL' } }),
    prisma.invoice.count({
      where: {
        OR: [
          { status: 'OVERDUE' },
          { status: { in: ['SENT', 'PARTIALLY_PAID'] }, dueAt: { lt: now } },
        ],
      },
    }),
  ]);

  // Bulan tanpa satu pun lead tidak muncul di hasil agregat. Deretnya disusun
  // ulang di sini supaya sumbu waktu tetap rapat — celah kosong di tengah tren
  // lebih mudah salah dibaca sebagai "belum ada data" ketimbang sebagai nol.
  const monthKeys: string[] = [];
  for (let offset = TREND_MONTHS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    monthKeys.push(monthKey(date));
  }

  const byMonth = new Map(northStar.map((row) => [row.month, row]));
  const currentKey = monthKey(now);
  const previousKey = monthKeys[monthKeys.length - 2];

  const trend: TrendPoint[] = monthKeys.map((key) => {
    const row = byMonth.get(key);
    return {
      key,
      label: monthLabel(key),
      value: row?.qualified ?? 0,
      display: formatNumber(row?.qualified ?? 0),
      current: key === currentKey,
    };
  });

  const currentMonth = byMonth.get(currentKey);
  const previousMonth = previousKey ? byMonth.get(previousKey) : undefined;
  const qualifiedNow = currentMonth?.qualified ?? 0;
  const qualifiedPrev = previousMonth?.qualified ?? 0;
  const monthDelta = qualifiedNow - qualifiedPrev;
  const qualificationRate =
    currentMonth && currentMonth.total > 0 ? currentMonth.qualified / currentMonth.total : null;

  const attention: AttentionItem[] = [
    {
      key: 'sla-breached',
      count: slaBreached,
      label: 'Fitur custom melewati SLA',
      description:
        'Klien sudah menunggu lebih lama dari janji kami dan penawarannya belum bisa terbit.',
      href: '/admin/custom',
      tone: 'danger',
    },
    {
      key: 'sla-soon',
      count: slaSoon,
      label: 'Fitur custom mendekati SLA',
      description: 'Kurang dari empat jam lagi sebelum melewati batas waktu estimasi.',
      href: '/admin/custom',
      tone: 'warning',
    },
    {
      key: 'leads',
      count: unassignedLeads,
      label: 'Lead baru belum ditugaskan',
      description: 'Belum ada nama yang bertanggung jawab menindaklanjuti.',
      href: '/admin/pipeline',
      tone: 'danger',
    },
    {
      key: 'consultations',
      count: openConsultations,
      label: 'Permintaan konsultasi belum dibalas',
      description: 'Semakin lama menunggu, semakin dingin percakapannya.',
      href: '/admin/konsultasi',
      tone: 'warning',
    },
    {
      key: 'milestones',
      count: milestonesAwaiting,
      label: 'Milestone menunggu persetujuan klien',
      description: 'Termin pembayarannya tertahan sampai milestone ini disetujui.',
      href: '/admin/proyek',
      tone: 'brand',
    },
    {
      key: 'invoices',
      count: overdueInvoices,
      label: 'Invoice jatuh tempo',
      description: 'Sudah lewat tanggal jatuh tempo dan belum lunas.',
      href: '/admin/proyek',
      tone: 'danger',
    },
  ];

  const hasSubmissions = health.submittedCount > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Satu layar untuk menjawab tiga pertanyaan: apakah bulan ini berjalan, apakah produknya sehat, dan apa yang menunggu keputusan manusia hari ini."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/analitik">Analitik lengkap</Link>
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-6">
        {query.akses === 'ditolak' && (
          <Alert tone="danger" title="Area itu tidak terbuka untuk peran Anda">
            Anda dialihkan kembali ke dashboard karena peran akun ini tidak memiliki hak pada area
            yang dituju. Hubungi Super Admin bila memang membutuhkan aksesnya.
          </Alert>
        )}

        {/* --------------------------------------------- North Star (4.1) */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>North Star Metric</CardTitle>
                <CardDescription>
                  Jumlah konfigurasi terkualifikasi bulan ini — dikirim dengan kontak yang valid dan
                  nilai estimasi minimal Rp 25 juta. Satu angka ini menahan seluruh tim dari
                  merayakan trafik yang tidak pernah menjadi percakapan (PRD 4.1).
                </CardDescription>
              </div>
              {monthDelta !== 0 && (
                <Badge variant={monthDelta > 0 ? 'success' : 'danger'} size="md">
                  <span className="tabular">
                    {monthDelta > 0 ? '+' : ''}
                    {formatNumber(monthDelta)} dibanding bulan lalu
                  </span>
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Stat
                label="Terkualifikasi bulan ini"
                value={formatNumber(qualifiedNow)}
                tone="brand"
                hint={
                  currentMonth
                    ? `Dari ${formatNumber(currentMonth.total)} lead masuk${
                        qualificationRate !== null
                          ? ` · ${formatPercent(qualificationRate, 1)} lolos kualifikasi`
                          : ''
                      }.`
                    : 'Belum ada lead masuk bulan ini.'
                }
              />
              <Stat
                label="Nilai terkualifikasi bulan ini"
                value={formatRupiahShort(currentMonth?.value ?? 0)}
                hint="Akumulasi batas atas estimasi seluruh konfigurasi terkualifikasi."
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                Tren {TREND_MONTHS} bulan terakhir
              </p>
              <TrendBars points={trend} />
              <p className="text-xs text-fg-subtle">
                Kolom paling kanan adalah bulan berjalan, jadi wajar bila lebih pendek — bulannya
                belum selesai.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------ Kesehatan produk (PRD 4.3) */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-[-0.01em] text-fg">
                Metrik kesehatan produk
              </h2>
              <p className="text-sm text-fg-muted">
                30 hari terakhir, masing-masing berdampingan dengan targetnya (PRD 4.3).
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/analitik">Lihat corong dan rinciannya</Link>
            </Button>
          </div>

          {!hasSubmissions && (
            <Alert tone="neutral" title="Sebagian metrik masih menunggu konfigurasi terkirim">
              Belum ada konfigurasi yang dikirim dalam 30 hari terakhir, jadi metrik yang dihitung
              dari pengiriman masih kosong. Angkanya akan terisi sendiri begitu klien pertama
              menekan kirim.
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HealthMetricCard
              emphasis
              label="Deviasi estimasi vs realisasi"
              value={
                health.avgEstimateDeviation !== null
                  ? formatPercent(health.avgEstimateDeviation, 1)
                  : '—'
              }
              target={`Target ≤ ${formatPercent(health.avgEstimateDeviationTarget)}`}
              status={targetStatus(
                health.avgEstimateDeviation === null
                  ? null
                  : health.avgEstimateDeviation <= health.avgEstimateDeviationTarget,
              )}
              meter={
                health.avgEstimateDeviation !== null
                  ? {
                      pct: Math.min(
                        100,
                        (health.avgEstimateDeviation / health.avgEstimateDeviationTarget) * 100,
                      ),
                      tone:
                        health.avgEstimateDeviation <= health.avgEstimateDeviationTarget
                          ? 'success'
                          : 'danger',
                    }
                  : undefined
              }
              hint="Selisih man-day referensi katalog terhadap realisasi proyek. Inilah yang menentukan apakah harga kontrak menutup biaya sebenarnya."
            />

            <HealthMetricCard
              emphasis
              label="Gross margin rata-rata"
              value={hasSubmissions ? formatPercent(health.avgMargin, 1) : '—'}
              target={`Target ${formatPercent(health.marginTargetMin)} – ${formatPercent(health.marginTargetMax)}`}
              status={targetStatus(
                hasSubmissions ? health.avgMargin >= health.marginTargetMin : null,
              )}
              meter={
                hasSubmissions
                  ? {
                      pct: Math.min(100, (health.avgMargin / health.marginTargetMax) * 100),
                      tone:
                        health.avgMargin < 0.4
                          ? 'danger'
                          : health.avgMargin < health.marginTargetMin
                            ? 'warning'
                            : 'success',
                    }
                  : undefined
              }
              hint="Di bawah 40% sebuah konfigurasi wajib melewati approval eksplisit (BR-17)."
            />

            <HealthMetricCard
              label="Waktu rata-rata sampai kirim"
              value={hasSubmissions ? formatDuration(health.avgTimeToSubmitSeconds) : '—'}
              target={`Target ≤ ${formatDuration(health.avgTimeTarget)}`}
              status={targetStatus(
                hasSubmissions ? health.avgTimeToSubmitSeconds <= health.avgTimeTarget : null,
              )}
              hint="Semakin lama waktunya, semakin besar friksi di konfigurator."
            />

            <HealthMetricCard
              label="Tingkat pengabaian"
              value={
                health.createdCount > 0 ? formatPercent(health.abandonmentRate, 1) : '—'
              }
              target={`Target ≤ ${formatPercent(health.abandonmentTarget)}`}
              status={targetStatus(
                health.createdCount > 0
                  ? health.abandonmentRate <= health.abandonmentTarget
                  : null,
              )}
              hint={`${formatNumber(health.submittedCount)} dari ${formatNumber(health.createdCount)} konfigurasi yang dibuat berakhir terkirim.`}
            />

            <HealthMetricCard
              label="Konfigurasi memuat fitur custom"
              value={hasSubmissions ? formatPercent(health.customConfigShare, 1) : '—'}
              target={`Target ≤ ${formatPercent(health.customConfigShareTarget)}`}
              status={targetStatus(
                hasSubmissions ? health.customConfigShare <= health.customConfigShareTarget : null,
              )}
              hint="Angka tinggi berarti katalog belum menjawab kebutuhan yang sebenarnya umum."
            />

            <HealthMetricCard
              label="Porsi nilai custom rata-rata"
              value={hasSubmissions ? formatPercent(health.avgCustomShare, 1) : '—'}
              target={`Target ≤ ${formatPercent(health.avgCustomShareTarget)}`}
              status={targetStatus(
                hasSubmissions ? health.avgCustomShare <= health.avgCustomShareTarget : null,
              )}
              hint="Porsi custom yang besar membebani kapasitas tim dan menambah risiko margin."
            />

            <HealthMetricCard
              label="Lebar rentang harga rata-rata"
              value={hasSubmissions ? `${formatNumber(health.avgRangeRatio, 2)}×` : '—'}
              target={`Target ≤ ${formatNumber(health.avgRangeRatioTarget, 2)}×`}
              status={targetStatus(
                hasSubmissions ? health.avgRangeRatio <= health.avgRangeRatioTarget : null,
              )}
              hint="Rentang yang melebar membuat klien ragu dan menunda keputusan (BR-05)."
            />

            <HealthMetricCard
              label="Kepatuhan SLA antrean custom"
              value={
                health.slaComplianceRate !== null
                  ? formatPercent(health.slaComplianceRate, 1)
                  : '—'
              }
              target={`Target ≥ ${formatPercent(health.slaTarget)}`}
              status={targetStatus(
                health.slaComplianceRate === null
                  ? null
                  : health.slaComplianceRate >= health.slaTarget,
              )}
              meter={
                health.slaComplianceRate !== null
                  ? {
                      pct: health.slaComplianceRate * 100,
                      tone: health.slaComplianceRate >= health.slaTarget ? 'success' : 'danger',
                    }
                  : undefined
              }
              hint="Estimasi custom yang selesai sebelum batas waktu yang dijanjikan ke klien."
            />

            <HealthMetricCard
              label="Rata-rata fitur per konfigurasi"
              value={hasSubmissions ? formatNumber(health.avgFeatureCount, 1) : '—'}
              target="Dipantau arahnya — diharapkan naik"
              hint="Naik berarti preset dan rekomendasi bekerja; turun berarti klien kesulitan menemukan fitur yang relevan."
            />
          </div>
        </section>

        {/* ------------------------------------------ Butuh perhatian kini */}
        <Card>
          <CardHeader>
            <CardTitle>Butuh perhatian sekarang</CardTitle>
            <CardDescription>
              Antrean yang menunggu keputusan manusia. Baris yang bersih tetap ditampilkan supaya
              daftar ini bisa dibaca sebagai daftar periksa harian, bukan sekadar kumpulan alarm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttentionList items={attention} />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
