import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/marketing/legal';
import { DEFAULT_ASSUMPTIONS, DEFAULT_EXCLUSIONS, site } from '@/lib/site';
import { formatRupiah } from '@/lib/format';
import { BASELINE_PRICING_RULE } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Syarat layanan',
  description:
    'Ketentuan pemakaian situs dan layanan pembuatan aplikasi: sifat estimasi harga, masa ' +
    'berlaku penawaran, kewajiban kedua pihak, perubahan ruang lingkup, pembayaran, garansi, ' +
    'kerahasiaan, dan penyelesaian sengketa.',
  alternates: { canonical: '/syarat-layanan' },
};

const RULE = BASELINE_PRICING_RULE;

const SECTIONS: LegalSection[] = [
  {
    id: 'pihak',
    title: 'Para pihak dan ruang lingkup',
    body: [
      `Syarat ini mengatur hubungan antara ${site.legalName} (“Penyedia”) dan pihak yang ` +
        `memakai situs ${site.name} maupun jasa pembuatan aplikasi yang ditawarkan di dalamnya ` +
        '(“Klien”). Dengan memakai situs ini, Anda dianggap telah membaca dan menyetujui ' +
        'ketentuan di bawah.',
      'Ketentuan khusus dalam penawaran resmi, surat perjanjian kerja, atau adendum yang ' +
        'ditandatangani kedua pihak mengalahkan ketentuan umum di halaman ini bila keduanya ' +
        'bertentangan.',
    ],
  },
  {
    id: 'sifat-estimasi',
    title: 'Sifat estimasi harga di situs ini',
    body: [
      'Rentang harga dan perkiraan durasi yang tampil di konfigurator adalah estimasi yang ' +
        'dihitung dari fitur yang Anda pilih. Estimasi tersebut bukan penawaran yang mengikat, ' +
        'karena kami belum meninjau proses bisnis Anda.',
      'Yang mengikat adalah penawaran resmi yang kami terbitkan setelah sesi discovery. ' +
        'Penawaran resmi memuat satu nilai tetap, ruang lingkup yang terperinci, jadwal per ' +
        'milestone, asumsi, dan daftar pekerjaan yang tidak termasuk.',
    ],
  },
  {
    id: 'masa-berlaku',
    title: 'Masa berlaku dan perubahan tarif',
    bullets: [
      `Penawaran resmi berlaku ${RULE.quoteValidityDays} hari kalender sejak tanggal terbit.`,
      'Selama masa berlaku itu, perubahan tarif Penyedia tidak berlaku surut terhadap penawaran yang sudah terbit.',
      'Setelah masa berlaku lewat, penawaran dapat diterbitkan ulang dengan tarif yang berlaku saat itu.',
      'Estimasi yang tersimpan di konfigurator dapat berubah sewaktu-waktu mengikuti pembaruan katalog dan tarif, karena sifatnya memang belum mengikat.',
    ],
  },
  {
    id: 'struktur-biaya',
    title: 'Struktur biaya',
    bullets: [
      `Nilai proyek minimum yang kami terima adalah ${formatRupiah(RULE.minProjectValue)}.`,
      `Biaya setup dan onboarding sebesar ${formatRupiah(RULE.setupFee)} berlaku tetap untuk semua proyek dan tidak termasuk objek diskon.`,
      'Diskon skala berlaku otomatis menurut jumlah fitur berbayar, tanpa perlu diminta.',
      'Biaya berulang seperti hosting, pemeliharaan, dan dukungan selalu dihitung terpisah dari nilai proyek dan ditagihkan menurut siklus yang disepakati.',
      'Seluruh angka yang tercantum di situs ini adalah nilai sebelum pajak. Pajak yang berlaku ditambahkan pada dokumen penagihan.',
      'Biaya langganan pihak ketiga — misalnya payment gateway, WhatsApp Business API, atau layanan kurir — ditagih langsung oleh penyedianya kepada Klien.',
    ],
  },
  {
    id: 'kewajiban-klien',
    title: 'Kewajiban Klien',
    body: [
      'Ketepatan jadwal proyek bergantung pada kelancaran kerja sama kedua pihak. Asumsi berikut ' +
        'melekat pada setiap penawaran yang kami terbitkan.',
    ],
    bullets: DEFAULT_ASSUMPTIONS,
  },
  {
    id: 'tidak-termasuk',
    title: 'Pekerjaan yang tidak termasuk',
    body: [
      'Kecuali dinyatakan lain secara tertulis dalam penawaran, pekerjaan berikut berada di luar ' +
        'ruang lingkup dan akan dihitung terpisah bila Klien menghendakinya.',
    ],
    bullets: DEFAULT_EXCLUSIONS,
  },
  {
    id: 'perubahan-scope',
    title: 'Perubahan ruang lingkup',
    bullets: [
      'Setiap penambahan atau perubahan fitur di luar penawaran dituangkan sebagai adendum tertulis sebelum dikerjakan, lengkap dengan dampak biaya dan jadwalnya.',
      'Penambahan dihitung memakai tarif yang sama dengan penawaran berjalan, bukan tarif khusus di tengah proyek.',
      'Setiap milestone mencakup maksimal dua putaran revisi. Revisi ketiga dan seterusnya dihitung sebagai perubahan ruang lingkup.',
      'Klien berhak menolak adendum; dalam hal itu pekerjaan berjalan sesuai ruang lingkup semula.',
    ],
  },
  {
    id: 'jadwal',
    title: 'Jadwal dan keterlambatan',
    body: [
      'Jadwal dihitung sejak seluruh prasyarat awal terpenuhi: uang muka diterima, data master ' +
        'diserahkan, dan akses yang dibutuhkan diberikan.',
      'Bila keterlambatan disebabkan oleh Penyedia, kami menyampaikan jadwal baru beserta ' +
        'alasannya secepat kami mengetahuinya, bukan di hari tenggat. Bila keterlambatan ' +
        'disebabkan oleh tertundanya umpan balik, data, atau akses dari Klien, tenggat bergeser ' +
        'selama masa tunggu tersebut.',
    ],
  },
  {
    id: 'pembayaran',
    title: 'Pembayaran',
    bullets: [
      'Pembayaran dilakukan bertahap mengikuti milestone yang disepakati pada penawaran resmi.',
      'Dokumen penagihan diterbitkan pada setiap tahap dan jatuh tempo 14 hari kalender sejak diterbitkan, kecuali disepakati lain.',
      'Keterlambatan pembayaran lebih dari 30 hari kalender dapat menyebabkan pekerjaan dihentikan sementara sampai kewajiban diselesaikan.',
      'Pembayaran yang sudah diterima untuk pekerjaan yang telah diselesaikan tidak dapat dikembalikan.',
    ],
  },
  {
    id: 'serah-terima',
    title: 'Serah terima dan garansi',
    bullets: [
      'Serah terima dinyatakan melalui berita acara yang ditandatangani kedua pihak.',
      'Bila Klien tidak menyampaikan keberatan tertulis dalam 7 hari kerja setelah penyerahan sebuah milestone, milestone tersebut dianggap diterima.',
      'Garansi perbaikan bug berlaku 60 hari kalender sejak serah terima akhir, tanpa biaya tambahan.',
      'Garansi mencakup perbaikan ketidaksesuaian terhadap ruang lingkup yang disepakati. Permintaan fitur baru, perubahan proses bisnis, dan gangguan yang berasal dari layanan pihak ketiga berada di luar cakupan garansi.',
      'Setelah masa garansi berakhir, dukungan berlanjut lewat paket pemeliharaan bila Klien memilihnya.',
    ],
  },
  {
    id: 'kekayaan-intelektual',
    title: 'Hak kekayaan intelektual dan kepemilikan data',
    bullets: [
      'Seluruh data operasional yang dimasukkan ke dalam aplikasi adalah milik Klien sepenuhnya dan dapat diekspor kapan saja.',
      'Hak pakai aplikasi yang dibangun diserahkan kepada Klien setelah seluruh kewajiban pembayaran dipenuhi.',
      'Komponen, pustaka, dan modul dasar yang telah kami bangun sebelumnya tetap menjadi milik Penyedia dan diberikan kepada Klien dalam bentuk lisensi pakai yang tidak dapat dialihkan.',
      'Skema penyerahan kode sumber, bila dikehendaki, disepakati tersendiri di dalam perjanjian karena berbeda untuk setiap skema pemasangan.',
      'Penyedia dapat menyebut nama dan logo Klien sebagai referensi hanya setelah memperoleh persetujuan tertulis Klien.',
    ],
  },
  {
    id: 'kerahasiaan',
    title: 'Kerahasiaan',
    body: [
      'Kedua pihak wajib menjaga kerahasiaan informasi bisnis yang diperoleh selama kerja sama, ' +
        'termasuk data pelanggan, struktur harga, dan proses internal. Kewajiban ini tetap ' +
        'berlaku 3 tahun setelah perjanjian berakhir.',
      'Kewajiban kerahasiaan tidak berlaku atas informasi yang sudah menjadi pengetahuan umum ' +
        'tanpa pelanggaran, atau yang wajib diungkapkan berdasarkan perintah instansi berwenang.',
    ],
  },
  {
    id: 'pemakaian-situs',
    title: 'Pemakaian situs secara wajar',
    bullets: [
      'Dilarang mengambil data situs secara otomatis dalam jumlah besar, membebani sistem secara sengaja, atau berusaha mengakses bagian yang bukan hak Anda.',
      'Tautan rakitan bersifat pribadi. Siapa pun yang memegang tautannya dapat melihat isinya, jadi bagikan hanya kepada pihak yang Anda percaya.',
      'Kami berhak membatasi akses dari perangkat yang terbukti menyalahgunakan layanan.',
    ],
  },
  {
    id: 'tanggung-jawab',
    title: 'Batasan tanggung jawab',
    body: [
      'Estimasi di situs ini disediakan apa adanya untuk membantu Anda merencanakan anggaran. ' +
        'Penyedia tidak bertanggung jawab atas keputusan bisnis yang diambil semata-mata ' +
        'berdasarkan estimasi tersebut tanpa melalui sesi discovery.',
      'Untuk proyek yang berjalan, tanggung jawab Penyedia atas kerugian yang timbul dibatasi ' +
        'setinggi-tingginya sebesar nilai pembayaran yang telah diterima untuk proyek yang ' +
        'bersangkutan. Penyedia tidak bertanggung jawab atas kerugian tidak langsung seperti ' +
        'kehilangan keuntungan atau peluang usaha.',
      'Pembatasan ini tidak berlaku dalam hal kesengajaan atau kelalaian berat Penyedia.',
    ],
  },
  {
    id: 'keadaan-kahar',
    title: 'Keadaan kahar',
    body: [
      'Kedua pihak dibebaskan dari tanggung jawab atas keterlambatan yang disebabkan keadaan di ' +
        'luar kendali yang wajar, seperti bencana alam, gangguan jaringan berskala nasional, ' +
        'kebijakan pemerintah, atau keadaan darurat kesehatan. Pihak yang terdampak wajib ' +
        'memberi tahu pihak lain paling lambat 7 hari kalender sejak keadaan tersebut terjadi.',
    ],
  },
  {
    id: 'pengakhiran',
    title: 'Pengakhiran',
    bullets: [
      'Kedua pihak dapat mengakhiri perjanjian dengan pemberitahuan tertulis 30 hari kalender sebelumnya.',
      'Pekerjaan yang sudah diselesaikan sampai tanggal pengakhiran tetap wajib dibayar secara proporsional.',
      'Data dan berkas milik Klien diserahkan kembali dalam format yang dapat dibaca paling lambat 30 hari kalender sejak pengakhiran.',
    ],
  },
  {
    id: 'hukum',
    title: 'Hukum yang berlaku dan penyelesaian sengketa',
    body: [
      'Syarat ini tunduk pada hukum Negara Republik Indonesia.',
      'Bila timbul perselisihan, kedua pihak sepakat mengutamakan penyelesaian secara musyawarah ' +
        'dalam waktu 30 hari kalender. Bila musyawarah tidak mencapai kesepakatan, perselisihan ' +
        'diselesaikan melalui Pengadilan Negeri Jakarta Selatan, kecuali disepakati forum lain ' +
        'dalam perjanjian tersendiri.',
    ],
  },
  {
    id: 'perubahan-syarat',
    title: 'Perubahan syarat',
    body: [
      <>
        Kami dapat memperbarui halaman ini sewaktu-waktu. Perubahan yang bersifat material
        diberitahukan kepada Klien aktif paling lambat 14 hari sebelum berlaku, dan tidak
        memengaruhi perjanjian yang sudah berjalan. Pertanyaan mengenai ketentuan ini dapat Anda
        ajukan lewat{' '}
        <Link
          href="/konsultasi"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          halaman konsultasi
        </Link>
        .
      </>,
    ],
  },
];

export default function SyaratLayananPage() {
  return (
    <LegalDocument
      title="Syarat Layanan"
      summary="Ringkasnya: angka di konfigurator adalah estimasi jujur, penawaran resmi yang mengikat terbit setelah sesi discovery dan berlaku 30 hari, dan setiap perubahan ruang lingkup selalu disepakati tertulis sebelum dikerjakan."
      updatedAt="1 Agustus 2026"
      sections={SECTIONS}
    />
  );
}
