import 'server-only';

import { prisma } from '@/lib/db/prisma';
import {
  CONFIGURATION_STATUSES,
  CUSTOM_REQUEST_STATUSES,
  FEATURE_TYPES,
  PROJECT_DEPLOYMENTS,
  PROJECT_PLATFORMS,
  REVISION_ACTIONS,
  USER_TIERS,
  coerceEnum,
  type ConfigurationStatus,
  type CustomRequestStatus,
  type FeatureType,
  type ProjectDeployment,
  type ProjectPlatform,
  type RevisionAction,
  type UserTier,
} from '@/lib/domain/enums';

/**
 * Kueri area akun klien (PRD modul G).
 *
 * Seluruh kueri di berkas ini selalu menyaring dengan ownerId pengguna aktif,
 * sehingga tidak ada jalan membaca rakitan milik orang lain hanya dengan
 * menebak token.
 */

export interface SavedConfiguration {
  token: string;
  name: string;
  status: ConfigurationStatus;
  categoryName: string;
  categoryShortName: string;
  featureCount: number;
  customCount: number;
  totalMin: number;
  totalMax: number;
  durationWeeksMin: number;
  durationWeeksMax: number;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  projectCode: string | null;
}

/** G2 — seluruh rakitan tersimpan milik satu pengguna. */
export async function listSavedConfigurations(userId: string): Promise<SavedConfiguration[]> {
  if (!userId) return [];

  const rows = await prisma.configuration.findMany({
    where: { ownerId: userId, status: { not: 'ARCHIVED' } },
    orderBy: { lastActivityAt: 'desc' },
    select: {
      publicToken: true,
      name: true,
      status: true,
      totalMin: true,
      totalMax: true,
      durationWeeksMin: true,
      durationWeeksMax: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { name: true, shortName: true } },
      project: { select: { id: true, code: true } },
      _count: { select: { items: true, customRequests: true } },
    },
  });

  return rows.map((row) => {
    const status = coerceEnum(row.status, CONFIGURATION_STATUSES, 'DRAFT');
    return {
      token: row.publicToken,
      name: row.name,
      status,
      categoryName: row.category.name,
      categoryShortName: row.category.shortName,
      featureCount: row._count.items,
      customCount: row._count.customRequests,
      totalMin: row.totalMin,
      totalMax: row.totalMax,
      durationWeeksMin: row.durationWeeksMin,
      durationWeeksMax: row.durationWeeksMax,
      isEditable: status === 'DRAFT',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      projectId: row.project?.id ?? null,
      projectCode: row.project?.code ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// G2 — Perbandingan dua rakitan
// ---------------------------------------------------------------------------

export interface ComparableFeature {
  id: string;
  name: string;
  type: FeatureType;
  priceMin: number;
  priceMax: number;
}

export interface ComparableConfiguration {
  token: string;
  name: string;
  status: ConfigurationStatus;
  categoryName: string;
  platform: ProjectPlatform;
  deployment: ProjectDeployment;
  userTier: UserTier;
  features: ComparableFeature[];
  customRequests: Array<{ id: string; name: string; status: CustomRequestStatus }>;
  addOns: Array<{ id: string; name: string; priceMin: number; priceMax: number; isRecurring: boolean }>;
  totalMin: number;
  totalMax: number;
  setupFee: number;
  discountPct: number;
  recurringMonthlyMin: number;
  recurringMonthlyMax: number;
  durationWeeksMin: number;
  durationWeeksMax: number;
  updatedAt: string;
}

/** Satu rakitan lengkap untuk halaman bandingkan — hanya milik pengguna ini. */
export async function getComparableConfiguration(
  token: string,
  userId: string,
): Promise<ComparableConfiguration | null> {
  if (!token || !userId) return null;

  const row = await prisma.configuration.findFirst({
    where: { publicToken: token, ownerId: userId },
    include: {
      category: { select: { name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
      customRequests: { orderBy: { createdAt: 'asc' } },
      addOns: true,
    },
  });
  if (!row) return null;

  return {
    token: row.publicToken,
    name: row.name,
    status: coerceEnum(row.status, CONFIGURATION_STATUSES, 'DRAFT'),
    categoryName: row.category.name,
    platform: coerceEnum(row.platform, PROJECT_PLATFORMS, 'WEB'),
    deployment: coerceEnum(row.deployment, PROJECT_DEPLOYMENTS, 'OUR_CLOUD'),
    userTier: coerceEnum(row.userTier, USER_TIERS, 'T10'),
    features: row.items.map((item) => ({
      id: item.featureId,
      name: item.nameSnapshot,
      type: coerceEnum(item.typeSnapshot, FEATURE_TYPES, 'STANDARD'),
      priceMin: item.unitPriceMin,
      priceMax: item.unitPriceMax,
    })),
    customRequests: row.customRequests.map((request) => ({
      id: request.id,
      name: request.name,
      status: coerceEnum(request.status, CUSTOM_REQUEST_STATUSES, 'PENDING'),
    })),
    addOns: row.addOns.map((addOn) => ({
      id: addOn.addOnId,
      name: addOn.nameSnapshot,
      priceMin: addOn.priceMin,
      priceMax: addOn.priceMax,
      isRecurring: addOn.isRecurring,
    })),
    totalMin: row.totalMin,
    totalMax: row.totalMax,
    setupFee: row.setupFee,
    discountPct: row.discountPct,
    recurringMonthlyMin: row.recurringMonthlyMin,
    recurringMonthlyMax: row.recurringMonthlyMax,
    durationWeeksMin: row.durationWeeksMin,
    durationWeeksMax: row.durationWeeksMax,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface FeatureDiff {
  onlyInA: ComparableFeature[];
  onlyInB: ComparableFeature[];
  inBoth: ComparableFeature[];
}

/** Selisih fitur antara dua rakitan (G2). */
export function diffFeatures(
  a: ComparableConfiguration,
  b: ComparableConfiguration,
): FeatureDiff {
  const idsB = new Set(b.features.map((feature) => feature.id));
  const idsA = new Set(a.features.map((feature) => feature.id));

  return {
    onlyInA: a.features.filter((feature) => !idsB.has(feature.id)),
    onlyInB: b.features.filter((feature) => !idsA.has(feature.id)),
    inBoth: a.features.filter((feature) => idsB.has(feature.id)),
  };
}

// ---------------------------------------------------------------------------
// G3 — Riwayat versi
// ---------------------------------------------------------------------------

export interface RevisionEntry {
  id: string;
  version: number;
  action: RevisionAction;
  summary: string;
  totalMin: number;
  totalMax: number;
  actorLabel: string;
  createdAt: string;
  /** Pergerakan batas bawah total terhadap versi sebelumnya. */
  deltaMin: number;
  deltaMax: number;
}

export interface RevisionHistory {
  token: string;
  name: string;
  categoryName: string;
  status: ConfigurationStatus;
  entries: RevisionEntry[];
}

/** G3 — riwayat versi satu rakitan, dari yang terbaru ke yang terlama. */
export async function getRevisionHistory(
  token: string,
  userId: string,
): Promise<RevisionHistory | null> {
  if (!token || !userId) return null;

  const row = await prisma.configuration.findFirst({
    where: { publicToken: token, ownerId: userId },
    select: {
      publicToken: true,
      name: true,
      status: true,
      category: { select: { name: true } },
      revisions: { orderBy: { version: 'asc' } },
    },
  });
  if (!row) return null;

  // Delta dihitung terhadap versi sebelumnya supaya klien melihat pergerakan
  // angka, bukan sekadar daftar total yang berdiri sendiri.
  const entries: RevisionEntry[] = row.revisions.map((revision, index) => {
    const previous = index > 0 ? row.revisions[index - 1] : null;
    return {
      id: revision.id,
      version: revision.version,
      action: coerceEnum(revision.action, REVISION_ACTIONS, 'CREATED'),
      summary: revision.summary,
      totalMin: revision.totalMin,
      totalMax: revision.totalMax,
      actorLabel: revision.actorLabel,
      createdAt: revision.createdAt.toISOString(),
      deltaMin: previous ? revision.totalMin - previous.totalMin : 0,
      deltaMax: previous ? revision.totalMax - previous.totalMax : 0,
    };
  });

  return {
    token: row.publicToken,
    name: row.name,
    categoryName: row.category.name,
    status: coerceEnum(row.status, CONFIGURATION_STATUSES, 'DRAFT'),
    entries: entries.reverse(),
  };
}
