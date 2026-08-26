import { notFound } from 'next/navigation';
import { ProjectOptionsForm } from '@/components/configurator/project-options-form';
import { getConfiguratorPayload } from '@/lib/services/configuration';

export const dynamic = 'force-dynamic';

/** Konfigurasi Proyek (PRD E) — langkah terpisah setelah belanja fitur. */
export default async function KonfigurasiProyekPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await getConfiguratorPayload(token);
  if (!payload) notFound();

  return <ProjectOptionsForm payload={payload} />;
}
