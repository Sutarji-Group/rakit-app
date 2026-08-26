import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Headphones,
  LayoutGrid,
  LockKeyhole,
  MessageSquareText,
  Rocket,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Alert, Badge, Button, Card } from '@/components/ui';
import { Section, SectionHeading } from '@/components/marketing/section';
import { DEFAULT_ASSUMPTIONS, DEFAULT_EXCLUSIONS, site } from '@/lib/site';
import { formatRupiah } from '@/lib/format';
import { BASELINE_PRICING_RULE } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Cara kerja',
  description:
    'Alur lengkap dari memilih kategori aplikasi sampai serah terima: merakit fitur, ' +
    'antrean estimasi fitur custom 1x24 jam kerja, discovery call, harga terkunci 30 hari, ' +
    'dan portal klien selama pengerjaan.',
  alternates: { canonical: '/cara-kerja' },
};

/** Enam tahap dari kunjungan pertama sampai aplikasi diserahterimakan. */
const STAGES = [
  {
    number: 1,
    icon: LayoutGrid,
    title: 'Pilih jenis aplikasi',
    duration: 'Sekitar 1 menit',
    body:
      'Mulai dari katalog yang paling mendekati usaha Anda — gudang, penjualan, kasir, atau ' +
      'lainnya. Bila belum ada yang mirip, jalur konsultasi selalu terbuka dan tidak dipungut biaya.',
    detail: [
      'Setiap katalog menampilkan jumlah fitur dan rentang harga yang umum terjadi.',
      'Ada beberapa pertanyaan pembuka singkat untuk menandai fitur yang biasanya Anda butuhkan.',
      'Jawaban itu hanya saran awal — semuanya masih bisa Anda ubah.',
    ],
  },
  {
    number: 2,
    icon: ClipboardList,
    title: 'Rakit fiturnya sendiri',
    duration: '10 – 20 menit',
    body:
      'Nyalakan fitur yang Anda perlukan, matikan yang tidak. Estimasi biaya dan lama pengerjaan ' +
      'bergerak seketika di layar, jadi Anda langsung tahu apa yang membuat angka naik.',
    detail: [
      'Fitur fondasi otomatis ikut dan tidak dapat dilepas — tanpanya aplikasi tidak berjalan.',
      'Bila sebuah fitur membutuhkan fitur lain, prasyaratnya ikut ditambahkan beserta alasannya.',
      'Keranjang yang mustahil dibangun memang sengaja tidak bisa Anda buat.',
      'Hasil rakitan tersimpan lewat tautan pribadi; boleh ditutup dan dilanjutkan lain hari.',
    ],
  },
  {
    number: 3,
    icon: MessageSquareText,
    title: 'Tambahkan fitur yang belum ada di daftar',
    duration: 'Dijawab maksimal 1x24 jam kerja',
    body:
      'Punya proses khas yang tidak ada di katalog? Tuliskan dengan bahasa Anda sendiri. ' +
      'Permintaan itu masuk antrean review tim kami dan tidak pernah ikut dihitung ke total ' +
      'sebelum ada manusia yang mengestimasinya.',
    detail: [
      'Maksimal lima fitur custom per rakitan — di atas itu kebutuhan Anda lebih tepat dibahas langsung.',
      'Tim mengestimasi effort dan mengembalikan rentang harganya, lengkap dengan catatan asumsinya.',
      'Bila permintaan itu ternyata umum, kami masukkan ke katalog agar klien berikutnya melihat harganya di depan.',
      'Selama menunggu, angka di layar Anda tetap menampilkan total tanpa fitur custom, bukan angka karangan.',
    ],
  },
  {
    number: 4,
    icon: FileText,
    title: 'Ambil ringkasan dan proposal',
    duration: 'Langsung, tanpa menunggu',
    body:
      'Ringkasan memuat daftar fitur, rentang biaya, perkiraan jadwal, asumsi, dan daftar hal yang ' +
      'tidak termasuk. Proposal PDF bisa Anda unduh sendiri untuk dibawa ke rapat internal.',
    detail: [
      'Isi proposal sama persis dengan yang Anda lihat di layar — tidak ada versi lain untuk internal.',
      'Tautan rakitan dapat dibagikan ke rekan atau atasan tanpa mereka perlu membuat akun.',
      'Biaya berulang seperti hosting dan dukungan dicantumkan terpisah dari nilai proyek.',
    ],
  },
  {
    number: 5,
    icon: Headphones,
    title: 'Discovery call 30 menit',
    duration: 'Dijadwalkan dalam 2 hari kerja',
    body:
      'Konsultan menelusuri proses kerja Anda: berapa lokasi, siapa yang memakai, dokumen apa yang ' +
      'harus keluar, sistem apa yang sudah ada. Dari situ rentang menyempit menjadi satu harga tetap.',
    detail: [
      'Sesi ini gratis dan tidak mengikat, boleh lewat video call atau kunjungan bila lokasinya memungkinkan.',
      'Bila ternyata kebutuhan Anda lebih murah diselesaikan dengan aplikasi siap pakai, kami katakan apa adanya.',
      'Hasil sesi dituangkan sebagai catatan tertulis, bukan kesepakatan lisan.',
    ],
  },
  {
    number: 6,
    icon: Rocket,
    title: 'Harga terkunci, pengerjaan dimulai',
    duration: 'Penawaran berlaku 30 hari',
    body:
      'Penawaran final berisi satu angka tetap, jadwal per milestone, dan klausul perubahan scope. ' +
      'Setelah disetujui, Anda mendapat portal klien untuk memantau kemajuan tanpa perlu menagih kabar.',
    detail: [
      'Harga terkunci 30 hari sejak penawaran terbit; perubahan tarif kami tidak berlaku surut untuk Anda.',
      'Portal klien menampilkan milestone, persentase penyelesaian, dan berkas serah terima.',
      'Umpan balik Anda per milestone diminta maksimal tiga hari kerja agar jadwal tetap terjaga.',
      'Garansi perbaikan bug 60 hari berjalan setelah serah terima.',
    ],
  },
];

/** Perbandingan jujur dengan cara kerja vendor pada umumnya. */
const COMPARISON = [
  {
    them: 'Isi formulir dulu, harga menyusul lewat telepon',
    us: 'Harga muncul di layar sebelum Anda memberi nomor telepon',
  },
  {
    them: 'Paket A, B, C yang isinya tidak persis kebutuhan Anda',
    us: 'Anda menyalakan dan mematikan fitur satu per satu',
  },
  {
    them: 'Biaya bulanan baru terlihat di halaman terakhir kontrak',
    us: 'Biaya berulang selalu ditampilkan terpisah sejak awal',
  },
  {
    them: 'Perubahan scope jadi bahan tarik-ulur di tengah proyek',
    us: 'Daftar “yang tidak termasuk” disepakati sebelum kerja dimulai',
  },
];

export default function CaraKerjaPage() {
  return (
    <>
      <Section size="lg" className="border-b border-border">
        <SectionHeading
          as="h1"
          eyebrow="Cara kerja"
          title="Dari penasaran sampai aplikasi diserahterimakan, tanpa tahap yang disembunyikan"
          description="Halaman ini memuat seluruh alurnya apa adanya — termasuk berapa lama Anda menunggu di setiap tahap, dan apa yang terjadi setelah rakitan Anda dikirim."
        />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/#pilih-aplikasi">
              Mulai Rakit Aplikasi Anda
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/harga">Lihat struktur harganya</Link>
          </Button>
        </div>
      </Section>

      {/* Enam tahap, ditulis berurutan supaya bisa dibaca dari atas ke bawah
          di layar ponsel tanpa perlu melompat-lompat. */}
      <Section>
        <ol className="flex flex-col gap-4">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <li key={stage.number}>
                <Card className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                    <div className="flex items-center gap-3 sm:w-44 sm:shrink-0 sm:flex-col sm:items-start">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg"
                        aria-hidden="true"
                      >
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="tabular text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
                          Tahap {stage.number}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-muted">
                          <Timer className="size-3.5 shrink-0" aria-hidden="true" />
                          {stage.duration}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold tracking-[-0.02em] text-fg">
                        {stage.title}
                      </h2>
                      <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{stage.body}</p>
                      <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                        {stage.detail.map((line) => (
                          <li key={line} className="flex items-start gap-2 text-sm text-fg-muted">
                            <span
                              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand"
                              aria-hidden="true"
                            />
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Apa yang terjadi persis setelah konfigurasi dikirim — bagian yang
          paling sering ditanyakan dan paling jarang dijawab vendor. */}
      <Section tone="sunken">
        <SectionHeading
          eyebrow="Setelah rakitan dikirim"
          title="Tiga hal yang langsung berjalan begitu Anda menekan kirim"
          description="Anda tidak masuk ke ruang tunggu tanpa kepastian. Setiap tahap punya batas waktu yang bisa Anda tagih."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="flex h-full flex-col gap-3 p-5">
            <Badge variant="warning" size="md">
              <Timer className="size-3.5" aria-hidden="true" />
              1x24 jam kerja
            </Badge>
            <h3 className="text-base font-semibold text-fg">Antrean review fitur custom</h3>
            <p className="text-sm leading-relaxed text-fg-muted">
              Setiap permintaan fitur di luar katalog masuk antrean dengan penghitung waktu.
              Solution consultant kami wajib mengembalikan estimasi effort dan rentang harganya
              paling lambat satu hari kerja. Bila kebutuhannya terlalu besar untuk diestimasi dari
              tulisan saja, kami katakan begitu dan mengangkatnya ke sesi konsultasi.
            </p>
          </Card>

          <Card className="flex h-full flex-col gap-3 p-5">
            <Badge variant="brand" size="md">
              <Headphones className="size-3.5" aria-hidden="true" />
              30 menit
            </Badge>
            <h3 className="text-base font-semibold text-fg">Discovery call</h3>
            <p className="text-sm leading-relaxed text-fg-muted">
              Dijadwalkan dalam dua hari kerja. Isinya menelusuri proses kerja Anda sedetail
              mungkin, karena di situlah letak selisih antara batas bawah dan batas atas rentang.
              Sesi ini gratis dan tidak mewajibkan Anda melanjutkan.
            </p>
          </Card>

          <Card className="flex h-full flex-col gap-3 p-5">
            <Badge variant="success" size="md">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
              Berlaku 30 hari
            </Badge>
            <h3 className="text-base font-semibold text-fg">Harga terkunci</h3>
            <p className="text-sm leading-relaxed text-fg-muted">
              Rentang berubah menjadi satu angka tetap yang berlaku 30 hari penuh. Selama masa itu
              Anda bebas membawanya ke rapat internal tanpa khawatir angkanya bergeser — termasuk
              bila tarif kami berubah, karena perubahan tarif tidak berlaku surut.
            </p>
          </Card>
        </div>

        <Alert
          tone="brand"
          title="Nilai proyek minimum kami terbuka sejak awal"
          icon={<ShieldCheck className="size-4" aria-hidden="true" />}
          className="mt-4"
        >
          Kami tidak menerima proyek di bawah{' '}
          {formatRupiah(BASELINE_PRICING_RULE.minProjectValue)} karena di bawah angka itu biaya
          discovery, pengujian, dan pendampingan membuat hasilnya mengecewakan kedua pihak. Bila
          rakitan Anda berada di bawahnya, kami menyarankan alternatif yang lebih masuk akal, bukan
          diam-diam menambah fitur agar cukup.
        </Alert>
      </Section>

      {/* Perbandingan dengan cara kerja yang lazim. */}
      <Section>
        <SectionHeading
          eyebrow="Bedanya di mana"
          title="Kebiasaan lama yang sengaja kami tinggalkan"
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-subtle">
              Cara yang biasa Anda temui
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {COMPARISON.map((row) => (
                <li key={row.them} className="text-sm leading-relaxed text-fg-muted">
                  {row.them}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-brand/25 bg-brand-soft p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-soft-fg">
              Cara kerja {site.name}
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {COMPARISON.map((row) => (
                <li key={row.us} className="text-sm font-medium leading-relaxed text-brand-soft-fg">
                  {row.us}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      {/* Asumsi & pengecualian — pencegah sengketa scope paling murah (F2). */}
      <Section tone="sunken">
        <SectionHeading
          eyebrow="Batas pekerjaan"
          title="Apa yang kami asumsikan, dan apa yang tidak termasuk"
          description="Daftar ini tercantum di setiap penawaran. Kami menaruhnya juga di sini supaya Anda sudah membacanya sebelum bicara dengan siapa pun."
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-base font-semibold text-fg">Asumsi standar</h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {DEFAULT_ASSUMPTIONS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-fg-muted">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="text-base font-semibold text-fg">Yang tidak termasuk</h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {DEFAULT_EXCLUSIONS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-fg-muted">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-strong"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section size="sm">
        <Card className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-balance text-xl font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
              Sudah paham alurnya. Sekarang lihat angkanya.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
              Merakit tidak mengikat apa pun dan tidak memerlukan akun. Anda baru bertemu manusia
              kalau memang menginginkannya.
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
              <Link href="/konsultasi">Tanya dulu ke konsultan</Link>
            </Button>
          </div>
        </Card>
      </Section>
    </>
  );
}
