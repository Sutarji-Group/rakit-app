import { fail, ok } from '@/lib/api/respond';
import { deleteCustomRequest } from '@/lib/services/custom-request';

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string; requestId: string }> },
) {
  const { token, requestId } = await params;
  const removed = await deleteCustomRequest(token, requestId);
  if (!removed) return fail('Pengajuan tidak dapat dihapus.', 409);
  return ok({ deleted: true });
}
