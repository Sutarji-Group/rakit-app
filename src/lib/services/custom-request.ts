import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { stringifyJson } from '@/lib/db/json';
import type { CustomRequestStatus, RequestPriority, RiskLevel } from '@/lib/domain/enums';
import { validateRangeWidth } from '@/lib/pricing';
import { getActivePricingRule } from './pricing-rule';
import { recomputeConfiguration } from './configuration';

/** Batas jumlah fitur custom per konfigurasi (BR-03 / D3). */
export const MAX_CUSTOM_PER_CONFIGURATION = 5;

/**
 * Menghitung tenggat SLA 1×24 jam kerja (BR-04).
 *
 * Jam kerja diasumsikan Senin–Jumat. Permintaan yang masuk pada akhir pekan
 * mulai dihitung sejak Senin, sehingga penghitung SLA di antrean tidak
 * langsung merah pada Senin pagi tanpa ada yang bersalah.
 */
export function computeSlaDueAt(from: Date = new Date()): Date {
  const due = new Date(from);
  const day = due.getDay();

  if (day === 6) {
    // Sabtu → mulai Senin.
    due.setDate(due.getDate() + 2);
  } else if (day === 0) {
    // Minggu → mulai Senin.
    due.setDate(due.getDate() + 1);
  }

  due.setTime(due.getTime() + 86_400_000);

  // Bila tenggat jatuh di akhir pekan, geser ke Senin.
  const dueDay = due.getDay();
  if (dueDay === 6) due.setDate(due.getDate() + 2);
  if (dueDay === 0) due.setDate(due.getDate() + 1);

  return due;
}

export interface CreateCustomRequestInput {
  configurationToken: string;
  groupId?: string | null;
  name: string;
  problem: string;
  userRoles: string;
  flowSteps: string[];
  priority: RequestPriority;
  referenceLinks?: string[];
  attachments?: Array<{ name: string; url: string; kind: string }>;
}

export interface CreateCustomRequestResult {
  ok: boolean;
  error?: string;
  /** true bila klien sudah mencapai batas dan harus diarahkan ke konsultasi (D3). */
  redirectToConsultation?: boolean;
  requestId?: string;
}

/**
 * Mencatat pengajuan fitur custom.
 *
 * Formulir sengaja terstruktur, bukan textarea kosong (D2): input bebas
 * menghasilkan permintaan yang tidak bisa diestimasi, dan itulah yang membuat
 * SLA 1×24 jam mustahil dipenuhi.
 */
export async function createCustomRequest(
  input: CreateCustomRequestInput,
): Promise<CreateCustomRequestResult> {
  const configuration = await prisma.configuration.findUnique({
    where: { publicToken: input.configurationToken },
    include: { _count: { select: { customRequests: true } } },
  });

  if (!configuration) return { ok: false, error: 'Konfigurasi tidak ditemukan.' };
  if (configuration.status !== 'DRAFT') {
    return { ok: false, error: 'Konfigurasi ini sudah dikirim dan tidak dapat diubah lagi.' };
  }

  // BR-03: lebih dari lima fitur custom berarti konfigurator bukan alat yang
  // tepat untuk kebutuhan ini.
  if (configuration._count.customRequests >= MAX_CUSTOM_PER_CONFIGURATION) {
    return {
      ok: false,
      redirectToConsultation: true,
      error:
        `Anda sudah mengajukan ${MAX_CUSTOM_PER_CONFIGURATION} fitur khusus. ` +
        'Kebutuhan sebanyak ini lebih baik dibahas langsung — mari jadwalkan konsultasi.',
    };
  }

  const created = await prisma.customFeatureRequest.create({
    data: {
      configurationId: configuration.id,
      groupId: input.groupId ?? null,
      name: input.name.trim().slice(0, 160),
      problem: input.problem.trim(),
      userRoles: input.userRoles.trim(),
      flowSteps: stringifyJson(input.flowSteps.filter((s) => s.trim().length > 0)),
      priority: input.priority,
      referenceLinks: stringifyJson(input.referenceLinks ?? []),
      attachments: stringifyJson(input.attachments ?? []),
      status: 'PENDING',
      slaDueAt: computeSlaDueAt(),
    },
  });

  await recomputeConfiguration(input.configurationToken);
  return { ok: true, requestId: created.id };
}

export async function deleteCustomRequest(
  configurationToken: string,
  requestId: string,
): Promise<boolean> {
  const configuration = await prisma.configuration.findUnique({
    where: { publicToken: configurationToken },
  });
  if (!configuration || configuration.status !== 'DRAFT') return false;

  const deleted = await prisma.customFeatureRequest.deleteMany({
    where: { id: requestId, configurationId: configuration.id },
  });
  if (deleted.count === 0) return false;

  await recomputeConfiguration(configurationToken);
  return true;
}

// ---------------------------------------------------------------------------
// Antrean review internal (N)
// ---------------------------------------------------------------------------

export type SlaHealth = 'HIJAU' | 'KUNING' | 'MERAH';

/** Penghitung SLA hijau/kuning/merah untuk antrean (N1). */
export function slaHealth(dueAt: Date, now: Date = new Date()): SlaHealth {
  const remainingMs = dueAt.getTime() - now.getTime();
  if (remainingMs < 0) return 'MERAH';
  if (remainingMs < 4 * 3_600_000) return 'KUNING';
  return 'HIJAU';
}

export async function listCustomQueue(filter?: { status?: CustomRequestStatus[] }) {
  return prisma.customFeatureRequest.findMany({
    where: filter?.status ? { status: { in: filter.status } } : undefined,
    orderBy: [{ status: 'asc' }, { slaDueAt: 'asc' }],
    include: {
      reviewer: { select: { id: true, name: true } },
      configuration: {
        select: {
          publicToken: true,
          name: true,
          totalMax: true,
          category: { select: { name: true, shortName: true, slug: true } },
          lead: { select: { contactName: true, company: true, email: true, quoteNumber: true } },
        },
      },
    },
  });
}

export interface EstimateInput {
  requestId: string;
  reviewerId: string;
  manDayMin: number;
  manDayMax: number;
  riskLevel: RiskLevel;
  internalNote?: string;
}

export interface EstimateResult {
  ok: boolean;
  error?: string;
  /** true bila estimasi melampaui ambang dan sistem menawarkan konsultasi (D7). */
  consultRequired?: boolean;
}

/**
 * Menyimpan estimasi tim atas satu fitur custom (N3, N4).
 *
 * Bila effort melampaui ambang, sistem sengaja tidak memberi angka melainkan
 * menawarkan sesi konsultasi (D7): estimasi besar yang dilempar tanpa diskusi
 * adalah sumber utama meleset dua kali lipat.
 */
export async function submitEstimate(input: EstimateInput): Promise<EstimateResult> {
  const rule = await getActivePricingRule();

  const width = validateRangeWidth(rule, 'CUSTOM', input.manDayMin, input.manDayMax);
  if (!width.valid) {
    return { ok: false, error: width.message ?? 'Rentang estimasi tidak sah.' };
  }

  const request = await prisma.customFeatureRequest.findUnique({
    where: { id: input.requestId },
    include: { configuration: { select: { publicToken: true } } },
  });
  if (!request) return { ok: false, error: 'Permintaan tidak ditemukan.' };

  const consultRequired = input.manDayMax > rule.customManDayConsultThreshold;

  await prisma.customFeatureRequest.update({
    where: { id: input.requestId },
    data: {
      status: consultRequired ? 'CONSULT_REQUIRED' : 'ESTIMATED',
      manDayMin: input.manDayMin,
      manDayMax: input.manDayMax,
      unitPriceMin: Math.round(
        input.manDayMin * rule.referenceRatePerManDay * rule.multiplierCustom,
      ),
      unitPriceMax: Math.round(
        input.manDayMax * rule.referenceRatePerManDay * rule.multiplierCustom,
      ),
      riskLevel: input.riskLevel,
      internalNote: input.internalNote,
      reviewerId: input.reviewerId,
      estimatedAt: new Date(),
    },
  });

  await recomputeConfiguration(request.configuration.publicToken);
  return { ok: true, consultRequired };
}

export async function requestClarification(
  requestId: string,
  reviewerId: string,
  question: string,
): Promise<boolean> {
  const updated = await prisma.customFeatureRequest.updateMany({
    where: { id: requestId },
    data: {
      status: 'NEEDS_CLARIFICATION',
      clarificationQuestion: question,
      reviewerId,
    },
  });
  return updated.count > 0;
}

export async function rejectRequest(
  requestId: string,
  reviewerId: string,
  reason: string,
): Promise<boolean> {
  const request = await prisma.customFeatureRequest.findUnique({
    where: { id: requestId },
    include: { configuration: { select: { publicToken: true } } },
  });
  if (!request) return false;

  await prisma.customFeatureRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED', rejectReason: reason, reviewerId },
  });
  await recomputeConfiguration(request.configuration.publicToken);
  return true;
}

export async function claimRequest(requestId: string, reviewerId: string): Promise<boolean> {
  const updated = await prisma.customFeatureRequest.updateMany({
    where: { id: requestId, status: { in: ['PENDING', 'NEEDS_CLARIFICATION'] } },
    data: { status: 'IN_REVIEW', reviewerId },
  });
  return updated.count > 0;
}

// ---------------------------------------------------------------------------
// Promosi ke katalog (N5) — mekanisme flywheel produk
// ---------------------------------------------------------------------------

export interface PromoteInput {
  requestId: string;
  categoryId: string;
  groupId: string;
  slug: string;
  name: string;
  clientDescription: string;
  internalDescription?: string;
  /** Tipe target — biasanya STANDARD atau CONFIGURABLE, bukan CUSTOM lagi. */
  type: 'STANDARD' | 'CONFIGURABLE';
  manDayMin: number;
  manDayMax: number;
  publishNow?: boolean;
}

export interface PromoteResult {
  ok: boolean;
  error?: string;
  featureId?: string;
}

/**
 * Mengubah fitur custom yang sering diminta menjadi entri katalog permanen.
 *
 * Ini roda gila produk (PRD 2.3): setiap promosi secara bersamaan menaikkan
 * margin kita dan menurunkan harga jual bagi klien berikutnya, karena fitur
 * berpindah dari pengali 1,5× ke 0,55× atau 1,0×.
 */
export async function promoteToCatalog(input: PromoteInput): Promise<PromoteResult> {
  const rule = await getActivePricingRule();
  const width = validateRangeWidth(rule, input.type, input.manDayMin, input.manDayMax);
  if (!width.valid) {
    return { ok: false, error: width.message ?? 'Rentang man-day tidak sah untuk tipe ini.' };
  }

  const existing = await prisma.feature.findUnique({
    where: { categoryId_slug: { categoryId: input.categoryId, slug: input.slug } },
  });
  if (existing) {
    return { ok: false, error: `Slug "${input.slug}" sudah dipakai fitur lain di kategori ini.` };
  }

  const lastOrder = await prisma.feature.findFirst({
    where: { groupId: input.groupId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const feature = await prisma.feature.create({
    data: {
      categoryId: input.categoryId,
      groupId: input.groupId,
      slug: input.slug,
      name: input.name,
      clientDescription: input.clientDescription,
      internalDescription: input.internalDescription,
      type: input.type,
      manDayMin: input.manDayMin,
      manDayMax: input.manDayMax,
      status: input.publishNow ? 'PUBLISHED' : 'DRAFT',
      sortOrder: (lastOrder?.sortOrder ?? 0) + 1,
      promotedFromRequestId: input.requestId,
      lastReviewedAt: new Date(),
    },
  });

  await prisma.customFeatureRequest.update({
    where: { id: input.requestId },
    data: { status: 'PROMOTED', promotedFeatureId: feature.id },
  });

  await prisma.auditLog.create({
    data: {
      entity: 'Feature',
      entityId: feature.id,
      action: 'PROMOTE_FROM_CUSTOM',
      summary: `Fitur "${input.name}" dipromosikan dari antrean custom ke katalog.`,
      after: stringifyJson({ type: input.type, manDayMin: input.manDayMin, manDayMax: input.manDayMax }),
    },
  });

  return { ok: true, featureId: feature.id };
}

/**
 * Kandidat promosi: fitur custom yang paling sering diminta (Q3).
 * Pengelompokan memakai nama yang dinormalkan karena klien menuliskan
 * kebutuhan yang sama dengan kalimat berbeda-beda.
 */
export async function listPromotionCandidates(minCount = 2) {
  const requests = await prisma.customFeatureRequest.findMany({
    where: { status: { in: ['ESTIMATED', 'PENDING', 'IN_REVIEW', 'CONSULT_REQUIRED'] } },
    select: {
      id: true,
      name: true,
      manDayMin: true,
      manDayMax: true,
      createdAt: true,
      configuration: { select: { category: { select: { slug: true, shortName: true } } } },
    },
  });

  const buckets = new Map<
    string,
    {
      label: string;
      categorySlug: string;
      categoryName: string;
      count: number;
      requestIds: string[];
      manDayMinAvg: number;
      manDayMaxAvg: number;
      lastRequestedAt: Date;
    }
  >();

  for (const request of requests) {
    const key = `${request.configuration.category.slug}::${normalizeName(request.name)}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.requestIds.push(request.id);
      if (request.manDayMin) bucket.manDayMinAvg += request.manDayMin;
      if (request.manDayMax) bucket.manDayMaxAvg += request.manDayMax;
      if (request.createdAt > bucket.lastRequestedAt) bucket.lastRequestedAt = request.createdAt;
    } else {
      buckets.set(key, {
        label: request.name,
        categorySlug: request.configuration.category.slug,
        categoryName: request.configuration.category.shortName,
        count: 1,
        requestIds: [request.id],
        manDayMinAvg: request.manDayMin ?? 0,
        manDayMaxAvg: request.manDayMax ?? 0,
        lastRequestedAt: request.createdAt,
      });
    }
  }

  return [...buckets.values()]
    .filter((b) => b.count >= minCount)
    .map((b) => ({
      ...b,
      manDayMinAvg: b.count > 0 ? Number((b.manDayMinAvg / b.count).toFixed(1)) : 0,
      manDayMaxAvg: b.count > 0 ? Number((b.manDayMaxAvg / b.count).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .sort()
    .join(' ');
}
