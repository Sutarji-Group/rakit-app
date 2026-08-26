'use client';

import Link from 'next/link';
import { Alert, Badge, Button, Progress, Separator } from '@/components/ui';
import { AnimatedNumber } from './animated-number';
import { PriceExplainer } from './price-explainer';
import { cn } from '@/lib/utils';
import { formatRupiahShort, formatRupiah, formatWeekRange } from '@/lib/format';
import type { PriceBreakdown } from '@/lib/pricing';
import type { MinimumViabilityResult } from '@/lib/configurator/dependency';
import type { SaveState } from '@/lib/configurator/store';

export interface PricePanelProps {
  breakdown: PriceBreakdown;
  minViable: MinimumViabilityResult;
  featureCount: number;
  token: string;
  saveState: SaveState;
  saveError: string | null;
  isEditable: boolean;
  continueHref: string;
  continueLabel: string;
  onOpenDetail: () => void;
  compact?: boolean;
  className?: string;
}

/**
 * Panel ringkasan keranjang (PRD C.4).
 *
 * Di desktop panel ini sticky di kolom kanan; di mobile isinya sama tetapi
 * dibungkus bottom sheet yang bisa ditarik (C1.3).
 */
export function PricePanel({
  breakdown,
  minViable,
  featureCount,
  token,
  saveState,
  saveError,
  isEditable,
  continueHref,
  continueLabel,
  onOpenDetail,
  compact = false,
  className,
}: PricePanelProps) {
  const belowMinValue = breakdown.guardrails.find((g) => g.code === 'BELOW_MIN_PROJECT_VALUE');
  const hasDiscount = breakdown.discountPct > 0;
  const savings = breakdown.discountMax;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg">Rakitan Anda</h2>
          <SaveIndicator state={saveState} />
        </div>
      )}

      {/* -- Angka utama -------------------------------------------------- */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Estimasi biaya proyek
        </p>
        <div className="tabular mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <AnimatedNumber
            value={breakdown.displayTotalMin}
            format={formatRupiahShort}
            className="text-2xl font-semibold tracking-[-0.02em] text-fg"
          />
          <span className="text-lg text-fg-subtle">–</span>
          <AnimatedNumber
            value={breakdown.displayTotalMax}
            format={formatRupiahShort}
            className="text-2xl font-semibold tracking-[-0.02em] text-fg"
          />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <PriceExplainer />
          <button
            type="button"
            onClick={onOpenDetail}
            className="text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
          >
            Lihat rincian
          </button>
        </div>
      </div>

      {/* C4.6 — fitur custom belum masuk total sebelum diestimasi (BR-02) */}
      {breakdown.pendingCustomCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-type-custom/25 bg-type-custom-soft px-3 py-2.5">
          <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-type-custom" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-type-custom">
            <strong className="font-semibold">
              + {breakdown.pendingCustomCount} fitur custom
            </strong>{' '}
            belum masuk hitungan di atas. Tim kami mengestimasinya dalam 1×24 jam kerja setelah
            rakitan dikirim.
          </p>
        </div>
      )}

      <Separator />

      {/* -- Ringkasan isi ------------------------------------------------ */}
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Fitur terpilih</dt>
          <dd className="tabular font-medium text-fg">
            {featureCount} fitur
            {breakdown.coreFeatureCount > 0 && (
              <span className="ml-1 text-xs font-normal text-fg-subtle">
                ({breakdown.coreFeatureCount} inti)
              </span>
            )}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-muted">Estimasi pengerjaan</dt>
          <dd className="tabular font-medium text-fg">
            {formatWeekRange(breakdown.duration.weeksMin, breakdown.duration.weeksMax)}
          </dd>
        </div>

        {/* C4.5 — diskon skala ditampilkan eksplisit (BR-09) */}
        {hasDiscount && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-fg-muted">Diskon skala</dt>
            <dd className="tabular font-medium text-success">
              −{Math.round(breakdown.discountPct * 100)}%
            </dd>
          </div>
        )}

        {/* BR-12 — biaya berulang selalu terpisah dari nilai proyek */}
        {breakdown.recurringMonthlyMax > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-fg-muted">Biaya bulanan</dt>
            <dd className="tabular font-medium text-fg">
              {formatRupiahShort(breakdown.recurringMonthlyMin)} –{' '}
              {formatRupiahShort(breakdown.recurringMonthlyMax)}
            </dd>
          </div>
        )}
      </dl>

      {hasDiscount && (
        <div className="rounded-lg bg-success-soft px-3 py-2.5">
          <p className="text-xs leading-relaxed text-success-soft-fg">
            Anda hemat <strong className="font-semibold tabular">{formatRupiah(savings)}</strong>{' '}
            karena memilih {breakdown.discountBasisCount} fitur. Semakin besar rakitan, semakin
            rendah biaya overhead per fitur.
          </p>
        </div>
      )}

      {/* C3.5 / BR-08 — peringatan keranjang minimum, boleh dilanjutkan */}
      {!minViable.isViable && minViable.message && (
        <Alert tone="warning" title="Rakitan belum lengkap">
          {minViable.message}
        </Alert>
      )}

      {/* BR-13 — nilai proyek minimum, ditolak secara halus */}
      {belowMinValue?.clientMessage && (
        <Alert
          tone="info"
          title="Masih di bawah proyek minimum kami"
          action={
            <Button asChild size="sm" variant="secondary">
              <Link href={`/konsultasi?dari=${token}&topik=BELOW_MIN_VALUE`}>Konsultasi</Link>
            </Button>
          }
        >
          {belowMinValue.clientMessage}
        </Alert>
      )}

      {saveError && (
        <Alert tone="danger" title="Perubahan belum tersimpan">
          {saveError}
        </Alert>
      )}

      {/* -- Aksi ---------------------------------------------------------- */}
      <div className="flex flex-col gap-2">
        <Button asChild size="lg" className="w-full" disabled={!isEditable}>
          <Link href={continueHref}>{continueLabel}</Link>
        </Button>

        {/* C4.7 — jalan keluar untuk klien yang buntu, selalu tersedia */}
        <Button asChild variant="ghost" size="sm" className="w-full">
          <Link href={`/konsultasi?dari=${token}&topik=STUCK_IN_CONFIGURATOR`}>
            Bicara dengan konsultan
          </Link>
        </Button>
      </div>

      {!compact && (
        <>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
              <span>Kelengkapan rakitan</span>
              <span className="tabular">
                {Math.min(100, Math.round((minViable.paidFeatureCount / Math.max(1, minViable.requiredCount)) * 100))}%
              </span>
            </div>
            <Progress
              value={(minViable.paidFeatureCount / Math.max(1, minViable.requiredCount)) * 100}
              tone={minViable.isViable ? 'success' : 'warning'}
            />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Penanda status penyimpanan.
 *
 * Kriteria penerimaan modul C: "konfigurasi tersimpan otomatis setiap
 * perubahan; menutup tab tidak menghilangkan progres". Klien perlu melihat
 * bukti bahwa itu benar-benar terjadi.
 */
function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;

  const config = {
    saving: { label: 'Menyimpan…', variant: 'neutral' as const },
    saved: { label: 'Tersimpan', variant: 'success' as const },
    error: { label: 'Gagal simpan', variant: 'danger' as const },
  }[state];

  return (
    <Badge variant={config.variant} className="shrink-0">
      {state === 'saved' && (
        <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
          <path d="m2.8 6.2 2 2 4.4-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {config.label}
    </Badge>
  );
}
