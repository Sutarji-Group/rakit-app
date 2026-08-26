/**
 * Kontrak data katalog untuk seeding.
 *
 * Satu berkas per kategori aplikasi (WMS, CRM, POS, …). Bentuk data sengaja
 * memakai slug, bukan id, agar katalog dapat ditulis dan direview seperti
 * dokumen — dan agar impor/ekspor CSV (L6) memetakan langsung ke struktur ini.
 */

import type {
  DependencyKind,
  FeatureType,
  WizardInputType,
} from '@/lib/domain/enums';

export interface SeedFeature {
  slug: string;
  /** Nama dalam bahasa manfaat operasional (Prinsip Produk #4). */
  name: string;
  /** 1–2 kalimat yang dapat dipahami orang non-teknis (C2.2). */
  clientDescription: string;
  /** Catatan teknis internal — tidak pernah tampil ke klien. */
  internalDescription?: string;
  type: FeatureType;
  /** Man-day referensi: effort seandainya dibangun dari nol (BR-18). */
  manDayMin: number;
  manDayMax: number;
  /** Fitur yang wajib ada agar aplikasi berjalan utuh (C3.5). */
  isEssential?: boolean;
  keywords?: string[];
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface SeedFeatureGroup {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  features: SeedFeature[];
}

export interface SeedDependency {
  /** Slug fitur sumber. */
  feature: string;
  /** Slug fitur tujuan. */
  target: string;
  kind: DependencyKind;
  /** Kalimat penjelas yang ditampilkan ke klien saat aturan ini berjalan. */
  note?: string;
}

export interface SeedPreset {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  isDefault?: boolean;
  /** Slug fitur yang tercentang sebagai titik awal. */
  features: string[];
}

export interface SeedWizardOption {
  slug: string;
  label: string;
  description?: string;
  icon?: string;
  suggestPresetSlug?: string;
  /** Pemetaan jawaban → fitur beserta alasannya (B3, B4). */
  maps: Array<{ feature: string; reason: string }>;
}

export interface SeedWizardQuestion {
  slug: string;
  question: string;
  helpText?: string;
  inputType: WizardInputType;
  options: SeedWizardOption[];
}

export interface CatalogDefinition {
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  accent: string;
  tagline: string;
  description: string;
  longDescription: string;
  benefits: string[];
  painPoints: Array<{ title: string; body: string }>;
  minViableFeatureCount: number;
  seoTitle: string;
  seoDescription: string;
  groups: SeedFeatureGroup[];
  dependencies: SeedDependency[];
  presets: SeedPreset[];
  wizard: SeedWizardQuestion[];
}
