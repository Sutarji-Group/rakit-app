'use client';

import { useEffect } from 'react';
import { Alert, Badge, Dialog, DescRow, FeatureTypeBadge } from '@/components/ui';
import { formatManDay, formatRupiah } from '@/lib/format';
import { FEATURE_TYPE_DESCRIPTION } from '@/lib/domain/enums';
import { track } from '@/lib/analytics/track';
import type { FeatureDTO } from '@/lib/services/catalog';
import type { PriceLine } from '@/lib/pricing';

/**
 * Modal "Lihat contoh" (C2.6) — penurun keraguan terbesar di konfigurator.
 *
 * Di sinilah satu-satunya tempat angka rupiah per fitur ditampilkan: klien yang
 * memang ingin memeriksa rinciannya membukanya sendiri, sementara kartu tetap
 * bersih dari angka per item (C2.4).
 */
export function FeatureExampleDialog({
  open,
  onClose,
  feature,
  line,
  durationDays,
}: {
  open: boolean;
  onClose: () => void;
  feature: FeatureDTO;
  line: PriceLine | undefined;
  durationDays: number;
}) {
  useEffect(() => {
    if (open) track('feature_example_viewed', { feature_id: feature.id });
  }, [open, feature.id]);

  const isCore = feature.type === 'CORE';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={feature.name}
      description={feature.clientDescription}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <FeatureTypeBadge type={feature.type} size="md" />
          {feature.isEssential && <Badge variant="info" size="md">Fitur inti</Badge>}
        </div>

        {feature.media.length > 0 ? (
          <div className="flex flex-col gap-3">
            {feature.media.map((media) => (
              <figure key={media.id} className="overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.url} alt={media.caption ?? feature.name} className="w-full" />
                {media.caption && (
                  <figcaption className="border-t border-border bg-surface-sunken px-3 py-2 text-xs text-fg-muted">
                    {media.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <Alert tone="neutral" title="Tangkapan layar belum tersedia untuk fitur ini">
            Kami menampilkan contoh nyata dari proyek sebelumnya pada sesi demo 30 menit, lengkap
            dengan data yang menyerupai kasus Anda. Sementara ini, penjelasan di bawah menerangkan
            apa yang Anda dapatkan.
          </Alert>
        )}

        <div>
          <p className="mb-1.5 text-sm font-semibold text-fg">Apa arti tipe fitur ini</p>
          <p className="text-sm leading-relaxed text-fg-muted">
            {FEATURE_TYPE_DESCRIPTION[feature.type]}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-sunken/50 p-4">
          <p className="mb-2 text-sm font-semibold text-fg">Rincian estimasi</p>
          <dl className="divide-y divide-border">
            <DescRow
              label="Estimasi tambahan waktu"
              value={`± ${formatManDay(durationDays)} kerja`}
            />
            {isCore ? (
              <DescRow
                label="Biaya"
                value="Termasuk paket dasar"
                emphasis
              />
            ) : (
              <>
                <DescRow
                  label="Kompleksitas (man-day referensi)"
                  value={`${feature.manDayMin} – ${feature.manDayMax} hari`}
                />
                <DescRow
                  label="Kontribusi ke harga"
                  value={
                    line
                      ? line.priceMin === line.priceMax
                        ? formatRupiah(line.priceMin)
                        : `${formatRupiah(line.priceMin)} – ${formatRupiah(line.priceMax)}`
                      : '—'
                  }
                  emphasis
                />
              </>
            )}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
            Angka ini adalah kontribusi fitur terhadap total, bukan harga jual terpisah. Diskon
            skala dan biaya tingkat proyek dihitung pada total rakitan.
          </p>
        </div>

        {feature.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {feature.keywords.map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
