/**
 * Bentuk data yang dipertukarkan antara form admin mesin harga dan Server
 * Action-nya.
 *
 * Tipe ini sengaja terpisah dari berkas 'use server' karena berkas Server
 * Action hanya boleh mengekspor fungsi async, dan terpisah pula dari
 * PricingRuleSnapshot karena form menyimpan nilai mentah yang belum tentu
 * valid (pengguna masih mengetik).
 */

import type {
  ProjectDeployment,
  ProjectPlatform,
  AddOnKind,
  FeatureType,
} from '@/lib/domain/enums';
import type {
  PricingRuleSnapshot,
  PriceInputAddOn,
  UserTierPrice,
  VolumeDiscountTier,
} from '@/lib/pricing';

// ---------------------------------------------------------------------------
// Form aturan harga (M1–M4, M8)
// ---------------------------------------------------------------------------

/**
 * Nilai satu versi aturan harga di dalam form.
 *
 * Pagar pengaman 6.8 sengaja TIDAK ada di sini: PRD memperlakukannya sebagai
 * kebijakan komersial tersendiri (M7), sehingga disimpan lewat form dan Server
 * Action terpisah agar jejak auditnya juga terpisah.
 */
export interface PricingRuleFormValues {
  label: string;
  notes: string;

  // -- Tarif & pengali (M1, M2) --------------------------------------------
  referenceRatePerManDay: number;
  multiplierStandard: number;
  multiplierConfigurable: number;
  multiplierCustom: number;
  corePackagePrice: number;

  // -- Rasio effort riil (6.3) ---------------------------------------------
  effortRatioCore: number;
  effortRatioStandard: number;
  effortRatioConfigurable: number;
  effortRatioCustom: number;
  corePackageManDay: number;
  setupEffortManDay: number;
  overheadEffortRatio: number;

  // -- Asumsi biaya internal (M3, PRD 6.2) ---------------------------------
  avgDeveloperSalary: number;
  burdenFactor: number;
  effectiveWorkDaysPerMonth: number;
  billableUtilization: number;
  supportRoleRatio: number;
  cogsPerManDayOverride: number | null;

  // -- Pengali & biaya tingkat proyek (M4, PRD 6.5) ------------------------
  platformMultipliers: Record<ProjectPlatform, number>;
  deploymentMultipliers: Record<ProjectDeployment, number>;
  userTierPricing: UserTierPrice[];
  setupFee: number;

  // -- Diskon skala (M4, PRD 6.6) ------------------------------------------
  volumeDiscountTiers: VolumeDiscountTier[];
  discountCountsCoreFeatures: boolean;

  // -- Batas lebar rentang (BR-05) -----------------------------------------
  rangeWidthCore: number;
  rangeWidthStandard: number;
  rangeWidthConfigurable: number;
  rangeWidthCustom: number;

  // -- Estimasi durasi ------------------------------------------------------
  parallelDevelopers: number;
  workDaysPerWeek: number;
  fixedDurationWeeks: number;
  durationBufferFactor: number;

  quoteValidityDays: number;
}

/** Pagar pengaman komersial PRD 6.8 (M7). */
export interface GuardrailFormValues {
  minProjectValue: number;
  maxCustomSharePct: number;
  salesOverrideQuotaPct: number;
  minGrossMarginPct: number;
  targetGrossMarginMin: number;
  targetGrossMarginMax: number;
  customManDayConsultThreshold: number;
}

/** Hasil Server Action yang dibaca form untuk menampilkan toast. */
export interface ActionResult {
  ok: boolean;
  message: string;
  /** Terisi bila aksi menghasilkan atau menyentuh satu versi aturan. */
  ruleId?: string;
  /**
   * true bila penyimpanan dialihkan menjadi versi baru karena versi lama sudah
   * terpakai konfigurasi terbit (BR-07 / M8).
   */
  forked?: boolean;
}

// ---------------------------------------------------------------------------
// Form add-on (M5)
// ---------------------------------------------------------------------------

export interface AddOnFormValues {
  id: string | null;
  slug: string;
  kind: AddOnKind;
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
  manDayMin: number;
  manDayMax: number;
  isRecurring: boolean;
  optionGroup: string;
  sortOrder: number;
  isActive: boolean;
  isGlobal: boolean;
}

/** Baris add-on sebagaimana ditampilkan di tabel admin. */
export interface AddOnRow extends AddOnFormValues {
  id: string;
  usageCount: number;
}

// ---------------------------------------------------------------------------
// Simulator (M6)
// ---------------------------------------------------------------------------

export interface SimulatorFeature {
  id: string;
  name: string;
  type: FeatureType;
  manDayMin: number;
  manDayMax: number;
  effortRatioOverride: number | null;
  groupName: string;
  isEssential: boolean;
}

export interface SimulatorGroup {
  id: string;
  name: string;
  features: SimulatorFeature[];
}

export interface SimulatorPreset {
  id: string;
  name: string;
  tagline: string;
  featureIds: string[];
}

export interface SimulatorCategory {
  id: string;
  name: string;
  shortName: string;
  minViableFeatureCount: number;
  groups: SimulatorGroup[];
  presets: SimulatorPreset[];
}

export interface SimulatorAddOn extends PriceInputAddOn {
  description: string;
  /** null berarti tersedia untuk semua kategori. */
  categoryIds: string[] | null;
}

/** Satu versi aturan yang dapat dipilih sebagai pembanding di simulator. */
export interface SimulatorRuleOption {
  id: string;
  version: number;
  label: string;
  isActive: boolean;
  snapshot: PricingRuleSnapshot;
}
