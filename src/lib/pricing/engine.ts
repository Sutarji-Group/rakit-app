/**
 * Mesin harga RAKIT — implementasi PRD bagian 6.
 *
 * Modul ini sengaja berupa fungsi murni tanpa ketergantungan pada Prisma,
 * React, maupun API browser, sehingga:
 *
 *   1. Konfigurator dapat menghitung ulang harga di klien dalam ≤ 200 ms
 *      (NFR Performa) tanpa perjalanan bolak-balik ke server.
 *   2. Server dapat memvalidasi ulang hasil yang sama sebelum menyimpan,
 *      sehingga harga tidak bisa dimanipulasi dari sisi klien.
 *   3. Konfigurasi lama dapat dihitung ulang persis dengan aturan versi
 *      lamanya (BR-07 / M8), cukup dengan mengoper snapshot aturan berbeda.
 *
 * Rumus mengikuti PRD 6.4:
 *
 *   Harga fitur      = man_day_referensi × TARIF_REFERENSI × pengali_tipe
 *   Subtotal Fitur   = harga_paket_dasar_core + Σ harga fitur
 *   Total            = (Subtotal × pengali_platform × pengali_deployment)
 *                      − diskon skala + Σ add-on + biaya_setup_onboarding
 *
 * Catatan penerapan diskon: biaya setup & onboarding tidak pernah ikut
 * didiskon karena sifatnya tetap dan tidak menyusut (BR-14 / 6.8 butir 2).
 * Diskon skala dihitung dari subtotal fitur setelah pengali proyek.
 */

import type { FeatureType } from '@/lib/domain/enums';
import type {
  AddOnLine,
  CogsAssumption,
  DurationEstimate,
  GuardrailFlag,
  InternalEconomics,
  PriceBreakdown,
  PriceImpactLevel,
  PriceInput,
  PriceInputAddOn,
  PriceInputCustom,
  PriceInputFeature,
  PriceLine,
  PricingRuleSnapshot,
  VolumeDiscountTier,
} from './types';

// ---------------------------------------------------------------------------
// Utilitas angka
// ---------------------------------------------------------------------------

const ONE_MILLION = 1_000_000;

/** Pembulatan ke rupiah bulat. */
export function roundRupiah(value: number): number {
  return Math.round(value);
}

/** Pembulatan ke jutaan terdekat untuk tampilan ke klien (C4.1). */
export function roundToMillion(value: number): number {
  return Math.round(value / ONE_MILLION) * ONE_MILLION;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Pengali & rasio per tipe fitur
// ---------------------------------------------------------------------------

/**
 * Pengali harga jual per tipe fitur (PRD 6.3).
 *
 * Core tidak memakai pengali karena dijual sebagai paket dasar bertarif tetap;
 * nilainya 0 agar tidak menambah subtotal secara ganda.
 */
export function priceMultiplierFor(rule: PricingRuleSnapshot, type: FeatureType): number {
  switch (type) {
    case 'CORE':
      return 0;
    case 'STANDARD':
      return rule.multiplierStandard;
    case 'CONFIGURABLE':
      return rule.multiplierConfigurable;
    case 'CUSTOM':
      return rule.multiplierCustom;
  }
}

/** Rasio effort riil terhadap man-day referensi (PRD 6.3). */
export function effortRatioFor(rule: PricingRuleSnapshot, type: FeatureType): number {
  switch (type) {
    case 'CORE':
      return rule.effortRatioCore;
    case 'STANDARD':
      return rule.effortRatioStandard;
    case 'CONFIGURABLE':
      return rule.effortRatioConfigurable;
    case 'CUSTOM':
      return rule.effortRatioCustom;
  }
}

/** Batas lebar rentang per tipe fitur (PRD 6.1, BR-05). */
export function rangeWidthLimitFor(rule: PricingRuleSnapshot, type: FeatureType): number {
  switch (type) {
    case 'CORE':
      return rule.rangeWidthCore;
    case 'STANDARD':
      return rule.rangeWidthStandard;
    case 'CONFIGURABLE':
      return rule.rangeWidthConfigurable;
    case 'CUSTOM':
      return rule.rangeWidthCustom;
  }
}

/**
 * Memeriksa apakah rentang man-day sebuah fitur melanggar batas lebar tipenya.
 * Dipakai admin katalog (kriteria penerimaan modul L) dan validasi estimasi
 * fitur custom (N3).
 */
export function validateRangeWidth(
  rule: PricingRuleSnapshot,
  type: FeatureType,
  manDayMin: number,
  manDayMax: number,
): { valid: boolean; limit: number; ratio: number; message: string | null } {
  const limit = rangeWidthLimitFor(rule, type);
  if (manDayMin <= 0) {
    return {
      valid: false,
      limit,
      ratio: 0,
      message: 'Man-day minimum harus lebih besar dari nol.',
    };
  }
  if (manDayMax < manDayMin) {
    return {
      valid: false,
      limit,
      ratio: manDayMax / manDayMin,
      message: 'Man-day maksimum tidak boleh lebih kecil dari minimum.',
    };
  }
  const ratio = manDayMax / manDayMin;
  // Toleransi kecil untuk galat pembulatan floating point.
  const valid = ratio <= limit + 1e-9;
  return {
    valid,
    limit,
    ratio,
    message: valid
      ? null
      : `Lebar rentang ${ratio.toFixed(2)}× melebihi batas ${limit.toFixed(2)}× untuk tipe ${type}. ` +
        `Persempit rentang atau ubah tipe fitur (PRD 6.1 / BR-05).`,
  };
}

// ---------------------------------------------------------------------------
// Biaya internal (COGS)
// ---------------------------------------------------------------------------

/**
 * Menurunkan biaya langsung per man-day dari asumsi biaya internal (PRD 6.2).
 *
 * Perhatikan utilisasi billable — variabel tunggal paling sensitif terhadap
 * margin. Menghitung dengan 20 hari billable per bulan menghasilkan biaya semu
 * yang jauh lebih rendah dari kenyataan.
 */
export function deriveCogsPerManDay(rule: PricingRuleSnapshot): CogsAssumption {
  const monthlyLoadedCost = rule.avgDeveloperSalary * rule.burdenFactor;
  const rawBillableDays = rule.effectiveWorkDaysPerMonth * rule.billableUtilization;
  // Dibulatkan ke hari penuh: satu hari kerja tidak dapat dipecah dalam praktik
  // penjadwalan, dan PRD 6.2 memakai angka bulat (≈13 hari).
  const billableDaysPerMonth = Math.max(1, Math.round(rawBillableDays));
  const costPerBillableDay = monthlyLoadedCost / billableDaysPerMonth;
  const supportLoadPerDay = costPerBillableDay * rule.supportRoleRatio;
  const computed = costPerBillableDay + supportLoadPerDay;

  const isOverridden =
    rule.cogsPerManDayOverride !== null && rule.cogsPerManDayOverride !== undefined;

  return {
    monthlyLoadedCost: roundRupiah(monthlyLoadedCost),
    billableDaysPerMonth,
    costPerBillableDay: roundRupiah(costPerBillableDay),
    supportLoadPerDay: roundRupiah(supportLoadPerDay),
    cogsPerManDay: isOverridden ? rule.cogsPerManDayOverride! : roundRupiah(computed),
    isOverridden,
  };
}

// ---------------------------------------------------------------------------
// Diskon skala
// ---------------------------------------------------------------------------

export function resolveDiscountTier(
  tiers: VolumeDiscountTier[],
  paidFeatureCount: number,
): VolumeDiscountTier | null {
  if (paidFeatureCount <= 0) return null;
  const sorted = [...tiers].sort((a, b) => a.minFeatures - b.minFeatures);
  for (const tier of sorted) {
    const withinMin = paidFeatureCount >= tier.minFeatures;
    const withinMax = tier.maxFeatures === null || paidFeatureCount <= tier.maxFeatures;
    if (withinMin && withinMax) return tier;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Indikator dampak harga
// ---------------------------------------------------------------------------

/**
 * Menerjemahkan harga satu fitur menjadi indikator bertingkat (C2.4).
 *
 * PRD sengaja tidak menampilkan rupiah per fitur di kartu karena mengundang
 * perbandingan per item dengan kompetitor dan memicu tawar-menawar mikro.
 */
export function priceImpactLevel(
  rule: PricingRuleSnapshot,
  priceMax: number,
): PriceImpactLevel {
  const tier1 = rule.referenceRatePerManDay * 2;
  const tier2 = rule.referenceRatePerManDay * 4;
  if (priceMax <= tier1) return 1;
  if (priceMax <= tier2) return 2;
  return 3;
}

// ---------------------------------------------------------------------------
// Estimasi durasi
// ---------------------------------------------------------------------------

function estimateDuration(
  rule: PricingRuleSnapshot,
  effortMin: number,
  effortMax: number,
): DurationEstimate {
  const capacityPerWeek = Math.max(
    0.5,
    rule.parallelDevelopers * rule.workDaysPerWeek,
  );

  const rawMin = rule.fixedDurationWeeks + effortMin / capacityPerWeek;
  const rawMax =
    rule.fixedDurationWeeks + (effortMax * rule.durationBufferFactor) / capacityPerWeek;

  const weeksMin = Math.max(1, Math.ceil(rawMin));
  const weeksMax = Math.max(weeksMin + 1, Math.ceil(rawMax));

  // Pembagian fase untuk diagram timeline pada proposal PDF (F4).
  const buildWeeks = Math.max(1, weeksMax - Math.ceil(rule.fixedDurationWeeks));
  const phases = [
    {
      name: 'Discovery & Desain',
      weeks: Math.max(1, Math.round(buildWeeks * 0.15)),
      description: 'Penyelarasan proses bisnis, wireframe, dan penetapan kriteria penerimaan.',
    },
    {
      name: 'Pengembangan Fase 1',
      weeks: Math.max(1, Math.round(buildWeeks * 0.35)),
      description: 'Modul fondasi dan master data siap dipakai.',
    },
    {
      name: 'Pengembangan Fase 2',
      weeks: Math.max(1, Math.round(buildWeeks * 0.3)),
      description: 'Modul operasional, laporan, dan integrasi.',
    },
    {
      name: 'UAT & Pelatihan',
      weeks: Math.max(1, Math.round(buildWeeks * 0.12)),
      description: 'Pengujian bersama pengguna, perbaikan, dan pelatihan tim Anda.',
    },
    {
      name: 'Go-Live & Pendampingan',
      weeks: Math.max(1, Math.round(buildWeeks * 0.08)),
      description: 'Migrasi data, peluncuran, dan pendampingan minggu pertama.',
    },
  ];

  return { weeksMin, weeksMax, phases };
}

// ---------------------------------------------------------------------------
// Mesin utama
// ---------------------------------------------------------------------------

export function computePrice(input: PriceInput): PriceBreakdown {
  const {
    rule,
    features,
    customRequests = [],
    addOns = [],
    platform,
    deployment,
    userTier,
    includeUserTierRecurring = true,
  } = input;

  // -- 1. Harga per fitur katalog ------------------------------------------
  const lines: PriceLine[] = [];
  let featurePriceMin = 0;
  let featurePriceMax = 0;
  let featureEffortMin = 0;
  let featureEffortMax = 0;
  let coreFeatureCount = 0;

  for (const feature of features) {
    const isCore = feature.type === 'CORE';
    const multiplier = priceMultiplierFor(rule, feature.type);
    const effortRatio = feature.effortRatioOverride ?? effortRatioFor(rule, feature.type);

    const priceMin = roundRupiah(feature.manDayMin * rule.referenceRatePerManDay * multiplier);
    const priceMax = roundRupiah(feature.manDayMax * rule.referenceRatePerManDay * multiplier);
    const effortMin = feature.manDayMin * effortRatio;
    const effortMax = feature.manDayMax * effortRatio;

    if (isCore) {
      coreFeatureCount += 1;
    } else {
      featurePriceMin += priceMin;
      featurePriceMax += priceMax;
    }
    featureEffortMin += effortMin;
    featureEffortMax += effortMax;

    lines.push({
      id: feature.id,
      name: feature.name,
      type: feature.type,
      groupName: feature.groupName,
      manDayMin: feature.manDayMin,
      manDayMax: feature.manDayMax,
      priceMin,
      priceMax,
      effortManDayMin: effortMin,
      effortManDayMax: effortMax,
      impact: isCore ? 1 : priceImpactLevel(rule, priceMax),
      includedInBasePackage: isCore,
    });
  }

  // -- 2. Fitur custom ------------------------------------------------------
  // BR-02: hanya yang sudah diestimasi manusia yang boleh masuk total.
  let customPriceMin = 0;
  let customPriceMax = 0;
  let pendingCustomCount = 0;
  let estimatedCustomCount = 0;

  for (const request of customRequests) {
    if (!request.isEstimated || request.manDayMin == null || request.manDayMax == null) {
      pendingCustomCount += 1;
      continue;
    }
    estimatedCustomCount += 1;
    const multiplier = priceMultiplierFor(rule, 'CUSTOM');
    const effortRatio = effortRatioFor(rule, 'CUSTOM');

    const priceMin = roundRupiah(request.manDayMin * rule.referenceRatePerManDay * multiplier);
    const priceMax = roundRupiah(request.manDayMax * rule.referenceRatePerManDay * multiplier);

    customPriceMin += priceMin;
    customPriceMax += priceMax;
    featureEffortMin += request.manDayMin * effortRatio;
    featureEffortMax += request.manDayMax * effortRatio;

    lines.push({
      id: request.id,
      name: request.name,
      type: 'CUSTOM',
      groupName: 'Fitur Custom',
      manDayMin: request.manDayMin,
      manDayMax: request.manDayMax,
      priceMin,
      priceMax,
      effortManDayMin: request.manDayMin * effortRatio,
      effortManDayMax: request.manDayMax * effortRatio,
      impact: priceImpactLevel(rule, priceMax),
      includedInBasePackage: false,
    });
  }

  // -- 3. Subtotal fitur ----------------------------------------------------
  // Paket dasar Core hanya ditagihkan bila ada minimal satu fitur Core terpilih.
  //
  // Effort riil tiap fitur Core sudah ikut terhitung di featureEffort lewat
  // rasio effortRatioCore. corePackageManDay karena itu hanya menambahkan
  // effort merakit kerangka aplikasi (shell, autentikasi, peran, kerangka
  // deployment) yang tidak terwakili oleh satu pun entri katalog.
  const corePackagePrice = coreFeatureCount > 0 ? rule.corePackagePrice : 0;
  const corePackageEffort = coreFeatureCount > 0 ? rule.corePackageManDay : 0;

  const featuresSubtotalMin = corePackagePrice + featurePriceMin + customPriceMin;
  const featuresSubtotalMax = corePackagePrice + featurePriceMax + customPriceMax;

  // -- 4. Pengali tingkat proyek -------------------------------------------
  const platformMultiplier = rule.platformMultipliers[platform] ?? 1;
  const deploymentMultiplier = rule.deploymentMultipliers[deployment] ?? 1;
  const projectMultiplier = platformMultiplier * deploymentMultiplier;

  const multipliedMin = roundRupiah(featuresSubtotalMin * projectMultiplier);
  const multipliedMax = roundRupiah(featuresSubtotalMax * projectMultiplier);

  // -- 5. Diskon skala ------------------------------------------------------
  // Dasar perhitungan adalah jumlah fitur berbayar: seluruh fitur non-Core
  // ditambah fitur custom yang sudah diestimasi. Bila aturan mengaktifkan
  // discountCountsCoreFeatures, fitur Core ikut dihitung mengikuti pembacaan
  // Lampiran C.
  const paidFeatureCount =
    features.filter((f) => f.type !== 'CORE').length + estimatedCustomCount;
  const discountBasisCount = rule.discountCountsCoreFeatures
    ? paidFeatureCount + coreFeatureCount
    : paidFeatureCount;
  const tier = resolveDiscountTier(rule.volumeDiscountTiers, discountBasisCount);
  const discountPct = tier?.discountPct ?? 0;
  const discountMin = roundRupiah(multipliedMin * discountPct);
  const discountMax = roundRupiah(multipliedMax * discountPct);

  // -- 6. Add-on ------------------------------------------------------------
  const addOnLines: AddOnLine[] = [];
  const recurringLines: AddOnLine[] = [];
  let addOnOneTimeMin = 0;
  let addOnOneTimeMax = 0;
  let recurringMonthlyMin = 0;
  let recurringMonthlyMax = 0;
  let addOnEffortMin = 0;
  let addOnEffortMax = 0;

  for (const addOn of addOns) {
    const line: AddOnLine = {
      id: addOn.id,
      name: addOn.name,
      kind: addOn.kind,
      priceMin: addOn.priceMin,
      priceMax: addOn.priceMax,
      isRecurring: addOn.isRecurring,
    };
    if (addOn.isRecurring) {
      // BR-12: biaya berulang tidak pernah dicampur ke nilai proyek.
      recurringMonthlyMin += addOn.priceMin;
      recurringMonthlyMax += addOn.priceMax;
      recurringLines.push(line);
    } else {
      addOnOneTimeMin += addOn.priceMin;
      addOnOneTimeMax += addOn.priceMax;
      addOnLines.push(line);
      addOnEffortMin += addOn.manDayMin;
      addOnEffortMax += addOn.manDayMax;
    }
  }

  if (includeUserTierRecurring) {
    const tierPrice = rule.userTierPricing.find((t) => t.tier === userTier);
    if (tierPrice) {
      recurringMonthlyMin += tierPrice.monthlyMin;
      recurringMonthlyMax += tierPrice.monthlyMax;
      recurringLines.push({
        id: `user-tier-${tierPrice.tier}`,
        name: `Hosting & lisensi — ${tierPrice.label}`,
        kind: 'HOSTING',
        priceMin: tierPrice.monthlyMin,
        priceMax: tierPrice.monthlyMax,
        isRecurring: true,
      });
    }
  }

  // -- 7. Total -------------------------------------------------------------
  // BR-14: biaya setup & onboarding bersifat tetap, tidak ikut didiskon.
  const setupFee = featuresSubtotalMin > 0 ? rule.setupFee : 0;

  const totalMin = roundRupiah(multipliedMin - discountMin + addOnOneTimeMin + setupFee);
  const totalMax = roundRupiah(multipliedMax - discountMax + addOnOneTimeMax + setupFee);

  const displayTotalMin = roundToMillion(totalMin);
  const displayTotalMax = roundToMillion(totalMax);
  const rangeWidthRatio = totalMin > 0 ? totalMax / totalMin : 1;

  // -- 8. Effort riil & ekonomi internal ------------------------------------
  const baseEffortMin = corePackageEffort + featureEffortMin + addOnEffortMin;
  const baseEffortMax = corePackageEffort + featureEffortMax + addOnEffortMax;

  // Pengali proyek juga menaikkan effort riil: mobile native benar-benar
  // menambah pekerjaan, bukan sekadar menaikkan harga.
  const realEffortManDayMin =
    (baseEffortMin * projectMultiplier + rule.setupEffortManDay) *
    (1 + rule.overheadEffortRatio);
  const realEffortManDayMax =
    (baseEffortMax * projectMultiplier + rule.setupEffortManDay) *
    (1 + rule.overheadEffortRatio);

  const assumption = deriveCogsPerManDay(rule);
  const cogsMin = roundRupiah(realEffortManDayMin * assumption.cogsPerManDay);
  const cogsMax = roundRupiah(realEffortManDayMax * assumption.cogsPerManDay);

  // PRD 6.8 butir 5: kuotasi di angka maksimum. Margin acuan karena itu diukur
  // terhadap totalMax, dengan skenario effort maksimum sebagai proyeksi COGS.
  const cogsProjection = cogsMax;
  const grossMarginPct = totalMax > 0 ? (totalMax - cogsMax) / totalMax : 0;
  const grossMarginBestPct = totalMax > 0 ? (totalMax - cogsMin) / totalMax : 0;
  const grossMarginWorstPct = totalMin > 0 ? (totalMin - cogsMax) / totalMin : 0;

  const internal: InternalEconomics = {
    cogsPerManDay: assumption.cogsPerManDay,
    realEffortManDayMin: Number(realEffortManDayMin.toFixed(2)),
    realEffortManDayMax: Number(realEffortManDayMax.toFixed(2)),
    cogsMin,
    cogsMax,
    cogsProjection,
    grossMarginPct: Number(grossMarginPct.toFixed(4)),
    grossMarginBestPct: Number(grossMarginBestPct.toFixed(4)),
    grossMarginWorstPct: Number(grossMarginWorstPct.toFixed(4)),
    grossProfit: totalMax - cogsMax,
    assumption,
  };

  // -- 9. Porsi custom ------------------------------------------------------
  const customValueMin = customPriceMin;
  const customValueMax = customPriceMax;
  const customSharePct = totalMax > 0 ? customValueMax / totalMax : 0;

  // -- 10. Pagar pengaman komersial (6.8, M7) -------------------------------
  const guardrails: GuardrailFlag[] = [];

  if (featuresSubtotalMin > 0 && totalMax < rule.minProjectValue) {
    guardrails.push({
      code: 'BELOW_MIN_PROJECT_VALUE',
      blocking: true,
      clientMessage:
        'Konfigurasi ini masih di bawah nilai proyek minimum kami. ' +
        'Tambahkan beberapa fitur, atau jadwalkan konsultasi agar kami bantu susun ruang lingkup yang pas.',
      internalMessage:
        `Nilai maksimum ${totalMax.toLocaleString('id-ID')} di bawah minimum ` +
        `${rule.minProjectValue.toLocaleString('id-ID')} (BR-13).`,
    });
  }

  if (customSharePct > rule.maxCustomSharePct) {
    guardrails.push({
      code: 'EXCEEDS_CUSTOM_SHARE',
      blocking: true,
      clientMessage:
        'Sebagian besar kebutuhan Anda berupa fitur khusus. ' +
        'Agar estimasinya akurat, kami perlu sesi discovery lebih dalam sebelum menerbitkan penawaran.',
      internalMessage:
        `Porsi custom ${(customSharePct * 100).toFixed(1)}% melebihi batas ` +
        `${(rule.maxCustomSharePct * 100).toFixed(0)}% (BR-15). Tandai lead "perlu discovery mendalam".`,
    });
  }

  if (pendingCustomCount > 0) {
    guardrails.push({
      code: 'PENDING_CUSTOM_ESTIMATE',
      blocking: false,
      clientMessage: null,
      internalMessage:
        `${pendingCustomCount} fitur custom belum diestimasi; total belum final (BR-02).`,
    });
  }

  if (totalMax > 0 && grossMarginPct < rule.minGrossMarginPct) {
    guardrails.push({
      code: 'BELOW_MIN_MARGIN',
      blocking: true,
      clientMessage: null,
      internalMessage:
        `Proyeksi gross margin ${(grossMarginPct * 100).toFixed(1)}% di bawah ambang ` +
        `${(rule.minGrossMarginPct * 100).toFixed(0)}% (BR-17). Perlu approval eksplisit.`,
    });
  } else if (totalMax > 0 && grossMarginPct < rule.targetGrossMarginMin) {
    guardrails.push({
      code: 'MARGIN_BELOW_TARGET',
      blocking: false,
      clientMessage: null,
      internalMessage:
        `Gross margin ${(grossMarginPct * 100).toFixed(1)}% di bawah target ` +
        `${(rule.targetGrossMarginMin * 100).toFixed(0)}–${(rule.targetGrossMarginMax * 100).toFixed(0)}%.`,
    });
  }

  const canAutoQuote = !guardrails.some((g) => g.blocking);

  return {
    ruleVersion: rule.version,
    ruleId: rule.id,
    lines,
    coreFeatureCount,
    corePackagePrice,
    paidFeatureCount,
    discountBasisCount,
    featuresSubtotalMin,
    featuresSubtotalMax,
    platformMultiplier,
    deploymentMultiplier,
    multipliedMin,
    multipliedMax,
    discountPct,
    discountLabel: tier?.label ?? 'Tanpa diskon',
    discountMin,
    discountMax,
    addOnLines,
    addOnOneTimeMin,
    addOnOneTimeMax,
    recurringMonthlyMin,
    recurringMonthlyMax,
    recurringLines,
    setupFee,
    totalMin,
    totalMax,
    displayTotalMin,
    displayTotalMax,
    rangeWidthRatio: Number(rangeWidthRatio.toFixed(3)),
    pendingCustomCount,
    estimatedCustomCount,
    customValueMin,
    customValueMax,
    customSharePct: Number(customSharePct.toFixed(4)),
    duration: estimateDuration(rule, realEffortManDayMin, realEffortManDayMax),
    internal,
    guardrails,
    canAutoQuote,
  };
}

// ---------------------------------------------------------------------------
// Helper untuk override harga sales (BR-16 / O6)
// ---------------------------------------------------------------------------

export interface OverrideEvaluation {
  requestedPct: number;
  withinQuota: boolean;
  needsApproval: boolean;
  resultingPrice: number;
  resultingMarginPct: number;
  belowMinMargin: boolean;
  message: string;
}

/**
 * Mengevaluasi permintaan penurunan harga oleh sales.
 * Kuota bebas approval dibatasi salesOverrideQuotaPct (default 10%).
 */
export function evaluatePriceOverride(
  rule: PricingRuleSnapshot,
  breakdown: PriceBreakdown,
  requestedPrice: number,
): OverrideEvaluation {
  const base = breakdown.totalMax;
  const requestedPct = base > 0 ? clamp((base - requestedPrice) / base, -1, 1) : 0;
  const withinQuota = requestedPct <= rule.salesOverrideQuotaPct + 1e-9;
  const resultingMarginPct =
    requestedPrice > 0
      ? (requestedPrice - breakdown.internal.cogsProjection) / requestedPrice
      : 0;
  const belowMinMargin = resultingMarginPct < rule.minGrossMarginPct;

  let message: string;
  if (requestedPct <= 0) {
    message = 'Harga tidak diturunkan dari nilai penawaran.';
  } else if (withinQuota && !belowMinMargin) {
    message = `Diskon ${(requestedPct * 100).toFixed(1)}% masih di dalam kuota sales.`;
  } else if (!withinQuota && !belowMinMargin) {
    message =
      `Diskon ${(requestedPct * 100).toFixed(1)}% melebihi kuota ` +
      `${(rule.salesOverrideQuotaPct * 100).toFixed(0)}%. Perlu approval dengan alasan tercatat (BR-16).`;
  } else {
    message =
      `Harga ini menekan gross margin ke ${(resultingMarginPct * 100).toFixed(1)}%, ` +
      `di bawah ambang ${(rule.minGrossMarginPct * 100).toFixed(0)}% (BR-17). Wajib approval.`;
  }

  return {
    requestedPct: Number(requestedPct.toFixed(4)),
    withinQuota,
    needsApproval: !withinQuota || belowMinMargin,
    resultingPrice: requestedPrice,
    resultingMarginPct: Number(resultingMarginPct.toFixed(4)),
    belowMinMargin,
    message,
  };
}
