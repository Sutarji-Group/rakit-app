'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  EmptyState,
  Field,
  Input,
  Select,
  Switch,
  Table,
  TableWrapper,
  Td,
  Textarea,
  Th,
  Tr,
  useToast,
} from '@/components/ui';
import { ADDON_KINDS, ADDON_KIND_LABEL, type AddOnKind } from '@/lib/domain/enums';
import { formatManDay, formatRupiahRange } from '@/lib/format';
import { deleteAddOn, saveAddOn, setAddOnActive } from '@/app/admin/harga/actions';
import { NumberField } from './number-field';
import type { AddOnFormValues, AddOnRow } from './types';

const EMPTY_FORM: AddOnFormValues = {
  id: null,
  slug: '',
  kind: 'INTEGRATION',
  name: '',
  description: '',
  priceMin: 0,
  priceMax: 0,
  manDayMin: 0,
  manDayMax: 0,
  isRecurring: false,
  optionGroup: '',
  sortOrder: 0,
  isActive: true,
  isGlobal: true,
};

/**
 * Manajemen add-on (M5).
 *
 * Daftar sengaja dipecah menjadi dua tabel: biaya sekali jalan dan biaya
 * berulang bulanan. BR-12 melarang keduanya tercampur di nilai proyek, dan cara
 * paling murah menjaga aturan itu adalah tidak pernah menampilkannya bercampur
 * sejak di papan admin.
 */
export function AddOnManager({ rows }: { rows: AddOnRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AddOnFormValues | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AddOnRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const oneTime = useMemo(() => rows.filter((row) => !row.isRecurring), [rows]);
  const recurring = useMemo(() => rows.filter((row) => row.isRecurring), [rows]);

  const openCreate = () => {
    setFormError(null);
    setEditing({ ...EMPTY_FORM, sortOrder: rows.length * 10 });
  };

  const openEdit = (row: AddOnRow) => {
    setFormError(null);
    // Disalin bidang demi bidang: usageCount hanya milik tampilan tabel dan
    // tidak boleh ikut terkirim ke Server Action.
    setEditing({
      id: row.id,
      slug: row.slug,
      kind: row.kind,
      name: row.name,
      description: row.description,
      priceMin: row.priceMin,
      priceMax: row.priceMax,
      manDayMin: row.manDayMin,
      manDayMax: row.manDayMax,
      isRecurring: row.isRecurring,
      optionGroup: row.optionGroup,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      isGlobal: row.isGlobal,
    });
  };

  const submit = () => {
    if (!editing) return;
    setFormError(null);
    startTransition(async () => {
      const result = await saveAddOn(editing);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      toast({ title: 'Tersimpan', description: result.message, tone: 'success' });
      setEditing(null);
      router.refresh();
    });
  };

  const toggleActive = (row: AddOnRow, next: boolean) => {
    startTransition(async () => {
      const result = await setAddOnActive(row.id, next);
      toast({
        title: result.ok ? 'Ketersediaan diperbarui' : 'Gagal',
        description: result.message,
        tone: result.ok ? 'success' : 'danger',
      });
      if (result.ok) router.refresh();
    });
  };

  const remove = (row: AddOnRow) => {
    startTransition(async () => {
      const result = await deleteAddOn(row.id);
      toast({
        title: result.ok ? 'Selesai' : 'Gagal',
        description: result.message,
        tone: result.ok ? 'success' : 'danger',
      });
      setConfirmDelete(null);
      if (result.ok) router.refresh();
    });
  };

  if (rows.length === 0) {
    return (
      <>
        <EmptyState
          title="Belum ada add-on"
          description="Add-on adalah pekerjaan tambahan di luar fitur katalog: integrasi pihak ketiga, migrasi data, pelatihan, maintenance, dan hosting. Setelah dibuat, add-on muncul sebagai pilihan tambahan di konfigurator dan ikut dihitung mesin harga."
          action={
            <Button type="button" onClick={openCreate}>
              Tambah add-on pertama
            </Button>
          }
        />
        {editing && renderDialog()}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {oneTime.length} add-on sekali jalan · {recurring.length} add-on berulang
        </p>
        <Button type="button" size="sm" onClick={openCreate}>
          Tambah add-on
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biaya sekali jalan</CardTitle>
          <CardDescription>
            Ikut dijumlahkan ke nilai proyek dan membawa effort man-day ke proyeksi COGS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {oneTime.length === 0 ? (
            <EmptyState
              title="Belum ada add-on sekali jalan"
              description="Integrasi, migrasi data, dan pelatihan biasanya masuk ke kelompok ini."
            />
          ) : (
            renderTable(oneTime, false)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Biaya berulang bulanan</CardTitle>
          <CardDescription>
            BR-12: tidak pernah dijumlahkan ke nilai proyek. Selalu tampil sebagai baris terpisah di
            penawaran agar klien tidak salah membaca total kontrak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <EmptyState
              title="Belum ada add-on berulang"
              description="Maintenance, SLA, dan hosting biasanya masuk ke kelompok ini."
            />
          ) : (
            renderTable(recurring, true)
          )}
        </CardContent>
      </Card>

      {editing && renderDialog()}

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={`Hapus add-on "${confirmDelete?.name ?? ''}"?`}
        description={
          confirmDelete && confirmDelete.usageCount > 0
            ? `Add-on ini sudah dipakai ${confirmDelete.usageCount} konfigurasi, sehingga hanya akan dinonaktifkan agar riwayat penawaran tetap dapat dibaca utuh.`
            : 'Add-on ini belum pernah dipakai konfigurasi mana pun, sehingga akan benar-benar dihapus.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={pending}
              disabled={pending}
              onClick={() => confirmDelete && remove(confirmDelete)}
            >
              {confirmDelete && confirmDelete.usageCount > 0 ? 'Nonaktifkan' : 'Hapus'}
            </Button>
          </div>
        }
      />
    </div>
  );

  function renderTable(list: AddOnRow[], isRecurringTable: boolean) {
    return (
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th className="min-w-56">Add-on</Th>
              <Th className="min-w-36">Jenis</Th>
              <Th className="min-w-44 text-right">
                {isRecurringTable ? 'Biaya per bulan' : 'Rentang harga'}
              </Th>
              {!isRecurringTable && <Th className="min-w-32 text-right">Effort</Th>}
              <Th className="min-w-28 text-right">Dipakai</Th>
              <Th className="min-w-24">Tampil</Th>
              <Th className="w-28 text-right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <span className="font-medium text-fg">{row.name}</span>
                  <span className="block max-w-md text-xs leading-snug text-fg-subtle">
                    {row.description}
                  </span>
                  {row.optionGroup && (
                    <Badge variant="outline" className="mt-1">
                      Kelompok pilihan: {row.optionGroup}
                    </Badge>
                  )}
                  {!row.isGlobal && (
                    <Badge variant="neutral" className="mt-1 ml-1">
                      Terbatas kategori tertentu
                    </Badge>
                  )}
                </Td>
                <Td className="text-fg-muted">{ADDON_KIND_LABEL[row.kind]}</Td>
                <Td className="tabular text-right">
                  {formatRupiahRange(row.priceMin, row.priceMax, false)}
                  {isRecurringTable && <span className="text-fg-subtle"> / bulan</span>}
                </Td>
                {!isRecurringTable && (
                  <Td className="tabular text-right text-fg-muted">
                    {row.manDayMax > 0
                      ? `${formatManDay(row.manDayMin)} – ${formatManDay(row.manDayMax)}`
                      : '—'}
                  </Td>
                )}
                <Td className="tabular text-right text-fg-muted">{row.usageCount}</Td>
                <Td>
                  <Switch
                    checked={row.isActive}
                    disabled={pending}
                    label={`Tampilkan ${row.name} di konfigurator`}
                    size="sm"
                    onCheckedChange={(next) => toggleActive(row, next)}
                  />
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => openEdit(row)}
                    >
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setConfirmDelete(row)}
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
    );
  }

  function renderDialog() {
    if (!editing) return null;
    const setField = <K extends keyof AddOnFormValues>(key: K, value: AddOnFormValues[K]) => {
      setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    return (
      <Dialog
        open
        onClose={() => setEditing(null)}
        size="lg"
        title={editing.id ? 'Ubah add-on' : 'Add-on baru'}
        description="Tulis nama dan deskripsi dalam bahasa manfaat operasional — kalimat ini yang dibaca klien di konfigurator."
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
              Batal
            </Button>
            <Button type="button" onClick={submit} isLoading={pending} disabled={pending}>
              Simpan add-on
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama add-on" htmlFor="addon-name" required>
              <Input
                id="addon-name"
                value={editing.name}
                maxLength={120}
                onChange={(event) => setField('name', event.target.value)}
              />
            </Field>
            <Field
              label="Jenis"
              htmlFor="addon-kind"
              hint="Menentukan pengelompokan add-on di konfigurator."
            >
              <Select
                id="addon-kind"
                value={editing.kind}
                onChange={(event) => setField('kind', event.target.value as AddOnKind)}
              >
                {ADDON_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {ADDON_KIND_LABEL[kind]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Deskripsi untuk klien"
            htmlFor="addon-description"
            required
            hint="Jelaskan hasil yang klien dapatkan, bukan cara kerjanya."
          >
            <Textarea
              id="addon-description"
              value={editing.description}
              maxLength={600}
              onChange={(event) => setField('description', event.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label={editing.isRecurring ? 'Biaya bulanan minimum' : 'Harga minimum'}
              kind="money"
              value={editing.priceMin}
              onChange={(next) => setField('priceMin', next)}
              min={0}
            />
            <NumberField
              label={editing.isRecurring ? 'Biaya bulanan maksimum' : 'Harga maksimum'}
              kind="money"
              value={editing.priceMax}
              onChange={(next) => setField('priceMax', next)}
              min={0}
            />
          </div>

          <div className="rounded-lg border border-border bg-surface-sunken p-4">
            <Checkbox
              checked={editing.isRecurring}
              label="Biaya berulang setiap bulan"
              hint="BR-12: biaya berulang tidak pernah masuk nilai proyek dan tidak boleh membawa effort man-day."
              onChange={(event) => {
                const next = event.target.checked;
                setEditing((prev) =>
                  prev
                    ? {
                        ...prev,
                        isRecurring: next,
                        // Effort dinolkan otomatis: effort satu kali pada biaya
                        // bulanan akan menggelembungkan proyeksi COGS proyek.
                        manDayMin: next ? 0 : prev.manDayMin,
                        manDayMax: next ? 0 : prev.manDayMax,
                      }
                    : prev,
                );
              }}
            />
          </div>

          {!editing.isRecurring && (
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Effort minimum"
                suffix="hari"
                value={editing.manDayMin}
                onChange={(next) => setField('manDayMin', next)}
                min={0}
                step={0.5}
                hint="Effort riil, dipakai menghitung proyeksi COGS."
              />
              <NumberField
                label="Effort maksimum"
                suffix="hari"
                value={editing.manDayMax}
                onChange={(next) => setField('manDayMax', next)}
                min={0}
                step={0.5}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Kelompok pilihan tunggal"
              htmlFor="addon-group"
              hint="Isi bila add-on ini bersaing dengan add-on lain, misal tingkat migrasi data. Kosongkan bila berdiri sendiri."
            >
              <Input
                id="addon-group"
                value={editing.optionGroup}
                maxLength={60}
                onChange={(event) => setField('optionGroup', event.target.value)}
              />
            </Field>
            <NumberField
              label="Urutan tampil"
              value={editing.sortOrder}
              onChange={(next) => setField('sortOrder', Math.round(next))}
              min={0}
              step={10}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Checkbox
              checked={editing.isGlobal}
              label="Tersedia untuk semua kategori aplikasi"
              hint="Nonaktifkan bila add-on hanya relevan untuk kategori tertentu; keterkaitan kategori diatur dari papan katalog."
              onChange={(event) => setField('isGlobal', event.target.checked)}
            />
            <Checkbox
              checked={editing.isActive}
              label="Tampilkan di konfigurator"
              hint="Add-on yang dimatikan tetap tersimpan dan tetap terbaca pada penawaran lama."
              onChange={(event) => setField('isActive', event.target.checked)}
            />
          </div>

          {formError && (
            <Alert tone="danger" title="Add-on belum tersimpan">
              {formError}
            </Alert>
          )}
        </div>
      </Dialog>
    );
  }
}
