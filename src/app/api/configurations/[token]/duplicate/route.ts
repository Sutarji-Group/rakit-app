import { getCurrentUser } from '@/lib/auth/session';
import { notFound, ok } from '@/lib/api/respond';
import { duplicateConfiguration } from '@/lib/services/configuration';

export const runtime = 'nodejs';

/** Menduplikasi rakitan agar klien dapat membandingkan skenario (G2). */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  const copy = await duplicateConfiguration(token, user?.id ?? null);
  if (!copy) return notFound('Rakitan tidak ditemukan.');
  return ok({ token: copy }, { status: 201 });
}
