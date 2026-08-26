'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  FeatureTypeBadge,
  Select,
} from '@/components/ui';
import {
  PROJECT_DEPLOYMENTS,
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORMS,
  PROJECT_PLATFORM_LABEL,
  USER_TIERS,
  USER_TIER_LABEL,
  type ProjectDeployment,
  type ProjectPlatform,
  type UserTier,
} from '@/lib/domain/enums';
import { formatManDay, formatRupiahRange } from '@/lib/format';
import { computePrice, type PriceInputCustom, type PriceInputFeature } from '@/lib/pricing';
import { NumberField } from './number-field';
import { SimulatorResult } from './simulator-result';
import type { SimulatorAddOn, SimulatorCategory, SimulatorRuleOption } from './types';

/**
 * Simulator harga & margin (M6).
 *
 * Ini pengaman utama sebelum tarif diubah: admin menyusun konfigurasi contoh,
 * lalu melihat dampaknya pada harga jual, COGS, margin, dan durasi secara
 * langsung. Perhitungan berjalan di browser dengan computePrice() yang sama
 * persis dengan yang dipakai server, sehingga angka simulator tidak pernah
 * berbeda dari angka yang nanti keluar di penawaran.
 */
export function PricingSimulator({
  categories,
  addOns,
  ruleOptions,
  activeRuleId,
  initialCompareRuleId,
}: {
  categories: SimulatorCategory[];
  addOns: SimulatorAddOn[];
  ruleOptions: SimulatorRuleOption[];
  activeRuleId: string;
  initialCompareRuleId: string | null;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]!.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    defaultSelection(categories[0]!),
  );
  const [presetId, setPresetId] = useState<string | null>(
    () => categories[0]!.presets[0]?.id ?? null,
  );
  const [platform, setPlatform] = useState<ProjectPlatform>('WEB');
  const [deployment, setDeployment] = useState<ProjectDeployment>('OUR_CLOUD');
  const [userTier, setUserTier] = useState<UserTier>('T50');
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [customCount, setCustomCount] = useState(0);
  const [customEstimated, setCustomEstimated] = useState(true);
  const [customManDayMin, setCustomManDayMin] = useState(4);
  const [customManDayMax, setCustomManDayMax] = useState(7);
  const [compareRuleId, setCompareRuleId] = useState<string>(initialCompareRuleId ?? '');

  const category = categories.find((item) => item.id === categoryId) ?? categories[0]!;
  const allFeatures = category.groups.flatMap((group) => group.features);
  const selected = new Set(selectedIds);

  // BR-01: fitur Core selalu ikut, tidak dapat dilepas dari keranjang.
  const features: PriceInputFeature[] = allFeatures
    .filter((feature) => feature.type === 'CORE' || selected.has(feature.id))
    .map((feature) => ({
      id: feature.id,
      name: feature.name,
      type: feature.type,
      manDayMin: feature.manDayMin,
      manDayMax: feature.manDayMax,
      effortRatioOverride: feature.effortRatioOverride,
      groupName: feature.groupName,
    }));

  const availableAddOns = addOns.filter(
    (addOn) => addOn.categoryIds === null || addOn.categoryIds.includes(categoryId),
  );
  const selectedAddOns = availableAddOns.filter((addOn) => addOnIds.includes(addOn.id));

  // BR-02: fitur custom hanya masuk total setelah diestimasi manusia. Sakelar
  // "sudah diestimasi" ada supaya admin bisa melihat kedua keadaan itu.
  const customRequests: PriceInputCustom[] = Array.from({ length: customCount }, (_, index) => ({
    id: `simulasi-custom-${index}`,
    name: `Fitur custom contoh ${index + 1}`,
    isEstimated: customEstimated,
    manDayMin: customManDayMin,
    manDayMax: customManDayMax,
  }));

  const activeRule =
    ruleOptions.find((rule) => rule.id === activeRuleId) ?? ruleOptions[0]!;
  const compareRule =
    compareRuleId && compareRuleId !== activeRule.id
      ? (ruleOptions.find((rule) => rule.id === compareRuleId) ?? null)
      : null;

  const priceInput = {
    features,
    customRequests,
    addOns: selectedAddOns,
    platform,
    deployment,
    userTier,
  };

  const activeBreakdown = computePrice({ ...priceInput, rule: activeRule.snapshot });
  const compareBreakdown = compareRule
    ? computePrice({ ...priceInput, rule: compareRule.snapshot })
    : null;

  const paidFeatureCount = activeBreakdown.paidFeatureCount;
  const belowMinViable = paidFeatureCount < category.minViableFeatureCount;

  const changeCategory = (nextId: string) => {
    const next = categories.find((item) => item.id === nextId);
    if (!next) return;
    setCategoryId(nextId);
    setSelectedIds(defaultSelection(next));
    setPresetId(next.presets[0]?.id ?? null);
    // Add-on yang tidak berlaku di kategori baru dilepas agar hasil simulasi
    // tidak memuat pilihan yang mustahil dibuat klien.
    setAddOnIds((prev) =>
      prev.filter((id) => {
        const addOn = addOns.find((item) => item.id === id);
        return addOn ? addOn.categoryIds === null || addOn.categoryIds.includes(nextId) : false;
      }),
    );
  };

  const applyPreset = (id: string) => {
    const preset = category.presets.find((item) => item.id === id);
    if (!preset) return;
    setPresetId(id);
    setSelectedIds(unique([...coreIds(category), ...preset.featureIds]));
  };

  const toggleFeature = (featureId: string, checked: boolean) => {
    setPresetId(null);
    setSelectedIds((prev) =>
      checked ? unique([...prev, featureId]) : prev.filter((id) => id !== featureId),
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* -- Penyusun konfigurasi contoh ------------------------------------- */}
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Versi aturan yang diuji</CardTitle>
            <CardDescription>
              Bandingkan aturan aktif dengan versi draft yang sedang disiapkan, supaya dampak
              perubahan tarif terlihat sebelum dipublikasikan (BR-07).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field
              label="Versi pembanding"
              htmlFor="sim-rule"
              hint="Kosongkan untuk melihat hasil aturan aktif saja."
            >
              <Select
                id="sim-rule"
                value={compareRuleId}
                onChange={(event) => setCompareRuleId(event.target.value)}
              >
                <option value="">Tanpa pembanding</option>
                {ruleOptions
                  .filter((rule) => rule.id !== activeRule.id)
                  .map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      v{rule.version} · {rule.label}
                    </option>
                  ))}
              </Select>
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">
                Aktif: v{activeRule.version} · {activeRule.label}
              </Badge>
              {compareRule && (
                <>
                  <Badge variant="warning">
                    Pembanding: v{compareRule.version} · {compareRule.label}
                  </Badge>
                  <Link
                    href={`/admin/harga/${compareRule.id}`}
                    className="text-xs font-medium text-brand underline-offset-4 hover:underline"
                  >
                    Buka versi pembanding
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Konfigurasi contoh</CardTitle>
            <CardDescription>
              Susun rakitan yang mewakili proyek tipikal. Semakin dekat dengan rakitan nyata,
              semakin dapat dipercaya angka margin yang keluar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Kategori aplikasi" htmlFor="sim-category">
              <Select
                id="sim-category"
                value={categoryId}
                onChange={(event) => changeCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>

            {category.presets.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-fg">Preset</p>
                <div className="flex flex-wrap gap-2">
                  {category.presets.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      size="sm"
                      variant={presetId === preset.id ? 'primary' : 'secondary'}
                      onClick={() => applyPreset(preset.id)}
                      title={preset.tagline}
                    >
                      {preset.name}
                      <span className="tabular opacity-70">({preset.featureIds.length})</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Platform" htmlFor="sim-platform">
                <Select
                  id="sim-platform"
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value as ProjectPlatform)}
                >
                  {PROJECT_PLATFORMS.map((item) => (
                    <option key={item} value={item}>
                      {PROJECT_PLATFORM_LABEL[item]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Deployment" htmlFor="sim-deployment">
                <Select
                  id="sim-deployment"
                  value={deployment}
                  onChange={(event) => setDeployment(event.target.value as ProjectDeployment)}
                >
                  {PROJECT_DEPLOYMENTS.map((item) => (
                    <option key={item} value={item}>
                      {PROJECT_DEPLOYMENT_LABEL[item]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Jumlah pengguna" htmlFor="sim-user-tier">
                <Select
                  id="sim-user-tier"
                  value={userTier}
                  onChange={(event) => setUserTier(event.target.value as UserTier)}
                >
                  {USER_TIERS.map((item) => (
                    <option key={item} value={item}>
                      {USER_TIER_LABEL[item]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fitur</CardTitle>
            <CardDescription>
              {paidFeatureCount} fitur berbayar dipilih dari {allFeatures.length} fitur katalog.
              Fitur Core selalu ikut dan tidak dapat dilepas (BR-01).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPresetId(null);
                  setSelectedIds(allFeatures.map((feature) => feature.id));
                }}
              >
                Pilih semua
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPresetId(null);
                  setSelectedIds(coreIds(category));
                }}
              >
                Sisakan Core saja
              </Button>
            </div>

            {belowMinViable && (
              <Alert tone="warning" title="Di bawah ambang kelayakan kategori">
                Kategori ini menetapkan minimal {category.minViableFeatureCount} fitur berbayar agar
                rakitan dianggap aplikasi utuh (C3.5). Simulasi tetap berjalan, tetapi angkanya tidak
                mewakili proyek yang benar-benar layak jual.
              </Alert>
            )}

            <div className="flex flex-col gap-4">
              {category.groups.map((group) => (
                <div key={group.id}>
                  <p className="mb-1.5 text-sm font-semibold text-fg">{group.name}</p>
                  <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                    {group.features.map((feature) => {
                      const isCore = feature.type === 'CORE';
                      return (
                        <div
                          key={feature.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <Checkbox
                            checked={isCore || selected.has(feature.id)}
                            disabled={isCore}
                            label={
                              <span className="flex flex-wrap items-center gap-1.5">
                                {feature.name}
                                <FeatureTypeBadge type={feature.type} />
                                {feature.isEssential && <Badge variant="outline">Esensial</Badge>}
                              </span>
                            }
                            onChange={(event) => toggleFeature(feature.id, event.target.checked)}
                          />
                          <span className="tabular shrink-0 text-xs text-fg-subtle">
                            {formatManDay(feature.manDayMin)} – {formatManDay(feature.manDayMax)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add-on</CardTitle>
            <CardDescription>
              Biaya berulang tetap dihitung terpisah dari nilai proyek (BR-12).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableAddOns.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Belum ada add-on aktif yang berlaku untuk kategori ini.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {availableAddOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <Checkbox
                      checked={addOnIds.includes(addOn.id)}
                      label={
                        <span className="flex flex-wrap items-center gap-1.5">
                          {addOn.name}
                          {addOn.isRecurring && <Badge variant="info">Berulang / bulan</Badge>}
                        </span>
                      }
                      onChange={(event) =>
                        setAddOnIds((prev) =>
                          event.target.checked
                            ? unique([...prev, addOn.id])
                            : prev.filter((id) => id !== addOn.id),
                        )
                      }
                    />
                    <span className="tabular shrink-0 text-xs text-fg-subtle">
                      {formatRupiahRange(addOn.priceMin, addOn.priceMax)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fitur custom hipotetis</CardTitle>
            <CardDescription>
              Untuk menguji pagar pengaman porsi custom (6.8) dan BR-02. Maksimal 5 per konfigurasi
              (BR-03).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                label="Jumlah fitur custom"
                value={customCount}
                onChange={(next) => setCustomCount(Math.min(5, Math.max(0, Math.round(next))))}
                min={0}
                max={5}
              />
              <NumberField
                label="Man-day minimum"
                suffix="hari"
                value={customManDayMin}
                onChange={setCustomManDayMin}
                min={0}
                step={0.5}
              />
              <NumberField
                label="Man-day maksimum"
                suffix="hari"
                value={customManDayMax}
                onChange={setCustomManDayMax}
                min={0}
                step={0.5}
              />
            </div>
            <Checkbox
              checked={customEstimated}
              label="Anggap sudah diestimasi tim"
              hint="BR-02: selama belum diestimasi manusia, fitur custom tidak pernah masuk total dan penawaran tidak boleh terbit otomatis."
              onChange={(event) => setCustomEstimated(event.target.checked)}
            />
          </CardContent>
        </Card>
      </div>

      {/* -- Hasil perhitungan ------------------------------------------------ */}
      <div className="scrollbar-slim min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <SimulatorResult
          activeRule={activeRule}
          activeBreakdown={activeBreakdown}
          compareRule={compareRule}
          compareBreakdown={compareBreakdown}
        />
      </div>
    </div>
  );
}

function coreIds(category: SimulatorCategory): string[] {
  return category.groups
    .flatMap((group) => group.features)
    .filter((feature) => feature.type === 'CORE')
    .map((feature) => feature.id);
}

/** Rakitan awal: fitur Core ditambah preset pertama bila kategori punya preset. */
function defaultSelection(category: SimulatorCategory): string[] {
  const preset = category.presets[0];
  return unique([...coreIds(category), ...(preset?.featureIds ?? [])]);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
