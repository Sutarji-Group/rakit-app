import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, notFound, ok, readBody } from '@/lib/api/respond';

export const runtime = 'nodejs';

const scheduleSchema = z.object({
  /** Waktu pilihan klien dalam ISO 8601. */
  at: z.string().datetime(),
  note: z.string().trim().max(500).optional(),
});

/**
 * Penjadwalan discovery call oleh klien (PRD F6).
 *
 * Belum terhubung ke penyedia kalender pihak ketiga; slot yang dipilih dicatat
 * pada lead dan memunculkan aktivitas di pipeline agar sales menindaklanjuti.
 * Titik integrasi kalender nanti cukup menggantikan isi fungsi ini.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const limit = rateLimit(clientKey(request, 'schedule'), 12, 600);
  if (!limit.allowed) return fail('Terlalu banyak permintaan penjadwalan.', 429);

  const { leadId } = await params;
  const { data, response } = await readBody(request, scheduleSchema);
  if (response) return response;

  const at = new Date(data.at);
  if (at.getTime() < Date.now()) {
    return fail('Waktu yang dipilih sudah lewat.', 422, {
      fields: { at: 'Pilih waktu di masa mendatang.' },
    });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) return notFound('Penawaran tidak ditemukan.');

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        discoveryCallAt: at,
        stage: 'DISCOVERY_SCHEDULED',
      },
    }),
    prisma.leadActivity.create({
      data: {
        leadId,
        kind: 'CALL',
        body:
          `Klien menjadwalkan sesi konsultasi pada ${at.toLocaleString('id-ID')}.` +
          (data.note ? ` Catatan: ${data.note}` : ''),
        dueAt: at,
      },
    }),
  ]);

  return ok({ scheduledAt: at.toISOString() });
}
