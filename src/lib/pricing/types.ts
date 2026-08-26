import type {
  AddOnKind,
  FeatureType,
  ProjectDeployment,
  ProjectPlatform,
  UserTier,
} from '@/lib/domain/enums';

/** Satu baris tabel diskon skala (PRD 6.6). */
export interface VolumeDiscountTier {
  minFeatures: number;
  /** null berarti tanpa batas atas. */
  maxFeatures: number | null;
  discountPct: number;
  label: string;
}

/** Biaya berulang bulanan menurut jumlah pengguna (PRD 6.5). */
export interface UserTierPrice {
  tier: UserTier;
  label: string;
  monthlyMin: number;
  monthlyMax: number;
}

/**
 * Potret aturan harga yang dipakai satu perhitungan.
 *
 * Objek ini sengaja berupa data murni (bukan record Prisma) agar mesin harga
 * dapat berjalan identik di server maupun di browser, dan agar konfigurasi
 * lama dapat dihitung ulang dengan aturan versi lamanya (BR-07, M8).
 */
export interface PricingRuleSnapshot {
  id: string;
  version: number;
  label: string;

  // Tarif & pengali (6.3)
  referenceRatePerManDay: number;
  multiplierStandard: number;
  multiplierConfigurable: number;
  multiplierCustom: number;
  corePackagePrice: number;

  // Rasio effort riil terhadap man-day referensi (6.3)
  effortRatioCore: number;
  effortRatioStandard: number;
  effortRatioConfigurable: number;
  effortRatioCustom: number;
  corePackageManDay: number;
  setupEffortManDay: number;
  overheadEffortRatio: number;

  // Biaya internal (6.2)
  avgDeveloperSalary: number;
  burdenFactor: number;
  effectiveWorkDaysPerMonth: number;
  billableUtilization: number;
  supportRoleRatio: number;
  cogsPerManDayOverride: number | null;

  // Pengali & biaya tingkat proyek (6.5)
  platformMultipliers: Record<ProjectPlatform, number>;
  deploymentMultipliers: Record<ProjectDeployment, number>;
  userTierPricing: UserTierPrice[];
  setupFee: number;

  // Diskon skala (6.6)
  volumeDiscountTiers: VolumeDiscountTier[];
  /** Ikut menghitung fitur Core sebagai dasar tier diskon (lihat skema). */
  discountCountsCoreFeatures: boolean;

  // Pagar pengaman (6.8)
  minProjectValue: number;
  maxCustomSharePct: number;
  salesOverrideQuotaPct: number;
  minGrossMarginPct: number;
  targetGrossMarginMin: number;
  targetGrossMarginMax: number;
  customManDayConsultThreshold: number;

  // Batas lebar rentang (6.1)
  rangeWidthCore: number;
  rangeWidthStandard: number;
  rangeWidthConfigurable: number;
  rangeWidthCustom: number;

  // Estimasi durasi
  parallelDevelopers: number;
  workDaysPerWeek: number;
  fixedDurationWeeks: number;
  durationBufferFactor: number;

  quoteValidityDays: number;
}

/** Fitur katalog yang masuk perhitungan. */
export interface PriceInputFeature {
  id: string;
  name: string;
  type: FeatureType;
  manDayMin: number;
  manDayMax: number;
  effortRatioOverride?: number | null;
  groupName?: string;
}

/** Fitur custom. Hanya ikut total bila sudah diestimasi manusia (BR-02). */
export interface PriceInputCustom {
  id: string;
  name: string;
  /** true bila tim sudah memberi estimasi man-day. */
  isEstimated: boolean;
  manDayMin?: number | null;
  manDayMax?: number | null;
}

export interface PriceInputAddOn {
  id: string;
  name: string;
  kind: AddOnKind;
  priceMin: number;
  priceMax: number;
  manDayMin: number;
  manDayMax: number;
  isRecurring: boolean;
}

export interface PriceInput {
  rule: PricingRuleSnapshot;
  features: PriceInputFeature[];
  customRequests?: PriceInputCustom[];
  addOns?: PriceInputAddOn[];
  platform: ProjectPlatform;
  deployment: ProjectDeployment;
  userTier: UserTier;
  /** Menyertakan biaya hosting/lisensi bulanan menurut jumlah pengguna. */
  includeUserTierRecurring?: boolean;
}

/** Indikator dampak harga bertingkat (C2.4): 1 = Rp, 2 = Rp Rp, 3 = Rp Rp Rp. */
export type PriceImpactLevel = 1 | 2 | 3;

export interface PriceLine {
  id: string;
  name: string;
  type: FeatureType;
  groupName?: string;
  manDayMin: number;
  manDayMax: number;
  priceMin: number;
  priceMax: number;
  effortManDayMin: number;
  effortManDayMax: number;
  impact: PriceImpactLevel;
  /** true untuk fitur Core yang sudah tercakup di paket dasar. */
  includedInBasePackage: boolean;
}

export interface AddOnLine {
  id: string;
  name: string;
  kind: AddOnKind;
  priceMin: number;
  priceMax: number;
  isRecurring: boolean;
}

export interface CogsAssumption {
  monthlyLoadedCost: number;
  billableDaysPerMonth: number;
  costPerBillableDay: number;
  supportLoadPerDay: number;
  cogsPerManDay: number;
  isOverridden: boolean;
}

/** Nilai internal — tidak pernah ditampilkan ke klien (PRD 6.4). */
export interface InternalEconomics {
  cogsPerManDay: number;
  realEffortManDayMin: number;
  realEffortManDayMax: number;
  cogsMin: number;
  cogsMax: number;
  /** Proyeksi COGS yang dipakai untuk pagar pengaman: skenario effort maksimum. */
  cogsProjection: number;
  /** Margin acuan: dikuotasi di maksimum, dikerjakan pada effort maksimum. */
  grossMarginPct: number;
  /** Skenario terbaik: dikuotasi di maksimum, dikerjakan pada effort minimum. */
  grossMarginBestPct: number;
  /** Skenario terburuk: dikuotasi di minimum, dikerjakan pada effort maksimum. */
  grossMarginWorstPct: number;
  grossProfit: number;
  assumption: CogsAssumption;
}

export interface GuardrailFlag {
  code:
    | 'BELOW_MIN_PROJECT_VALUE'
    | 'EXCEEDS_CUSTOM_SHARE'
    | 'BELOW_MIN_MARGIN'
    | 'PENDING_CUSTOM_ESTIMATE'
    | 'MARGIN_BELOW_TARGET';
  /** Menghalangi penerbitan penawaran otomatis. */
  blocking: boolean;
  /** Pesan untuk klien (bahasa ramah). Null bila hanya untuk internal. */
  clientMessage: string | null;
  /** Pesan untuk tim internal. */
  internalMessage: string;
}

export interface DurationEstimate {
  weeksMin: number;
  weeksMax: number;
  /** Fase pengerjaan untuk diagram timeline pada PDF (F4). */
  phases: Array<{ name: string; weeks: number; description: string }>;
}

export interface PriceBreakdown {
  ruleVersion: number;
  ruleId: string;

  lines: PriceLine[];
  coreFeatureCount: number;
  corePackagePrice: number;

  /** Jumlah fitur berbayar — fitur non-Core + fitur custom terestimasi. */
  paidFeatureCount: number;
  /** Angka yang benar-benar dipakai mencari tier diskon (lihat 6.6). */
  discountBasisCount: number;

  featuresSubtotalMin: number;
  featuresSubtotalMax: number;

  platformMultiplier: number;
  deploymentMultiplier: number;
  multipliedMin: number;
  multipliedMax: number;

  discountPct: number;
  discountLabel: string;
  discountMin: number;
  discountMax: number;

  addOnLines: AddOnLine[];
  addOnOneTimeMin: number;
  addOnOneTimeMax: number;
  recurringMonthlyMin: number;
  recurringMonthlyMax: number;
  recurringLines: AddOnLine[];

  setupFee: number;

  totalMin: number;
  totalMax: number;
  /** Nilai yang ditampilkan ke klien — dibulatkan ke jutaan terdekat (C4.1). */
  displayTotalMin: number;
  displayTotalMax: number;
  /** Rasio lebar rentang (maks ÷ min) — metrik kesehatan produk 4.3. */
  rangeWidthRatio: number;

  pendingCustomCount: number;
  estimatedCustomCount: number;
  customValueMin: number;
  customValueMax: number;
  customSharePct: number;

  duration: DurationEstimate;
  internal: InternalEconomics;
  guardrails: GuardrailFlag[];
  /** true bila penawaran boleh terbit otomatis (tanpa campur tangan manusia). */
  canAutoQuote: boolean;
}
