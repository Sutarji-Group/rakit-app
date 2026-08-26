import { notFound, redirect } from 'next/navigation';
import { Alert, Button } from '@/components/ui';
import Link from 'next/link';
import { ConfiguratorHeader } from '@/components/configurator';
import { LeadForm } from '@/components/configurator/lead-form';
import { computeFromPayload, getConfiguratorPayload } from '@/lib/services/configuration';

export const dynamic = 'force-dynamic';

/** Ambil penawaran PDF (PRD F3). */
export default async function KirimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await getConfiguratorPayload(token);
  if (!payload) notFound();

  // Rakitan yang sudah dikirim langsung diarahkan ke halaman konfirmasinya.
  if (payload.configuration.quoteNumber) {
    redirect(`/rakit/${token}/terima-kasih`);
  }

  const breakdown = computeFromPayload(payload);
  const blocking = breakdown.guardrails.find((g) => g.blocking && g.clientMessage);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <ConfiguratorHeader payload={payload} step="kirim" />

      <main id="konten-utama" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            Ambil penawaran resmi Anda
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Angkanya sudah Anda lihat sejak awal — formulir ini untuk menerbitkan dokumen
            resminya, lengkap dengan nomor penawaran dan masa berlaku 30 hari.
          </p>
        </header>

        {blocking ? (
          <Alert
            tone="warning"
            title="Rakitan ini perlu kami bahas dulu"
            action={
              <Button asChild size="sm">
                <Link href={`/konsultasi?dari=${token}`}>Jadwalkan konsultasi</Link>
              </Button>
            }
          >
            {blocking.clientMessage} Penawaran otomatis belum bisa terbit untuk konfigurasi ini,
            tetapi konsultan kami dapat membantu menyusun ruang lingkup yang pas dalam satu sesi
            30 menit.
          </Alert>
        ) : (
          <LeadForm
            token={token}
            breakdown={breakdown}
            featureCount={payload.configuration.selectedFeatureIds.length}
            pendingCustomCount={breakdown.pendingCustomCount}
          />
        )}
      </main>
    </div>
  );
}
