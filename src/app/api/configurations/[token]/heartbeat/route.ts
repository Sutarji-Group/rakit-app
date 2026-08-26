import { ok, readBody } from '@/lib/api/respond';
import { heartbeatSchema } from '@/lib/api/schemas';
import { trackTimeSpent } from '@/lib/services/configuration';

export const runtime = 'nodejs';

/** Mencatat waktu yang dihabiskan klien di konfigurator (O2, metrik 4.3). */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data, response } = await readBody(request, heartbeatSchema);
  if (response) return response;

  await trackTimeSpent(token, data.timeSpentSeconds);
  return ok({ recorded: true });
}
