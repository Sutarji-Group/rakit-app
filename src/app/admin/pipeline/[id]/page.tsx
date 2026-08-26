import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@/components/admin';
import { MarginBadge } from '@/components/admin/margin-badge';
import { ActivityPanel } from '@/components/admin/pipeline/activity-panel';
import { AssignOwner } from '@/components/admin/pipeline/assign-owner';
import { LeadConfiguration } from '@/components/admin/pipeline/lead-configuration';
import { LockPricePanel } from '@/components/admin/pipeline/lock-price-panel';
import { OverridePanel } from '@/components/admin/pipeline/override-panel';
import { RevisionTimeline } from '@/components/admin/pipeline/revision-timeline';
import { StageControl } from '@/components/admin/pipeline/stage-control';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescRow,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { can } from '@/lib/auth/session';
import {
  BUDGET_BAND_LABEL,
  LEAD_PIPELINE_STAGES,
  LEAD_STAGE_LABEL,
  LOST_REASON_LABEL,
} from '@/lib/domain/enums';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatRupiah,
  formatRupiahRange,
  formatWeekRange,
} from '@/lib/format';
import { getLeadDetailView, listAssignableUsers } from '../_lib/queries';

export const metadata = { title: 'Detail Lead' };

/**
 * Detail satu lead (O2–O6).
 *
 * Halaman ini adalah satu-satunya tempat nilai internal — COGS dan gross
 * margin — boleh terlihat (PRD 6.4). Semua yang tampil di sini disusun untuk
 * satu keputusan: apakah penawaran ini layak diperjuangkan, dan dengan harga
 * berapa.
 */
export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireArea('leads', `/admin/pipeline/${id}`);

  const [view, owners] = await Promise.all([getLeadDetailView(id), listAssignableUsers()]);
  if (!view) notFound();

  const { lead, configuration, override, breakdown, rule } = view;
  const canApprove = can(user.role, 'approveOverride');
  const overdueCount = view.activities.filter((activity) => activity.isOverdue).length;
  const quoteExpired = new Date(lead.validUntil).getTime() < Date.now();

  // Nilai yang diusulkan saat mengunci harga: hasil override yang sudah
  // disetujui bila ada, kalau tidak batas atas penawaran (BR-11).
  const suggestedLockPrice =
    override.status === 'APPROVED' && override.value != null
      ? override.value
      : (breakdown?.totalMax ?? configuration.totalMax);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Pipeline Lead', href: '/admin/pipeline' },
          { label: lead.quoteNumber },
        ]}
        title={lead.contactName}
        description={
          <span>
            {lead.company ?? 'Perorangan'} · {configuration.categoryName} ·{' '}
            <span className="tabular">
              {formatRupiahRange(configuration.totalMin, configuration.totalMax, false)}
            </span>
          </span>
        }
        actions={
          <StageControl
            leadId={lead.id}
            contactName={lead.contactName}
            stage={lead.stage}
            stages={LEAD_PIPELINE_STAGES}
          />
        }
      />

      <PageBody className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {overdueCount > 0 && (
            <Alert tone="danger" title={`${overdueCount} pengingat follow-up lewat jatuh tempo`}>
              Buka panel aktivitas di bawah untuk menutupnya atau menjadwalkan ulang.
            </Alert>
          )}
          {override.status === 'PENDING_APPROVAL' && (
            <Alert tone="warning" title="Override harga menunggu persetujuan">
              Diskon yang diminta melewati kuota sales atau menekan margin di bawah ambang.
              {canApprove
                ? ' Anda berwenang menyetujuinya di panel override harga.'
                : ' Hubungi consultant atau super admin untuk persetujuan (BR-16, BR-17).'}
            </Alert>
          )}
          {lead.needsDeepDiscovery && (
            <Alert tone="brand" title="Perlu discovery mendalam">
              Porsi fitur custom melebihi batas wajar (BR-15), sehingga penawaran final tidak terbit
              otomatis. Jadwalkan discovery call sebelum menjanjikan angka.
            </Alert>
          )}
          {view.pendingCustomCount > 0 && (
            <Alert tone="info" title={`${view.pendingCustomCount} fitur custom belum diestimasi`}>
              Nilainya belum masuk total penawaran (BR-02). Total di halaman ini masih akan naik.
            </Alert>
          )}
          {configuration.belowMinMargin && (
            <Alert tone="danger" title="Proyeksi margin di bawah ambang">
              Gross margin {formatPercent(configuration.grossMarginPct, 1)} berada di bawah batas
              kelayakan. Perubahan harga apa pun pada lead ini wajib disetujui (BR-17).
            </Alert>
          )}
          {quoteExpired && (
            <Alert tone="warning" title="Masa berlaku penawaran sudah lewat">
              Berlaku sampai {formatDate(lead.validUntil)}. Hitung ulang sebelum melanjutkan
              negosiasi — tarif dapat sudah berubah.
            </Alert>
          )}
          {lead.stage === 'LOST' && lead.lostReason && (
            <Alert tone="neutral" title={`Kalah: ${LOST_REASON_LABEL[lead.lostReason]}`}>
              {lead.lostNote ?? 'Tidak ada catatan tambahan.'}
            </Alert>
          )}
          {!breakdown && (
            <Alert tone="warning" title="Penawaran tidak dapat dihitung ulang">
              Katalog sumber konfigurasi ini tidak lagi lengkap, sehingga override harga dan
              proyeksi margin terbaru tidak dapat ditampilkan. Angka di bawah berasal dari snapshot
              saat penawaran terbit.
            </Alert>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan penawaran</CardTitle>
                <CardDescription>
                  Nomor {lead.quoteNumber} · terbit {formatDate(configuration.submittedAt)} · berlaku
                  sampai {formatDate(lead.validUntil)}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl>
                  <DescRow
                    label="Nilai proyek"
                    value={formatRupiahRange(configuration.totalMin, configuration.totalMax, false)}
                    emphasis
                  />
                  <DescRow label="Biaya setup (tidak didiskon, BR-14)" value={formatRupiah(configuration.setupFee)} />
                  <DescRow
                    label="Diskon skala"
                    value={
                      configuration.discountPct > 0
                        ? formatPercent(configuration.discountPct, 1)
                        : 'Tidak ada'
                    }
                  />
                  <DescRow
                    label="Biaya berulang bulanan (terpisah, BR-12)"
                    value={
                      configuration.recurringMonthlyMax > 0
                        ? formatRupiahRange(
                            configuration.recurringMonthlyMin,
                            configuration.recurringMonthlyMax,
                            false,
                          )
                        : 'Tidak ada'
                    }
                  />
                  <DescRow
                    label="Estimasi durasi"
                    value={formatWeekRange(
                      configuration.durationWeeksMin,
                      configuration.durationWeeksMax,
                    )}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ekonomi internal</CardTitle>
                <CardDescription>
                  Angka pada kartu ini tidak pernah tampil ke klien dan tidak ikut ke dokumen
                  penawaran (PRD 6.4).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <MarginBadge
                    size="md"
                    value={breakdown?.internal.grossMarginPct ?? configuration.grossMarginPct}
                    minThreshold={rule?.minGrossMarginPct}
                    targetMin={rule?.targetGrossMarginMin}
                  />
                  <Badge variant="outline">
                    Porsi custom {formatPercent(configuration.customSharePct, 1)}
                  </Badge>
                  {configuration.exceedsCustomShare && (
                    <Badge variant="warning">Porsi custom melewati batas</Badge>
                  )}
                </div>
                <dl>
                  <DescRow
                    label="Proyeksi COGS"
                    value={formatRupiah(
                      breakdown?.internal.cogsProjection ?? configuration.cogsProjection,
                    )}
                    emphasis
                  />
                  {breakdown && (
                    <>
                      <DescRow
                        label="Margin skenario terbaik"
                        value={formatPercent(breakdown.internal.grossMarginBestPct, 1)}
                      />
                      <DescRow
                        label="Margin skenario terburuk"
                        value={formatPercent(breakdown.internal.grossMarginWorstPct, 1)}
                      />
                      <DescRow
                        label="Effort riil"
                        value={`${breakdown.internal.realEffortManDayMin.toFixed(1)} – ${breakdown.internal.realEffortManDayMax.toFixed(1)} man-day`}
                      />
                      <DescRow
                        label="Lebar rentang penawaran"
                        value={`${breakdown.rangeWidthRatio.toFixed(2)}×`}
                      />
                    </>
                  )}
                </dl>
                {configuration.guardrailNotes.length > 0 && (
                  <ul className="flex list-inside list-disc flex-col gap-1 border-t border-border pt-3 text-xs leading-relaxed text-fg-muted">
                    {configuration.guardrailNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <LeadConfiguration
              categoryName={configuration.categoryName}
              presetName={configuration.presetName}
              platform={configuration.platform}
              deployment={configuration.deployment}
              userTier={configuration.userTier}
              featureGroups={view.featureGroups}
              addOns={view.addOns}
              customRequests={view.customRequests}
            />

            <RevisionTimeline revisions={view.revisions} />

            <ActivityPanel leadId={lead.id} activities={view.activities} />
          </div>

          <aside className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Kontak & kualifikasi</CardTitle>
                <CardDescription>
                  Waktu yang dihabiskan di konfigurator adalah sinyal keseriusan yang paling murah
                  untuk dibaca.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl>
                  <DescRow label="Tahap" value={LEAD_STAGE_LABEL[lead.stage]} emphasis />
                  <DescRow label="Email" value={lead.email} />
                  <DescRow label="WhatsApp" value={lead.whatsapp} />
                  <DescRow label="Perkiraan anggaran" value={BUDGET_BAND_LABEL[lead.budgetBand]} />
                  <DescRow
                    label="Waktu di konfigurator"
                    value={formatDuration(configuration.timeSpentSeconds)}
                  />
                  <DescRow label="Sumber trafik" value={lead.trafficSource ?? 'Tidak diketahui'} />
                  {Object.entries(lead.utm).map(([key, value]) => (
                    <DescRow key={key} label={key} value={value} />
                  ))}
                  <DescRow label="Penawaran masuk" value={formatDateTime(lead.createdAt)} />
                  <DescRow
                    label="Izin pemasaran"
                    value={lead.marketingConsent ? 'Diberikan' : 'Tidak diberikan'}
                  />
                </dl>
                {lead.note && (
                  <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-sm leading-relaxed text-fg-muted">
                    “{lead.note}”
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Penugasan</CardTitle>
              </CardHeader>
              <CardContent>
                <AssignOwner leadId={lead.id} currentOwnerId={lead.ownerId} owners={owners} />
              </CardContent>
            </Card>

            {breakdown && rule ? (
              <OverridePanel
                leadId={lead.id}
                rule={rule}
                breakdown={breakdown}
                current={override}
                canApprove={canApprove}
                isPriceLocked={configuration.isPriceLocked}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Override harga</CardTitle>
                  <CardDescription>
                    Tidak tersedia selama penawaran ini belum dapat dihitung ulang.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <LockPricePanel
              leadId={lead.id}
              stage={lead.stage}
              canApprove={canApprove}
              isPriceLocked={configuration.isPriceLocked}
              lockedPrice={configuration.lockedPrice}
              lockedUntil={configuration.lockedUntil}
              suggestedPrice={suggestedLockPrice}
              validityDays={rule?.quoteValidityDays ?? 30}
            />
          </aside>
        </div>
      </PageBody>
    </>
  );
}
