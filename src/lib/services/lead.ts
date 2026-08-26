import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { stringifyJson } from '@/lib/db/json';
import { allocateDocumentNumbers } from '@/lib/db/document-number';
import {
  type ActivityKind,
  type BudgetBand,
  type LeadStage,
  type LostReason,
} from '@/lib/domain/enums';
import { evaluatePriceOverride, type PriceBreakdown } from '@/lib/pricing';
import {
  computeFromPayload,
  getConfiguratorPayload,
  recomputeConfiguration,
} from './configuration';
import { getPricingRuleById } from './pricing-rule';

/** Nomor penawaran berurutan per tahun: RKT-2026-0001. */
async function reserveQuoteNumber(): Promise<string> {
  const [number] = await allocateDocumentNumbers('RKT', 1);
  return number;
}

export interface SubmitConfigurationInput {
  token: string;
  contactName: string;
  company?: string;
  email: string;
  whatsapp: string;
  budgetBand?: BudgetBand;
  note?: string;
  marketingConsent?: boolean;
  trafficSource?: string | null;
  ownerId?: string | null;
}

export interface SubmitConfigurationResult {
  ok: boolean;
  error?: string;
  quoteNumber?: string;
  leadId?: string;
  /** true bila penawaran tidak dapat terbit otomatis dan butuh discovery (BR-15). */
  needsDeepDiscovery?: boolean;
  /** true bila masih ada fitur custom yang menunggu estimasi (BR-02). */
  awaitingCustomEstimate?: boolean;
  /** Pesan ramah untuk klien bila konfigurasi ditolak pagar pengaman. */
  guardrailMessage?: string | null;
  breakdown?: PriceBreakdown;
}

/**
 * Mengirim konfigurasi menjadi penawaran.
 *
 * Di titik ini konfigurasi membeku (PRD bagian 10): seluruh atribut fitur dan
 * hasil perhitungan disimpan sebagai snapshot, sehingga perubahan katalog atau
 * tarif setelahnya tidak mengubah penawaran yang sudah terbit (BR-07).
 */
export async function submitConfiguration(
  input: SubmitConfigurationInput,
): Promise<SubmitConfigurationResult> {
  const payload = await getConfiguratorPayload(input.token);
  if (!payload) return { ok: false, error: 'Konfigurasi tidak ditemukan.' };

  if (payload.configuration.status !== 'DRAFT') {
    const existing = await prisma.lead.findUnique({
      where: { configurationId: payload.configuration.id },
      select: { id: true, quoteNumber: true },
    });
    return {
      ok: true,
      quoteNumber: existing?.quoteNumber,
      leadId: existing?.id,
      error: 'Konfigurasi ini sudah pernah dikirim.',
    };
  }

  const breakdown = computeFromPayload(payload);

  // BR-13: nilai proyek minimum. Penolakan disampaikan halus dan selalu
  // menawarkan jalan keluar, bukan sekadar menutup pintu.
  const blockingValue = breakdown.guardrails.find(
    (g) => g.code === 'BELOW_MIN_PROJECT_VALUE',
  );
  if (blockingValue) {
    return {
      ok: false,
      error: 'BELOW_MIN_PROJECT_VALUE',
      guardrailMessage: blockingValue.clientMessage,
      breakdown,
    };
  }

  const exceedsCustom = breakdown.guardrails.some((g) => g.code === 'EXCEEDS_CUSTOM_SHARE');
  const awaitingCustomEstimate = breakdown.pendingCustomCount > 0;

  const rule = payload.rule;
  const now = new Date();
  const validUntil = new Date(now.getTime() + rule.quoteValidityDays * 86_400_000);

  const quoteNumber = await reserveQuoteNumber();

  const status = awaitingCustomEstimate ? 'AWAITING_CUSTOM_ESTIMATE' : 'SUBMITTED';

  const lead = await prisma.$transaction(async (tx) => {
    // Bekukan snapshot harga satuan tiap item.
    for (const line of breakdown.lines) {
      if (line.type === 'CUSTOM') continue;
      await tx.configurationItem.updateMany({
        where: { configurationId: payload.configuration.id, featureId: line.id },
        data: {
          nameSnapshot: line.name,
          typeSnapshot: line.type,
          manDayMin: line.manDayMin,
          manDayMax: line.manDayMax,
          unitPriceMin: line.priceMin,
          unitPriceMax: line.priceMax,
          effortManDay: line.effortManDayMax,
        },
      });
    }

    await tx.configuration.update({
      where: { id: payload.configuration.id },
      data: {
        status,
        submittedAt: now,
        trafficSource: input.trafficSource ?? undefined,
        exceedsCustomShare: exceedsCustom,
      },
    });

    await tx.priceSnapshot.create({
      data: {
        configurationId: payload.configuration.id,
        pricingRuleId: breakdown.ruleId,
        reason: 'SUBMIT',
        payload: stringifyJson(breakdown),
        totalMin: breakdown.totalMin,
        totalMax: breakdown.totalMax,
      },
    });

    const createdLead = await tx.lead.create({
      data: {
        quoteNumber,
        configurationId: payload.configuration.id,
        contactName: input.contactName.trim(),
        company: input.company?.trim() || null,
        email: input.email.trim().toLowerCase(),
        whatsapp: input.whatsapp.trim(),
        budgetBand: input.budgetBand ?? 'UNKNOWN',
        note: input.note?.trim() || null,
        stage: 'NEW',
        ownerId: input.ownerId ?? null,
        needsDeepDiscovery: exceedsCustom,
        validUntil,
        trafficSource: input.trafficSource ?? null,
        marketingConsent: input.marketingConsent ?? false,
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId: createdLead.id,
        kind: 'SYSTEM',
        body:
          `Konfigurasi dikirim dari konfigurator. Nilai ${formatShort(breakdown.totalMin)}–` +
          `${formatShort(breakdown.totalMax)}, proyeksi gross margin ` +
          `${(breakdown.internal.grossMarginPct * 100).toFixed(1)}%.`,
      },
    });

    if (exceedsCustom) {
      await tx.leadActivity.create({
        data: {
          leadId: createdLead.id,
          kind: 'SYSTEM',
          body:
            'Ditandai "perlu discovery mendalam": porsi fitur custom melebihi 40% nilai proyek ' +
            '(BR-15). Penawaran final tidak terbit otomatis.',
        },
      });
    }

    if (awaitingCustomEstimate) {
      await tx.leadActivity.create({
        data: {
          leadId: createdLead.id,
          kind: 'SYSTEM',
          body:
            `${breakdown.pendingCustomCount} fitur custom menunggu estimasi tim. ` +
            'Total belum final sampai antrean review selesai (BR-02).',
        },
      });
    }

    const lastRevision = await tx.configurationRevision.findFirst({
      where: { configurationId: payload.configuration.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    await tx.configurationRevision.create({
      data: {
        configurationId: payload.configuration.id,
        version: (lastRevision?.version ?? 0) + 1,
        action: 'SUBMITTED',
        summary: `Penawaran ${quoteNumber} diterbitkan`,
        detail: stringifyJson({ quoteNumber, validUntil }),
        totalMin: breakdown.totalMin,
        totalMax: breakdown.totalMax,
      },
    });

    return createdLead;
  });

  return {
    ok: true,
    quoteNumber,
    leadId: lead.id,
    needsDeepDiscovery: exceedsCustom,
    awaitingCustomEstimate,
    breakdown,
  };
}

function formatShort(value: number): string {
  return `Rp ${Math.round(value / 1_000_000).toLocaleString('id-ID')} jt`;
}

// ---------------------------------------------------------------------------
// Pipeline (O)
// ---------------------------------------------------------------------------

export async function listLeads(filter?: { stage?: LeadStage; ownerId?: string }) {
  return prisma.lead.findMany({
    where: {
      ...(filter?.stage ? { stage: filter.stage } : {}),
      ...(filter?.ownerId ? { ownerId: filter.ownerId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      owner: { select: { id: true, name: true } },
      configuration: {
        select: {
          publicToken: true,
          totalMin: true,
          totalMax: true,
          grossMarginPct: true,
          cogsProjection: true,
          customSharePct: true,
          durationWeeksMin: true,
          durationWeeksMax: true,
          timeSpentSeconds: true,
          belowMinMargin: true,
          exceedsCustomShare: true,
          category: { select: { name: true, shortName: true, slug: true } },
          _count: { select: { items: true, customRequests: true } },
        },
      },
    },
  });
}

export async function getLeadDetail(leadId: string) {
  return prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
      configuration: {
        include: {
          category: true,
          preset: { select: { name: true } },
          items: { orderBy: { sortOrder: 'asc' }, include: { feature: { select: { slug: true, group: { select: { name: true } } } } } },
          customRequests: { orderBy: { createdAt: 'asc' } },
          addOns: true,
          revisions: { orderBy: { version: 'desc' }, take: 30 },
          priceSnapshots: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      },
    },
  });
}

export async function moveLeadStage(
  leadId: string,
  stage: LeadStage,
  userId: string,
  options?: { lostReason?: LostReason; lostNote?: string },
): Promise<{ ok: boolean; error?: string }> {
  // O5: alasan kalah wajib diisi — data ini yang memperbaiki produk.
  if (stage === 'LOST' && !options?.lostReason) {
    return { ok: false, error: 'Alasan kalah wajib diisi sebelum memindahkan ke kolom Kalah.' };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { stage: true } });
  if (!lead) return { ok: false, error: 'Lead tidak ditemukan.' };

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        stage,
        lostReason: stage === 'LOST' ? options?.lostReason : null,
        lostNote: stage === 'LOST' ? (options?.lostNote ?? null) : null,
      },
    }),
    prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        kind: 'STAGE_CHANGE',
        body:
          `Tahap dipindahkan dari ${lead.stage} ke ${stage}` +
          (options?.lostReason ? ` — alasan: ${options.lostReason}` : '') +
          (options?.lostNote ? `. ${options.lostNote}` : ''),
      },
    }),
  ]);

  return { ok: true };
}

export async function addLeadActivity(
  leadId: string,
  userId: string,
  kind: ActivityKind,
  body: string,
  dueAt?: Date,
): Promise<void> {
  await prisma.leadActivity.create({
    data: { leadId, userId, kind, body, dueAt: dueAt ?? null },
  });
  await prisma.lead.update({ where: { id: leadId }, data: { updatedAt: new Date() } });
}

export async function assignLead(leadId: string, ownerId: string, actorId: string): Promise<void> {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { name: true } });
  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { ownerId } }),
    prisma.leadActivity.create({
      data: {
        leadId,
        userId: actorId,
        kind: 'SYSTEM',
        body: `Lead ditugaskan kepada ${owner?.name ?? 'pengguna'}.`,
      },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Override harga (O6, BR-16)
// ---------------------------------------------------------------------------

export interface OverrideInput {
  leadId: string;
  userId: string;
  requestedPrice: number;
  reason: string;
  /** true bila pengguna berwenang menyetujui override di luar kuota. */
  canApprove: boolean;
}

export interface OverrideResult {
  ok: boolean;
  error?: string;
  needsApproval: boolean;
  message: string;
  resultingMarginPct: number;
}

/**
 * Menerapkan override harga oleh sales.
 *
 * Tanpa kuota, diskon menjadi jalan pintas default setiap sales yang kesulitan
 * menutup deal (PRD 6.8 butir 4). Karena itu penegakan ada di sistem, bukan
 * pada disiplin manusia.
 */
export async function applyPriceOverride(input: OverrideInput): Promise<OverrideResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    include: { configuration: { select: { publicToken: true, pricingRuleId: true } } },
  });
  if (!lead) {
    return { ok: false, needsApproval: false, message: 'Lead tidak ditemukan.', resultingMarginPct: 0 };
  }
  if (!input.reason.trim()) {
    return {
      ok: false,
      needsApproval: false,
      message: 'Alasan override wajib diisi dan akan tercatat permanen.',
      resultingMarginPct: 0,
    };
  }

  const payload = await getConfiguratorPayload(lead.configuration.publicToken);
  if (!payload) {
    return { ok: false, needsApproval: false, message: 'Konfigurasi tidak ditemukan.', resultingMarginPct: 0 };
  }

  const rule = (await getPricingRuleById(lead.configuration.pricingRuleId)) ?? payload.rule;
  const breakdown = computeFromPayload(payload);
  const evaluation = evaluatePriceOverride(rule, breakdown, input.requestedPrice);

  const approvedNow = !evaluation.needsApproval || input.canApprove;

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: input.leadId },
      data: {
        overridePricePct: evaluation.requestedPct,
        overridePriceValue: input.requestedPrice,
        overrideReason: input.reason.trim(),
        overrideStatus: approvedNow ? 'APPROVED' : 'PENDING_APPROVAL',
        overrideApprovedById: approvedNow ? input.userId : null,
        overrideApprovedAt: approvedNow ? new Date() : null,
      },
    }),
    prisma.leadActivity.create({
      data: {
        leadId: input.leadId,
        userId: input.userId,
        kind: 'OVERRIDE',
        body:
          `Override harga ke ${formatShort(input.requestedPrice)} ` +
          `(${(evaluation.requestedPct * 100).toFixed(1)}% dari penawaran). ` +
          `Alasan: ${input.reason.trim()}. ${evaluation.message}` +
          (approvedNow ? '' : ' Menunggu persetujuan.'),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: input.userId,
        entity: 'Lead',
        entityId: input.leadId,
        action: 'PRICE_OVERRIDE',
        summary: `Override harga ${(evaluation.requestedPct * 100).toFixed(1)}%`,
        before: stringifyJson({ totalMax: breakdown.totalMax }),
        after: stringifyJson({
          requestedPrice: input.requestedPrice,
          reason: input.reason,
          approved: approvedNow,
          marginPct: evaluation.resultingMarginPct,
        }),
      },
    }),
  ]);

  return {
    ok: true,
    needsApproval: evaluation.needsApproval && !input.canApprove,
    message: evaluation.message,
    resultingMarginPct: evaluation.resultingMarginPct,
  };
}

/**
 * Mengunci harga tetap setelah discovery call (6.9, BR-11).
 * Berlaku selama masa berlaku penawaran, lalu harus dihitung ulang.
 */
export async function lockPrice(
  leadId: string,
  userId: string,
  lockedPrice: number,
): Promise<{ ok: boolean; error?: string; lockedUntil?: Date }> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { configuration: { select: { id: true, publicToken: true, pricingRuleId: true } } },
  });
  if (!lead) return { ok: false, error: 'Lead tidak ditemukan.' };

  const rule = await getPricingRuleById(lead.configuration.pricingRuleId);
  const validityDays = rule?.quoteValidityDays ?? 30;
  const lockedUntil = new Date(Date.now() + validityDays * 86_400_000);

  await prisma.$transaction([
    prisma.configuration.update({
      where: { id: lead.configuration.id },
      data: {
        status: 'LOCKED',
        isPriceLocked: true,
        lockedPrice,
        lockedAt: new Date(),
        lockedUntil,
        lockedById: userId,
      },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: { stage: 'FINAL_PROPOSAL', validUntil: lockedUntil },
    }),
    prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        kind: 'SYSTEM',
        body:
          `Harga dikunci di ${formatShort(lockedPrice)}, berlaku ${validityDays} hari ` +
          `sampai ${lockedUntil.toLocaleDateString('id-ID')}.`,
      },
    }),
  ]);

  await recomputeConfiguration(lead.configuration.publicToken);
  return { ok: true, lockedUntil };
}
