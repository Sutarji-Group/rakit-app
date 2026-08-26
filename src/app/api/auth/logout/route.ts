import { destroySession } from '@/lib/auth/session';
import { ok } from '@/lib/api/respond';

export const runtime = 'nodejs';

export async function POST() {
  await destroySession();
  return ok({ signedOut: true });
}
