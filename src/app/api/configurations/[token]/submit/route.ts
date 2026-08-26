import { getCurrentUser } from '@/lib/auth/session';
import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, ok, readBody } from '@/lib/api/respond';
import { submitConfigurationSchema } from '@/lib/api/schemas';
import { submitConfiguration } from '@/lib/services/lead';

export const runtime = 'nodejs';

/** Mengirim konfigurasi dan menerbitkan nomor penawaran (F3). */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limit = rateLimit(clientKey(request, 'submit'), 10, 600);
  if (!limit.allowed) {
    return fail('Terlalu banyak pengiriman dari perangkat ini. Coba lagi beberapa saat lagi.', 429);
  }

  const { token } = await params;
  const { data, response } = await readBody(request, submitConfigurationSchema);
  if (response) return response;

  const user = await getCurrentUser();
  const result = await submitConfiguration({ token, ...data, ownerId: null });

  if (!result.ok) {
    return fail(result.guardrailMessage ?? result.error ?? 'Gagal mengirim konfigurasi.', 409, {
      code: result.error,
    });
  }

  void user;
  return ok({
    quoteNumber: result.quoteNumber,
    needsDeepDiscovery: result.needsDeepDiscovery ?? false,
    awaitingCustomEstimate: result.awaitingCustomEstimate ?? false,
  });
}
