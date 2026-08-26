/**
 * Bentuk data tampilan untuk halaman katalog publik.
 *
 * Dipisahkan dari modul query karena komponen klien (wizard, pencarian fitur)
 * ikut memakai tipe ini, sementara modul query berisi `server-only`.
 */

import type { FeatureType, WizardInputType } from '@/lib/domain/enums';
import type { PriceImpactLevel } from '@/lib/pricing';

/** Ringkasan satu preset beserta harga hasil hitung mesin harga. */
export interface PresetSummary {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  isDefault: boolean;
  /** Jumlah fitur yang langsung tercentang, setelah aturan dependensi. */
  featureCount: number;
  priceMin: number;
  priceMax: number;
  durationWeeksMin: number;
  durationWeeksMax: number;
}

/** Satu fitur pada indeks & halaman fitur. */
export interface FeatureCardData {
  slug: string;
  name: string;
  clientDescription: string;
  type: FeatureType;
  groupName: string;
  keywords: string[];
  impact: PriceImpactLevel;
}

/** Kelompok fitur per kategori aplikasi untuk indeks /fitur. */
export interface FeatureIndexCategory {
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  tagline: string;
  features: FeatureCardData[];
}

/** Fitur terkait pada halaman detail fitur: prasyarat, saran, atau setetangga. */
export interface RelatedFeatureView {
  slug: string;
  name: string;
  type: FeatureType;
  /** Penjelasan aturan untuk klien (FeatureDependency.note), bila ada. */
  note: string | null;
}

/**
 * Isi satu halaman fitur (/fitur/[categorySlug]/[featureSlug]).
 *
 * Halaman ini dibuat untuk pencarian organik — orang mencari pekerjaannya
 * ("aplikasi stock opname"), bukan nama produk kami. Karena itu isinya
 * lengkap dan berdiri sendiri, bukan sekadar potongan katalog.
 */
export interface FeatureDetailView {
  category: {
    slug: string;
    name: string;
    shortName: string;
    icon: string;
    tagline: string;
  };
  group: {
    name: string;
    description: string | null;
    icon: string;
  };
  feature: FeatureCardData & {
    seoTitle: string | null;
    seoDescription: string | null;
  };
  /** Fitur yang wajib ikut bila fitur ini dipilih (dependensi REQUIRES). */
  requires: RelatedFeatureView[];
  /** Fitur yang biasanya dipasang bersama (dependensi RECOMMENDS). */
  recommends: RelatedFeatureView[];
  /** Fitur lain di kelompok yang sama, untuk penjelajahan lanjutan. */
  siblings: RelatedFeatureView[];
}

/** Fitur yang direkomendasikan satu jawaban wizard, beserta alasannya (B4). */
export interface WizardFeatureView {
  id: string;
  slug: string;
  name: string;
  type: FeatureType;
  groupName: string;
  /** Kalimat "Direkomendasikan karena …" dari WizardOptionFeature.reason. */
  reason: string;
}

export interface WizardOptionView {
  slug: string;
  label: string;
  description: string | null;
  icon: string;
  suggestPresetSlug: string | null;
  features: WizardFeatureView[];
}

export interface WizardQuestionView {
  slug: string;
  question: string;
  helpText: string | null;
  inputType: WizardInputType;
  options: WizardOptionView[];
}

/** Preset yang boleh dipilih wizard sebagai titik awal rakitan. */
export interface WizardPresetView {
  slug: string;
  name: string;
  featureCount: number;
  isDefault: boolean;
  /** Urutan katalog: makin besar, makin lengkap paketnya. */
  rank: number;
}
