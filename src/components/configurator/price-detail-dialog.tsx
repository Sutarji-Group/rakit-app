'use client';

import { Badge, Dialog, DescRow, Separator } from '@/components/ui';
import { FEATURE_TYPE_LABEL } from '@/lib/domain/enums';
import { formatPercent, formatRupiah, formatWeekRange } from '@/lib/format';
import type { PriceBreakdown } from '@/lib/pricing';

/**
 * Rincian rupiah lengkap di balik tautan "lihat rincian" (C2.4).
 *
 * Kartu fitur sengaja hanya menampilkan indikator bertingkat, tetapi klien yang
 * ingin memeriksa angkanya harus tetap bisa melihat semuanya — menyembunyikan
 * rincian akan bertentangan dengan janji transparansi produk ini.
 *
 * Yang TIDAK pernah muncul di sini: proyeksi COGS dan gross margin. Keduanya
 * nilai internal (PRD 6.4).
 */
export function PriceDetailDialog({
  open,
  onClose,
  breakdown,
}: {
  open: boolean;
  onClose: () => void;
  breakdown: PriceBreakdown;
}) {
  const byGroup = new Map<string, typeof breakdown.lines>();
  for (const line of breakdown.lines) {
    const key = line.groupName ?? 'Lainnya';
    byGroup.set(key, [...(byGroup.get(key) ?? []), line]);
  }

  const range = (min: number, max: number) =>
    min === max ? formatRupiah(min) : `${formatRupiah(min)} – ${formatRupiah(max)}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Rincian estimasi biaya"
      description="Seluruh komponen yang membentuk angka pada panel harga."
    >
      <div className="flex flex-col gap-6">
        {/* -- Fitur per kelompok ------------------------------------------ */}
        {[...byGroup.entries()].map(([groupName, lines]) => (
          <section key={groupName}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              {groupName}
            </h3>
            <dl className="divide-y divide-border">
              {lines.map((line) => (
                <DescRow
                  key={line.id}
                  label={
                    <span className="flex flex-wrap items-center gap-1.5">
                      {line.name}
                      {line.type !== 'STANDARD' && (
                        <Badge variant="outline">{FEATURE_TYPE_LABEL[line.type]}</Badge>
                      )}
                    </span>
                  }
                  value={
                    line.includedInBasePackage ? (
                      <span className="text-fg-subtle">Termasuk paket dasar</span>
                    ) : (
                      range(line.priceMin, line.priceMax)
                    )
                  }
                />
              ))}
            </dl>
          </section>
        ))}

        <Separator />

        {/* -- Perhitungan total -------------------------------------------- */}
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
            Perhitungan
          </h3>
          <dl className="divide-y divide-border">
            {breakdown.corePackagePrice > 0 && (
              <DescRow
                label={`Paket dasar (${breakdown.coreFeatureCount} modul fondasi)`}
                value={formatRupiah(breakdown.corePackagePrice)}
              />
            )}
            <DescRow
              label="Subtotal fitur"
              value={range(breakdown.featuresSubtotalMin, breakdown.featuresSubtotalMax)}
            />

            {breakdown.platformMultiplier !== 1 && (
              <DescRow
                label="Penyesuaian platform"
                value={`× ${breakdown.platformMultiplier.toFixed(2)}`}
              />
            )}
            {breakdown.deploymentMultiplier !== 1 && (
              <DescRow
                label="Penyesuaian deployment"
                value={`× ${breakdown.deploymentMultiplier.toFixed(2)}`}
              />
            )}

            {breakdown.discountPct > 0 && (
              <DescRow
                label={`Diskon skala — ${breakdown.discountLabel}`}
                value={
                  <span className="text-success">
                    −{range(breakdown.discountMin, breakdown.discountMax)}
                  </span>
                }
              />
            )}

            {breakdown.addOnLines.map((addOn) => (
              <DescRow
                key={addOn.id}
                label={addOn.name}
                value={range(addOn.priceMin, addOn.priceMax)}
              />
            ))}

            {breakdown.setupFee > 0 && (
              <DescRow
                label="Biaya setup & onboarding"
                value={formatRupiah(breakdown.setupFee)}
              />
            )}

            <DescRow
              label="Total estimasi proyek"
              value={range(breakdown.totalMin, breakdown.totalMax)}
              emphasis
            />
          </dl>

          {breakdown.setupFee > 0 && (
            <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
              Biaya setup & onboarding bersifat tetap dan tidak berubah mengikuti ukuran proyek.
              Di dalamnya termasuk penyiapan lingkungan, konfigurasi awal, dan pendampingan
              peluncuran.
            </p>
          )}
        </section>

        {/* -- Biaya berulang, selalu terpisah (BR-12) ---------------------- */}
        {breakdown.recurringLines.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                Biaya bulanan berulang
              </h3>
              <dl className="divide-y divide-border">
                {breakdown.recurringLines.map((line) => (
                  <DescRow
                    key={line.id}
                    label={line.name}
                    value={`${range(line.priceMin, line.priceMax)} / bulan`}
                  />
                ))}
                <DescRow
                  label="Total per bulan"
                  value={`${range(breakdown.recurringMonthlyMin, breakdown.recurringMonthlyMax)} / bulan`}
                  emphasis
                />
              </dl>
              <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
                Biaya ini terpisah dari nilai proyek dan mulai berjalan setelah aplikasi
                diserahterimakan.
              </p>
            </section>
          </>
        )}

        <Separator />

        <section className="rounded-lg bg-surface-sunken/60 p-3.5">
          <dl className="flex flex-col gap-1.5">
            <DescRow
              label="Estimasi waktu pengerjaan"
              value={formatWeekRange(breakdown.duration.weeksMin, breakdown.duration.weeksMax)}
            />
            <DescRow
              label="Lebar rentang"
              value={`${breakdown.rangeWidthRatio.toFixed(2)}×`}
            />
            {breakdown.discountPct > 0 && (
              <DescRow
                label="Diskon yang berlaku"
                value={formatPercent(breakdown.discountPct)}
              />
            )}
          </dl>
        </section>
      </div>
    </Dialog>
  );
}
