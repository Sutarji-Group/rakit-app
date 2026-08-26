'use client';

import { useRouter } from 'next/navigation';
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
  DescRow,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
} from '@/components/ui';
import {
  CATALOG_FEATURE_TYPES,
  FEATURE_TYPE_DESCRIPTION,
  FEATURE_TYPE_INTERNAL_LABEL,
  MEDIA_KINDS,
  PUBLISH_STATUSES,
  PUBLISH_STATUS_LABEL,
  type FeatureType,
  type MediaKind,
  type PublishStatus,
} from '@/lib/domain/enums';
import { formatDate, formatManDay, formatRupiah } from '@/lib/format';
import { validateRangeWidth, type PricingRuleSnapshot } from '@/lib/pricing';
import { saveFeature } from '@/app/admin/katalog/actions';
import {
  MEDIA_KIND_LABEL,
  deriveFeatureSellPrice,
  reviewStaleLabel,
  splitKeywords,
  type FeatureFormValues,
} from './shared';
import { fieldError, useCatalogAction } from './use-action';

export function emptyFeatureValues(groupId: string, sortOrder: number): FeatureFormValues {
  return {
    groupId,
    slug: '',
    name: '',
    clientDescription: '',
    internalDescription: '',
    type: 'STANDARD',
    manDayMin: '3',
    manDayMax: '4',
    effortRatioOverride: '',
    isEssential: false,
    keywords: '',
    status: 'DRAFT',
    sortOrder: String(sortOrder),
    seoTitle: '',
    seoDescription: '',
    media: [],
  };
}

/**
 * Form satu fitur katalog (L2).
 *
 * Kriteria penerimaan modul L: pelanggaran lebar rentang harus terlihat sebelum
 * admin menekan simpan. Karena mesin harga berupa fungsi murni, validasi yang
 * sama persis dengan yang dijalankan server (validateRangeWidth) dapat
 * dijalankan di sini pada setiap ketukan tombol.
 */
export function FeatureForm({
  mode,
  featureId,
  categoryId,
  categorySlug,
  groups,
  rule,
  initialValues,
  lastReviewedAt,
  promotedFromRequestId,
}: {
  mode: 'create' | 'edit';
  featureId?: string;
  categoryId: string;
  categorySlug: string;
  groups: Array<{ id: string; name: string }>;
  rule: PricingRuleSnapshot;
  initialValues: FeatureFormValues;
  lastReviewedAt?: string | null;
  promotedFromRequestId?: string | null;
}) {
  const router = useRouter();
  const { pending, result, run } = useCatalogAction();
  const [values, setValues] = useState<FeatureFormValues>(initialValues);
  const [markReviewed, setMarkReviewed] = useState(mode === 'create');

  const patch = (partial: Partial<FeatureFormValues>) =>
    setValues((prev) => ({ ...prev, ...partial }));

  const manDayMin = Number(values.manDayMin.replace(',', '.'));
  const manDayMax = Number(values.manDayMax.replace(',', '.'));
  const numbersReady =
    Number.isFinite(manDayMin) && Number.isFinite(manDayMax) && manDayMin > 0 && manDayMax > 0;

  const rangeCheck = useMemo(
    () =>
      numbersReady
        ? validateRangeWidth(rule, values.type, manDayMin, manDayMax)
        : { valid: false, limit: 0, ratio: 0, message: null as string | null },
    [numbersReady, rule, values.type, manDayMin, manDayMax],
  );

  const derived = useMemo(
    () =>
      numbersReady
        ? deriveFeatureSellPrice(rule, values.type, manDayMin, manDayMax)
        : null,
    [numbersReady, rule, values.type, manDayMin, manDayMax],
  );

  const submit = () => {
    run(
      () =>
        saveFeature({
          id: featureId,
          categoryId,
          groupId: values.groupId,
          slug: values.slug,
          name: values.name,
          clientDescription: values.clientDescription,
          internalDescription: values.internalDescription,
          type: values.type,
          manDayMin,
          manDayMax,
          effortRatioOverride: values.effortRatioOverride.trim()
            ? Number(values.effortRatioOverride.replace(',', '.'))
            : null,
          isEssential: values.isEssential,
          keywords: splitKeywords(values.keywords),
          status: values.status,
          sortOrder: Number(values.sortOrder) || 0,
          seoTitle: values.seoTitle,
          seoDescription: values.seoDescription,
          markReviewed,
          media: values.media.map((item) => ({
            kind: item.kind,
            url: item.url,
            caption: item.caption,
          })),
        }),
      {
        onSuccess: (outcome) => {
          if (mode === 'create' && outcome.createdId) {
            router.push(`/admin/katalog/${categorySlug}/fitur/${outcome.createdId}`);
          }
        },
      },
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-5">
        {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}
        {result && result.ok && result.warnings && result.warnings.length > 0 && (
          <Alert tone="warning" title="Tersimpan dengan catatan">
            <ul className="list-disc pl-4">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Alert>
        )}
        {promotedFromRequestId && (
          <Alert tone="brand" title="Fitur hasil promosi permintaan custom">
            Fitur ini lahir dari antrean fitur custom. Setiap kali dipakai ulang, ia menambah nilai
            katalog tanpa biaya riset baru.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Identitas fitur</CardTitle>
            <CardDescription>
              Nama dan deskripsi ditulis dalam bahasa manfaat operasional, bukan bahasa developer.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Nama fitur" required error={fieldError(result, 'name')}>
              <Input
                value={values.name}
                onChange={(event) => patch({ name: event.target.value })}
                placeholder="Cek stok fisik vs sistem"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Slug"
                hint="Dikosongkan berarti diturunkan dari nama."
                error={fieldError(result, 'slug')}
              >
                <Input
                  value={values.slug}
                  onChange={(event) => patch({ slug: event.target.value })}
                />
              </Field>
              <Field label="Kelompok fitur" required error={fieldError(result, 'groupId')}>
                <Select
                  value={values.groupId}
                  onChange={(event) => patch({ groupId: event.target.value })}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Deskripsi untuk klien"
              required
              hint="Satu kalimat tentang masalah yang hilang setelah fitur ini dipasang."
              error={fieldError(result, 'clientDescription')}
            >
              <Textarea
                value={values.clientDescription}
                onChange={(event) => patch({ clientDescription: event.target.value })}
                placeholder="Bandingkan hasil hitung fisik dengan angka sistem, lalu catat selisihnya tanpa rekap manual."
              />
            </Field>

            <Field
              label="Catatan internal"
              hint="Tidak pernah tampil ke klien. Tulis asumsi teknis dan jebakan estimasi di sini."
            >
              <Textarea
                value={values.internalDescription}
                onChange={(event) => patch({ internalDescription: event.target.value })}
              />
            </Field>

            <Field
              label="Kata kunci pencarian"
              hint="Dipisah koma. Dipakai kolom cari di konfigurator (C5.1)."
            >
              <Input
                value={values.keywords}
                onChange={(event) => patch({ keywords: event.target.value })}
                placeholder="stock opname, selisih stok, cycle count"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipe & effort</CardTitle>
            <CardDescription>
              Man-day di sini adalah man-day referensi — effort seandainya fitur dibangun dari nol
              (BR-18), bukan effort aktual tim.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Tipe fitur" required>
              <Select
                value={values.type}
                onChange={(event) => patch({ type: event.target.value as FeatureType })}
              >
                {CATALOG_FEATURE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {FEATURE_TYPE_INTERNAL_LABEL[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="-mt-2 text-xs leading-relaxed text-fg-subtle">
              {FEATURE_TYPE_DESCRIPTION[values.type]}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Man-day minimum"
                required
                error={fieldError(result, 'manDayMin')}
              >
                <Input
                  inputMode="decimal"
                  value={values.manDayMin}
                  onChange={(event) => patch({ manDayMin: event.target.value })}
                />
              </Field>
              <Field
                label="Man-day maksimum"
                required
                error={fieldError(result, 'manDayMax')}
              >
                <Input
                  inputMode="decimal"
                  value={values.manDayMax}
                  onChange={(event) => patch({ manDayMax: event.target.value })}
                  invalid={numbersReady && !rangeCheck.valid}
                />
              </Field>
            </div>

            <RangeWidthMeter
              ready={numbersReady}
              valid={rangeCheck.valid}
              ratio={rangeCheck.ratio}
              limit={rangeCheck.limit}
              message={rangeCheck.message}
              type={values.type}
            />

            <Field
              label="Override rasio effort"
              hint="Kosongkan untuk memakai rasio bawaan tipe fitur dari aturan harga aktif (PRD 6.3)."
              error={fieldError(result, 'effortRatioOverride')}
            >
              <Input
                inputMode="decimal"
                value={values.effortRatioOverride}
                onChange={(event) => patch({ effortRatioOverride: event.target.value })}
                placeholder="0,80"
              />
            </Field>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-sunken p-3">
              <Switch
                checked={values.isEssential}
                onCheckedChange={(next) => patch({ isEssential: next })}
                label="Tandai sebagai fitur esensial"
              />
              <div>
                <p className="text-sm font-medium text-fg">Fitur esensial</p>
                <p className="text-xs leading-snug text-fg-muted">
                  Ikut menentukan apakah rakitan klien dianggap aplikasi utuh (C3.5).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <MediaEditor
          media={values.media}
          onChange={(media) => patch({ media })}
        />

        <Card>
          <CardHeader>
            <CardTitle>Penerbitan & SEO</CardTitle>
            <CardDescription>
              Fitur berstatus draft tidak pernah tampil di konfigurator publik (L7).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select
                  value={values.status}
                  onChange={(event) => patch({ status: event.target.value as PublishStatus })}
                >
                  {PUBLISH_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {PUBLISH_STATUS_LABEL[status]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Urutan tampil">
                <Input
                  type="number"
                  value={values.sortOrder}
                  onChange={(event) => patch({ sortOrder: event.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Judul SEO">
                <Input
                  value={values.seoTitle}
                  onChange={(event) => patch({ seoTitle: event.target.value })}
                />
              </Field>
              <Field label="Deskripsi SEO">
                <Input
                  value={values.seoDescription}
                  onChange={(event) => patch({ seoDescription: event.target.value })}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Dampak angka</CardTitle>
            <CardDescription>
              Dihitung dengan aturan harga aktif versi {rule.version}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col divide-y divide-border">
              <DescRow
                label="Rentang man-day"
                value={
                  numbersReady
                    ? `${formatManDay(manDayMin)} – ${formatManDay(manDayMax)}`
                    : '—'
                }
              />
              <DescRow
                label="Lebar rentang"
                value={
                  numbersReady ? `${rangeCheck.ratio.toFixed(2)}× / ${rangeCheck.limit.toFixed(2)}×` : '—'
                }
              />
              <DescRow
                label="Harga jual turunan"
                emphasis
                value={
                  derived
                    ? derived.includedInBasePackage
                      ? 'Termasuk paket dasar'
                      : `${formatRupiah(derived.min)} – ${formatRupiah(derived.max)}`
                    : '—'
                }
              />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
              Fitur Core dijual sebagai paket dasar bertarif tetap, bukan per fitur (PRD 6.3),
              sehingga man-day-nya hanya memengaruhi effort internal.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kalibrasi</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {mode === 'edit' && (
              <p className="text-sm text-fg-muted">
                {reviewStaleLabel(lastReviewedAt)}
                {lastReviewedAt ? ` · ${formatDate(lastReviewedAt)}` : ''}
              </p>
            )}
            <div className="flex items-start gap-3">
              <Switch
                checked={markReviewed}
                onCheckedChange={setMarkReviewed}
                label="Tandai sudah ditinjau ulang"
                size="sm"
              />
              <p className="text-xs leading-snug text-fg-muted">
                Menyetel ulang penanda katalog usang (risiko R8). Aktifkan hanya bila man-day
                benar-benar dikalibrasi ulang, bukan sekadar memperbaiki teks.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button isLoading={pending} onClick={submit}>
            {mode === 'create' ? 'Simpan fitur baru' : 'Simpan perubahan'}
          </Button>
          <Button variant="ghost" onClick={() => router.push(`/admin/katalog/${categorySlug}`)}>
            Kembali ke daftar fitur
          </Button>
        </div>
      </aside>
    </div>
  );
}

/** Pengukur lebar rentang yang bereaksi langsung saat man-day diketik (BR-05). */
function RangeWidthMeter({
  ready,
  valid,
  ratio,
  limit,
  message,
  type,
}: {
  ready: boolean;
  valid: boolean;
  ratio: number;
  limit: number;
  message: string | null;
  type: FeatureType;
}) {
  if (!ready) {
    return (
      <Alert tone="neutral">
        Isi man-day minimum dan maksimum untuk melihat lebar rentangnya.
      </Alert>
    );
  }

  const pct = limit > 0 ? Math.min(100, (ratio / limit) * 100) : 0;

  return (
    <div
      className={
        valid
          ? 'rounded-lg border border-border bg-surface-sunken p-3.5'
          : 'rounded-lg border border-danger/25 bg-danger-soft p-3.5'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Lebar rentang tipe {FEATURE_TYPE_INTERNAL_LABEL[type]}
        </p>
        <Badge variant={valid ? 'success' : 'danger'}>
          <span className="tabular">
            {ratio.toFixed(2)}× dari batas {limit.toFixed(2)}×
          </span>
        </Badge>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={valid ? 'h-full rounded-full bg-success' : 'h-full rounded-full bg-danger'}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed">
        {valid
          ? 'Rentang masih di dalam batas BR-05. Rentang yang sempit membuat klien percaya angkanya.'
          : (message ?? 'Lebar rentang melebihi batas tipe fitur ini.')}
      </p>
    </div>
  );
}

/** Editor media contoh fitur (C2.6). */
function MediaEditor({
  media,
  onChange,
}: {
  media: FeatureFormValues['media'];
  onChange: (next: FeatureFormValues['media']) => void;
}) {
  const update = (index: number, partial: Partial<FeatureFormValues['media'][number]>) => {
    onChange(media.map((item, position) => (position === index ? { ...item, ...partial } : item)));
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Media contoh</CardTitle>
          <CardDescription>
            Tangkapan layar dari proyek sebelumnya membuat fitur terasa nyata sebelum dibeli.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onChange([...media, { kind: 'IMAGE', url: '', caption: '' }])}
        >
          Tambah media
        </Button>
      </CardHeader>
      <CardContent>
        {media.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Belum ada media. Fitur tanpa contoh visual lebih sering ditinggalkan klien di tengah
            konfigurasi.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {media.map((item, index) => (
              <li
                key={`media-${index}`}
                className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto]"
              >
                <Field label="Jenis">
                  <Select
                    value={item.kind}
                    onChange={(event) => update(index, { kind: event.target.value as MediaKind })}
                  >
                    {MEDIA_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {MEDIA_KIND_LABEL[kind]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="flex flex-col gap-3">
                  <Field label="URL">
                    <Input
                      value={item.url}
                      onChange={(event) => update(index, { url: event.target.value })}
                      placeholder="/media/wms/stock-opname.png"
                    />
                  </Field>
                  <Field label="Keterangan">
                    <Input
                      value={item.caption}
                      onChange={(event) => update(index, { caption: event.target.value })}
                      placeholder="Layar hitung fisik dengan selisih yang langsung terlihat"
                    />
                  </Field>
                </div>
                <div className="flex items-start">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => onChange(media.filter((_, position) => position !== index))}
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
