import { getCurrentUser } from '@/lib/auth/session';
import { createConfigurationSchema } from '@/lib/api/schemas';
import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, notFound, ok, readBody } from '@/lib/api/respond';
import { createConfiguration } from '@/lib/services/configuration';

export const runtime = 'nodejs';

/** Membuat rakitan baru dari sebuah kategori (dengan atau tanpa preset). */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, 'create-config'), 30, 60);
  if (!limit.allowed) {
    return fail('Terlalu banyak rakitan dibuat dalam waktu singkat. Coba lagi sebentar lagi.', 429);
  }

  const { data, response } = await readBody(request, createConfigurationSchema);
  if (response) return response;

  const user = await getCurrentUser();

  const created = await createConfiguration({
    categorySlug: data.categorySlug,
    presetSlug: data.presetSlug ?? null,
    wizardAnswers: data.wizardAnswers,
    trafficSource: data.trafficSource ?? null,
    ownerId: user?.id ?? null,
  });

  if (!created) return notFound('Kategori aplikasi tidak ditemukan.');
  return ok({ token: created.token }, { status: 201 });
}
