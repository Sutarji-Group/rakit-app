/**
 * Helper murni bersama untuk modul admin katalog (PRD bagian 8, modul L).
 *
 * Berkas ini sengaja tidak memakai 'server-only' maupun 'use client': halaman
 * (Server Component) dan formnya (Client Component) harus memakai perhitungan
 * yang persis sama, supaya angka yang dilihat admin saat mengetik identik
 * dengan yang divalidasi ulang server sebelum menyimpan.
 */

import type { BadgeVariant } from '@/components/ui';
import { resolveAdd, type DependencyGraph } from '@/lib/configurator/dependency';
import type { FeatureType, MediaKind, PublishStatus } from '@/lib/domain/enums';
import { priceMultiplierFor, type PricingRuleSnapshot } from '@/lib/pricing';

// ---------------------------------------------------------------------------
// Hasil aksi
// ---------------------------------------------------------------------------

/**
 * Bentuk balasan seragam untuk seluruh Server Action modul ini.
 *
 * Penolakan (mis. pelanggaran BR-05 atau dependensi melingkar) dikembalikan
 * sebagai data biasa, bukan exception, agar form dapat menempelkan pesannya
 * di kolom yang tepat tanpa kehilangan isian yang sudah diketik admin.
 */
export interface CatalogActionResult {
  ok: boolean;
  message: string;
  /** Peringatan yang tidak menggagalkan penyimpanan (mis. prasyarat preset). */
  warnings?: string[];
  /** Pesan error per nama kolom form. */
  fieldErrors?: Record<string, string>;
  /** Id entitas yang baru dibuat, agar form dapat berpindah halaman. */
  createdId?: string;
}

export function actionOk(
  message: string,
  extra: Omit<CatalogActionResult, 'ok' | 'message'> = {},
): CatalogActionResult {
  return { ok: true, message, ...extra };
}

export function actionFail(
  message: string,
  fieldErrors?: Record<string, string>,
): CatalogActionResult {
  return { ok: false, message, fieldErrors };
}

// ---------------------------------------------------------------------------
// Status terbit
// ---------------------------------------------------------------------------

export const PUBLISH_STATUS_VARIANT: Record<PublishStatus, BadgeVariant> = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'neutral',
};

// ---------------------------------------------------------------------------
// Kesegaran katalog (risiko R8 — katalog usang)
// ---------------------------------------------------------------------------

/**
 * Ambang usia tinjauan fitur. R8 menyebut katalog yang tidak pernah ditinjau
 * ulang perlahan menyimpang dari kenyataan tim, sehingga fitur yang lewat
 * ambang ini ditandai di daftar agar admin tahu mana yang harus dikalibrasi.
 */
export const REVIEW_STALE_DAYS = 180;

const DAY_MS = 86_400_000;

/** Usia tinjauan dalam hari; null bila fitur belum pernah ditinjau. */
export function reviewAgeDays(lastReviewedAt: Date | string | null | undefined): number | null {
  if (!lastReviewedAt) return null;
  const value = typeof lastReviewedAt === 'string' ? new Date(lastReviewedAt) : lastReviewedAt;
  if (Number.isNaN(value.getTime())) return null;
  return Math.floor((Date.now() - value.getTime()) / DAY_MS);
}

/** Fitur yang belum pernah ditinjau ikut dianggap usang — itu justru kasus terburuk. */
export function isReviewStale(lastReviewedAt: Date | string | null | undefined): boolean {
  const age = reviewAgeDays(lastReviewedAt);
  return age === null || age >= REVIEW_STALE_DAYS;
}

export function reviewStaleLabel(lastReviewedAt: Date | string | null | undefined): string {
  const age = reviewAgeDays(lastReviewedAt);
  if (age === null) return 'Belum pernah ditinjau';
  return `Ditinjau ${age} hari lalu`;
}

// ---------------------------------------------------------------------------
// Harga jual turunan
// ---------------------------------------------------------------------------

export interface DerivedFeaturePrice {
  min: number;
  max: number;
  /** Fitur Core dijual sebagai paket dasar bertarif tetap, bukan per fitur (6.3). */
  includedInBasePackage: boolean;
}

/**
 * Harga jual turunan satu fitur: man-day × tarif referensi × pengali tipe.
 *
 * Rumus mengikuti langkah pertama computePrice() (PRD 6.4) sehingga admin
 * melihat dampak angka man-day yang diketiknya memakai aritmetika yang sama
 * dengan yang nanti dipakai konfigurator.
 */
export function deriveFeatureSellPrice(
  rule: PricingRuleSnapshot,
  type: FeatureType,
  manDayMin: number,
  manDayMax: number,
): DerivedFeaturePrice {
  const multiplier = priceMultiplierFor(rule, type);
  return {
    min: Math.round(manDayMin * rule.referenceRatePerManDay * multiplier),
    max: Math.round(manDayMax * rule.referenceRatePerManDay * multiplier),
    includedInBasePackage: type === 'CORE',
  };
}

// ---------------------------------------------------------------------------
// Dependensi
// ---------------------------------------------------------------------------

/**
 * Fitur yang bergantung pada satu fitur, secara transitif (arah terbalik).
 *
 * Arah inilah yang menentukan dampak cascade saat fitur dihapus atau
 * diarsipkan (C3.4), jadi editor dependensi wajib menampilkannya — bukan
 * hanya prasyarat yang dibutuhkan fitur tersebut.
 */
export function collectTransitiveDependents(
  graph: DependencyGraph,
  featureId: string,
): string[] {
  const found: string[] = [];
  const seen = new Set<string>([featureId]);
  const queue = [featureId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of graph.requiredBy.get(current) ?? []) {
      if (seen.has(dependent)) continue;
      seen.add(dependent);
      found.push(dependent);
      queue.push(dependent);
    }
  }

  return found;
}

export interface MissingPrerequisite {
  featureId: string;
  featureName: string;
  /** Fitur di dalam preset yang membutuhkannya. */
  requiredBy: string;
  requiredByName: string;
  reason: string;
}

export interface PresetConflict {
  featureId: string;
  featureName: string;
  conflictsWithName: string;
  reason: string;
}

export interface PresetIntegrity {
  missing: MissingPrerequisite[];
  conflicts: PresetConflict[];
}

/**
 * Memeriksa keutuhan daftar fitur sebuah preset (L4).
 *
 * Preset yang menyimpan fitur tanpa prasyaratnya akan "membengkak sendiri" di
 * konfigurator karena mesin dependensi menambahkannya otomatis — klien lalu
 * melihat harga yang berbeda dari yang dijanjikan kartu preset. Karena itu
 * perhitungan memakai resolveAdd, mesin yang sama dengan konfigurator.
 */
export function inspectPresetSelection(
  graph: DependencyGraph,
  selectedIds: Iterable<string>,
): PresetIntegrity {
  const selected = new Set(selectedIds);
  const missing = new Map<string, MissingPrerequisite>();
  const conflicts = new Map<string, PresetConflict>();

  for (const id of selected) {
    const result = resolveAdd(graph, selected, id);
    for (const added of result.added) {
      if (selected.has(added.featureId) || missing.has(added.featureId)) continue;
      missing.set(added.featureId, {
        featureId: added.featureId,
        featureName: added.featureName,
        requiredBy: added.triggeredBy,
        requiredByName: added.triggeredByName,
        reason: added.reason,
      });
    }
    for (const removed of result.removed) {
      if (conflicts.has(removed.featureId)) continue;
      conflicts.set(removed.featureId, {
        featureId: removed.featureId,
        featureName: removed.featureName,
        conflictsWithName: removed.conflictsWithName,
        reason: removed.reason,
      });
    }
  }

  return { missing: [...missing.values()], conflicts: [...conflicts.values()] };
}

// ---------------------------------------------------------------------------
// Bentuk data form fitur
// ---------------------------------------------------------------------------

export interface FeatureMediaValues {
  id?: string;
  kind: MediaKind;
  url: string;
  caption: string;
}

export interface FeatureFormValues {
  id?: string;
  groupId: string;
  slug: string;
  name: string;
  clientDescription: string;
  internalDescription: string;
  type: FeatureType;
  manDayMin: string;
  manDayMax: string;
  effortRatioOverride: string;
  isEssential: boolean;
  keywords: string;
  status: PublishStatus;
  sortOrder: string;
  seoTitle: string;
  seoDescription: string;
  media: FeatureMediaValues[];
}

/** Kata kunci disimpan sebagai JSON string[]; admin mengetiknya dipisah koma. */
export function splitKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// ---------------------------------------------------------------------------
// Bentuk masukan Server Action
// ---------------------------------------------------------------------------
//
// Tipe masukan aksi tinggal di sini, bukan di berkas 'use server', karena
// berkas Server Action hanya boleh mengekspor fungsi async.

export interface CategoryInput {
  id?: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  longDescription: string;
  benefits: string[];
  sortOrder: number;
  status: string;
  minViableFeatureCount: number;
  seoTitle: string;
  seoDescription: string;
}

export interface GroupInput {
  id?: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface FeatureMediaInput {
  kind: string;
  url: string;
  caption: string;
}

export interface FeatureInput {
  id?: string;
  categoryId: string;
  groupId: string;
  slug: string;
  name: string;
  clientDescription: string;
  internalDescription: string;
  type: string;
  manDayMin: number;
  manDayMax: number;
  effortRatioOverride: number | null;
  isEssential: boolean;
  keywords: string[];
  status: string;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  /** Menandai fitur baru saja dikalibrasi ulang (R8). */
  markReviewed: boolean;
  media: FeatureMediaInput[];
}

export interface DependencyInput {
  featureId: string;
  targetFeatureId: string;
  kind: string;
  note: string;
}

export interface PresetInput {
  id?: string;
  categoryId: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  sortOrder: number;
  isDefault: boolean;
  status: string;
  featureIds: string[];
}

export interface WizardQuestionInput {
  id?: string;
  categoryId: string;
  slug: string;
  question: string;
  helpText: string;
  inputType: string;
  sortOrder: number;
  isActive: boolean;
}

export interface WizardOptionInput {
  id?: string;
  questionId: string;
  slug: string;
  label: string;
  description: string;
  icon: string;
  sortOrder: number;
  suggestPresetSlug: string;
}

export interface WizardMappingInput {
  optionId: string;
  featureId: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Kolom CSV impor/ekspor (L6)
// ---------------------------------------------------------------------------

export const CATALOG_CSV_COLUMNS = [
  'category_slug',
  'group_slug',
  'feature_slug',
  'name',
  'client_description',
  'type',
  'manday_min',
  'manday_max',
  'is_essential',
  'status',
] as const;

export type CatalogCsvColumn = (typeof CATALOG_CSV_COLUMNS)[number];

export const CSV_ROW_STATUSES = ['NEW', 'CHANGED', 'UNCHANGED', 'INVALID'] as const;
export type CsvRowStatus = (typeof CSV_ROW_STATUSES)[number];

export const CSV_ROW_STATUS_LABEL: Record<CsvRowStatus, string> = {
  NEW: 'Baris baru',
  CHANGED: 'Diubah',
  UNCHANGED: 'Tidak berubah',
  INVALID: 'Bermasalah',
};

export const CSV_ROW_STATUS_VARIANT: Record<CsvRowStatus, BadgeVariant> = {
  NEW: 'info',
  CHANGED: 'warning',
  UNCHANGED: 'neutral',
  INVALID: 'danger',
};

export interface CsvPreviewRow {
  lineNumber: number;
  status: CsvRowStatus;
  categorySlug: string;
  groupSlug: string;
  featureSlug: string;
  name: string;
  /** Ringkasan perubahan per kolom, mis. "man-day maks 6 → 7". */
  changes: string[];
  /** Alasan baris ditolak. */
  problems: string[];
  /** Catatan tambahan, mis. kelompok baru yang akan ikut dibuat. */
  notes: string[];
}

export interface CsvPreview {
  rows: CsvPreviewRow[];
  counts: Record<CsvRowStatus, number>;
  /** Galat tingkat berkas (header salah, berkas kosong). */
  fatalError: string | null;
}

export function emptyCsvCounts(): Record<CsvRowStatus, number> {
  return { NEW: 0, CHANGED: 0, UNCHANGED: 0, INVALID: 0 };
}
