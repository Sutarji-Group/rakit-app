import Link from 'next/link';
import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui';
import { Section, SectionHeading } from '@/components/marketing/section';
import { ConsultationForm } from '@/components/marketing/consultation-form';
import { CONSULTATION_TOPICS, coerceEnum } from '@/lib/domain/enums';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Konsultasi',
  description:
    'Ceritakan kebutuhan aplikasi Anda dan konsultan kami menghubungi lewat WhatsApp paling ' +
    'lambat 1x24 jam kerja. Sesi 30 menit, gratis, dan tidak mengikat.',
  alternates: { canonical: '/konsultasi' },
};

/** Apa yang benar-benar terjadi setelah tombol kirim ditekan. */
const EXPECTATIONS = [
  {
    icon: Clock,
    title: 'Dihubungi dalam 1x24 jam kerja',
    body:
      'Lewat WhatsApp ke nomor yang Anda isi. Pesan pertama berisi dua usulan jadwal, jadi Anda ' +
      'tinggal memilih yang cocok.',
  },
  {
    icon: ShieldCheck,
    title: 'Tidak ada kewajiban apa pun',
    body:
      'Sesi 30 menit ini gratis. Bila kebutuhan Anda lebih hemat diselesaikan dengan aplikasi ' +
      'siap pakai, kami akan mengatakannya terus terang.',
  },
];

export default async function KonsultasiPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; topik?: string }>;
}) {
  const query = await searchParams;

  // Tautan dari konfigurator membawa token rakitan dan kode topik, sehingga
  // orang yang tersendat di tengah jalan tidak perlu mengulang penjelasan.
  const configurationToken =
    typeof query.dari === 'string' && query.dari.length >= 6 && query.dari.length <= 40
      ? query.dari
      : undefined;

  const defaultTopic = coerceEnum(
    query.topik?.toUpperCase(),
    CONSULTATION_TOPICS,
    configurationToken ? 'STUCK_IN_CONFIGURATOR' : 'UNSURE',
  );

  return (
    <Section size="lg">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="flex flex-col gap-8">
          <SectionHeading
            as="h1"
            eyebrow="Konsultasi"
            title="Bicara dengan manusia dulu, sebelum menyentuh angka"
            description="Tidak semua kebutuhan cocok dirakit sendiri, dan tidak apa-apa. Ceritakan proses kerja Anda apa adanya — termasuk bagian yang berantakan — dan konsultan kami bantu memetakan langkah paling masuk akal."
          />

          <ul className="flex flex-col gap-4">
            {EXPECTATIONS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg"
                    aria-hidden="true"
                  >
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-[15px] font-semibold text-fg">{item.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-subtle">
              Atau hubungi langsung
            </h2>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li className="flex items-start gap-2.5 text-fg-muted">
                <Mail className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <a
                  href={`mailto:${site.email}`}
                  className="font-medium text-fg underline-offset-4 hover:underline"
                >
                  {site.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-fg-muted">
                <Phone className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <a
                  href={`tel:${site.phone.replace(/\s/g, '')}`}
                  className="font-medium text-fg underline-offset-4 hover:underline"
                >
                  {site.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-fg-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <span>
                  {site.legalName}
                  <br />
                  {site.address}
                </span>
              </li>
            </ul>
            <p className="border-t border-border pt-3 text-xs leading-relaxed text-fg-subtle">
              Jam kerja Senin – Jumat, 09.00 – 18.00 WIB. Pesan yang masuk di luar jam itu dijawab
              pada hari kerja berikutnya.
            </p>
          </Card>

          <p className="text-sm leading-relaxed text-fg-muted">
            Sudah tahu jenis aplikasinya?{' '}
            <Link
              href="/#pilih-aplikasi"
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              Rakit sendiri dulu
            </Link>{' '}
            supaya sesi konsultasi bisa langsung membahas hal yang penting.
          </p>
        </div>

        <ConsultationForm defaultTopic={defaultTopic} configurationToken={configurationToken} />
      </div>
    </Section>
  );
}
