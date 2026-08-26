import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, ok, readBody } from '@/lib/api/respond';
import { customRequestSchema } from '@/lib/api/schemas';
import { createCustomRequest } from '@/lib/services/custom-request';

export const runtime = 'nodejs';

/** Mengajukan satu fitur custom (D). */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limit = rateLimit(clientKey(request, 'custom-request'), 20, 300);
  if (!limit.allowed) {
    return fail('Terlalu banyak pengajuan dalam waktu singkat.', 429);
  }

  const { token } = await params;
  const { data, response } = await readBody(request, customRequestSchema);
  if (response) return response;

  const result = await createCustomRequest({ configurationToken: token, ...data });
  if (!result.ok) {
    return fail(result.error ?? 'Gagal mengajukan fitur custom.', 409, {
      code: result.redirectToConsultation ? 'REDIRECT_CONSULTATION' : undefined,
    });
  }

  return ok({ requestId: result.requestId }, { status: 201 });
}
