'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { actionFail, actionOk, type CustomActionResult } from '@/components/admin/custom/shared';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import {
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABEL,
  type ConsultationStatus,
} from '@/lib/domain/enums';

const schema = z.object({
  id: z.string().trim().min(1, 'Permintaan konsultasi tidak dikenali.'),
  status: z.enum(CONSULTATION_STATUSES),
});

/**
 * Memindahkan satu permintaan konsultasi ke tahap berikutnya.
 *
 * Penanganan dicatat atas nama pengguna yang menekan tombol: papan ini dipakai
 * beberapa orang sekaligus, dan permintaan yang "sudah dihubungi" tanpa nama
 * penanggung jawab adalah cara tercepat membuat klien dihubungi dua kali —
 * atau tidak sama sekali.
 */
export async function setConsultationStatus(
  id: string,
  status: ConsultationStatus,
): Promise<CustomActionResult> {
  const user = await requireArea('customQueue', '/admin/konsultasi');

  const parsed = schema.safeParse({ id, status });
  if (!parsed.success) {
    return actionFail(parsed.error.issues[0]?.message ?? 'Data tidak sah.');
  }

  const updated = await prisma.consultationRequest.updateMany({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      // Begitu permintaan ditutup, penanggung jawabnya tidak lagi diganti agar
      // jejak siapa yang menangani tetap utuh.
      handledById: parsed.data.status === 'CLOSED' ? undefined : user.id,
    },
  });

  if (updated.count === 0) return actionFail('Permintaan konsultasi tidak ditemukan.');

  revalidatePath('/admin');
  revalidatePath('/admin/konsultasi');

  return actionOk(`Status diubah menjadi "${CONSULTATION_STATUS_LABEL[parsed.data.status]}".`);
}
