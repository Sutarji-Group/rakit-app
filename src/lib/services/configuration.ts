import 'server-only';

import { customAlphabet } from 'nanoid';
import { prisma } from '@/lib/db/prisma';
import { parseJson, parseStringArray, stringifyJson } from '@/lib/db/json';
import {
  COUNTED_CUSTOM_STATUSES,
  CONFIGURATION_SOURCES,
  CONFIGURATION_STATUSES,
  FROZEN_CONFIGURATION_STATUSES,
  PROJECT_DEPLOYMENTS,
  PROJECT_PLATFORMS,
  USER_TIERS,
  ADDON_KINDS,
  coerceEnum,
  type ConfigurationSource,
  type ConfigurationStatus,
  type CustomRequestStatus,
  type ItemOrigin,
  type ProjectDeployment,
  type ProjectPlatform,
  type RevisionAction,
  type UserTier,
} from '@/lib/domain/enums';
import {
  buildDependencyGraph,
  enforceSelection,
  validateMinimumViable,
  type DependencyGraph,
} from '@/lib/configurator/dependency';
import {
  computePrice,
  type PriceBreakdown,
  type PriceInputAddOn,
  type PriceInputCustom,
  type PriceInputFeature,
  type PricingRuleSnapshot,
} from '@/lib/pricing';
import {
  indexFeatures,
  loadCatalogBundle,
  toDependencyFeatures,
  type CatalogBundle,
  type FeatureDTO,
} from './catalog';
import { getActivePricingRule, getPricingRuleById } from './pricing-rule';

/**
 * Token publik untuk tautan simpan-dan-lanjutkan serta berbagi (C5.3, C5.4).
 * Alfabet tanpa karakter yang mudah tertukar saat dibacakan lewat telepon.
 */
const makeToken = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 12);

export interface AddOnDTO {
  id: string;
  slug: string;
  kind: string;
  name: string;
  description: string;
  icon: string;
  logoUrl: string | null;
  priceMin: number;
  priceMax: number;
  manDayMin: number;
  manDayMax: number;
  isRecurring: boolean;
  optionGroup: string | null;
}

export interface CustomRequestDTO {
  id: string;
  name: string;
  problem: string;
  userRoles: string;
  flowSteps: string[];
  priority: string;
  status: CustomRequestStatus;
  manDayMin: number | null;
  manDayMax: number | null;
  riskLevel: string | null;
  clarificationQuestion: string | null;
  rejectReason: string | null;
  slaDueAt: string;
  createdAt: string;
}

export interface ConfigurationPayload {
  token: string;
  id: string;
  name: string;
  status: ConfigurationStatus;
  source: ConfigurationSource;
  platform: ProjectPlatform;
  deployment: ProjectDeployment;
  userTier: UserTier;
  projectOptionsCompleted: boolean;
  presetId: string | null;
  wizardAnswers: Record<string, string[]>;
  selectedFeatureIds: string[];
  itemMeta: Record<string, { origin: ItemOrigin; reason: string | null }>;
  selectedAddOnIds: string[];
  customRequests: CustomRequestDTO[];
  isEditable: boolean;
  isPriceLocked: boolean;
  lockedPrice: number | null;
  lockedUntil: string | null;
  submittedAt: string | null;
  quoteNumber: string | null;
}

/** Seluruh data yang dibutuhkan konfigurator untuk berjalan mandiri di klien. */
export interface ConfiguratorPayload {
  configuration: ConfigurationPayload;
  catalog: CatalogBundle;
  addOns: AddOnDTO[];
  rule: PricingRuleSnapshot;
}

// ---------------------------------------------------------------------------
// Pembacaan
// ---------------------------------------------------------------------------

async function loadRaw(token: string) {
  return prisma.configuration.findUnique({
    where: { publicToken: token },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      customRequests: { orderBy: { createdAt: 'asc' } },
      addOns: true,
      lead: { select: { quoteNumber: true } },
    },
  });
}

type RawConfiguration = NonNullable<Awaited<ReturnType<typeof loadRaw>>>;

function mapConfiguration(raw: RawConfiguration): ConfigurationPayload {
  const status = coerceEnum(raw.status, CONFIGURATION_STATUSES, 'DRAFT');
  return {
    token: raw.publicToken,
    id: raw.id,
    name: raw.name,
    status,
    source: coerceEnum(raw.source, CONFIGURATION_SOURCES, 'DIRECT'),
    platform: coerceEnum(raw.platform, PROJECT_PLATFORMS, 'WEB'),
    deployment: coerceEnum(raw.deployment, PROJECT_DEPLOYMENTS, 'OUR_CLOUD'),
    userTier: coerceEnum(raw.userTier, USER_TIERS, 'T10'),
    projectOptionsCompleted: raw.projectOptionsCompleted,
    presetId: raw.presetId,
    wizardAnswers: parseJson<Record<string, string[]>>(raw.wizardAnswers, {}),
    selectedFeatureIds: raw.items.map((item) => item.featureId),
    itemMeta: Object.fromEntries(
      raw.items.map((item) => [
        item.featureId,
        { origin: item.origin as ItemOrigin, reason: item.reason },
      ]),
    ),
    selectedAddOnIds: raw.addOns.map((a) => a.addOnId),
    customRequests: raw.customRequests.map(mapCustomRequest),
    isEditable: !FROZEN_CONFIGURATION_STATUSES.includes(status),
    isPriceLocked: raw.isPriceLocked,
    lockedPrice: raw.lockedPrice,
    lockedUntil: raw.lockedUntil?.toISOString() ?? null,
    submittedAt: raw.submittedAt?.toISOString() ?? null,
    quoteNumber: raw.lead?.quoteNumber ?? null,
  };
}

function mapCustomRequest(row: RawConfiguration['customRequests'][number]): CustomRequestDTO {
  return {
    id: row.id,
    name: row.name,
    problem: row.problem,
    userRoles: row.userRoles,
    flowSteps: parseStringArray(row.flowSteps),
    priority: row.priority,
    status: row.status as CustomRequestStatus,
    manDayMin: row.manDayMin,
    manDayMax: row.manDayMax,
    riskLevel: row.riskLevel,
    clarificationQuestion: row.clarificationQuestion,
    rejectReason: row.rejectReason,
    slaDueAt: row.slaDueAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAddOns(categoryId?: string): Promise<AddOnDTO[]> {
  const rows = await prisma.addOn.findMany({
    where: {
      isActive: true,
      ...(categoryId
        ? { OR: [{ isGlobal: true }, { categories: { some: { categoryId } } }] }
        : {}),
    },
    orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    kind: coerceEnum(row.kind, ADDON_KINDS, 'OTHER'),
    name: row.name,
    description: row.description,
    icon: row.icon,
    logoUrl: row.logoUrl,
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    manDayMin: row.manDayMin,
    manDayMax: row.manDayMax,
    isRecurring: row.isRecurring,
    optionGroup: row.optionGroup,
  }));
}

/** Memuat seluruh bahan yang dibutuhkan konfigurator untuk satu token. */
export async function getConfiguratorPayload(
  token: string,
): Promise<ConfiguratorPayload | null> {
  const raw = await loadRaw(token);
  if (!raw) return null;

  const [catalog, addOns, rule] = await Promise.all([
    loadCatalogBundle(raw.categoryId),
    listAddOns(raw.categoryId),
    // Konfigurasi yang sudah terbit tetap memakai aturan versi lamanya (BR-07).
    getPricingRuleById(raw.pricingRuleId).then((r) => r ?? getActivePricingRule()),
  ]);

  if (!catalog) return null;

  return { configuration: mapConfiguration(raw), catalog, addOns, rule };
}

// ---------------------------------------------------------------------------
// Perhitungan
// ---------------------------------------------------------------------------

export interface ComputeSources {
  rule: PricingRuleSnapshot;
  features: PriceInputFeature[];
  customRequests: PriceInputCustom[];
  addOns: PriceInputAddOn[];
  platform: ProjectPlatform;
  deployment: ProjectDeployment;
  userTier: UserTier;
}

function toPriceFeature(feature: FeatureDTO, groupName?: string): PriceInputFeature {
  return {
    id: feature.id,
    name: feature.name,
    type: feature.type,
    manDayMin: feature.manDayMin,
    manDayMax: feature.manDayMax,
    effortRatioOverride: feature.effortRatioOverride,
    groupName,
  };
}

/**
 * Menyusun masukan mesin harga dari satu payload konfigurator.
 * Dipakai baik oleh server maupun oleh konfigurator di klien.
 */
export function buildPriceInput(
  payload: ConfiguratorPayload,
  overrides?: {
    selectedFeatureIds?: string[];
    selectedAddOnIds?: string[];
    platform?: ProjectPlatform;
    deployment?: ProjectDeployment;
    userTier?: UserTier;
  },
): ComputeSources {
  const selected = new Set(
    overrides?.selectedFeatureIds ?? payload.configuration.selectedFeatureIds,
  );
  const selectedAddOns = new Set(
    overrides?.selectedAddOnIds ?? payload.configuration.selectedAddOnIds,
  );

  const features: PriceInputFeature[] = [];
  for (const group of payload.catalog.groups) {
    for (const feature of group.features) {
      if (selected.has(feature.id)) features.push(toPriceFeature(feature, group.name));
    }
  }

  const customRequests: PriceInputCustom[] = payload.configuration.customRequests.map(
    (request) => ({
      id: request.id,
      name: request.name,
      isEstimated:
        COUNTED_CUSTOM_STATUSES.includes(request.status) &&
        request.manDayMin != null &&
        request.manDayMax != null,
      manDayMin: request.manDayMin,
      manDayMax: request.manDayMax,
    }),
  );

  const addOns: PriceInputAddOn[] = payload.addOns
    .filter((addOn) => selectedAddOns.has(addOn.id))
    .map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      kind: coerceEnum(addOn.kind, ADDON_KINDS, 'OTHER'),
      priceMin: addOn.priceMin,
      priceMax: addOn.priceMax,
      manDayMin: addOn.manDayMin,
      manDayMax: addOn.manDayMax,
      isRecurring: addOn.isRecurring,
    }));

  return {
    rule: payload.rule,
    features,
    customRequests,
    addOns,
    platform: overrides?.platform ?? payload.configuration.platform,
    deployment: overrides?.deployment ?? payload.configuration.deployment,
    userTier: overrides?.userTier ?? payload.configuration.userTier,
  };
}

export function computeFromPayload(
  payload: ConfiguratorPayload,
  overrides?: Parameters<typeof buildPriceInput>[1],
): PriceBreakdown {
  return computePrice(buildPriceInput(payload, overrides));
}

export function buildGraph(payload: ConfiguratorPayload): DependencyGraph {
  return buildDependencyGraph(
    toDependencyFeatures(payload.catalog.groups),
    payload.catalog.dependencies,
  );
}

// ---------------------------------------------------------------------------
// Penyimpanan
// ---------------------------------------------------------------------------

/**
 * Menuliskan ringkasan harga hasil perhitungan ke baris Configuration.
 *
 * Server selalu menghitung ulang sendiri, tidak pernah mempercayai angka yang
 * dikirim klien. Nilai internal (COGS, margin) ikut tersimpan agar pipeline
 * lead dapat menampilkan kesehatan margin berdampingan dengan nilai proyek.
 */
function priceFields(breakdown: PriceBreakdown, minViable: { isViable: boolean }) {
  const blocking = breakdown.guardrails.filter((g) => g.blocking);
  return {
    subtotalMin: breakdown.featuresSubtotalMin,
    subtotalMax: breakdown.featuresSubtotalMax,
    discountPct: breakdown.discountPct,
    discountMin: breakdown.discountMin,
    discountMax: breakdown.discountMax,
    addOnMin: breakdown.addOnOneTimeMin,
    addOnMax: breakdown.addOnOneTimeMax,
    setupFee: breakdown.setupFee,
    totalMin: breakdown.totalMin,
    totalMax: breakdown.totalMax,
    recurringMonthlyMin: breakdown.recurringMonthlyMin,
    recurringMonthlyMax: breakdown.recurringMonthlyMax,
    durationWeeksMin: breakdown.duration.weeksMin,
    durationWeeksMax: breakdown.duration.weeksMax,
    cogsProjection: breakdown.internal.cogsProjection,
    grossMarginPct: breakdown.internal.grossMarginPct,
    realEffortManDay: breakdown.internal.realEffortManDayMax,
    customSharePct: breakdown.customSharePct,
    belowMinProjectValue: breakdown.guardrails.some(
      (g) => g.code === 'BELOW_MIN_PROJECT_VALUE',
    ),
    exceedsCustomShare: breakdown.guardrails.some((g) => g.code === 'EXCEEDS_CUSTOM_SHARE'),
    belowMinMargin: breakdown.guardrails.some((g) => g.code === 'BELOW_MIN_MARGIN'),
    belowMinViable: !minViable.isViable,
    guardrailNotes: stringifyJson(blocking.map((g) => g.internalMessage)),
    lastActivityAt: new Date(),
  };
}

async function recordRevision(
  configurationId: string,
  action: RevisionAction,
  summary: string,
  detail: Record<string, unknown>,
  totals: { totalMin: number; totalMax: number },
  actorLabel = 'Klien',
): Promise<void> {
  const last = await prisma.configurationRevision.findFirst({
    where: { configurationId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  await prisma.configurationRevision.create({
    data: {
      configurationId,
      version: (last?.version ?? 0) + 1,
      action,
      summary,
      detail: stringifyJson(detail),
      totalMin: totals.totalMin,
      totalMax: totals.totalMax,
      actorLabel,
    },
  });
}

export interface CreateConfigurationInput {
  categorySlug: string;
  presetSlug?: string | null;
  source?: ConfigurationSource;
  wizardAnswers?: Record<string, string[]>;
  /** Fitur yang sudah dipilih wizard beserta alasannya (B4). */
  wizardFeatures?: Array<{ featureId: string; reason: string }>;
  ownerId?: string | null;
  trafficSource?: string | null;
  name?: string;
}

/**
 * Membuat konfigurasi baru.
 *
 * Prinsip Produk #3 — "preset dulu, kustomisasi kemudian": klien tidak pernah
 * menghadapi katalog kosong. Bila preset tidak disebutkan, preset bawaan
 * kategori dipakai sebagai titik awal.
 */
export async function createConfiguration(
  input: CreateConfigurationInput,
): Promise<{ token: string; id: string } | null> {
  const category = await prisma.applicationCategory.findUnique({
    where: { slug: input.categorySlug },
  });
  if (!category) return null;

  const [catalog, rule] = await Promise.all([
    loadCatalogBundle(category.id),
    getActivePricingRule(),
  ]);
  if (!catalog) return null;

  const ruleRow = await prisma.pricingRule.findFirst({
    where: { isActive: true },
    orderBy: { version: 'desc' },
    select: { id: true },
  });

  const preset =
    catalog.presets.find((p) => p.slug === input.presetSlug) ??
    catalog.presets.find((p) => p.isDefault) ??
    catalog.presets[0];

  const featureIndex = indexFeatures(catalog.groups);
  const graph = buildDependencyGraph(
    toDependencyFeatures(catalog.groups),
    catalog.dependencies,
  );

  // Titik awal: fitur preset + fitur hasil wizard, lalu dinormalkan mesin
  // dependensi agar seluruh prasyarat dan fitur Core ikut masuk.
  const wizardIds = new Set((input.wizardFeatures ?? []).map((w) => w.featureId));
  const seed = new Set<string>([...(preset?.featureIds ?? []), ...wizardIds]);
  const enforced = enforceSelection(graph, seed);

  const reasons = new Map(
    (input.wizardFeatures ?? []).map((w) => [w.featureId, w.reason] as const),
  );
  const dependencyReasons = new Map(
    enforced.added.map((a) => [a.featureId, a.reason] as const),
  );

  const config = await prisma.configuration.create({
    data: {
      publicToken: makeToken(),
      categoryId: category.id,
      presetId: preset?.id ?? null,
      pricingRuleId: ruleRow?.id ?? rule.id,
      ownerId: input.ownerId ?? null,
      name: input.name ?? `Rakitan ${category.shortName}`,
      source: input.source ?? (input.wizardFeatures ? 'WIZARD' : preset ? 'PRESET' : 'DIRECT'),
      wizardAnswers: stringifyJson(input.wizardAnswers ?? {}),
      trafficSource: input.trafficSource ?? null,
      items: {
        create: [...enforced.selected].map((featureId, index) => {
          const feature = featureIndex.get(featureId)!;
          const origin: ItemOrigin =
            feature.type === 'CORE'
              ? 'CORE_AUTO'
              : wizardIds.has(featureId)
                ? 'WIZARD'
                : preset?.featureIds.includes(featureId)
                  ? 'PRESET'
                  : 'DEPENDENCY';
          return {
            featureId,
            origin,
            reason: reasons.get(featureId) ?? dependencyReasons.get(featureId) ?? null,
            nameSnapshot: feature.name,
            typeSnapshot: feature.type,
            manDayMin: feature.manDayMin,
            manDayMax: feature.manDayMax,
            unitPriceMin: 0,
            unitPriceMax: 0,
            sortOrder: index,
          };
        }),
      },
    },
  });

  await recomputeConfiguration(config.publicToken);
  return { token: config.publicToken, id: config.id };
}

/** Menghitung ulang lalu menyimpan seluruh ringkasan harga satu konfigurasi. */
export async function recomputeConfiguration(
  token: string,
): Promise<PriceBreakdown | null> {
  const payload = await getConfiguratorPayload(token);
  if (!payload) return null;

  const breakdown = computeFromPayload(payload);
  const graph = buildGraph(payload);
  const minViable = validateMinimumViable(
    graph,
    payload.configuration.selectedFeatureIds,
    payload.catalog.category.minViableFeatureCount,
    payload.catalog.category.shortName,
  );

  // Simpan juga harga satuan hasil perhitungan ke tiap item agar rincian
  // "lihat rincian" dan proposal PDF tidak perlu menghitung ulang.
  await prisma.$transaction([
    prisma.configuration.update({
      where: { id: payload.configuration.id },
      data: priceFields(breakdown, minViable),
    }),
    ...breakdown.lines
      .filter((line) => line.type !== 'CUSTOM')
      .map((line) =>
        prisma.configurationItem.updateMany({
          where: { configurationId: payload.configuration.id, featureId: line.id },
          data: {
            unitPriceMin: line.priceMin,
            unitPriceMax: line.priceMax,
            effortManDay: line.effortManDayMax,
          },
        }),
      ),
  ]);

  return breakdown;
}

export interface UpdateSelectionResult {
  ok: boolean;
  error?: string;
  breakdown?: PriceBreakdown;
  autoAdded?: Array<{ featureId: string; featureName: string; reason: string }>;
  autoRemoved?: Array<{ featureId: string; featureName: string; reason: string }>;
}

/**
 * Menyimpan pilihan fitur baru.
 *
 * Kiriman klien selalu dinormalkan ulang oleh mesin dependensi sebelum
 * disimpan, sehingga konfigurasi yang melanggar aturan mustahil tersimpan —
 * apa pun yang dikirim dari browser (Prinsip Produk #2).
 */
export async function updateSelection(
  token: string,
  requestedFeatureIds: string[],
  actorLabel = 'Klien',
): Promise<UpdateSelectionResult> {
  const payload = await getConfiguratorPayload(token);
  if (!payload) return { ok: false, error: 'Konfigurasi tidak ditemukan.' };
  if (!payload.configuration.isEditable) {
    return {
      ok: false,
      error: 'Konfigurasi ini sudah dikirim dan tidak dapat diubah lagi.',
    };
  }

  const graph = buildGraph(payload);
  const enforced = enforceSelection(graph, requestedFeatureIds);
  const featureIndex = indexFeatures(payload.catalog.groups);

  const before = new Set(payload.configuration.selectedFeatureIds);
  const after = enforced.selected;

  const removedIds = [...before].filter((id) => !after.has(id));
  const addedIds = [...after].filter((id) => !before.has(id));

  if (removedIds.length === 0 && addedIds.length === 0) {
    const breakdown = computeFromPayload(payload);
    return { ok: true, breakdown };
  }

  const dependencyReasons = new Map(
    enforced.added.map((a) => [a.featureId, a.reason] as const),
  );
  const requested = new Set(requestedFeatureIds);

  await prisma.$transaction([
    ...(removedIds.length > 0
      ? [
          prisma.configurationItem.deleteMany({
            where: { configurationId: payload.configuration.id, featureId: { in: removedIds } },
          }),
        ]
      : []),
    ...addedIds.map((featureId) => {
      const feature = featureIndex.get(featureId)!;
      const origin: ItemOrigin =
        feature.type === 'CORE'
          ? 'CORE_AUTO'
          : requested.has(featureId)
            ? 'USER'
            : 'DEPENDENCY';
      return prisma.configurationItem.create({
        data: {
          configurationId: payload.configuration.id,
          featureId,
          origin,
          reason: origin === 'DEPENDENCY' ? (dependencyReasons.get(featureId) ?? null) : null,
          nameSnapshot: feature.name,
          typeSnapshot: feature.type,
          manDayMin: feature.manDayMin,
          manDayMax: feature.manDayMax,
          unitPriceMin: 0,
          unitPriceMax: 0,
        },
      });
    }),
  ]);

  const breakdown = await recomputeConfiguration(token);

  const summaryParts: string[] = [];
  if (addedIds.length > 0) summaryParts.push(`+${addedIds.length} fitur`);
  if (removedIds.length > 0) summaryParts.push(`−${removedIds.length} fitur`);

  await recordRevision(
    payload.configuration.id,
    addedIds.length >= removedIds.length ? 'FEATURE_ADDED' : 'FEATURE_REMOVED',
    summaryParts.join(', '),
    {
      added: addedIds.map((id) => featureIndex.get(id)?.name ?? id),
      removed: removedIds.map((id) => featureIndex.get(id)?.name ?? id),
    },
    { totalMin: breakdown?.totalMin ?? 0, totalMax: breakdown?.totalMax ?? 0 },
    actorLabel,
  );

  return {
    ok: true,
    breakdown: breakdown ?? undefined,
    autoAdded: enforced.added.map((a) => ({
      featureId: a.featureId,
      featureName: a.featureName,
      reason: a.reason,
    })),
    autoRemoved: enforced.removed.map((r) => ({
      featureId: r.featureId,
      featureName: r.featureName,
      reason: r.reason,
    })),
  };
}

export interface ProjectOptionsInput {
  platform?: ProjectPlatform;
  deployment?: ProjectDeployment;
  userTier?: UserTier;
  addOnIds?: string[];
  completed?: boolean;
}

/** Menyimpan konfigurasi proyek: platform, deployment, pengguna, add-on (E). */
export async function updateProjectOptions(
  token: string,
  input: ProjectOptionsInput,
): Promise<UpdateSelectionResult> {
  const payload = await getConfiguratorPayload(token);
  if (!payload) return { ok: false, error: 'Konfigurasi tidak ditemukan.' };
  if (!payload.configuration.isEditable) {
    return { ok: false, error: 'Konfigurasi ini sudah dikirim dan tidak dapat diubah lagi.' };
  }

  const addOnIndex = new Map(payload.addOns.map((a) => [a.id, a] as const));
  const nextAddOnIds = (input.addOnIds ?? payload.configuration.selectedAddOnIds).filter((id) =>
    addOnIndex.has(id),
  );

  await prisma.$transaction([
    prisma.configuration.update({
      where: { id: payload.configuration.id },
      data: {
        platform: input.platform ?? payload.configuration.platform,
        deployment: input.deployment ?? payload.configuration.deployment,
        userTier: input.userTier ?? payload.configuration.userTier,
        projectOptionsCompleted:
          input.completed ?? payload.configuration.projectOptionsCompleted,
      },
    }),
    prisma.configurationAddOn.deleteMany({
      where: { configurationId: payload.configuration.id },
    }),
    ...nextAddOnIds.map((addOnId) => {
      const addOn = addOnIndex.get(addOnId)!;
      return prisma.configurationAddOn.create({
        data: {
          configurationId: payload.configuration.id,
          addOnId,
          nameSnapshot: addOn.name,
          kindSnapshot: addOn.kind,
          priceMin: addOn.priceMin,
          priceMax: addOn.priceMax,
          isRecurring: addOn.isRecurring,
          manDayMin: addOn.manDayMin,
          manDayMax: addOn.manDayMax,
        },
      });
    }),
  ]);

  const breakdown = await recomputeConfiguration(token);

  await recordRevision(
    payload.configuration.id,
    'OPTIONS_CHANGED',
    'Konfigurasi proyek diperbarui',
    {
      platform: input.platform,
      deployment: input.deployment,
      userTier: input.userTier,
      addOns: nextAddOnIds.map((id) => addOnIndex.get(id)?.name ?? id),
    },
    { totalMin: breakdown?.totalMin ?? 0, totalMax: breakdown?.totalMax ?? 0 },
  );

  return { ok: true, breakdown: breakdown ?? undefined };
}

/** Menerapkan preset sebagai titik awal baru (C5.2). */
export async function applyPreset(token: string, presetId: string): Promise<UpdateSelectionResult> {
  const payload = await getConfiguratorPayload(token);
  if (!payload) return { ok: false, error: 'Konfigurasi tidak ditemukan.' };

  const preset = payload.catalog.presets.find((p) => p.id === presetId);
  if (!preset) return { ok: false, error: 'Preset tidak ditemukan.' };

  const result = await updateSelection(token, preset.featureIds);
  if (result.ok) {
    await prisma.configuration.update({
      where: { id: payload.configuration.id },
      data: { presetId: preset.id, source: 'PRESET' },
    });
  }
  return result;
}

export async function renameConfiguration(token: string, name: string): Promise<void> {
  await prisma.configuration.updateMany({
    where: { publicToken: token },
    data: { name: name.slice(0, 120) },
  });
}

/** Mencatat waktu yang dihabiskan klien di konfigurator (O2, metrik 4.3). */
export async function trackTimeSpent(token: string, seconds: number): Promise<void> {
  if (seconds <= 0 || seconds > 86_400) return;
  await prisma.configuration.updateMany({
    where: { publicToken: token },
    data: { timeSpentSeconds: seconds, lastActivityAt: new Date() },
  });
}

/** Menduplikasi konfigurasi agar klien dapat membandingkan skenario (G2). */
export async function duplicateConfiguration(
  token: string,
  ownerId?: string | null,
): Promise<string | null> {
  const raw = await loadRaw(token);
  if (!raw) return null;

  const copy = await prisma.configuration.create({
    data: {
      publicToken: makeToken(),
      categoryId: raw.categoryId,
      presetId: raw.presetId,
      pricingRuleId: raw.pricingRuleId,
      ownerId: ownerId ?? raw.ownerId,
      name: `${raw.name} (salinan)`,
      source: 'DUPLICATE',
      wizardAnswers: raw.wizardAnswers,
      platform: raw.platform,
      deployment: raw.deployment,
      userTier: raw.userTier,
      items: {
        create: raw.items.map((item) => ({
          featureId: item.featureId,
          origin: item.origin,
          reason: item.reason,
          nameSnapshot: item.nameSnapshot,
          typeSnapshot: item.typeSnapshot,
          manDayMin: item.manDayMin,
          manDayMax: item.manDayMax,
          unitPriceMin: item.unitPriceMin,
          unitPriceMax: item.unitPriceMax,
          sortOrder: item.sortOrder,
        })),
      },
      addOns: {
        create: raw.addOns.map((addOn) => ({
          addOnId: addOn.addOnId,
          nameSnapshot: addOn.nameSnapshot,
          kindSnapshot: addOn.kindSnapshot,
          priceMin: addOn.priceMin,
          priceMax: addOn.priceMax,
          isRecurring: addOn.isRecurring,
          manDayMin: addOn.manDayMin,
          manDayMax: addOn.manDayMax,
        })),
      },
    },
  });

  await recomputeConfiguration(copy.publicToken);
  return copy.publicToken;
}
