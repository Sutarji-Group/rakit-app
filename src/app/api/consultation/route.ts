import { prisma } from '@/lib/db/prisma';
import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, ok, readBody } from '@/lib/api/respond';
import { consultationSchema } from '@/lib/api/schemas';

export const runtime = 'nodejs';

/**
 * Permintaan konsultasi.
 *
 * Selalu tersedia sebagai jalur keluar (C4.7, A4): pembeli B2B Indonesia jarang
 * membayar tanpa bicara dengan manusia lebih dulu, dan memaksa semua orang
 * lewat jalur self-service justru menurunkan konversi (risiko R7).
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, 'consultation'), 8, 600);
  if (!limit.allowed) {
    return fail('Terlalu banyak permintaan dari perangkat ini. Coba lagi beberapa saat lagi.', 429);
  }

  const { data, response } = await readBody(request, consultationSchema);
  if (response) return response;

  const created = await prisma.consultationRequest.create({
    data: {
      name: data.name,
      company: data.company ?? null,
      email: data.email,
      whatsapp: data.whatsapp,
      topic: data.topic,
      message: data.message,
      configurationToken: data.configurationToken ?? null,
    },
  });

  return ok({ id: created.id }, { status: 201 });
}
