'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  Select,
  Table,
  TableWrapper,
  Td,
  Textarea,
  Th,
  Tr,
} from '@/components/ui';
import { PUBLISH_STATUSES, PUBLISH_STATUS_LABEL, type PublishStatus } from '@/lib/domain/enums';
import {
  deleteCategory,
  moveCategory,
  saveCategory,
  setCategoryStatus,
} from '@/app/admin/katalog/actions';
import { PUBLISH_STATUS_VARIANT } from './shared';
import { fieldError, useCatalogAction } from './use-action';

export interface CategoryBoardRow {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  longDescription: string;
  benefits: string[];
  status: PublishStatus;
  sortOrder: number;
  minViableFeatureCount: number;
  seoTitle: string;
  seoDescription: string;
  groupCount: number;
  presetCount: number;
  wizardQuestionCount: number;
  featureTotal: number;
  featurePublished: number;
  featureDraft: number;
  featureArchived: number;
  staleCount: number;
}

interface CategoryFormState {
  id?: string;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  longDescription: string;
  /** Satu manfaat per baris — bentuk yang paling mudah disunting admin. */
  benefits: string;
  sortOrder: string;
  status: PublishStatus;
  minViableFeatureCount: string;
  seoTitle: string;
  seoDescription: string;
}

function emptyForm(nextOrder: number): CategoryFormState {
  return {
    slug: '',
    name: '',
    shortName: '',
    tagline: '',
    description: '',
    longDescription: '',
    benefits: '',
    sortOrder: String(nextOrder),
    status: 'DRAFT',
    minViableFeatureCount: '8',
    seoTitle: '',
    seoDescription: '',
  };
}

function toForm(row: CategoryBoardRow): CategoryFormState {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.shortName,
    tagline: row.tagline,
    description: row.description,
    longDescription: row.longDescription,
    benefits: row.benefits.join('\n'),
    sortOrder: String(row.sortOrder),
    status: row.status,
    minViableFeatureCount: String(row.minViableFeatureCount),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

/**
 * Papan kategori aplikasi (L1).
 *
 * Urutan tampil disunting lewat tombol naik/turun, bukan kolom angka bebas:
 * urutan kategori menentukan susunan kartu di landing (A3), sehingga admin
 * perlu melihat hasilnya langsung dalam bentuk daftar.
 */
export function CategoryBoard({ categories }: { categories: CategoryBoardRow[] }) {
  const { pending, result, run, reset } = useCatalogAction();
  const [form, setForm] = useState<CategoryFormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CategoryBoardRow | null>(null);

  const openCreate = () => {
    reset();
    setForm(emptyForm(categories.length + 1));
  };

  const openEdit = (row: CategoryBoardRow) => {
    reset();
    setForm(toForm(row));
  };

  const submit = () => {
    if (!form) return;
    run(
      () =>
        saveCategory({
          id: form.id,
          slug: form.slug,
          name: form.name,
          shortName: form.shortName,
          tagline: form.tagline,
          description: form.description,
          longDescription: form.longDescription,
          benefits: form.benefits.split('\n'),
          sortOrder: Number(form.sortOrder) || 0,
          status: form.status,
          minViableFeatureCount: Number(form.minViableFeatureCount) || 8,
          seoTitle: form.seoTitle,
          seoDescription: form.seoDescription,
        }),
      { onSuccess: () => setForm(null) },
    );
  };

  if (categories.length === 0) {
    return (
      <>
        <EmptyState
          title="Belum ada kategori aplikasi"
          description="Kategori adalah pintu masuk konfigurator: WMS, POS, CRM, dan seterusnya. Setiap kategori menampung kelompok fitur, preset, dan aturan wizard-nya sendiri. Buat satu kategori untuk mulai menyusun katalog."
          action={<Button onClick={openCreate}>Tambah kategori</Button>}
        />
        <CategoryDialog
          form={form}
          setForm={setForm}
          onSubmit={submit}
          onClose={() => setForm(null)}
          pending={pending}
          result={result}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {categories.length} kategori · urutan di tabel ini menentukan susunan kartu di halaman
          depan.
        </p>
        <Button onClick={openCreate}>Tambah kategori</Button>
      </div>

      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th className="w-24">Urutan</Th>
              <Th>Kategori</Th>
              <Th>Status</Th>
              <Th className="text-right">Fitur</Th>
              <Th className="text-right">Kelompok</Th>
              <Th className="text-right">Preset</Th>
              <Th className="text-right">Wizard</Th>
              <Th>Perlu ditinjau</Th>
              <Th className="text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {categories.map((row, index) => (
              <Tr key={row.id}>
                <Td>
                  <div className="flex items-center gap-1">
                    <span className="tabular w-5 text-xs text-fg-subtle">{index + 1}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Naikkan urutan ${row.name}`}
                      disabled={index === 0 || pending}
                      onClick={() => run(() => moveCategory(row.id, 'UP'))}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Turunkan urutan ${row.name}`}
                      disabled={index === categories.length - 1 || pending}
                      onClick={() => run(() => moveCategory(row.id, 'DOWN'))}
                    >
                      ↓
                    </Button>
                  </div>
                </Td>
                <Td>
                  <Link
                    href={`/admin/katalog/${row.slug}`}
                    className="font-medium text-fg hover:text-brand"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-fg-subtle">/{row.slug}</p>
                  <p className="mt-0.5 max-w-md text-xs leading-snug text-fg-muted">
                    {row.tagline}
                  </p>
                </Td>
                <Td>
                  <Badge variant={PUBLISH_STATUS_VARIANT[row.status]}>
                    {PUBLISH_STATUS_LABEL[row.status]}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <span className="tabular text-sm font-medium">{row.featurePublished}</span>
                  <p className="tabular mt-0.5 text-xs text-fg-subtle">
                    {row.featureDraft} draft · {row.featureArchived} arsip
                  </p>
                  {row.featurePublished < row.minViableFeatureCount && (
                    <p className="mt-0.5 text-xs text-warning-soft-fg">
                      Ambang kelayakan {row.minViableFeatureCount}
                    </p>
                  )}
                </Td>
                <Td className="tabular text-right">{row.groupCount}</Td>
                <Td className="tabular text-right">{row.presetCount}</Td>
                <Td className="tabular text-right">{row.wizardQuestionCount}</Td>
                <Td>
                  {row.staleCount > 0 ? (
                    <Badge variant="warning" title="Risiko R8 — katalog usang">
                      <span className="tabular">{row.staleCount} fitur</span>
                    </Badge>
                  ) : (
                    <span className="text-xs text-fg-subtle">Segar</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/admin/katalog/${row.slug}`}>Kelola</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                      Ubah
                    </Button>
                    {row.status === 'PUBLISHED' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => run(() => setCategoryStatus(row.id, 'DRAFT'))}
                      >
                        Tarik ke draft
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => run(() => setCategoryStatus(row.id, 'PUBLISHED'))}
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
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      <CategoryDialog
        form={form}
        setForm={setForm}
        onSubmit={submit}
        onClose={() => setForm(null)}
        pending={pending}
        result={result}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Hapus kategori ${pendingDelete?.name ?? ''}?`}
        description="Seluruh kelompok, fitur, preset, dan aturan wizard di dalamnya ikut terhapus. Kategori yang sudah dipakai rakitan klien akan ditolak sistem — arsipkan saja."
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
                run(() => deleteCategory(target.id), { onSuccess: () => setPendingDelete(null) });
              }}
            >
              Hapus permanen
            </Button>
          </>
        }
      >
        {pendingDelete && (
          <p className="text-sm text-fg-muted">
            {pendingDelete.featureTotal} fitur, {pendingDelete.presetCount} preset, dan{' '}
            {pendingDelete.wizardQuestionCount} pertanyaan wizard akan hilang bersamanya.
          </p>
        )}
      </Dialog>
    </div>
  );
}

function CategoryDialog({
  form,
  setForm,
  onSubmit,
  onClose,
  pending,
  result,
}: {
  form: CategoryFormState | null;
  setForm: (next: CategoryFormState) => void;
  onSubmit: () => void;
  onClose: () => void;
  pending: boolean;
  result: ReturnType<typeof useCatalogAction>['result'];
}) {
  if (!form) return null;
  const patch = (partial: Partial<CategoryFormState>) => setForm({ ...form, ...partial });

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={form.id ? `Ubah kategori ${form.name}` : 'Kategori aplikasi baru'}
      description="Tagline dan deskripsi ditulis dalam bahasa manfaat operasional, bukan bahasa developer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button isLoading={pending} onClick={onSubmit}>
            Simpan kategori
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama kategori" required error={fieldError(result, 'name')}>
            <Input
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Aplikasi Gudang (WMS)"
            />
          </Field>
          <Field
            label="Slug"
            hint="Dikosongkan berarti diturunkan dari nama."
            error={fieldError(result, 'slug')}
          >
            <Input
              value={form.slug}
              onChange={(event) => patch({ slug: event.target.value })}
              placeholder="wms"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama pendek" hint="Dipakai di breadcrumb dan kartu sempit.">
            <Input
              value={form.shortName}
              onChange={(event) => patch({ shortName: event.target.value })}
              placeholder="WMS"
            />
          </Field>
          <Field label="Tagline" required error={fieldError(result, 'tagline')}>
            <Input
              value={form.tagline}
              onChange={(event) => patch({ tagline: event.target.value })}
              placeholder="Stok akurat tanpa hitung manual tiap malam"
            />
          </Field>
        </div>

        <Field label="Deskripsi" required error={fieldError(result, 'description')}>
          <Textarea
            value={form.description}
            onChange={(event) => patch({ description: event.target.value })}
            placeholder="Untuk tim gudang yang stok sistemnya sering berbeda dengan fisik."
          />
        </Field>

        <Field label="Deskripsi panjang" hint="Tampil di halaman kategori dan dipakai SEO.">
          <Textarea
            value={form.longDescription}
            onChange={(event) => patch({ longDescription: event.target.value })}
          />
        </Field>

        <Field label="Manfaat utama" hint="Satu manfaat per baris.">
          <Textarea
            value={form.benefits}
            onChange={(event) => patch({ benefits: event.target.value })}
            placeholder={'Stok real-time\nPengambilan barang terpandu\nLaporan selisih otomatis'}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Urutan tampil">
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(event) => patch({ sortOrder: event.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) => patch({ status: event.target.value as PublishStatus })}
            >
              {PUBLISH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PUBLISH_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Ambang kelayakan"
            hint="Jumlah fitur berbayar minimal agar rakitan dianggap aplikasi utuh (C3.5)."
            error={fieldError(result, 'minViableFeatureCount')}
          >
            <Input
              type="number"
              min={1}
              value={form.minViableFeatureCount}
              onChange={(event) => patch({ minViableFeatureCount: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Judul SEO">
            <Input
              value={form.seoTitle}
              onChange={(event) => patch({ seoTitle: event.target.value })}
            />
          </Field>
          <Field label="Deskripsi SEO">
            <Input
              value={form.seoDescription}
              onChange={(event) => patch({ seoDescription: event.target.value })}
            />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
