import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, FeatureTypeBadge } from '@/components/ui';
import { PageIntro } from '@/components/portal/page-intro';
import { requireUser } from '@/lib/auth/guards';
import {
  CONFIGURATION_STATUS_LABEL,
  CUSTOM_REQUEST_STATUS_LABEL,
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORM_LABEL,
  USER_TIER_LABEL,
} from '@/lib/domain/enums';
import { formatPercent, formatRupiah, formatRupiahRange, formatWeekRange } from '@/lib/format';
import { CONFIGURATION_STATUS_TONE } from '@/components/portal/status';
import {
  diffFeatures,
  getComparableConfiguration,
  type ComparableConfiguration,
  type ComparableFeature,
} from '../_lib/queries';

export const metadata: Metadata = { title: 'Bandingkan rakitan' };

export default async function BandingkanPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const user = await requireUser('/akun/bandingkan');
  const query = await searchParams;

  const [a, b] = await Promise.all([
    getComparableConfiguration(query.a ?? '', user.id),
    getComparableConfiguration(query.b ?? '', user.id),
  ]);

  if (!a || !b) {
    return (
      <div className="flex flex-col gap-6">
        <PageIntro title="Bandingkan rakitan" />
        <EmptyState
          title="Dua rakitan belum terpilih"
          description="Pilih dua rakitan dari halaman akun, lalu tekan tombol Bandingkan."
          action={
            <Button asChild>
              <Link href="/akun">Kembali ke rakitan saya</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const diff = diffFeatures(a, b);
  const priceDeltaMin = b.totalMin - a.totalMin;
  const priceDeltaMax = b.totalMax - a.totalMax;
  const weekDeltaMax = b.durationWeeksMax - a.durationWeeksMax;

  const differentCategory = a.categoryName !== b.categoryName;

  return (
    <div className="flex flex-col gap-8">
      <PageIntro
        title="Bandingkan dua rakitan"
        description="Selisih fitur, biaya, dan waktu pengerjaan antara kedua pilihan Anda."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link href="/akun">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali
            </Link>
          </Button>
        }
      />

      {differentCategory && (
        <Alert tone="warning" title="Kedua rakitan berasal dari kategori aplikasi berbeda">
          {a.categoryName} dan {b.categoryName} menyelesaikan masalah yang berbeda, jadi selisih
          harganya tidak bisa dibaca sebagai &ldquo;mana yang lebih murah&rdquo;.
        </Alert>
      )}

      {/* Ringkasan berdampingan — kolom kiri selalu rakitan A. */}
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryColumn config={a} label="Rakitan A" />
        <SummaryColumn config={b} label="Rakitan B" />
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-fg">Selisih terhadap Rakitan A</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <DeltaTile
            label="Selisih biaya (batas bawah)"
            value={signedRupiah(priceDeltaMin)}
            positive={priceDeltaMin > 0}
          />
          <DeltaTile
            label="Selisih biaya (batas atas)"
            value={signedRupiah(priceDeltaMax)}
            positive={priceDeltaMax > 0}
          />
          <DeltaTile
            label="Selisih waktu pengerjaan"
            value={weekDeltaMax === 0 ? 'Sama' : `${weekDeltaMax > 0 ? '+' : '−'}${Math.abs(weekDeltaMax)} minggu`}
            positive={weekDeltaMax > 0}
          />
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
          Angka positif berarti Rakitan B lebih mahal atau lebih lama dibanding Rakitan A. Biaya
          setup Rp 10 juta dan biaya berulang bulanan dihitung terpisah dari nilai proyek.
        </p>
      </Card>

      {/* Perbedaan konfigurasi proyek (E) — sering jadi sumber selisih harga
          yang tidak terlihat di daftar fitur. */}
      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-fg">Konfigurasi proyek</h2>
        <dl className="mt-3 flex flex-col divide-y divide-border">
          <OptionRow
            label="Cara diakses"
            a={PROJECT_PLATFORM_LABEL[a.platform]}
            b={PROJECT_PLATFORM_LABEL[b.platform]}
          />
          <OptionRow
            label="Tempat aplikasi dipasang"
            a={PROJECT_DEPLOYMENT_LABEL[a.deployment]}
            b={PROJECT_DEPLOYMENT_LABEL[b.deployment]}
          />
          <OptionRow
            label="Jumlah pengguna"
            a={USER_TIER_LABEL[a.userTier]}
            b={USER_TIER_LABEL[b.userTier]}
          />
          <OptionRow
            label="Diskon volume"
            a={a.discountPct > 0 ? formatPercent(a.discountPct) : 'Tidak ada'}
            b={b.discountPct > 0 ? formatPercent(b.discountPct) : 'Tidak ada'}
          />
          <OptionRow
            label="Biaya berulang per bulan"
            a={formatRupiahRange(a.recurringMonthlyMin, a.recurringMonthlyMax)}
            b={formatRupiahRange(b.recurringMonthlyMin, b.recurringMonthlyMax)}
          />
        </dl>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">Selisih fitur</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <FeatureColumn
            title="Hanya di Rakitan A"
            emptyText="Semua fitur Rakitan A juga ada di Rakitan B."
            features={diff.onlyInA}
            tone="danger"
          />
          <FeatureColumn
            title="Hanya di Rakitan B"
            emptyText="Semua fitur Rakitan B juga ada di Rakitan A."
            features={diff.onlyInB}
            tone="success"
          />
        </div>

        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold text-fg">Ada di keduanya</h3>
            <span className="tabular text-sm text-fg-muted">{diff.inBoth.length} fitur</span>
          </div>
          {diff.inBoth.length === 0 ? (
            <p className="mt-2 text-sm text-fg-muted">
              Kedua rakitan tidak memiliki satu pun fitur yang sama.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {diff.inBoth.map((feature) => (
                <li key={feature.id}>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2 py-1 text-[13px] text-fg-muted">
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {(a.customRequests.length > 0 || b.customRequests.length > 0) && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">Fitur custom</h2>
          <p className="-mt-2 text-sm text-fg-muted">
            Fitur custom belum ikut dihitung ke total sebelum tim kami mengestimasinya.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <CustomColumn title="Rakitan A" items={a.customRequests} />
            <CustomColumn title="Rakitan B" items={b.customRequests} />
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/rakit/${a.token}`}>Buka Rakitan A</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/rakit/${b.token}`}>Buka Rakitan B</Link>
        </Button>
      </div>
    </div>
  );
}

function signedRupiah(value: number): string {
  if (value === 0) return 'Sama';
  return `${value > 0 ? '+' : '−'}${formatRupiah(Math.abs(value))}`;
}

function SummaryColumn({ config, label }: { config: ComparableConfiguration; label: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-soft-fg">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold leading-tight text-fg">{config.name}</h2>
        <Badge variant={CONFIGURATION_STATUS_TONE[config.status]}>
          {CONFIGURATION_STATUS_LABEL[config.status]}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        {config.categoryName} · {config.features.length} fitur
      </p>
      <dl className="mt-4 flex flex-col divide-y divide-border">
        <SummaryRow label="Estimasi biaya" value={formatRupiahRange(config.totalMin, config.totalMax, false)} />
        <SummaryRow
          label="Waktu pengerjaan"
          value={formatWeekRange(config.durationWeeksMin, config.durationWeeksMax)}
        />
        <SummaryRow label="Biaya setup" value={formatRupiah(config.setupFee)} />
        <SummaryRow label="Add-on terpilih" value={`${config.addOns.length} item`} />
      </dl>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="tabular text-right text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

/** Baris opsi proyek; perbedaan ditandai agar tidak terlewat saat dibaca cepat. */
function OptionRow({ label, a, b }: { label: string; a: string; b: string }) {
  const same = a === b;
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-sm text-fg-muted sm:w-56 sm:shrink-0">{label}</dt>
      <dd className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
        <span className={`flex-1 text-sm ${same ? 'text-fg' : 'font-medium text-fg'}`}>
          <span className="mr-1.5 text-xs text-fg-subtle sm:hidden">A:</span>
          {a}
        </span>
        <span className={`flex-1 text-sm ${same ? 'text-fg-muted' : 'font-medium text-accent-strong'}`}>
          <span className="mr-1.5 text-xs text-fg-subtle sm:hidden">B:</span>
          {b}
        </span>
      </dd>
    </div>
  );
}

function DeltaTile({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-sunken/60 p-3">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd
        className={`tabular mt-1 text-lg font-semibold ${
          value === 'Sama' ? 'text-fg-muted' : positive ? 'text-danger' : 'text-success'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function FeatureColumn({
  title,
  features,
  emptyText,
  tone,
}: {
  title: string;
  features: ComparableFeature[];
  emptyText: string;
  tone: 'danger' | 'success';
}) {
  const Icon = tone === 'success' ? Plus : Minus;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        <span className="tabular text-sm text-fg-muted">{features.length} fitur</span>
      </div>
      {features.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">{emptyText}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {features.map((feature) => (
            <li key={feature.id} className="flex items-start gap-2.5">
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${tone === 'success' ? 'text-success' : 'text-danger'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-fg">{feature.name}</p>
                <div className="mt-1">
                  <FeatureTypeBadge type={feature.type} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CustomColumn({
  title,
  items,
}: {
  title: string;
  items: ComparableConfiguration['customRequests'];
}) {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-fg-muted">Tidak ada permintaan fitur custom.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 flex-1 text-sm text-fg">{item.name}</span>
              <Badge variant="outline">{CUSTOM_REQUEST_STATUS_LABEL[item.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
