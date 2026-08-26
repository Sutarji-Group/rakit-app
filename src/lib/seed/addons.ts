import type { AddOnKind } from '@/lib/domain/enums';

/**
 * Daftar ADD-ON tingkat proyek (PRD 6.5).
 *
 * Add-on berbeda dari fitur katalog: ia tidak dirakit per kategori aplikasi,
 * melainkan dipilih sekali untuk satu proyek — integrasi ke sistem pihak
 * ketiga, migrasi data lama, pelatihan tim, dan maintenance setelah live.
 *
 * Catatan harga:
 *  - priceMin/priceMax adalah harga jual ke klien dalam rupiah (angka bulat).
 *  - manDayMin/manDayMax adalah EFFORT RIIL tim, dipakai mesin harga untuk
 *    memproyeksikan COGS. Ini berbeda dari man-day referensi pada fitur.
 *  - Add-on dengan isRecurring = true tidak pernah dicampur ke nilai proyek
 *    (BR-12); harganya per BULAN dan selalu ditampilkan terpisah.
 *  - optionGroup menandai kelompok pilihan tunggal: klien hanya boleh memilih
 *    satu add-on dari grup yang sama (mis. satu tingkat migrasi saja).
 *  - categorySlugs kosong/absen berarti add-on berlaku untuk semua kategori.
 */
export interface SeedAddOn {
  slug: string;
  kind: AddOnKind;
  name: string;
  /** 1–2 kalimat bahasa awam: apa yang klien dapat, bukan apa yang kami kerjakan. */
  description: string;
  /** Nama ikon lucide-react. */
  icon: string;
  priceMin: number;
  priceMax: number;
  /** Effort riil tim (man-day) untuk proyeksi COGS. */
  manDayMin: number;
  manDayMax: number;
  /** true bila harga bersifat bulanan dan berulang. */
  isRecurring: boolean;
  /** Nama kelompok pilihan tunggal, mis. "migrasi", "pelatihan", "maintenance". */
  optionGroup?: string;
  sortOrder?: number;
  /** Batasi ke kategori tertentu. Kosong/absen = berlaku untuk semua kategori. */
  categorySlugs?: string[];
}

export const ADDONS: SeedAddOn[] = [
  // -------------------------------------------------------------------------
  // 1. INTEGRASI PIHAK KETIGA
  //    Harga jual Rp 8–35 juta, effort riil 3–12 man-day. Setiap integrasi
  //    punya rentang sendiri karena kerumitan API dan proses ujinya berbeda.
  // -------------------------------------------------------------------------
  {
    slug: 'integrasi-accurate-online',
    kind: 'INTEGRATION',
    name: 'Integrasi Accurate Online',
    description:
      'Setiap penjualan, pembelian, dan penyesuaian stok otomatis tercatat sebagai jurnal di Accurate Online, jadi tim finance tidak menginput ulang dokumen yang sama. Master pelanggan dan barang tetap sinkron di kedua sisi sehingga laporan keuangan tidak lagi tertinggal seminggu dari operasional.',
    icon: 'Calculator',
    priceMin: 14_000_000,
    priceMax: 22_000_000,
    manDayMin: 5,
    manDayMax: 8,
    isRecurring: false,
    sortOrder: 10,
  },
  {
    slug: 'integrasi-jurnal-id',
    kind: 'INTEGRATION',
    name: 'Integrasi Jurnal.id (Mekari)',
    description:
      'Invoice, penerimaan barang, dan pembayaran mengalir langsung ke Jurnal.id sebagai transaksi akuntansi tanpa entri ganda. Akuntan Anda melihat posisi kas dan piutang yang sudah sesuai dengan aktivitas harian tim operasional.',
    icon: 'BookOpenCheck',
    priceMin: 12_000_000,
    priceMax: 19_000_000,
    manDayMin: 4.5,
    manDayMax: 7,
    isRecurring: false,
    sortOrder: 20,
  },
  {
    slug: 'integrasi-shopee',
    kind: 'INTEGRATION',
    name: 'Integrasi Shopee',
    description:
      'Pesanan yang masuk di Shopee langsung muncul di sistem untuk diproses tim gudang, dan sisa stok Anda dikirim balik ke Shopee setiap kali ada penjualan. Risiko overselling karena stok toko online dan stok gudang berbeda jadi hilang.',
    icon: 'ShoppingBag',
    priceMin: 15_000_000,
    priceMax: 24_000_000,
    manDayMin: 6,
    manDayMax: 9,
    isRecurring: false,
    sortOrder: 30,
  },
  {
    slug: 'integrasi-tokopedia',
    kind: 'INTEGRATION',
    name: 'Integrasi Tokopedia',
    description:
      'Pesanan, status pengiriman, dan pembatalan dari Tokopedia tersalin otomatis ke sistem, sementara perubahan stok dan harga Anda dorong sekali dari satu tempat. Admin tidak perlu lagi membuka seller center untuk menyalin pesanan satu per satu.',
    icon: 'Store',
    priceMin: 15_000_000,
    priceMax: 24_000_000,
    manDayMin: 6,
    manDayMax: 9,
    isRecurring: false,
    sortOrder: 40,
  },
  {
    slug: 'integrasi-lazada',
    kind: 'INTEGRATION',
    name: 'Integrasi Lazada',
    description:
      'Semua pesanan Lazada masuk ke antrean proses yang sama dengan kanal lain, dan stok tersisa diperbarui balik ke Lazada setelah barang keluar gudang. Anda punya satu daftar pesanan untuk semua toko, bukan satu tab per marketplace.',
    icon: 'ShoppingCart',
    priceMin: 13_000_000,
    priceMax: 21_000_000,
    manDayMin: 5,
    manDayMax: 8,
    isRecurring: false,
    sortOrder: 50,
  },
  {
    slug: 'integrasi-tiktok-shop',
    kind: 'INTEGRATION',
    name: 'Integrasi TikTok Shop',
    description:
      'Pesanan dari TikTok Shop, termasuk ledakan order saat live streaming, langsung terbaca sistem beserta data pengirimannya. Stok yang terjual saat live ikut terpotong seketika sehingga tim tidak menjual barang yang sudah habis.',
    icon: 'Video',
    priceMin: 14_000_000,
    priceMax: 23_000_000,
    manDayMin: 5.5,
    manDayMax: 8.5,
    isRecurring: false,
    sortOrder: 60,
  },
  {
    slug: 'integrasi-whatsapp-business-api',
    kind: 'INTEGRATION',
    name: 'Integrasi WhatsApp Business API',
    description:
      'Konfirmasi pesanan, nomor resi, tagihan jatuh tempo, dan pengingat follow-up terkirim otomatis ke WhatsApp pelanggan dari nomor resmi perusahaan. Balasan pelanggan tetap tersimpan di sistem, jadi riwayat percakapan tidak hilang bersama ponsel staf yang resign.',
    icon: 'MessageCircle',
    priceMin: 11_000_000,
    priceMax: 18_000_000,
    manDayMin: 4,
    manDayMax: 7,
    isRecurring: false,
    sortOrder: 70,
  },
  {
    slug: 'integrasi-payment-gateway',
    kind: 'INTEGRATION',
    name: 'Integrasi Payment Gateway (Midtrans / Xendit)',
    description:
      'Pelanggan membayar lewat Virtual Account, QRIS, kartu, atau e-wallet dan status tagihan berubah menjadi lunas sendiri begitu dana masuk. Tim finance berhenti mencocokkan bukti transfer di grup WhatsApp dengan mutasi rekening.',
    icon: 'CreditCard',
    priceMin: 10_000_000,
    priceMax: 17_000_000,
    manDayMin: 4,
    manDayMax: 6.5,
    isRecurring: false,
    sortOrder: 80,
  },
  {
    slug: 'integrasi-kurir',
    kind: 'INTEGRATION',
    name: 'Integrasi Kurir (JNE / J&T / SiCepat)',
    description:
      'Ongkos kirim terhitung otomatis saat pesanan dibuat, resi tercetak dari sistem, dan status paket tertarik balik sampai barang diterima. Pertanyaan "paket saya sampai mana" bisa dijawab tanpa membuka situs kurir satu per satu.',
    icon: 'Truck',
    priceMin: 12_000_000,
    priceMax: 20_000_000,
    manDayMin: 4.5,
    manDayMax: 7.5,
    isRecurring: false,
    sortOrder: 90,
  },
  {
    slug: 'integrasi-google-sheets',
    kind: 'INTEGRATION',
    name: 'Integrasi Google Sheets',
    description:
      'Data penjualan, stok, atau laporan pilihan Anda mengalir terjadwal ke Google Sheets sehingga tim yang masih terbiasa bekerja di spreadsheet tetap dapat angka terbaru. Rekap manual mingguan yang selama ini dikerjakan admin jadi tidak perlu lagi.',
    icon: 'Sheet',
    priceMin: 8_000_000,
    priceMax: 13_000_000,
    manDayMin: 3,
    manDayMax: 5,
    isRecurring: false,
    sortOrder: 100,
  },
  {
    slug: 'integrasi-email-smtp',
    kind: 'INTEGRATION',
    name: 'Integrasi Email Perusahaan (SMTP)',
    description:
      'Invoice, penawaran, dan notifikasi terkirim dari alamat email resmi perusahaan Anda, bukan dari alamat sistem, lengkap dengan catatan kapan email itu terkirim. Dokumen ke pelanggan tampil konsisten dan jejaknya tersimpan bila suatu saat dipersoalkan.',
    icon: 'Mail',
    priceMin: 8_000_000,
    priceMax: 12_000_000,
    manDayMin: 3,
    manDayMax: 4.5,
    isRecurring: false,
    sortOrder: 110,
  },
  {
    slug: 'integrasi-e-faktur-pajak',
    kind: 'INTEGRATION',
    name: 'Integrasi e-Faktur Pajak',
    description:
      'Invoice yang terbit di sistem langsung siap menjadi faktur pajak dalam format yang diterima aplikasi e-Faktur, lengkap dengan data NPWP dan nomor seri pelanggan. Pekerjaan input ulang tiap akhir bulan beserta risiko salah ketik NPWP hilang.',
    icon: 'ReceiptText',
    priceMin: 16_000_000,
    priceMax: 26_000_000,
    manDayMin: 6,
    manDayMax: 10,
    isRecurring: false,
    sortOrder: 120,
  },
  {
    slug: 'integrasi-mesin-absensi',
    kind: 'INTEGRATION',
    name: 'Integrasi Mesin Absensi',
    description:
      'Data sidik jari atau kartu dari mesin absensi terbaca sistem sebagai jam masuk dan pulang karyawan tanpa ekspor manual. Rekap kehadiran, lembur, dan keterlambatan siap dipakai untuk penggajian pada hari yang sama.',
    icon: 'Fingerprint',
    priceMin: 12_000_000,
    priceMax: 19_000_000,
    manDayMin: 4.5,
    manDayMax: 7,
    isRecurring: false,
    sortOrder: 130,
  },
  {
    slug: 'integrasi-marketplace-lain',
    kind: 'INTEGRATION',
    name: 'Integrasi Marketplace Lain',
    description:
      'Kanal jualan lain yang Anda pakai — Blibli, Bukalapak, Zalora, TikTok Affiliate, atau toko di platform B2B — disambungkan dengan pola yang sama: pesanan masuk ke sistem, stok dikirim balik ke marketplace. Rentang harga menyesuaikan kelengkapan API kanal tersebut dan dipastikan saat sesi discovery.',
    icon: 'Globe',
    priceMin: 15_000_000,
    priceMax: 28_000_000,
    manDayMin: 5,
    manDayMax: 10,
    isRecurring: false,
    sortOrder: 140,
  },

  // -------------------------------------------------------------------------
  // 2. MIGRASI DATA — pilihan tunggal (optionGroup "migrasi")
  // -------------------------------------------------------------------------
  {
    slug: 'migrasi-tidak-ada',
    kind: 'MIGRATION',
    name: 'Tidak Ada Migrasi Data',
    description:
      'Sistem mulai dari data kosong dan tim Anda mengisi sendiri master barang, pelanggan, serta saldo awal lewat template impor bawaan. Cocok bila data lama sedikit atau memang ingin dirapikan dari awal.',
    icon: 'CircleSlash',
    priceMin: 0,
    priceMax: 0,
    manDayMin: 0,
    manDayMax: 0,
    isRecurring: false,
    optionGroup: 'migrasi',
    sortOrder: 200,
  },
  {
    slug: 'migrasi-excel-sederhana',
    kind: 'MIGRATION',
    name: 'Migrasi Sederhana dari Excel',
    description:
      'Data master dan saldo awal Anda — daftar barang, pelanggan, supplier, stok, serta piutang berjalan — kami pindahkan dari file Excel ke sistem baru, termasuk pembersihan duplikat dan penyeragaman format. Di hari pertama pakai, sistem sudah berisi data yang Anda kenali, bukan halaman kosong.',
    icon: 'FileSpreadsheet',
    priceMin: 6_000_000,
    priceMax: 12_000_000,
    manDayMin: 2,
    manDayMax: 4,
    isRecurring: false,
    optionGroup: 'migrasi',
    sortOrder: 210,
  },
  {
    slug: 'migrasi-sistem-lama-kompleks',
    kind: 'MIGRATION',
    name: 'Migrasi Kompleks dari Sistem Lama',
    description:
      'Data dari aplikasi lama Anda — termasuk riwayat transaksi bertahun-tahun beserta relasi antar dokumen — dipindahkan dengan pemetaan kolom, uji coba migrasi, dan pencocokan angka sebelum sistem baru dinyatakan siap. Riwayat pelanggan dan pergerakan stok lama tetap bisa ditelusuri, jadi Anda tidak perlu menyimpan sistem lama hanya untuk melihat data historis.',
    icon: 'DatabaseBackup',
    priceMin: 18_000_000,
    priceMax: 38_000_000,
    manDayMin: 6,
    manDayMax: 13,
    isRecurring: false,
    optionGroup: 'migrasi',
    sortOrder: 220,
  },

  // -------------------------------------------------------------------------
  // 3. PELATIHAN & PENDAMPINGAN — pilihan tunggal (optionGroup "pelatihan")
  // -------------------------------------------------------------------------
  {
    slug: 'pelatihan-tanpa',
    kind: 'TRAINING',
    name: 'Tanpa Pelatihan',
    description:
      'Tim Anda belajar mandiri lewat manual pengguna dan video panduan yang kami serahkan bersama aplikasi. Pilihan ini masuk akal bila ada staf IT internal yang terbiasa mengajari rekannya sendiri.',
    icon: 'CircleSlash',
    priceMin: 0,
    priceMax: 0,
    manDayMin: 0,
    manDayMax: 0,
    isRecurring: false,
    optionGroup: 'pelatihan',
    sortOrder: 300,
  },
  {
    slug: 'pelatihan-online',
    kind: 'TRAINING',
    name: 'Pelatihan Online',
    description:
      'Dua sesi pelatihan daring bersama tim Anda, dipisah antara pengguna harian dan admin sistem, plus satu sesi tanya jawab setelah dua minggu pemakaian. Rekaman sesi dan manual singkat kami serahkan agar karyawan baru bisa belajar tanpa mengulang pelatihan.',
    icon: 'MonitorPlay',
    priceMin: 4_000_000,
    priceMax: 8_000_000,
    manDayMin: 1.5,
    manDayMax: 3,
    isRecurring: false,
    optionGroup: 'pelatihan',
    sortOrder: 310,
  },
  {
    slug: 'pelatihan-onsite',
    kind: 'TRAINING',
    name: 'Pelatihan Onsite',
    description:
      'Trainer kami datang ke lokasi Anda untuk melatih tim langsung di meja kerja dan di gudang, memakai data asli perusahaan, lalu mendampingi hari-hari pertama sistem dipakai. Kendala yang biasanya baru muncul saat operasional nyata bisa langsung diselesaikan di tempat.',
    icon: 'Presentation',
    priceMin: 12_000_000,
    priceMax: 25_000_000,
    manDayMin: 4,
    manDayMax: 8,
    isRecurring: false,
    optionGroup: 'pelatihan',
    sortOrder: 320,
  },

  // -------------------------------------------------------------------------
  // 4. MAINTENANCE & SLA — pilihan tunggal, biaya BULANAN (BR-12)
  //    Acuan PRD 6.7: nilai tahunan lazimnya 15–25% dari biaya development.
  //    Angka di bawah dikalibrasi untuk proyek ± Rp 150 juta.
  // -------------------------------------------------------------------------
  {
    slug: 'maintenance-tanpa',
    kind: 'MAINTENANCE',
    name: 'Tanpa Maintenance',
    description:
      'Setelah masa garansi bug tiga bulan berakhir, tidak ada biaya bulanan dan setiap permintaan perbaikan atau perubahan ditangani sebagai pekerjaan terpisah dengan penawaran tersendiri. Pilihan ini paling hemat, tetapi waktu penanganan mengikuti antrean tim yang tersedia.',
    icon: 'CircleSlash',
    priceMin: 0,
    priceMax: 0,
    manDayMin: 0,
    manDayMax: 0,
    isRecurring: true,
    optionGroup: 'maintenance',
    sortOrder: 400,
  },
  {
    slug: 'maintenance-basic',
    kind: 'MAINTENANCE',
    name: 'Maintenance Basic',
    description:
      'Dukungan hari kerja pukul 09.00–17.00 lewat email dan WhatsApp dengan waktu respons maksimal 8 jam kerja dan perbaikan gangguan berat mulai ditangani pada hari kerja berikutnya. Termasuk pembaruan keamanan, pemantauan backup harian, dan kuota 4 jam kerja per bulan untuk perubahan kecil seperti penyesuaian format laporan atau penambahan pengguna.',
    icon: 'Wrench',
    priceMin: 2_000_000,
    priceMax: 3_500_000,
    manDayMin: 0.5,
    manDayMax: 1,
    isRecurring: true,
    optionGroup: 'maintenance',
    sortOrder: 410,
  },
  {
    slug: 'maintenance-priority',
    kind: 'MAINTENANCE',
    name: 'Maintenance Priority',
    description:
      'Dukungan setiap hari pukul 07.00–21.00 termasuk akhir pekan, waktu respons maksimal 2 jam dan gangguan yang menghentikan operasional ditangani hari itu juga dengan target pulih 8 jam. Termasuk kanal WhatsApp khusus ke tim teknis, pemantauan server aktif, laporan performa bulanan, dan kuota 12 jam kerja per bulan untuk perubahan kecil.',
    icon: 'ShieldCheck',
    priceMin: 5_000_000,
    priceMax: 7_000_000,
    manDayMin: 1.5,
    manDayMax: 2.5,
    isRecurring: true,
    optionGroup: 'maintenance',
    sortOrder: 420,
  },
];
