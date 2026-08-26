import type { PricingRule } from '@/generated/prisma';
import { parseJson } from '@/lib/db/json';
import type { ProjectDeployment, ProjectPlatform } from '@/lib/domain/enums';
import {
  DEFAULT_DEPLOYMENT_MULTIPLIERS,
  DEFAULT_PLATFORM_MULTIPLIERS,
  DEFAULT_USER_TIER_PRICING,
  DEFAULT_VOLUME_DISCOUNT_TIERS,
} from './defaults';
import type { PricingRuleSnapshot, UserTierPrice, VolumeDiscountTier } from './types';

/**
 * Mengubah record PricingRule dari database menjadi snapshot data murni yang
 * dapat dikirim ke browser dan dipakai mesin harga.
 */
export function toPricingRuleSnapshot(rule: PricingRule): PricingRuleSnapshot {
  return {
    id: rule.id,
    version: rule.version,
    label: rule.label,

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
    userTierPricing: parseJson<UserTierPrice[]>(
      rule.userTierPricing,
      DEFAULT_USER_TIER_PRICING,
    ),
    setupFee: rule.setupFee,

    volumeDiscountTiers: parseJson<VolumeDiscountTier[]>(
      rule.volumeDiscountTiers,
      DEFAULT_VOLUME_DISCOUNT_TIERS,
    ),
    discountCountsCoreFeatures: rule.discountCountsCoreFeatures,

    minProjectValue: rule.minProjectValue,
    maxCustomSharePct: rule.maxCustomSharePct,
    salesOverrideQuotaPct: rule.salesOverrideQuotaPct,
    minGrossMarginPct: rule.minGrossMarginPct,
    targetGrossMarginMin: rule.targetGrossMarginMin,
    targetGrossMarginMax: rule.targetGrossMarginMax,
    customManDayConsultThreshold: rule.customManDayConsultThreshold,

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

/**
 * Snapshot aturan harga bawaan — dipakai oleh seed, simulator, dan pengujian
 * sehingga mesin harga bisa dijalankan tanpa database.
 * Nilai mengikuti PRD 6.2, 6.3, 6.5, 6.6, dan 6.8.
 */
export const BASELINE_PRICING_RULE: PricingRuleSnapshot = {
  id: 'baseline',
  version: 1,
  label: 'Kalibrasi awal — PRD v1.1',

  referenceRatePerManDay: 3_200_000,
  multiplierStandard: 0.55,
  multiplierConfigurable: 1.0,
  multiplierCustom: 1.5,
  corePackagePrice: 25_000_000,

  effortRatioCore: 0.15,
  effortRatioStandard: 0.25,
  effortRatioConfigurable: 0.8,
  effortRatioCustom: 1.1,
  corePackageManDay: 2,
  setupEffortManDay: 4.5,
  overheadEffortRatio: 0.12,

  avgDeveloperSalary: 12_000_000,
  burdenFactor: 1.35,
  effectiveWorkDaysPerMonth: 19.4,
  billableUtilization: 0.65,
  supportRoleRatio: 0.45,
  cogsPerManDayOverride: null,

  platformMultipliers: DEFAULT_PLATFORM_MULTIPLIERS,
  deploymentMultipliers: DEFAULT_DEPLOYMENT_MULTIPLIERS,
  userTierPricing: DEFAULT_USER_TIER_PRICING,
  setupFee: 10_000_000,

  volumeDiscountTiers: DEFAULT_VOLUME_DISCOUNT_TIERS,
  discountCountsCoreFeatures: false,

  minProjectValue: 35_000_000,
  maxCustomSharePct: 0.4,
  salesOverrideQuotaPct: 0.1,
  minGrossMarginPct: 0.4,
  targetGrossMarginMin: 0.5,
  targetGrossMarginMax: 0.55,
  customManDayConsultThreshold: 20,

  rangeWidthCore: 1.15,
  rangeWidthStandard: 1.3,
  rangeWidthConfigurable: 1.8,
  rangeWidthCustom: 2.0,

  parallelDevelopers: 2.5,
  workDaysPerWeek: 5,
  fixedDurationWeeks: 2,
  durationBufferFactor: 1.25,

  quoteValidityDays: 30,
};
