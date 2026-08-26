import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { parseJson, parseStringArray } from '@/lib/db/json';
import {
  ACTIVITY_KINDS,
  ADDON_KINDS,
  BUDGET_BANDS,
  COUNTED_CUSTOM_STATUSES,
  CUSTOM_REQUEST_STATUSES,
  FEATURE_TYPES,
  ITEM_ORIGINS,
  LEAD_STAGES,
  LOST_REASONS,
  OVERRIDE_STATUSES,
  PROJECT_DEPLOYMENTS,
  PROJECT_PLATFORMS,
  REQUEST_PRIORITIES,
  REVISION_ACTIONS,
  USER_ROLES,
  USER_TIERS,
  coerceEnum,
  type LostReason,
} from '@/lib/domain/enums';
import { computeFromPayload, getConfiguratorPayload } from '@/lib/services/configuration';
import { getLeadDetail, listLeads } from '@/lib/services/lead';
import { getPricingRuleById } from '@/lib/services/pricing-rule';
import {
  isOpenStage,
  type AddOnItem,
  type CustomItem,
  type FeatureGroupBlock,
  type LeadActivityItem,
  type LeadCardData,
  type LostReasonSummaryRow,
  type OwnerOption,
  type PipelineStats,
  type RevisionItem,
} from '@/components/admin/pipeline/shared';

/**
 * Pembacaan data papan & detail pipeline.
 *
 * Seluruh logika bisnis tetap berada di '@/lib/services/lead'; berkas ini
 * hanya menyusun bentuk data yang siap dirender agar halaman tetap tipis.
 */

// ---------------------------------------------------------------------------
// Papan kanban (O1)
// ---------------------------------------------------------------------------

export interface PipelineBoardData {
  cards: LeadCardData[];
  stats: PipelineStats;
  lostSummary: LostReasonSummaryRow[];
}

export async function loadPipelineBoard(): Promise<PipelineBoardData> {
  const now = new Date();

  const [leads, overdueGroups] = await Promise.all([
    listLeads(),
    // Pengingat yang sudah lewat jatuh tempo dan belum ditutup (O4).
    prisma.leadActivity.groupBy({
      by: ['leadId'],
      where: { dueAt: { lte: now }, doneAt: null },
      _count: { _all: true },
    }),
  ]);

  const overdueByLead = new Map(overdueGroups.map((row) => [row.leadId, row._count._all]));

  const cards: LeadCardData[] = leads.map((lead) => {
    const config = lead.configuration;
    return {
      id: lead.id,
      quoteNumber: lead.quoteNumber,
      contactName: lead.contactName,
      company: lead.company,
      categoryName: config.category.shortName || config.category.name,
      stage: coerceEnum(lead.stage, LEAD_STAGES, 'NEW'),
      ownerName: lead.owner?.name ?? null,
      totalMin: config.totalMin,
      totalMax: config.totalMax,
      grossMarginPct: config.grossMarginPct,
      belowMinMargin: config.belowMinMargin,
      needsDeepDiscovery: lead.needsDeepDiscovery,
      overrideStatus: coerceEnum(lead.overrideStatus, OVERRIDE_STATUSES, 'NONE'),
      lostReason: lead.lostReason
        ? coerceEnum(lead.lostReason, LOST_REASONS, 'LAINNYA')
        : null,
      overdueReminders: overdueByLead.get(lead.id) ?? 0,
      timeSpentSeconds: config.timeSpentSeconds,
      validUntil: lead.validUntil.toISOString(),
    };
  });

  const open = cards.filter((card) => isOpenStage(card.stage));
  const wonCount = cards.filter((card) => card.stage === 'WON').length;
  const lostCount = cards.filter((card) => card.stage === 'LOST').length;
  const closed = wonCount + lostCount;

  const stats: PipelineStats = {
    activeCount: open.length,
    activeValueMin: open.reduce((sum, card) => sum + card.totalMin, 0),
    activeValueMax: open.reduce((sum, card) => sum + card.totalMax, 0),
    wonCount,
    lostCount,
    winRate: closed > 0 ? wonCount / closed : null,
    overdueReminders: cards.reduce((sum, card) => sum + card.overdueReminders, 0),
    pendingOverrides: cards.filter((card) => card.overrideStatus === 'PENDING_APPROVAL').length,
  };

  // O5: agregat alasan kalah. Data inilah yang memperbaiki produk, jadi ia
  // tampil di papan — bukan tersembunyi di laporan terpisah.
  const lostBuckets = new Map<LostReason | null, LostReasonSummaryRow>();
  for (const card of cards) {
    if (card.stage !== 'LOST') continue;
    const key = card.lostReason;
    const bucket = lostBuckets.get(key) ?? { reason: key, count: 0, valueMax: 0 };
    bucket.count += 1;
    bucket.valueMax += card.totalMax;
    lostBuckets.set(key, bucket);
  }
  const lostSummary = [...lostBuckets.values()].sort((a, b) => b.count - a.count);

  return { cards, stats, lostSummary };
}

/** Pengguna yang dapat menerima penugasan lead (O3). */
export async function listAssignableUsers(): Promise<OwnerOption[]> {
  const rows = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['SALES', 'CONSULTANT', 'SUPER_ADMIN'] } },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, role: true },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: coerceEnum(row.role, USER_ROLES, 'SALES'),
  }));
}

// ---------------------------------------------------------------------------
// Detail lead (O2–O6)
// ---------------------------------------------------------------------------

export type LeadDetailView = NonNullable<Awaited<ReturnType<typeof getLeadDetailView>>>;

export async function getLeadDetailView(leadId: string) {
  const lead = await getLeadDetail(leadId);
  if (!lead) return null;

  const config = lead.configuration;

  // Harga dihitung ulang dengan aturan versi konfigurasi ini (BR-07), memakai
  // jalur yang sama persis dengan applyPriceOverride agar pratinjau override di
  // layar sales tidak pernah berbeda dari keputusan server.
  const payload = await getConfiguratorPayload(config.publicToken);
  const breakdown = payload ? computeFromPayload(payload) : null;
  const rule = payload?.rule ?? (await getPricingRuleById(config.pricingRuleId));

  // Nama penyetuju override ditampilkan apa adanya agar jejak persetujuan
  // BR-16 dapat dibaca tanpa membuka audit log.
  const approver = lead.overrideApprovedById
    ? await prisma.user.findUnique({
        where: { id: lead.overrideApprovedById },
        select: { name: true },
      })
    : null;

  const now = Date.now();

  const activities: LeadActivityItem[] = lead.activities.map((activity) => ({
    id: activity.id,
    kind: coerceEnum(activity.kind, ACTIVITY_KINDS, 'NOTE'),
    body: activity.body,
    userName: activity.user?.name ?? null,
    createdAt: activity.createdAt.toISOString(),
    dueAt: activity.dueAt?.toISOString() ?? null,
    doneAt: activity.doneAt?.toISOString() ?? null,
    isOverdue: Boolean(activity.dueAt && !activity.doneAt && activity.dueAt.getTime() <= now),
  }));

  // Fitur dikelompokkan seperti di konfigurator agar tim membaca keranjang
  // dengan struktur yang sama seperti klien menyusunnya.
  const groupOrder: string[] = [];
  const groupMap = new Map<string, FeatureGroupBlock>();
  for (const item of config.items) {
    const groupName = item.feature.group.name;
    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, { groupName, items: [] });
      groupOrder.push(groupName);
    }
    groupMap.get(groupName)!.items.push({
      id: item.id,
      name: item.nameSnapshot,
      type: coerceEnum(item.typeSnapshot, FEATURE_TYPES, 'STANDARD'),
      origin: coerceEnum(item.origin, ITEM_ORIGINS, 'USER'),
      reason: item.reason,
      manDayMin: item.manDayMin,
      manDayMax: item.manDayMax,
      priceMin: item.unitPriceMin,
      priceMax: item.unitPriceMax,
    });
  }
  const featureGroups = groupOrder.map((name) => groupMap.get(name)!);

  const addOns: AddOnItem[] = config.addOns.map((addOn) => ({
    id: addOn.id,
    name: addOn.nameSnapshot,
    kind: coerceEnum(addOn.kindSnapshot, ADDON_KINDS, 'OTHER'),
    priceMin: addOn.priceMin,
    priceMax: addOn.priceMax,
    isRecurring: addOn.isRecurring,
  }));

  const customRequests: CustomItem[] = config.customRequests.map((request) => ({
    id: request.id,
    name: request.name,
    status: coerceEnum(request.status, CUSTOM_REQUEST_STATUSES, 'PENDING'),
    priority: coerceEnum(request.priority, REQUEST_PRIORITIES, 'MUST_HAVE'),
    manDayMin: request.manDayMin,
    manDayMax: request.manDayMax,
    unitPriceMin: request.unitPriceMin,
    unitPriceMax: request.unitPriceMax,
  }));

  const revisions: RevisionItem[] = config.revisions.map((revision) => ({
    id: revision.id,
    version: revision.version,
    action: coerceEnum(revision.action, REVISION_ACTIONS, 'OPTIONS_CHANGED'),
    summary: revision.summary,
    actorLabel: revision.actorLabel,
    totalMin: revision.totalMin,
    totalMax: revision.totalMax,
    createdAt: revision.createdAt.toISOString(),
  }));

  const pendingCustomCount = customRequests.filter(
    (request) => !COUNTED_CUSTOM_STATUSES.includes(request.status),
  ).length;

  return {
    lead: {
      id: lead.id,
      quoteNumber: lead.quoteNumber,
      contactName: lead.contactName,
      company: lead.company,
      email: lead.email,
      whatsapp: lead.whatsapp,
      note: lead.note,
      budgetBand: coerceEnum(lead.budgetBand, BUDGET_BANDS, 'UNKNOWN'),
      stage: coerceEnum(lead.stage, LEAD_STAGES, 'NEW'),
      ownerId: lead.ownerId,
      ownerName: lead.owner?.name ?? null,
      lostReason: lead.lostReason
        ? coerceEnum(lead.lostReason, LOST_REASONS, 'LAINNYA')
        : null,
      lostNote: lead.lostNote,
      needsDeepDiscovery: lead.needsDeepDiscovery,
      marketingConsent: lead.marketingConsent,
      validUntil: lead.validUntil.toISOString(),
      discoveryCallAt: lead.discoveryCallAt?.toISOString() ?? null,
      // Sumber trafik lead lebih spesifik daripada milik konfigurasi (O2).
      trafficSource: lead.trafficSource ?? config.trafficSource,
      utm: parseJson<Record<string, string>>(lead.utm, {}),
      createdAt: lead.createdAt.toISOString(),
    },
    override: {
      status: coerceEnum(lead.overrideStatus, OVERRIDE_STATUSES, 'NONE'),
      value: lead.overridePriceValue,
      pct: lead.overridePricePct,
      reason: lead.overrideReason,
      approvedByName: approver?.name ?? null,
      approvedAt: lead.overrideApprovedAt?.toISOString() ?? null,
    },
    configuration: {
      id: config.id,
      name: config.name,
      publicToken: config.publicToken,
      categoryName: config.category.name,
      presetName: config.preset?.name ?? null,
      platform: coerceEnum(config.platform, PROJECT_PLATFORMS, 'WEB'),
      deployment: coerceEnum(config.deployment, PROJECT_DEPLOYMENTS, 'OUR_CLOUD'),
      userTier: coerceEnum(config.userTier, USER_TIERS, 'T10'),
      totalMin: config.totalMin,
      totalMax: config.totalMax,
      setupFee: config.setupFee,
      discountPct: config.discountPct,
      recurringMonthlyMin: config.recurringMonthlyMin,
      recurringMonthlyMax: config.recurringMonthlyMax,
      durationWeeksMin: config.durationWeeksMin,
      durationWeeksMax: config.durationWeeksMax,
      grossMarginPct: config.grossMarginPct,
      cogsProjection: config.cogsProjection,
      customSharePct: config.customSharePct,
      belowMinMargin: config.belowMinMargin,
      exceedsCustomShare: config.exceedsCustomShare,
      isPriceLocked: config.isPriceLocked,
      lockedPrice: config.lockedPrice,
      lockedUntil: config.lockedUntil?.toISOString() ?? null,
      timeSpentSeconds: config.timeSpentSeconds,
      submittedAt: config.submittedAt?.toISOString() ?? null,
      guardrailNotes: parseStringArray(config.guardrailNotes),
    },
    featureGroups,
    addOns,
    customRequests,
    pendingCustomCount,
    revisions,
    activities,
    rule,
    breakdown,
  };
}
