/**
 * Jembatan antara baris PricingRule di database, nilai form admin, dan
 * PricingRuleSnapshot yang dipakai mesin harga.
 *
 * Seluruh fungsi di sini murni agar simulator dapat memakainya di browser:
 * form yang sedang diedit langsung menjadi snapshot, lalu dihitung dengan
 * computePrice() tanpa menyimpan apa pun ke database lebih dulu (M6).
 */

import type { PricingRule } from '@/generated/prisma';
import { parseJson } from '@/lib/db/json';
import type { ProjectDeployment, ProjectPlatform } from '@/lib/domain/enums';
import {
  BASELINE_PRICING_RULE,
  DEFAULT_DEPLOYMENT_MULTIPLIERS,
  DEFAULT_PLATFORM_MULTIPLIERS,
  DEFAULT_USER_TIER_PRICING,
  DEFAULT_VOLUME_DISCOUNT_TIERS,
  type PricingRuleSnapshot,
  type UserTierPrice,
  type VolumeDiscountTier,
} from '@/lib/pricing';
import type { GuardrailFormValues, PricingRuleFormValues } from './types';

/** Nilai form dari satu baris PricingRule. */
export function ruleToFormValues(rule: PricingRule): PricingRuleFormValues {
  return {
    label: rule.label,
    notes: rule.notes ?? '',

    referenceRatePerManDay: rule.referenceRatePerManDay,
    multiplierStandard: rule.multiplierStandard,
    multiplierConfigurable: rule.multiplierConfigurable,
    multiplierCustom: rule.multiplierCustom,
    corePackagePrice: rule.corePackagePrice,

    effortRatioCore: rule.effortRatioCore,
    effortRatioStandard: rule.effortRatioStandard,
    effortRatioConfigurable: rule.effortRatioConfigurable,
    effortRatioCustom: rule.effortRatioCustom,
    corePackageManDay: rule.corePackageManDay,
    setupEffortManDay: rule.setupEffortManDay,
    overheadEffortRatio: rule.overheadEffortRatio,

    avgDeveloperSalary: rule.avgDeveloperSalary,
    burdenFactor: rule.burdenFactor,
    effectiveWorkDaysPerMonth: rule.effectiveWorkDaysPerMonth,
    billableUtilization: rule.billableUtilization,
    supportRoleRatio: rule.supportRoleRatio,
    cogsPerManDayOverride: rule.cogsPerManDayOverride,

    platformMultipliers: parseJson<Record<ProjectPlatform, number>>(
      rule.platformMultipliers,
      DEFAULT_PLATFORM_MULTIPLIERS,
    ),
    deploymentMultipliers: parseJson<Record<ProjectDeployment, number>>(
      rule.deploymentMultipliers,
      DEFAULT_DEPLOYMENT_MULTIPLIERS,
    ),
    userTierPricing: parseJson<UserTierPrice[]>(rule.userTierPricing, DEFAULT_USER_TIER_PRICING),
    setupFee: rule.setupFee,

    volumeDiscountTiers: parseJson<VolumeDiscountTier[]>(
      rule.volumeDiscountTiers,
      DEFAULT_VOLUME_DISCOUNT_TIERS,
    ),
    discountCountsCoreFeatures: rule.discountCountsCoreFeatures,

    rangeWidthCore: rule.rangeWidthCore,
    rangeWidthStandard: rule.rangeWidthStandard,
    rangeWidthConfigurable: rule.rangeWidthConfigurable,
    rangeWidthCustom: rule.rangeWidthCustom,

    parallelDevelopers: rule.parallelDevelopers,
    workDaysPerWeek: rule.workDaysPerWeek,
    fixedDurationWeeks: rule.fixedDurationWeeks,
    durationBufferFactor: rule.durationBufferFactor,

    quoteValidityDays: rule.quoteValidityDays,
  };
}

/** Pagar pengaman 6.8 dari satu baris PricingRule (M7). */
export function ruleToGuardrailValues(rule: PricingRule): GuardrailFormValues {
  return {
    minProjectValue: rule.minProjectValue,
    maxCustomSharePct: rule.maxCustomSharePct,
    salesOverrideQuotaPct: rule.salesOverrideQuotaPct,
    minGrossMarginPct: rule.minGrossMarginPct,
    targetGrossMarginMin: rule.targetGrossMarginMin,
    targetGrossMarginMax: rule.targetGrossMarginMax,
    customManDayConsultThreshold: rule.customManDayConsultThreshold,
  };
}

/** Nilai form bawaan sesuai PRD 6.2–6.6 untuk versi yang dibuat dari nol. */
export function baselineFormValues(): PricingRuleFormValues {
  return snapshotToFormValues(BASELINE_PRICING_RULE, 'Kalibrasi baru', '');
}

/** Nilai form dari sebuah snapshot — dipakai saat menyalin versi lain. */
export function snapshotToFormValues(
  snapshot: PricingRuleSnapshot,
  label: string,
  notes: string,
): PricingRuleFormValues {
  return {
    label,
    notes,

    referenceRatePerManDay: snapshot.referenceRatePerManDay,
    multiplierStandard: snapshot.multiplierStandard,
    multiplierConfigurable: snapshot.multiplierConfigurable,
    multiplierCustom: snapshot.multiplierCustom,
    corePackagePrice: snapshot.corePackagePrice,

    effortRatioCore: snapshot.effortRatioCore,
    effortRatioStandard: snapshot.effortRatioStandard,
    effortRatioConfigurable: snapshot.effortRatioConfigurable,
    effortRatioCustom: snapshot.effortRatioCustom,
    corePackageManDay: snapshot.corePackageManDay,
    setupEffortManDay: snapshot.setupEffortManDay,
    overheadEffortRatio: snapshot.overheadEffortRatio,

    avgDeveloperSalary: snapshot.avgDeveloperSalary,
    burdenFactor: snapshot.burdenFactor,
    effectiveWorkDaysPerMonth: snapshot.effectiveWorkDaysPerMonth,
    billableUtilization: snapshot.billableUtilization,
    supportRoleRatio: snapshot.supportRoleRatio,
    cogsPerManDayOverride: snapshot.cogsPerManDayOverride,

    platformMultipliers: { ...snapshot.platformMultipliers },
    deploymentMultipliers: { ...snapshot.deploymentMultipliers },
    userTierPricing: snapshot.userTierPricing.map((tier) => ({ ...tier })),
    setupFee: snapshot.setupFee,

    volumeDiscountTiers: snapshot.volumeDiscountTiers.map((tier) => ({ ...tier })),
    discountCountsCoreFeatures: snapshot.discountCountsCoreFeatures,

    rangeWidthCore: snapshot.rangeWidthCore,
    rangeWidthStandard: snapshot.rangeWidthStandard,
    rangeWidthConfigurable: snapshot.rangeWidthConfigurable,
    rangeWidthCustom: snapshot.rangeWidthCustom,

    parallelDevelopers: snapshot.parallelDevelopers,
    workDaysPerWeek: snapshot.workDaysPerWeek,
    fixedDurationWeeks: snapshot.fixedDurationWeeks,
    durationBufferFactor: snapshot.durationBufferFactor,

    quoteValidityDays: snapshot.quoteValidityDays,
  };
}

/** Pagar pengaman bawaan PRD 6.8. */
export function baselineGuardrailValues(): GuardrailFormValues {
  return {
    minProjectValue: BASELINE_PRICING_RULE.minProjectValue,
    maxCustomSharePct: BASELINE_PRICING_RULE.maxCustomSharePct,
    salesOverrideQuotaPct: BASELINE_PRICING_RULE.salesOverrideQuotaPct,
    minGrossMarginPct: BASELINE_PRICING_RULE.minGrossMarginPct,
    targetGrossMarginMin: BASELINE_PRICING_RULE.targetGrossMarginMin,
    targetGrossMarginMax: BASELINE_PRICING_RULE.targetGrossMarginMax,
    customManDayConsultThreshold: BASELINE_PRICING_RULE.customManDayConsultThreshold,
  };
}

/**
 * Menyusun snapshot mesin harga dari nilai form yang sedang diedit.
 *
 * Inilah yang membuat simulator dapat memperlihatkan dampak perubahan tarif
 * SEBELUM versinya dipublikasikan (M6).
 */
export function formValuesToSnapshot(
  values: PricingRuleFormValues,
  guardrails: GuardrailFormValues,
  meta: { id: string; version: number },
): PricingRuleSnapshot {
  return {
    id: meta.id,
    version: meta.version,
    label: values.label,

    referenceRatePerManDay: values.referenceRatePerManDay,
    multiplierStandard: values.multiplierStandard,
    multiplierConfigurable: values.multiplierConfigurable,
    multiplierCustom: values.multiplierCustom,
    corePackagePrice: values.corePackagePrice,

    effortRatioCore: values.effortRatioCore,
    effortRatioStandard: values.effortRatioStandard,
    effortRatioConfigurable: values.effortRatioConfigurable,
    effortRatioCustom: values.effortRatioCustom,
    corePackageManDay: values.corePackageManDay,
    setupEffortManDay: values.setupEffortManDay,
    overheadEffortRatio: values.overheadEffortRatio,

    avgDeveloperSalary: values.avgDeveloperSalary,
    burdenFactor: values.burdenFactor,
    effectiveWorkDaysPerMonth: values.effectiveWorkDaysPerMonth,
    billableUtilization: values.billableUtilization,
    supportRoleRatio: values.supportRoleRatio,
    cogsPerManDayOverride: values.cogsPerManDayOverride,

    platformMultipliers: values.platformMultipliers,
    deploymentMultipliers: values.deploymentMultipliers,
    userTierPricing: values.userTierPricing,
    setupFee: values.setupFee,

    volumeDiscountTiers: values.volumeDiscountTiers,
    discountCountsCoreFeatures: values.discountCountsCoreFeatures,

    minProjectValue: guardrails.minProjectValue,
    maxCustomSharePct: guardrails.maxCustomSharePct,
    salesOverrideQuotaPct: guardrails.salesOverrideQuotaPct,
    minGrossMarginPct: guardrails.minGrossMarginPct,
    targetGrossMarginMin: guardrails.targetGrossMarginMin,
    targetGrossMarginMax: guardrails.targetGrossMarginMax,
    customManDayConsultThreshold: guardrails.customManDayConsultThreshold,

    rangeWidthCore: values.rangeWidthCore,
    rangeWidthStandard: values.rangeWidthStandard,
    rangeWidthConfigurable: values.rangeWidthConfigurable,
    rangeWidthCustom: values.rangeWidthCustom,

    parallelDevelopers: values.parallelDevelopers,
    workDaysPerWeek: values.workDaysPerWeek,
    fixedDurationWeeks: values.fixedDurationWeeks,
    durationBufferFactor: values.durationBufferFactor,

    quoteValidityDays: values.quoteValidityDays,
  };
}
