'use client';

import { useMemo, useState } from 'react';

import { MarginBadge } from '@/components/admin';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { FEATURE_TYPE_DESCRIPTION, FEATURE_TYPE_INTERNAL_LABEL } from '@/lib/domain/enums';
import { formatManDay, formatNumber, formatPercent, formatRupiahRange } from '@/lib/format';
import {
  deriveCogsPerManDay,
  effortRatioFor,
  priceMultiplierFor,
  validateRangeWidth,
  type PricingRuleSnapshot,
} from '@/lib/pricing';
import { slugify } from '@/lib/utils';
import { promoteCustomRequest } from '@/app/admin/custom/actions';
import type { PromotionTargetCategory } from '@/app/admin/custom/_lib/queries';
import { parseManDay } from './shared';
import { fieldError, useCustomAction } from './use-custom-action';

type TargetType = 'STANDARD' | 'CONFIGURABLE';

/**
 * Form promosi fitur custom ke katalog (N5).
 *
 * Ini roda gila produk (PRD 2.3), dan satu-satunya tempat di seluruh platform
 * yang menaikkan margin sekaligus menurunkan harga jual: fitur berpindah dari
 * pengali 1,5× ke 0,55× atau 1,0×, sementara effort riilnya turun jauh lebih
 * dalam karena modulnya tinggal dipasang, bukan dibangun dari nol. Karena itu
 * perbandingan "sebelum vs sesudah" ditampilkan langsung di form — supaya
 * keputusan mempromosikan terasa sebagai keputusan bisnis, bukan pekerjaan
 * administrasi.
 */
export function PromoteForm({
  requestId,
  requestName,
  categories,
  suggestedCategoryId,
  suggestedManDayMin,
  suggestedManDayMax,
  rule,
  disabled = false,
  disabledReason,
}: {
  requestId: string;
  requestName: string;
  categories: PromotionTargetCategory[];
  suggestedCategoryId: string | null;
  suggestedManDayMin: number | null;
  suggestedManDayMax: number | null;
  rule: PricingRuleSnapshot;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { pending, result, run, reset } = useCustomAction();
  const [open, setOpen] = useState(false);

  const defaultCategoryId =
    categories.find((category) => category.id === suggestedCategoryId)?.id ??
    categories[0]?.id ??
    '';

  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [groupId, setGroupId] = useState(
    categories.find((category) => category.id === defaultCategoryId)?.groups[0]?.id ?? '',
  );
  const [name, setName] = useState(requestName);
  const [slug, setSlug] = useState(slugify(requestName));
  const [slugTouched, setSlugTouched] = useState(false);
  const [clientDescription, setClientDescription] = useState('');
  const [internalDescription, setInternalDescription] = useState('');
  const [type, setType] = useState<TargetType>('STANDARD');
  const [manDayMin, setManDayMin] = useState(suggestedManDayMin?.toString() ?? '');
  const [manDayMax, setManDayMax] = useState(suggestedManDayMax?.toString() ?? '');
  const [publishNow, setPublishNow] = useState(false);

  const groups = useMemo(
    () => categories.find((category) => category.id === categoryId)?.groups ?? [],
    [categories, categoryId],
  );

  const min = parseManDay(manDayMin);
  const max = parseManDay(manDayMax);
  const hasEffort = min > 0 && max > 0;

  const width = useMemo(
    () => (hasEffort ? validateRangeWidth(rule, type, min, max) : null),
    [rule, type, min, max, hasEffort],
  );

  const impact = useMemo(
    () => (hasEffort ? compareFlywheel(rule, type, min, max) : null),
    [rule, type, min, max, hasEffort],
  );

  function changeCategory(nextId: string) {
    setCategoryId(nextId);
    const nextGroups = categories.find((category) => category.id === nextId)?.groups ?? [];
    setGroupId(nextGroups[0]?.id ?? '');
  }

  function changeName(next: string) {
    setName(next);
    // Slug mengikuti nama sampai admin mengetiknya sendiri — begitu disentuh,
    // slug tidak lagi berubah karena ia menjadi bagian URL publik fitur.
    if (!slugTouched) setSlug(slugify(next));
  }

  function close() {
    setOpen(false);
    reset();
  }

  if (categories.length === 0) {
    return (
      <Alert tone="neutral" title="Belum ada kategori tujuan">
        Katalog belum memiliki kategori dengan kelompok fitur, sehingga promosi belum dapat
        dilakukan. Buat kelompok fiturnya lebih dulu di papan katalog.
      </Alert>
    );
  }

  return (
    <>
      <Button
        variant="accent"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        onClick={() => setOpen(true)}
      >
        Promosikan ke katalog
      </Button>

      <Dialog
        open={open}
        onClose={close}
        size="xl"
        title="Promosikan ke katalog"
        description="Fitur yang berulang tidak boleh terus dijual sebagai custom. Setelah masuk katalog, klien berikutnya menemukannya sebagai fitur siap pakai."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Batal
            </Button>
            <Button
              isLoading={pending}
              disabled={!hasEffort || !groupId || (width ? !width.valid : false)}
              onClick={() =>
                run(
                  () =>
                    promoteCustomRequest({
                      requestId,
                      categoryId,
                      groupId,
                      slug,
                      name,
                      clientDescription,
                      internalDescription,
                      type,
                      manDayMin: min,
                      manDayMax: max,
                      publishNow,
                    }),
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              Promosikan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert tone="brand" title="Mengapa promosi ini penting">
            Selama menjadi fitur custom, pekerjaan ini dijual dengan pengali{' '}
            {formatNumber(priceMultiplierFor(rule, 'CUSTOM'), 2)}× dan diestimasi ulang oleh manusia
            setiap kali diminta. Setelah masuk katalog, pengalinya turun ke{' '}
            {formatNumber(priceMultiplierFor(rule, type), 2)}× sementara effort riilnya turun lebih
            dalam lagi — margin kami naik dan harga bagi klien berikutnya justru turun (PRD 2.3).
          </Alert>

          {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori tujuan" required error={fieldError(result, 'categoryId')}>
              <Select value={categoryId} onChange={(event) => changeCategory(event.target.value)}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Kelompok fitur"
              required
              hint="Kelompok menentukan di bagian mana fitur ini muncul pada konfigurator."
              error={fieldError(result, 'groupId')}
            >
              <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Nama fitur" required error={fieldError(result, 'name')}>
              <Input value={name} onChange={(event) => changeName(event.target.value)} />
            </Field>

            <Field
              label="Slug"
              required
              hint="Bagian URL halaman fitur. Huruf kecil, angka, dan tanda hubung."
              error={fieldError(result, 'slug')}
            >
              <Input
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
              />
            </Field>
          </div>

          <Field
            label="Deskripsi untuk klien"
            required
            hint="Bahasa manfaat operasional, bukan bahasa developer. Contoh: “Cek stok fisik vs sistem”, bukan “Stock Reconciliation Module”."
            error={fieldError(result, 'clientDescription')}
          >
            <Textarea
              value={clientDescription}
              onChange={(event) => setClientDescription(event.target.value)}
              rows={3}
              placeholder="Misal: Menghitung selisih stok fisik hasil opname dengan catatan sistem, lengkap dengan persetujuan supervisor sebelum stok dikoreksi."
            />
          </Field>

          <Field
            label="Catatan internal"
            hint="Tidak pernah terlihat klien. Asumsi teknis dan jebakan yang perlu diketahui tim."
            error={fieldError(result, 'internalDescription')}
          >
            <Textarea
              value={internalDescription}
              onChange={(event) => setInternalDescription(event.target.value)}
              rows={2}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Tipe target"
              required
              hint={FEATURE_TYPE_DESCRIPTION[type]}
              error={fieldError(result, 'type')}
            >
              <Select
                value={type}
                onChange={(event) => setType(event.target.value as TargetType)}
              >
                <option value="STANDARD">{FEATURE_TYPE_INTERNAL_LABEL.STANDARD}</option>
                <option value="CONFIGURABLE">{FEATURE_TYPE_INTERNAL_LABEL.CONFIGURABLE}</option>
              </Select>
            </Field>

            <Field label="Man-day minimum" required error={fieldError(result, 'manDayMin')}>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                inputMode="decimal"
                value={manDayMin}
                onChange={(event) => setManDayMin(event.target.value)}
              />
            </Field>

            <Field label="Man-day maksimum" required error={fieldError(result, 'manDayMax')}>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                inputMode="decimal"
                value={manDayMax}
                onChange={(event) => setManDayMax(event.target.value)}
              />
            </Field>
          </div>

          {width && !width.valid && (
            <Alert tone="danger" title="Rentang man-day melanggar batas tipe ini (BR-05)">
              {width.message}
            </Alert>
          )}

          {impact && (
            <div className="rounded-xl border border-border bg-surface-sunken p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
                Dampak promosi pada klien berikutnya
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-xs text-fg-muted">Sekarang — dijual sebagai Custom</p>
                  <p className="tabular mt-1 text-sm font-semibold text-fg">
                    {formatRupiahRange(impact.custom.priceMin, impact.custom.priceMax, false)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <MarginBadge value={impact.custom.margin} />
                    <span className="tabular text-xs text-fg-subtle">
                      effort {formatManDay(impact.custom.effortMax)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-xs text-fg-muted">
                    Setelah promosi — {FEATURE_TYPE_INTERNAL_LABEL[type]}
                  </p>
                  <p className="tabular mt-1 text-sm font-semibold text-fg">
                    {formatRupiahRange(impact.target.priceMin, impact.target.priceMax, false)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <MarginBadge value={impact.target.margin} />
                    <span className="tabular text-xs text-fg-subtle">
                      effort {formatManDay(impact.target.effortMax)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-fg-muted">
                Harga bagi klien berikutnya turun{' '}
                <span className="tabular font-medium text-fg">
                  {formatPercent(impact.priceDropPct, 0)}
                </span>
                , sementara proyeksi margin bergerak dari{' '}
                <span className="tabular">{formatPercent(impact.custom.margin, 0)}</span> ke{' '}
                <span className="tabular">{formatPercent(impact.target.margin, 0)}</span>.
              </p>
            </div>
          )}

          <Checkbox
            checked={publishNow}
            onChange={(event) => setPublishNow(event.target.checked)}
            label="Langsung terbitkan ke katalog publik"
            hint="Biarkan mati bila deskripsi dan contoh tampilannya masih perlu dirapikan. Fitur draft tidak terlihat klien (L7)."
          />
        </div>
      </Dialog>
    </>
  );
}

interface FlywheelSide {
  priceMin: number;
  priceMax: number;
  effortMax: number;
  margin: number;
}

interface FlywheelComparison {
  custom: FlywheelSide;
  target: FlywheelSide;
  priceDropPct: number;
}

/**
 * Perbandingan harga & margin sebelum/sesudah promosi.
 *
 * Memakai potongan aritmetika yang sama dengan computePrice(): harga =
 * man-day × tarif × pengali tipe, effort riil = man-day × rasio effort tipe,
 * lalu COGS = effort (plus overhead) × biaya per man-day (PRD 6.2–6.4).
 */
function compareFlywheel(
  rule: PricingRuleSnapshot,
  target: TargetType,
  manDayMin: number,
  manDayMax: number,
): FlywheelComparison {
  const { cogsPerManDay } = deriveCogsPerManDay(rule);

  function side(type: TargetType | 'CUSTOM'): FlywheelSide {
    const multiplier = priceMultiplierFor(rule, type);
    const effortRatio = effortRatioFor(rule, type);
    const priceMin = Math.round(manDayMin * rule.referenceRatePerManDay * multiplier);
    const priceMax = Math.round(manDayMax * rule.referenceRatePerManDay * multiplier);
    const effortMax = manDayMax * effortRatio * (1 + rule.overheadEffortRatio);
    const cogs = effortMax * cogsPerManDay;
    return {
      priceMin,
      priceMax,
      effortMax,
      margin: priceMax > 0 ? (priceMax - cogs) / priceMax : 0,
    };
  }

  const custom = side('CUSTOM');
  const promoted = side(target);

  return {
    custom,
    target: promoted,
    priceDropPct: custom.priceMax > 0 ? 1 - promoted.priceMax / custom.priceMax : 0,
  };
}
