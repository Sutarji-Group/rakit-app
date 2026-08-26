'use client';

import { useMemo, useState } from 'react';
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
  Tabs,
  Textarea,
} from '@/components/ui';
import {
  buildDependencyGraph,
  type DependencyEdge,
  type DependencyFeature,
} from '@/lib/configurator/dependency';
import {
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABEL,
  type FeatureType,
  type PublishStatus,
} from '@/lib/domain/enums';
import { formatManDay } from '@/lib/format';
import { deletePreset, savePreset } from '@/app/admin/katalog/preset/actions';
import { PUBLISH_STATUS_VARIANT, inspectPresetSelection } from './shared';
import { fieldError, useCatalogAction } from './use-action';

export interface PresetFeatureItem {
  id: string;
  name: string;
  slug: string;
  type: FeatureType;
  groupId: string;
  groupName: string;
  categoryId: string;
  isEssential: boolean;
  status: PublishStatus;
  manDayMin: number;
  manDayMax: number;
}

export interface PresetEdgeItem {
  featureId: string;
  targetFeatureId: string;
  kind: DependencyEdge['kind'];
  note: string;
}

export interface PresetItem {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string[];
  sortOrder: number;
  isDefault: boolean;
  status: PublishStatus;
  featureIds: string[];
}

interface PresetFormState {
  id?: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bestFor: string;
  sortOrder: string;
  isDefault: boolean;
  status: PublishStatus;
  featureIds: string[];
}

/**
 * Pengelola preset per kategori (L4).
 *
 * Peringatan prasyarat dihitung dengan mesin yang sama dengan konfigurator
 * (buildDependencyGraph + resolveAdd). Preset yang menyimpan fitur tanpa
 * prasyaratnya akan membengkak sendiri di keranjang klien, sehingga harga yang
 * muncul berbeda dari janji kartu preset.
 */
export function PresetManager({
  categories,
  presets,
  features,
  edges,
}: {
  categories: Array<{ id: string; slug: string; name: string; status: PublishStatus }>;
  presets: PresetItem[];
  features: PresetFeatureItem[];
  edges: PresetEdgeItem[];
}) {
  const { pending, result, run, reset } = useCatalogAction();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [form, setForm] = useState<PresetFormState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PresetItem | null>(null);

  const categoryFeatures = useMemo(
    () => features.filter((feature) => feature.categoryId === categoryId),
    [features, categoryId],
  );

  const graph = useMemo(() => {
    const ids = new Set(categoryFeatures.map((feature) => feature.id));
    const nodes: DependencyFeature[] = categoryFeatures.map((feature) => ({
      id: feature.id,
      name: feature.name,
      type: feature.type,
      groupId: feature.groupId,
      isEssential: feature.isEssential,
    }));
    const links: DependencyEdge[] = edges
      .filter((edge) => ids.has(edge.featureId) && ids.has(edge.targetFeatureId))
      .map((edge) => ({
        featureId: edge.featureId,
        targetFeatureId: edge.targetFeatureId,
        kind: edge.kind,
        note: edge.note,
      }));
    return buildDependencyGraph(nodes, links);
  }, [categoryFeatures, edges]);

  const categoryPresets = presets.filter((preset) => preset.categoryId === categoryId);
  const featureById = useMemo(
    () => new Map(features.map((feature) => [feature.id, feature])),
    [features],
  );

  const openCreate = () => {
    reset();
    setForm({
      slug: '',
      name: '',
      tagline: '',
      description: '',
      bestFor: '',
      sortOrder: String(categoryPresets.length + 1),
      isDefault: categoryPresets.length === 0,
      status: 'PUBLISHED',
      featureIds: [],
    });
  };

  const openEdit = (preset: PresetItem) => {
    reset();
    setForm({
      id: preset.id,
      slug: preset.slug,
      name: preset.name,
      tagline: preset.tagline,
      description: preset.description,
      bestFor: preset.bestFor.join('\n'),
      sortOrder: String(preset.sortOrder),
      isDefault: preset.isDefault,
      status: preset.status,
      featureIds: preset.featureIds,
    });
  };

  const submit = () => {
    if (!form) return;
    run(
      () =>
        savePreset({
          id: form.id,
          categoryId,
          slug: form.slug,
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          bestFor: form.bestFor.split('\n'),
          sortOrder: Number(form.sortOrder) || 0,
          isDefault: form.isDefault,
          status: form.status,
          featureIds: form.featureIds,
        }),
      { onSuccess: () => setForm(null) },
    );
  };

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Belum ada kategori aplikasi"
        description="Preset selalu melekat pada satu kategori. Buat kategori dan fiturnya lebih dulu, lalu susun preset sebagai titik mulai yang direkomendasikan untuk klien."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        items={categories.map((category) => ({
          value: category.id,
          label: category.name,
          count: presets.filter((preset) => preset.categoryId === category.id).length,
        }))}
        value={categoryId}
        onChange={setCategoryId}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          Preset adalah titik mulai yang mengurangi kelumpuhan pilihan di awal konfigurasi.
        </p>
        <Button onClick={openCreate} disabled={categoryFeatures.length === 0}>
          Tambah preset
        </Button>
      </div>

      {categoryFeatures.length === 0 && (
        <Alert tone="warning" title="Kategori ini belum punya fitur">
          Preset menyimpan daftar fitur bawaan, jadi katalognya harus terisi lebih dulu.
        </Alert>
      )}

      {categoryPresets.length === 0 ? (
        <EmptyState
          title="Belum ada preset di kategori ini"
          description="Preset menyodorkan rakitan siap pakai — Paket Dasar, Paket Lengkap, dan seterusnya — agar klien tidak memulai dari kanvas kosong. Setiap preset menyimpan daftar fitur bawaannya sendiri."
          action={
            <Button onClick={openCreate} disabled={categoryFeatures.length === 0}>
              Tambah preset
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {categoryPresets.map((preset) => {
            const integrity = inspectPresetSelection(graph, preset.featureIds);
            const manDayMin = preset.featureIds.reduce(
              (sum, id) => sum + (featureById.get(id)?.manDayMin ?? 0),
              0,
            );
            const manDayMax = preset.featureIds.reduce(
              (sum, id) => sum + (featureById.get(id)?.manDayMax ?? 0),
              0,
            );

            return (
              <Card key={preset.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{preset.name}</CardTitle>
                    {preset.isDefault && <Badge variant="brand">Bawaan</Badge>}
                    <Badge variant={PUBLISH_STATUS_VARIANT[preset.status]}>
                      {PUBLISH_STATUS_LABEL[preset.status]}
                    </Badge>
                  </div>
                  <CardDescription>{preset.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm leading-relaxed text-fg-muted">{preset.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-fg-subtle">
                    <span className="tabular">{preset.featureIds.length} fitur bawaan</span>
                    <span className="tabular">
                      {formatManDay(manDayMin)} – {formatManDay(manDayMax)} man-day referensi
                    </span>
                  </div>

                  {integrity.missing.length > 0 && (
                    <Alert tone="warning" title="Prasyarat belum tercantum">
                      <ul className="list-disc pl-4">
                        {integrity.missing.map((item) => (
                          <li key={item.featureId}>
                            {item.featureName} — dibutuhkan {item.requiredByName}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  {integrity.conflicts.length > 0 && (
                    <Alert tone="danger" title="Ada fitur yang saling meniadakan">
                      <ul className="list-disc pl-4">
                        {integrity.conflicts.map((item) => (
                          <li key={item.featureId}>
                            {item.featureName} vs {item.conflictsWithName}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(preset)}>
                      Ubah preset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => setPendingDelete(preset)}
                    >
                      Hapus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {form && (
        <PresetDialog
          form={form}
          setForm={setForm}
          features={categoryFeatures}
          graph={graph}
          onClose={() => setForm(null)}
          onSubmit={submit}
          pending={pending}
          result={result}
        />
      )}

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Hapus preset ${pendingDelete?.name ?? ''}?`}
        description="Preset yang sudah menjadi asal rakitan klien akan ditolak sistem — arsipkan saja agar jejak analitiknya tetap utuh."
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
                run(() => deletePreset(target.id), { onSuccess: () => setPendingDelete(null) });
              }}
            >
              Hapus preset
            </Button>
          </>
        }
      />
    </div>
  );
}

function PresetDialog({
  form,
  setForm,
  features,
  graph,
  onClose,
  onSubmit,
  pending,
  result,
}: {
  form: PresetFormState;
  setForm: (next: PresetFormState) => void;
  features: PresetFeatureItem[];
  graph: ReturnType<typeof buildDependencyGraph>;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  result: ReturnType<typeof useCatalogAction>['result'];
}) {
  const selected = new Set(form.featureIds);
  const integrity = inspectPresetSelection(graph, form.featureIds);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: PresetFeatureItem[] }>();
    for (const feature of features) {
      const bucket = map.get(feature.groupId) ?? { name: feature.groupName, items: [] };
      bucket.items.push(feature);
      map.set(feature.groupId, bucket);
    }
    return [...map.values()];
  }, [features]);

  const toggle = (featureId: string) => {
    setForm({
      ...form,
      featureIds: selected.has(featureId)
        ? form.featureIds.filter((id) => id !== featureId)
        : [...form.featureIds, featureId],
    });
  };

  const addMissing = () => {
    setForm({
      ...form,
      featureIds: [...form.featureIds, ...integrity.missing.map((item) => item.featureId)],
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={form.id ? `Ubah preset ${form.name}` : 'Preset baru'}
      description="Preset yang baik terasa seperti rekomendasi manusia, bukan daftar centang."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button isLoading={pending} onClick={onSubmit}>
            Simpan preset
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama preset" required error={fieldError(result, 'name')}>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Paket Gudang Dasar"
            />
          </Field>
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
        </div>

        <Field label="Tagline" required error={fieldError(result, 'tagline')}>
          <Input
            value={form.tagline}
            onChange={(event) => setForm({ ...form, tagline: event.target.value })}
            placeholder="Cukup untuk gudang satu lokasi dengan tim kecil"
          />
        </Field>

        <Field label="Deskripsi" required error={fieldError(result, 'description')}>
          <Textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>

        <Field label="Cocok untuk" hint="Satu profil per baris.">
          <Textarea
            value={form.bestFor}
            onChange={(event) => setForm({ ...form, bestFor: event.target.value })}
            placeholder={'Gudang satu lokasi\nTim kurang dari 10 orang'}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Urutan tampil">
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as PublishStatus })
              }
            >
              {PUBLISH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PUBLISH_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-3 pt-6">
            <Switch
              checked={form.isDefault}
              onCheckedChange={(next) => setForm({ ...form, isDefault: next })}
              label="Jadikan preset bawaan"
              size="sm"
            />
            <span className="text-sm text-fg-muted">Preset bawaan</span>
          </div>
        </div>

        {integrity.missing.length > 0 && (
          <Alert
            tone="warning"
            title="Prasyarat belum tercantum di preset ini"
            action={
              <Button size="sm" variant="secondary" onClick={addMissing}>
                Tambahkan semua
              </Button>
            }
          >
            <ul className="list-disc pl-4">
              {integrity.missing.map((item) => (
                <li key={item.featureId}>
                  {item.featureName} — dibutuhkan {item.requiredByName}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {integrity.conflicts.length > 0 && (
          <Alert tone="danger" title="Fitur yang saling meniadakan">
            <ul className="list-disc pl-4">
              {integrity.conflicts.map((item) => (
                <li key={item.featureId}>
                  {item.featureName} vs {item.conflictsWithName}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-fg">
            Fitur bawaan (<span className="tabular">{form.featureIds.length}</span> terpilih)
          </p>
          {groups.map((group) => (
            <div key={group.name} className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {group.name}
              </p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {group.items.map((feature) => (
                  <li key={feature.id}>
                    <Checkbox
                      checked={selected.has(feature.id)}
                      onChange={() => toggle(feature.id)}
                      label={feature.name}
                      hint={
                        feature.status === 'PUBLISHED'
                          ? `${formatManDay(feature.manDayMin)} – ${formatManDay(feature.manDayMax)}`
                          : `${PUBLISH_STATUS_LABEL[feature.status]} · belum terlihat klien`
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
