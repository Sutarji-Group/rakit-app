import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { buildDocumentNumber } from '@/lib/format';
import {
  CHANGE_REQUEST_STATUSES,
  COUNTED_CUSTOM_STATUSES,
  CUSTOM_REQUEST_STATUSES,
  DOCUMENT_KINDS,
  INVOICE_KINDS,
  INVOICE_STATUSES,
  MILESTONE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_STATUS_WEIGHT,
  coerceEnum,
  type ChangeRequestStatus,
  type DocumentKind,
  type InvoiceKind,
  type InvoiceStatus,
  type MilestoneStatus,
  type PaymentMethod,
  type PaymentStatus,
  type ProjectStatus,
  type TaskStatus,
} from '@/lib/domain/enums';
import { duplicateConfiguration, recomputeConfiguration } from './configuration';

/**
 * Logika sisi server portal klien (PRD modul J) dan change request (modul K).
 *
 * Satu aturan berlaku untuk SETIAP fungsi di berkas ini: proyek hanya boleh
 * dibaca dan diubah oleh pengguna yang tercatat sebagai Project.clientId.
 * Pemeriksaan itu dilakukan di lapisan ini, bukan di halaman, supaya tidak ada
 * jalur masuk yang lupa memeriksanya.
 */

const DAY_MS = 86_400_000;
/** Tempo pembayaran invoice addendum, mengikuti kebiasaan termin proyek (H4). */
const ADDENDUM_DUE_DAYS = 14;
const TAX_PCT = 11;

export interface PortalActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

function fail(message: string, fieldErrors?: Record<string, string>): PortalActionResult {
  return { ok: false, message, fieldErrors };
}

function done(message: string): PortalActionResult {
  return { ok: true, message };
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

// ---------------------------------------------------------------------------
// Penjaga kepemilikan
// ---------------------------------------------------------------------------

/**
 * Mengembalikan proyek hanya bila pengguna aktif adalah kliennya.
 *
 * Sengaja memakai findFirst dengan clientId di dalam where, bukan findUnique
 * lalu membandingkan setelahnya: dengan begini tidak ada satu pun baris yang
 * sempat terbaca ketika pemanggilnya bukan pemilik.
 */
async function ownedProject(projectId: string, userId: string) {
  if (!projectId || !userId) return null;
  return prisma.project.findFirst({ where: { id: projectId, clientId: userId } });
}

// ---------------------------------------------------------------------------
// J — Daftar proyek klien
// ---------------------------------------------------------------------------

export interface ClientProjectSummary {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  progressPct: number;
  startDate: string | null;
  targetEndDate: string | null;
  contractValue: number;
  stagingUrl: string | null;
  demoUrl: string | null;
  categoryName: string;
  taskTotal: number;
  taskDone: number;
  /** Hal yang menunggu tindakan klien — dipakai sebagai lencana di daftar. */
  awaitingApprovalCount: number;
  unpaidInvoiceCount: number;
}

/** Seluruh proyek milik satu klien (J). */
export async function getClientProjects(userId: string): Promise<ClientProjectSummary[]> {
  if (!userId) return [];

  const rows = await prisma.project.findMany({
    where: { clientId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      configuration: { select: { category: { select: { name: true } } } },
      tasks: { select: { status: true } },
      milestones: { select: { status: true } },
      invoices: { select: { status: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    status: coerceEnum(row.status, PROJECT_STATUSES, 'PLANNING'),
    progressPct: computeProgress(row.tasks.map((task) => task.status)),
    startDate: iso(row.startDate),
    targetEndDate: iso(row.targetEndDate),
    contractValue: row.contractValue,
    stagingUrl: row.stagingUrl,
    demoUrl: row.demoUrl,
    categoryName: row.configuration.category.name,
    taskTotal: row.tasks.length,
    taskDone: row.tasks.filter((task) => task.status === 'DONE').length,
    awaitingApprovalCount: row.milestones.filter((m) => m.status === 'AWAITING_APPROVAL').length,
    unpaidInvoiceCount: row.invoices.filter((inv) =>
      ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status),
    ).length,
  }));
}

/**
 * Persentase progres (J2).
 *
 * Memakai bobot per status, bukan sekadar "selesai / total": pekerjaan yang
 * sedang dikerjakan pun sudah bergerak, dan angka yang diam berhari-hari
 * adalah sumber kecemasan yang justru ingin dihilangkan portal ini.
 */
function computeProgress(statuses: string[]): number {
  if (statuses.length === 0) return 0;
  const sum = statuses.reduce(
    (total, status) => total + TASK_STATUS_WEIGHT[coerceEnum(status, TASK_STATUSES, 'QUEUED')],
    0,
  );
  return Math.round((sum / statuses.length) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// J — Detail satu proyek
// ---------------------------------------------------------------------------

export interface PortalMessage {
  id: string;
  authorLabel: string;
  body: string;
  createdAt: string;
  /** Pesan yang ditulis pengguna yang sedang membuka portal. */
  isMine: boolean;
}

export interface PortalTask {
  id: string;
  title: string;
  status: TaskStatus;
  phase: string;
  targetDate: string | null;
  completedAt: string | null;
  clientNote: string | null;
  messages: PortalMessage[];
}

export interface PortalPhase {
  name: string;
  progressPct: number;
  total: number;
  done: number;
}

export interface PortalMilestone {
  id: string;
  name: string;
  description: string | null;
  percentage: number;
  amount: number;
  dueDate: string | null;
  status: MilestoneStatus;
  approvedAt: string | null;
  clientNote: string | null;
}

export interface PortalPayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
}

export interface PortalInvoice {
  id: string;
  number: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  milestoneName: string | null;
  payments: PortalPayment[];
}

export interface PortalDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  url: string;
  sizeLabel: string | null;
  createdAt: string;
}

export interface PortalProjectDetail {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  progressPct: number;
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
  contractValue: number;
  stagingUrl: string | null;
  demoUrl: string | null;
  categoryName: string;
  managerName: string | null;
  configurationToken: string;
  tasks: PortalTask[];
  phases: PortalPhase[];
  milestones: PortalMilestone[];
  invoices: PortalInvoice[];
  documents: PortalDocument[];
  changeRequestCount: number;
  openChangeRequestCount: number;
}

/** Detail lengkap satu proyek untuk portal — hanya untuk kliennya sendiri. */
export async function getProjectForClient(
  projectId: string,
  userId: string,
): Promise<PortalProjectDetail | null> {
  if (!projectId || !userId) return null;

  const row = await prisma.project.findFirst({
    where: { id: projectId, clientId: userId },
    include: {
      configuration: {
        select: { publicToken: true, category: { select: { name: true } } },
      },
      manager: { select: { name: true } },
      tasks: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          // Pesan internal tidak pernah ikut terbaca dari sini (J6).
          discussions: {
            where: { isInternal: false },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      milestones: { orderBy: { sortOrder: 'asc' } },
      invoices: {
        orderBy: { issuedAt: 'asc' },
        include: {
          milestone: { select: { name: true } },
          payments: { orderBy: { createdAt: 'asc' } },
        },
      },
      documents: { orderBy: { createdAt: 'asc' } },
      changeRequests: { select: { status: true } },
    },
  });

  if (!row) return null;

  const tasks: PortalTask[] = row.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: coerceEnum(task.status, TASK_STATUSES, 'QUEUED'),
    phase: task.phase,
    targetDate: iso(task.targetDate),
    completedAt: iso(task.completedAt),
    clientNote: task.clientNote,
    messages: task.discussions.map((message) => ({
      id: message.id,
      authorLabel: message.authorLabel,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      isMine: message.userId === userId,
    })),
  }));

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: coerceEnum(row.status, PROJECT_STATUSES, 'PLANNING'),
    progressPct: computeProgress(row.tasks.map((task) => task.status)),
    startDate: iso(row.startDate),
    targetEndDate: iso(row.targetEndDate),
    actualEndDate: iso(row.actualEndDate),
    contractValue: row.contractValue,
    stagingUrl: row.stagingUrl,
    demoUrl: row.demoUrl,
    categoryName: row.configuration.category.name,
    managerName: row.manager?.name ?? null,
    configurationToken: row.configuration.publicToken,
    tasks,
    phases: summarizePhases(tasks),
    milestones: row.milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      description: milestone.description,
      percentage: milestone.percentage,
      amount: milestone.amount,
      dueDate: iso(milestone.dueDate),
      status: coerceEnum(milestone.status, MILESTONE_STATUSES, 'PENDING'),
      approvedAt: iso(milestone.approvedAt),
      clientNote: milestone.clientNote,
    })),
    invoices: row.invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      kind: coerceEnum(invoice.kind, INVOICE_KINDS, 'MILESTONE'),
      status: coerceEnum(invoice.status, INVOICE_STATUSES, 'DRAFT'),
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      paidAmount: invoice.paidAmount,
      issuedAt: invoice.issuedAt.toISOString(),
      dueAt: invoice.dueAt.toISOString(),
      paidAt: iso(invoice.paidAt),
      milestoneName: invoice.milestone?.name ?? null,
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        method: coerceEnum(payment.method, PAYMENT_METHODS, 'MANUAL_TRANSFER'),
        status: coerceEnum(payment.status, PAYMENT_STATUSES, 'PENDING'),
        paidAt: iso(payment.paidAt),
      })),
    })),
    documents: row.documents.map((document) => ({
      id: document.id,
      name: document.name,
      kind: coerceEnum(document.kind, DOCUMENT_KINDS, 'OTHER'),
      url: document.url,
      sizeLabel: document.sizeLabel,
      createdAt: document.createdAt.toISOString(),
    })),
    changeRequestCount: row.changeRequests.length,
    openChangeRequestCount: row.changeRequests.filter((cr) =>
      ['DRAFT', 'SUBMITTED', 'ESTIMATED'].includes(cr.status),
    ).length,
  };
}

/** Progres per fase (J2), urut sesuai kemunculan pekerjaan pertama tiap fase. */
function summarizePhases(tasks: PortalTask[]): PortalPhase[] {
  const order: string[] = [];
  const buckets = new Map<string, PortalTask[]>();

  for (const task of tasks) {
    if (!buckets.has(task.phase)) {
      buckets.set(task.phase, []);
      order.push(task.phase);
    }
    buckets.get(task.phase)!.push(task);
  }

  return order.map((name) => {
    const items = buckets.get(name)!;
    return {
      name,
      total: items.length,
      done: items.filter((task) => task.status === 'DONE').length,
      progressPct: computeProgress(items.map((task) => task.status)),
    };
  });
}

// ---------------------------------------------------------------------------
// J4 — Persetujuan milestone oleh klien
// ---------------------------------------------------------------------------

/** Mengambil milestone beserta proyeknya, hanya bila milik pengguna ini. */
async function ownedMilestone(milestoneId: string, userId: string) {
  if (!milestoneId || !userId) return null;
  return prisma.milestone.findFirst({
    where: { id: milestoneId, project: { clientId: userId } },
    include: { project: { select: { id: true } } },
  });
}

/** J4 — klien menyetujui milestone yang menunggu persetujuan. */
export async function approveMilestone(
  milestoneId: string,
  userId: string,
): Promise<PortalActionResult> {
  const milestone = await ownedMilestone(milestoneId, userId);
  if (!milestone) return fail('Milestone tidak ditemukan pada proyek Anda.');

  if (milestone.status !== 'AWAITING_APPROVAL') {
    return fail('Milestone ini sedang tidak menunggu persetujuan Anda.');
  }

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: { status: 'APPROVED', approvedAt: new Date(), clientNote: null },
  });

  return done('Milestone disetujui. Tim kami langsung melanjutkan ke tahap berikutnya.');
}

/**
 * J4 — klien meminta revisi. Catatan wajib diisi.
 *
 * Tanpa catatan, permintaan revisi hanya memindahkan kebingungan ke tim
 * pengerjaan dan berakhir menjadi rangkaian pesan WhatsApp — persis yang
 * ingin dihindari portal ini.
 */
export async function requestMilestoneRevision(
  milestoneId: string,
  userId: string,
  note: string,
): Promise<PortalActionResult> {
  const trimmed = note.trim();
  if (trimmed.length < 10) {
    return fail('Catatan revisi belum cukup jelas.', {
      note: 'Tuliskan minimal 10 karakter: bagian mana yang perlu diperbaiki dan seperti apa yang Anda harapkan.',
    });
  }

  const milestone = await ownedMilestone(milestoneId, userId);
  if (!milestone) return fail('Milestone tidak ditemukan pada proyek Anda.');

  if (milestone.status !== 'AWAITING_APPROVAL') {
    return fail('Milestone ini sedang tidak menunggu persetujuan Anda.');
  }

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      status: 'REVISION_REQUESTED',
      approvedAt: null,
      clientNote: trimmed.slice(0, 2000),
    },
  });

  return done('Permintaan revisi terkirim beserta catatan Anda.');
}

// ---------------------------------------------------------------------------
// J6 — Diskusi yang melekat pada item pekerjaan
// ---------------------------------------------------------------------------

/**
 * J6 — klien menulis pesan pada satu item pekerjaan.
 *
 * Pesan dari portal selalu isInternal = false; catatan internal tim tidak
 * pernah dibuat maupun terbaca lewat jalur ini.
 */
export async function postDiscussionMessage(
  taskId: string,
  userId: string,
  body: string,
): Promise<PortalActionResult> {
  const trimmed = body.trim();
  if (trimmed.length < 2) {
    return fail('Pesan masih kosong.', { body: 'Tuliskan pesan Anda lebih dahulu.' });
  }
  if (trimmed.length > 4000) {
    return fail('Pesan terlalu panjang.', { body: 'Maksimal 4.000 karakter per pesan.' });
  }

  const task = await prisma.projectTask.findFirst({
    where: { id: taskId, project: { clientId: userId } },
    select: { id: true, projectId: true },
  });
  if (!task) return fail('Item pekerjaan tidak ditemukan pada proyek Anda.');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, company: true },
  });

  await prisma.discussionMessage.create({
    data: {
      taskId: task.id,
      userId,
      authorLabel: user?.company ? `${user.name} (${user.company})` : (user?.name ?? 'Klien'),
      body: trimmed,
      isInternal: false,
    },
  });

  return done('Pesan terkirim dan menempel pada item pekerjaan ini.');
}

// ---------------------------------------------------------------------------
// K — Change request
// ---------------------------------------------------------------------------

export interface ChangeRequestAddition {
  id: string;
  name: string;
  type: string;
  /** Fitur custom belum berharga sebelum diestimasi manusia (BR-02). */
  isCustom: boolean;
  isEstimated: boolean;
}

export interface ChangeRequestImpact {
  additions: ChangeRequestAddition[];
  priceMin: number;
  priceMax: number;
  extraWeeksMin: number;
  extraWeeksMax: number;
  currentTargetEndDate: string | null;
  newTargetEndDate: string | null;
  /** Fitur custom yang masih menunggu estimasi tim (BR-02). */
  pendingCustomCount: number;
  canApprove: boolean;
  blockReason: string | null;
}

export interface PortalChangeRequest {
  id: string;
  number: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedPrice: number | null;
  addendumToken: string | null;
  /** Dampak yang dihitung ulang saat ini — dasar keputusan klien (K4). */
  impact: ChangeRequestImpact | null;
}

/**
 * K1 — membuka konfigurator sebagai rakitan addendum.
 *
 * Isi rakitan addendum adalah SELURUH fitur yang sudah terpasang di proyek,
 * ditandai lewat kolom reason supaya klien melihat mana yang sudah dibayar dan
 * mana yang benar-benar tambahan baru. Harga dan timeline addendum kemudian
 * dihitung sebagai selisih terhadap rakitan proyek berjalan.
 */
export async function createChangeRequest(
  projectId: string,
  userId: string,
  input: { title?: string; description?: string } = {},
): Promise<{ ok: boolean; message: string; token?: string }> {
  const project = await ownedProject(projectId, userId);
  if (!project) return { ok: false, message: 'Proyek tidak ditemukan pada akun Anda.' };

  if (project.status === 'CANCELLED') {
    return { ok: false, message: 'Proyek ini sudah dibatalkan, penambahan fitur tidak tersedia.' };
  }

  const base = await prisma.configuration.findUnique({
    where: { id: project.configurationId },
    select: { publicToken: true },
  });
  if (!base) return { ok: false, message: 'Rakitan asal proyek ini tidak ditemukan.' };

  const token = await duplicateConfiguration(base.publicToken, userId);
  if (!token) return { ok: false, message: 'Rakitan addendum gagal dibuat. Coba lagi sebentar lagi.' };

  const addendum = await prisma.configuration.update({
    where: { publicToken: token },
    data: {
      source: 'CHANGE_REQUEST',
      name: `Tambahan fitur — ${project.name}`,
    },
    select: { id: true, publicToken: true },
  });

  // Penanda "sudah terpasang" pada seluruh fitur bawaan proyek (K1).
  await prisma.configurationItem.updateMany({
    where: { configurationId: addendum.id },
    data: { reason: 'Sudah terpasang di proyek ini' },
  });

  const number = await nextSequentialNumber('CR', 'changeRequest');

  await prisma.changeRequest.create({
    data: {
      number,
      projectId: project.id,
      addendumConfigurationId: addendum.id,
      title: input.title?.trim().slice(0, 160) || `Tambahan fitur ${project.code}`,
      description: input.description?.trim().slice(0, 2000) || null,
      status: 'DRAFT',
    },
  });

  return { ok: true, message: 'Rakitan addendum dibuat.', token: addendum.publicToken };
}

/** Daftar change request satu proyek beserta dampaknya (K). */
export async function listChangeRequests(
  projectId: string,
  userId: string,
): Promise<PortalChangeRequest[]> {
  const project = await ownedProject(projectId, userId);
  if (!project) return [];

  const rows = await prisma.changeRequest.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
    include: {
      addendumConfiguration: {
        include: {
          items: { select: { featureId: true, nameSnapshot: true, typeSnapshot: true } },
          customRequests: { select: { id: true, name: true, status: true } },
        },
      },
    },
  });

  const base = await prisma.configuration.findUnique({
    where: { id: project.configurationId },
    select: {
      totalMin: true,
      totalMax: true,
      durationWeeksMin: true,
      durationWeeksMax: true,
      items: { select: { featureId: true } },
    },
  });

  const baseFeatureIds = new Set((base?.items ?? []).map((item) => item.featureId));

  return rows.map((row) => {
    const status = coerceEnum(row.status, CHANGE_REQUEST_STATUSES, 'DRAFT');
    const addendum = row.addendumConfiguration;

    const impact =
      addendum && base
        ? buildImpact({
            addendum,
            base,
            baseFeatureIds,
            targetEndDate: project.targetEndDate,
            isSettled: status === 'APPROVED',
            settled: {
              price: row.approvedPrice,
              weeks: row.timelineImpactWeeks,
              newTargetEndDate: row.newTargetEndDate,
            },
          })
        : null;

    return {
      id: row.id,
      number: row.number,
      title: row.title,
      description: row.description,
      status,
      createdAt: row.createdAt.toISOString(),
      submittedAt: iso(row.submittedAt),
      approvedAt: iso(row.approvedAt),
      approvedPrice: row.approvedPrice,
      addendumToken: addendum?.publicToken ?? null,
      impact,
    };
  });
}

interface ImpactSources {
  addendum: {
    totalMin: number;
    totalMax: number;
    durationWeeksMin: number;
    durationWeeksMax: number;
    items: Array<{ featureId: string; nameSnapshot: string; typeSnapshot: string }>;
    customRequests: Array<{ id: string; name: string; status: string }>;
  };
  base: {
    totalMin: number;
    totalMax: number;
    durationWeeksMin: number;
    durationWeeksMax: number;
  };
  baseFeatureIds: Set<string>;
  targetEndDate: Date | null;
  isSettled: boolean;
  settled: { price: number | null; weeks: number; newTargetEndDate: Date | null };
}

/**
 * K2 & K4 — dampak addendum terhadap harga dan tanggal selesai.
 *
 * Selisih dihitung terhadap rakitan proyek berjalan, bukan dari nol: biaya
 * setup dan diskon tier sudah termasuk di kedua sisi sehingga saling meniadakan
 * dan yang tersisa benar-benar nilai fitur tambahan (BR-12, BR-14).
 */
function buildImpact(sources: ImpactSources): ChangeRequestImpact {
  const { addendum, base, baseFeatureIds, targetEndDate, isSettled, settled } = sources;

  const additions: ChangeRequestAddition[] = [
    ...addendum.items
      .filter((item) => !baseFeatureIds.has(item.featureId))
      .map((item) => ({
        id: item.featureId,
        name: item.nameSnapshot,
        type: item.typeSnapshot,
        isCustom: false,
        isEstimated: true,
      })),
    ...addendum.customRequests.map((request) => ({
      id: request.id,
      name: request.name,
      type: 'CUSTOM',
      isCustom: true,
      isEstimated: COUNTED_CUSTOM_STATUSES.includes(
        coerceEnum(request.status, CUSTOM_REQUEST_STATUSES, 'PENDING'),
      ),
    })),
  ];

  const pendingCustomCount = additions.filter(
    (item) => item.isCustom && !item.isEstimated,
  ).length;

  const priceMin = isSettled
    ? (settled.price ?? 0)
    : Math.max(0, addendum.totalMin - base.totalMin);
  const priceMax = isSettled
    ? (settled.price ?? 0)
    : Math.max(0, addendum.totalMax - base.totalMax);

  const extraWeeksMin = isSettled
    ? settled.weeks
    : Math.max(0, addendum.durationWeeksMin - base.durationWeeksMin);
  const extraWeeksMax = isSettled
    ? settled.weeks
    : Math.max(0, addendum.durationWeeksMax - base.durationWeeksMax);

  const newTargetEndDate = isSettled
    ? settled.newTargetEndDate
    : shiftTargetDate(targetEndDate, extraWeeksMax);

  let blockReason: string | null = null;
  if (additions.length === 0) {
    blockReason = 'Belum ada fitur tambahan di rakitan addendum ini.';
  } else if (pendingCustomCount > 0) {
    blockReason =
      'Ada fitur custom yang masih menunggu estimasi tim kami. Nilainya belum bisa dikunci (BR-02).';
  }

  return {
    additions,
    priceMin,
    priceMax,
    extraWeeksMin,
    extraWeeksMax,
    currentTargetEndDate: iso(targetEndDate),
    newTargetEndDate: iso(newTargetEndDate),
    pendingCustomCount,
    canApprove: !isSettled && blockReason === null,
    blockReason,
  };
}

/** Tanggal selesai baru = tanggal lama + tambahan minggu, dibulatkan ke hari. */
function shiftTargetDate(current: Date | null, extraWeeks: number): Date | null {
  if (!current) return null;
  return new Date(current.getTime() + Math.ceil(extraWeeks) * 7 * DAY_MS);
}

/**
 * K3 — persetujuan addendum oleh klien.
 *
 * Menghasilkan tiga hal sekaligus supaya tidak ada langkah manual yang
 * terlupakan: invoice tambahan (kind ADDENDUM), milestone baru, dan pergeseran
 * tanggal selesai proyek sesuai dampak yang sudah dilihat klien (K4).
 */
export async function approveChangeRequest(
  changeRequestId: string,
  userId: string,
): Promise<PortalActionResult> {
  const row = await prisma.changeRequest.findFirst({
    where: { id: changeRequestId, project: { clientId: userId } },
    include: {
      project: true,
      addendumConfiguration: { select: { id: true, publicToken: true } },
    },
  });
  if (!row) return fail('Permintaan perubahan tidak ditemukan pada proyek Anda.');

  const status = coerceEnum(row.status, CHANGE_REQUEST_STATUSES, 'DRAFT');
  if (status === 'APPROVED') return fail('Addendum ini sudah disetujui sebelumnya.');
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return fail('Addendum ini sudah ditutup dan tidak dapat disetujui.');
  }
  if (!row.addendumConfiguration) return fail('Rakitan addendum tidak ditemukan.');

  // Hitung ulang dari sumbernya agar angka yang dikunci sama persis dengan
  // yang baru saja dilihat klien, bukan sisa perhitungan lama.
  await recomputeConfiguration(row.addendumConfiguration.publicToken);

  const [addendum, base] = await Promise.all([
    prisma.configuration.findUnique({
      where: { id: row.addendumConfiguration.id },
      include: {
        items: { select: { featureId: true, nameSnapshot: true, typeSnapshot: true } },
        customRequests: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.configuration.findUnique({
      where: { id: row.project.configurationId },
      select: {
        totalMin: true,
        totalMax: true,
        durationWeeksMin: true,
        durationWeeksMax: true,
        items: { select: { featureId: true } },
      },
    }),
  ]);

  if (!addendum || !base) return fail('Data rakitan addendum belum lengkap.');

  const impact = buildImpact({
    addendum,
    base,
    baseFeatureIds: new Set(base.items.map((item) => item.featureId)),
    targetEndDate: row.project.targetEndDate,
    isSettled: false,
    settled: { price: null, weeks: 0, newTargetEndDate: null },
  });

  if (!impact.canApprove) {
    return fail(impact.blockReason ?? 'Addendum ini belum dapat disetujui.');
  }

  /**
   * Nilai yang disepakati memakai batas atas rentang. Klien mendapat kepastian
   * bahwa tidak ada tagihan susulan untuk lingkup yang sama — kebalikan dari
   * sengketa scope yang paling sering terjadi di proyek addendum.
   */
  const agreedPrice = impact.priceMax;
  const taxAmount = Math.round((agreedPrice * TAX_PCT) / 100);
  const now = new Date();
  const invoiceNumber = await nextSequentialNumber('INV', 'invoice');

  const lastMilestone = await prisma.milestone.findFirst({
    where: { projectId: row.project.id },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const newTargetEndDate = impact.newTargetEndDate ? new Date(impact.newTargetEndDate) : null;

  await prisma.$transaction(async (tx) => {
    const milestone = await tx.milestone.create({
      data: {
        projectId: row.project.id,
        name: `Addendum ${row.number} — ${row.title}`,
        description: `Penambahan ${impact.additions.length} fitur di luar lingkup awal. Tanggal selesai proyek bergeser ${impact.extraWeeksMax} minggu.`,
        sortOrder: (lastMilestone?.sortOrder ?? 0) + 1,
        percentage: 0,
        amount: agreedPrice,
        dueDate: newTargetEndDate,
        status: 'PENDING',
      },
    });

    await tx.invoice.create({
      data: {
        number: invoiceNumber,
        projectId: row.project.id,
        milestoneId: milestone.id,
        kind: 'ADDENDUM',
        status: 'SENT',
        subtotal: agreedPrice,
        taxPct: TAX_PCT,
        taxAmount,
        total: agreedPrice + taxAmount,
        issuedAt: now,
        dueAt: new Date(now.getTime() + ADDENDUM_DUE_DAYS * DAY_MS),
        note: `Addendum ${row.number} — disetujui klien pada portal.`,
      },
    });

    await tx.changeRequest.update({
      where: { id: row.id },
      data: {
        status: 'APPROVED',
        priceMin: impact.priceMin,
        priceMax: impact.priceMax,
        approvedPrice: agreedPrice,
        timelineImpactWeeks: impact.extraWeeksMax,
        newTargetEndDate,
        submittedAt: row.submittedAt ?? now,
        approvedAt: now,
      },
    });

    await tx.project.update({
      where: { id: row.project.id },
      data: {
        contractValue: row.project.contractValue + agreedPrice,
        targetEndDate: newTargetEndDate ?? row.project.targetEndDate,
      },
    });

    // Rakitan addendum dibekukan agar tidak berubah setelah nilainya dikunci.
    await tx.configuration.update({
      where: { id: addendum.id },
      data: { status: 'CONVERTED' },
    });
  });

  return done(
    `Addendum ${row.number} disetujui. Invoice ${invoiceNumber} sudah terbit dan tanggal selesai proyek diperbarui.`,
  );
}

/** Klien membatalkan addendum yang belum disetujui. */
export async function cancelChangeRequest(
  changeRequestId: string,
  userId: string,
): Promise<PortalActionResult> {
  const row = await prisma.changeRequest.findFirst({
    where: { id: changeRequestId, project: { clientId: userId } },
    select: { id: true, number: true, status: true },
  });
  if (!row) return fail('Permintaan perubahan tidak ditemukan pada proyek Anda.');

  const status = coerceEnum(row.status, CHANGE_REQUEST_STATUSES, 'DRAFT');
  if (status === 'APPROVED') return fail('Addendum yang sudah disetujui tidak dapat dibatalkan.');
  if (status === 'CANCELLED') return fail('Addendum ini sudah dibatalkan.');

  await prisma.changeRequest.update({
    where: { id: row.id },
    data: { status: 'CANCELLED' },
  });

  return done(`Addendum ${row.number} dibatalkan.`);
}

/**
 * Nomor dokumen berurutan per tahun (RKT/INV/CR-2026-0001).
 *
 * Nomor wajib unik, jadi urutan berikutnya dicari maju sampai menemukan slot
 * kosong — pembatalan di tengah tidak boleh membuat penomoran macet.
 */
async function nextSequentialNumber(
  prefix: string,
  model: 'invoice' | 'changeRequest',
): Promise<string> {
  const year = new Date().getFullYear();
  const startsWith = `${prefix}-${year}-`;

  const used =
    model === 'invoice'
      ? await prisma.invoice.findMany({
          where: { number: { startsWith } },
          select: { number: true },
        })
      : await prisma.changeRequest.findMany({
          where: { number: { startsWith } },
          select: { number: true },
        });

  const taken = new Set(used.map((row) => row.number));
  for (let sequence = 1; sequence <= taken.size + 1; sequence += 1) {
    const candidate = buildDocumentNumber(prefix, year, sequence);
    if (!taken.has(candidate)) return candidate;
  }
  return buildDocumentNumber(prefix, year, taken.size + 1);
}
