'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireArea } from '@/lib/auth/guards';
import { can } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  ACTIVITY_KINDS,
  LEAD_STAGES,
  LOST_REASONS,
  USER_ROLE_LABEL,
  coerceEnum,
} from '@/lib/domain/enums';
import {
  addLeadActivity,
  applyPriceOverride,
  assignLead,
  lockPrice,
  moveLeadStage,
} from '@/lib/services/lead';
import { canLockPriceAt, type PipelineActionResult } from '@/components/admin/pipeline/shared';

/**
 * Server Action modul pipeline (O).
 *
 * Setiap aksi menegakkan hak akses lebih dulu lewat requireArea('leads'), lalu
 * mendelegasikan aturan bisnis ke '@/lib/services/lead'. Halaman disegarkan
 * dengan revalidatePath agar papan dan detail selalu menampilkan keadaan
 * terbaru tanpa memuat ulang seluruh aplikasi.
 */

const BOARD_PATH = '/admin/pipeline';

function refresh(leadId?: string): void {
  revalidatePath(BOARD_PATH);
  if (leadId) revalidatePath(`${BOARD_PATH}/${leadId}`);
}

/**
 * Pesan cadangan berbahasa Indonesia untuk masalah validasi yang tidak diberi
 * pesan sendiri. Pesan bawaan Zod berbahasa Inggris, sedangkan seluruh teks
 * yang terlihat pengguna wajib berbahasa Indonesia.
 */
const idError = () => 'Data yang dikirim tidak lengkap atau tidak dikenali.';

function invalid(error: z.ZodError): PipelineActionResult {
  return { ok: false, message: error.issues[0]?.message ?? 'Data tidak valid.' };
}

// ---------------------------------------------------------------------------
// O1 & O5 — perpindahan tahap
// ---------------------------------------------------------------------------

const moveStageSchema = z.object({
  leadId: z.string().min(1),
  stage: z.enum(LEAD_STAGES),
  lostReason: z.enum(LOST_REASONS).nullish(),
  lostNote: z.string().trim().max(1000).nullish(),
});

export async function moveStage(
  input: z.input<typeof moveStageSchema>,
): Promise<PipelineActionResult> {
  const user = await requireArea('leads', BOARD_PATH);
  const parsed = moveStageSchema.safeParse(input, { error: idError });
  if (!parsed.success) return invalid(parsed.error);

  const { leadId, stage, lostReason, lostNote } = parsed.data;

  // BR/O5: pagar kedua di sisi UI. moveLeadStage() tetap menolak sendiri bila
  // alasan kalah kosong, tetapi pesan di sini lebih spesifik untuk form.
  if (stage === 'LOST' && !lostReason) {
    return { ok: false, message: 'Pilih alasan kalah lebih dulu — data ini yang memperbaiki produk.' };
  }

  const result = await moveLeadStage(leadId, stage, user.id, {
    lostReason: lostReason ?? undefined,
    lostNote: lostNote?.trim() || undefined,
  });
  if (!result.ok) return { ok: false, message: result.error ?? 'Tahap gagal dipindahkan.' };

  refresh(leadId);
  return { ok: true, message: 'Tahap lead diperbarui.' };
}

// ---------------------------------------------------------------------------
// O3 — penugasan
// ---------------------------------------------------------------------------

const assignSchema = z.object({
  leadId: z.string().min(1),
  ownerId: z.string().min(1, 'Pilih penanggung jawab lead.'),
});

export async function assignOwner(
  input: z.input<typeof assignSchema>,
): Promise<PipelineActionResult> {
  const user = await requireArea('leads', BOARD_PATH);
  const parsed = assignSchema.safeParse(input, { error: idError });
  if (!parsed.success) return invalid(parsed.error);

  const owner = await prisma.user.findUnique({
    where: { id: parsed.data.ownerId },
    select: { name: true, isActive: true },
  });
  if (!owner?.isActive) {
    return { ok: false, message: 'Pengguna tidak ditemukan atau sudah nonaktif.' };
  }

  await assignLead(parsed.data.leadId, parsed.data.ownerId, user.id);
  refresh(parsed.data.leadId);
  return { ok: true, message: `Lead ditugaskan kepada ${owner.name}.` };
}

// ---------------------------------------------------------------------------
// O4 — catatan aktivitas & pengingat follow-up
// ---------------------------------------------------------------------------

const activitySchema = z.object({
  leadId: z.string().min(1),
  kind: z.enum(ACTIVITY_KINDS),
  body: z.string().trim().min(3, 'Catatan minimal 3 karakter.').max(4000),
  /** Nilai dari <input type="datetime-local"> — waktu lokal peramban. */
  dueAt: z.string().trim().nullish(),
});

export async function logActivity(
  input: z.input<typeof activitySchema>,
): Promise<PipelineActionResult> {
  const user = await requireArea('leads', BOARD_PATH);
  const parsed = activitySchema.safeParse(input, { error: idError });
  if (!parsed.success) return invalid(parsed.error);

  const { leadId, kind, body, dueAt } = parsed.data;

  let due: Date | undefined;
  if (dueAt) {
    const candidate = new Date(dueAt);
    if (Number.isNaN(candidate.getTime())) {
      return { ok: false, message: 'Waktu pengingat tidak dapat dibaca.' };
    }
    due = candidate;
  }

  if (kind === 'REMINDER' && !due) {
    return { ok: false, message: 'Pengingat wajib punya waktu jatuh tempo.' };
  }

  await addLeadActivity(leadId, user.id, kind, body, due);
  refresh(leadId);
  return {
    ok: true,
    message: due ? 'Catatan tersimpan beserta pengingatnya.' : 'Catatan tersimpan.',
  };
}

const completeSchema = z.object({
  leadId: z.string().min(1),
  activityId: z.string().min(1),
});

/**
 * Menutup satu pengingat follow-up.
 *
 * Tanpa ini pengingat yang sudah dikerjakan akan menumpuk sebagai "jatuh
 * tempo" selamanya dan sinyal di papan kehilangan artinya (O4).
 */
export async function completeReminder(
  input: z.input<typeof completeSchema>,
): Promise<PipelineActionResult> {
  await requireArea('leads', BOARD_PATH);
  const parsed = completeSchema.safeParse(input, { error: idError });
  if (!parsed.success) return invalid(parsed.error);

  const updated = await prisma.leadActivity.updateMany({
    where: { id: parsed.data.activityId, leadId: parsed.data.leadId, doneAt: null },
    data: { doneAt: new Date() },
  });
  if (updated.count === 0) {
    return { ok: false, message: 'Pengingat tidak ditemukan atau sudah ditutup.' };
  }

  refresh(parsed.data.leadId);
  return { ok: true, message: 'Pengingat ditandai selesai.' };
}

// ---------------------------------------------------------------------------
// O6 — override harga (BR-16, BR-17)
// ---------------------------------------------------------------------------

const overrideSchema = z.object({
  leadId: z.string().min(1),
  requestedPrice: z
    .number()
    .int('Harga harus berupa bilangan bulat rupiah.')
    .min(1, 'Isi harga hasil negosiasi.')
    .max(100_000_000_000),
  reason: z
    .string()
    .trim()
    .min(10, 'Alasan minimal 10 karakter — catatan ini permanen dan dibaca saat kalibrasi harga.')
    .max(1000),
});

export async function overridePrice(
  input: z.input<typeof overrideSchema>,
): Promise<PipelineActionResult> {
  const user = await requireArea('leads', BOARD_PATH);
  const parsed = overrideSchema.safeParse(input, { error: idError });
  if (!parsed.success) return invalid(parsed.error);

  const result = await applyPriceOverride({
    leadId: parsed.data.leadId,
    userId: user.id,
    requestedPrice: parsed.data.requestedPrice,
    reason: parsed.data.reason,
    // Hanya peran ber-hak yang boleh melewati kuota tanpa antrean approval.
    canApprove: can(user.role, 'approveOverride'),
  });

  if (!result.ok) return { ok: false, message: result.message };

  refresh(parsed.data.leadId);
  return {
    ok: true,
    needsApproval: result.needsApproval,
    message: result.needsApproval
      ? `${result.message} Override tersimpan sebagai menunggu persetujuan.`
      : result.message,
  };
}

const approveSchema = z.object({ leadId: z.string().min(1) });

/**
 * Menyetujui override yang tertahan di antrean (BR-16 / BR-17).
 *
 * Persetujuan dijalankan ulang lewat applyPriceOverride agar evaluasi kuota,
 * margin, dan jejak audit ditulis oleh satu jalur yang sama.
 */
export async function approveOverride(
  input: z.input<typeof approveSchema>,
): Promise<PipelineActionResult> {
  const user = await requireArea('leads', BOARD_PATH);
  const parsed = approveSchema.safeParse(input, { error: idError });
  if (!parsed.success) return invalid(parsed.error);

  if (!can(user.role, 'approveOverride')) {
    return {
      ok: false,
      message: `Peran ${USER_ROLE_LABEL[user.role]} tidak berwenang menyetujui override di luar kuota.`,
    };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: parsed.data.leadId },
    select: { overrideStatus: true, overridePriceValue: true, overrideReason: true },
  });
  if (!lead || lead.overridePriceValue == null) {
    return { ok: false, message: 'Belum ada override harga pada lead ini.' };
  }
  if (lead.overrideStatus !== 'PENDING_APPROVAL') {
    return { ok: false, message: 'Tidak ada override yang menunggu persetujuan.' };
  }

  const result = await applyPriceOverride({
    leadId: parsed.data.leadId,
    userId: user.id,
    requestedPrice: lead.overridePriceValue,
    reason: lead.overrideReason?.trim() || 'Alasan tidak tercatat.',
    canApprove: true,
  });
  if (!result.ok) return { ok: false, message: result.message };

  await addLeadActivity(
    parsed.data.leadId,
    user.id,
    'SYSTEM',
    `Override harga disetujui oleh ${user.name} (${USER_ROLE_LABEL[user.role]}).`,
  );

  refresh(parsed.data.leadId);
  return { ok: true, message: 'Override harga disetujui dan berlaku.' };
}

// ---------------------------------------------------------------------------
// BR-11 — penguncian harga
// ---------------------------------------------------------------------------

const lockSchema = z.object({
  leadId: z.string().min(1),
  lockedPrice: z
    .number()
    .int('Harga harus berupa bilangan bulat rupiah.')
    .min(1, 'Isi harga yang akan dikunci.')
    .max(100_000_000_000),
});

export async function lockLeadPrice(
  input: z.input<typeof lockSchema>,
): Promise<PipelineActionResult> {
  const user = await requireArea('leads', BOARD_PATH);
  const parsed = lockSchema.safeParse(input, { error: idError });
  if (!parsed.success) return invalid(parsed.error);

  // BR-11: penguncian menuntut persetujuan consultant, bukan sekadar niat baik
  // sales yang ingin menutup deal lebih cepat.
  if (!can(user.role, 'approveOverride')) {
    return {
      ok: false,
      message: 'Penguncian harga hanya dapat dilakukan consultant atau super admin (BR-11).',
    };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: parsed.data.leadId },
    select: { stage: true },
  });
  if (!lead) return { ok: false, message: 'Lead tidak ditemukan.' };

  const stage = coerceEnum(lead.stage, LEAD_STAGES, 'NEW');
  if (!canLockPriceAt(stage)) {
    return {
      ok: false,
      message: 'Harga baru boleh dikunci setelah discovery call terjadwal (BR-11).',
    };
  }

  const result = await lockPrice(parsed.data.leadId, user.id, parsed.data.lockedPrice);
  if (!result.ok) return { ok: false, message: result.error ?? 'Harga gagal dikunci.' };

  refresh(parsed.data.leadId);
  return { ok: true, message: 'Harga dikunci dan lead dipindahkan ke Proposal Final.' };
}
