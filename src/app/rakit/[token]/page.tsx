import { notFound } from 'next/navigation';
import { ConfiguratorShell } from '@/components/configurator';
import { getConfiguratorPayload } from '@/lib/services/configuration';

export const dynamic = 'force-dynamic';

/**
 * Konfigurator "Belanja Fitur" (PRD C) — inti produk.
 *
 * Seluruh katalog satu kategori dimuat sekali di server, lalu konfigurator
 * menghitung harga sepenuhnya di browser. Itulah yang membuat perubahan harga
 * tampil seketika saat fitur di-toggle, jauh di bawah ambang 200 ms.
 */
export default async function KonfiguratorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await getConfiguratorPayload(token);
  if (!payload) notFound();

  return <ConfiguratorShell payload={payload} />;
}
