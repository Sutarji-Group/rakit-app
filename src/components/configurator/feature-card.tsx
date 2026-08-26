'use client';

import { useState } from 'react';
import { FeatureTypeBadge, PriceImpact, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import type { FeatureDTO } from '@/lib/services/catalog';
import type { PriceLine } from '@/lib/pricing';
import { FeatureExampleDialog } from './feature-example-dialog';

export interface FeatureCardProps {
  feature: FeatureDTO;
  line: PriceLine | undefined;
  isSelected: boolean;
  /** Alasan fitur ini masuk otomatis (dari preset, wizard, atau dependensi). */
  originReason?: string | null;
  /** Fitur lain yang membutuhkan fitur ini, untuk peringatan cascade. */
  dependentNames: string[];
  disabled?: boolean;
  onToggle: (featureId: string) => void;
  /** Estimasi tambahan durasi dalam hari kerja (C2.5). */
  durationDays: number;
}

/**
 * Kartu fitur di konfigurator (PRD C.2).
 *
 * Catatan penting soal harga: kartu menampilkan indikator bertingkat
 * (Rp / Rp Rp / Rp Rp Rp), BUKAN angka rupiah per fitur (C2.4). Menampilkan
 * rupiah per item mengundang perbandingan mikro dengan kompetitor dan memicu
 * tawar-menawar per baris. Angka rupiahnya tetap tersedia lewat "lihat rincian".
 */
export function FeatureCard({
  feature,
  line,
  isSelected,
  originReason,
  dependentNames,
  disabled,
  onToggle,
  durationDays,
}: FeatureCardProps) {
  const [exampleOpen, setExampleOpen] = useState(false);
  const isCore = feature.type === 'CORE';

  return (
    <>
      <div
        className={cn(
          'group relative rounded-xl border p-4 transition-[border-color,background-color,box-shadow]',
          isSelected
            ? 'border-brand/45 bg-brand-soft/25'
            : 'border-border bg-surface hover:border-border-strong',
          isCore && 'border-border bg-surface-sunken/50',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-fg">
                {feature.name}
              </h3>
              <FeatureTypeBadge type={feature.type} />
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              {feature.clientDescription}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-subtle">
              {isCore ? (
                <span className="font-medium text-fg-muted">Sudah termasuk paket dasar</span>
              ) : (
                <PriceImpact level={line?.impact ?? 1} />
              )}

              <span className="tabular inline-flex items-center gap-1">
                <ClockGlyph />+{formatNumber(durationDays, durationDays % 1 === 0 ? 0 : 1)} hari
              </span>

              <button
                type="button"
                onClick={() => setExampleOpen(true)}
                className="inline-flex items-center gap-1 font-medium text-brand underline-offset-2 hover:underline"
              >
                <EyeGlyph />
                Lihat contoh
              </button>
            </div>

            {originReason && (
              <p className="mt-2.5 flex items-start gap-1.5 rounded-md bg-info-soft px-2.5 py-1.5 text-xs leading-relaxed text-info-soft-fg">
                <SparkGlyph />
                <span>{originReason}</span>
              </p>
            )}

            {isSelected && !isCore && dependentNames.length > 0 && (
              <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
                Menjadi prasyarat: {dependentNames.slice(0, 3).join(', ')}
                {dependentNames.length > 3 && ` dan ${dependentNames.length - 3} lainnya`}.
              </p>
            )}
          </div>

          <div className="shrink-0 pt-0.5">
            {isCore ? (
              <span
                className="flex size-6 items-center justify-center rounded-full bg-type-core-soft text-type-core"
                title="Modul fondasi — selalu termasuk dan tidak dapat dihapus"
              >
                <CheckGlyph />
              </span>
            ) : (
              <Switch
                checked={isSelected}
                disabled={disabled}
                onCheckedChange={() => onToggle(feature.id)}
                label={`${isSelected ? 'Hapus' : 'Tambahkan'} ${feature.name}`}
              />
            )}
          </div>
        </div>
      </div>

      <FeatureExampleDialog
        open={exampleOpen}
        onClose={() => setExampleOpen(false)}
        feature={feature}
        line={line}
        durationDays={durationDays}
      />
    </>
  );
}

function ClockGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4.2V7l1.9 1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function EyeGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5" fill="none" aria-hidden="true">
      <path
        d="M1.4 7s2-3.6 5.6-3.6S12.6 7 12.6 7s-2 3.6-5.6 3.6S1.4 7 1.4 7z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="7" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SparkGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="mt-0.5 size-3.5 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="m7 1.5 1 3.5 3.5 1-3.5 1-1 3.5-1-3.5L2.5 6 6 5z" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5" fill="none" aria-hidden="true">
      <path d="m3.5 7.2 2.4 2.3 4.6-4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
