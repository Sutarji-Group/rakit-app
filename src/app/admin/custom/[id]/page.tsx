import Link from 'next/link';

import { MarginBadge, PageBody, PageHeader } from '@/components/admin';
import { ClaimButton } from '@/components/admin/custom/claim-button';
import { NotifyLink } from '@/components/admin/custom/notify-link';
import { PromoteForm } from '@/components/admin/custom/promote-form';
import { ReviewPanel } from '@/components/admin/custom/review-panel';
import {
  CUSTOM_STATUS_VARIANT,
  RISK_LEVEL_VARIANT,
  SLA_HEALTH_LABEL,
  SLA_HEALTH_VARIANT,
  isOpenCustomStatus,
} from '@/components/admin/custom/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescRow,
  EmptyState,
  Separator,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import {
  CONFIGURATION_STATUS_LABEL,
  CUSTOM_REQUEST_STATUS_LABEL,
  LEAD_STAGE_LABEL,
  REQUEST_PRIORITY_LABEL,
  RISK_LEVEL_LABEL,
  coerceEnum,
  LEAD_STAGES,
} from '@/lib/domain/enums';
import {
  formatDateTime,
  formatManDay,
  formatPercent,
  formatRelativeDeadline,
  formatRupiah,
  formatRupiahRange,
} from '@/lib/format';
import { slaHealth } from '@/lib/services/custom-request';
import { getActivePricingRule } from '@/lib/services/pricing-rule';
import { buildClientNotification, listNotificationLog } from '../_lib/notification';
import { getCustomRequestDetail, listPromotionTargets } from '../_lib/queries';

export const metadata = { title: 'Detail Permintaan Custom' };

/**
 * Detail satu permintaan fitur custom (N2–N6).
 *
 * Susunan halaman mengikuti urutan pertanyaan reviewer: apa yang sebenarnya
 * ingin diselesaikan klien, seberapa besar prospek yang menempel padanya, lalu
 * baru keputusan. Konteks komersial sengaja diletakkan sejajar dengan isi
 * permintaan — usaha review yang layak untuk prospek Rp 60 juta berbeda dari
 * yang layak untuk Rp 300 juta.
 */
export default async function CustomRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('customQueue', '/admin/custom');

  const { id } = await params;
  const [request, rule, categories] = await Promise.all([
    getCustomRequestDetail(id),
    getActivePricingRule(),
    listPromotionTargets(),
  ]);
  const notificationLog = await listNotificationLog(request.id);

  const open = isOpenCustomStatus(request.status);
  const health = open ? slaHealth(request.slaDueAt) : null;
  const context = request.context;

  const notification = buildClientNotification({
    requestName: request.name,
    status: request.status,
    configurationName: context.name,
    configurationToken: context.publicToken,
    contactName: context.contactName,
    manDayMin: request.manDayMin,
    manDayMax: request.manDayMax,
    unitPriceMin: request.unitPriceMin,
    unitPriceMax: request.unitPriceMax,
    clarificationQuestion: request.clarificationQuestion,
    rejectReason: request.rejectReason,
  });

  const canPromote = request.status !== 'PROMOTED' && request.status !== 'REJECTED';

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Antrean Fitur Custom', href: '/admin/custom' },
          { label: request.name },
        ]}
        title={request.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={CUSTOM_STATUS_VARIANT[request.status]}>
              {CUSTOM_REQUEST_STATUS_LABEL[request.status]}
            </Badge>
            <Badge variant="outline">{context.categoryShortName}</Badge>
            <Badge variant={request.priority === 'MUST_HAVE' ? 'accent' : 'neutral'}>
              {REQUEST_PRIORITY_LABEL[request.priority]}
            </Badge>
            {request.groupName && <Badge variant="neutral">{request.groupName}</Badge>}
            <span className="text-xs text-fg-subtle">
              Diajukan {formatDateTime(request.createdAt)}
            </span>
          </span>
        }
        actions={
          <>
            {(request.status === 'PENDING' || request.status === 'NEEDS_CLARIFICATION') && (
              <ClaimButton requestId={request.id} size="md" />
            )}
            <PromoteForm
              requestId={request.id}
              requestName={request.name}
              categories={categories}
              suggestedCategoryId={context.categoryId}
              suggestedManDayMin={request.manDayMin}
              suggestedManDayMax={request.manDayMax}
              rule={rule}
              disabled={!canPromote}
              disabledReason={
                request.status === 'PROMOTED'
                  ? 'Permintaan ini sudah dipromosikan ke katalog.'
                  : 'Permintaan yang ditolak tidak dapat dipromosikan.'
              }
            />
          </>
        }
      />

      <PageBody className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Yang ingin diselesaikan klien</CardTitle>
              <CardDescription>
                Formulir pengajuan sengaja terstruktur, bukan satu kotak teks bebas (D2) — jawaban
                bebas menghasilkan permintaan yang mustahil diestimasi dalam 1×24 jam.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Masalah yang ingin diselesaikan
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                  {request.problem}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Siapa yang memakainya
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                  {request.userRoles}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Alur ideal menurut klien
                </h3>
                {request.flowSteps.length > 0 ? (
                  <ol className="mt-2 flex flex-col gap-2">
                    {request.flowSteps.map((step, index) => (
                      <li key={`${index}-${step.slice(0, 12)}`} className="flex gap-3 text-sm">
                        <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-fg-muted">
                          {index + 1}
                        </span>
                        <span className="leading-relaxed text-fg">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-1.5 text-sm text-fg-subtle">
                    Klien tidak menuliskan langkahnya. Ini kandidat kuat untuk klarifikasi.
                  </p>
                )}
              </section>

              <Separator />

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  Lampiran &amp; tautan referensi
                </h3>
                {request.attachments.length === 0 && request.referenceLinks.length === 0 ? (
                  <p className="mt-1.5 text-sm text-fg-subtle">
                    Tidak ada lampiran. Bila alurnya sulit dibayangkan, minta klien mengirim
                    tangkapan layar sistem yang sekarang dipakai.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                    {request.attachments.map((attachment, index) => (
                      <li key={`${attachment.url}-${index}`}>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="break-all text-brand hover:underline"
                        >
                          {attachment.name || attachment.url}
                        </a>
                        <span className="ml-2 text-xs text-fg-subtle">{attachment.kind}</span>
                      </li>
                    ))}
                    {request.referenceLinks.map((link, index) => (
                      <li key={`${link}-${index}`}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="break-all text-brand hover:underline"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </CardContent>
          </Card>

          <ReviewPanel
            requestId={request.id}
            status={request.status}
            rule={rule}
            initial={{
              manDayMin: request.manDayMin,
              manDayMax: request.manDayMax,
              riskLevel: request.riskLevel,
              internalNote: request.internalNote,
              clarificationQuestion: request.clarificationQuestion,
              rejectReason: request.rejectReason,
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>Hasil review sejauh ini</CardTitle>
              <CardDescription>
                Catatan internal tidak pernah ditampilkan ke klien (PRD 6.4).
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              {request.manDayMin !== null && request.manDayMax !== null ? (
                <dl>
                  <DescRow
                    label="Estimasi effort"
                    value={`${formatManDay(request.manDayMin)} – ${formatManDay(request.manDayMax)}`}
                  />
                  <DescRow
                    label="Harga jual turunan"
                    emphasis
                    value={
                      request.unitPriceMin !== null && request.unitPriceMax !== null
                        ? formatRupiahRange(request.unitPriceMin, request.unitPriceMax, false)
                        : '—'
                    }
                  />
                  <DescRow
                    label="Tingkat risiko"
                    value={
                      request.riskLevel ? (
                        <Badge variant={RISK_LEVEL_VARIANT[request.riskLevel]}>
                          {RISK_LEVEL_LABEL[request.riskLevel]}
                        </Badge>
                      ) : (
                        '—'
                      )
                    }
                  />
                  <DescRow
                    label="Diestimasi pada"
                    value={request.estimatedAt ? formatDateTime(request.estimatedAt) : '—'}
                  />
                </dl>
              ) : (
                <p className="text-sm text-fg-muted">
                  Belum ada estimasi. Selama itu, fitur ini tidak ikut dihitung ke total rakitan
                  klien (BR-02).
                </p>
              )}

              {request.internalNote && (
                <div className="rounded-lg border border-border bg-surface-sunken p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                    Catatan internal
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                    {request.internalNote}
                  </p>
                </div>
              )}

              {request.clarificationQuestion && (
                <Alert tone="info" title="Pertanyaan klarifikasi yang sudah diajukan">
                  <p className="whitespace-pre-wrap">{request.clarificationQuestion}</p>
                  {request.clarificationAnswer && (
                    <p className="mt-2 whitespace-pre-wrap">
                      <span className="font-semibold">Jawaban klien: </span>
                      {request.clarificationAnswer}
                    </p>
                  )}
                </Alert>
              )}

              {request.rejectReason && (
                <Alert tone="danger" title="Alasan tidak dapat dikerjakan">
                  <p className="whitespace-pre-wrap">{request.rejectReason}</p>
                </Alert>
              )}

              {request.status === 'PROMOTED' && request.promotedFeatureName && (
                <Alert tone="success" title="Sudah menjadi fitur katalog">
                  <p>
                    Permintaan ini dipromosikan menjadi{' '}
                    <span className="font-semibold">{request.promotedFeatureName}</span>. Klien
                    berikutnya menemukannya sebagai fitur siap pakai dengan harga lebih rendah
                    (PRD 2.3).
                  </p>
                  {request.promotedCategorySlug && request.promotedFeatureId && (
                    <p className="mt-2">
                      <Link
                        href={`/admin/katalog/${request.promotedCategorySlug}/fitur/${request.promotedFeatureId}`}
                        className="font-medium underline underline-offset-4"
                      >
                        Buka entri katalognya
                      </Link>
                    </p>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenggat review</CardTitle>
              <CardDescription>
                Janji kami ke klien: keputusan dalam 1×24 jam kerja (BR-04).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {health ? (
                <div className="flex flex-col gap-2">
                  <Badge variant={SLA_HEALTH_VARIANT[health]} size="md">
                    {formatRelativeDeadline(request.slaDueAt)}
                  </Badge>
                  <p className="text-sm text-fg-muted">
                    {SLA_HEALTH_LABEL[health]} · tenggat {formatDateTime(request.slaDueAt)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-fg-muted">
                  Sudah diputuskan — tenggat tidak lagi berjalan.
                </p>
              )}
              <dl className="mt-3">
                <DescRow label="Reviewer" value={request.reviewerName ?? 'Belum diambil'} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Konteks rakitan klien</CardTitle>
              <CardDescription>
                Seberapa besar prospek yang menempel pada permintaan ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl>
                <DescRow label="Rakitan" value={context.name} />
                <DescRow label="Kategori" value={context.categoryName} />
                <DescRow label="Jumlah fitur katalog" value={`${context.featureCount} fitur`} />
                <DescRow
                  label="Fitur custom di rakitan ini"
                  value={`${context.customCount} permintaan`}
                />
                <DescRow
                  label="Nilai rakitan"
                  emphasis
                  value={formatRupiahRange(context.totalMin, context.totalMax, false)}
                />
                {context.grossMarginPct > 0 && (
                  <DescRow
                    label="Proyeksi margin"
                    value={<MarginBadge value={context.grossMarginPct} />}
                  />
                )}
                {context.customSharePct > 0 && (
                  <DescRow
                    label="Porsi custom"
                    value={formatPercent(context.customSharePct, 0)}
                  />
                )}
                <DescRow
                  label="Status rakitan"
                  value={CONFIGURATION_STATUS_LABEL[context.status]}
                />
                <DescRow label="Dibuat" value={formatDateTime(context.createdAt)} />
              </dl>

              <Separator className="my-3" />

              <dl>
                <DescRow label="Kontak" value={context.contactName ?? 'Belum dikirim'} />
                {context.company && <DescRow label="Perusahaan" value={context.company} />}
                {context.email && <DescRow label="Email" value={context.email} />}
                {context.whatsapp && <DescRow label="WhatsApp" value={context.whatsapp} />}
                {context.quoteNumber && (
                  <DescRow label="Nomor penawaran" value={context.quoteNumber} />
                )}
                {context.leadStage && (
                  <DescRow
                    label="Tahap pipeline"
                    value={
                      LEAD_STAGE_LABEL[coerceEnum(context.leadStage, LEAD_STAGES, 'NEW')]
                    }
                  />
                )}
              </dl>

              <div className="mt-4">
                <Button asChild variant="secondary" size="sm">
                  <a
                    href={`/rakit/${context.publicToken}/ringkasan`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Lihat rakitan seperti yang dilihat klien
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {notification ? (
            <NotifyLink
              title={notification.title}
              hint={notification.hint}
              link={notification.link}
              message={notification.message}
            />
          ) : (
            <EmptyState
              title="Belum ada yang perlu dikabari"
              description="Setelah satu keputusan diambil, pesan dan tautan siap salin untuk klien muncul di sini. Platform ini tidak mengirim email otomatis — pengiriman tetap dilakukan manusia."
            />
          )}

          {notificationLog.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Riwayat pemberitahuan</CardTitle>
                <CardDescription>
                  Tercatat di jejak audit agar dapat ditelusuri bila klien mengaku tidak dikabari.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {notificationLog.map((entry) => (
                  <div key={entry.id} className="text-sm">
                    <p className="text-fg">{entry.summary}</p>
                    <p className="text-xs text-fg-subtle">
                      {entry.actorLabel} · {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {request.unitPriceMax !== null && request.unitPriceMax > 0 && (
            <Alert tone="neutral">
              Fitur ini menyumbang {formatRupiah(request.unitPriceMax)} pada batas atas rakitan
              klien. Angka per fitur tidak pernah ditampilkan di kartu konfigurator — klien hanya
              melihat indikator dampak (C2.4).
            </Alert>
          )}
        </div>
      </PageBody>
    </>
  );
}
