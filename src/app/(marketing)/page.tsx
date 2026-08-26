import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  MessageCircleQuestion,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import { Section, SectionHeading, Eyebrow } from '@/components/marketing/section';
import { CategoryCard } from '@/components/marketing/category-card';
import { LandingAnalytics } from '@/components/marketing/landing-analytics';
import { MiniConfigurator } from '@/components/marketing/mini-configurator';
import { ClientLogos, Testimonials } from '@/components/marketing/social-proof';
import { FaqList, type FaqItem } from '@/components/marketing/faq';
import { listPublishedCategories } from '@/lib/services/catalog';
import { HOW_IT_WORKS, PRICE_RANGE_EXPLAINER, site } from '@/lib/site';
import { formatRupiah } from '@/lib/format';
import { BASELINE_PRICING_RULE } from '@/lib/pricing';

export const metadata: Metadata = {
  // `absolute` supaya judul landing tidak ikut ditempeli template "· Rakit"
  // dari root layout — di hasil pencarian, nama merek cukup muncul sekali.
  title: { absolute: `${site.name} — ${site.tagline}` },
  description: site.description,
  alternates: { canonical: '/' },
};

/**
 * Katalog jarang berubah, sementara landing adalah halaman yang paling sering
 * dibuka. Halaman disegarkan berkala saja supaya pengunjung dari koneksi
 * seluler tidak menunggu kueri database di setiap kunjungan.
 */
export const revalidate = 300;

/** Jawaban atas keberatan yang paling sering muncul sebelum orang mau mencoba. */
const OBJECTIONS = [
  {
    question: 'Apakah saya harus bayar untuk lihat harga?',
    answer:
      'Tidak. Merakit dan melihat estimasi sepenuhnya gratis, tanpa perlu membuat akun. ' +
      'Nomor telepon baru kami minta bila Anda sendiri yang ingin dihubungi.',
  },
  {
    question: 'Kenapa harganya berupa rentang, bukan satu angka?',
    answer:
      'Karena kami belum melihat proses kerja Anda. Rentang ini jujur menggambarkan seberapa ' +
      'jauh penyesuaian mungkin dibutuhkan. Setelah konsultasi 30 menit, rentang berubah ' +
      'menjadi satu harga tetap yang berlaku 30 hari.',
  },
  {
    question: 'Bagaimana kalau fitur saya tidak ada di daftar?',
    answer:
      'Tuliskan sendiri sebagai fitur custom. Fitur custom tidak pernah kami masukkan ke total ' +
      'sebelum tim kami memberi estimasi — paling lambat 1x24 jam kerja, gratis.',
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Angka yang muncul di layar ini benar-benar dipakai di penawaran?',
    answer:
      'Ya. Perhitungan di browser Anda memakai rumus dan tarif yang sama persis dengan yang ' +
      'dipakai tim kami saat menerbitkan penawaran resmi. Yang berbeda hanya satu: setelah ' +
      'konsultasi, rentang menyempit menjadi satu angka tetap.',
  },
  {
    question: 'Berapa lama sampai aplikasi bisa dipakai?',
    answer:
      'Estimasi minggu pengerjaan ikut bergerak setiap kali Anda menambah atau melepas fitur. ' +
      'Sebagian besar proyek selesai dalam 8 sampai 16 minggu, dihitung sejak data awal dan ' +
      'akses yang kami butuhkan lengkap.',
  },
  {
    question: 'Apakah ada biaya bulanan?',
    answer:
      'Ada, untuk hosting, pembaruan keamanan, dan dukungan. Biaya itu selalu kami tampilkan ' +
      'terpisah dari nilai proyek supaya Anda tidak salah menghitung anggaran tahunan. ' +
      'Rinciannya ada di halaman struktur harga.',
  },
  {
    question: 'Data dan kode programnya milik siapa?',
    answer:
      'Data operasional sepenuhnya milik Anda dan dapat diekspor kapan saja. Hak pakai aplikasi ' +
      'diserahkan kepada Anda setelah pelunasan; skema penyerahan kode sumber dibicarakan pada ' +
      'sesi konsultasi karena berbeda untuk tiap skema deployment.',
  },
  {
    question: 'Kalau di tengah jalan saya ingin menambah fitur?',
    answer:
      'Bisa. Penambahan dihitung dengan tarif yang sama, bukan tarif darurat, dan dituangkan ' +
      'sebagai adendum sebelum dikerjakan. Selama masa proyek Anda tetap dapat melihat sendiri ' +
      'dampak harganya lebih dulu.',
  },
  {
    question: 'Bagaimana kalau anggaran saya di bawah proyek minimum?',
    answer: (
      <>
        Nilai proyek minimum kami {formatRupiah(BASELINE_PRICING_RULE.minProjectValue)}. Di bawah
        itu, proyek biasanya lebih baik ditangani dengan aplikasi siap pakai — dan kami akan
        mengatakannya terus terang lewat{' '}
        <Link href="/konsultasi" className="font-medium text-brand underline-offset-4 hover:underline">
          sesi konsultasi
        </Link>
        , bukan memaksakan penawaran yang akan mengecewakan kedua pihak.
      </>
    ),
  },
];

const TRUST_POINTS = [
  'Harga muncul sebelum Anda memberi nomor telepon',
  'Rentang dikunci jadi harga tetap setelah konsultasi 30 menit',
  'Biaya bulanan selalu dipisah dari nilai proyek',
];

export default async function LandingPage() {
  const categories = await listPublishedCategories();

  return (
    <>
      <LandingAnalytics />

      {/* ------------------------------------------------------------------
          Hero (A1) — satu kalimat menjelaskan mekanismenya, dan demo hidup
          di sebelahnya. Urutan di ponsel: kalimat, tombol, baru demo.
          ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="bg-grid pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-8 lg:py-20">
          <div className="flex flex-col items-start gap-6">
            <Badge variant="brand" size="md">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Harga terbuka, tanpa formulir dulu
            </Badge>

            <h1 className="text-balance text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] text-fg sm:text-5xl">
              Rakit sendiri aplikasi bisnis Anda fitur demi fitur, dan lihat harganya bergerak di
              layar sebelum Anda bicara dengan siapa pun.
            </h1>

            <p className="max-w-xl text-[15px] leading-relaxed text-fg-muted sm:text-base">
              Vendor lain menyembunyikan angka di balik tombol “hubungi kami”. Di sini Anda memilih
              sendiri fitur yang benar-benar dibutuhkan, melepas yang tidak perlu, dan melihat
              estimasi biaya serta lama pengerjaannya menyesuaikan seketika.
            </p>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="#pilih-aplikasi">
                  Mulai Rakit Aplikasi Anda
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/harga">Lihat cara kami menghitung</Link>
              </Button>
            </div>

            <ul className="flex flex-col gap-2">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-fg-muted">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Demo mini konfigurator (A2) — penjelas produk paling efektif. */}
          <div className="mt-10 lg:mt-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-soft-fg">
              Coba sekarang, tidak perlu daftar
            </p>
            <MiniConfigurator />
          </div>
        </div>
      </section>

      {/* Bukti sosial ringkas (A5) — angka dulu, cerita menyusul di bawah. */}
      <Section size="sm" tone="sunken">
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-3 gap-4 sm:max-w-2xl">
            <div>
              <p className="tabular text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-3xl">
                184
              </p>
              <p className="mt-1 text-xs leading-snug text-fg-muted sm:text-sm">
                proyek selesai &amp; diserahterimakan
              </p>
            </div>
            <div>
              <p className="tabular text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-3xl">
                6 tahun
              </p>
              <p className="mt-1 text-xs leading-snug text-fg-muted sm:text-sm">
                membangun aplikasi operasional
              </p>
            </div>
            <div>
              <p className="tabular text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-3xl">
                12 sektor
              </p>
              <p className="mt-1 text-xs leading-snug text-fg-muted sm:text-sm">
                dari gudang sampai klinik
              </p>
            </div>
          </div>
          <ClientLogos />
        </div>
      </Section>

      {/* ------------------------------------------------------------------
          Grid kategori (A3). Rentang harga tercetak di setiap kartu — ini
          keputusan produk, bukan kelalaian.
          ------------------------------------------------------------------ */}
      <Section id="pilih-aplikasi">
        <SectionHeading
          eyebrow="Langkah pertama"
          title="Pilih jenis aplikasi yang paling mendekati kebutuhan Anda"
          description="Setiap katalog berisi fitur yang sudah pernah kami bangun untuk usaha sejenis, lengkap dengan rentang harga yang umum terjadi. Anda bisa menambah atau melepasnya nanti."
        />

        {categories.length === 0 ? (
          <Card className="mt-8 p-6">
            <p className="text-sm text-fg-muted">
              Katalog sedang disiapkan. Ceritakan kebutuhan Anda lewat{' '}
              <Link href="/konsultasi" className="font-medium text-brand underline-offset-4 hover:underline">
                halaman konsultasi
              </Link>{' '}
              dan kami bantu langsung.
            </p>
          </Card>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryCard category={category} />
              </li>
            ))}

            {/* A4 — jalur keluar bagi yang belum yakin. Wajib selalu terlihat
                sejajar dengan kategori lain, bukan disembunyikan di footer. */}
            <li>
              <Link
                href="/konsultasi"
                className="group flex h-full flex-col rounded-xl border border-dashed border-border-strong bg-surface-sunken/40 p-5 transition-colors hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-fg-muted"
                    aria-hidden="true"
                  >
                    <MessageCircleQuestion className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-snug tracking-[-0.01em] text-fg">
                      Aplikasi lain, atau belum yakin
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                      Kebutuhan Anda tidak mirip satu pun di atas? Ceritakan saja proses kerjanya.
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <p className="text-sm font-medium text-brand">Bicara dengan konsultan</p>
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-fg-subtle transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-brand-fg"
                    aria-hidden="true"
                  >
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            </li>
          </ul>
        )}
      </Section>

      {/* Cara kerja tiga langkah (A6). */}
      <Section tone="sunken" id="cara-kerja-singkat">
        <SectionHeading
          eyebrow="Cara kerja"
          title="Tiga langkah, dan Anda sudah pegang angkanya"
          description="Tidak ada tahap tersembunyi di antara ketiganya. Konsultasi baru dilakukan setelah Anda melihat estimasinya sendiri."
        />
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.step}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <span className="tabular flex size-9 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-fg">
                  {step.step}
                </span>
                <h3 className="text-base font-semibold tracking-[-0.01em] text-fg">{step.title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/cara-kerja">
              Lihat alur lengkapnya sampai serah terima
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* Keberatan yang paling sering muncul, dijawab langsung. */}
      <Section>
        <SectionHeading
          eyebrow="Pertanyaan yang biasanya mengganjal"
          title="Tiga hal yang mungkin Anda curigai sekarang"
          description="Kami jawab di depan, bukan setelah Anda menyerahkan nomor telepon."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {OBJECTIONS.map((item) => (
            <Card key={item.question} className="flex h-full flex-col gap-2 p-5">
              <h3 className="text-[15px] font-semibold leading-snug text-fg">{item.question}</h3>
              <p className="text-sm leading-relaxed text-fg-muted">{item.answer}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-4 flex flex-col gap-4 border-brand/25 bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-soft-fg">
              {PRICE_RANGE_EXPLAINER.short}
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-soft-fg/90">
              {PRICE_RANGE_EXPLAINER.body}
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href="/harga">Bedah struktur harganya</Link>
          </Button>
        </Card>
      </Section>

      {/* Testimoni (A5). */}
      <Section tone="sunken">
        <SectionHeading
          eyebrow="Kata pemakainya"
          title="Cerita dari pemilik usaha yang sudah lewat prosesnya"
          description="Kami minta mereka bercerita apa adanya, termasuk bagian yang tidak berjalan mulus."
        />
        <Testimonials className="mt-8" />
      </Section>

      {/* FAQ singkat. */}
      <Section>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <SectionHeading
            eyebrow="FAQ"
            title="Pertanyaan lain yang sering masuk"
            description="Kalau pertanyaan Anda belum terjawab, kirim saja lewat halaman konsultasi. Dijawab manusia, bukan balasan otomatis."
          />
          <FaqList items={FAQ_ITEMS} />
        </div>
      </Section>

      {/* Penutup — kembalikan orang ke tindakan utama. */}
      <Section tone="sunken" size="sm">
        <Card className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <Eyebrow>Siap mencoba?</Eyebrow>
            <h2 className="text-balance text-xl font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
              Sepuluh menit merakit sekarang menghemat berminggu-minggu tarik-ulur penawaran.
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
              Tidak perlu akun, tidak perlu nomor telepon. Simpan hasil rakitan Anda kapan pun
              ingin melanjutkannya.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="#pilih-aplikasi">
                Mulai Rakit Aplikasi Anda
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/konsultasi">
                <CalendarCheck className="size-4" aria-hidden="true" />
                Jadwalkan konsultasi
              </Link>
            </Button>
          </div>
        </Card>
      </Section>
    </>
  );
}
