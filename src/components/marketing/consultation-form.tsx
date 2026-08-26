'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { CalendarCheck, CheckCircle2, Send } from 'lucide-react';
import { Alert, Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import {
  CONSULTATION_TOPICS,
  CONSULTATION_TOPIC_LABEL,
  type ConsultationTopic,
} from '@/lib/domain/enums';
import { track } from '@/lib/analytics/track';

/**
 * Formulir permintaan konsultasi (PRD A4 / C4.7).
 *
 * Jalur ini sengaja selalu terbuka. Pembeli B2B di Indonesia jarang mengambil
 * keputusan tanpa bicara dengan manusia lebih dulu; memaksa semua orang lewat
 * jalur swalayan justru menurunkan konversi (risiko R7).
 *
 * Validasi tetap dilakukan ulang oleh server. Pemeriksaan di sini hanya untuk
 * memberi tahu lebih cepat, bukan sebagai pengaman.
 */

interface ApiFieldErrors {
  error?: string;
  fields?: Record<string, string>;
}

/** Penjelasan singkat tiap topik supaya orang tidak asal memilih yang pertama. */
const TOPIC_HINT: Record<ConsultationTopic, string> = {
  OTHER_APP: 'Kebutuhan Anda tidak mirip satu pun kategori di katalog kami.',
  UNSURE: 'Anda tahu ada yang perlu dibenahi, tetapi belum yakin bentuk aplikasinya.',
  STUCK_IN_CONFIGURATOR: 'Sudah mulai merakit, tetapi ragu fitur mana yang sebaiknya diambil.',
  MOSTLY_CUSTOM: 'Sebagian besar proses Anda khas dan tidak ada di daftar fitur.',
  TOO_MANY_CUSTOM: 'Fitur custom Anda melebihi batas lima per rakitan.',
  BELOW_MIN_VALUE: 'Rakitan Anda berada di bawah nilai proyek minimum.',
};

export function ConsultationForm({
  defaultTopic,
  configurationToken,
}: {
  defaultTopic: ConsultationTopic;
  configurationToken?: string;
}) {
  const [topic, setTopic] = useState<ConsultationTopic>(defaultTopic);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [startedTracked, setStartedTracked] = useState(false);

  /** Event lead_form_started hanya dikirim sekali, saat orang benar-benar mengetik. */
  function handleFirstInput() {
    if (startedTracked) return;
    setStartedTracked(true);
    track('consultant_requested', { from_step: 'konsultasi', cart_total_min: 0 });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;

    const form = new FormData(event.currentTarget);
    const company = String(form.get('company') ?? '').trim();
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      company: company.length > 0 ? company : undefined,
      email: String(form.get('email') ?? '').trim(),
      whatsapp: String(form.get('whatsapp') ?? '').trim(),
      topic,
      message: String(form.get('message') ?? '').trim(),
      configurationToken,
    };

    setIsSending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as ApiFieldErrors;
        setFieldErrors(body.fields ?? {});
        setFormError(
          body.error ?? 'Permintaan gagal terkirim. Coba lagi beberapa saat lagi.',
        );
        return;
      }

      setIsSent(true);
    } catch {
      // Jaringan seluler sering putus di tengah jalan; sampaikan apa adanya
      // dan tawarkan jalur cadangan lewat email.
      setFormError(
        'Koneksi terputus sebelum permintaan terkirim. Periksa jaringan Anda lalu coba lagi.',
      );
    } finally {
      setIsSending(false);
    }
  }

  if (isSent) {
    return (
      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <span
          className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success-soft-fg"
          aria-hidden="true"
        >
          <CheckCircle2 className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-fg">
            Permintaan Anda sudah masuk
          </h2>
          <p className="text-[15px] leading-relaxed text-fg-muted" role="status">
            Konsultan kami menghubungi Anda lewat WhatsApp{' '}
            <strong className="font-semibold text-fg">paling lambat 1x24 jam kerja</strong>. Bila
            permintaan masuk di akhir pekan atau hari libur, hitungannya dimulai pada hari kerja
            berikutnya. Pesan pertama berisi usulan dua jadwal sesi 30 menit, jadi Anda tinggal
            memilih.
          </p>
        </div>

        <ul className="flex flex-col gap-2 rounded-lg border border-border bg-surface-sunken/60 p-4">
          {[
            'Sesi berlangsung 30 menit, gratis, dan tidak mengikat.',
            'Tidak perlu menyiapkan dokumen apa pun — cukup ceritakan cara kerja tim Anda hari ini.',
            'Bila kebutuhan Anda lebih hemat diselesaikan dengan aplikasi siap pakai, kami akan mengatakannya.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-fg-muted">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/#pilih-aplikasi">
              <CalendarCheck className="size-4" aria-hidden="true" />
              Sambil menunggu, coba rakit sendiri
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/harga">Baca struktur harga</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={handleSubmit} onInput={handleFirstInput} noValidate className="flex flex-col gap-4">
        {formError && (
          <Alert tone="danger" title="Permintaan belum terkirim">
            {formError}
          </Alert>
        )}

        {configurationToken && (
          <Alert tone="brand" title="Rakitan Anda ikut terlampir">
            Konsultan akan membuka hasil rakitan Anda lebih dulu, jadi Anda tidak perlu
            mengulang penjelasan dari nol.
          </Alert>
        )}

        <Field label="Nama Anda" htmlFor="konsultasi-nama" required error={fieldErrors.name}>
          <Input
            id="konsultasi-nama"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            placeholder="Contoh: Budi Santoso"
            invalid={Boolean(fieldErrors.name)}
          />
        </Field>

        <Field
          label="Nama perusahaan"
          htmlFor="konsultasi-perusahaan"
          hint="Boleh dikosongkan bila usaha Anda belum berbadan hukum."
          error={fieldErrors.company}
        >
          <Input
            id="konsultasi-perusahaan"
            name="company"
            autoComplete="organization"
            maxLength={160}
            placeholder="Contoh: CV Sinar Rejeki"
            invalid={Boolean(fieldErrors.company)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="konsultasi-email" required error={fieldErrors.email}>
            <Input
              id="konsultasi-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={160}
              placeholder="nama@perusahaan.co.id"
              invalid={Boolean(fieldErrors.email)}
            />
          </Field>

          <Field
            label="Nomor WhatsApp"
            htmlFor="konsultasi-whatsapp"
            required
            hint="Contoh: 0812-3456-7890"
            error={fieldErrors.whatsapp}
          >
            <Input
              id="konsultasi-whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={20}
              placeholder="0812-3456-7890"
              invalid={Boolean(fieldErrors.whatsapp)}
            />
          </Field>
        </div>

        <Field
          label="Yang ingin Anda bicarakan"
          htmlFor="konsultasi-topik"
          required
          hint={TOPIC_HINT[topic]}
          error={fieldErrors.topic}
        >
          <Select
            id="konsultasi-topik"
            name="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value as ConsultationTopic)}
            invalid={Boolean(fieldErrors.topic)}
          >
            {CONSULTATION_TOPICS.map((value) => (
              <option key={value} value={value}>
                {CONSULTATION_TOPIC_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Ceritakan kebutuhan Anda"
          htmlFor="konsultasi-pesan"
          required
          hint="Semakin konkret prosesnya, semakin tepat saran yang bisa kami berikan di sesi pertama."
          error={fieldErrors.message}
        >
          <Textarea
            id="konsultasi-pesan"
            name="message"
            required
            minLength={10}
            maxLength={2000}
            rows={6}
            placeholder="Contoh: Kami punya dua gudang di Bekasi dan Surabaya. Stok masih dicatat di Excel dan sering selisih saat opname bulanan. Yang paling mendesak adalah barang masuk dari supplier dan surat jalan pengiriman."
            invalid={Boolean(fieldErrors.message)}
          />
        </Field>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Button type="submit" size="lg" isLoading={isSending} className="w-full sm:w-auto">
            {!isSending && <Send className="size-4" aria-hidden="true" />}
            {isSending ? 'Mengirim permintaan…' : 'Kirim permintaan konsultasi'}
          </Button>
          <p className="text-xs leading-relaxed text-fg-subtle">
            Dengan mengirim, Anda setuju kami menghubungi Anda terkait permintaan ini. Nomor dan
            email Anda tidak dibagikan ke pihak ketiga mana pun. Selengkapnya di{' '}
            <Link
              href="/kebijakan-privasi"
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              kebijakan privasi
            </Link>
            .
          </p>
        </div>
      </form>
    </Card>
  );
}
