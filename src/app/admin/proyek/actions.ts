'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireArea } from '@/lib/auth/guards';
import { DOCUMENT_KINDS, MILESTONE_STATUSES, TASK_STATUSES } from '@/lib/domain/enums';
import {
  addProjectDocument,
  approveMilestone,
  assignTask,
  convertConfigurationToProject,
  createMilestone,
  issueInvoice,
  recordActualManDay,
  updateMilestoneStatus,
  updateTaskStatus,
} from '@/lib/services/project';
import type { ProjectActionResult } from '@/components/admin/project/shared';

/**
 * Server Action modul Proyek & Milestone (P).
 *
 * Setiap aksi menegakkan hak akses lebih dulu lewat requireArea('projects'),
 * lalu mendelegasikan seluruh aturan bisnis ke '@/lib/services/project'.
 * Papan disegarkan dengan revalidatePath supaya angka progres dan status yang
 * juga dibaca portal klien tidak pernah tertinggal satu langkah.
 */

const BOARD_PATH = '/admin/proyek';
const VARIANCE_PATH = '/admin/proyek/varians';

function refresh(projectId?: string, options?: { variance?: boolean }): void {
  revalidatePath(BOARD_PATH);
  if (projectId) revalidatePath(`${BOARD_PATH}/${projectId}`);
  if (options?.variance) revalidatePath(VARIANCE_PATH);
}

function invalid(error: z.ZodError): ProjectActionResult {
  return { ok: false, message: error.issues[0]?.message ?? 'Data tidak valid.' };
}

/**
 * Nilai <input type="date"> berbentuk yyyy-mm-dd. String kosong berarti
 * pengguna sengaja mengosongkan target tanggal, bukan lupa mengisinya.
 */
function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ---------------------------------------------------------------------------
// P1 — Konversi lead menang menjadi proyek
// ---------------------------------------------------------------------------

const convertSchema = z.object({
  leadId: z.string().min(1),
  name: z.string().trim().max(160).nullish(),
});

export async function convertLeadToProject(
  input: z.input<typeof convertSchema>,
): Promise<ProjectActionResult> {
  const user = await requireArea('projects', BOARD_PATH);
  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await convertConfigurationToProject({
    leadId: parsed.data.leadId,
    actorId: user.id,
    name: parsed.data.name?.trim() || undefined,
  });

  if (result.ok) refresh(result.projectId, { variance: true });
  return { ok: result.ok, message: result.message, projectId: result.projectId };
}

// ---------------------------------------------------------------------------
// P3 — Status item pekerjaan
// ---------------------------------------------------------------------------

const taskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(TASK_STATUSES),
});

export async function setTaskStatus(
  input: z.input<typeof taskStatusSchema>,
): Promise<ProjectActionResult> {
  const user = await requireArea('projects', BOARD_PATH);
  const parsed = taskStatusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await updateTaskStatus(parsed.data.taskId, parsed.data.status, user.id);
  if (result.ok) refresh(result.projectId);
  return { ok: result.ok, message: result.message, projectId: result.projectId };
}

// ---------------------------------------------------------------------------
// P2 — Penugasan developer & target tanggal
// ---------------------------------------------------------------------------

const assignmentSchema = z.object({
  taskId: z.string().min(1),
  assigneeId: z.string().nullish(),
  targetDate: z.string().trim().nullish(),
});

export async function saveTaskAssignment(
  input: z.input<typeof assignmentSchema>,
): Promise<ProjectActionResult> {
  const user = await requireArea('projects', BOARD_PATH);
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await assignTask({
    taskId: parsed.data.taskId,
    actorId: user.id,
    assigneeId: parsed.data.assigneeId?.trim() || null,
    targetDate: parseDateInput(parsed.data.targetDate),
  });

  if (result.ok) refresh(result.projectId);
  return { ok: result.ok, message: result.message, projectId: result.projectId };
}

// ---------------------------------------------------------------------------
// P4 — Man-day aktual
// ---------------------------------------------------------------------------

const actualSchema = z.object({
  taskId: z.string().min(1),
  /** String kosong berarti catatan man-day dihapus kembali. */
  actualManDay: z
    .string()
    .trim()
    .max(12)
    .nullish()
    .transform((value) => (value ? Number(value.replace(',', '.')) : null))
    .refine((value) => value === null || Number.isFinite(value), {
      message: 'Man-day aktual harus berupa angka, misalnya 4,5.',
    }),
});

export async function saveActualManDay(
  input: z.input<typeof actualSchema>,
): Promise<ProjectActionResult> {
  const user = await requireArea('projects', BOARD_PATH);
  const parsed = actualSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await recordActualManDay(parsed.data.taskId, parsed.data.actualManDay, user.id);
  // Laporan varians (P5) hidup dari angka ini, jadi ikut disegarkan.
  if (result.ok) refresh(result.projectId, { variance: true });
  return { ok: result.ok, message: result.message, projectId: result.projectId };
}

// ---------------------------------------------------------------------------
// Milestone & invoice (H4)
// ---------------------------------------------------------------------------

const milestoneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(3, 'Nama milestone minimal 3 karakter.').max(120),
  description: z.string().trim().max(1000).nullish(),
  percentage: z.coerce
    .number()
    .min(0, 'Porsi termin tidak boleh negatif.')
    .max(100, 'Porsi termin maksimal 100%.'),
  dueDate: z.string().trim().nullish(),
});

export async function addMilestone(
  input: z.input<typeof milestoneSchema>,
): Promise<ProjectActionResult> {
  const user = await requireArea('projects', BOARD_PATH);
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await createMilestone({
    projectId: parsed.data.projectId,
    actorId: user.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    percentage: parsed.data.percentage,
    dueDate: parseDateInput(parsed.data.dueDate),
  });

  if (result.ok) refresh(parsed.data.projectId);
  return { ok: result.ok, message: result.message, projectId: parsed.data.projectId };
}

const milestoneStatusSchema = z.object({
  milestoneId: z.string().min(1),
  status: z.enum(MILESTONE_STATUSES),
});

export async function setMilestoneStatus(
  input: z.input<typeof milestoneStatusSchema>,
): Promise<ProjectActionResult> {
  const user = await requireArea('projects', BOARD_PATH);
  const parsed = milestoneStatusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // Persetujuan punya konsekuensi tambahan (cap waktu, invoice siap terbit),
  // jadi selalu lewat approveMilestone() agar aturannya hanya ada di satu tempat.
  const result =
    parsed.data.status === 'APPROVED'
      ? await approveMilestone(parsed.data.milestoneId, user.id)
      : await updateMilestoneStatus(parsed.data.milestoneId, parsed.data.status, user.id);

  if (result.ok) refresh(result.projectId);
  return { ok: result.ok, message: result.message, projectId: result.projectId };
}

const issueInvoiceSchema = z.object({
  invoiceId: z.string().min(1).nullish(),
  milestoneId: z.string().min(1).nullish(),
  dueDays: z.coerce.number().int().min(1).max(120).optional(),
});

export async function sendInvoice(
  input: z.input<typeof issueInvoiceSchema>,
): Promise<ProjectActionResult> {
  const user = await requireArea('projects', BOARD_PATH);
  const parsed = issueInvoiceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!parsed.data.invoiceId && !parsed.data.milestoneId) {
    return { ok: false, message: 'Invoice atau milestone yang ditagih belum ditentukan.' };
  }

  const result = await issueInvoice({
    invoiceId: parsed.data.invoiceId ?? undefined,
    milestoneId: parsed.data.milestoneId ?? undefined,
    actorId: user.id,
    dueDays: parsed.data.dueDays,
  });

  if (result.ok) refresh(result.projectId);
  return { ok: result.ok, message: result.message, projectId: result.projectId };
}

// ---------------------------------------------------------------------------
// Repositori dokumen (J7)
// ---------------------------------------------------------------------------

const documentSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(3, 'Nama dokumen minimal 3 karakter.').max(160),
  kind: z.enum(DOCUMENT_KINDS),
  url: z.string().trim().url('Tautan dokumen tidak valid.'),
  sizeLabel: z.string().trim().max(24).nullish(),
});

export async function addDocument(
  input: z.input<typeof documentSchema>,
): Promise<ProjectActionResult> {
  const user = await requireArea('projects', BOARD_PATH);
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await addProjectDocument({
    projectId: parsed.data.projectId,
    actorId: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    url: parsed.data.url,
    sizeLabel: parsed.data.sizeLabel ?? null,
  });

  if (result.ok) refresh(parsed.data.projectId);
  return { ok: result.ok, message: result.message, projectId: parsed.data.projectId };
}
