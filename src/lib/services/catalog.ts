import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { parseJson, parseStringArray } from '@/lib/db/json';
import {
  coerceEnum,
  DEPENDENCY_KINDS,
  FEATURE_TYPES,
  type DependencyKind,
  type FeatureType,
} from '@/lib/domain/enums';
import type { DependencyEdge, DependencyFeature } from '@/lib/configurator/dependency';

export interface FeatureDTO {
  id: string;
  slug: string;
  name: string;
  clientDescription: string;
  type: FeatureType;
  groupId: string;
  manDayMin: number;
  manDayMax: number;
  effortRatioOverride: number | null;
  isEssential: boolean;
  keywords: string[];
  media: Array<{ id: string; kind: string; url: string; caption: string | null }>;
}

export interface FeatureGroupDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  features: FeatureDTO[];
}

export interface PresetDTO {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  isDefault: boolean;
  featureIds: string[];
}

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  accent: string;
  tagline: string;
  description: string;
  longDescription: string | null;
  benefits: string[];
  painPoints: Array<{ title: string; body: string }>;
  minViableFeatureCount: number;
  featureCount: number;
  typicalPriceMin: number | null;
  typicalPriceMax: number | null;
  typicalDurationWeeksMin: number | null;
  typicalDurationWeeksMax: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface CatalogBundle {
  category: CategoryDTO;
  groups: FeatureGroupDTO[];
  dependencies: DependencyEdge[];
  presets: PresetDTO[];
}

function mapCategory(
  row: {
    id: string; slug: string; name: string; shortName: string; icon: string; accent: string;
    tagline: string; description: string; longDescription: string | null; benefits: string;
    painPoints: string; minViableFeatureCount: number; typicalPriceMin: number | null;
    typicalPriceMax: number | null; typicalDurationWeeksMin: number | null;
    typicalDurationWeeksMax: number | null; seoTitle: string | null; seoDescription: string | null;
  },
  featureCount: number,
): CategoryDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.shortName,
    icon: row.icon,
    accent: row.accent,
    tagline: row.tagline,
    description: row.description,
    longDescription: row.longDescription,
    benefits: parseStringArray(row.benefits),
    painPoints: parseJson<Array<{ title: string; body: string }>>(row.painPoints, []),
    minViableFeatureCount: row.minViableFeatureCount,
    featureCount,
    typicalPriceMin: row.typicalPriceMin,
    typicalPriceMax: row.typicalPriceMax,
    typicalDurationWeeksMin: row.typicalDurationWeeksMin,
    typicalDurationWeeksMax: row.typicalDurationWeeksMax,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

/** Daftar kategori terbit untuk landing & halaman katalog (A3). */
export async function listPublishedCategories(): Promise<CategoryDTO[]> {
  const rows = await prisma.applicationCategory.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { features: { where: { status: 'PUBLISHED' } } } },
    },
  });
  return rows.map((row) => mapCategory(row, row._count.features));
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDTO | null> {
  const row = await prisma.applicationCategory.findUnique({
    where: { slug },
    include: {
      _count: { select: { features: { where: { status: 'PUBLISHED' } } } },
    },
  });
  return row ? mapCategory(row, row._count.features) : null;
}

/**
 * Memuat seluruh katalog satu kategori: kelompok, fitur, dependensi, preset.
 *
 * Konfigurator memuat bundel ini sekali lalu menghitung ulang harga sepenuhnya
 * di klien, sehingga perubahan harga tampil jauh di bawah ambang 200 ms.
 */
export async function loadCatalogBundle(categoryId: string): Promise<CatalogBundle | null> {
  const category = await prisma.applicationCategory.findUnique({
    where: { id: categoryId },
    include: {
      _count: { select: { features: { where: { status: 'PUBLISHED' } } } },
      featureGroups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          features: {
            where: { status: 'PUBLISHED' },
            orderBy: { sortOrder: 'asc' },
            include: { media: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
      presets: {
        where: { status: 'PUBLISHED' },
        orderBy: { sortOrder: 'asc' },
        include: { presetFeatures: { select: { featureId: true } } },
      },
    },
  });

  if (!category) return null;

  const groups: FeatureGroupDTO[] = category.featureGroups.map((group) => ({
    id: group.id,
    slug: group.slug,
    name: group.name,
    description: group.description,
    icon: group.icon,
    features: group.features.map((feature) => ({
      id: feature.id,
      slug: feature.slug,
      name: feature.name,
      clientDescription: feature.clientDescription,
      type: coerceEnum(feature.type, FEATURE_TYPES, 'STANDARD'),
      groupId: feature.groupId,
      manDayMin: feature.manDayMin,
      manDayMax: feature.manDayMax,
      effortRatioOverride: feature.effortRatioOverride,
      isEssential: feature.isEssential,
      keywords: parseStringArray(feature.keywords),
      media: feature.media.map((m) => ({
        id: m.id,
        kind: m.kind,
        url: m.url,
        caption: m.caption,
      })),
    })),
  }));

  const featureIds = new Set(groups.flatMap((g) => g.features.map((f) => f.id)));

  const dependencyRows = await prisma.featureDependency.findMany({
    where: { featureId: { in: [...featureIds] } },
  });

  const dependencies: DependencyEdge[] = dependencyRows
    .filter((row) => featureIds.has(row.targetFeatureId))
    .map((row) => ({
      featureId: row.featureId,
      targetFeatureId: row.targetFeatureId,
      kind: coerceEnum<DependencyKind>(row.kind, DEPENDENCY_KINDS, 'REQUIRES'),
      note: row.note,
    }));

  const presets: PresetDTO[] = category.presets.map((preset) => ({
    id: preset.id,
    slug: preset.slug,
    name: preset.name,
    tagline: preset.tagline,
    description: preset.description,
    bestFor: parseStringArray(preset.bestFor),
    isDefault: preset.isDefault,
    featureIds: preset.presetFeatures
      .map((pf) => pf.featureId)
      .filter((id) => featureIds.has(id)),
  }));

  return {
    category: mapCategory(category, category._count.features),
    groups,
    dependencies,
    presets,
  };
}

/** Bentuk ringkas fitur untuk mesin dependensi. */
export function toDependencyFeatures(groups: FeatureGroupDTO[]): DependencyFeature[] {
  return groups.flatMap((group) =>
    group.features.map((feature) => ({
      id: feature.id,
      name: feature.name,
      type: feature.type,
      groupId: feature.groupId,
      isEssential: feature.isEssential,
    })),
  );
}

/** Indeks datar fitur berdasarkan id. */
export function indexFeatures(groups: FeatureGroupDTO[]): Map<string, FeatureDTO> {
  return new Map(groups.flatMap((g) => g.features.map((f) => [f.id, f] as const)));
}
