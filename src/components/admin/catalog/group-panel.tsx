'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  Field,
  Input,
  Textarea,
} from '@/components/ui';
import { deleteGroup, saveGroup } from '@/app/admin/katalog/actions';
import { fieldError, useCatalogAction } from './use-action';

export interface GroupPanelRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  featureCount: number;
}

interface GroupFormState {
  id?: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: string;
}

/**
 * Pengelola kelompok fitur satu kategori.
 *
 * Kelompok adalah tulang punggung navigasi konfigurator (C2.1): klien menelusuri
 * fitur per proses kerja, bukan per modul teknis. Karena itu jumlah fitur per
 * kelompok ditampilkan — kelompok kosong berarti ada tab yang kosong di
 * hadapan klien.
 */
export function GroupPanel({
  categoryId,
  groups,
}: {
  categoryId: string;
  groups: GroupPanelRow[];
}) {
  const { pending, result, run, reset } = useCatalogAction();
  const [form, setForm] = useState<GroupFormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GroupPanelRow | null>(null);

  const openCreate = () => {
    reset();
    setForm({
      slug: '',
      name: '',
      description: '',
      icon: 'Layers',
      sortOrder: String(groups.length + 1),
    });
  };

  const openEdit = (row: GroupPanelRow) => {
    reset();
    setForm({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      icon: row.icon,
      sortOrder: String(row.sortOrder),
    });
  };

  const submit = () => {
    if (!form) return;
    run(
      () =>
        saveGroup({
          id: form.id,
          categoryId,
          slug: form.slug,
          name: form.name,
          description: form.description,
          icon: form.icon,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      { onSuccess: () => setForm(null) },
    );
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Kelompok fitur</CardTitle>
          <CardDescription>
            Pengelompokan yang dilihat klien saat menelusuri konfigurator.
          </CardDescription>
        </div>
        <Button size="sm" variant="secondary" onClick={openCreate}>
          Tambah kelompok
        </Button>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <EmptyState
            title="Belum ada kelompok fitur"
            description="Kelompok memecah katalog menjadi langkah kerja yang dikenali klien, misalnya Penerimaan Barang atau Stock Opname. Setiap fitur wajib berada di salah satu kelompok."
            action={
              <Button size="sm" onClick={openCreate}>
                Tambah kelompok
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {groups.map((group) => (
              <li key={group.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{group.name}</p>
                  <p className="text-xs text-fg-subtle">
                    /{group.slug} · urutan {group.sortOrder}
                  </p>
                  {group.description && (
                    <p className="mt-0.5 max-w-xl text-xs leading-snug text-fg-muted">
                      {group.description}
                    </p>
                  )}
                </div>
                <span
                  className={
                    group.featureCount === 0
                      ? 'tabular text-xs text-warning-soft-fg'
                      : 'tabular text-xs text-fg-muted'
                  }
                >
                  {group.featureCount} fitur
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(group)}>
                    Ubah
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => setPendingDelete(group)}
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {form && (
        <Dialog
          open
          onClose={() => setForm(null)}
          title={form.id ? `Ubah kelompok ${form.name}` : 'Kelompok fitur baru'}
          footer={
            <>
              <Button variant="ghost" onClick={() => setForm(null)}>
                Batal
              </Button>
              <Button isLoading={pending} onClick={submit}>
                Simpan kelompok
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}
            <Field label="Nama kelompok" required error={fieldError(result, 'name')}>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Penerimaan Barang"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Slug"
                hint="Dikosongkan berarti diturunkan dari nama."
                error={fieldError(result, 'slug')}
              >
                <Input
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: event.target.value })}
                />
              </Field>
              <Field label="Urutan tampil">
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Ikon" hint="Nama ikon lucide, misalnya Layers atau PackageCheck.">
              <Input
                value={form.icon}
                onChange={(event) => setForm({ ...form, icon: event.target.value })}
              />
            </Field>
            <Field label="Deskripsi singkat">
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Semua yang terjadi sejak barang turun dari truk sampai masuk rak."
              />
            </Field>
          </div>
        </Dialog>
      )}

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Hapus kelompok ${pendingDelete?.name ?? ''}?`}
        description="Kelompok yang masih berisi fitur akan ditolak sistem. Pindahkan fiturnya lebih dulu."
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
                run(() => deleteGroup(target.id), { onSuccess: () => setPendingDelete(null) });
              }}
            >
              Hapus kelompok
            </Button>
          </>
        }
      />
    </Card>
  );
}
