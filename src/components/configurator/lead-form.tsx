'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { BUDGET_BANDS, BUDGET_BAND_LABEL } from '@/lib/domain/enums';
import { formatRupiahShort, formatWeekRange } from '@/lib/format';
import { track } from '@/lib/analytics/track';
import type { PriceBreakdown } from '@/lib/pricing';

/**
 * Formulir pengambilan penawaran (PRD F3).
 *
 * Keputusan terbuka PRD bagian 16 dijawab di sini: rentang harga SUDAH terlihat
 * jauh sebelum formulir ini. Menyembunyikan harga sampai kontak terisi akan
 * menghancurkan satu-satunya diferensiasi produk ini, dan formulir ini karena
 * itu diposisikan sebagai "ambil dokumennya", bukan "buka harganya".
 */
export function LeadForm({
  token,
  breakdown,
  featureCount,
  pendingCustomCount,
}: {
  token: string;
  breakdown: PriceBreakdown;
  featureCount: number;
  pendingCustomCount: number;
}) {
  const router = useRouter();
  const [contactName, setContactName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [budgetBand, setBudgetBand] = useState<(typeof BUDGET_BANDS)[number]>('UNKNOWN');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    track(
      'lead_form_started',
      { total_min: breakdown.totalMin, total_max: breakdown.totalMax },
      token,
    );
  }, [token, breakdown.totalMin, breakdown.totalMax]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setGlobalError(null);

    try {
      const response = await fetch(`/api/configurations/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName,
          company: company || undefined,
          email,
          whatsapp,
          budgetBand,
          note: note || undefined,
          marketingConsent: consent,
          trafficSource: document.referrer || undefined,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        quoteNumber?: string;
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok) {
        if (body.fields) setErrors(body.fields);
        setGlobalError(body.error ?? 'Pengiriman gagal. Coba lagi sebentar lagi.');
        return;
      }

      track(
        'configuration_submitted',
        {
          total_min: breakdown.totalMin,
          total_max: breakdown.totalMax,
          feature_count: featureCount,
          custom_count: pendingCustomCount,
        },
        token,
      );

      router.push(`/rakit/${token}/terima-kasih`);
    } catch {
      setGlobalError('Koneksi terputus. Rakitan Anda tetap tersimpan — coba kirim lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field
          label="Nama Anda"
          required
          htmlFor="lf-name"
          error={errors.contactName}
        >
          <Input
            id="lf-name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Budi Santoso"
            autoComplete="name"
            invalid={Boolean(errors.contactName)}
            required
          />
        </Field>

        <Field label="Nama perusahaan" htmlFor="lf-company" error={errors.company}>
          <Input
            id="lf-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="CV Sumber Rejeki Distribusi"
            autoComplete="organization"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Email"
            hint="PDF penawaran dikirim ke alamat ini."
            required
            htmlFor="lf-email"
            error={errors.email}
          >
            <Input
              id="lf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="budi@perusahaan.co.id"
              autoComplete="email"
              invalid={Boolean(errors.email)}
              required
            />
          </Field>

          <Field
            label="Nomor WhatsApp"
            hint="Untuk menjadwalkan sesi konsultasi."
            required
            htmlFor="lf-wa"
            error={errors.whatsapp}
          >
            <Input
              id="lf-wa"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="0812-3456-7890"
              autoComplete="tel"
              invalid={Boolean(errors.whatsapp)}
              required
            />
          </Field>
        </div>

        <Field
          label="Perkiraan anggaran"
          hint="Opsional. Membantu kami menyiapkan opsi yang realistis untuk Anda."
          htmlFor="lf-budget"
        >
          <Select
            id="lf-budget"
            value={budgetBand}
            onChange={(e) => setBudgetBand(e.target.value as typeof budgetBand)}
          >
            {BUDGET_BANDS.map((band) => (
              <option key={band} value={band}>
                {BUDGET_BAND_LABEL[band]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Ada yang ingin Anda sampaikan?"
          hint="Opsional. Misalnya target waktu go-live atau kendala khusus di operasional Anda."
          htmlFor="lf-note"
        >
          <Textarea
            id="lf-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Kami ingin sistem sudah jalan sebelum musim ramai bulan November."
          />
        </Field>

        {/* Kepatuhan UU PDP: persetujuan pemasaran harus eksplisit dan terpisah. */}
        <Checkbox
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          label="Saya bersedia menerima informasi produk dan penawaran dari Rakit."
          hint="Opsional. Anda tetap menerima penawaran yang diminta meski kotak ini tidak dicentang."
        />

        {globalError && (
          <Alert tone="danger" title="Penawaran belum terkirim">
            {globalError}
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" isLoading={submitting}>
            Terbitkan penawaran saya
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/rakit/${token}/ringkasan`}>Kembali ke ringkasan</Link>
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-fg-subtle">
          Data Anda kami pakai untuk menyiapkan penawaran dan menghubungi Anda soal proyek ini.
          Rinciannya ada di{' '}
          <Link href="/kebijakan-privasi" className="text-brand underline-offset-2 hover:underline">
            kebijakan privasi
          </Link>
          .
        </p>
      </form>

      {/* -- Ringkasan yang dibawa ke formulir ---------------------------- */}
      <aside>
        <Card className="sticky top-24">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
              Yang akan Anda terima
            </p>
            <p className="tabular mt-1.5 text-xl font-semibold tracking-[-0.02em] text-fg">
              {formatRupiahShort(breakdown.displayTotalMin)} –{' '}
              {formatRupiahShort(breakdown.displayTotalMax)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {featureCount} fitur ·{' '}
              {formatWeekRange(breakdown.duration.weeksMin, breakdown.duration.weeksMax)}
            </p>

            <ul className="mt-4 flex flex-col gap-2.5">
              {[
                'Dokumen PDF ber-nomor penawaran, berlaku 30 hari.',
                'Rincian lengkap per fitur beserta ruang lingkupnya.',
                'Diagram tahapan pengerjaan dan asumsi yang dipakai.',
                'Daftar eksplisit apa yang tidak termasuk.',
                'Tautan menjadwalkan sesi konsultasi 30 menit.',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed text-fg-muted">
                  <svg viewBox="0 0 14 14" className="mt-0.5 size-3.5 shrink-0 text-success" fill="none" aria-hidden="true">
                    <path d="m3.5 7.2 2.4 2.3 4.6-4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            {pendingCustomCount > 0 && (
              <p className="mt-4 rounded-lg bg-type-custom-soft px-3 py-2.5 text-xs leading-relaxed text-type-custom">
                {pendingCustomCount} fitur khusus Anda masuk antrean review. Total final dikirim
                setelah tim kami selesai mengestimasinya, paling lambat 1×24 jam kerja.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
