import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  CalendarClock,
  Check,
  Layers,
  Percent,
  Repeat,
  Scale,
  Server,
  Smartphone,
  Wrench,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  DescRow,
  FeatureTypeBadge,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { Section, SectionHeading } from '@/components/marketing/section';
import { FaqList, type FaqItem } from '@/components/marketing/faq';
import { PRICE_RANGE_EXPLAINER, site } from '@/lib/site';
import {
  FEATURE_TYPE_DESCRIPTION,
  FEATURE_TYPE_LABEL,
  PROJECT_DEPLOYMENT_DESCRIPTION,
  PROJECT_DEPLOYMENT_LABEL,
  PROJECT_PLATFORM_DESCRIPTION,
  PROJECT_PLATFORM_LABEL,
  PROJECT_DEPLOYMENTS,
  PROJECT_PLATFORMS,
  FEATURE_TYPES,
} from '@/lib/domain/enums';
import {
  formatNumber,
  formatPercent,
  formatRupiah,
  formatRupiahRange,
  formatWeekRange,
} from '@/lib/format';
import {
  BASELINE_PRICING_RULE,
  computePrice,
  type PriceInputFeature,
} from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Struktur harga',
  description:
    'Seluruh cara kami menghitung harga, terbuka: mengapa harga berupa rentang, empat tipe ' +
    'fitur, pengali platform dan deployment, diskon skala, biaya setup tetap, nilai proyek ' +
    'minimum, dan biaya berulang yang selalu dipisah dari nilai proyek.',
  alternates: { canonical: '/harga' },
};

const RULE = BASELINE_PRICING_RULE;

/** "×1,25" — bentuk pengali yang mudah dibaca orang non-teknis. */
function multiplierText(value: number): string {
  return `×${formatNumber(value, 2)}`;
}

/**
 * Contoh perhitungan yang dipakai di bagian “Contoh nyata”.
 *
 * Angkanya tidak diketik tangan: rakitan contoh ini dijalankan melalui
 * `computePrice()` yang sama dengan konfigurator, sehingga halaman ini tidak
 * mungkin memuat angka yang tidak konsisten dengan penawaran sungguhan.
 * Rentang man-day mengikuti batas lebar per tipe (BR-05).
 */
const EXAMPLE_FEATURES: PriceInputFeature[] = [
  { id: 'c1', name: 'Data induk barang & mitra', type: 'CORE', manDayMin: 4, manDayMax: 4.5 },
  { id: 'c2', name: 'Pengguna & hak akses', type: 'CORE', manDayMin: 3, manDayMax: 3.4 },
  { id: 'c3', name: 'Dasbor operasional harian', type: 'CORE', manDayMin: 3, manDayMax: 3.4 },

  { id: 's1', name: 'Penerimaan barang dari PO', type: 'STANDARD', manDayMin: 4, manDayMax: 5 },
  { id: 's2', name: 'Penyimpanan per rak & lokasi', type: 'STANDARD', manDayMin: 3.5, manDayMax: 4.5 },
  { id: 's3', name: 'Picking list & surat jalan', type: 'STANDARD', manDayMin: 4.5, manDayMax: 5.5 },
  { id: 's4', name: 'Retur barang masuk', type: 'STANDARD', manDayMin: 3, manDayMax: 3.8 },
  { id: 's5', name: 'Retur barang keluar', type: 'STANDARD', manDayMin: 3, manDayMax: 3.8 },
  { id: 's6', name: 'Mutasi antar gudang', type: 'STANDARD', manDayMin: 3.5, manDayMax: 4.4 },
  { id: 's7', name: 'Laporan nilai persediaan', type: 'STANDARD', manDayMin: 3, manDayMax: 3.8 },
  { id: 's8', name: 'Laporan pergerakan barang', type: 'STANDARD', manDayMin: 2.5, manDayMax: 3.2 },
  { id: 's9', name: 'Cetak label & barcode', type: 'STANDARD', manDayMin: 2.5, manDayMax: 3.2 },
  { id: 's10', name: 'Riwayat perubahan data', type: 'STANDARD', manDayMin: 2, manDayMax: 2.5 },
  { id: 's11', name: 'Notifikasi stok menipis', type: 'STANDARD', manDayMin: 2, manDayMax: 2.5 },
  { id: 's12', name: 'Ekspor data ke Excel', type: 'STANDARD', manDayMin: 2, manDayMax: 2.5 },

  { id: 'g1', name: 'Scan barcode lewat ponsel', type: 'CONFIGURABLE', manDayMin: 4, manDayMax: 6 },
  { id: 'g2', name: 'Stock opname per rak', type: 'CONFIGURABLE', manDayMin: 4, manDayMax: 6 },
  { id: 'g3', name: 'Batch & tanggal kedaluwarsa', type: 'CONFIGURABLE', manDayMin: 4.5, manDayMax: 7 },
  { id: 'g4', name: 'Persetujuan berjenjang', type: 'CONFIGURABLE', manDayMin: 3.5, manDayMax: 5.5 },
  { id: 'g5', name: 'Integrasi ke sistem akuntansi', type: 'CONFIGURABLE', manDayMin: 5, manDayMax: 8 },
  { id: 'g6', name: 'Tarif ongkos kirim per zona', type: 'CONFIGURABLE', manDayMin: 3.5, manDayMax: 5.5 },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Apakah rentang di layar bisa berubah setelah konsultasi?',
    answer:
      'Harga final selalu berada di dalam rentang yang Anda lihat, kecuali bila pada sesi ' +
      'konsultasi muncul kebutuhan baru yang belum ada di rakitan Anda. Kebutuhan baru itu ' +
      'ditambahkan secara terbuka sebagai baris tersendiri, bukan disisipkan diam-diam ke total.',
  },
  {
    question: 'Kenapa fitur “Perlu Penyesuaian” rentangnya jauh lebih lebar?',
    answer:
      'Karena modulnya sudah ada, tetapi alur dan istilah di dalamnya harus mengikuti cara kerja ' +
      'Anda. Sebelum kami melihat prosesnya, jujur saja kami belum tahu seberapa banyak yang ' +
      'perlu diubah. Rentang lebar adalah pengakuan atas ketidaktahuan itu, bukan cara menaikkan harga.',
  },
  {
    question: 'Apakah diskon skala bisa digabung dengan potongan lain?',
    answer:
      'Diskon skala berlaku otomatis dan tidak perlu diminta. Potongan tambahan dari tim sales ' +
      'dibatasi dan wajib melewati persetujuan internal, jadi tidak ada gunanya menawar berulang ' +
      'kali — angka yang Anda lihat sudah angka yang wajar sejak awal.',
  },
  {
    question: 'Bagaimana skema pembayarannya?',
    answer:
      'Umumnya bertahap mengikuti milestone: uang muka saat kontrak, lalu pembayaran menyusul ' +
      'pada setiap serah terima milestone. Rinciannya disepakati pada penawaran final, termasuk ' +
      'termin dan dokumen penagihan yang Anda butuhkan.',
  },
  {
    question: 'Apakah harga sudah termasuk pajak?',
    answer:
      'Belum. Seluruh angka di situs ini adalah nilai pekerjaan sebelum pajak. PPN dan pajak ' +
      'lain yang berlaku dicantumkan terpisah pada penawaran resmi supaya Anda dapat ' +
      'membandingkannya apel-ke-apel dengan penawaran lain.',
  },
];

export default function HargaPage() {
  const example = computePrice({
    rule: RULE,
    features: EXAMPLE_FEATURES,
    platform: 'WEB_PWA',
    deployment: 'OUR_CLOUD',
    userTier: 'T50',
    includeUserTierRecurring: true,
  });

  const exampleTier = RULE.userTierPricing.find((tier) => tier.tier === 'T50');

  return (
    <>
      <Section size="lg" className="border-b border-border">
        <SectionHeading
          as="h1"
          eyebrow="Struktur harga"
          title="Ini seluruh cara kami menghitung. Tidak ada halaman kedua yang lebih jujur dari ini."
          description="Kompetitor menyimpan rumusnya sampai Anda menyerahkan nomor telepon. Kami menaruhnya di halaman terbuka supaya Anda bisa memeriksa sendiri apakah angkanya masuk akal — bahkan sebelum berkenalan."
        />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/#pilih-aplikasi">
              Hitung untuk kasus Anda sendiri
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#contoh">Lihat contoh perhitungan penuh</Link>
          </Button>
        </div>
      </Section>

      {/* --------------------------------------------------------------
          Anatomi harga: urutan hitungannya persis seperti di mesin harga.
          -------------------------------------------------------------- */}
      <Section>
        <SectionHeading
          eyebrow="Anatomi harga"
          title="Lima langkah, itu saja"
          description="Urutan ini berlaku untuk semua proyek, tanpa kecuali dan tanpa versi khusus untuk pelanggan tertentu."
        />
        <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Layers,
              title: 'Harga tiap fitur',
              body:
                'Setiap fitur punya perkiraan beban kerja sendiri. Semakin banyak penyesuaian ' +
                'yang dibutuhkan, semakin besar bebannya — dan itulah yang membedakan harga ' +
                'antar tipe fitur.',
            },
            {
              icon: Smartphone,
              title: 'Pengali platform',
              body:
                'Aplikasi yang juga harus nyaman di ponsel, apalagi terpasang di Play Store, ' +
                'menambah pekerjaan nyata: tampilan, pengujian perangkat, dan proses rilis.',
            },
            {
              icon: Server,
              title: 'Pengali deployment',
              body:
                'Memasang di server milik Anda atau di jaringan internal tanpa akses keluar ' +
                'menambah kerja penyiapan, pengujian, dan prosedur rilis.',
            },
            {
              icon: Percent,
              title: 'Diskon skala',
              body:
                'Semakin banyak fitur dalam satu proyek, semakin efisien pengerjaannya. ' +
                'Efisiensi itu kami kembalikan sebagai potongan otomatis, bukan sebagai margin.',
            },
            {
              icon: Wrench,
              title: 'Biaya setup & onboarding',
              body:
                `Tetap ${formatRupiah(RULE.setupFee)} untuk semua proyek: penyiapan lingkungan, ` +
                'migrasi data awal, dan pendampingan pemakaian. Nilainya tidak ikut didiskon ' +
                'karena pekerjaannya memang tidak menyusut.',
            },
            {
              icon: Repeat,
              title: 'Biaya berulang — di luar semua ini',
              body:
                'Hosting, pembaruan keamanan, dan dukungan dihitung bulanan dan tidak pernah ' +
                'dicampur ke nilai proyek, agar anggaran belanja modal dan biaya operasional ' +
                'Anda tidak tertukar.',
            },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <Card className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg"
                      aria-hidden="true"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="tabular text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                      {index < 5 ? `Langkah ${index + 1}` : 'Terpisah'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold tracking-[-0.01em] text-fg">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-muted">{step.body}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* --------------------------------------------------------------
          Mengapa rentang, dan bagaimana rentang menyempit (PRD 6.9).
          -------------------------------------------------------------- */}
      <Section tone="sunken" id="rentang">
        <SectionHeading
          eyebrow="Rentang harga"
          title={PRICE_RANGE_EXPLAINER.short}
          description={PRICE_RANGE_EXPLAINER.body}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PRICE_RANGE_EXPLAINER.detail.map((item, index) => (
            <Card key={item.title} className="flex h-full flex-col gap-2 p-5">
              <span className="tabular text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                {index + 1}
              </span>
              <h3 className="text-base font-semibold text-fg">{item.title}</h3>
              <p className="text-sm leading-relaxed text-fg-muted">{item.body}</p>
            </Card>
          ))}
        </div>

        <Alert
          tone="brand"
          title="Rentang yang terlalu lebar adalah masalah kami, bukan masalah Anda"
          icon={<Scale className="size-4" aria-hidden="true" />}
          className="mt-4"
        >
          Kami membatasi seberapa lebar rentang boleh dipasang untuk setiap tipe fitur. Bila sebuah
          fitur ternyata butuh rentang lebih lebar dari batas itu, tim kami wajib memecahnya menjadi
          bagian-bagian yang lebih jelas atau memindahkannya ke jalur estimasi manual — bukan
          menutupinya dengan angka yang serba mungkin.
        </Alert>
      </Section>

      {/* --------------------------------------------------------------
          Empat tipe fitur.
          -------------------------------------------------------------- */}
      <Section>
        <SectionHeading
          eyebrow="Tipe fitur"
          title="Empat tipe fitur, dan apa artinya bagi tagihan Anda"
          description="Tipe menentukan seberapa banyak pekerjaan yang tersisa untuk fitur itu — dan karena itu, seberapa besar pengaruhnya ke harga."
        />
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {FEATURE_TYPES.map((type) => (
            <li key={type}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <FeatureTypeBadge type={type} size="md" />
                  <span className="text-sm font-medium text-fg">{FEATURE_TYPE_LABEL[type]}</span>
                </div>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {FEATURE_TYPE_DESCRIPTION[type]}
                </p>
                <p className="mt-auto border-t border-border pt-3 text-sm leading-relaxed text-fg">
                  {type === 'CORE' &&
                    'Sudah termasuk dalam paket dasar dan tidak dapat dilepas. Tanpa fondasi ini aplikasi tidak dapat berdiri, jadi tidak ada gunanya menawarkannya sebagai pilihan.'}
                  {type === 'STANDARD' &&
                    'Dampak harganya paling ringan dan rentangnya paling sempit, karena kami sudah pernah membangunnya berkali-kali.'}
                  {type === 'CONFIGURABLE' &&
                    'Dampak harganya sedang sampai besar dan rentangnya lebih lebar. Setelah kami melihat proses Anda, rentang inilah yang paling banyak menyempit.'}
                  {type === 'CUSTOM' &&
                    'Tidak pernah masuk total sebelum tim kami memberi estimasi, paling lambat 1x24 jam kerja. Anda tidak akan pernah melihat angka tebakan di layar.'}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* --------------------------------------------------------------
          Pengali platform & deployment (PRD 6.5).
          -------------------------------------------------------------- */}
      <Section tone="sunken">
        <SectionHeading
          eyebrow="Pengali proyek"
          title="Dua pilihan yang mengubah harga seluruh proyek sekaligus"
          description="Berbeda dengan fitur yang berpengaruh satu per satu, dua pilihan ini mengalikan seluruh subtotal fitur. Angkanya kami cetak apa adanya."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
              <Smartphone className="size-4 text-fg-subtle" aria-hidden="true" />
              Cara aplikasi diakses
            </h3>
            <TableWrapper>
              <Table>
                <caption className="sr-only">
                  Pengali harga menurut cara aplikasi diakses pengguna
                </caption>
                <thead>
                  <tr>
                    <Th scope="col">Pilihan</Th>
                    <Th scope="col" className="text-right">
                      Pengali
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECT_PLATFORMS.map((platform) => (
                    <Tr key={platform}>
                      <Td>
                        <p className="font-medium text-fg">{PROJECT_PLATFORM_LABEL[platform]}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                          {PROJECT_PLATFORM_DESCRIPTION[platform]}
                        </p>
                      </Td>
                      <Td className="tabular whitespace-nowrap text-right align-top font-semibold">
                        {multiplierText(RULE.platformMultipliers[platform])}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
              <Server className="size-4 text-fg-subtle" aria-hidden="true" />
              Tempat aplikasi dipasang
            </h3>
            <TableWrapper>
              <Table>
                <caption className="sr-only">
                  Pengali harga menurut tempat aplikasi dipasang
                </caption>
                <thead>
                  <tr>
                    <Th scope="col">Pilihan</Th>
                    <Th scope="col" className="text-right">
                      Pengali
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECT_DEPLOYMENTS.map((deployment) => (
                    <Tr key={deployment}>
                      <Td>
                        <p className="font-medium text-fg">
                          {PROJECT_DEPLOYMENT_LABEL[deployment]}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                          {PROJECT_DEPLOYMENT_DESCRIPTION[deployment]}
                        </p>
                      </Td>
                      <Td className="tabular whitespace-nowrap text-right align-top font-semibold">
                        {multiplierText(RULE.deploymentMultipliers[deployment])}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------------
          Diskon skala (PRD 6.6).
          -------------------------------------------------------------- */}
      <Section>
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-12">
          <SectionHeading
            eyebrow="Diskon skala"
            title="Semakin banyak fitur, semakin murah per fiturnya"
            description="Bukan trik penjualan. Mengerjakan dua puluh fitur dalam satu proyek memang lebih efisien daripada dua puluh proyek kecil: discovery, penyiapan, dan pengujian dilakukan sekali saja. Efisiensi itu dikembalikan sebagai potongan otomatis."
          />
          <div className="flex flex-col gap-3">
            <TableWrapper>
              <Table>
                <caption className="sr-only">Tabel diskon skala menurut jumlah fitur berbayar</caption>
                <thead>
                  <tr>
                    <Th scope="col">Jumlah fitur berbayar</Th>
                    <Th scope="col" className="text-right">
                      Potongan
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {RULE.volumeDiscountTiers.map((tier) => (
                    <Tr key={tier.label}>
                      <Td className="font-medium">{tier.label}</Td>
                      <Td className="tabular text-right font-semibold">
                        {tier.discountPct === 0 ? (
                          <span className="text-fg-muted">Tanpa potongan</span>
                        ) : (
                          <span className="text-success">
                            −{formatPercent(tier.discountPct)}
                          </span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
            <p className="text-sm leading-relaxed text-fg-muted">
              Fitur fondasi tidak ikut dihitung sebagai fitur berbayar, karena sudah termasuk dalam
              paket dasar. Potongan berlaku otomatis begitu jumlahnya terpenuhi — Anda tidak perlu
              memintanya, dan tidak ada kode promo yang harus dicari.
            </p>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------------
          Biaya setup tetap & nilai proyek minimum (BR-13, BR-14).
          -------------------------------------------------------------- */}
      <Section tone="sunken">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="flex flex-col gap-3 p-6">
            <Badge variant="neutral" size="md">
              <Wrench className="size-3.5" aria-hidden="true" />
              Tetap untuk semua proyek
            </Badge>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">
              Biaya setup &amp; onboarding {formatRupiah(RULE.setupFee)}
            </h2>
            <p className="text-[15px] leading-relaxed text-fg-muted">
              Mencakup penyiapan lingkungan kerja, pemasangan awal, migrasi data induk yang Anda
              serahkan, konfigurasi hak akses, serta sesi pendampingan pemakaian untuk tim Anda.
            </p>
            <ul className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
              {[
                'Besarnya sama untuk proyek kecil maupun besar.',
                'Tidak ikut didiskon, karena beban pekerjaannya memang tidak menyusut.',
                'Ditagihkan sekali di awal, bukan biaya berulang.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-fg-muted">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <Badge variant="warning" size="md">
              <Scale className="size-3.5" aria-hidden="true" />
              Batas yang kami hormati
            </Badge>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">
              Nilai proyek minimum {formatRupiah(RULE.minProjectValue)}
            </h2>
            <p className="text-[15px] leading-relaxed text-fg-muted">
              Kami tidak menerima proyek di bawah angka itu, dan alasannya sederhana: di bawah
              nilai tersebut, biaya discovery, pengujian, dokumentasi, dan pendampingan membuat
              porsi pekerjaan yang benar-benar sampai ke aplikasi Anda menjadi terlalu kecil.
              Hasilnya mengecewakan kedua pihak.
            </p>
            <ul className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
              {[
                'Bila rakitan Anda di bawah minimum, sistem mengatakannya langsung di layar.',
                'Kami tidak akan menambah fitur diam-diam supaya nilainya cukup.',
                'Konsultan akan menyarankan aplikasi siap pakai bila memang itu yang lebih masuk akal.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-fg-muted">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      {/* --------------------------------------------------------------
          Biaya berulang, selalu terpisah (BR-12).
          -------------------------------------------------------------- */}
      <Section>
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-12">
          <SectionHeading
            eyebrow="Biaya berulang"
            title="Biaya bulanan tidak pernah kami campur ke nilai proyek"
            description="Nilai proyek adalah belanja satu kali. Biaya berulang adalah biaya operasional yang berjalan selama aplikasi dipakai. Mencampur keduanya membuat angka terlihat lebih murah, tetapi merusak perencanaan anggaran Anda — jadi kami selalu memisahkannya."
          />
          <div className="flex flex-col gap-3">
            <TableWrapper>
              <Table>
                <caption className="sr-only">
                  Perkiraan biaya berulang bulanan menurut jumlah pengguna
                </caption>
                <thead>
                  <tr>
                    <Th scope="col">Jumlah pengguna aktif</Th>
                    <Th scope="col" className="text-right">
                      Perkiraan per bulan
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {RULE.userTierPricing.map((tier) => (
                    <Tr key={tier.tier}>
                      <Td className="font-medium">{tier.label}</Td>
                      <Td className="tabular whitespace-nowrap text-right font-semibold text-accent-strong">
                        {formatRupiahRange(tier.monthlyMin, tier.monthlyMax)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
            <p className="text-sm leading-relaxed text-fg-muted">
              Mencakup hosting, pencadangan berkala, pembaruan keamanan, dan dukungan pemakaian
              pada jam kerja. Bila aplikasi dipasang di server milik Anda sendiri, komponen hosting
              hilang dan angkanya menyesuaikan. Langganan pihak ketiga seperti payment gateway atau
              WhatsApp Business API ditagih langsung oleh penyedianya, bukan lewat kami.
            </p>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------------
          Contoh perhitungan penuh — dihitung mesin harga, bukan diketik.
          -------------------------------------------------------------- */}
      <Section tone="sunken" id="contoh">
        <SectionHeading
          eyebrow="Contoh nyata"
          title="Satu rakitan, dibongkar sampai baris terakhir"
          description="Contoh berikut adalah aplikasi gudang berukuran menengah yang diakses lewat web dan ponsel, dipasang di cloud kami. Setiap angka di bawah dihitung oleh mesin harga yang sama dengan yang berjalan di konfigurator."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
          <Card className="p-5 sm:p-6">
            <h3 className="text-base font-semibold text-fg">Isi rakitan contoh</h3>
            <dl className="mt-3 divide-y divide-border">
              <DescRow
                label="Fitur fondasi (sudah termasuk)"
                value={`${example.coreFeatureCount} fitur`}
              />
              <DescRow label="Fitur berbayar" value={`${example.paidFeatureCount} fitur`} />
              <DescRow
                label="Cara diakses"
                value={PROJECT_PLATFORM_LABEL.WEB_PWA}
              />
              <DescRow label="Tempat dipasang" value={PROJECT_DEPLOYMENT_LABEL.OUR_CLOUD} />
              <DescRow
                label="Perkiraan pengerjaan"
                value={formatWeekRange(example.duration.weeksMin, example.duration.weeksMax)}
              />
            </dl>

            <h4 className="mt-5 text-sm font-semibold text-fg">Daftar fiturnya</h4>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLE_FEATURES.map((feature) => (
                <li key={feature.id}>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken/60 px-2 py-1 text-xs text-fg-muted">
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="text-base font-semibold text-fg">Perhitungannya baris demi baris</h3>
            <dl className="mt-3 divide-y divide-border">
              <DescRow
                label="Paket dasar (fitur fondasi)"
                value={formatRupiah(example.corePackagePrice)}
              />
              <DescRow
                label="Subtotal fitur berbayar"
                value={formatRupiahRange(
                  example.featuresSubtotalMin - example.corePackagePrice,
                  example.featuresSubtotalMax - example.corePackagePrice,
                  false,
                )}
              />
              <DescRow
                label={`Pengali ${PROJECT_PLATFORM_LABEL.WEB_PWA}`}
                value={multiplierText(example.platformMultiplier)}
              />
              <DescRow
                label={`Pengali ${PROJECT_DEPLOYMENT_LABEL.OUR_CLOUD}`}
                value={multiplierText(example.deploymentMultiplier)}
              />
              <DescRow
                label="Setelah pengali"
                value={formatRupiahRange(example.multipliedMin, example.multipliedMax, false)}
              />
              <DescRow
                label={`Diskon skala (${example.discountLabel})`}
                value={
                  example.discountPct > 0 ? (
                    <span className="text-success">
                      −{formatPercent(example.discountPct)} ·{' '}
                      {formatRupiahRange(example.discountMin, example.discountMax, false)}
                    </span>
                  ) : (
                    <span className="text-fg-muted">Belum berlaku</span>
                  )
                }
              />
              <DescRow
                label="Biaya setup & onboarding (tidak didiskon)"
                value={formatRupiah(example.setupFee)}
              />
              <DescRow
                label="Nilai proyek"
                value={formatRupiahRange(
                  example.displayTotalMin,
                  example.displayTotalMax,
                  false,
                )}
                emphasis
              />
            </dl>

            <div className="mt-4 rounded-lg border border-border bg-surface-sunken/60 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-fg">
                <Repeat className="size-4 text-fg-subtle" aria-hidden="true" />
                Terpisah dari angka di atas
              </p>
              <dl className="mt-2 divide-y divide-border">
                <DescRow
                  label={`Biaya berulang (${exampleTier?.label ?? 'sesuai jumlah pengguna'})`}
                  value={`${formatRupiahRange(
                    example.recurringMonthlyMin,
                    example.recurringMonthlyMax,
                    false,
                  )} / bulan`}
                />
              </dl>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                Angka nilai proyek dibulatkan ke jutaan terdekat, sama seperti yang tampil di
                konfigurator dan di proposal.
              </p>
            </div>
          </Card>
        </div>

        <Alert
          tone="info"
          title={`Penawaran final berlaku ${RULE.quoteValidityDays} hari`}
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
          className="mt-4"
        >
          Setelah discovery call, rentang di atas berubah menjadi satu angka tetap. Angka itu
          terkunci {RULE.quoteValidityDays} hari penuh, dan perubahan tarif {site.name} setelahnya
          tidak berlaku surut terhadap penawaran yang sudah terbit.
        </Alert>
      </Section>

      <Section>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <SectionHeading
            eyebrow="FAQ harga"
            title="Pertanyaan yang biasanya muncul setelah membaca halaman ini"
          />
          <FaqList items={FAQ_ITEMS} />
        </div>
      </Section>

      <Section tone="sunken" size="sm">
        <Card className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-balance text-xl font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
              Contoh di atas bukan kasus Anda. Hitung punya Anda sendiri.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
              Pilih jenis aplikasinya, nyalakan fitur yang benar-benar Anda butuhkan, dan lihat
              rinciannya lengkap seperti tabel di halaman ini.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/#pilih-aplikasi">
                Mulai Rakit Aplikasi Anda
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/konsultasi">Tanya soal harga</Link>
            </Button>
          </div>
        </Card>
      </Section>
    </>
  );
}
