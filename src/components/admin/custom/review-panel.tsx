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
  Field,
  Input,
  Select,
  Tabs,
  Textarea,
} from '@/components/ui';
import {
  RISK_LEVELS,
  RISK_LEVEL_LABEL,
  type CustomRequestStatus,
  type RiskLevel,
} from '@/lib/domain/enums';
import { formatManDay, formatNumber, formatRupiah, formatRupiahRange } from '@/lib/format';
import { validateRangeWidth, type PricingRuleSnapshot } from '@/lib/pricing';
import {
  askClarification,
  rejectCustomRequest,
  saveEstimate,
} from '@/app/admin/custom/actions';
import { deriveCustomSellPrice, parseManDay, RISK_LEVEL_HINT } from './shared';
import { fieldError, useCustomAction } from './use-custom-action';

type Decision = 'estimasi' | 'klarifikasi' | 'tolak';

export interface ReviewInitialValues {
  manDayMin: number | null;
  manDayMax: number | null;
  riskLevel: RiskLevel | null;
  internalNote: string | null;
  clarificationQuestion: string | null;
  rejectReason: string | null;
}

/**
 * Tiga keputusan reviewer atas satu fitur custom (N3, N4).
 *
 * Harga jual turunan dihitung ulang di browser setiap ketikan memakai
 * aritmetika yang sama dengan server (man-day × tarif referensi × pengali
 * custom), sehingga reviewer melihat konsekuensi komersial angkanya sebelum
 * menekan simpan — bukan setelah penawaran terbit.
 */
export function ReviewPanel({
  requestId,
  status,
  rule,
  initial,
}: {
  requestId: string;
  status: CustomRequestStatus;
  rule: PricingRuleSnapshot;
  initial: ReviewInitialValues;
}) {
  const { pending, result, run, reset } = useCustomAction();
  const [decision, setDecision] = useState<Decision>('estimasi');

  const [manDayMin, setManDayMin] = useState(initial.manDayMin?.toString() ?? '');
  const [manDayMax, setManDayMax] = useState(initial.manDayMax?.toString() ?? '');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(initial.riskLevel ?? 'MEDIUM');
  const [internalNote, setInternalNote] = useState(initial.internalNote ?? '');
  const [question, setQuestion] = useState(initial.clarificationQuestion ?? '');
  const [reason, setReason] = useState(initial.rejectReason ?? '');

  const min = parseManDay(manDayMin);
  const max = parseManDay(manDayMax);
  const hasEffort = min > 0 && max > 0;

  const derived = useMemo(() => deriveCustomSellPrice(rule, min, max), [rule, min, max]);
  const width = useMemo(
    () => (hasEffort ? validateRangeWidth(rule, 'CUSTOM', min, max) : null),
    [rule, min, max, hasEffort],
  );

  // D7: di atas ambang ini sistem sengaja menolak memberi angka dan menawarkan
  // sesi konsultasi. Reviewer perlu tahu batasnya sebelum, bukan sesudah.
  const willNeedConsult = hasEffort && max > rule.customManDayConsultThreshold;

  const isClosed = status === 'PROMOTED';

  function switchDecision(next: string) {
    setDecision(next as Decision);
    reset();
  }

  if (isClosed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keputusan reviewer</CardTitle>
          <CardDescription>
            Permintaan ini sudah dipromosikan menjadi fitur katalog, sehingga estimasinya tidak
            lagi diubah dari sini. Perbaikan man-day dilakukan pada entri katalognya.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keputusan reviewer</CardTitle>
        <CardDescription>
          Tiga jalan keluar dari antrean: beri estimasi, tanyakan yang belum jelas, atau nyatakan
          tidak dapat dikerjakan. Apa pun pilihannya, klien harus dikabari hari itu juga (BR-04).
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <Tabs
          value={decision}
          onChange={switchDecision}
          items={[
            { value: 'estimasi', label: 'Estimasi diberikan' },
            { value: 'klarifikasi', label: 'Perlu klarifikasi' },
            { value: 'tolak', label: 'Tidak dapat dikerjakan' },
          ]}
        />

        {result && !result.ok && <Alert tone="danger">{result.message}</Alert>}

        {decision === 'estimasi' && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Man-day minimum"
                required
                hint="Effort bila prosesnya bisa mengikuti pola yang sudah kami kuasai."
                error={fieldError(result, 'manDayMin')}
              >
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  inputMode="decimal"
                  value={manDayMin}
                  onChange={(event) => setManDayMin(event.target.value)}
                  placeholder="misal 4"
                />
              </Field>

              <Field
                label="Man-day maksimum"
                required
                hint="Effort bila ada penyesuaian alur, field tambahan, atau aturan khusus."
                error={fieldError(result, 'manDayMax')}
              >
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  inputMode="decimal"
                  value={manDayMax}
                  onChange={(event) => setManDayMax(event.target.value)}
                  placeholder="misal 7"
                />
              </Field>
            </div>

            <PriceEcho
              rule={rule}
              hasEffort={hasEffort}
              min={min}
              max={max}
              priceMin={derived.min}
              priceMax={derived.max}
              multiplier={derived.multiplier}
            />

            {width && !width.valid && (
              <Alert tone="danger" title="Rentang terlalu lebar untuk tipe Custom (BR-05)">
                {width.message} Rentang yang terlalu lebar bukan estimasi, melainkan pengakuan
                bahwa kebutuhannya belum dipahami — persempit dulu, atau ajukan klarifikasi.
              </Alert>
            )}

            {willNeedConsult && (
              <Alert tone="warning" title="Effort melampaui ambang konsultasi (D7)">
                Di atas {formatNumber(rule.customManDayConsultThreshold)} man-day, sistem sengaja
                tidak memberi klien angka melainkan menawarkan sesi konsultasi. Estimasi Anda tetap
                tersimpan sebagai bahan internal.
              </Alert>
            )}

            <Field
              label="Tingkat risiko"
              required
              hint={RISK_LEVEL_HINT[riskLevel]}
              error={fieldError(result, 'riskLevel')}
            >
              <Select
                value={riskLevel}
                onChange={(event) => setRiskLevel(event.target.value as RiskLevel)}
              >
                {RISK_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {RISK_LEVEL_LABEL[level]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Catatan internal"
              hint="Tidak pernah terlihat klien. Tulis asumsi, jebakan teknis, dan apa yang membuat angka ini bisa meleset."
              error={fieldError(result, 'internalNote')}
            >
              <Textarea
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                rows={4}
                placeholder="Misal: butuh akses API mitra logistik; bila dokumentasinya tidak ada, effort naik ke batas atas."
              />
            </Field>

            {result?.ok && result.consultRequired && (
              <Alert tone="warning" title="Klien tidak menerima angka — ia menerima tawaran bicara">
                Sistem menahan angkanya dengan sengaja. Estimasi sebesar ini yang dilempar tanpa
                diskusi adalah sumber utama proyek meleset dua kali lipat, jadi yang dikirim ke
                klien adalah ajakan sesi 30 menit untuk membedah alurnya lebih dulu.
              </Alert>
            )}

            <div>
              <Button
                isLoading={pending}
                disabled={!hasEffort || (width ? !width.valid : false)}
                onClick={() =>
                  run(() =>
                    saveEstimate({
                      requestId,
                      manDayMin: min,
                      manDayMax: max,
                      riskLevel,
                      internalNote,
                    }),
                  )
                }
              >
                Simpan estimasi
              </Button>
            </div>
          </div>
        )}

        {decision === 'klarifikasi' && (
          <div className="flex flex-col gap-4">
            <Alert tone="info">
              Selama menunggu jawaban klien, fitur ini tetap tidak ikut dihitung ke total (BR-02).
              Tanyakan sekaligus semua yang belum jelas — bolak-balik dua kali membuat SLA mustahil.
            </Alert>

            <Field
              label="Pertanyaan untuk klien"
              required
              hint="Bahasa operasional, bukan bahasa teknis. Sebutkan contoh konkret agar mudah dijawab."
              error={fieldError(result, 'question')}
            >
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={5}
                placeholder="Misal: saat stok fisik berbeda dari sistem, siapa yang berhak menyetujui selisihnya — supervisor gudang atau kepala cabang?"
              />
            </Field>

            <div>
              <Button
                isLoading={pending}
                disabled={question.trim().length < 15}
                onClick={() => run(() => askClarification(requestId, question))}
              >
                Simpan pertanyaan
              </Button>
            </div>
          </div>
        )}

        {decision === 'tolak' && (
          <div className="flex flex-col gap-4">
            <Alert tone="warning">
              Menolak berarti fitur ini dikeluarkan dari perhitungan dan total rakitan klien
              berubah. Pastikan alasannya dapat dibaca klien apa adanya.
            </Alert>

            <Field
              label="Alasan tidak dapat dikerjakan"
              required
              hint="Sebutkan penyebabnya dan, bila ada, alternatif yang bisa kami kerjakan."
              error={fieldError(result, 'reason')}
            >
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={5}
                placeholder="Misal: sistem yang ingin diintegrasikan tidak menyediakan API. Alternatifnya, unggah berkas Excel harian yang kami proses otomatis."
              />
            </Field>

            <div>
              <Button
                variant="danger"
                isLoading={pending}
                disabled={reason.trim().length < 15}
                onClick={() => run(() => rejectCustomRequest(requestId, reason))}
              >
                Tandai tidak dapat dikerjakan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Gema harga jual yang bergerak saat reviewer mengetik.
 *
 * Angka internal ini hanya untuk area admin (PRD 6.4) — klien melihatnya
 * sebagai bagian dari total, bukan sebagai harga per fitur.
 */
function PriceEcho({
  rule,
  hasEffort,
  min,
  max,
  priceMin,
  priceMax,
  multiplier,
}: {
  rule: PricingRuleSnapshot;
  hasEffort: boolean;
  min: number;
  max: number;
  priceMin: number;
  priceMax: number;
  multiplier: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-sunken p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Harga jual turunan
        </p>
        <Badge variant="neutral">Pengali custom {formatNumber(multiplier, 2)}×</Badge>
      </div>

      <p className="tabular mt-2 text-2xl font-semibold tracking-[-0.02em] text-fg">
        {hasEffort ? formatRupiahRange(priceMin, priceMax, false) : '—'}
      </p>

      <p className="mt-1 text-xs leading-relaxed text-fg-muted">
        {hasEffort
          ? `${formatManDay(min)} – ${formatManDay(max)} × ${formatRupiah(rule.referenceRatePerManDay)} per man-day × ${formatNumber(multiplier, 2)}`
          : 'Isi man-day minimum dan maksimum untuk melihat dampaknya pada harga.'}
      </p>
    </div>
  );
}
