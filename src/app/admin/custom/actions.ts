'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  actionFail,
  actionOk,
  type CustomActionResult,
  type EstimateFormInput,
  type PromoteFormInput,
} from '@/components/admin/custom/shared';
import { requireArea } from '@/lib/auth/guards';
import { RISK_LEVELS } from '@/lib/domain/enums';
import {
  claimRequest,
  promoteToCatalog,
  rejectRequest,
  requestClarification,
  submitEstimate,
} from '@/lib/services/custom-request';
import { slugify } from '@/lib/utils';
import { recordClientNotification } from './_lib/notification';

/**
 * Server Action antrean fitur custom (N3–N5).
 *
 * Seluruh logika bisnis tetap tinggal di '@/lib/services/custom-request' —
 * berkas ini hanya penjaga akses, validasi bentuk masukan, notifikasi klien,
 * dan penyegaran cache. Dengan begitu aturan seperti ambang konsultasi (D7)
 * atau batas lebar rentang (BR-05) hanya punya satu tempat tinggal.
 */

// ---------------------------------------------------------------------------
// Utilitas bersama
// ---------------------------------------------------------------------------

/**
 * Menyegarkan halaman yang menampilkan permintaan ini.
 *
 * Lencana pada navigasi admin dihitung di layout, sehingga '/admin' ikut
 * disegarkan agar angka antrean tidak tertinggal setelah satu keputusan.
 */
function revalidateQueue(requestId?: string): void {
  revalidatePath('/admin');
  revalidatePath('/admin/custom');
  revalidatePath('/admin/custom/kandidat');
  if (requestId) revalidatePath(`/admin/custom/${requestId}`);
}

/** Pesan ramah untuk kegagalan validasi Zod, lengkap dengan kolomnya. */
function validationResult(error: z.ZodError): CustomActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.');
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  const first = error.issues[0];
  return actionFail(first?.message ?? 'Data yang dikirim tidak sah.', fieldErrors);
}

const requestId = z.string().trim().min(1, 'Permintaan tidak dikenali.');
const manDay = z
  .number()
  .min(0.5, 'Man-day minimal 0,5 hari.')
  .max(400, 'Man-day di atas 400 hari lebih tepat dipecah menjadi beberapa fitur.');

// ---------------------------------------------------------------------------
// Mengambil permintaan untuk direview
// ---------------------------------------------------------------------------

/**
 * Menandai bahwa satu reviewer sedang memegang permintaan ini.
 *
 * Tanpa langkah ini dua orang dapat mengestimasi permintaan yang sama sementara
 * permintaan lain kedaluwarsa tanpa disentuh siapa pun (BR-04).
 */
export async function claimForReview(id: string): Promise<CustomActionResult> {
  const user = await requireArea('customQueue', '/admin/custom');

  const parsed = requestId.safeParse(id);
  if (!parsed.success) return validationResult(parsed.error);

  const claimed = await claimRequest(parsed.data, user.id);
  if (!claimed) {
    return actionFail('Permintaan ini sudah ditangani orang lain atau sudah selesai direview.');
  }

  revalidateQueue(parsed.data);
  return actionOk('Permintaan diambil. Anda tercatat sebagai reviewernya.');
}

// ---------------------------------------------------------------------------
// Keputusan 1 — estimasi diberikan (N3, N4)
// ---------------------------------------------------------------------------

const estimateSchema = z.object({
  requestId,
  manDayMin: manDay,
  manDayMax: manDay,
  riskLevel: z.enum(RISK_LEVELS),
  internalNote: z.string().trim().max(4000),
});

/**
 * Menyimpan estimasi tim atas satu fitur custom.
 *
 * Batas lebar rentang tipe Custom (BR-05) dan ambang konsultasi (D7) divalidasi
 * di dalam submitEstimate(); pesan penolakannya diteruskan apa adanya agar
 * reviewer membaca alasan yang sama dengan yang tertulis di aturan.
 */
export async function saveEstimate(input: EstimateFormInput): Promise<CustomActionResult> {
  const user = await requireArea('customQueue', '/admin/custom');

  const parsed = estimateSchema.safeParse(input);
  if (!parsed.success) return validationResult(parsed.error);

  const data = parsed.data;
  if (data.manDayMax < data.manDayMin) {
    return actionFail('Man-day maksimum tidak boleh lebih kecil dari minimum.', {
      manDayMax: 'Harus lebih besar atau sama dengan man-day minimum.',
    });
  }

  const result = await submitEstimate({
    requestId: data.requestId,
    reviewerId: user.id,
    manDayMin: data.manDayMin,
    manDayMax: data.manDayMax,
    riskLevel: data.riskLevel,
    internalNote: data.internalNote || undefined,
  });

  if (!result.ok) {
    // Seluruh penolakan submitEstimate() berasal dari lebar rentang man-day,
    // jadi pesannya ditempel di kolom yang harus diperbaiki reviewer.
    const message = result.error ?? 'Rentang estimasi tidak sah.';
    return actionFail(message, { manDayMax: message });
  }

  // N6: tidak ada kanal pengiriman otomatis, jadi yang dicatat adalah niat
  // mengabari plus bahan salinannya untuk dikirim manual.
  const notification = await recordClientNotification(data.requestId, user);
  revalidateQueue(data.requestId);

  if (result.consultRequired) {
    return actionOk(
      'Estimasi tersimpan, namun effort-nya melampaui ambang. Sistem menawarkan sesi konsultasi, bukan angka.',
      { consultRequired: true, notifyLink: notification?.link },
    );
  }

  return actionOk('Estimasi tersimpan dan total rakitan klien sudah dihitung ulang.', {
    notifyLink: notification?.link,
  });
}

// ---------------------------------------------------------------------------
// Keputusan 2 — perlu klarifikasi (N4)
// ---------------------------------------------------------------------------

const clarificationSchema = z.object({
  requestId,
  question: z
    .string()
    .trim()
    .min(15, 'Tulis pertanyaan yang cukup spesifik agar klien bisa menjawab sekali jalan.')
    .max(2000),
});

export async function askClarification(
  id: string,
  question: string,
): Promise<CustomActionResult> {
  const user = await requireArea('customQueue', '/admin/custom');

  const parsed = clarificationSchema.safeParse({ requestId: id, question });
  if (!parsed.success) return validationResult(parsed.error);

  const saved = await requestClarification(parsed.data.requestId, user.id, parsed.data.question);
  if (!saved) return actionFail('Permintaan tidak ditemukan.');

  const notification = await recordClientNotification(parsed.data.requestId, user);
  revalidateQueue(parsed.data.requestId);

  return actionOk('Pertanyaan tersimpan. Salin dan kirimkan ke klien hari ini juga.', {
    notifyLink: notification?.link,
  });
}

// ---------------------------------------------------------------------------
// Keputusan 3 — tidak dapat dikerjakan (N4)
// ---------------------------------------------------------------------------

const rejectSchema = z.object({
  requestId,
  reason: z
    .string()
    .trim()
    .min(15, 'Alasan penolakan wajib dijelaskan — klien berhak tahu mengapa.')
    .max(2000),
});

export async function rejectCustomRequest(
  id: string,
  reason: string,
): Promise<CustomActionResult> {
  const user = await requireArea('customQueue', '/admin/custom');

  const parsed = rejectSchema.safeParse({ requestId: id, reason });
  if (!parsed.success) return validationResult(parsed.error);

  const saved = await rejectRequest(parsed.data.requestId, user.id, parsed.data.reason);
  if (!saved) return actionFail('Permintaan tidak ditemukan.');

  const notification = await recordClientNotification(parsed.data.requestId, user);
  revalidateQueue(parsed.data.requestId);

  return actionOk('Permintaan ditandai tidak dapat dikerjakan dan dikeluarkan dari total.', {
    notifyLink: notification?.link,
  });
}

// ---------------------------------------------------------------------------
// Promosi ke katalog (N5)
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const promoteSchema = z.object({
  requestId,
  categoryId: z.string().trim().min(1, 'Pilih kategori tujuan.'),
  groupId: z.string().trim().min(1, 'Pilih kelompok fitur tujuan.'),
  slug: z.string().trim().min(3, 'Slug minimal 3 karakter.').max(80),
  name: z.string().trim().min(3, 'Nama fitur minimal 3 karakter.').max(120),
  clientDescription: z
    .string()
    .trim()
    .min(20, 'Deskripsi klien minimal 20 karakter — tulis manfaat operasionalnya.')
    .max(1000),
  internalDescription: z.string().trim().max(2000),
  type: z.enum(['STANDARD', 'CONFIGURABLE']),
  manDayMin: manDay,
  manDayMax: manDay,
  publishNow: z.boolean(),
});

/**
 * Memindahkan fitur custom yang berulang menjadi entri katalog permanen.
 *
 * Inilah roda gila produk (PRD 2.3): fitur berpindah dari pengali 1,5× ke
 * 0,55× (Standard) atau 1,0× (Configurable), sehingga margin kita naik dan
 * harga jual bagi klien berikutnya justru turun.
 */
export async function promoteCustomRequest(
  input: PromoteFormInput,
): Promise<CustomActionResult> {
  await requireArea('customQueue', '/admin/custom');

  const normalized = {
    ...input,
    slug: input.slug.trim() ? slugify(input.slug) : slugify(input.name),
  };

  const parsed = promoteSchema.safeParse(normalized);
  if (!parsed.success) return validationResult(parsed.error);

  const data = parsed.data;
  if (!SLUG_PATTERN.test(data.slug)) {
    return actionFail('Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.', {
      slug: 'Contoh yang sah: cek-stok-fisik.',
    });
  }
  if (data.manDayMax < data.manDayMin) {
    return actionFail('Man-day maksimum tidak boleh lebih kecil dari minimum.', {
      manDayMax: 'Harus lebih besar atau sama dengan man-day minimum.',
    });
  }

  const result = await promoteToCatalog({
    requestId: data.requestId,
    categoryId: data.categoryId,
    groupId: data.groupId,
    slug: data.slug,
    name: data.name,
    clientDescription: data.clientDescription,
    internalDescription: data.internalDescription || undefined,
    type: data.type,
    manDayMin: data.manDayMin,
    manDayMax: data.manDayMax,
    publishNow: data.publishNow,
  });

  if (!result.ok) {
    const message = result.error ?? 'Promosi ke katalog gagal.';
    const fieldErrors: Record<string, string> = {};
    if (message.includes('Slug')) fieldErrors.slug = message;
    else fieldErrors.manDayMax = message;
    return actionFail(message, fieldErrors);
  }

  revalidateQueue(data.requestId);
  // Katalog publik ikut berubah bila fitur langsung diterbitkan (L7).
  revalidatePath('/admin/katalog', 'layout');
  revalidatePath('/');

  return actionOk(
    data.publishNow
      ? 'Fitur masuk katalog dan langsung terbit. Klien berikutnya melihatnya sebagai fitur siap pakai.'
      : 'Fitur masuk katalog sebagai draft. Terbitkan dari papan katalog setelah deskripsinya dirapikan.',
    { createdId: result.featureId },
  );
}
