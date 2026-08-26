import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DescRow,
  FeatureTypeBadge,
  Separator,
} from '@/components/ui';
import { ConfiguratorHeader } from '@/components/configurator';
import { SummaryAnalytics } from '@/components/configurator/summary-analytics';
import {
  computeFromPayload,
  getConfiguratorPayload,
} from '@/lib/services/configuration';
import {
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORM_LABEL,
  USER_TIER_LABEL,
} from '@/lib/domain/enums';
import { formatRupiah, formatRupiahShort, formatWeekRange } from '@/lib/format';
import { DEFAULT_ASSUMPTIONS, DEFAULT_EXCLUSIONS } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * Ringkasan konfigurasi (PRD F1).
 *
 * Ini dokumen yang dibawa persona Sarah ke rapat direksi, jadi halamannya
 * disusun agar bisa dicetak langsung dari browser dan tetap terbaca.
 */
export default async function RingkasanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await getConfiguratorPayload(token);
  if (!payload) notFound();

  const breakdown = computeFromPayload(payload);
  const config = payload.configuration;

  // Kelompokkan baris fitur mengikuti kelompok katalog agar ringkasan terbaca
  // seperti daftar isi aplikasi, bukan daftar belanja acak.
  const groupOrder = payload.catalog.groups.map((group) => group.name);
  const byGroup = new Map<string, typeof breakdown.lines>();
  for (const line of breakdown.lines) {
    const key = line.groupName ?? 'Lainnya';
    byGroup.set(key, [...(byGroup.get(key) ?? []), line]);
  }
  const orderedGroups = [
    ...groupOrder.filter((name) => byGroup.has(name)),
    ...[...byGroup.keys()].filter((name) => !groupOrder.includes(name)),
  ];

  const pendingCustoms = config.customRequests.filter(
    (request) => request.status !== 'ESTIMATED' && request.status !== 'PROMOTED',
  );

  const blockingGuardrail = breakdown.guardrails.find((g) => g.blocking && g.clientMessage);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="no-print">
        <ConfiguratorHeader payload={payload} step="ringkasan" />
      </div>

      <SummaryAnalytics
        token={token}
        totalMin={breakdown.totalMin}
        totalMax={breakdown.totalMax}
        featureCount={breakdown.lines.length}
      />

      <main id="konten-utama" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* -- Kepala ringkasan --------------------------------------------- */}
        <header className="mb-8">
          <p className="text-sm font-medium text-brand">{payload.catalog.category.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-fg">
            {config.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
            Ringkasan lengkap rakitan Anda. Halaman ini dapat dicetak langsung, dan versi PDF
            ber-nomor penawaran tersedia setelah Anda mengisi kontak.
          </p>
        </header>

        {/* -- Angka utama --------------------------------------------------- */}
        <Card className="mb-6 overflow-hidden">
          <div className="grid gap-px bg-border sm:grid-cols-3">
            <div className="bg-surface p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                Estimasi biaya proyek
              </p>
              <p className="tabular mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-fg">
                {formatRupiahShort(breakdown.displayTotalMin)} –{' '}
                {formatRupiahShort(breakdown.displayTotalMax)}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">Sekali bayar, dibayar bertahap</p>
            </div>
            <div className="bg-surface p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                Estimasi pengerjaan
              </p>
              <p className="tabular mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-fg">
                {formatWeekRange(breakdown.duration.weeksMin, breakdown.duration.weeksMax)}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">Sejak kickoff sampai go-live</p>
            </div>
            <div className="bg-surface p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                Biaya bulanan
              </p>
              <p className="tabular mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-fg">
                {breakdown.recurringMonthlyMax > 0
                  ? `${formatRupiahShort(breakdown.recurringMonthlyMin)} – ${formatRupiahShort(breakdown.recurringMonthlyMax)}`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">Terpisah dari nilai proyek</p>
            </div>
          </div>
        </Card>

        {blockingGuardrail && (
          <Alert
            tone="warning"
            title="Perlu dibahas lebih dulu"
            className="mb-6"
            action={
              <Button asChild size="sm" variant="secondary">
                <Link href={`/konsultasi?dari=${token}`}>Jadwalkan konsultasi</Link>
              </Button>
            }
          >
            {blockingGuardrail.clientMessage}
          </Alert>
        )}

        {pendingCustoms.length > 0 && (
          <Alert tone="info" title="Ada fitur khusus yang menunggu estimasi" className="mb-6">
            {pendingCustoms.length} fitur yang Anda ajukan belum masuk hitungan di atas. Tim kami
            memberi estimasinya dalam 1×24 jam kerja setelah rakitan ini dikirim, lalu total final
            dikirimkan ke Anda. Kami tidak pernah menampilkan angka yang belum diperiksa manusia.
          </Alert>
        )}

        <div className="flex flex-col gap-6">
          {/* -- Rincian fitur per kelompok ---------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Ruang lingkup fitur</CardTitle>
              <p className="text-sm text-fg-muted">
                {breakdown.lines.length} fitur, termasuk {breakdown.coreFeatureCount} modul fondasi
                yang selalu ikut.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {orderedGroups.map((groupName) => (
                <section key={groupName}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    {groupName}
                  </h3>
                  <ul className="flex flex-col divide-y divide-border">
                    {byGroup.get(groupName)!.map((line) => (
                      <li
                        key={line.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                      >
                        <span className="flex flex-wrap items-center gap-2 text-sm text-fg">
                          {line.name}
                          {line.type !== 'STANDARD' && <FeatureTypeBadge type={line.type} />}
                        </span>
                        <span className="tabular text-sm text-fg-muted">
                          {line.includedInBasePackage
                            ? 'Termasuk paket dasar'
                            : line.priceMin === line.priceMax
                              ? formatRupiah(line.priceMin)
                              : `${formatRupiah(line.priceMin)} – ${formatRupiah(line.priceMax)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {pendingCustoms.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    Fitur khusus — menunggu estimasi
                  </h3>
                  <ul className="flex flex-col divide-y divide-border">
                    {pendingCustoms.map((request) => (
                      <li
                        key={request.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                      >
                        <span className="text-sm text-fg">{request.name}</span>
                        <Badge variant="warning">Menunggu estimasi</Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </CardContent>
          </Card>

          {/* -- Konfigurasi proyek ------------------------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi proyek</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <DescRow label="Platform" value={PROJECT_PLATFORM_LABEL[config.platform]} />
                <DescRow label="Deployment" value={PROJECT_DEPLOYMENT_LABEL[config.deployment]} />
                <DescRow label="Jumlah pengguna" value={USER_TIER_LABEL[config.userTier]} />
                {breakdown.addOnLines.map((addOn) => (
                  <DescRow
                    key={addOn.id}
                    label={addOn.name}
                    value={
                      addOn.priceMin === addOn.priceMax
                        ? formatRupiah(addOn.priceMin)
                        : `${formatRupiah(addOn.priceMin)} – ${formatRupiah(addOn.priceMax)}`
                    }
                  />
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* -- Perhitungan biaya ------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Perhitungan biaya</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                {breakdown.corePackagePrice > 0 && (
                  <DescRow
                    label={`Paket dasar — ${breakdown.coreFeatureCount} modul fondasi`}
                    value={formatRupiah(breakdown.corePackagePrice)}
                  />
                )}
                <DescRow
                  label="Subtotal fitur"
                  value={`${formatRupiah(breakdown.featuresSubtotalMin)} – ${formatRupiah(breakdown.featuresSubtotalMax)}`}
                />
                {breakdown.platformMultiplier !== 1 && (
                  <DescRow
                    label={`Penyesuaian platform — ${PROJECT_PLATFORM_LABEL[config.platform]}`}
                    value={`× ${breakdown.platformMultiplier.toFixed(2)}`}
                  />
                )}
                {breakdown.deploymentMultiplier !== 1 && (
                  <DescRow
                    label={`Penyesuaian deployment — ${PROJECT_DEPLOYMENT_LABEL[config.deployment]}`}
                    value={`× ${breakdown.deploymentMultiplier.toFixed(2)}`}
                  />
                )}
                {breakdown.discountPct > 0 && (
                  <DescRow
                    label={`Diskon skala — ${breakdown.discountLabel}`}
                    value={
                      <span className="text-success">
                        −{formatRupiah(breakdown.discountMin)} – {formatRupiah(breakdown.discountMax)}
                      </span>
                    }
                  />
                )}
                {breakdown.addOnOneTimeMax > 0 && (
                  <DescRow
                    label="Add-on proyek"
                    value={`${formatRupiah(breakdown.addOnOneTimeMin)} – ${formatRupiah(breakdown.addOnOneTimeMax)}`}
                  />
                )}
                {breakdown.setupFee > 0 && (
                  <DescRow
                    label="Biaya setup & onboarding"
                    value={formatRupiah(breakdown.setupFee)}
                  />
                )}
                <DescRow
                  label="Total estimasi proyek"
                  value={`${formatRupiah(breakdown.totalMin)} – ${formatRupiah(breakdown.totalMax)}`}
                  emphasis
                />
              </dl>

              {breakdown.recurringLines.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="mb-2 text-sm font-semibold text-fg">
                    Biaya bulanan berulang — terpisah dari nilai proyek
                  </p>
                  <dl className="divide-y divide-border">
                    {breakdown.recurringLines.map((line) => (
                      <DescRow
                        key={line.id}
                        label={line.name}
                        value={`${formatRupiah(line.priceMin)} – ${formatRupiah(line.priceMax)} / bulan`}
                      />
                    ))}
                  </dl>
                </>
              )}
            </CardContent>
          </Card>

          {/* -- Timeline fase ------------------------------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>Perkiraan tahapan pengerjaan</CardTitle>
              <p className="text-sm text-fg-muted">
                Total {formatWeekRange(breakdown.duration.weeksMin, breakdown.duration.weeksMax)},
                dihitung dari kompleksitas fitur yang Anda pilih.
              </p>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {breakdown.duration.phases.map((phase, index) => (
                  <li key={phase.name} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-fg">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-fg">{phase.name}</p>
                        <p className="tabular text-xs text-fg-subtle">± {phase.weeks} minggu</p>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                        {phase.description}
                      </p>
                      <div
                        className="mt-1.5 h-1.5 rounded-full bg-brand/70"
                        style={{
                          width: `${Math.max(
                            8,
                            (phase.weeks /
                              breakdown.duration.phases.reduce((s, p) => s + p.weeks, 0)) *
                              100,
                          )}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* -- Asumsi ------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Asumsi yang kami pakai</CardTitle>
              <p className="text-sm text-fg-muted">
                Estimasi di atas berlaku selama asumsi berikut terpenuhi.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {DEFAULT_ASSUMPTIONS.map((assumption) => (
                  <li key={assumption} className="flex gap-2 text-sm leading-relaxed text-fg-muted">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden="true" />
                    {assumption}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* -- Yang tidak termasuk (F2) ------------------------------------- */}
          <Card className="border-warning/25">
            <CardHeader>
              <CardTitle>Yang tidak termasuk</CardTitle>
              <p className="text-sm text-fg-muted">
                Kami menuliskannya di depan supaya tidak menjadi perdebatan di tengah proyek.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {DEFAULT_EXCLUSIONS.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-fg-muted">
                    <svg viewBox="0 0 14 14" className="mt-1 size-3 shrink-0 text-warning" fill="none" aria-hidden="true">
                      <path d="m4 4 6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* -- Aksi ---------------------------------------------------------- */}
        <div className="no-print mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button asChild variant="secondary">
            <Link href={`/rakit/${token}/proyek`}>Kembali</Link>
          </Button>
          {config.quoteNumber ? (
            <Button asChild size="lg">
              <a href={`/api/proposal/${token}/pdf`}>Unduh penawaran PDF</a>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href={`/rakit/${token}/kirim`}>Ambil penawaran PDF</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link href={`/konsultasi?dari=${token}`}>Bicara dengan konsultan</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
