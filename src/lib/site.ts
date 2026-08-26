/** Konfigurasi identitas produk dan perusahaan, dibaca dari environment. */
export const site = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Rakit',
  tagline: 'Rakit sendiri aplikasi bisnis Anda, lihat harganya seketika.',
  description:
    'Pilih jenis aplikasi, rakit fiturnya satu per satu, dan lihat estimasi harga serta ' +
    'waktu pengerjaan bergerak real-time. Tanpa harus menghubungi siapa pun lebih dulu.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL || 'PT Rakit Teknologi Nusantara',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'halo@rakit.id',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '+62 811 1000 200',
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    'Jl. Rasuna Said Kav. 12, Jakarta Selatan 12950',
} as const;

/** Teks penjelas mengapa harga berupa rentang (PRD 6.9 — wajib ada di UI). */
export const PRICE_RANGE_EXPLAINER = {
  short: 'Mengapa harga berupa rentang?',
  body:
    'Rentang ini mencerminkan tingkat penyesuaian yang mungkin dibutuhkan proses bisnis Anda. ' +
    'Setelah sesi konsultasi 30 menit, kami mengunci harga tetap yang berlaku 30 hari.',
  detail: [
    {
      title: 'Batas bawah',
      body:
        'Berlaku bila proses Anda dapat mengikuti alur bawaan modul kami tanpa banyak penyesuaian.',
    },
    {
      title: 'Batas atas',
      body:
        'Berlaku bila ada penyesuaian alur, field tambahan, atau aturan khusus yang perlu dibangun.',
    },
    {
      title: 'Setelah konsultasi',
      body:
        'Kami mengunci satu angka tetap yang berlaku 30 hari, lengkap dengan klausul perubahan scope.',
    },
  ],
} as const;

/**
 * Bagian "Yang Tidak Termasuk" (F2) — pencegah sengketa scope paling murah
 * yang bisa dibuat. Ditampilkan di ringkasan maupun proposal PDF.
 */
export const DEFAULT_EXCLUSIONS = [
  'Pengadaan perangkat keras (server, printer barcode, scanner, tablet).',
  'Biaya langganan pihak ketiga (payment gateway, WhatsApp Business API, layanan kurir).',
  'Pembuatan konten: foto produk, penulisan materi, dan penyusunan data master awal.',
  'Perubahan ruang lingkup di luar daftar fitur yang tercantum pada penawaran ini.',
  'Integrasi ke sistem yang tidak menyediakan API atau dokumentasi resmi.',
  'Pemeliharaan setelah masa garansi, kecuali dipilih paket maintenance.',
  'Pelatihan ulang untuk karyawan baru di luar sesi yang disepakati.',
];

/** Asumsi standar yang dicantumkan pada penawaran (F1). */
export const DEFAULT_ASSUMPTIONS = [
  'Data master awal (barang, pelanggan, supplier) disediakan klien dalam format Excel yang rapi.',
  'Satu narahubung dari pihak klien tersedia untuk sesi klarifikasi mingguan.',
  'Umpan balik pada setiap milestone diberikan maksimal 3 hari kerja.',
  'Maksimal dua putaran revisi per milestone; revisi ketiga dan seterusnya dihitung sebagai perubahan scope.',
  'Masa garansi perbaikan bug 60 hari setelah serah terima.',
];

/** Tiga langkah "Cara Kerja" pada landing (A6). */
export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Pilih jenis aplikasi',
    body: 'WMS, CRM, POS, atau kebutuhan lain. Setiap katalog sudah berisi preset siap pakai.',
  },
  {
    step: 2,
    title: 'Rakit fiturnya',
    body: 'Tambah atau kurangi fitur satu per satu. Harga dan estimasi waktu bergerak seketika.',
  },
  {
    step: 3,
    title: 'Ambil penawaran',
    body: 'Unduh proposal PDF lengkap, lalu jadwalkan konsultasi untuk mengunci harga tetap.',
  },
];
