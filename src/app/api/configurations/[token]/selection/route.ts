import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, ok, readBody } from '@/lib/api/respond';
import { updateSelectionSchema } from '@/lib/api/schemas';
import { updateSelection } from '@/lib/services/configuration';

export const runtime = 'nodejs';

/**
 * Menyimpan pilihan fitur.
 *
 * Konfigurator sudah menghitung harga di klien untuk umpan balik instan;
 * endpoint ini adalah penjaga kebenarannya. Server menormalkan ulang seluruh
 * pilihan lewat mesin dependensi dan menghitung ulang harga sendiri, sehingga
 * angka maupun rakitan tidak dapat dimanipulasi dari browser.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limit = rateLimit(clientKey(request, 'save-selection'), 180, 60);
  if (!limit.allowed) return fail('Terlalu banyak perubahan dalam waktu singkat.', 429);

  const { token } = await params;
  const { data, response } = await readBody(request, updateSelectionSchema);
  if (response) return response;

  const result = await updateSelection(token, data.featureIds);
  if (!result.ok) return fail(result.error ?? 'Gagal menyimpan pilihan.', 409);

  return ok({
    breakdown: result.breakdown,
    autoAdded: result.autoAdded ?? [],
    autoRemoved: result.autoRemoved ?? [],
  });
}
