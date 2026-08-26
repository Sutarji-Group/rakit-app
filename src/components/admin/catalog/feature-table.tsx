'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  FeatureTypeBadge,
  Field,
  Input,
  Select,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import {
  CATALOG_FEATURE_TYPES,
  FEATURE_TYPE_INTERNAL_LABEL,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABEL,
  type FeatureType,
  type PublishStatus,
} from '@/lib/domain/enums';
import { formatManDay, formatRupiahShort } from '@/lib/format';
import { rangeWidthLimitFor, type PricingRuleSnapshot } from '@/lib/pricing';
import {
  deleteFeature,
  markFeaturesReviewed,
  publishFeatures,
  setFeatureStatus,
} from '@/app/admin/katalog/actions';
import {
  PUBLISH_STATUS_VARIANT,
  deriveFeatureSellPrice,
  isReviewStale,
  reviewStaleLabel,
} from './shared';
import { useCatalogAction } from './use-action';

export interface FeatureTableRow {
  id: string;
  slug: string;
  name: string;
  clientDescription: string;
  groupId: string;
  groupName: string;
  type: FeatureType;
  manDayMin: number;
  manDayMax: number;
  isEssential: boolean;
  status: PublishStatus;
  sortOrder: number;
  keywords: string[];
  mediaCount: number;
  requiresCount: number;
  conflictsCount: number;
  recommendsCount: number;
  dependentCount: number;
  lastReviewedAt: string | null;
  updatedAt: string;
}

const ALL = 'SEMUA';

/**
 * Daftar fitur satu kategori (L2 & L7).
 *
 * Kolom harga jual turunan sengaja ditampilkan walau PRD melarang angka rupiah
 * per fitur di hadapan klien (C2.4): admin justru butuh melihat dampak angka
 * man-day yang diketiknya, dan halaman ini tidak pernah dilihat klien.
 */
export function FeatureTable({
  categorySlug,
  rows,
  groups,
  rule,
}: {
  categorySlug: string;
  rows: FeatureTableRow[];
  groups: Array<{ id: string; name: string }>;
  rule: PricingRuleSnapshot;
}) {
  const { pending, run } = useCatalogAction();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [publishPreview, setPublishPreview] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FeatureTableRow | null>(null);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (groupFilter !== ALL && row.groupId !== groupFilter) return false;
      if (statusFilter !== ALL && row.status !== statusFilter) return false;
      if (typeFilter !== ALL && row.type !== typeFilter) return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.slug.toLowerCase().includes(needle) ||
        row.clientDescription.toLowerCase().includes(needle) ||
        row.keywords.some((keyword) => keyword.toLowerCase().includes(needle))
      );
    });
  }, [rows, search, groupFilter, statusFilter, typeFilter]);

  const selectedRows = rows.filter((row) => selected.has(row.id));
  const selectedDrafts = selectedRows.filter((row) => row.status !== 'PUBLISHED');
  const draftCount = rows.filter((row) => row.status === 'DRAFT').length;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDrafts = () => {
    setSelected(new Set(rows.filter((row) => row.status === 'DRAFT').map((row) => row.id)));
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Kategori ini belum punya fitur"
        description="Fitur adalah satuan yang dirakit klien di konfigurator: nama dalam bahasa manfaat operasional, man-day referensi, dan tipe yang menentukan pengali harganya. Tambahkan fitur pertama untuk memulai."
        action={
          <Button asChild>
            <Link href={`/admin/katalog/${categorySlug}/fitur/baru`}>Tambah fitur</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Cari fitur">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nama, slug, atau kata kunci"
          />
        </Field>
        <Field label="Kelompok">
          <Select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value={ALL}>Semua kelompok</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value={ALL}>Semua status</option>
            {PUBLISH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PUBLISH_STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipe">
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value={ALL}>Semua tipe</option>
            {CATALOG_FEATURE_TYPES.map((type) => (
              <option key={type} value={type}>
                {FEATURE_TYPE_INTERNAL_LABEL[type]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {draftCount > 0 && (
        <Alert
          tone="warning"
          title={`${draftCount} fitur masih berstatus draft`}
          action={
            <Button size="sm" variant="secondary" onClick={selectAllDrafts}>
              Pilih semua draft
            </Button>
          }
        >
          Fitur draft tidak muncul di konfigurator publik. Pratinjau lebih dulu, lalu terbitkan
          bersama prasyaratnya (L7).
        </Alert>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand/25 bg-brand-soft px-4 py-3">
          <p className="text-sm font-medium text-brand-soft-fg">
            <span className="tabular">{selected.size}</span> fitur terpilih
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => markFeaturesReviewed([...selected]))}
            >
              Tandai sudah ditinjau
            </Button>
            <Button
              size="sm"
              disabled={selectedDrafts.length === 0}
              onClick={() => setPublishPreview(true)}
            >
              Pratinjau &amp; terbitkan
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Bersihkan pilihan
            </Button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Tidak ada fitur yang cocok"
          description="Ubah kata kunci atau saringan di atas untuk melihat fitur lain di kategori ini."
        />
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th className="w-10" aria-label="Pilih" />
                <Th>Fitur</Th>
                <Th>Kelompok</Th>
                <Th>Tipe</Th>
                <Th className="text-right">Man-day</Th>
                <Th className="text-right">Harga jual turunan</Th>
                <Th>Relasi</Th>
                <Th>Status</Th>
                <Th>Tinjauan</Th>
                <Th className="text-right">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const price = deriveFeatureSellPrice(rule, row.type, row.manDayMin, row.manDayMax);
                const limit = rangeWidthLimitFor(rule, row.type);
                const ratio = row.manDayMin > 0 ? row.manDayMax / row.manDayMin : 0;
                const ratioBreached = ratio > limit + 1e-9;
                const stale = isReviewStale(row.lastReviewedAt);

                return (
                  <Tr key={row.id}>
                    <Td>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Pilih ${row.name}`}
                      />
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/katalog/${categorySlug}/fitur/${row.id}`}
                        className="font-medium text-fg hover:text-brand"
                      >
                        {row.name}
                      </Link>
                      <p className="text-xs text-fg-subtle">/{row.slug}</p>
                      <p className="mt-0.5 max-w-sm text-xs leading-snug text-fg-muted">
                        {row.clientDescription}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {row.isEssential && (
                          <Badge variant="brand" title="Ikut menentukan kelayakan rakitan (C3.5)">
                            Esensial
                          </Badge>
                        )}
                        {row.mediaCount > 0 && (
                          <Badge variant="neutral">
                            <span className="tabular">{row.mediaCount}</span> media
                          </Badge>
                        )}
                      </div>
                    </Td>
                    <Td className="text-sm text-fg-muted">{row.groupName}</Td>
                    <Td>
                      <FeatureTypeBadge type={row.type} />
                    </Td>
                    <Td className="text-right">
                      <span className="tabular text-sm">
                        {formatManDay(row.manDayMin)} – {formatManDay(row.manDayMax)}
                      </span>
                      <p
                        className={
                          ratioBreached
                            ? 'tabular mt-0.5 text-xs font-medium text-danger'
                            : 'tabular mt-0.5 text-xs text-fg-subtle'
                        }
                        title={`Batas lebar rentang tipe ${row.type} adalah ${limit.toFixed(2)}× (BR-05)`}
                      >
                        {ratio.toFixed(2)}× / {limit.toFixed(2)}×
                      </p>
                    </Td>
                    <Td className="text-right">
                      {price.includedInBasePackage ? (
                        <span className="text-xs text-fg-subtle">Termasuk paket dasar</span>
                      ) : (
                        <span className="tabular text-sm">
                          {formatRupiahShort(price.min)} – {formatRupiahShort(price.max)}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {row.requiresCount > 0 && (
                          <Badge variant="info" title="Prasyarat yang dibutuhkan fitur ini">
                            <span className="tabular">{row.requiresCount}</span> butuh
                          </Badge>
                        )}
                        {row.conflictsCount > 0 && (
                          <Badge variant="danger" title="Fitur yang saling meniadakan">
                            <span className="tabular">{row.conflictsCount}</span> konflik
                          </Badge>
                        )}
                        {row.recommendsCount > 0 && (
                          <Badge variant="neutral" title="Saran halus, tidak pernah otomatis">
                            <span className="tabular">{row.recommendsCount}</span> saran
                          </Badge>
                        )}
                        {row.dependentCount > 0 && (
                          <Badge
                            variant="warning"
                            title="Fitur lain yang akan ikut terdampak bila fitur ini dihapus"
                          >
                            <span className="tabular">{row.dependentCount}</span> bergantung
                          </Badge>
                        )}
                        {row.requiresCount +
                          row.conflictsCount +
                          row.recommendsCount +
                          row.dependentCount ===
                          0 && <span className="text-xs text-fg-subtle">—</span>}
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={PUBLISH_STATUS_VARIANT[row.status]}>
                        {PUBLISH_STATUS_LABEL[row.status]}
                      </Badge>
                    </Td>
                    <Td>
                      <span
                        className={stale ? 'text-xs text-warning-soft-fg' : 'text-xs text-fg-subtle'}
                        title={stale ? 'Risiko R8 — man-day berpotensi menyimpang' : undefined}
                      >
                        {reviewStaleLabel(row.lastReviewedAt)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/admin/katalog/${categorySlug}/fitur/${row.id}`}>Ubah</Link>
                        </Button>
                        {row.status === 'PUBLISHED' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => run(() => setFeatureStatus(row.id, 'DRAFT'))}
                          >
                            Tarik
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => run(() => setFeatureStatus(row.id, 'PUBLISHED'))}
                          >
                            Terbitkan
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => setPendingDelete(row)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      <Dialog
        open={publishPreview}
        onClose={() => setPublishPreview(false)}
        size="lg"
        title="Pratinjau sebelum diterbitkan"
        description="Setelah terbit, fitur berikut langsung dapat dipilih klien di konfigurator dan ikut menghitung harga."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPublishPreview(false)}>
              Batal
            </Button>
            <Button
              isLoading={pending}
              onClick={() =>
                run(() => publishFeatures(selectedDrafts.map((row) => row.id)), {
                  onSuccess: () => {
                    setPublishPreview(false);
                    setSelected(new Set());
                  },
                })
              }
            >
              Terbitkan {selectedDrafts.length} fitur
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {selectedRows.length !== selectedDrafts.length && (
            <Alert tone="neutral">
              {selectedRows.length - selectedDrafts.length} fitur terpilih sudah terbit dan
              dilewati.
            </Alert>
          )}
          <ul className="flex flex-col divide-y divide-border">
            {selectedDrafts.map((row) => {
              const price = deriveFeatureSellPrice(rule, row.type, row.manDayMin, row.manDayMax);
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">{row.name}</p>
                    <p className="text-xs text-fg-muted">
                      {row.groupName} · {FEATURE_TYPE_INTERNAL_LABEL[row.type]}
                    </p>
                  </div>
                  <span className="tabular text-xs text-fg-muted">
                    {formatManDay(row.manDayMin)} – {formatManDay(row.manDayMax)}
                  </span>
                  <span className="tabular text-xs text-fg">
                    {price.includedInBasePackage
                      ? 'Paket dasar'
                      : `${formatRupiahShort(price.min)} – ${formatRupiahShort(price.max)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Hapus fitur ${pendingDelete?.name ?? ''}?`}
        description="Fitur yang pernah masuk rakitan klien akan ditolak sistem — ubah statusnya menjadi Diarsipkan."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              isLoading={pending}
              onClick={() => {
                const target = pendingDelete;
                if (!target) return;
                run(() => deleteFeature(target.id), { onSuccess: () => setPendingDelete(null) });
              }}
            >
              Hapus fitur
            </Button>
          </>
        }
      >
        {pendingDelete && pendingDelete.dependentCount > 0 && (
          <Alert tone="danger" title="Dampak cascade">
            <span className="tabular">{pendingDelete.dependentCount}</span> fitur lain membutuhkan
            fitur ini. Relasi tersebut ikut terhapus dan rakitan klien yang memakainya akan
            kehilangan prasyaratnya.
          </Alert>
        )}
      </Dialog>
    </div>
  );
}
