import Link from 'next/link';
import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/marketing/legal';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Kebijakan privasi',
  description:
    'Bagaimana kami mengumpulkan, memakai, menyimpan, dan menghapus data pribadi Anda, ' +
    'serta cara menggunakan hak Anda sebagai subjek data menurut UU Perlindungan Data Pribadi.',
  alternates: { canonical: '/kebijakan-privasi' },
};

const SECTIONS: LegalSection[] = [
  {
    id: 'pengendali',
    title: 'Siapa yang bertanggung jawab atas data Anda',
    body: [
      `${site.legalName} (“kami”) bertindak sebagai Pengendali Data Pribadi atas seluruh data ` +
        `yang Anda serahkan melalui situs ${site.name}, formulir konsultasi, hasil rakitan ` +
        'konfigurator, maupun komunikasi selama proyek berjalan.',
      `Alamat kami: ${site.address}. Pertanyaan, permintaan, maupun keberatan terkait data ` +
        `pribadi dapat dikirim ke ${site.email} dengan subjek “Data Pribadi”, atau melalui ` +
        `nomor ${site.phone} pada jam kerja.`,
    ],
  },
  {
    id: 'data-yang-dikumpulkan',
    title: 'Data apa saja yang kami kumpulkan',
    body: [
      'Kami hanya mengumpulkan data yang benar-benar dibutuhkan untuk menyiapkan penawaran dan ' +
        'menjalankan proyek. Merakit dan melihat estimasi harga tidak memerlukan data pribadi ' +
        'apa pun.',
    ],
    bullets: [
      'Data identitas dan kontak: nama, nama perusahaan, jabatan, alamat email, dan nomor WhatsApp — hanya bila Anda mengisinya sendiri di formulir konsultasi atau pengiriman konfigurasi.',
      'Data kebutuhan bisnis: isi rakitan fitur, jawaban pertanyaan pembuka, catatan permintaan fitur custom, serta cerita proses kerja yang Anda tuliskan.',
      'Data proyek: dokumen, data master, dan berkas yang Anda serahkan selama pengerjaan, termasuk data yang mungkin memuat data pribadi pihak ketiga (misalnya daftar pelanggan Anda).',
      'Data teknis dan penggunaan: alamat IP yang dipersingkat, jenis perangkat dan peramban, halaman yang dibuka, serta peristiwa penggunaan konfigurator seperti fitur yang ditambahkan atau dilepas.',
      'Data transaksi: informasi penagihan, nomor pesanan, dan riwayat pembayaran bila Anda menjadi klien.',
    ],
  },
  {
    id: 'dasar-pemrosesan',
    title: 'Dasar hukum pemrosesan',
    body: [
      'Setiap pemrosesan yang kami lakukan berpijak pada salah satu dasar berikut, sesuai ' +
        'Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
    ],
    bullets: [
      'Pelaksanaan perjanjian: memproses permintaan konsultasi, menerbitkan penawaran, dan menjalankan proyek yang telah disepakati.',
      'Persetujuan yang sah dan eksplisit: pengiriman materi pemasaran, undangan acara, dan kabar produk. Persetujuan ini terpisah dari persetujuan lain, tidak pernah dicentang otomatis, dan dapat ditarik kapan saja.',
      'Kewajiban hukum: penyimpanan dokumen keuangan dan perpajakan sesuai ketentuan yang berlaku.',
      'Kepentingan yang sah: menjaga keamanan sistem, mencegah penyalahgunaan, serta menganalisis penggunaan situs dalam bentuk agregat untuk memperbaiki produk.',
    ],
  },
  {
    id: 'pemasaran',
    title: 'Persetujuan untuk komunikasi pemasaran',
    body: [
      'Kami tidak akan mengirimi Anda materi promosi hanya karena Anda pernah mengisi formulir ' +
        'konsultasi. Komunikasi pemasaran hanya dikirim bila Anda memberikan persetujuan ' +
        'eksplisit lewat pilihan tersendiri yang harus Anda centang sendiri.',
      'Penarikan persetujuan dapat dilakukan kapan saja melalui tautan berhenti berlangganan di ' +
        `setiap email, atau dengan mengirim permintaan ke ${site.email}. Penarikan diproses ` +
        'paling lambat 3 hari kerja dan tidak memengaruhi keabsahan pemrosesan sebelum ' +
        'persetujuan ditarik, juga tidak menghentikan komunikasi yang berkaitan dengan proyek ' +
        'yang sedang berjalan.',
    ],
  },
  {
    id: 'tujuan',
    title: 'Untuk apa data Anda dipakai',
    bullets: [
      'Menyiapkan estimasi, penawaran, dan proposal sesuai kebutuhan yang Anda sampaikan.',
      'Menghubungi Anda untuk menjadwalkan sesi konsultasi dan menindaklanjuti permintaan.',
      'Mengestimasi permintaan fitur custom serta memperbaiki katalog fitur kami.',
      'Menjalankan, memantau, dan menyerahterimakan proyek yang disepakati.',
      'Menerbitkan dokumen penagihan dan memenuhi kewajiban perpajakan.',
      'Mengukur efektivitas situs secara agregat — kami tidak menjual data Anda kepada siapa pun, dalam bentuk apa pun.',
    ],
  },
  {
    id: 'retensi',
    title: 'Berapa lama data disimpan',
    body: [
      'Kami menetapkan batas waktu yang tegas, bukan menyimpan data selamanya “untuk berjaga-jaga”.',
    ],
    bullets: [
      'Rakitan konfigurator anonim yang tidak pernah dikirim: 12 bulan sejak aktivitas terakhir, lalu dihapus otomatis.',
      'Permintaan konsultasi dan prospek yang tidak berlanjut menjadi proyek: 24 bulan sejak kontak terakhir.',
      'Data klien aktif: selama masa perjanjian berjalan.',
      'Dokumen keuangan, kontrak, dan bukti perpajakan: 10 tahun sejak berakhirnya perjanjian, sesuai kewajiban penyimpanan dokumen perusahaan.',
      'Data teknis dan catatan peristiwa penggunaan: 14 bulan, setelah itu hanya tersisa ringkasan agregat yang tidak dapat dikaitkan dengan orang tertentu.',
      'Catatan log keamanan: 12 bulan.',
      'Berkas dan data master proyek: dikembalikan atau dihapus paling lambat 90 hari setelah serah terima, kecuali Anda meminta kami menyimpannya untuk keperluan pemeliharaan.',
    ],
  },
  {
    id: 'berbagi',
    title: 'Kepada siapa data dapat dibagikan',
    body: [
      'Kami membagikan data hanya kepada pihak yang memang diperlukan untuk menjalankan layanan, ' +
        'dan setiap pihak terikat perjanjian kerahasiaan serta kewajiban perlindungan data yang setara.',
    ],
    bullets: [
      'Penyedia infrastruktur dan penyimpanan data tempat aplikasi dan cadangan data dijalankan.',
      'Penyedia layanan email, pesan singkat, dan telepon yang kami pakai untuk menghubungi Anda.',
      'Konsultan, akuntan, dan penasihat hukum kami, terbatas pada data yang relevan.',
      'Aparat penegak hukum atau instansi berwenang, hanya bila ada dasar hukum yang sah dan permintaan tertulis.',
    ],
  },
  {
    id: 'transfer',
    title: 'Pengiriman data ke luar wilayah Indonesia',
    body: [
      'Sebagian penyedia layanan kami mengoperasikan pusat data di luar Indonesia. Bila data ' +
        'Anda diproses di luar wilayah Indonesia, kami memastikan negara tujuan memiliki ' +
        'tingkat pelindungan yang setara, atau menggunakan klausul kontraktual perlindungan ' +
        'data yang mengikat penyedia tersebut. Untuk skema pemasangan on-premise, data ' +
        'operasional Anda tidak pernah keluar dari jaringan Anda sendiri.',
    ],
  },
  {
    id: 'hak-anda',
    title: 'Hak Anda sebagai subjek data',
    body: [
      'Undang-Undang Pelindungan Data Pribadi memberi Anda hak-hak berikut, dan kami wajib ' +
        'melayaninya tanpa memungut biaya.',
    ],
    bullets: [
      'Mendapatkan informasi yang jelas tentang data apa yang kami proses dan untuk tujuan apa.',
      'Mengakses dan memperoleh salinan data pribadi Anda dalam format yang dapat dibaca mesin.',
      'Memperbaiki data yang keliru atau melengkapi data yang tidak lengkap.',
      'Menghapus atau memusnahkan data pribadi Anda, sepanjang tidak bertentangan dengan kewajiban hukum yang masih berjalan.',
      'Menarik persetujuan yang pernah Anda berikan, kapan saja.',
      'Menunda atau membatasi pemrosesan data pribadi Anda.',
      'Mengajukan keberatan atas pengambilan keputusan yang sepenuhnya otomatis. Perhitungan harga di situs ini bersifat estimasi dan tidak pernah menghasilkan keputusan yang berdampak hukum terhadap Anda tanpa peninjauan manusia.',
      'Menuntut ganti rugi atas pelanggaran pemrosesan data pribadi sesuai ketentuan yang berlaku.',
    ],
  },
  {
    id: 'cara-menggunakan-hak',
    title: 'Cara menggunakan hak Anda',
    body: [
      `Kirim permintaan ke ${site.email} dari alamat email yang Anda daftarkan, atau lewat ` +
        'nomor kontak resmi kami. Kami dapat meminta satu bukti identitas tambahan bila ' +
        'permintaan berpotensi memengaruhi data orang lain.',
      'Permintaan kami tanggapi paling lambat 3 x 24 jam sejak diterima, dan diselesaikan paling ' +
        'lambat 14 hari kerja. Bila permintaan Anda kami tolak sebagian atau seluruhnya, kami ' +
        'menyampaikan alasannya secara tertulis.',
    ],
  },
  {
    id: 'keamanan',
    title: 'Keamanan data',
    bullets: [
      'Seluruh lalu lintas situs dan aplikasi dienkripsi dengan HTTPS.',
      'Akses internal dibatasi menurut peran, dan setiap akses ke data klien tercatat.',
      'Kata sandi disimpan dalam bentuk hash, tidak pernah dalam bentuk aslinya.',
      'Cadangan data dienkripsi dan diuji pemulihannya secara berkala.',
      'Bila terjadi kegagalan pelindungan data pribadi, kami memberi tahu Anda dan lembaga berwenang paling lambat 3 x 24 jam sejak kami mengetahuinya, disertai penjelasan dampak dan langkah penanganannya.',
    ],
  },
  {
    id: 'cookie',
    title: 'Cookie dan pengukuran penggunaan',
    body: [
      'Kami memakai penyimpanan lokal peramban untuk mengingat rakitan Anda dan satu penanda ' +
        'sesi acak untuk pengukuran penggunaan. Penanda itu tidak memuat nama, email, maupun ' +
        'nomor telepon Anda, dan tidak dipakai untuk mengikuti Anda ke situs lain. Kami tidak ' +
        'memasang piksel pelacak pihak ketiga untuk iklan.',
      'Anda dapat menghapus penyimpanan lokal kapan saja melalui pengaturan peramban. Setelah ' +
        'dihapus, rakitan yang belum Anda simpan lewat tautan pribadi tidak dapat dipulihkan.',
    ],
  },
  {
    id: 'anak',
    title: 'Data anak',
    body: [
      'Layanan kami ditujukan untuk keperluan bisnis dan tidak diperuntukkan bagi anak di bawah ' +
        'umur. Kami tidak dengan sengaja mengumpulkan data pribadi anak. Bila data semacam itu ' +
        'terlanjur masuk, kami menghapusnya begitu mengetahuinya.',
    ],
  },
  {
    id: 'perubahan',
    title: 'Perubahan kebijakan ini',
    body: [
      'Bila kebijakan ini berubah secara material, kami memberi tahu melalui email kepada klien ' +
        'aktif dan menampilkan pemberitahuan di situs paling lambat 14 hari sebelum perubahan ' +
        'berlaku. Versi yang sedang berlaku selalu tercantum tanggalnya di bagian atas halaman ini.',
    ],
  },
  {
    id: 'pengaduan',
    title: 'Pengaduan',
    body: [
      <>
        Bila Anda menilai penanganan data pribadi Anda tidak sesuai kebijakan ini, sampaikan
        keberatan lebih dulu kepada kami melalui{' '}
        <Link
          href="/konsultasi"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          kanal kontak resmi
        </Link>
        . Bila penyelesaian kami belum memuaskan, Anda berhak mengajukan pengaduan kepada lembaga
        yang berwenang di bidang pelindungan data pribadi.
      </>,
    ],
  },
];

export default function KebijakanPrivasiPage() {
  return (
    <LegalDocument
      title="Kebijakan Privasi"
      summary="Ringkasnya: merakit dan melihat harga tidak memerlukan data pribadi apa pun. Data baru kami minta ketika Anda sendiri yang ingin dihubungi, dipakai hanya untuk keperluan yang Anda setujui, dan disimpan dengan batas waktu yang jelas."
      updatedAt="1 Agustus 2026"
      sections={SECTIONS}
    />
  );
}
