import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import { ConsultationActions } from '@/components/admin/custom/consultation-actions';
import { FilterRow } from '@/components/admin/custom/filter-row';
import {
  CONSULTATION_STATUS_VARIANT,
  GUARDRAIL_TOPIC_REASON,
  isGuardrailTopic,
} from '@/components/admin/custom/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Stat,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import {
  CONSULTATION_STATUSES,
  CONSULTATION_STATUS_LABEL,
  CONSULTATION_TOPICS,
  CONSULTATION_TOPIC_LABEL,
  coerceEnum,
  type ConsultationStatus,
} from '@/lib/domain/enums';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Permintaan Konsultasi' };

/**
 * Papan permintaan konsultasi masuk.
 *
 * Dua topik di sini tidak lahir dari kebingungan klien melainkan dari pagar
 * pengaman yang sengaja kami pasang (BR-13, BR-03). Klien yang datang lewat
 * pintu itu sudah tahu persis apa yang ia mau — sistemlah yang menahannya —
 * jadi pembukaan percakapannya berbeda, dan karena itu ditandai khusus.
 */
export default async function ConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireArea('customQueue', '/admin/konsultasi');

  const [query, requests] = await Promise.all([
    searchParams,
    prisma.consultationRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    }),
  ]);

  const rows = requests.map((request) => ({
    id: request.id,
    name: request.name,
    company: request.company,
    email: request.email,
    whatsapp: request.whatsapp,
    message: request.message,
    configurationToken: request.configurationToken,
    createdAt: request.createdAt,
    topic: coerceEnum(request.topic, CONSULTATION_TOPICS, 'UNSURE'),
    status: coerceEnum(request.status, CONSULTATION_STATUSES, 'NEW'),
  }));

  const statusFilter = CONSULTATION_STATUSES.includes(query.status as ConsultationStatus)
    ? (query.status as ConsultationStatus)
    : null;

  const filtered = statusFilter ? rows.filter((row) => row.status === statusFilter) : rows;

  const statusCounts = new Map<ConsultationStatus, number>();
  for (const row of rows) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }

  const guardrailCount = rows.filter(
    (row) => isGuardrailTopic(row.topic) && row.status !== 'CLOSED',
  ).length;

  return (
    <>
      <PageHeader
        title="Permintaan Konsultasi"
        description="Klien yang memilih bicara lebih dulu — entah karena kebutuhannya di luar katalog, karena ragu, atau karena pagar pengaman kami yang sengaja menahannya di depan pintu."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/custom">Antrean fitur custom</Link>
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Belum dihubungi"
            value={statusCounts.get('NEW') ?? 0}
            tone={(statusCounts.get('NEW') ?? 0) > 0 ? 'warning' : 'neutral'}
            hint="Semakin lama menunggu, semakin dingin percakapannya."
          />
          <Stat label="Sudah dihubungi" value={statusCounts.get('CONTACTED') ?? 0} />
          <Stat
            label="Terjadwal"
            value={statusCounts.get('SCHEDULED') ?? 0}
            tone="brand"
            hint="Sesi discovery sudah punya tanggal."
          />
          <Stat
            label="Dari pagar pengaman"
            value={guardrailCount}
            tone={guardrailCount > 0 ? 'brand' : 'neutral'}
            hint="Prospek yang ditahan sistem, bukan yang kebingungan."
          />
        </div>

        {guardrailCount > 0 && (
          <Alert tone="info" title="Sebagian permintaan di bawah ini berasal dari pagar pengaman">
            Klien dengan topik “Konfigurasi di bawah proyek minimum” dan “Fitur custom melebihi
            batas” sudah tahu apa yang mereka butuhkan — konfigurator yang sengaja tidak
            menerbitkan angka untuk mereka. Buka percakapannya dari kebutuhan yang sudah mereka
            susun, bukan dari nol.
          </Alert>
        )}

        <FilterRow
          label="Status"
          options={[
            {
              href: '/admin/konsultasi',
              label: 'Semua',
              count: rows.length,
              active: statusFilter === null,
            },
            ...CONSULTATION_STATUSES.map((status) => ({
              href: `/admin/konsultasi?status=${status}`,
              label: CONSULTATION_STATUS_LABEL[status],
              count: statusCounts.get(status) ?? 0,
              active: statusFilter === status,
            })),
          ]}
        />

        {filtered.length === 0 ? (
          <EmptyState
            title={
              rows.length === 0
                ? 'Belum ada permintaan konsultasi'
                : 'Tidak ada permintaan dengan status ini'
            }
            description={
              rows.length === 0
                ? 'Permintaan dari kartu “Aplikasi lain / Belum yakin”, tombol “Bicara dengan konsultan” di konfigurator, dan dari pagar pengaman nilai proyek minimum akan muncul di sini lengkap dengan kontak, topik, dan pesan klien.'
                : 'Coba pilih status lain untuk melihat permintaan yang tersisa.'
            }
            action={
              rows.length > 0 ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/admin/konsultasi">Tampilkan semua</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((row) => {
              const guardrail = isGuardrailTopic(row.topic);
              return (
                <Card key={row.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle>{row.name}</CardTitle>
                        {row.company && (
                          <p className="text-sm text-fg-muted">{row.company}</p>
                        )}
                      </div>
                      <Badge variant={CONSULTATION_STATUS_VARIANT[row.status]} size="md">
                        {CONSULTATION_STATUS_LABEL[row.status]}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={guardrail ? 'accent' : 'outline'}>
                        {CONSULTATION_TOPIC_LABEL[row.topic]}
                      </Badge>
                      {guardrail && <Badge variant="warning">Dari pagar pengaman</Badge>}
                      <span className="text-xs text-fg-subtle">
                        Masuk {formatDateTime(row.createdAt)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-3">
                    {guardrail && (
                      <Alert tone="brand">{GUARDRAIL_TOPIC_REASON[row.topic]}</Alert>
                    )}

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
                      {row.message}
                    </p>

                    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm">
                      <a
                        href={`mailto:${row.email}`}
                        className="break-all text-brand hover:underline"
                      >
                        {row.email}
                      </a>
                      <a
                        href={`https://wa.me/${row.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-brand hover:underline"
                      >
                        {row.whatsapp}
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {row.configurationToken ? (
                        <Button asChild size="sm" variant="ghost">
                          <a
                            href={`/rakit/${row.configurationToken}/ringkasan`}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Lihat rakitannya
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-fg-subtle">
                          Belum ada rakitan yang menempel pada permintaan ini.
                        </span>
                      )}

                      <ConsultationActions id={row.id} status={row.status} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
