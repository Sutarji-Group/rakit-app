import 'server-only';

import { notFound } from 'next/navigation';
import { parseJson, parseStringArray } from '@/lib/db/json';
import { prisma } from '@/lib/db/prisma';
import {
  CATALOG_FEATURE_TYPES,
  DEPENDENCY_KINDS,
  FEATURE_TYPES,
  MEDIA_KINDS,
  PUBLISH_STATUSES,
  WIZARD_INPUT_TYPES,
  coerceEnum,
  type DependencyKind,
  type FeatureType,
  type MediaKind,
  type PublishStatus,
  type WizardInputType,
} from '@/lib/domain/enums';
import { REVIEW_STALE_DAYS } from '@/components/admin/catalog/shared';

/** Ambang tanggal untuk menandai fitur yang lama tidak ditinjau (R8). */
export function staleReviewThreshold(): Date {
  return new Date(Date.now() - REVIEW_STALE_DAYS * 86_400_000);
}

// ---------------------------------------------------------------------------
// Daftar kategori (L1)
// ---------------------------------------------------------------------------

export interface CategoryOverviewRow {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  status: PublishStatus;
  sortOrder: number;
  minViableFeatureCount: number;
  groupCount: number;
  presetCount: number;
  wizardQuestionCount: number;
  featureTotal: number;
  featurePublished: number;
  featureDraft: number;
  featureArchived: number;
  staleCount: number;
}

export async function listCategoryOverview(): Promise<CategoryOverviewRow[]> {
  const threshold = staleReviewThreshold();

  const [categories, statusGroups, staleGroups] = await Promise.all([
    prisma.applicationCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { featureGroups: true, presets: true, wizardQuestions: true } },
      },
    }),
    prisma.feature.groupBy({ by: ['categoryId', 'status'], _count: { _all: true } }),
    prisma.feature.groupBy({
      by: ['categoryId'],
      where: {
        status: { not: 'ARCHIVED' },
        OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: threshold } }],
      },
      _count: { _all: true },
    }),
  ]);

  const countOf = (categoryId: string, status: PublishStatus) =>
    statusGroups.find((row) => row.categoryId === categoryId && row.status === status)?._count
      ._all ?? 0;

  return categories.map((category) => {
    const published = countOf(category.id, 'PUBLISHED');
    const draft = countOf(category.id, 'DRAFT');
    const archived = countOf(category.id, 'ARCHIVED');
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      shortName: category.shortName,
      tagline: category.tagline,
      status: coerceEnum(category.status, PUBLISH_STATUSES, 'DRAFT'),
      sortOrder: category.sortOrder,
      minViableFeatureCount: category.minViableFeatureCount,
      groupCount: category._count.featureGroups,
      presetCount: category._count.presets,
      wizardQuestionCount: category._count.wizardQuestions,
      featureTotal: published + draft + archived,
      featurePublished: published,
      featureDraft: draft,
      featureArchived: archived,
      staleCount:
        staleGroups.find((row) => row.categoryId === category.id)?._count._all ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Satu kategori
// ---------------------------------------------------------------------------

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  accent: string;
  tagline: string;
  description: string;
  longDescription: string;
  benefits: string[];
  status: PublishStatus;
  sortOrder: number;
  minViableFeatureCount: number;
  seoTitle: string;
  seoDescription: string;
}

function toAdminCategory(row: {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  accent: string;
  tagline: string;
  description: string;
  longDescription: string | null;
  benefits: string;
  status: string;
  sortOrder: number;
  minViableFeatureCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
}): AdminCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.shortName,
    icon: row.icon,
    accent: row.accent,
    tagline: row.tagline,
    description: row.description,
    longDescription: row.longDescription ?? '',
    benefits: parseStringArray(row.benefits),
    status: coerceEnum(row.status, PUBLISH_STATUSES, 'DRAFT'),
    sortOrder: row.sortOrder,
    minViableFeatureCount: row.minViableFeatureCount,
    seoTitle: row.seoTitle ?? '',
    seoDescription: row.seoDescription ?? '',
  };
}

export async function getCategoryBySlugOrNotFound(slug: string): Promise<AdminCategory> {
  const row = await prisma.applicationCategory.findUnique({ where: { slug } });
  if (!row) notFound();
  return toAdminCategory(row);
}

/** Seluruh kategori beserta kolom yang dapat disunting form (L1). */
export async function listAdminCategories(): Promise<AdminCategory[]> {
  const rows = await prisma.applicationCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toAdminCategory);
}

export async function listAllCategoriesLite(): Promise<
  Array<{ id: string; slug: string; name: string; status: PublishStatus }>
> {
  const rows = await prisma.applicationCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, slug: true, name: true, status: true },
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: coerceEnum(row.status, PUBLISH_STATUSES, 'DRAFT'),
  }));
}

// ---------------------------------------------------------------------------
// Kelompok & fitur satu kategori (L2)
// ---------------------------------------------------------------------------

export interface AdminGroupRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  featureCount: number;
}

export interface AdminFeatureRow {
  id: string;
  slug: string;
  name: string;
  clientDescription: string;
  groupId: string;
  groupName: string;
  type: FeatureType;
  manDayMin: number;
  manDayMax: number;
  isEssential: boolean;
  status: PublishStatus;
  sortOrder: number;
  keywords: string[];
  mediaCount: number;
  /** Jumlah sisi keluar per jenis relasi. */
  requiresCount: number;
  conflictsCount: number;
  recommendsCount: number;
  /** Jumlah fitur yang membutuhkan fitur ini (arah terbalik). */
  dependentCount: number;
  lastReviewedAt: string | null;
  updatedAt: string;
}

export interface CategoryWorkspace {
  groups: AdminGroupRow[];
  features: AdminFeatureRow[];
}

export async function loadCategoryWorkspace(categoryId: string): Promise<CategoryWorkspace> {
  const [groups, features, dependencies] = await Promise.all([
    prisma.featureGroup.findMany({
      where: { categoryId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { features: true } } },
    }),
    prisma.feature.findMany({
      where: { categoryId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        group: { select: { name: true } },
        _count: { select: { media: true } },
      },
    }),
    prisma.featureDependency.findMany({
      where: { OR: [{ feature: { categoryId } }, { target: { categoryId } }] },
      select: { featureId: true, targetFeatureId: true, kind: true },
    }),
  ]);

  const outgoing = new Map<string, Record<DependencyKind, number>>();
  const dependents = new Map<string, number>();
  for (const edge of dependencies) {
    const kind = coerceEnum(edge.kind, DEPENDENCY_KINDS, 'REQUIRES');
    const bucket =
      outgoing.get(edge.featureId) ?? { REQUIRES: 0, CONFLICTS_WITH: 0, RECOMMENDS: 0 };
    bucket[kind] += 1;
    outgoing.set(edge.featureId, bucket);
    if (kind === 'REQUIRES') {
      dependents.set(edge.targetFeatureId, (dependents.get(edge.targetFeatureId) ?? 0) + 1);
    }
  }

  return {
    groups: groups.map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      description: group.description ?? '',
      icon: group.icon,
      sortOrder: group.sortOrder,
      featureCount: group._count.features,
    })),
    features: features.map((feature) => {
      const bucket =
        outgoing.get(feature.id) ?? { REQUIRES: 0, CONFLICTS_WITH: 0, RECOMMENDS: 0 };
      return {
        id: feature.id,
        slug: feature.slug,
        name: feature.name,
        clientDescription: feature.clientDescription,
        groupId: feature.groupId,
        groupName: feature.group.name,
        type: coerceEnum(feature.type, FEATURE_TYPES, 'STANDARD'),
        manDayMin: feature.manDayMin,
        manDayMax: feature.manDayMax,
        isEssential: feature.isEssential,
        status: coerceEnum(feature.status, PUBLISH_STATUSES, 'DRAFT'),
        sortOrder: feature.sortOrder,
        keywords: parseStringArray(feature.keywords),
        mediaCount: feature._count.media,
        requiresCount: bucket.REQUIRES,
        conflictsCount: bucket.CONFLICTS_WITH,
        recommendsCount: bucket.RECOMMENDS,
        dependentCount: dependents.get(feature.id) ?? 0,
        lastReviewedAt: feature.lastReviewedAt?.toISOString() ?? null,
        updatedAt: feature.updatedAt.toISOString(),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Satu fitur untuk form edit
// ---------------------------------------------------------------------------

export interface AdminFeatureDetail {
  id: string;
  categoryId: string;
  groupId: string;
  slug: string;
  name: string;
  clientDescription: string;
  internalDescription: string;
  type: FeatureType;
  manDayMin: number;
  manDayMax: number;
  effortRatioOverride: number | null;
  isEssential: boolean;
  keywords: string[];
  status: PublishStatus;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  promotedFromRequestId: string | null;
  lastReviewedAt: string | null;
  media: Array<{ id: string; kind: MediaKind; url: string; caption: string }>;
}

export async function getFeatureDetail(
  categoryId: string,
  featureId: string,
): Promise<AdminFeatureDetail> {
  const feature = await prisma.feature.findFirst({
    where: { id: featureId, categoryId },
    include: { media: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!feature) notFound();

  return {
    id: feature.id,
    categoryId: feature.categoryId,
    groupId: feature.groupId,
    slug: feature.slug,
    name: feature.name,
    clientDescription: feature.clientDescription,
    internalDescription: feature.internalDescription ?? '',
    type: coerceEnum(feature.type, CATALOG_FEATURE_TYPES, 'STANDARD'),
    manDayMin: feature.manDayMin,
    manDayMax: feature.manDayMax,
    effortRatioOverride: feature.effortRatioOverride,
    isEssential: feature.isEssential,
    keywords: parseStringArray(feature.keywords),
    status: coerceEnum(feature.status, PUBLISH_STATUSES, 'DRAFT'),
    sortOrder: feature.sortOrder,
    seoTitle: feature.seoTitle ?? '',
    seoDescription: feature.seoDescription ?? '',
    promotedFromRequestId: feature.promotedFromRequestId,
    lastReviewedAt: feature.lastReviewedAt?.toISOString() ?? null,
    media: feature.media.map((item) => ({
      id: item.id,
      kind: coerceEnum(item.kind, MEDIA_KINDS, 'IMAGE'),
      url: item.url,
      caption: item.caption ?? '',
    })),
  };
}

// ---------------------------------------------------------------------------
// Editor dependensi (L3)
// ---------------------------------------------------------------------------

export interface DependencyFeatureRow {
  id: string;
  name: string;
  slug: string;
  type: FeatureType;
  groupId: string;
  groupName: string;
  isEssential: boolean;
  status: PublishStatus;
}

export interface DependencyEdgeRow {
  id: string;
  featureId: string;
  targetFeatureId: string;
  kind: DependencyKind;
  note: string;
}

export interface DependencyWorkspace {
  features: DependencyFeatureRow[];
  edges: DependencyEdgeRow[];
}

export async function loadDependencyWorkspace(
  categoryId: string,
): Promise<DependencyWorkspace> {
  const features = await prisma.feature.findMany({
    where: { categoryId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { group: { select: { name: true } } },
  });

  const ids = features.map((feature) => feature.id);
  const edges = ids.length
    ? await prisma.featureDependency.findMany({
        where: { featureId: { in: ids } },
        orderBy: { kind: 'asc' },
      })
    : [];

  return {
    features: features.map((feature) => ({
      id: feature.id,
      name: feature.name,
      slug: feature.slug,
      type: coerceEnum(feature.type, FEATURE_TYPES, 'STANDARD'),
      groupId: feature.groupId,
      groupName: feature.group.name,
      isEssential: feature.isEssential,
      status: coerceEnum(feature.status, PUBLISH_STATUSES, 'DRAFT'),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      featureId: edge.featureId,
      targetFeatureId: edge.targetFeatureId,
      kind: coerceEnum(edge.kind, DEPENDENCY_KINDS, 'REQUIRES'),
      note: edge.note ?? '',
    })),
  };
}

// ---------------------------------------------------------------------------
// Preset (L4)
// ---------------------------------------------------------------------------

export interface PresetRow {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  sortOrder: number;
  isDefault: boolean;
  status: PublishStatus;
  featureIds: string[];
}

/** Fitur untuk editor preset — perlu kategori & man-day untuk ringkasan preset. */
export interface PresetFeatureRow extends DependencyFeatureRow {
  categoryId: string;
  manDayMin: number;
  manDayMax: number;
}

export interface PresetWorkspace {
  categories: Array<{ id: string; slug: string; name: string; status: PublishStatus }>;
  presets: PresetRow[];
  features: PresetFeatureRow[];
  edges: DependencyEdgeRow[];
}

export async function loadPresetWorkspace(): Promise<PresetWorkspace> {
  const [categories, presets, features, edges] = await Promise.all([
    listAllCategoriesLite(),
    prisma.preset.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { presetFeatures: { select: { featureId: true } } },
    }),
    prisma.feature.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { group: { select: { name: true } } },
    }),
    prisma.featureDependency.findMany(),
  ]);

  return {
    categories,
    presets: presets.map((preset) => ({
      id: preset.id,
      categoryId: preset.categoryId,
      slug: preset.slug,
      name: preset.name,
      tagline: preset.tagline,
      description: preset.description,
      bestFor: parseJson<string[]>(preset.bestFor, []),
      sortOrder: preset.sortOrder,
      isDefault: preset.isDefault,
      status: coerceEnum(preset.status, PUBLISH_STATUSES, 'PUBLISHED'),
      featureIds: preset.presetFeatures.map((link) => link.featureId),
    })),
    features: features.map((feature) => ({
      id: feature.id,
      name: feature.name,
      slug: feature.slug,
      type: coerceEnum(feature.type, FEATURE_TYPES, 'STANDARD'),
      groupId: feature.groupId,
      groupName: feature.group.name,
      categoryId: feature.categoryId,
      manDayMin: feature.manDayMin,
      manDayMax: feature.manDayMax,
      isEssential: feature.isEssential,
      status: coerceEnum(feature.status, PUBLISH_STATUSES, 'DRAFT'),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      featureId: edge.featureId,
      targetFeatureId: edge.targetFeatureId,
      kind: coerceEnum(edge.kind, DEPENDENCY_KINDS, 'REQUIRES'),
      note: edge.note ?? '',
    })),
  };
}

// ---------------------------------------------------------------------------
// Wizard (L5)
// ---------------------------------------------------------------------------

export interface WizardMappingRow {
  id: string;
  featureId: string;
  featureName: string;
  reason: string;
}

export interface WizardOptionRow {
  id: string;
  slug: string;
  label: string;
  description: string;
  icon: string;
  sortOrder: number;
  suggestPresetSlug: string;
  mappings: WizardMappingRow[];
}

export interface WizardQuestionRow {
  id: string;
  categoryId: string;
  slug: string;
  question: string;
  helpText: string;
  inputType: WizardInputType;
  sortOrder: number;
  isActive: boolean;
  options: WizardOptionRow[];
}

export interface WizardWorkspace {
  categories: Array<{ id: string; slug: string; name: string; status: PublishStatus }>;
  questions: WizardQuestionRow[];
  /** Fitur per kategori untuk dropdown pemetaan. */
  featuresByCategory: Record<string, DependencyFeatureRow[]>;
  presetsByCategory: Record<string, Array<{ slug: string; name: string }>>;
}

export async function loadWizardWorkspace(): Promise<WizardWorkspace> {
  const [categories, questions, features, presets] = await Promise.all([
    listAllCategoriesLite(),
    prisma.wizardQuestion.findMany({
      orderBy: [{ sortOrder: 'asc' }],
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
          include: {
            featureLinks: { include: { feature: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.feature.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { group: { select: { name: true } } },
    }),
    prisma.preset.findMany({ select: { categoryId: true, slug: true, name: true } }),
  ]);

  const featuresByCategory: Record<string, DependencyFeatureRow[]> = {};
  for (const feature of features) {
    const list = (featuresByCategory[feature.categoryId] ??= []);
    list.push({
      id: feature.id,
      name: feature.name,
      slug: feature.slug,
      type: coerceEnum(feature.type, FEATURE_TYPES, 'STANDARD'),
      groupId: feature.groupId,
      groupName: feature.group.name,
      isEssential: feature.isEssential,
      status: coerceEnum(feature.status, PUBLISH_STATUSES, 'DRAFT'),
    });
  }

  const presetsByCategory: Record<string, Array<{ slug: string; name: string }>> = {};
  for (const preset of presets) {
    (presetsByCategory[preset.categoryId] ??= []).push({
      slug: preset.slug,
      name: preset.name,
    });
  }

  return {
    categories,
    questions: questions.map((question) => ({
      id: question.id,
      categoryId: question.categoryId,
      slug: question.slug,
      question: question.question,
      helpText: question.helpText ?? '',
      inputType: coerceEnum(question.inputType, WIZARD_INPUT_TYPES, 'SINGLE'),
      sortOrder: question.sortOrder,
      isActive: question.isActive,
      options: question.options.map((option) => ({
        id: option.id,
        slug: option.slug,
        label: option.label,
        description: option.description ?? '',
        icon: option.icon,
        sortOrder: option.sortOrder,
        suggestPresetSlug: option.suggestPresetSlug ?? '',
        mappings: option.featureLinks.map((link) => ({
          id: link.id,
          featureId: link.featureId,
          featureName: link.feature.name,
          reason: link.reason,
        })),
      })),
    })),
    featuresByCategory,
    presetsByCategory,
  };
}
