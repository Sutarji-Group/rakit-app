'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Input,
  Table,
  TableWrapper,
  Td,
  Th,
  Textarea,
  Tr,
  useToast,
} from '@/components/ui';
import {
  FEATURE_TYPE_INTERNAL_LABEL,
  PROJECT_DEPLOYMENTS,
  PROJECT_DEPLOYMENT_DESCRIPTION,
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORMS,
  PROJECT_PLATFORM_DESCRIPTION,
  PROJECT_PLATFORM_LABEL,
} from '@/lib/domain/enums';
import { formatNumber, formatRupiah } from '@/lib/format';
import { deriveCogsPerManDay } from '@/lib/pricing';
import { createPricingRule, savePricingRule } from '@/app/admin/harga/actions';
import { CogsTable } from './cogs-table';
import { NumberField } from './number-field';
import { baselineFormValues, formValuesToSnapshot } from './rule-values';
import {
  MultiplierRow,
  UserTierPricingEditor,
  VolumeDiscountEditor,
  multiplierDelta,
} from './tier-editors';
import type { GuardrailFormValues, PricingRuleFormValues } from './types';

/** Contoh subtotal untuk memperlihatkan dampak pengali secara konkret. */
const SAMPLE_SUBTOTAL = 100_000_000;

export function PricingRuleForm({
  mode,
  ruleId,
  version,
  isActive,
  issuedConfigCount,
  initialValues,
  guardrails,
  sourceRuleId,
}: {
  mode: 'edit' | 'create';
  /** Wajib pada mode edit. */
  ruleId?: string;
  version: number;
  isActive: boolean;
  /** Jumlah konfigurasi terbit yang terikat versi ini (M8 / BR-07). */
  issuedConfigCount: number;
  initialValues: PricingRuleFormValues;
  guardrails: GuardrailFormValues;
  /** Versi asal saat menyalin (mode create). */
  sourceRuleId?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<PricingRuleFormValues>(initialValues);
  const [activateAfterCreate, setActivateAfterCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  );

  // Snapshot bayangan dari nilai yang sedang diedit: dipakai tabel COGS agar
  // dampak perubahan asumsi terlihat sebelum disimpan (M3).
  const draftSnapshot = useMemo(
    () => formValuesToSnapshot(values, guardrails, { id: ruleId ?? 'draft', version }),
    [values, guardrails, ruleId, version],
  );

  const set = <K extends keyof PricingRuleFormValues>(
    key: K,
    value: PricingRuleFormValues[K],
  ): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const willFork = mode === 'edit' && issuedConfigCount > 0;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createPricingRule(values, {
              sourceRuleId: sourceRuleId ?? null,
              activate: activateAfterCreate,
            })
          : await savePricingRule(ruleId!, values);

      if (!result.ok) {
        setError(result.message);
        toast({ title: 'Gagal menyimpan', description: result.message, tone: 'danger' });
        return;
      }

      toast({
        title: result.forked ? 'Tersimpan sebagai versi baru' : 'Tersimpan',
        description: result.message,
        tone: result.forked ? 'warning' : 'success',
      });

      if (result.ruleId && result.ruleId !== ruleId) {
        router.push(`/admin/harga/${result.ruleId}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {willFork && (
        <Alert tone="warning" title="Versi ini sudah dipakai penawaran yang terbit">
          {issuedConfigCount} konfigurasi terikat pada v{version}. Menyimpan perubahan akan membuat{' '}
          <strong>versi baru</strong>, bukan menimpa versi ini — perubahan tarif tidak boleh berlaku
          surut terhadap penawaran yang sudah keluar (BR-07 / PRD 6.9).
        </Alert>
      )}

      {/* -- Identitas versi -------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Identitas versi</CardTitle>
          <CardDescription>
            Beri nama yang menjelaskan alasan kalibrasi, misal &ldquo;Penyesuaian tarif Q3 2026
            setelah kalibrasi WMS&rdquo;. Nama ini muncul di riwayat versi dan jejak audit.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Nama versi" htmlFor="rule-label" required>
            <Input
              id="rule-label"
              value={values.label}
              maxLength={120}
              onChange={(event) => set('label', event.target.value)}
            />
          </Field>
          <Field
            label="Catatan perubahan"
            htmlFor="rule-notes"
            hint="Alasan perubahan tarif — dibaca tim saat menelusuri kenapa harga bergeser."
          >
            <Textarea
              id="rule-notes"
              value={values.notes}
              maxLength={2000}
              onChange={(event) => set('notes', event.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      {/* -- Tarif referensi & pengali tipe fitur (M1, M2) --------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Tarif referensi & pengali tipe fitur</CardTitle>
          <CardDescription>
            PRD 6.3: harga satu fitur = man-day referensi × tarif referensi × pengali tipe. Fitur
            Core tidak memakai pengali karena dijual sebagai paket dasar bertarif tetap.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Tarif referensi per man-day"
              kind="money"
              value={values.referenceRatePerManDay}
              onChange={(next) => set('referenceRatePerManDay', next)}
              min={0}
            />
            <NumberField
              label="Harga paket dasar Core"
              kind="money"
              value={values.corePackagePrice}
              onChange={(next) => set('corePackagePrice', next)}
              min={0}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label={`Pengali ${FEATURE_TYPE_INTERNAL_LABEL.STANDARD}`}
              kind="ratio"
              value={values.multiplierStandard}
              onChange={(next) => set('multiplierStandard', next)}
              min={0}
            />
            <NumberField
              label={`Pengali ${FEATURE_TYPE_INTERNAL_LABEL.CONFIGURABLE}`}
              kind="ratio"
              value={values.multiplierConfigurable}
              onChange={(next) => set('multiplierConfigurable', next)}
              min={0}
            />
            <NumberField
              label={`Pengali ${FEATURE_TYPE_INTERNAL_LABEL.CUSTOM}`}
              kind="ratio"
              value={values.multiplierCustom}
              onChange={(next) => set('multiplierCustom', next)}
              min={0}
            />
          </div>

          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Tipe fitur</Th>
                  <Th className="text-right">Pengali</Th>
                  <Th className="text-right">Harga jual per man-day</Th>
                  <Th className="text-right">Effort riil per man-day referensi</Th>
                </tr>
              </thead>
              <tbody>
                <Tr>
                  <Td className="font-medium">{FEATURE_TYPE_INTERNAL_LABEL.CORE}</Td>
                  <Td className="tabular text-right text-fg-muted">paket dasar</Td>
                  <Td className="tabular text-right">
                    {formatRupiah(values.corePackagePrice)} <span className="text-fg-subtle">/ paket</span>
                  </Td>
                  <Td className="tabular text-right">{formatNumber(values.effortRatioCore, 2)}×</Td>
                </Tr>
                {(
                  [
                    ['STANDARD', values.multiplierStandard, values.effortRatioStandard],
                    ['CONFIGURABLE', values.multiplierConfigurable, values.effortRatioConfigurable],
                    ['CUSTOM', values.multiplierCustom, values.effortRatioCustom],
                  ] as const
                ).map(([type, multiplier, effort]) => (
                  <Tr key={type}>
                    <Td className="font-medium">{FEATURE_TYPE_INTERNAL_LABEL[type]}</Td>
                    <Td className="tabular text-right">{formatNumber(multiplier, 2)}×</Td>
                    <Td className="tabular text-right">
                      {formatRupiah(values.referenceRatePerManDay * multiplier)}
                    </Td>
                    <Td className="tabular text-right">{formatNumber(effort, 2)}×</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </CardContent>
      </Card>

      {/* -- Rasio effort riil ------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Rasio effort riil</CardTitle>
          <CardDescription>
            Man-day referensi adalah dasar harga, bukan jam kerja sebenarnya. Rasio di bawah
            menerjemahkannya menjadi effort riil yang dipakai menghitung COGS, margin, dan durasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Rasio effort Core"
            kind="ratio"
            value={values.effortRatioCore}
            onChange={(next) => set('effortRatioCore', next)}
            min={0}
          />
          <NumberField
            label="Rasio effort Standard"
            kind="ratio"
            value={values.effortRatioStandard}
            onChange={(next) => set('effortRatioStandard', next)}
            min={0}
          />
          <NumberField
            label="Rasio effort Configurable"
            kind="ratio"
            value={values.effortRatioConfigurable}
            onChange={(next) => set('effortRatioConfigurable', next)}
            min={0}
          />
          <NumberField
            label="Rasio effort Custom"
            kind="ratio"
            value={values.effortRatioCustom}
            onChange={(next) => set('effortRatioCustom', next)}
            min={0}
          />
          <NumberField
            label="Effort kerangka paket dasar"
            suffix="hari"
            value={values.corePackageManDay}
            onChange={(next) => set('corePackageManDay', next)}
            min={0}
            step={0.5}
            hint="Shell aplikasi, autentikasi, peran, kerangka deployment."
          />
          <NumberField
            label="Effort setup & onboarding"
            suffix="hari"
            value={values.setupEffortManDay}
            onChange={(next) => set('setupEffortManDay', next)}
            min={0}
            step={0.5}
            hint="Deployment, migrasi awal, training dasar."
          />
          <NumberField
            label="Overhead koordinasi"
            kind="percent"
            value={values.overheadEffortRatio}
            onChange={(next) => set('overheadEffortRatio', next)}
            min={0}
            hint="Tumbuh mengikuti ukuran proyek, di luar beban peran pendukung."
          />
        </CardContent>
      </Card>

      {/* -- Asumsi biaya internal (M3) ---------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Asumsi biaya internal & penurunan COGS</CardTitle>
          <CardDescription>
            PRD 6.2. Angka-angka ini tidak pernah tampil ke klien; keduanya hanya menjadi dasar
            proyeksi margin di papan internal (PRD 6.4).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label="Gaji rata-rata developer"
              kind="money"
              value={values.avgDeveloperSalary}
              onChange={(next) => set('avgDeveloperSalary', next)}
              min={0}
              step={500_000}
            />
            <NumberField
              label="Faktor beban"
              kind="ratio"
              value={values.burdenFactor}
              onChange={(next) => set('burdenFactor', next)}
              min={1}
              hint="BPJS, THR, perangkat, ruang kerja."
            />
            <NumberField
              label="Hari kerja efektif per bulan"
              suffix="hari"
              value={values.effectiveWorkDaysPerMonth}
              onChange={(next) => set('effectiveWorkDaysPerMonth', next)}
              min={1}
              max={31}
              step={0.1}
            />
            <NumberField
              label="Utilisasi billable"
              kind="percent"
              value={values.billableUtilization}
              onChange={(next) => set('billableUtilization', next)}
              min={5}
              max={100}
              hint="Variabel paling sensitif terhadap margin — lihat peringatan di bawah."
            />
            <NumberField
              label="Rasio peran pendukung"
              kind="percent"
              value={values.supportRoleRatio}
              onChange={(next) => set('supportRoleRatio', next)}
              min={0}
              hint="PM, QA, DevOps, solution consultant."
            />
          </div>

          <div className="rounded-lg border border-border bg-surface-sunken p-4">
            <Checkbox
              checked={values.cogsPerManDayOverride !== null}
              label="Timpa COGS per man-day secara manual"
              hint="Dipakai hanya bila ada data biaya riil yang lebih tepercaya dari asumsi di atas."
              onChange={(event) =>
                set(
                  'cogsPerManDayOverride',
                  // Nilai awal penimpaan sengaja diisi angka hasil perhitungan
                  // agar admin menyesuaikan dari titik yang wajar, bukan nol.
                  event.target.checked ? deriveCogsPerManDay(draftSnapshot).cogsPerManDay : null,
                )
              }
            />
            {values.cogsPerManDayOverride !== null && (
              <NumberField
                className="mt-3 max-w-xs"
                label="COGS per man-day (manual)"
                kind="money"
                value={values.cogsPerManDayOverride}
                onChange={(next) => set('cogsPerManDayOverride', next)}
                min={0}
                step={50_000}
              />
            )}
          </div>

          <CogsTable rule={draftSnapshot} />
        </CardContent>
      </Card>

      {/* -- Pengali proyek & biaya setup (M4) --------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Pengali platform, deployment & biaya setup</CardTitle>
          <CardDescription>
            PRD 6.5. Pengali dikalikan ke subtotal fitur sebelum diskon skala. Contoh nilai memakai
            subtotal {formatRupiah(SAMPLE_SUBTOTAL)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div>
            <p className="mb-1 text-sm font-semibold text-fg">Platform</p>
            {PROJECT_PLATFORMS.map((platform) => (
              <MultiplierRow
                key={platform}
                label={PROJECT_PLATFORM_LABEL[platform]}
                description={`${PROJECT_PLATFORM_DESCRIPTION[platform]} — ${multiplierDelta(
                  values.platformMultipliers[platform] ?? 1,
                )}.`}
                value={values.platformMultipliers[platform] ?? 1}
                sampleSubtotal={SAMPLE_SUBTOTAL}
                onChange={(next) =>
                  set('platformMultipliers', { ...values.platformMultipliers, [platform]: next })
                }
              />
            ))}
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-fg">Deployment</p>
            {PROJECT_DEPLOYMENTS.map((deployment) => (
              <MultiplierRow
                key={deployment}
                label={PROJECT_DEPLOYMENT_LABEL[deployment]}
                description={`${PROJECT_DEPLOYMENT_DESCRIPTION[deployment]} — ${multiplierDelta(
                  values.deploymentMultipliers[deployment] ?? 1,
                )}.`}
                value={values.deploymentMultipliers[deployment] ?? 1}
                sampleSubtotal={SAMPLE_SUBTOTAL}
                onChange={(next) =>
                  set('deploymentMultipliers', {
                    ...values.deploymentMultipliers,
                    [deployment]: next,
                  })
                }
              />
            ))}
          </div>

          <NumberField
            className="max-w-xs"
            label="Biaya setup & onboarding"
            kind="money"
            value={values.setupFee}
            onChange={(next) => set('setupFee', next)}
            min={0}
            hint="Tetap dan tidak pernah ikut didiskon (BR-14)."
          />
        </CardContent>
      </Card>

      {/* -- Diskon skala (M4) -------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Tabel diskon skala</CardTitle>
          <CardDescription>
            PRD 6.6. Semakin banyak fitur dirakit, semakin murah biaya per fitur karena kerangka
            aplikasinya sudah terbayar sekali di muka.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <VolumeDiscountEditor
            tiers={values.volumeDiscountTiers}
            onChange={(next) => set('volumeDiscountTiers', next)}
          />
          <Checkbox
            checked={values.discountCountsCoreFeatures}
            label="Hitung fitur Core sebagai dasar tier diskon"
            hint="PRD 6.6 menyebut dasar diskon adalah fitur berbayar, sementara Lampiran C melabeli rakitan 28 fitur (8 di antaranya Core) sebagai tier 26–40. Aktifkan bila mengikuti pembacaan Lampiran C."
            onChange={(event) => set('discountCountsCoreFeatures', event.target.checked)}
          />
        </CardContent>
      </Card>

      {/* -- Biaya berulang per tingkat pengguna -------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Biaya hosting & lisensi bulanan</CardTitle>
          <CardDescription>
            PRD 6.5. Ditampilkan terpisah dari nilai proyek di seluruh penawaran (BR-12).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTierPricingEditor
            tiers={values.userTierPricing}
            onChange={(next) => set('userTierPricing', next)}
          />
        </CardContent>
      </Card>

      {/* -- Batas lebar rentang & durasi --------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Batas lebar rentang & estimasi durasi</CardTitle>
          <CardDescription>
            Batas lebar rentang (BR-05) menjaga estimasi katalog tetap dapat dipertanggungjawabkan:
            rentang yang terlalu lebar berarti fitur itu sebenarnya belum dipahami.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Batas rentang Core"
              kind="ratio"
              value={values.rangeWidthCore}
              onChange={(next) => set('rangeWidthCore', next)}
              min={1}
            />
            <NumberField
              label="Batas rentang Standard"
              kind="ratio"
              value={values.rangeWidthStandard}
              onChange={(next) => set('rangeWidthStandard', next)}
              min={1}
            />
            <NumberField
              label="Batas rentang Configurable"
              kind="ratio"
              value={values.rangeWidthConfigurable}
              onChange={(next) => set('rangeWidthConfigurable', next)}
              min={1}
            />
            <NumberField
              label="Batas rentang Custom"
              kind="ratio"
              value={values.rangeWidthCustom}
              onChange={(next) => set('rangeWidthCustom', next)}
              min={1}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Developer paralel efektif"
              suffix="orang"
              value={values.parallelDevelopers}
              onChange={(next) => set('parallelDevelopers', next)}
              min={0.5}
              step={0.5}
            />
            <NumberField
              label="Hari kerja per minggu"
              suffix="hari"
              value={values.workDaysPerWeek}
              onChange={(next) => set('workDaysPerWeek', next)}
              min={1}
              max={7}
            />
            <NumberField
              label="Minggu tetap discovery & UAT"
              suffix="minggu"
              value={values.fixedDurationWeeks}
              onChange={(next) => set('fixedDurationWeeks', next)}
              min={0}
              step={0.5}
            />
            <NumberField
              label="Faktor pelebaran durasi"
              kind="ratio"
              value={values.durationBufferFactor}
              onChange={(next) => set('durationBufferFactor', next)}
              min={1}
            />
            <NumberField
              label="Masa berlaku penawaran"
              suffix="hari"
              value={values.quoteValidityDays}
              onChange={(next) => set('quoteValidityDays', next)}
              min={1}
              max={365}
              hint="BR-06: penawaran kedaluwarsa setelah masa ini."
            />
          </div>
        </CardContent>
      </Card>

      {error && <Alert tone="danger" title="Perubahan belum tersimpan">{error}</Alert>}

      {/* -- Bilah aksi --------------------------------------------------------- */}
      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3 sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
          {mode === 'edit' ? (
            <>
              <Badge variant={isActive ? 'success' : 'neutral'}>
                v{version} · {isActive ? 'Aktif' : 'Draft'}
              </Badge>
              <span>
                {dirty ? 'Ada perubahan yang belum disimpan.' : 'Tidak ada perubahan.'}
              </span>
              {ruleId && (
                <Link
                  href={`/admin/harga/simulator?banding=${ruleId}`}
                  className="font-medium text-brand underline-offset-4 hover:underline"
                >
                  Uji dampaknya di simulator
                </Link>
              )}
            </>
          ) : (
            <Checkbox
              checked={activateAfterCreate}
              label="Langsung aktifkan versi ini setelah dibuat"
              hint="Konfigurasi baru akan memakai tarif ini. Konfigurasi lama tetap memakai versinya sendiri (BR-07)."
              onChange={(event) => setActivateAfterCreate(event.target.checked)}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              // Nama versi dan catatan perubahan tetap dipertahankan — yang
              // dikembalikan hanya angka-angka tarifnya.
              setValues({ ...baselineFormValues(), label: values.label, notes: values.notes })
            }
          >
            Kembalikan ke nilai PRD
          </Button>
          <Button type="button" onClick={submit} isLoading={pending} disabled={pending}>
            {mode === 'create'
              ? 'Buat versi baru'
              : willFork
                ? 'Simpan sebagai versi baru'
                : 'Simpan perubahan'}
          </Button>
        </div>
      </div>
    </div>
  );
}

