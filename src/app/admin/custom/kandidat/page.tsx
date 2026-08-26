import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import { CUSTOM_STATUS_VARIANT } from '@/components/admin/custom/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DescRow,
  EmptyState,
  Stat,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { CUSTOM_REQUEST_STATUS_LABEL } from '@/lib/domain/enums';
import {
  formatDate,
  formatManDay,
  formatNumber,
  formatPercent,
  formatRupiahShort,
} from '@/lib/format';
import { priceMultiplierFor } from '@/lib/pricing';
import { listPromotionCandidates } from '@/lib/services/custom-request';
import { getActivePricingRule } from '@/lib/services/pricing-rule';
import { listRequestsByIds } from '../_lib/queries';

export const metadata = { title: 'Kandidat Promosi ke Katalog' };

/**
 * Kandidat promosi fitur custom ke katalog (N5, Q3).
 *
 * Permintaan yang sama muncul berulang dengan kalimat berbeda-beda, jadi
 * pengelompokannya memakai nama yang dinormalkan. Setiap kandidat di halaman
 * ini adalah pekerjaan yang sedang kami jual berkali-kali dengan pengali 1,5×
 * padahal sudah kami kuasai — inilah bahan bakar roda gila produk (PRD 2.3).
 */
export default async function PromotionCandidatesPage() {
  await requireArea('customQueue', '/admin/custom/kandidat');

  const [candidates, rule] = await Promise.all([
    listPromotionCandidates(),
    getActivePricingRule(),
  ]);

  const requests = await listRequestsByIds(candidates.flatMap((candidate) => candidate.requestIds));
  const requestById = new Map(requests.map((request) => [request.id, request]));

  const customMultiplier = priceMultiplierFor(rule, 'CUSTOM');
  const standardMultiplier = priceMultiplierFor(rule, 'STANDARD');
  const repeatedRequests = candidates.reduce((total, candidate) => total + candidate.count, 0);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Antrean Fitur Custom', href: '/admin/custom' },
          { label: 'Kandidat promosi' },
        ]}
        title="Kandidat Promosi ke Katalog"
        description="Permintaan serupa yang berulang dari klien berbeda. Selama ia tetap berstatus custom, kami mengestimasinya ulang setiap kali dan menjualnya dengan pengali tertinggi."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/custom">Kembali ke antrean</Link>
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <Alert tone="brand" title="Mengapa promosi menaikkan margin sekaligus menurunkan harga">
          Fitur custom dijual dengan pengali {formatNumber(customMultiplier, 2)}× karena dibangun
          dari nol dan perlu diestimasi manusia. Begitu masuk katalog sebagai fitur Standard,
          pengalinya turun ke {formatNumber(standardMultiplier, 2)}× — sementara effort riil kami
          turun jauh lebih dalam lagi karena modulnya tinggal dipasang. Klien berikutnya membayar
          lebih murah, margin kami justru naik, dan estimasi manual satu per satu berhenti (PRD 2.3).
        </Alert>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Kandidat terdeteksi"
            value={candidates.length}
            hint="Permintaan serupa yang muncul minimal dua kali."
          />
          <Stat
            label="Permintaan yang terlibat"
            value={repeatedRequests}
            hint="Sebanyak inilah estimasi manual yang bisa dihentikan."
          />
          <Stat
            label="Potensi penurunan harga"
            value={formatPercent(1 - standardMultiplier / customMultiplier, 0)}
            tone="brand"
            hint="Untuk klien berikutnya, bila dipromosikan menjadi fitur Standard."
          />
        </div>

        {candidates.length === 0 ? (
          <EmptyState
            title="Belum ada kandidat promosi"
            description="Begitu dua klien atau lebih meminta fitur khusus yang mirip, permintaannya dikelompokkan di sini beserta rata-rata man-day dan dampak harganya — supaya keputusan memindahkannya ke katalog punya dasar angka, bukan firasat."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/admin/custom">Lihat antrean</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {candidates.map((candidate) => {
              const asCustom = candidate.manDayMaxAvg * rule.referenceRatePerManDay * customMultiplier;
              const asStandard =
                candidate.manDayMaxAvg * rule.referenceRatePerManDay * standardMultiplier;
              const hasEffort = candidate.manDayMaxAvg > 0;

              return (
                <Card key={`${candidate.categorySlug}-${candidate.label}`}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle>{candidate.label}</CardTitle>
                      <Badge variant="brand" size="md">
                        {candidate.count}× diminta
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{candidate.categoryName}</Badge>
                      <span className="text-xs text-fg-subtle">
                        Terakhir diminta {formatDate(candidate.lastRequestedAt)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    <dl>
                      <DescRow
                        label="Rata-rata estimasi"
                        value={
                          hasEffort
                            ? `${formatManDay(candidate.manDayMinAvg)} – ${formatManDay(candidate.manDayMaxAvg)}`
                            : 'Belum ada yang diestimasi'
                        }
                      />
                      {hasEffort && (
                        <>
                          <DescRow
                            label="Harga sekarang (custom)"
                            value={formatRupiahShort(asCustom)}
                          />
                          <DescRow
                            label="Bila jadi fitur Standard"
                            emphasis
                            value={formatRupiahShort(asStandard)}
                          />
                        </>
                      )}
                    </dl>

                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                        Permintaan yang membentuk kandidat ini
                      </p>
                      {candidate.requestIds.map((requestId) => {
                        const request = requestById.get(requestId);
                        if (!request) return null;
                        return (
                          <Link
                            key={requestId}
                            href={`/admin/custom/${requestId}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2 transition-colors hover:border-border-strong"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-fg">{request.name}</span>
                              <span className="block text-xs text-fg-subtle">
                                {request.contactName ?? 'Belum dikirim'} · {request.configurationName}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="tabular text-xs text-fg-muted">
                                {formatRupiahShort(request.totalMax)}
                              </span>
                              <Badge variant={CUSTOM_STATUS_VARIANT[request.status]}>
                                {CUSTOM_REQUEST_STATUS_LABEL[request.status]}
                              </Badge>
                            </span>
                          </Link>
                        );
                      })}
                    </div>

                    <p className="text-xs leading-relaxed text-fg-muted">
                      Promosi dilakukan dari halaman salah satu permintaan di atas, karena di sanalah
                      konteks alur dan estimasinya lengkap.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
