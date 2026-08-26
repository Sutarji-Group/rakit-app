import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, notFound, ok, readBody } from '@/lib/api/respond';
import { renameSchema } from '@/lib/api/schemas';
import {
  computeFromPayload,
  getConfiguratorPayload,
  renameConfiguration,
} from '@/lib/services/configuration';

export const runtime = 'nodejs';

interface Params {
  params: Promise<{ token: string }>;
}

/**
 * Mengambil seluruh bahan konfigurator untuk satu token.
 *
 * NFR Keamanan: endpoint ini memuat seluruh katalog satu kategori, sehingga
 * dibatasi lajunya untuk mempersulit scraping katalog.
 */
export async function GET(request: Request, { params }: Params) {
  const limit = rateLimit(clientKey(request, 'read-config'), 90, 60);
  if (!limit.allowed) return fail('Terlalu banyak permintaan.', 429);

  const { token } = await params;
  const payload = await getConfiguratorPayload(token);
  if (!payload) return notFound('Rakitan tidak ditemukan atau tautannya sudah tidak berlaku.');

  return ok({ ...payload, breakdown: computeFromPayload(payload) });
}

export async function PATCH(request: Request, { params }: Params) {
  const { token } = await params;
  const { data, response } = await readBody(request, renameSchema);
  if (response) return response;

  await renameConfiguration(token, data.name);
  return ok({ renamed: true });
}
