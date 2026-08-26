import { requireArea } from '@/lib/auth/guards';
import { exportCatalogCsv } from '../../_lib/import';

export const runtime = 'nodejs';

/**
 * Unduhan CSV katalog (L6).
 *
 * Dibuat sebagai route handler, bukan Server Action, supaya berkasnya dapat
 * diunduh lewat tautan biasa — termasuk saat admin menyalin URL-nya ke skrip
 * kalibrasi di luar aplikasi.
 */
export async function GET(request: Request): Promise<Response> {
  await requireArea('catalog');

  const categorySlug = new URL(request.url).searchParams.get('kategori') ?? '';
  const csv = await exportCatalogCsv(categorySlug || undefined);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = categorySlug
    ? `katalog-${categorySlug}-${stamp}.csv`
    : `katalog-rakit-${stamp}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
