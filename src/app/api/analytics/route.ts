import { prisma } from '@/lib/db/prisma';
import { stringifyJson } from '@/lib/db/json';
import { analyticsEventSchema } from '@/lib/api/schemas';
import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, ok, readBody } from '@/lib/api/respond';

export const runtime = 'nodejs';

/** Menerima satu event instrumentasi (PRD bagian 13). */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, 'analytics'), 240, 60);
  if (!limit.allowed) {
    return fail('Terlalu banyak permintaan.', 429);
  }

  const { data, response } = await readBody(request, analyticsEventSchema);
  if (response) return response;

  let configurationId: string | null = null;
  if (data.configurationToken) {
    const configuration = await prisma.configuration.findUnique({
      where: { publicToken: data.configurationToken },
      select: { id: true },
    });
    configurationId = configuration?.id ?? null;
  }

  await prisma.analyticsEvent.create({
    data: {
      name: data.name,
      sessionId: data.sessionId,
      configurationId,
      payload: stringifyJson(data.payload ?? {}),
      path: data.path,
      referrer: data.referrer,
    },
  });

  return ok({ recorded: true });
}
