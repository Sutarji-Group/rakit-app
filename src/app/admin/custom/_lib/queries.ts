import 'server-only';

import { notFound } from 'next/navigation';

import { parseJson, parseStringArray } from '@/lib/db/json';
import { prisma } from '@/lib/db/prisma';
import {
  CONFIGURATION_STATUSES,
  CUSTOM_REQUEST_STATUSES,
  REQUEST_PRIORITIES,
  RISK_LEVELS,
  coerceEnum,
  type ConfigurationStatus,
  type CustomRequestStatus,
  type RequestPriority,
  type RiskLevel,
} from '@/lib/domain/enums';

/** Lampiran referensi yang diunggah/ditempel klien saat mengajukan (D2). */
export interface RequestAttachment {
  name: string;
  url: string;
  kind: string;
}

/**
 * Konteks rakitan tempat permintaan ini lahir (N2).
 *
 * Reviewer perlu tahu apakah yang sedang ia estimasi menempel pada prospek
 * Rp 60 juta atau Rp 300 juta: usaha review yang layak untuk keduanya berbeda,
 * begitu pula keputusan menolak atau menawarkan konsultasi.
 */
export interface RequestContext {
  name: string;
  publicToken: string;
  status: ConfigurationStatus;
  featureCount: number;
  customCount: number;
  totalMin: number;
  totalMax: number;
  grossMarginPct: number;
  customSharePct: number;
  categoryId: string;
  categoryName: string;
  categoryShortName: string;
  createdAt: Date;
  contactName: string | null;
  company: string | null;
  email: string | null;
  whatsapp: string | null;
  quoteNumber: string | null;
  leadStage: string | null;
}

export interface CustomRequestDetail {
  id: string;
  name: string;
  status: CustomRequestStatus;
  priority: RequestPriority;
  problem: string;
  userRoles: string;
  flowSteps: string[];
  referenceLinks: string[];
  attachments: RequestAttachment[];
  manDayMin: number | null;
  manDayMax: number | null;
  unitPriceMin: number | null;
  unitPriceMax: number | null;
  riskLevel: RiskLevel | null;
  internalNote: string | null;
  clarificationQuestion: string | null;
  clarificationAnswer: string | null;
  rejectReason: string | null;
  reviewerName: string | null;
  slaDueAt: Date;
  estimatedAt: Date | null;
  createdAt: Date;
  promotedFeatureId: string | null;
  promotedFeatureName: string | null;
  promotedCategorySlug: string | null;
  groupName: string | null;
  context: RequestContext;
}

/** Detail satu permintaan beserta konteks komersialnya (N2). */
export async function getCustomRequestDetail(id: string): Promise<CustomRequestDetail> {
  const request = await prisma.customFeatureRequest.findUnique({
    where: { id },
    include: {
      reviewer: { select: { name: true } },
      configuration: {
        select: {
          name: true,
          publicToken: true,
          status: true,
          totalMin: true,
          totalMax: true,
          grossMarginPct: true,
          customSharePct: true,
          createdAt: true,
          category: { select: { id: true, name: true, shortName: true } },
          lead: {
            select: {
              contactName: true,
              company: true,
              email: true,
              whatsapp: true,
              quoteNumber: true,
              stage: true,
            },
          },
          owner: { select: { name: true, email: true, company: true, phone: true } },
          _count: { select: { items: true, customRequests: true } },
        },
      },
    },
  });

  if (!request) notFound();

  const configuration = request.configuration;
  const lead = configuration.lead;
  const owner = configuration.owner;

  // Fitur katalog hasil promosi disimpan sebagai id lepas (bukan relasi), jadi
  // namanya diambil terpisah agar halaman detail dapat menautkannya.
  const promoted = request.promotedFeatureId
    ? await prisma.feature.findUnique({
        where: { id: request.promotedFeatureId },
        select: { name: true, category: { select: { slug: true } } },
      })
    : null;

  const group = request.groupId
    ? await prisma.featureGroup.findUnique({
        where: { id: request.groupId },
        select: { name: true },
      })
    : null;

  return {
    id: request.id,
    name: request.name,
    status: coerceEnum(request.status, CUSTOM_REQUEST_STATUSES, 'PENDING'),
    priority: coerceEnum(request.priority, REQUEST_PRIORITIES, 'MUST_HAVE'),
    problem: request.problem,
    userRoles: request.userRoles,
    flowSteps: parseStringArray(request.flowSteps),
    referenceLinks: parseStringArray(request.referenceLinks),
    attachments: parseJson<RequestAttachment[]>(request.attachments, []),
    manDayMin: request.manDayMin,
    manDayMax: request.manDayMax,
    unitPriceMin: request.unitPriceMin,
    unitPriceMax: request.unitPriceMax,
    riskLevel: request.riskLevel
      ? coerceEnum(request.riskLevel, RISK_LEVELS, 'MEDIUM')
      : null,
    internalNote: request.internalNote,
    clarificationQuestion: request.clarificationQuestion,
    clarificationAnswer: request.clarificationAnswer,
    rejectReason: request.rejectReason,
    reviewerName: request.reviewer?.name ?? null,
    slaDueAt: request.slaDueAt,
    estimatedAt: request.estimatedAt,
    createdAt: request.createdAt,
    promotedFeatureId: request.promotedFeatureId,
    promotedFeatureName: promoted?.name ?? null,
    promotedCategorySlug: promoted?.category.slug ?? null,
    groupName: group?.name ?? null,
    context: {
      name: configuration.name,
      publicToken: configuration.publicToken,
      status: coerceEnum(configuration.status, CONFIGURATION_STATUSES, 'DRAFT'),
      featureCount: configuration._count.items,
      customCount: configuration._count.customRequests,
      totalMin: configuration.totalMin,
      totalMax: configuration.totalMax,
      grossMarginPct: configuration.grossMarginPct,
      customSharePct: configuration.customSharePct,
      categoryId: configuration.category.id,
      categoryName: configuration.category.name,
      categoryShortName: configuration.category.shortName,
      createdAt: configuration.createdAt,
      // Rakitan yang belum dikirim belum punya Lead, sehingga kontaknya jatuh
      // ke pemilik akun bila klien sudah masuk saat merakit.
      contactName: lead?.contactName ?? owner?.name ?? null,
      company: lead?.company ?? owner?.company ?? null,
      email: lead?.email ?? owner?.email ?? null,
      whatsapp: lead?.whatsapp ?? owner?.phone ?? null,
      quoteNumber: lead?.quoteNumber ?? null,
      leadStage: lead?.stage ?? null,
    },
  };
}

export interface CandidateRequestRow {
  id: string;
  name: string;
  status: CustomRequestStatus;
  configurationName: string;
  contactName: string | null;
  totalMax: number;
}

/**
 * Permintaan-permintaan yang membentuk satu kandidat promosi (N5).
 *
 * listPromotionCandidates() hanya mengembalikan id-nya, sedangkan papan
 * kandidat perlu menampilkan siapa yang memintanya dan sebesar apa rakitannya —
 * itulah yang membuat keputusan promosi punya bobot.
 */
export async function listRequestsByIds(ids: string[]): Promise<CandidateRequestRow[]> {
  if (ids.length === 0) return [];

  const requests = await prisma.customFeatureRequest.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      configuration: {
        select: {
          name: true,
          totalMax: true,
          lead: { select: { contactName: true, company: true } },
          owner: { select: { name: true } },
        },
      },
    },
  });

  return requests.map((request) => ({
    id: request.id,
    name: request.name,
    status: coerceEnum(request.status, CUSTOM_REQUEST_STATUSES, 'PENDING'),
    configurationName: request.configuration.name,
    contactName:
      request.configuration.lead?.contactName ??
      request.configuration.lead?.company ??
      request.configuration.owner?.name ??
      null,
    totalMax: request.configuration.totalMax,
  }));
}

export interface PromotionTargetGroup {
  id: string;
  name: string;
}

export interface PromotionTargetCategory {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  groups: PromotionTargetGroup[];
}

/** Kategori & kelompok fitur tujuan promosi ke katalog (N5). */
export async function listPromotionTargets(): Promise<PromotionTargetCategory[]> {
  const categories = await prisma.applicationCategory.findMany({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      shortName: true,
      featureGroups: {
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true },
      },
    },
  });

  // Kategori tanpa kelompok tidak bisa menampung fitur baru, jadi tidak
  // ditawarkan sebagai tujuan promosi.
  return categories
    .filter((category) => category.featureGroups.length > 0)
    .map(({ featureGroups, ...category }) => ({ ...category, groups: featureGroups }));
}
