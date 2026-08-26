import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  DescRow,
} from '@/components/ui';
import { ConfiguratorHeader } from '@/components/configurator';
import { ScheduleCall } from '@/components/configurator/schedule-call';
import { prisma } from '@/lib/db/prisma';
import { computeFromPayload, getConfiguratorPayload } from '@/lib/services/configuration';
import { formatDate, formatRupiahShort, formatWeekRange } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * Konfirmasi pengiriman penawaran (PRD F5, F6).
 *
 * Setelah pengiriman, langkah berikutnya ditawarkan seketika: unduh dokumen,
 * lalu jadwalkan sesi konsultasi yang mengunci harga tetap. Membiarkan klien
 * di halaman buntu setelah mengisi kontak adalah titik bocor paling mahal di
 * seluruh corong.
 */
export default async function TerimaKasihPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await getConfiguratorPayload(token);
  if (!payload) notFound();

  const lead = await prisma.lead.findFirst({
    where: { configuration: { publicToken: token } },
    select: {
      id: true,
      quoteNumber: true,
      validUntil: true,
      discoveryCallAt: true,
      contactName: true,
      email: true,
      needsDeepDiscovery: true,
    },
  });

  // Belum dikirim — kembalikan ke formulir.
  if (!lead) redirect(`/rakit/${token}/kirim`);

  const config = payload.configuration;
  const breakdown = computeFromPayload(payload);
  const pendingCustoms = config.customRequests.filter(
    (request) => request.status !== 'ESTIMATED' && request.status !== 'PROMOTED',
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <ConfiguratorHeader payload={payload} step="kirim" />

      <main id="konten-utama" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
              <path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            Penawaran Anda sudah terbit
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
            Terima kasih, {lead.contactName.split(' ')[0]}. Dokumen penawaran sudah dikirim ke{' '}
            <strong className="font-medium text-fg">{lead.email}</strong> dan dapat Anda unduh
            langsung di bawah ini.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-5">
            <dl className="divide-y divide-border">
              <DescRow label="Nomor penawaran" value={lead.quoteNumber} emphasis />
              <DescRow label="Berlaku sampai" value={formatDate(lead.validUntil)} />
              <DescRow
                label="Estimasi biaya proyek"
                value={`${formatRupiahShort(breakdown.displayTotalMin)} – ${formatRupiahShort(
                  breakdown.displayTotalMax,
                )}`}
                emphasis
              />
              <DescRow
                label="Estimasi pengerjaan"
                value={formatWeekRange(
                  breakdown.duration.weeksMin,
                  breakdown.duration.weeksMax,
                )}
              />
              <DescRow label="Jumlah fitur" value={`${breakdown.lines.length} fitur`} />
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <a href={`/api/proposal/${token}/pdf`} target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                    <path d="M8 2v8m0 0 3-3m-3 3L5 7M2.5 11v1.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Unduh penawaran PDF
                </a>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href={`/rakit/${token}/ringkasan`}>Lihat ringkasan lagi</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* BR-02 / D5 — antrean review fitur custom dengan SLA 1x24 jam kerja */}
        {pendingCustoms.length > 0 && (
          <Alert
            tone="info"
            title={`${pendingCustoms.length} fitur khusus sedang kami estimasi`}
            className="mb-6"
          >
            Fitur berikut belum masuk total pada dokumen: {pendingCustoms.map((c) => c.name).join(', ')}.
            Tim kami menyampaikan estimasinya paling lambat 1×24 jam kerja lewat email dan
            WhatsApp, lengkap dengan tautan rakitan yang sudah memuat total final.
          </Alert>
        )}

        {/* BR-15 — porsi custom berlebih memerlukan discovery mendalam */}
        {lead.needsDeepDiscovery && (
          <Alert tone="warning" title="Rakitan Anda perlu sesi discovery yang lebih dalam" className="mb-6">
            Sebagian besar kebutuhan Anda berupa fitur khusus. Agar estimasinya akurat dan tidak
            meleset di tengah jalan, konsultan kami akan menghubungi Anda untuk sesi yang lebih
            panjang dari biasanya sebelum penawaran final diterbitkan.
          </Alert>
        )}

        {/* F6 — penjadwalan discovery call */}
        <div className="mb-6">
          <ScheduleCall
            leadId={lead.id}
            quoteNumber={lead.quoteNumber}
            alreadyScheduledAt={lead.discoveryCallAt?.toISOString() ?? null}
          />
        </div>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-fg">Apa yang terjadi selanjutnya</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {[
                {
                  title: 'Kami tinjau rakitan Anda',
                  body: 'Konsultan memeriksa kelengkapan ruang lingkup dan menyiapkan pertanyaan yang relevan dengan operasional Anda.',
                  done: true,
                },
                {
                  title: 'Sesi konsultasi 30 menit',
                  body: 'Kami menyelaraskan rakitan dengan proses kerja sebenarnya. Di sinilah rentang harga berubah menjadi satu angka tetap.',
                  done: Boolean(lead.discoveryCallAt),
                },
                {
                  title: 'Penawaran final dan kontrak',
                  body: 'Harga tetap berlaku 30 hari, dilengkapi Scope of Work dan klausul perubahan ruang lingkup.',
                  done: false,
                },
                {
                  title: 'Kickoff dan portal proyek',
                  body: 'Setelah uang muka masuk, Anda mendapat akses portal untuk memantau progres per fitur.',
                  done: false,
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    className={
                      step.done
                        ? 'flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white'
                        : 'flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-fg-subtle'
                    }
                  >
                    {step.done ? (
                      <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
                        <path d="m3 6.2 2 2 4-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-fg">{step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center">
          <Badge variant="neutral">Rakitan tersimpan permanen di tautan ini</Badge>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/daftar?rakitan=${token}`}>Buat akun untuk menyimpan rakitan lain</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
