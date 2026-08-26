'use client';

import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescRow,
  Stat,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { MarginBadge } from '@/components/admin';
import {
  formatManDay,
  formatNumber,
  formatPercent,
  formatRupiah,
  formatRupiahRange,
  formatRupiahShort,
  formatWeekRange,
} from '@/lib/format';
import type { PriceBreakdown } from '@/lib/pricing';
import type { SimulatorRuleOption } from './types';

/** Satu baris rincian yang dapat dibandingkan antar versi aturan. */
interface LineSpec {
  key: string;
  label: string;
  hint?: string;
  value: (b: PriceBreakdown) => string;
  /** Angka pembanding; bila ada, selisih antar versi ikut ditampilkan. */
  raw?: (b: PriceBreakdown) => number;
  emphasis?: boolean;
}

const PROJECT_LINES: LineSpec[] = [
  {
    key: 'core',
    label: 'Paket dasar Core',
    hint: 'Tarif tetap, bukan penjumlahan harga tiap fitur Core (PRD 6.3).',
    value: (b) => formatRupiah(b.corePackagePrice),
    raw: (b) => b.corePackagePrice,
  },
  {
    key: 'features',
    label: 'Fitur berbayar',
    hint: 'Man-day referensi × tarif referensi × pengali tipe fitur.',
    value: (b) =>
      formatRupiahRange(
        b.featuresSubtotalMin - b.corePackagePrice,
        b.featuresSubtotalMax - b.corePackagePrice,
        false,
      ),
    raw: (b) => b.featuresSubtotalMax - b.corePackagePrice,
  },
  {
    key: 'subtotal',
    label: 'Subtotal fitur',
    value: (b) => formatRupiahRange(b.featuresSubtotalMin, b.featuresSubtotalMax, false),
    raw: (b) => b.featuresSubtotalMax,
  },
  {
    key: 'platform',
    label: 'Pengali platform',
    value: (b) => `${formatNumber(b.platformMultiplier, 2)}×`,
    raw: (b) => b.platformMultiplier,
  },
  {
    key: 'deployment',
    label: 'Pengali deployment',
    value: (b) => `${formatNumber(b.deploymentMultiplier, 2)}×`,
    raw: (b) => b.deploymentMultiplier,
  },
  {
    key: 'multiplied',
    label: 'Setelah pengali proyek',
    value: (b) => formatRupiahRange(b.multipliedMin, b.multipliedMax, false),
    raw: (b) => b.multipliedMax,
  },
  {
    key: 'discount',
    label: 'Diskon skala',
    hint: 'Dihitung dari subtotal setelah pengali, sebelum biaya setup.',
    value: (b) =>
      b.discountPct > 0
        ? `− ${formatRupiahRange(b.discountMin, b.discountMax, false)} (${formatPercent(b.discountPct)}, ${b.discountLabel})`
        : 'Tidak ada diskon',
    raw: (b) => -b.discountMax,
  },
  {
    key: 'addon',
    label: 'Add-on sekali jalan',
    value: (b) =>
      b.addOnOneTimeMax > 0
        ? formatRupiahRange(b.addOnOneTimeMin, b.addOnOneTimeMax, false)
        : '—',
    raw: (b) => b.addOnOneTimeMax,
  },
  {
    key: 'setup',
    label: 'Biaya setup & onboarding',
    hint: 'BR-14: tetap dan tidak pernah ikut didiskon.',
    value: (b) => formatRupiah(b.setupFee),
    raw: (b) => b.setupFee,
  },
  {
    key: 'total',
    label: 'Nilai proyek',
    value: (b) => formatRupiahRange(b.totalMin, b.totalMax, false),
    raw: (b) => b.totalMax,
    emphasis: true,
  },
  {
    key: 'display',
    label: 'Yang dilihat klien',
    hint: 'Dibulatkan ke jutaan terdekat (C4.1).',
    value: (b) => formatRupiahRange(b.displayTotalMin, b.displayTotalMax, false),
    raw: (b) => b.displayTotalMax,
    emphasis: true,
  },
];

const INTERNAL_LINES: LineSpec[] = [
  {
    key: 'cogsRate',
    label: 'COGS per man-day',
    value: (b) => formatRupiah(b.internal.cogsPerManDay),
    raw: (b) => b.internal.cogsPerManDay,
  },
  {
    key: 'effort',
    label: 'Effort riil',
    hint: 'Termasuk kerangka paket dasar, setup, dan overhead koordinasi.',
    value: (b) =>
      `${formatManDay(b.internal.realEffortManDayMin)} – ${formatManDay(b.internal.realEffortManDayMax)}`,
    raw: (b) => b.internal.realEffortManDayMax,
  },
  {
    key: 'cogs',
    label: 'Proyeksi COGS',
    hint: 'Skenario effort maksimum — angka yang dipakai menilai pagar pengaman.',
    value: (b) => formatRupiah(b.internal.cogsProjection),
    raw: (b) => b.internal.cogsProjection,
  },
  {
    key: 'profit',
    label: 'Gross profit',
    value: (b) => formatRupiah(b.internal.grossProfit),
    raw: (b) => b.internal.grossProfit,
  },
  {
    key: 'margin',
    label: 'Gross margin acuan',
    hint: 'Dikuotasi di harga maksimum, dikerjakan pada effort maksimum.',
    value: (b) => formatPercent(b.internal.grossMarginPct, 1),
    raw: (b) => b.internal.grossMarginPct,
    emphasis: true,
  },
  {
    key: 'marginBest',
    label: 'Skenario terbaik',
    value: (b) => formatPercent(b.internal.grossMarginBestPct, 1),
    raw: (b) => b.internal.grossMarginBestPct,
  },
  {
    key: 'marginWorst',
    label: 'Skenario terburuk',
    hint: 'Dikuotasi di harga minimum, dikerjakan pada effort maksimum.',
    value: (b) => formatPercent(b.internal.grossMarginWorstPct, 1),
    raw: (b) => b.internal.grossMarginWorstPct,
  },
  {
    key: 'duration',
    label: 'Estimasi durasi',
    value: (b) => formatWeekRange(b.duration.weeksMin, b.duration.weeksMax),
    raw: (b) => b.duration.weeksMax,
  },
];

/**
 * Panel hasil simulator (M6).
 *
 * Menampilkan dua kolom saat versi pembanding dipilih, sehingga dampak
 * perubahan tarif terbaca sebagai selisih per komponen — bukan sekadar total
 * yang berubah — sebelum versinya dipublikasikan.
 */
export function SimulatorResult({
  activeRule,
  activeBreakdown,
  compareRule,
  compareBreakdown,
}: {
  activeRule: SimulatorRuleOption;
  activeBreakdown: PriceBreakdown;
  compareRule: SimulatorRuleOption | null;
  compareBreakdown: PriceBreakdown | null;
}) {
  // Dipasangkan menjadi satu objek agar TypeScript memperlakukan "ada
  // pembanding" sebagai satu keputusan, bukan dua pemeriksaan terpisah.
  const compare =
    compareRule && compareBreakdown ? { rule: compareRule, breakdown: compareBreakdown } : null;

  // Versi yang sedang diuji adalah yang paling relevan bagi admin; bila tidak
  // ada pembanding, aturan aktif itu sendiri yang menjadi acuan.
  const focus = compare?.breakdown ?? activeBreakdown;
  const focusRule = compare?.rule ?? activeRule;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Harga jual</CardTitle>
          <CardDescription>
            Menurut{' '}
            {compare ? `versi pembanding v${compare.rule.version}` : `aturan aktif v${activeRule.version}`}{' '}
            · {focusRule.label}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="tabular text-2xl font-semibold tracking-[-0.02em] text-fg">
              {formatRupiahRange(focus.displayTotalMin, focus.displayTotalMax, false)}
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              Rentang {formatNumber(focus.rangeWidthRatio, 2)}× ·{' '}
              {focus.paidFeatureCount} fitur berbayar · {focus.coreFeatureCount} fitur Core
              {focus.discountPct > 0 && ` · diskon ${formatPercent(focus.discountPct)}`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Gross margin"
              value={formatPercent(focus.internal.grossMarginPct, 1)}
              tone={
                focus.internal.grossMarginPct < focusRule.snapshot.minGrossMarginPct
                  ? 'danger'
                  : focus.internal.grossMarginPct < focusRule.snapshot.targetGrossMarginMin
                    ? 'warning'
                    : 'success'
              }
              hint={`Ambang wajib approval ${formatPercent(focusRule.snapshot.minGrossMarginPct)} (BR-17)`}
            />
            <Stat
              label="Effort riil"
              value={formatManDay(focus.internal.realEffortManDayMax)}
              hint={`Minimum ${formatManDay(focus.internal.realEffortManDayMin)}`}
            />
            <Stat
              label="Durasi"
              value={formatWeekRange(focus.duration.weeksMin, focus.duration.weeksMax)}
              hint={`${formatNumber(focusRule.snapshot.parallelDevelopers, 1)} developer paralel`}
            />
          </div>

          {focus.recurringMonthlyMax > 0 && (
            <Alert tone="neutral" title="Biaya berulang bulanan — terpisah dari nilai proyek">
              <span className="tabular">
                {formatRupiahRange(focus.recurringMonthlyMin, focus.recurringMonthlyMax, false)}
              </span>{' '}
              per bulan. BR-12 melarang angka ini dijumlahkan ke nilai proyek.
              {focus.recurringLines.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                  {focus.recurringLines.map((line) => (
                    <li key={line.id}>
                      {line.name} —{' '}
                      <span className="tabular">
                        {formatRupiahRange(line.priceMin, line.priceMax, false)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rincian per komponen</CardTitle>
          <CardDescription>
            {compare
              ? `Kolom kiri memakai aturan aktif v${activeRule.version}, kolom kanan memakai v${compare.rule.version} yang sedang diuji.`
              : 'Urutan perhitungan mengikuti PRD 6.3 – 6.7.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ComparisonTable
            specs={PROJECT_LINES}
            activeLabel={`Aktif · v${activeRule.version}`}
            compareLabel={compare ? `Pembanding · v${compare.rule.version}` : null}
            activeBreakdown={activeBreakdown}
            compareBreakdown={compare?.breakdown ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ekonomi internal</CardTitle>
          <CardDescription>
            PRD 6.4. Seluruh angka di kartu ini tidak pernah ditampilkan ke klien.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ComparisonTable
            specs={INTERNAL_LINES}
            activeLabel={`Aktif · v${activeRule.version}`}
            compareLabel={compare ? `Pembanding · v${compare.rule.version}` : null}
            activeBreakdown={activeBreakdown}
            compareBreakdown={compare?.breakdown ?? null}
          />

          <div className="rounded-lg border border-border bg-surface-sunken p-4">
            <p className="mb-1 text-sm font-semibold text-fg">
              Asumsi biaya di balik angka di atas
            </p>
            <dl>
              <DescRow
                label="Biaya bulanan termuat per developer"
                value={formatRupiah(focus.internal.assumption.monthlyLoadedCost)}
              />
              <DescRow
                label="Hari billable per bulan"
                value={`${formatNumber(focus.internal.assumption.billableDaysPerMonth)} hari`}
              />
              <DescRow
                label="Biaya per hari billable"
                value={formatRupiah(focus.internal.assumption.costPerBillableDay)}
              />
              <DescRow
                label="Beban peran pendukung"
                value={formatRupiah(focus.internal.assumption.supportLoadPerDay)}
              />
              <DescRow
                label="COGS per man-day"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    {formatRupiah(focus.internal.assumption.cogsPerManDay)}
                    {focus.internal.assumption.isOverridden && (
                      <Badge variant="warning">Ditimpa manual</Badge>
                    )}
                  </span>
                }
                emphasis
              />
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
              Utilisasi billable {formatPercent(focusRule.snapshot.billableUtilization)} adalah
              asumsi, bukan fakta — variabel paling sensitif terhadap margin (PRD 6.2).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagar pengaman 6.8</CardTitle>
          <CardDescription>
            Diperiksa dengan kebijakan milik {compare ? `v${compare.rule.version}` : 'aturan aktif'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={focus.canAutoQuote ? 'success' : 'warning'} size="md">
              {focus.canAutoQuote
                ? 'Penawaran boleh terbit otomatis'
                : 'Perlu campur tangan manusia'}
            </Badge>
            <MarginBadge
              value={focus.internal.grossMarginPct}
              minThreshold={focusRule.snapshot.minGrossMarginPct}
              targetMin={focusRule.snapshot.targetGrossMarginMin}
              size="md"
            />
            {focus.pendingCustomCount > 0 && (
              <Badge variant="info" size="md">
                {focus.pendingCustomCount} fitur custom belum diestimasi (BR-02)
              </Badge>
            )}
          </div>

          {focus.guardrails.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Tidak ada pagar pengaman yang tersentuh pada konfigurasi contoh ini.
            </p>
          ) : (
            focus.guardrails.map((flag) => (
              <Alert
                key={flag.code}
                tone={flag.blocking ? 'danger' : 'warning'}
                title={flag.blocking ? 'Menahan penerbitan otomatis' : 'Perlu diperhatikan'}
              >
                <p>{flag.internalMessage}</p>
                {flag.clientMessage && (
                  <p className="mt-1 text-xs opacity-80">
                    Yang dibaca klien: &ldquo;{flag.clientMessage}&rdquo;
                  </p>
                )}
              </Alert>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ComparisonTable({
  specs,
  activeLabel,
  compareLabel,
  activeBreakdown,
  compareBreakdown,
}: {
  specs: LineSpec[];
  activeLabel: string;
  compareLabel: string | null;
  activeBreakdown: PriceBreakdown;
  compareBreakdown: PriceBreakdown | null;
}) {
  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <Th className="min-w-52">Komponen</Th>
            <Th className="min-w-52 text-right">{activeLabel}</Th>
            {compareLabel && <Th className="min-w-52 text-right">{compareLabel}</Th>}
            {compareLabel && <Th className="min-w-36 text-right">Selisih</Th>}
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => {
            const delta =
              compareBreakdown && spec.raw
                ? spec.raw(compareBreakdown) - spec.raw(activeBreakdown)
                : null;
            return (
              <Tr key={spec.key} className={spec.emphasis ? 'bg-brand-soft/40' : undefined}>
                <Td>
                  <span className={spec.emphasis ? 'font-semibold text-fg' : 'text-fg'}>
                    {spec.label}
                  </span>
                  {spec.hint && (
                    <span className="block text-xs leading-snug text-fg-subtle">{spec.hint}</span>
                  )}
                </Td>
                <Td className="tabular text-right">{spec.value(activeBreakdown)}</Td>
                {compareBreakdown && (
                  <Td
                    className={
                      spec.emphasis ? 'tabular text-right font-semibold' : 'tabular text-right'
                    }
                  >
                    {spec.value(compareBreakdown)}
                  </Td>
                )}
                {compareBreakdown && (
                  <Td className="tabular text-right">
                    <DeltaText
                      value={delta}
                      base={spec.raw ? spec.raw(activeBreakdown) : null}
                      unit={inferUnit(spec.key)}
                    />
                  </Td>
                )}
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrapper>
  );
}

type DeltaUnit = 'money' | 'ratio' | 'percent' | 'day' | 'week';

/** Menebak satuan selisih dari kunci baris agar formatnya masuk akal. */
function inferUnit(key: string): DeltaUnit {
  if (key === 'platform' || key === 'deployment') return 'ratio';
  if (key === 'margin' || key === 'marginBest' || key === 'marginWorst') return 'percent';
  if (key === 'effort') return 'day';
  if (key === 'duration') return 'week';
  return 'money';
}

function DeltaText({
  value,
  base,
  unit,
}: {
  value: number | null;
  base: number | null;
  unit: DeltaUnit;
}) {
  if (value === null || Math.abs(value) < 1e-6) {
    return <span className="text-fg-subtle">sama</span>;
  }

  const sign = value > 0 ? '+' : '−';
  const abs = Math.abs(value);
  const text =
    unit === 'money'
      ? formatRupiahShort(abs)
      : unit === 'ratio'
        ? `${formatNumber(abs, 2)}×`
        : unit === 'percent'
          ? `${formatNumber(abs * 100, 1)} poin`
          : unit === 'day'
            ? formatManDay(abs)
            : `${formatNumber(abs, 0)} minggu`;

  const relative =
    unit === 'money' && base && base !== 0 ? ` (${formatPercent(Math.abs(value / base), 1)})` : '';

  // Naik-turun sengaja tidak diberi warna "baik/buruk": kenaikan harga bagus
  // untuk margin tetapi buruk untuk konversi, jadi penilaiannya bukan milik
  // komponen ini.
  return (
    <span className="font-medium text-fg">
      {sign} {text}
      <span className="text-fg-subtle">{relative}</span>
    </span>
  );
}
