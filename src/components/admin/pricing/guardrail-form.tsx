'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescRow,
  useToast,
} from '@/components/ui';
import { formatPercent, formatRupiah } from '@/lib/format';
import { saveGuardrails } from '@/app/admin/harga/actions';
import { NumberField } from './number-field';
import { baselineGuardrailValues } from './rule-values';
import type { GuardrailFormValues } from './types';

/**
 * Pagar pengaman komersial PRD 6.8 (M7).
 *
 * Sengaja berdiri sebagai form tersendiri, terpisah dari tarif: tarif adalah
 * kalibrasi biaya, sedangkan angka-angka di sini adalah kebijakan komersial
 * yang menentukan kapan mesin berhenti dan manusia harus turun tangan.
 */
export function GuardrailForm({
  ruleId,
  version,
  issuedConfigCount,
  initialValues,
}: {
  ruleId: string;
  version: number;
  /** Konfigurasi terbit yang terikat versi ini — menentukan apakah simpan memicu versi baru. */
  issuedConfigCount: number;
  initialValues: GuardrailFormValues;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<GuardrailFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof GuardrailFormValues>(
    key: K,
    value: GuardrailFormValues[K],
  ): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  // Diperiksa di klien agar admin tahu sebelum menekan simpan; server tetap
  // memeriksa ulang karena tidak pernah mempercayai kiriman browser.
  const problems = useMemo(() => {
    const list: string[] = [];
    if (values.targetGrossMarginMin > values.targetGrossMarginMax) {
      list.push('Target margin minimum melebihi target maksimum.');
    }
    if (values.minGrossMarginPct > values.targetGrossMarginMin) {
      list.push(
        'Ambang margin wajib approval harus berada di bawah target margin minimum (BR-17), ' +
          'kalau tidak, hampir setiap penawaran sehat pun ikut tertahan approval.',
      );
    }
    return list;
  }, [values]);

  const willFork = issuedConfigCount > 0;
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveGuardrails(ruleId, values);
      if (!result.ok) {
        setError(result.message);
        toast({ title: 'Gagal menyimpan', description: result.message, tone: 'danger' });
        return;
      }
      toast({
        title: result.forked ? 'Tersimpan sebagai versi baru' : 'Pagar pengaman tersimpan',
        description: result.message,
        tone: result.forked ? 'warning' : 'success',
      });
      if (result.ruleId && result.ruleId !== ruleId) {
        router.push(`/admin/harga/${result.ruleId}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagar pengaman komersial</CardTitle>
        <CardDescription>
          PRD 6.8. Batas-batas ini menentukan kapan mesin berhenti menerbitkan penawaran sendiri
          dan menyerahkan keputusan kepada manusia. Nilainya ikut membeku bersama versi aturan,
          sehingga penawaran lama tetap dinilai dengan kebijakan yang berlaku saat itu (BR-07).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {willFork && (
          <Alert tone="warning" title="Perubahan akan melahirkan versi baru">
            {issuedConfigCount} konfigurasi terbit terikat pada v{version}, jadi kebijakan lama
            harus dibiarkan utuh (BR-07).
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            label="Nilai proyek minimum"
            kind="money"
            value={values.minProjectValue}
            onChange={(next) => set('minProjectValue', next)}
            min={0}
            step={1_000_000}
            hint="BR-13. Di bawah angka ini konfigurator menawarkan sesi konsultasi, bukan penawaran."
          />
          <NumberField
            label="Batas porsi fitur custom"
            kind="percent"
            value={values.maxCustomSharePct}
            onChange={(next) => set('maxCustomSharePct', next)}
            min={0}
            max={100}
            hint="Bila nilai custom melampaui porsi ini, rakitan sudah bukan produk konfigurasi lagi."
          />
          <NumberField
            label="Kuota override harga sales"
            kind="percent"
            value={values.salesOverrideQuotaPct}
            onChange={(next) => set('salesOverrideQuotaPct', next)}
            min={0}
            max={100}
            hint="BR-16. Diskon di atas kuota ini wajib melewati persetujuan."
          />
          <NumberField
            label="Ambang margin wajib approval"
            kind="percent"
            value={values.minGrossMarginPct}
            onChange={(next) => set('minGrossMarginPct', next)}
            min={0}
            max={100}
            hint="BR-17. Gross margin di bawah angka ini tidak boleh terbit otomatis."
          />
          <NumberField
            label="Target margin minimum"
            kind="percent"
            value={values.targetGrossMarginMin}
            onChange={(next) => set('targetGrossMarginMin', next)}
            min={0}
            max={100}
            hint="Batas bawah pita margin sehat."
          />
          <NumberField
            label="Target margin maksimum"
            kind="percent"
            value={values.targetGrossMarginMax}
            onChange={(next) => set('targetGrossMarginMax', next)}
            min={0}
            max={100}
            hint="Batas atas pita margin sehat."
          />
          <NumberField
            label="Ambang man-day fitur custom"
            suffix="hari"
            value={values.customManDayConsultThreshold}
            onChange={(next) => set('customManDayConsultThreshold', next)}
            min={0}
            step={1}
            hint="D7. Permintaan custom di atas ambang ini dialihkan ke sesi konsultasi, bukan diestimasi lewat antrean biasa."
          />
        </div>

        <div className="rounded-lg border border-border bg-surface-sunken p-4">
          <p className="mb-1 text-sm font-semibold text-fg">Ringkasan kebijakan yang berlaku</p>
          <dl>
            <DescRow
              label="Penawaran otomatis terbit bila"
              value={`nilai ≥ ${formatRupiah(values.minProjectValue)} dan margin ≥ ${formatPercent(values.minGrossMarginPct)}`}
            />
            <DescRow
              label="Pita margin sehat"
              value={`${formatPercent(values.targetGrossMarginMin)} – ${formatPercent(values.targetGrossMarginMax)}`}
            />
            <DescRow
              label="Sales boleh menurunkan harga hingga"
              value={formatPercent(values.salesOverrideQuotaPct)}
            />
            <DescRow
              label="Porsi custom maksimum"
              value={formatPercent(values.maxCustomSharePct)}
            />
          </dl>
        </div>

        {problems.length > 0 && (
          <Alert tone="warning" title="Kombinasi angka ini akan ditolak saat disimpan">
            <ul className="list-disc space-y-1 pl-4">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </Alert>
        )}

        {error && (
          <Alert tone="danger" title="Pagar pengaman belum tersimpan">
            {error}
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-fg-muted">
            {dirty ? 'Ada perubahan yang belum disimpan.' : 'Tidak ada perubahan.'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setValues(baselineGuardrailValues())}
            >
              Kembalikan ke nilai PRD
            </Button>
            <Button
              type="button"
              onClick={submit}
              isLoading={pending}
              disabled={pending || problems.length > 0}
            >
              {willFork ? 'Simpan sebagai versi baru' : 'Simpan pagar pengaman'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
