import { fail, ok, readBody } from '@/lib/api/respond';
import { updateOptionsSchema } from '@/lib/api/schemas';
import { updateProjectOptions } from '@/lib/services/configuration';

export const runtime = 'nodejs';

/** Menyimpan konfigurasi proyek: platform, deployment, pengguna, add-on (E). */
export async function PUT(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data, response } = await readBody(request, updateOptionsSchema);
  if (response) return response;

  const result = await updateProjectOptions(token, data);
  if (!result.ok) return fail(result.error ?? 'Gagal menyimpan konfigurasi proyek.', 409);

  return ok({ breakdown: result.breakdown });
}
