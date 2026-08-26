import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/admin';
import { ClaimButton } from '@/components/admin/custom/claim-button';
import { FilterRow } from '@/components/admin/custom/filter-row';
import {
  CUSTOM_STATUS_VARIANT,
  SLA_HEALTH_LABEL,
  SLA_HEALTH_RANK,
  SLA_HEALTH_VARIANT,
  isOpenCustomStatus,
} from '@/components/admin/custom/shared';
import {
  Badge,
  Button,
  EmptyState,
  Stat,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import {
  CUSTOM_REQUEST_STATUSES,
  CUSTOM_REQUEST_STATUS_LABEL,
  REQUEST_PRIORITIES,
  REQUEST_PRIORITY_LABEL,
  coerceEnum,
  type CustomRequestStatus,
} from '@/lib/domain/enums';
import { formatDateTime, formatRelativeDeadline, formatRupiahShort } from '@/lib/format';
import {
  listCustomQueue,
  listPromotionCandidates,
  slaHealth,
  type SlaHealth,
} from '@/lib/services/custom-request';

export const metadata = { title: 'Antrean Fitur Custom' };

/**
 * Antrean review fitur custom (N1).
 *
 * Papan ini adalah satu-satunya tempat SLA 1×24 jam kerja (BR-04) terlihat,
 * sehingga urutannya sengaja tidak dapat diubah pengguna: yang paling dekat
 * tenggat selalu di atas. Permintaan yang sudah diputuskan turun ke bawah
 * karena ia tidak lagi menahan siapa pun.
 */
export default async function CustomQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kategori?: string }>;
}) {
  await requireArea('customQueue', '/admin/custom');

  const [query, queue, candidates] = await Promise.all([
    searchParams,
    listCustomQueue(),
    listPromotionCandidates(),
  ]);

  const now = new Date();

  const rows = queue.map((request) => {
    const status = coerceEnum(request.status, CUSTOM_REQUEST_STATUSES, 'PENDING');
    const open = isOpenCustomStatus(status);
    return {
      id: request.id,
      name: request.name,
      status,
      open,
      priority: coerceEnum(request.priority, REQUEST_PRIORITIES, 'MUST_HAVE'),
      // Hanya permintaan terbuka yang punya tenggat berjalan; yang sudah
      // diputuskan tidak lagi dihitung agar antrean tidak tampak merah palsu.
      health: open ? slaHealth(request.slaDueAt, now) : null,
      slaDueAt: request.slaDueAt,
      updatedAt: request.updatedAt,
      reviewerName: request.reviewer?.name ?? null,
      categorySlug: request.configuration.category.slug,
      categoryShortName: request.configuration.category.shortName,
      configurationName: request.configuration.name,
      totalMax: request.configuration.totalMax,
      contactName:
        request.configuration.lead?.contactName ?? request.configuration.lead?.company ?? null,
      company: request.configuration.lead?.company ?? null,
      quoteNumber: request.configuration.lead?.quoteNumber ?? null,
    };
  });

  const statusFilter = CUSTOM_REQUEST_STATUSES.includes(query.status as CustomRequestStatus)
    ? (query.status as CustomRequestStatus)
    : null;
  const categoryFilter = query.kategori ?? null;

  const filtered = rows
    .filter((row) => (statusFilter ? row.status === statusFilter : true))
    .filter((row) => (categoryFilter ? row.categorySlug === categoryFilter : true))
    .sort(compareUrgency);

  const statusCounts = new Map<CustomRequestStatus, number>();
  for (const row of rows) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }

  // Pilihan kategori diambil dari isi antrean, bukan dari seluruh katalog,
  // supaya penyaring tidak menawarkan kategori yang pasti kosong.
  const categoryOptions = [...new Map(rows.map((row) => [row.categorySlug, row])).values()]
    .map((row) => ({
      slug: row.categorySlug,
      label: row.categoryShortName,
      count: rows.filter((item) => item.categorySlug === row.categorySlug).length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'));

  const openRows = rows.filter((row) => row.open);
  const overdue = openRows.filter((row) => row.health === 'MERAH').length;
  const nearDue = openRows.filter((row) => row.health === 'KUNING').length;

  return (
    <>
      <PageHeader
        title="Antrean Fitur Custom"
        description="Setiap fitur khusus yang diajukan klien menunggu keputusan manusia di sini. Selama belum diestimasi, nilainya tidak pernah ikut masuk total penawaran (BR-02) — jadi antrean yang menumpuk berarti penawaran yang tertahan."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/custom/kandidat">Kandidat promosi ({candidates.length})</Link>
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Menunggu keputusan"
            value={openRows.length}
            hint="Termasuk yang sedang direview dan yang menunggu jawaban klien."
          />
          <Stat
            label="Mendekati tenggat"
            value={nearDue}
            tone={nearDue > 0 ? 'warning' : 'neutral'}
            hint="Sisa waktu kurang dari 4 jam."
          />
          <Stat
            label="Lewat tenggat"
            value={overdue}
            tone={overdue > 0 ? 'danger' : 'neutral'}
            hint="Melanggar janji 1×24 jam kerja (BR-04)."
          />
          <Stat
            label="Kandidat promosi"
            value={candidates.length}
            tone={candidates.length > 0 ? 'brand' : 'neutral'}
            hint="Permintaan serupa yang berulang dan layak masuk katalog."
          />
        </div>

        <div className="flex flex-col gap-3">
          <FilterRow
            label="Status"
            options={[
              {
                href: buildHref({ kategori: categoryFilter }),
                label: 'Semua',
                count: rows.length,
                active: statusFilter === null,
              },
              ...CUSTOM_REQUEST_STATUSES.map((status) => ({
                href: buildHref({ status, kategori: categoryFilter }),
                label: CUSTOM_REQUEST_STATUS_LABEL[status],
                count: statusCounts.get(status) ?? 0,
                active: statusFilter === status,
              })),
            ]}
          />

          {categoryOptions.length > 1 && (
            <FilterRow
              label="Kategori aplikasi"
              options={[
                {
                  href: buildHref({ status: statusFilter }),
                  label: 'Semua',
                  count: rows.length,
                  active: categoryFilter === null,
                },
                ...categoryOptions.map((option) => ({
                  href: buildHref({ status: statusFilter, kategori: option.slug }),
                  label: option.label,
                  count: option.count,
                  active: categoryFilter === option.slug,
                })),
              ]}
            />
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={
              rows.length === 0
                ? 'Belum ada fitur custom yang diajukan'
                : 'Tidak ada permintaan yang cocok dengan penyaring ini'
            }
            description={
              rows.length === 0
                ? 'Begitu klien mengajukan fitur di luar katalog dari konfigurator, permintaannya muncul di sini lengkap dengan penghitung SLA 1×24 jam kerja, konteks rakitannya, dan tombol untuk memberi estimasi.'
                : 'Coba longgarkan penyaring status atau kategori untuk melihat permintaan lainnya.'
            }
            action={
              rows.length > 0 ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/admin/custom">Tampilkan semua</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>Fitur yang diminta</Th>
                  <Th>Klien &amp; rakitan</Th>
                  <Th className="text-right">Nilai rakitan</Th>
                  <Th>Status</Th>
                  <Th>Sisa waktu SLA</Th>
                  <Th>Reviewer</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link
                        href={`/admin/custom/${row.id}`}
                        className="font-medium text-fg hover:text-brand"
                      >
                        {row.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">{row.categoryShortName}</Badge>
                        {row.priority === 'MUST_HAVE' && (
                          <Badge variant="accent">{REQUEST_PRIORITY_LABEL.MUST_HAVE}</Badge>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <p className="text-sm text-fg">{row.contactName ?? 'Belum dikirim'}</p>
                      <p className="text-xs text-fg-subtle">
                        {row.quoteNumber ? `${row.quoteNumber} · ` : ''}
                        {row.configurationName}
                      </p>
                    </Td>
                    <Td className="tabular text-right">{formatRupiahShort(row.totalMax)}</Td>
                    <Td>
                      <Badge variant={CUSTOM_STATUS_VARIANT[row.status]}>
                        {CUSTOM_REQUEST_STATUS_LABEL[row.status]}
                      </Badge>
                    </Td>
                    <Td>
                      {row.health ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant={SLA_HEALTH_VARIANT[row.health]}>
                            {formatRelativeDeadline(row.slaDueAt)}
                          </Badge>
                          <span className="text-xs text-fg-subtle">
                            {SLA_HEALTH_LABEL[row.health]} · tenggat{' '}
                            {formatDateTime(row.slaDueAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-fg-subtle">
                          Selesai {formatDateTime(row.updatedAt)}
                        </span>
                      )}
                    </Td>
                    <Td className="text-sm text-fg-muted">{row.reviewerName ?? '—'}</Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        {(row.status === 'PENDING' || row.status === 'NEEDS_CLARIFICATION') && (
                          <ClaimButton requestId={row.id} label="Ambil" />
                        )}
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/admin/custom/${row.id}`}>Buka</Link>
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </PageBody>
    </>
  );
}

interface QueueRow {
  open: boolean;
  health: SlaHealth | null;
  slaDueAt: Date;
  updatedAt: Date;
}

/**
 * Urutan antrean: yang masih terbuka lebih dulu, lalu yang paling merah, lalu
 * yang tenggatnya paling dekat. Permintaan yang sudah diputuskan diurutkan dari
 * yang terbaru karena hanya berfungsi sebagai riwayat.
 */
function compareUrgency(a: QueueRow, b: QueueRow): number {
  if (a.open !== b.open) return a.open ? -1 : 1;
  if (a.open && b.open) {
    const rank = SLA_HEALTH_RANK[a.health ?? 'HIJAU'] - SLA_HEALTH_RANK[b.health ?? 'HIJAU'];
    if (rank !== 0) return rank;
    return a.slaDueAt.getTime() - b.slaDueAt.getTime();
  }
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

function buildHref(params: { status?: string | null; kategori?: string | null }): string {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.kategori) search.set('kategori', params.kategori);
  const query = search.toString();
  return query ? `/admin/custom?${query}` : '/admin/custom';
}
