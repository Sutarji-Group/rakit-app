import type { CatalogDefinition } from './types';

/**
 * Katalog kategori CRM — Sistem Manajemen Hubungan Pelanggan & Penjualan.
 *
 * Sasaran: perusahaan B2B/B2C Indonesia dengan tim sales 3–50 orang yang saat
 * ini masih mengandalkan Excel, Google Sheets, dan grup WhatsApp.
 *
 * Man-day pada berkas ini adalah MAN-DAY REFERENSI (BR-18): effort seandainya
 * fitur dibangun dari nol. Lebar rentang mengikuti batas mesin harga —
 * CORE ≤ 1,15x ; STANDARD ≤ 1,30x ; CONFIGURABLE ≤ 1,80x.
 */
export const CRM_CATALOG: CatalogDefinition = {
  slug: 'crm',
  name: 'CRM — Manajemen Hubungan Pelanggan & Penjualan',
  shortName: 'CRM',
  icon: 'Handshake',
  accent: 'indigo',

  tagline: 'Semua prospek terlihat, tidak ada yang jatuh di tengah jalan.',
  description:
    'Aplikasi CRM untuk mengelola kontak, prospek, penawaran, sampai layanan purna jual dalam satu alur kerja yang bisa dipantau langsung oleh pemilik.',
  longDescription: [
    'RAKIT CRM dibuat untuk perusahaan Indonesia yang tim salesnya sudah terlalu besar untuk diurus dengan Excel, tetapi belum siap membeli sistem asing yang mahal dan kaku. Seluruh perjalanan pelanggan — dari prospek pertama masuk, penawaran dikirim, sampai keluhan setelah pembelian — dicatat di satu tempat yang sama.',
    'Titik beratnya ada pada pipeline yang tahapnya mengikuti cara Anda berjualan, bukan sebaliknya. Setiap prospek punya pemilik, tenggat tindak lanjut, dan riwayat yang bisa dibaca siapa pun yang berwenang, sehingga pergantian personel tidak lagi memutus hubungan dengan pelanggan.',
    'Karena hampir semua tim di Indonesia berjualan lewat WhatsApp dan mencatat di spreadsheet, katalog ini menyediakan jalur masuk dari kedua kebiasaan itu: impor kontak massal, formulir web, integrasi WhatsApp Business API, hingga penyambungan ke Accurate atau Jurnal agar tim keuangan tidak perlu mengetik ulang.',
  ].join('\n\n'),

  benefits: [
    'Pemilik tahu isi pipeline setiap saat tanpa perlu menagih laporan ke siapa pun.',
    'Prospek tidak lagi hilang karena lupa ditindaklanjuti — sistem yang menagih, bukan atasan.',
    'Data pelanggan menjadi aset perusahaan, bukan isi ponsel pribadi sales yang bisa ikut pergi.',
    'Penawaran keluar dengan format, nomor, dan harga yang seragam untuk semua sales.',
    'Kebocoran di tiap tahap penjualan terlihat angkanya, jadi perbaikan diarahkan ke titik yang benar.',
    'Sales lapangan bisa mencatat hasil kunjungan dari ponsel sebelum meninggalkan lokasi pelanggan.',
  ],

  painPoints: [
    {
      title: 'Prospek hilang di grup WhatsApp',
      body: 'Calon pembeli masuk lewat chat, dibalas seadanya, lalu tertimbun ratusan pesan lain. Seminggu kemudian tidak ada yang ingat pernah ada orang yang bertanya, apalagi menindaklanjutinya.',
    },
    {
      title: 'Laporan penjualan selalu terlambat',
      body: 'Setiap Senin pagi rekap harus ditagih ke tiap sales, digabung manual di spreadsheet, dan angkanya sering tidak cocok. Saat laporan akhirnya jadi, keputusan yang bisa diambil sudah terlambat seminggu.',
    },
    {
      title: 'Sales resign, pelanggannya ikut hilang',
      body: 'Nomor, riwayat percakapan, dan janji-janji ke pelanggan tersimpan di ponsel pribadi. Penggantinya harus berkenalan dari nol dan pelanggan merasa diabaikan.',
    },
    {
      title: 'Harga dan diskon berbeda-beda antar sales',
      body: 'Setiap orang memakai file price list versinya sendiri dan memberi diskon sesuai perasaan. Pelanggan saling membandingkan penawaran, margin tergerus tanpa ketahuan.',
    },
  ],

  minViableFeatureCount: 9,
  seoTitle: 'Aplikasi CRM Custom untuk Tim Sales Indonesia',
  seoDescription:
    'Bangun aplikasi CRM sesuai proses penjualan Anda: pipeline, follow-up otomatis, quotation, tiket purna jual, dan integrasi WhatsApp. Pilih fiturnya, harga langsung terlihat.',

  groups: [
    // -----------------------------------------------------------------------
    // 1. Fondasi data: siapa pelanggannya dan apa yang dijual ke mereka.
    // -----------------------------------------------------------------------
    {
      slug: 'master-data-kontak',
      name: 'Master Data & Kontak',
      description:
        'Sumber kebenaran tunggal untuk data pelanggan, produk, dan harga yang dipakai seluruh tim.',
      icon: 'Users',
      features: [
        {
          slug: 'data-kontak-pelanggan',
          name: 'Data Kontak & Perusahaan',
          clientDescription:
            'Semua nomor, email, dan riwayat pelanggan tersimpan di satu tempat beserta perusahaan tempat mereka bekerja. Kalau satu sales berhenti, kontaknya tidak ikut hilang bersama ponselnya.',
          internalDescription:
            'Entitas Company–Contact (many-to-one), custom field, dedup berbasis telepon/email, soft delete, pencarian full-text, riwayat kepemilikan.',
          type: 'CORE',
          manDayMin: 3,
          manDayMax: 3.4,
          keywords: ['kontak', 'database pelanggan', 'data perusahaan', 'buku alamat'],
          sortOrder: 1,
          seoTitle: 'Aplikasi Database Kontak & Pelanggan untuk Tim Sales',
          seoDescription:
            'Kelola kontak, perusahaan, dan riwayat komunikasi pelanggan dalam satu database terpusat. Bebaskan data pelanggan dari ponsel pribadi sales.',
        },
        {
          slug: 'katalog-produk-harga',
          name: 'Katalog Produk & Harga Jual',
          clientDescription:
            'Daftar produk beserta harga resminya menjadi satu rujukan untuk semua sales. Tidak ada lagi penawaran yang memakai harga tahun lalu karena file yang dipakai berbeda-beda.',
          internalDescription:
            'Product + varian, satuan, harga dasar, pajak, status aktif, riwayat perubahan harga; dikonsumsi baris quotation dan sales order.',
          type: 'CORE',
          manDayMin: 3,
          manDayMax: 3.4,
          keywords: ['katalog produk', 'daftar harga', 'price list', 'produk'],
          sortOrder: 2,
        },
        {
          slug: 'daftar-harga-per-segmen',
          name: 'Daftar Harga per Segmen Pelanggan',
          clientDescription:
            'Distributor, reseller, dan pelanggan akhir otomatis mendapat harga sesuai golongannya saat dibuatkan penawaran. Sales tidak perlu menghafal atau menebak diskon yang boleh diberikan.',
          internalDescription:
            'Price list bertingkat per segment/tier, periode berlaku, prioritas resolusi harga, minimum kuantitas, override manual berjenjang.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 6,
          keywords: ['harga distributor', 'price list', 'harga reseller', 'segmen pelanggan', 'diskon'],
          sortOrder: 3,
          seoTitle: 'Daftar Harga per Segmen Pelanggan di Aplikasi CRM',
          seoDescription:
            'Atur harga berbeda untuk distributor, reseller, dan pelanggan akhir. Harga penawaran terisi otomatis sesuai golongan pelanggan, bukan hafalan sales.',
        },
        {
          slug: 'label-segmentasi-pelanggan',
          name: 'Label & Segmentasi Pelanggan',
          clientDescription:
            'Pelanggan dapat ditandai berdasarkan industri, wilayah, atau golongan, lalu disaring kapan pun dibutuhkan. Mencari seluruh pelanggan pabrik di Jawa Timur jadi urusan beberapa detik.',
          internalDescription:
            'Tag bebas + segment builder berbasis filter tersimpan (dinamis/statis), dipakai ulang oleh price list dan kampanye.',
          type: 'STANDARD',
          manDayMin: 2,
          manDayMax: 2.5,
          keywords: ['segmentasi', 'label pelanggan', 'kategori pelanggan', 'filter'],
          sortOrder: 4,
        },
        {
          slug: 'impor-kontak-excel',
          name: 'Impor Kontak dari Excel',
          clientDescription:
            'Data pelanggan yang selama ini tersebar di banyak file Excel bisa dipindahkan sekaligus, lengkap dengan pengecekan data ganda. Tim tidak perlu mengetik ulang ribuan baris.',
          internalDescription:
            'Unggah XLSX/CSV, UI pemetaan kolom, validasi per baris, pratinjau, dedup, laporan baris gagal yang bisa diunduh dan diunggah ulang.',
          type: 'STANDARD',
          manDayMin: 2.5,
          manDayMax: 3.2,
          keywords: ['impor excel', 'migrasi data', 'upload kontak', 'csv'],
          sortOrder: 5,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 2. Jantung CRM: perjalanan prospek dari masuk sampai menang atau kalah.
    // -----------------------------------------------------------------------
    {
      slug: 'prospek-pipeline',
      name: 'Prospek & Pipeline',
      description:
        'Papan kerja harian tim sales: siapa yang sedang diproses, di tahap mana, dan siapa yang memegang.',
      icon: 'Kanban',
      features: [
        {
          slug: 'data-prospek-deal',
          name: 'Data Prospek & Peluang Penjualan',
          clientDescription:
            'Setiap peluang penjualan punya catatan sendiri: siapa calonnya, perkiraan nilainya, dan sales mana yang memegang. Tidak ada lagi prospek yang dianggap dipegang semua orang tetapi tidak diurus siapa pun.',
          internalDescription:
            'Entitas Deal: owner, nilai, mata uang, probabilitas, expected close date, relasi ke Company/Contact, riwayat perpindahan pemilik.',
          type: 'CORE',
          manDayMin: 3.2,
          manDayMax: 3.6,
          keywords: ['prospek', 'peluang penjualan', 'deal', 'lead'],
          sortOrder: 1,
        },
        {
          slug: 'pipeline-kanban-tahap',
          name: 'Papan Pipeline yang Tahapnya Bisa Diatur',
          clientDescription:
            'Semua prospek terlihat dalam satu papan yang bergerak dari kiri ke kanan, dan tahapnya disesuaikan dengan cara perusahaan Anda berjualan. Pemilik langsung tahu prospek mana yang mandek dan sudah berapa lama diam di situ.',
          internalDescription:
            'Kanban drag-drop, definisi stage per pipeline, probabilitas & batas WIP per stage, field wajib saat pindah stage, penghitung stage age, multi-pipeline.',
          type: 'CONFIGURABLE',
          manDayMin: 4.5,
          manDayMax: 6,
          isEssential: true,
          keywords: ['pipeline', 'kanban', 'tahap penjualan', 'papan prospek', 'funnel'],
          sortOrder: 2,
          seoTitle: 'Pipeline Kanban Penjualan dengan Tahap yang Bisa Diatur',
          seoDescription:
            'Pantau seluruh prospek dalam satu papan kanban. Tahap penjualan disesuaikan dengan proses perusahaan Anda, lengkap dengan penanda prospek yang mandek.',
        },
        {
          slug: 'penilaian-prospek-otomatis',
          name: 'Penilaian Kualitas Prospek',
          clientDescription:
            'Sistem memberi nilai pada setiap prospek berdasarkan hal-hal yang menurut Anda menentukan, misalnya ukuran perusahaan atau kecepatan membalas. Tim sales jadi tahu harus menelepon siapa lebih dulu pagi ini.',
          internalDescription:
            'Rule engine skor (atribut + perilaku), bobot dapat dikonfigurasi per aturan, perhitungan ulang terjadwal, ambang batas panas/hangat/dingin.',
          type: 'CONFIGURABLE',
          manDayMin: 3.5,
          manDayMax: 5.5,
          keywords: ['skor prospek', 'lead scoring', 'prioritas prospek', 'kualitas lead'],
          sortOrder: 3,
          seoTitle: 'Lead Scoring: Penilaian Kualitas Prospek Otomatis',
          seoDescription:
            'Beri skor otomatis pada setiap prospek sesuai kriteria perusahaan Anda, sehingga tim sales mengerjakan prospek paling menjanjikan lebih dulu.',
        },
        {
          slug: 'penandaan-prioritas-manual',
          name: 'Penandaan Prospek Panas, Hangat, dan Dingin',
          clientDescription:
            'Sales menandai sendiri seberapa serius setiap prospek dengan tiga tingkat sederhana. Cara paling cepat memilah antrean kerja tanpa perlu menyusun aturan penilaian yang rumit.',
          internalDescription:
            'Field prioritas bertipe enum + filter, sort, dan tampilan warna pada kanban. Alternatif ringan dari lead scoring berbasis aturan.',
          type: 'STANDARD',
          manDayMin: 2,
          manDayMax: 2.5,
          keywords: ['prioritas prospek', 'prospek panas', 'hot lead', 'penandaan'],
          sortOrder: 4,
        },
        {
          slug: 'distribusi-prospek-otomatis',
          name: 'Pembagian Prospek Otomatis ke Sales',
          clientDescription:
            'Prospek baru langsung masuk ke sales yang mendapat giliran atau yang bebannya paling ringan, lengkap dengan pemberitahuan. Tidak ada lagi prospek yang menganggur seharian di grup WhatsApp.',
          internalDescription:
            'Assignment engine: round-robin, beban kerja, dan aturan berbasis atribut; batas waktu klaim dengan reassign otomatis bila didiamkan.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['distribusi lead', 'pembagian prospek', 'round robin', 'assign sales'],
          sortOrder: 5,
        },
        {
          slug: 'pelacakan-sumber-prospek',
          name: 'Pelacakan Sumber Prospek',
          clientDescription:
            'Setiap prospek tercatat datang dari mana — iklan, pameran, referensi, atau website. Anda akhirnya tahu belanja pemasaran mana yang benar-benar berujung pada penjualan.',
          internalDescription:
            'Field sumber/medium/kampanye, penangkapan UTM dari formulir web, laporan konversi dan nilai per sumber.',
          type: 'STANDARD',
          manDayMin: 2.5,
          manDayMax: 3.2,
          keywords: ['sumber lead', 'asal prospek', 'utm', 'kanal pemasaran'],
          sortOrder: 6,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 3. Pintu masuk prospek baru dari luar perusahaan.
    // -----------------------------------------------------------------------
    {
      slug: 'pemasaran-akuisisi',
      name: 'Pemasaran & Penangkap Prospek',
      description:
        'Cara prospek baru masuk ke sistem tanpa harus diketik ulang oleh tim sales.',
      icon: 'Megaphone',
      features: [
        {
          slug: 'formulir-web-penangkap-prospek',
          name: 'Formulir Web Penangkap Prospek',
          clientDescription:
            'Formulir yang dipasang di website atau dibagikan lewat tautan langsung membuat prospek baru di sistem. Calon pembeli yang mengisi di luar jam kerja tidak lagi hilang di kotak masuk.',
          internalDescription:
            'Form builder + skrip embed/iframe, anti-spam (honeypot & rate limit), pemetaan field ke Contact/Deal, notifikasi instan ke pemilik prospek.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['formulir web', 'web form', 'penangkap lead', 'landing page'],
          sortOrder: 1,
        },
        {
          slug: 'kampanye-email-blast-wa',
          name: 'Kampanye Email & Blast WhatsApp',
          clientDescription:
            'Kirim penawaran atau pengumuman ke ratusan pelanggan sekaligus, lalu lihat siapa yang membuka dan membalas. Yang merespons otomatis muncul sebagai prospek baru untuk ditindaklanjuti.',
          internalDescription:
            'Campaign builder, templat pesan, penjadwalan, batching & throttling, pelacakan open/click/reply, daftar berhenti berlangganan.',
          type: 'STANDARD',
          manDayMin: 4,
          manDayMax: 5,
          keywords: ['kampanye email', 'blast whatsapp', 'email marketing', 'broadcast'],
          sortOrder: 2,
        },
        {
          slug: 'daftar-target-kampanye',
          name: 'Daftar Target Kampanye',
          clientDescription:
            'Susun daftar penerima kampanye dari saringan data pelanggan, misalnya semua reseller yang belum memesan tiga bulan terakhir. Daftarnya ikut diperbarui sendiri saat data pelanggan berubah.',
          internalDescription:
            'Segment tersimpan (dinamis & statis), snapshot penerima saat pengiriman, penanganan unsubscribe dan bounce, batas ukuran kirim.',
          type: 'STANDARD',
          manDayMin: 2.5,
          manDayMax: 3.2,
          keywords: ['daftar target', 'segmen kampanye', 'penerima blast', 'mailing list'],
          sortOrder: 3,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 4. Disiplin harian: mencatat apa yang sudah dilakukan dan apa berikutnya.
    // -----------------------------------------------------------------------
    {
      slug: 'aktivitas-follow-up',
      name: 'Aktivitas & Follow-up',
      description:
        'Riwayat setiap sentuhan ke pelanggan dan mekanisme yang memastikan tindak lanjut tidak terlewat.',
      icon: 'CalendarClock',
      features: [
        {
          slug: 'catatan-aktivitas-sales',
          name: 'Catatan Aktivitas Sales',
          clientDescription:
            'Setiap telepon, pesan, dan pertemuan tercatat di bawah nama pelanggannya lengkap dengan waktu dan hasilnya. Ketika sales berganti, penggantinya bisa membaca seluruh riwayat dalam lima menit.',
          internalDescription:
            'Timeline aktivitas polymorphic (call/meeting/note/email), lampiran, mention pengguna, filter per pengguna dan periode.',
          type: 'CORE',
          manDayMin: 3,
          manDayMax: 3.4,
          keywords: ['aktivitas sales', 'riwayat komunikasi', 'catatan', 'log kontak'],
          sortOrder: 1,
        },
        {
          slug: 'pengingat-follow-up-otomatis',
          name: 'Pengingat Follow-up Otomatis',
          clientDescription:
            'Sistem menagih sales untuk menindaklanjuti prospek sesuai jeda waktu yang Anda tentukan, dan atasan menerima daftar siapa yang lewat tenggat. Prospek tidak lagi hilang hanya karena lupa.',
          internalDescription:
            'Aturan follow-up per stage/segmen, generator tugas terjadwal, eskalasi bertingkat ke atasan, kanal notifikasi in-app/email/WhatsApp.',
          type: 'CONFIGURABLE',
          manDayMin: 3.5,
          manDayMax: 5.5,
          isEssential: true,
          keywords: ['pengingat', 'follow up', 'reminder', 'tindak lanjut'],
          sortOrder: 2,
          seoTitle: 'Pengingat Follow-up Otomatis untuk Tim Sales',
          seoDescription:
            'Atur jeda tindak lanjut per tahap penjualan dan biarkan sistem yang menagih. Prospek berhenti hilang karena lupa, atasan tahu siapa yang lewat tenggat.',
        },
        {
          slug: 'agenda-jadwal-kunjungan',
          name: 'Agenda & Jadwal Kunjungan',
          clientDescription:
            'Rencana telepon dan kunjungan tersusun dalam kalender per sales, dan atasan bisa melihat isi minggu depan. Rute harian tim jadi bisa direncanakan, bukan didadakan.',
          internalDescription:
            'Kalender harian/mingguan per pengguna, jadwal berulang, deteksi bentrok, sinkronisasi iCal opsional, penandaan hasil kunjungan.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['agenda', 'jadwal kunjungan', 'kalender sales', 'rencana kerja'],
          sortOrder: 3,
        },
        {
          slug: 'pencatatan-kunjungan-lokasi',
          name: 'Pencatatan Kunjungan dengan Titik Lokasi',
          clientDescription:
            'Sales melapor tiba di lokasi lewat ponsel, lengkap dengan titik peta, foto, dan hasil kunjungan. Laporan kunjungan akhirnya bisa dibuktikan, bukan sekadar dipercaya.',
          internalDescription:
            'Check-in/out GPS, validasi radius terhadap alamat pelanggan, foto terkompresi, antrean unggah offline, ringkasan rute harian.',
          type: 'STANDARD',
          manDayMin: 3.5,
          manDayMax: 4.5,
          keywords: ['kunjungan', 'check in', 'gps sales', 'laporan kunjungan', 'canvassing'],
          sortOrder: 4,
        },
        {
          slug: 'aplikasi-mobile-sales',
          name: 'Aplikasi Mobile untuk Sales Lapangan',
          clientDescription:
            'Sales bisa membuka data pelanggan, mencatat hasil kunjungan, dan membuat penawaran langsung dari ponsel. Tidak perlu menunggu sampai kembali ke kantor untuk memasukkan data.',
          internalDescription:
            'PWA installable dengan tampilan mobile-first, cache offline terbatas, akses kamera dan lokasi, push notification.',
          type: 'STANDARD',
          manDayMin: 4,
          manDayMax: 5,
          keywords: ['aplikasi mobile', 'sales lapangan', 'crm mobile', 'android'],
          sortOrder: 5,
          seoTitle: 'Aplikasi CRM Mobile untuk Sales Lapangan',
          seoDescription:
            'Akses data pelanggan, catat hasil kunjungan, dan buat penawaran dari ponsel. Sales lapangan tidak perlu menunggu kembali ke kantor untuk memasukkan data.',
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 5. Dokumen yang keluar ke pelanggan dan pengendaliannya.
    // -----------------------------------------------------------------------
    {
      slug: 'penawaran-quotation',
      name: 'Penawaran & Quotation',
      description:
        'Pembuatan, pengendalian diskon, dan persetujuan dokumen penawaran resmi.',
      icon: 'FileText',
      features: [
        {
          slug: 'penawaran-quotation-penomoran',
          name: 'Penawaran Harga dengan Penomoran Otomatis',
          clientDescription:
            'Buat penawaran resmi berformat rapi dengan nomor urut yang tidak pernah bentrok, lalu kirim sebagai PDF. Semua penawaran yang pernah keluar tercatat dan bisa dicari kembali.',
          internalDescription:
            'Generator dokumen (seri nomor, periode reset), baris item dengan pajak dan diskon, ekspor PDF, status draft/terkirim/menang/kalah, masa berlaku.',
          type: 'STANDARD',
          manDayMin: 3.5,
          manDayMax: 4.5,
          isEssential: true,
          keywords: ['penawaran', 'quotation', 'surat penawaran', 'penomoran', 'pdf'],
          sortOrder: 1,
          seoTitle: 'Aplikasi Penawaran Harga dengan Penomoran Otomatis',
          seoDescription:
            'Buat surat penawaran rapi dengan nomor urut otomatis, harga dari katalog, dan ekspor PDF. Seluruh penawaran tersimpan rapi dan mudah dicari kembali.',
        },
        {
          slug: 'templat-dokumen-penawaran',
          name: 'Templat Dokumen Penawaran',
          clientDescription:
            'Kop surat, syarat pembayaran, dan susunan isi penawaran ditetapkan sekali untuk semua sales. Dokumen yang sampai ke pelanggan selalu tampil seragam dan sesuai standar perusahaan.',
          internalDescription:
            'Template engine header/footer/term, variabel merge, versi templat, pemisahan per merek atau per cabang.',
          type: 'STANDARD',
          manDayMin: 2.5,
          manDayMax: 3.2,
          keywords: ['templat penawaran', 'kop surat', 'format quotation'],
          sortOrder: 2,
        },
        {
          slug: 'persetujuan-diskon-berjenjang',
          name: 'Persetujuan Diskon Bertingkat',
          clientDescription:
            'Diskon di atas batas tertentu tidak bisa dikirim sebelum disetujui atasan yang berwenang, dan persetujuannya bisa dilakukan dari ponsel. Margin terjaga tanpa harus memeriksa setiap penawaran satu per satu.',
          internalDescription:
            'Approval chain berbasis ambang nilai/persentase, delegasi saat penyetuju cuti, batas waktu persetujuan, jejak keputusan lengkap.',
          type: 'CONFIGURABLE',
          manDayMin: 3.5,
          manDayMax: 5.5,
          keywords: ['persetujuan diskon', 'approval', 'batas diskon', 'margin'],
          sortOrder: 3,
        },
        {
          slug: 'persetujuan-penawaran-online',
          name: 'Persetujuan Penawaran Online oleh Klien',
          clientDescription:
            'Pelanggan membuka tautan penawaran, membacanya, lalu menekan tombol setuju atau minta revisi. Anda tahu persis kapan dokumen dibuka, bukan sekadar menebak sudah dibaca atau belum.',
          internalDescription:
            'Tautan publik bertoken dengan masa berlaku, halaman baca-saja, tombol approve/reject beserta komentar, log akses dan notifikasi ke pemilik prospek.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['persetujuan online', 'approve penawaran', 'tanda tangan', 'link penawaran'],
          sortOrder: 4,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 6. Setelah penawaran disetujui: order, target, komisi, dan teritori.
    // -----------------------------------------------------------------------
    {
      slug: 'penjualan-target-komisi',
      name: 'Penjualan, Target & Komisi',
      description:
        'Konversi penawaran menjadi order serta pengukuran dan pengupahan kinerja tim sales.',
      icon: 'ShoppingCart',
      features: [
        {
          slug: 'sales-order-dari-penawaran',
          name: 'Sales Order dari Penawaran yang Disetujui',
          clientDescription:
            'Penawaran yang disetujui berubah menjadi pesanan hanya dengan satu klik, tanpa mengetik ulang barang dan harganya. Selisih antara yang ditawarkan dan yang dikirim jadi mustahil terjadi karena salah ketik.',
          internalDescription:
            'Konversi Quote ke SO, penomoran SO terpisah, status pemenuhan, sinkronisasi perubahan item, referensi silang antar dokumen.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          isEssential: true,
          keywords: ['sales order', 'pesanan', 'so', 'konversi penawaran'],
          sortOrder: 1,
        },
        {
          slug: 'target-pencapaian-sales',
          name: 'Target & Pencapaian Sales',
          clientDescription:
            'Target bulanan per sales, per tim, dan per wilayah terpasang di sistem, lalu pencapaiannya terhitung sendiri. Rapat mingguan berhenti membahas berapa angkanya dan mulai membahas kenapa.',
          internalDescription:
            'Kuota per periode dan dimensi, agregasi realisasi dari SO, proyeksi run-rate, papan peringkat, riwayat pencapaian.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['target sales', 'pencapaian', 'kuota', 'kpi sales'],
          sortOrder: 2,
          seoTitle: 'Pantau Target & Pencapaian Tim Sales secara Otomatis',
          seoDescription:
            'Pasang target per sales, tim, dan wilayah, lalu biarkan pencapaiannya terhitung sendiri dari order yang masuk. Tanpa rekap manual tiap akhir bulan.',
        },
        {
          slug: 'perhitungan-komisi-sales',
          name: 'Perhitungan Komisi Sales',
          clientDescription:
            'Komisi terhitung otomatis mengikuti skema yang berlaku di perusahaan Anda, termasuk syarat pembayaran sudah lunas. Perdebatan bulanan soal hitungan komisi berhenti karena semua bisa melihat rinciannya.',
          internalDescription:
            'Skema komisi (persentase bertingkat, per produk, berbasis margin), syarat pengakuan (SO atau lunas), periode pembayaran, clawback atas retur.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 6,
          keywords: ['komisi sales', 'insentif', 'bonus penjualan', 'hitung komisi'],
          sortOrder: 3,
        },
        {
          slug: 'wilayah-teritori-sales',
          name: 'Pembagian Wilayah & Teritori Sales',
          clientDescription:
            'Setiap sales punya wilayah atau daftar pelanggan yang menjadi tanggung jawabnya, dan hanya melihat data miliknya. Rebutan pelanggan antar sales berhenti karena batasnya jelas di sistem.',
          internalDescription:
            'Definisi teritori (geografis, segmen, atau named account), aturan visibilitas data, riwayat perpindahan akun, dampak ke perhitungan komisi.',
          type: 'CONFIGURABLE',
          manDayMin: 3.5,
          manDayMax: 5.5,
          keywords: ['teritori', 'wilayah sales', 'pembagian area', 'coverage'],
          sortOrder: 4,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 7. Hubungan tidak berhenti saat barang terkirim.
    // -----------------------------------------------------------------------
    {
      slug: 'layanan-purna-jual',
      name: 'Layanan Pelanggan & Purna Jual',
      description:
        'Penanganan keluhan, janji waktu tanggap, dan pengukuran kepuasan setelah pembelian.',
      icon: 'LifeBuoy',
      features: [
        {
          slug: 'tiket-layanan-purna-jual',
          name: 'Tiket Keluhan & Layanan Purna Jual',
          clientDescription:
            'Keluhan pelanggan tercatat sebagai tiket bernomor dengan penanggung jawab dan status yang jelas. Tidak ada lagi komplain yang menguap di grup WhatsApp lalu muncul kembali sebagai kemarahan.',
          internalDescription:
            'Entitas Ticket: kategori, prioritas, assignment, thread balasan, penggabungan tiket kembar, relasi ke Contact dan Sales Order.',
          type: 'STANDARD',
          manDayMin: 3.5,
          manDayMax: 4.5,
          keywords: ['tiket', 'keluhan', 'komplain', 'helpdesk', 'purna jual'],
          sortOrder: 1,
          seoTitle: 'Aplikasi Tiket Keluhan & Layanan Purna Jual Pelanggan',
          seoDescription:
            'Catat setiap keluhan sebagai tiket bernomor dengan penanggung jawab dan statusnya. Komplain pelanggan berhenti hilang di grup chat.',
        },
        {
          slug: 'basis-pengetahuan-solusi',
          name: 'Basis Pengetahuan Solusi',
          clientDescription:
            'Jawaban atas pertanyaan yang selalu berulang disimpan sebagai artikel yang bisa dicari tim maupun pelanggan. Staf baru bisa menjawab dengan benar sejak minggu pertama.',
          internalDescription:
            'Artikel dan kategori, pencarian, saran artikel dari isi tiket, versi dan status terbit, portal publik opsional.',
          type: 'STANDARD',
          manDayMin: 2.5,
          manDayMax: 3.2,
          keywords: ['basis pengetahuan', 'knowledge base', 'faq', 'panduan'],
          sortOrder: 2,
        },
        {
          slug: 'sla-eskalasi-tiket',
          name: 'Batas Waktu Tanggap & Eskalasi Tiket',
          clientDescription:
            'Setiap tiket punya batas waktu dijawab dan diselesaikan; yang melewati batas otomatis naik ke atasan. Janji layanan ke pelanggan jadi bisa dibuktikan, bukan sekadar diucapkan.',
          internalDescription:
            'Kebijakan SLA per prioritas, kalender jam kerja dan hari libur, jeda timer saat menunggu pelanggan, eskalasi bertingkat, laporan kepatuhan.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['sla', 'batas waktu', 'eskalasi', 'waktu respon'],
          sortOrder: 3,
        },
        {
          slug: 'survei-kepuasan-pelanggan',
          name: 'Survei Kepuasan Pelanggan',
          clientDescription:
            'Setelah tiket ditutup atau pesanan selesai, pelanggan diminta memberi nilai singkat. Anda tahu kepuasan sedang turun di bulan berjalan, bukan setahun kemudian saat mereka sudah pindah.',
          internalDescription:
            'Survei CSAT/NPS lewat tautan, pemicu berbasis event, agregasi skor per staf, produk, dan periode.',
          type: 'STANDARD',
          manDayMin: 2.5,
          manDayMax: 3.2,
          keywords: ['survei kepuasan', 'csat', 'nps', 'umpan balik pelanggan'],
          sortOrder: 4,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 8. Angka yang dibaca pemilik dan manajer.
    // -----------------------------------------------------------------------
    {
      slug: 'laporan-analitik',
      name: 'Laporan & Analitik',
      description:
        'Ringkasan kondisi penjualan yang bisa dibaca tanpa menagih rekap ke siapa pun.',
      icon: 'BarChart3',
      features: [
        {
          slug: 'laporan-corong-konversi',
          name: 'Laporan Corong Konversi',
          clientDescription:
            'Terlihat berapa prospek yang masuk, berapa yang lanjut ke penawaran, dan berapa yang menjadi order di setiap tahap. Kebocoran terbesar dalam proses penjualan Anda ketahuan letaknya.',
          internalDescription:
            'Funnel agregat per periode, sales, dan sumber; tingkat konversi antar stage; rata-rata durasi per stage; ekspor CSV.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          isEssential: true,
          keywords: ['corong', 'funnel', 'konversi', 'laporan penjualan'],
          sortOrder: 1,
          seoTitle: 'Laporan Corong Konversi Penjualan (Sales Funnel)',
          seoDescription:
            'Lihat berapa prospek yang lolos di tiap tahap penjualan dan di mana proses Anda paling banyak bocor, lengkap dengan rata-rata lama tiap tahap.',
        },
        {
          slug: 'laporan-alasan-kalah',
          name: 'Laporan Alasan Kalah',
          clientDescription:
            'Setiap prospek yang batal wajib diberi alasan, lalu dirangkum menjadi daftar penyebab terbesar. Anda tahu apakah masalahnya harga, kelengkapan produk, atau kecepatan merespons.',
          internalDescription:
            'Daftar alasan kalah terkontrol + catatan wajib saat stage Kalah, laporan pareto per periode, kompetitor, dan produk.',
          type: 'STANDARD',
          manDayMin: 2.5,
          manDayMax: 3.2,
          keywords: ['alasan kalah', 'lost reason', 'kalah tender', 'analisa kekalahan'],
          sortOrder: 2,
        },
        {
          slug: 'dasbor-eksekutif',
          name: 'Dasbor Eksekutif',
          clientDescription:
            'Satu halaman berisi angka penting hari ini: nilai pipeline, pencapaian target, dan prospek yang mandek. Pemilik tidak perlu meminta laporan ke siapa pun untuk tahu kondisi penjualan.',
          internalDescription:
            'Widget yang dapat disusun ulang, cache agregasi, filter periode dan tim, ekspor gambar atau PDF, akses terbatas per peran.',
          type: 'STANDARD',
          manDayMin: 3.5,
          manDayMax: 4.5,
          keywords: ['dashboard', 'dasbor', 'laporan pimpinan', 'ringkasan penjualan'],
          sortOrder: 3,
        },
        {
          slug: 'prakiraan-penjualan',
          name: 'Prakiraan Penjualan',
          clientDescription:
            'Sistem memperkirakan penjualan bulan depan dari nilai prospek yang sedang berjalan dan peluang menangnya. Rencana produksi dan arus kas bisa disiapkan lebih awal.',
          internalDescription:
            'Weighted pipeline forecast, kategori commit/best-case, snapshot mingguan, perbandingan prakiraan versus realisasi.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['forecast', 'prakiraan penjualan', 'proyeksi', 'perkiraan omzet'],
          sortOrder: 4,
        },
      ],
    },

    // -----------------------------------------------------------------------
    // 9. Penyambungan ke dunia luar dan pengaturan dasar aplikasi.
    // -----------------------------------------------------------------------
    {
      slug: 'integrasi-sistem',
      name: 'Integrasi & Pengaturan Sistem',
      description:
        'Penyambungan ke WhatsApp, email, dan akuntansi, ditambah pengaturan pengguna, hak akses, dan jejak audit.',
      icon: 'Plug',
      features: [
        {
          slug: 'integrasi-whatsapp-business',
          name: 'Integrasi WhatsApp Business API',
          clientDescription:
            'Percakapan WhatsApp dengan pelanggan masuk ke sistem dan menempel pada kontaknya, lalu bisa dibalas dari satu kotak masuk bersama. Riwayat obrolan tidak lagi terkunci di ponsel pribadi sales.',
          internalDescription:
            'Integrasi BSP/Cloud API, verifikasi nomor dan templat pesan, webhook pesan masuk, pemetaan percakapan ke Contact/Deal, kotak masuk multi-agen.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 6,
          keywords: ['whatsapp', 'wa business api', 'chat pelanggan', 'integrasi wa'],
          sortOrder: 1,
          seoTitle: 'Integrasi CRM dengan WhatsApp Business API',
          seoDescription:
            'Satukan percakapan WhatsApp pelanggan ke dalam CRM: pesan menempel pada kontaknya dan bisa dibalas dari satu kotak masuk bersama tim.',
        },
        {
          slug: 'integrasi-email-sales',
          name: 'Sinkronisasi Kotak Masuk Email Sales',
          clientDescription:
            'Email keluar-masuk antara sales dan pelanggan otomatis menempel pada catatan pelanggannya. Atasan bisa melihat riwayat korespondensi tanpa harus meminta diteruskan satu per satu.',
          internalDescription:
            'OAuth Gmail/Microsoft 365, sinkronisasi dua arah, pencocokan alamat ke Contact, filter privasi untuk email pribadi.',
          type: 'STANDARD',
          manDayMin: 3.5,
          manDayMax: 4.5,
          keywords: ['integrasi email', 'gmail', 'outlook', 'sinkron email'],
          sortOrder: 2,
        },
        {
          slug: 'pencatatan-email-bcc',
          name: 'Arsip Email lewat Alamat BCC',
          clientDescription:
            'Cukup masukkan satu alamat khusus di kolom BCC saat mengirim email, dan salinannya tersimpan di catatan pelanggan. Cara paling sederhana mengarsipkan email tanpa menyambungkan akun email tim.',
          internalDescription:
            'Inbound mail parser pada alamat khusus, pencocokan alamat ke Contact/Deal, penyimpanan lampiran, penanganan email tak dikenal.',
          type: 'STANDARD',
          manDayMin: 2.5,
          manDayMax: 3.2,
          keywords: ['arsip email', 'bcc', 'catat email', 'email masuk crm'],
          sortOrder: 3,
        },
        {
          slug: 'integrasi-akuntansi',
          name: 'Integrasi Akuntansi (Accurate / Jurnal)',
          clientDescription:
            'Pesanan yang sudah final dikirim ke sistem akuntansi menjadi invoice, dan status pembayarannya kembali terlihat di CRM. Tim sales tahu pelanggan mana yang menunggak tanpa perlu bertanya ke keuangan.',
          internalDescription:
            'Konektor Accurate Online / Mekari Jurnal, pemetaan master (produk, pelanggan, pajak), antrean dengan retry, rekonsiliasi status pembayaran.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 6,
          keywords: ['accurate', 'jurnal', 'integrasi akuntansi', 'invoice', 'piutang'],
          sortOrder: 4,
          seoTitle: 'Integrasi CRM dengan Accurate & Mekari Jurnal',
          seoDescription:
            'Kirim order dari CRM ke Accurate atau Jurnal menjadi invoice, lalu tarik kembali status pembayarannya. Sales tahu siapa yang menunggak tanpa bertanya ke keuangan.',
        },
        {
          slug: 'api-terbuka',
          name: 'API Terbuka untuk Sistem Lain',
          clientDescription:
            'Sistem lain milik Anda — website, ERP, atau aplikasi gudang — bisa mengambil dan mengirim data pelanggan secara otomatis. Data tidak perlu diketik dua kali di dua aplikasi berbeda.',
          internalDescription:
            'REST API dengan API key/OAuth, rate limit per klien, webhook keluar, dokumentasi OpenAPI, lingkungan sandbox.',
          type: 'CONFIGURABLE',
          manDayMin: 3.5,
          manDayMax: 5.5,
          keywords: ['api', 'integrasi sistem', 'webhook', 'hubungkan aplikasi'],
          sortOrder: 5,
        },
        {
          slug: 'manajemen-pengguna-tim',
          name: 'Manajemen Pengguna & Struktur Tim',
          clientDescription:
            'Tambah atau nonaktifkan akun sales sendiri, lengkap dengan siapa atasannya. Saat ada yang keluar, aksesnya tertutup hari itu juga tetapi datanya tetap tinggal di perusahaan.',
          internalDescription:
            'CRUD pengguna, undangan lewat email, hierarki atasan-bawahan, status aktif/nonaktif, reset kata sandi, manajemen sesi.',
          type: 'CORE',
          manDayMin: 3,
          manDayMax: 3.4,
          keywords: ['pengguna', 'user', 'tim sales', 'akun'],
          sortOrder: 6,
        },
        {
          slug: 'hak-akses-peran',
          name: 'Hak Akses Berdasarkan Peran',
          clientDescription:
            'Setiap peran hanya melihat dan mengubah data yang menjadi urusannya — sales melihat pelanggannya, manajer melihat timnya. Harga modal dan data seluruh perusahaan tidak terbuka untuk semua orang.',
          internalDescription:
            'RBAC peran dengan permission granular per modul dan aksi, aturan cakupan data (own/team/all), pembatasan field sensitif.',
          type: 'CORE',
          manDayMin: 3.2,
          manDayMax: 3.6,
          keywords: ['hak akses', 'role', 'permission', 'keamanan data'],
          sortOrder: 7,
        },
        {
          slug: 'riwayat-perubahan-audit',
          name: 'Riwayat Perubahan Data',
          clientDescription:
            'Setiap perubahan penting tercatat: siapa mengubah apa, dari nilai berapa menjadi berapa, dan kapan. Saat ada data yang janggal, penyebabnya bisa ditelusuri, bukan sekadar diperdebatkan.',
          internalDescription:
            'Audit trail append-only pada entitas kunci, diff nilai lama/baru, filter per pengguna, entitas, dan periode, kebijakan retensi.',
          type: 'CORE',
          manDayMin: 2.5,
          manDayMax: 2.8,
          keywords: ['audit log', 'riwayat perubahan', 'jejak data', 'siapa mengubah'],
          sortOrder: 8,
        },
        {
          slug: 'notifikasi-dalam-aplikasi',
          name: 'Notifikasi & Kotak Masuk Tugas',
          clientDescription:
            'Semua hal yang perlu ditindaklanjuti hari ini berkumpul di satu kotak masuk, mulai dari pengingat sampai permintaan persetujuan. Tim tidak perlu mengecek beberapa tempat untuk tahu apa yang harus dikerjakan.',
          internalDescription:
            'Notification center in-app, preferensi kanal per jenis notifikasi, rangkuman harian, tandai selesai, deep link ke objek terkait.',
          type: 'CORE',
          manDayMin: 2.5,
          manDayMax: 2.8,
          keywords: ['notifikasi', 'tugas harian', 'pemberitahuan', 'kotak masuk'],
          sortOrder: 9,
        },
      ],
    },
  ],

  /**
   * Dependensi antar fitur.
   *
   * Catatan penting:
   * - Tidak ada fitur CORE yang menjadi sumber REQUIRES, karena CORE selalu
   *   ikut terpasang sehingga aturannya tidak pernah berguna.
   * - Graf REQUIRES sengaja berbentuk pohon menuju empat simpul akhir
   *   (pipeline-kanban-tahap, penawaran-quotation-penomoran,
   *   tiket-layanan-purna-jual, label-segmentasi-pelanggan) agar dijamin
   *   tidak melingkar.
   */
  dependencies: [
    // --- Segala sesuatu yang membaca pergerakan tahap ---
    {
      feature: 'penilaian-prospek-otomatis',
      target: 'pipeline-kanban-tahap',
      kind: 'REQUIRES',
      note: 'Nilai prospek dihitung dari pergerakan antar tahap, jadi Papan Pipeline ikut ditambahkan.',
    },
    {
      feature: 'laporan-corong-konversi',
      target: 'pipeline-kanban-tahap',
      kind: 'REQUIRES',
      note: 'Corong konversi adalah tahapan pipeline Anda sendiri, jadi Papan Pipeline ikut ditambahkan.',
    },
    {
      feature: 'laporan-alasan-kalah',
      target: 'pipeline-kanban-tahap',
      kind: 'REQUIRES',
      note: 'Alasan kalah dicatat saat prospek dipindahkan ke tahap Kalah, jadi Papan Pipeline ikut ditambahkan.',
    },
    {
      feature: 'prakiraan-penjualan',
      target: 'pipeline-kanban-tahap',
      kind: 'REQUIRES',
      note: 'Prakiraan dihitung dari nilai prospek dan peluang menang di tiap tahap, jadi Papan Pipeline ikut ditambahkan.',
    },
    {
      feature: 'dasbor-eksekutif',
      target: 'laporan-corong-konversi',
      kind: 'REQUIRES',
      note: 'Dasbor menampilkan ringkasan corong konversi, jadi laporannya ikut ditambahkan.',
    },

    // --- Segala sesuatu yang menempel pada dokumen penawaran ---
    {
      feature: 'templat-dokumen-penawaran',
      target: 'penawaran-quotation-penomoran',
      kind: 'REQUIRES',
      note: 'Templat hanya berguna bila ada dokumen penawaran yang memakainya, jadi Penawaran Harga ikut ditambahkan.',
    },
    {
      feature: 'persetujuan-diskon-berjenjang',
      target: 'penawaran-quotation-penomoran',
      kind: 'REQUIRES',
      note: 'Diskon yang disetujui melekat pada dokumen penawaran, jadi Penawaran Harga ikut ditambahkan.',
    },
    {
      feature: 'persetujuan-penawaran-online',
      target: 'penawaran-quotation-penomoran',
      kind: 'REQUIRES',
      note: 'Yang dikirimkan ke pelanggan untuk disetujui adalah dokumen penawaran, jadi Penawaran Harga ikut ditambahkan.',
    },
    {
      feature: 'sales-order-dari-penawaran',
      target: 'penawaran-quotation-penomoran',
      kind: 'REQUIRES',
      note: 'Pesanan dibentuk dari penawaran yang disetujui, jadi Penawaran Harga ikut ditambahkan.',
    },
    {
      feature: 'perhitungan-komisi-sales',
      target: 'sales-order-dari-penawaran',
      kind: 'REQUIRES',
      note: 'Komisi dihitung dari pesanan yang benar-benar terjadi, jadi Sales Order ikut ditambahkan.',
    },
    {
      feature: 'integrasi-akuntansi',
      target: 'sales-order-dari-penawaran',
      kind: 'REQUIRES',
      note: 'Yang dikirim ke sistem akuntansi adalah pesanan penjualan, jadi Sales Order ikut ditambahkan.',
    },

    // --- Master data pendukung ---
    {
      feature: 'daftar-harga-per-segmen',
      target: 'label-segmentasi-pelanggan',
      kind: 'REQUIRES',
      note: 'Harga khusus perlu tahu pelanggan masuk golongan mana, jadi Label & Segmentasi Pelanggan ikut ditambahkan.',
    },

    // --- Layanan purna jual ---
    {
      feature: 'sla-eskalasi-tiket',
      target: 'tiket-layanan-purna-jual',
      kind: 'REQUIRES',
      note: 'Batas waktu tanggap dihitung pada tiket, jadi Tiket Keluhan ikut ditambahkan.',
    },

    // --- Pemasaran & lapangan ---
    {
      feature: 'kampanye-email-blast-wa',
      target: 'daftar-target-kampanye',
      kind: 'REQUIRES',
      note: 'Kampanye membutuhkan daftar penerima yang jelas, jadi Daftar Target Kampanye ikut ditambahkan.',
    },
    {
      feature: 'pencatatan-kunjungan-lokasi',
      target: 'aplikasi-mobile-sales',
      kind: 'REQUIRES',
      note: 'Titik lokasi dan foto kunjungan diambil dari ponsel sales, jadi Aplikasi Mobile ikut ditambahkan.',
    },

    // --- Saran halus, tidak otomatis ditambahkan ---
    {
      feature: 'tiket-layanan-purna-jual',
      target: 'basis-pengetahuan-solusi',
      kind: 'RECOMMENDS',
      note: 'Sebagian besar tiket berisi pertanyaan yang sama berulang kali. Basis Pengetahuan membuat staf baru bisa menjawabnya sendiri.',
    },
    {
      feature: 'kampanye-email-blast-wa',
      target: 'integrasi-whatsapp-business',
      kind: 'RECOMMENDS',
      note: 'Blast WhatsApp lewat jalur resmi jauh lebih aman dari risiko pemblokiran nomor dibanding kirim manual dari ponsel.',
    },
    {
      feature: 'target-pencapaian-sales',
      target: 'wilayah-teritori-sales',
      kind: 'RECOMMENDS',
      note: 'Target biasanya lebih adil bila dibagi per wilayah, bukan hanya per orang.',
    },

    // --- Konflik: dua cara berbeda untuk pekerjaan yang sama ---
    {
      feature: 'penandaan-prioritas-manual',
      target: 'penilaian-prospek-otomatis',
      kind: 'CONFLICTS_WITH',
      note: 'Penandaan manual dan penilaian otomatis sama-sama mengisi kolom prioritas prospek. Pilih salah satu agar tim tidak melihat dua nilai yang saling bertentangan.',
    },
    {
      feature: 'pencatatan-email-bcc',
      target: 'integrasi-email-sales',
      kind: 'CONFLICTS_WITH',
      note: 'Arsip lewat BCC dan sinkronisasi kotak masuk mengarsipkan email yang sama. Pilih salah satu supaya riwayat percakapan tidak tersimpan dua kali.',
    },
  ],

  /**
   * Preset. Ketiganya sudah konsisten dengan dependensi REQUIRES di atas —
   * bila memuat fitur X, seluruh prasyarat X ikut tercantum.
   */
  presets: [
    {
      slug: 'crm-starter',
      name: 'CRM Starter',
      tagline: 'Keluar dari Excel tanpa membuat tim kewalahan.',
      description:
        'Fondasi paling ringkas: satu papan pipeline bersama, pengingat tindak lanjut, penawaran bernomor, dan laporan corong konversi. Cukup untuk menghentikan prospek yang hilang di grup WhatsApp.',
      bestFor: [
        'Tim sales 3–7 orang yang masih dipantau langsung oleh pemilik.',
        'Perusahaan yang seluruh datanya kini tersebar di Excel dan chat.',
        'Yang ingin cepat berjalan lebih dulu, lalu menambah fitur belakangan.',
      ],
      features: [
        // Seluruh fitur CORE
        'data-kontak-pelanggan',
        'katalog-produk-harga',
        'data-prospek-deal',
        'catatan-aktivitas-sales',
        'manajemen-pengguna-tim',
        'hak-akses-peran',
        'riwayat-perubahan-audit',
        'notifikasi-dalam-aplikasi',
        // Fitur inti yang membuat CRM masuk akal
        'pipeline-kanban-tahap',
        'pengingat-follow-up-otomatis',
        'penawaran-quotation-penomoran',
        'sales-order-dari-penawaran',
        'laporan-corong-konversi',
        'impor-kontak-excel',
      ],
    },
    {
      slug: 'crm-growth',
      name: 'CRM Growth',
      tagline: 'Untuk tim yang sudah punya supervisor dan target bulanan.',
      description:
        'Menambahkan sales lapangan, pembagian wilayah, harga per segmen, dan laporan alasan kalah. Pilihan paling umum untuk perusahaan yang penjualannya sudah harus diukur, bukan sekadar dijalankan.',
      isDefault: true,
      bestFor: [
        'Tim sales 8–20 orang dengan supervisor dan target per bulan.',
        'Perusahaan dengan sales lapangan yang perlu melapor dari ponsel.',
        'Yang menjual ke beberapa golongan pelanggan dengan harga berbeda.',
        'Pemilik yang ingin tahu penyebab kekalahan, bukan hanya jumlahnya.',
      ],
      features: [
        // Seluruh fitur CORE
        'data-kontak-pelanggan',
        'katalog-produk-harga',
        'data-prospek-deal',
        'catatan-aktivitas-sales',
        'manajemen-pengguna-tim',
        'hak-akses-peran',
        'riwayat-perubahan-audit',
        'notifikasi-dalam-aplikasi',
        // Fitur yang perlu penyesuaian alur
        'pipeline-kanban-tahap',
        'pengingat-follow-up-otomatis',
        'daftar-harga-per-segmen',
        'wilayah-teritori-sales',
        // Fitur standar
        'impor-kontak-excel',
        'label-segmentasi-pelanggan',
        'distribusi-prospek-otomatis',
        'pelacakan-sumber-prospek',
        'formulir-web-penangkap-prospek',
        'agenda-jadwal-kunjungan',
        'aplikasi-mobile-sales',
        'pencatatan-kunjungan-lokasi',
        'penawaran-quotation-penomoran',
        'templat-dokumen-penawaran',
        'sales-order-dari-penawaran',
        'target-pencapaian-sales',
        'laporan-corong-konversi',
        'laporan-alasan-kalah',
      ],
    },
    {
      slug: 'crm-enterprise',
      name: 'CRM Enterprise',
      tagline: 'Seluruh katalog, dari prospek pertama sampai keluhan terakhir.',
      description:
        'Hampir semua fitur katalog: komisi, persetujuan diskon, layanan purna jual dengan janji waktu tanggap, kampanye, prakiraan penjualan, serta sambungan ke WhatsApp, email, dan akuntansi. Dua fitur versi ringan sengaja tidak diikutkan karena sudah digantikan versi otomatisnya.',
      bestFor: [
        'Tim sales 21–50 orang yang tersebar di beberapa kota.',
        'Perusahaan dengan skema komisi dan batas diskon yang berjenjang.',
        'Yang layanan purna jualnya terikat janji waktu tanggap ke pelanggan.',
        'Yang ingin CRM tersambung ke Accurate atau Jurnal dan sistem internal lain.',
      ],
      features: [
        // Seluruh fitur CORE
        'data-kontak-pelanggan',
        'katalog-produk-harga',
        'data-prospek-deal',
        'catatan-aktivitas-sales',
        'manajemen-pengguna-tim',
        'hak-akses-peran',
        'riwayat-perubahan-audit',
        'notifikasi-dalam-aplikasi',
        // Seluruh fitur yang perlu penyesuaian alur
        'daftar-harga-per-segmen',
        'pipeline-kanban-tahap',
        'penilaian-prospek-otomatis',
        'pengingat-follow-up-otomatis',
        'persetujuan-diskon-berjenjang',
        'perhitungan-komisi-sales',
        'wilayah-teritori-sales',
        'integrasi-whatsapp-business',
        'integrasi-akuntansi',
        'api-terbuka',
        // Fitur standar
        'label-segmentasi-pelanggan',
        'impor-kontak-excel',
        'distribusi-prospek-otomatis',
        'pelacakan-sumber-prospek',
        'formulir-web-penangkap-prospek',
        'kampanye-email-blast-wa',
        'daftar-target-kampanye',
        'agenda-jadwal-kunjungan',
        'pencatatan-kunjungan-lokasi',
        'aplikasi-mobile-sales',
        'penawaran-quotation-penomoran',
        'templat-dokumen-penawaran',
        'persetujuan-penawaran-online',
        'sales-order-dari-penawaran',
        'target-pencapaian-sales',
        'tiket-layanan-purna-jual',
        'basis-pengetahuan-solusi',
        'sla-eskalasi-tiket',
        'survei-kepuasan-pelanggan',
        'laporan-corong-konversi',
        'laporan-alasan-kalah',
        'dasbor-eksekutif',
        'prakiraan-penjualan',
        'integrasi-email-sales',
      ],
    },
  ],

  /**
   * Wizard. Seluruh pertanyaan berbicara tentang kondisi bisnis, bukan
   * teknologi. Setiap `reason` ditulis sebagai lanjutan kalimat
   * "Direkomendasikan karena …" yang akan dibaca klien.
   */
  wizard: [
    {
      slug: 'ukuran-tim-sales',
      question: 'Berapa orang yang ada di tim penjualan Anda?',
      helpText: 'Hitung sales lapangan, telesales, dan supervisor yang ikut mengejar target.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'tim-3-7',
          label: '3 – 7 orang',
          description: 'Satu tim kecil, biasanya masih dipantau langsung oleh pemilik.',
          icon: 'User',
          suggestPresetSlug: 'crm-starter',
          maps: [
            {
              feature: 'pipeline-kanban-tahap',
              reason: 'tim sekecil ini lebih butuh satu papan bersama ketimbang file terpisah per orang.',
            },
            {
              feature: 'pengingat-follow-up-otomatis',
              reason: 'dengan tim kecil, satu prospek yang terlupa langsung terasa di angka bulanan.',
            },
            {
              feature: 'penawaran-quotation-penomoran',
              reason: 'penawaran keluar dari beberapa orang sekaligus dan nomornya harus tetap rapi.',
            },
          ],
        },
        {
          slug: 'tim-8-20',
          label: '8 – 20 orang',
          description: 'Sudah ada supervisor dan pembagian tanggung jawab.',
          icon: 'Users',
          suggestPresetSlug: 'crm-growth',
          maps: [
            {
              feature: 'target-pencapaian-sales',
              reason: 'tim sebesar ini perlu target per orang yang pencapaiannya terhitung sendiri.',
            },
            {
              feature: 'wilayah-teritori-sales',
              reason: 'dengan sales sebanyak itu, batas tanggung jawab pelanggan perlu ditegaskan di sistem.',
            },
            {
              feature: 'distribusi-prospek-otomatis',
              reason: 'prospek masuk terlalu sering untuk dibagikan manual oleh supervisor.',
            },
            {
              feature: 'laporan-corong-konversi',
              reason: 'supervisor perlu tahu di tahap mana timnya paling banyak kehilangan prospek.',
            },
          ],
        },
        {
          slug: 'tim-21-50',
          label: '21 – 50 orang',
          description: 'Beberapa tim, sering tersebar di lebih dari satu kota.',
          icon: 'Building2',
          suggestPresetSlug: 'crm-enterprise',
          maps: [
            {
              feature: 'wilayah-teritori-sales',
              reason: 'tim sebesar ini bekerja di beberapa wilayah yang perlu batas dan kepemilikan yang jelas.',
            },
            {
              feature: 'perhitungan-komisi-sales',
              reason: 'menghitung komisi puluhan orang secara manual setiap bulan sudah tidak masuk akal.',
            },
            {
              feature: 'persetujuan-diskon-berjenjang',
              reason: 'diskon dari puluhan sales perlu batas dan penyetuju agar margin tetap terjaga.',
            },
            {
              feature: 'dasbor-eksekutif',
              reason: 'pimpinan perlu satu halaman ringkasan tanpa menagih laporan ke tiap tim.',
            },
            {
              feature: 'prakiraan-penjualan',
              reason: 'perusahaan sebesar ini menyiapkan produksi dan arus kas dari perkiraan, bukan tebakan.',
            },
          ],
        },
      ],
    },
    {
      slug: 'model-penjualan',
      question: 'Bagaimana pola penjualan Anda?',
      helpText: 'Yang dimaksud adalah berapa lama biasanya dari kenal sampai pembelian terjadi.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'b2b-siklus-panjang',
          label: 'B2B, butuh berminggu-minggu sampai berbulan-bulan',
          description: 'Ada survei, presentasi, negosiasi, dan beberapa pengambil keputusan.',
          icon: 'Briefcase',
          maps: [
            {
              feature: 'pipeline-kanban-tahap',
              reason: 'siklus panjang perlu tahap yang jelas supaya ketahuan prospek mandek di mana.',
            },
            {
              feature: 'templat-dokumen-penawaran',
              reason: 'penjualan B2B menuntut dokumen penawaran yang seragam dan pantas dilihat pembeli korporat.',
            },
            {
              feature: 'persetujuan-penawaran-online',
              reason: 'pembeli korporat sering butuh waktu membaca, dan Anda perlu tahu kapan dokumennya dibuka.',
            },
            {
              feature: 'laporan-alasan-kalah',
              reason: 'dalam siklus panjang, memahami penyebab kekalahan lebih berharga daripada mengejar prospek baru.',
            },
            {
              feature: 'prakiraan-penjualan',
              reason: 'penjualan bernilai besar perlu diperkirakan lebih awal agar produksi dan kas siap.',
            },
          ],
        },
        {
          slug: 'b2c-cepat',
          label: 'B2C, keputusan cepat dalam hitungan hari',
          description: 'Volume prospek tinggi, yang menang biasanya yang paling cepat membalas.',
          icon: 'Zap',
          maps: [
            {
              feature: 'distribusi-prospek-otomatis',
              reason: 'pembeli B2C memilih yang membalas duluan, jadi prospek tidak boleh menunggu dibagikan.',
            },
            {
              feature: 'penandaan-prioritas-manual',
              reason: 'dengan volume tinggi, cara tercepat memilah antrean adalah penandaan tiga tingkat.',
            },
            {
              feature: 'integrasi-whatsapp-business',
              reason: 'pembeli ritel di Indonesia hampir selalu memulai percakapan lewat WhatsApp.',
            },
            {
              feature: 'kampanye-email-blast-wa',
              reason: 'penjualan cepat sangat terbantu oleh penawaran massal yang terjadwal.',
            },
          ],
        },
        {
          slug: 'b2b-dan-b2c',
          label: 'Keduanya berjalan bersamaan',
          description: 'Ada pelanggan korporat besar sekaligus pembeli eceran.',
          icon: 'Shuffle',
          maps: [
            {
              feature: 'pipeline-kanban-tahap',
              reason: 'dua pola penjualan memerlukan dua rangkaian tahap yang berbeda dalam satu sistem.',
            },
            {
              feature: 'daftar-harga-per-segmen',
              reason: 'pelanggan korporat dan pembeli eceran tidak mungkin memakai daftar harga yang sama.',
            },
            {
              feature: 'label-segmentasi-pelanggan',
              reason: 'dua jenis pelanggan perlu dipisahkan agar laporan dan kampanyenya tidak tercampur.',
            },
            {
              feature: 'penilaian-prospek-otomatis',
              reason: 'dengan dua jenis prospek sekaligus, tim butuh bantuan memutuskan siapa yang dikejar duluan.',
            },
          ],
        },
      ],
    },
    {
      slug: 'lokasi-kerja-sales',
      question: 'Tim sales Anda lebih banyak bekerja di mana?',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'lapangan',
          label: 'Di lapangan, mendatangi pelanggan',
          description: 'Kunjungan toko, survei lokasi, atau canvassing harian.',
          icon: 'MapPin',
          maps: [
            {
              feature: 'aplikasi-mobile-sales',
              reason: 'sales Anda lebih sering di jalan daripada di depan komputer.',
            },
            {
              feature: 'pencatatan-kunjungan-lokasi',
              reason: 'hasil kunjungan perlu dicatat di lokasi, lengkap dengan bukti titik peta dan foto.',
            },
            {
              feature: 'agenda-jadwal-kunjungan',
              reason: 'rute harian tim lapangan perlu direncanakan sebelum berangkat, bukan didadakan.',
            },
            {
              feature: 'wilayah-teritori-sales',
              reason: 'sales lapangan bekerja per area, jadi batas wilayahnya perlu ditetapkan.',
            },
          ],
        },
        {
          slug: 'kantor',
          label: 'Di kantor, lewat telepon dan chat',
          description: 'Prospek dilayani jarak jauh tanpa kunjungan fisik.',
          icon: 'Headphones',
          maps: [
            {
              feature: 'integrasi-whatsapp-business',
              reason: 'sebagian besar percakapan tim Anda terjadi di chat dan perlu tersimpan di satu tempat.',
            },
            {
              feature: 'integrasi-email-sales',
              reason: 'korespondensi email dengan pelanggan perlu menempel otomatis pada catatannya.',
            },
            {
              feature: 'distribusi-prospek-otomatis',
              reason: 'tim kantor menangani antrean masuk yang perlu dibagikan begitu prospek datang.',
            },
            {
              feature: 'pengingat-follow-up-otomatis',
              reason: 'pekerjaan berbasis antrean paling rawan kehilangan prospek karena lupa menagih balik.',
            },
          ],
        },
        {
          slug: 'campuran',
          label: 'Sebagian lapangan, sebagian kantor',
          description: 'Ada tim kunjungan sekaligus tim yang melayani dari kantor.',
          icon: 'Split',
          maps: [
            {
              feature: 'aplikasi-mobile-sales',
              reason: 'sebagian tim Anda perlu mengakses data pelanggan dari ponsel saat di luar kantor.',
            },
            {
              feature: 'agenda-jadwal-kunjungan',
              reason: 'jadwal kunjungan dan tugas kantor perlu terlihat dalam satu kalender yang sama.',
            },
            {
              feature: 'pengingat-follow-up-otomatis',
              reason: 'serah terima antara tim kantor dan tim lapangan rawan terputus tanpa pengingat.',
            },
          ],
        },
      ],
    },
    {
      slug: 'kanal-prospek',
      question: 'Prospek Anda paling sering datang dari mana?',
      helpText: 'Boleh pilih lebih dari satu.',
      inputType: 'MULTI',
      options: [
        {
          slug: 'kanal-whatsapp',
          label: 'Chat WhatsApp',
          icon: 'MessageCircle',
          maps: [
            {
              feature: 'integrasi-whatsapp-business',
              reason: 'prospek Anda datang lewat WhatsApp dan percakapannya perlu tersimpan di luar ponsel sales.',
            },
            {
              feature: 'distribusi-prospek-otomatis',
              reason: 'chat masuk perlu langsung punya penanggung jawab agar tidak menganggur di grup.',
            },
            {
              feature: 'pelacakan-sumber-prospek',
              reason: 'perlu diketahui chat mana yang berasal dari iklan dan mana dari referensi.',
            },
          ],
        },
        {
          slug: 'kanal-website',
          label: 'Website atau media sosial',
          icon: 'Globe',
          maps: [
            {
              feature: 'formulir-web-penangkap-prospek',
              reason: 'pengunjung website Anda perlu jalur mengisi data yang langsung masuk ke sistem.',
            },
            {
              feature: 'pelacakan-sumber-prospek',
              reason: 'prospek dari kanal digital perlu ditandai asalnya agar belanja iklan bisa dinilai.',
            },
            {
              feature: 'api-terbuka',
              reason: 'website Anda perlu jalur resmi untuk mengirim data prospek ke CRM.',
            },
          ],
        },
        {
          slug: 'kanal-pameran-referensi',
          label: 'Pameran, komunitas, dan referensi',
          icon: 'Users',
          maps: [
            {
              feature: 'impor-kontak-excel',
              reason: 'kontak dari pameran biasanya terkumpul dulu sebagai daftar sebelum masuk sistem.',
            },
            {
              feature: 'label-segmentasi-pelanggan',
              reason: 'prospek dari acara perlu ditandai asal acaranya agar bisa ditindaklanjuti berkelompok.',
            },
            {
              feature: 'penilaian-prospek-otomatis',
              reason: 'daftar dari pameran bercampur antara yang serius dan yang sekadar mampir.',
            },
          ],
        },
        {
          slug: 'kanal-telepon-email',
          label: 'Telepon dan email masuk',
          icon: 'Mail',
          maps: [
            {
              feature: 'integrasi-email-sales',
              reason: 'email masuk dari pelanggan perlu menempel otomatis pada catatan kontaknya.',
            },
            {
              feature: 'distribusi-prospek-otomatis',
              reason: 'permintaan yang masuk lewat telepon dan email perlu segera punya penanggung jawab.',
            },
          ],
        },
        {
          slug: 'kanal-iklan-digital',
          label: 'Iklan berbayar',
          icon: 'Target',
          maps: [
            {
              feature: 'formulir-web-penangkap-prospek',
              reason: 'halaman iklan Anda perlu formulir yang langsung membuat prospek di sistem.',
            },
            {
              feature: 'pelacakan-sumber-prospek',
              reason: 'setiap rupiah iklan perlu bisa ditelusuri sampai ke penjualan yang dihasilkannya.',
            },
            {
              feature: 'laporan-corong-konversi',
              reason: 'prospek dari iklan berjumlah besar sehingga tingkat konversinya harus diukur.',
            },
            {
              feature: 'penilaian-prospek-otomatis',
              reason: 'prospek dari iklan kualitasnya sangat beragam dan perlu disaring lebih dulu.',
            },
          ],
        },
      ],
    },
    {
      slug: 'layanan-purna-jual',
      question: 'Setelah pembelian, seberapa sering pelanggan menghubungi Anda lagi?',
      helpText: 'Misalnya untuk klaim garansi, bantuan pemakaian, atau keluhan pengiriman.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'purna-sering',
          label: 'Sering — garansi, klaim, atau bantuan teknis',
          description: 'Ada tim atau orang khusus yang menangani keluhan.',
          icon: 'LifeBuoy',
          maps: [
            {
              feature: 'tiket-layanan-purna-jual',
              reason: 'keluhan yang sering datang perlu bernomor dan berpenanggung jawab agar tidak terlewat.',
            },
            {
              feature: 'sla-eskalasi-tiket',
              reason: 'volume keluhan sebanyak itu perlu batas waktu tanggap supaya tidak menumpuk diam-diam.',
            },
            {
              feature: 'basis-pengetahuan-solusi',
              reason: 'sebagian besar keluhan berulang dan jawabannya sebaiknya disimpan sekali saja.',
            },
            {
              feature: 'survei-kepuasan-pelanggan',
              reason: 'dengan interaksi purna jual sesering itu, kepuasan pelanggan perlu diukur rutin.',
            },
          ],
        },
        {
          slug: 'purna-sesekali',
          label: 'Sesekali saja',
          description: 'Keluhan masuk, tetapi tidak setiap hari.',
          icon: 'MessageSquare',
          maps: [
            {
              feature: 'tiket-layanan-purna-jual',
              reason: 'walau tidak setiap hari, keluhan yang masuk tetap perlu tercatat dan tertutup rapi.',
            },
            {
              feature: 'basis-pengetahuan-solusi',
              reason: 'pertanyaan yang jarang justru paling sering dijawab keliru bila tidak ada rujukannya.',
            },
          ],
        },
        {
          slug: 'purna-hampir-tidak',
          label: 'Hampir tidak pernah',
          description: 'Setelah barang diterima, hubungan biasanya selesai.',
          icon: 'CheckCircle',
          maps: [
            {
              feature: 'survei-kepuasan-pelanggan',
              reason: 'tanpa keluhan yang masuk, satu-satunya cara tahu pelanggan puas adalah menanyakannya.',
            },
            {
              feature: 'kampanye-email-blast-wa',
              reason: 'penjualan berulang lebih bergantung pada penawaran ulang ketimbang layanan purna jual.',
            },
          ],
        },
      ],
    },
    {
      slug: 'sistem-sekarang',
      question: 'Sekarang data pelanggan Anda tersimpan di mana?',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'excel-sheets',
          label: 'File Excel dan Google Sheets',
          description: 'Beberapa file, sering ada versi berbeda antar orang.',
          icon: 'Table',
          maps: [
            {
              feature: 'impor-kontak-excel',
              reason: 'data Anda sudah berbentuk tabel dan bisa dipindahkan sekaligus, bukan diketik ulang.',
            },
            {
              feature: 'pipeline-kanban-tahap',
              reason: 'spreadsheet tidak pernah menunjukkan prospek mana yang mandek dan sudah berapa lama.',
            },
            {
              feature: 'laporan-corong-konversi',
              reason: 'rekap manual dari banyak file selalu terlambat dan angkanya sering tidak cocok.',
            },
          ],
        },
        {
          slug: 'whatsapp-buku-catatan',
          label: 'Grup WhatsApp dan buku catatan',
          description: 'Belum ada satu tempat resmi untuk menyimpan data pelanggan.',
          icon: 'NotebookPen',
          maps: [
            {
              feature: 'integrasi-whatsapp-business',
              reason: 'riwayat pelanggan Anda kini ada di chat dan perlu dipindahkan ke tempat yang aman.',
            },
            {
              feature: 'aplikasi-mobile-sales',
              reason: 'tim yang terbiasa bekerja dari ponsel akan menolak sistem yang hanya bisa dibuka di komputer.',
            },
            {
              feature: 'pengingat-follow-up-otomatis',
              reason: 'tanpa tempat pencatatan resmi, tindak lanjut hanya mengandalkan ingatan.',
            },
            {
              feature: 'impor-kontak-excel',
              reason: 'kontak yang masih tercecer perlu dikumpulkan sekali lalu diunggah bersamaan.',
            },
          ],
        },
        {
          slug: 'crm-lain',
          label: 'Sudah pakai CRM lain, tetapi tidak cocok',
          description: 'Alurnya kaku atau terlalu rumit untuk cara kerja tim.',
          icon: 'RefreshCw',
          maps: [
            {
              feature: 'pipeline-kanban-tahap',
              reason: 'CRM sebelumnya memaksakan tahap bawaan, sedangkan tahap Anda perlu bisa diatur sendiri.',
            },
            {
              feature: 'daftar-harga-per-segmen',
              reason: 'aturan harga perusahaan Anda biasanya bagian yang paling sulit dipaksakan ke sistem jadi.',
            },
            {
              feature: 'impor-kontak-excel',
              reason: 'data dari sistem lama perlu dipindahkan lewat ekspor tabel.',
            },
            {
              feature: 'api-terbuka',
              reason: 'agar tidak terkunci lagi, sistem baru perlu jalur resmi untuk bertukar data.',
            },
          ],
        },
        {
          slug: 'sistem-akuntansi',
          label: 'Sistem akuntansi seperti Accurate atau Jurnal',
          description: 'Data pelanggan menumpang di aplikasi keuangan.',
          icon: 'Calculator',
          maps: [
            {
              feature: 'integrasi-akuntansi',
              reason: 'pesanan dan status pembayaran perlu tetap mengalir ke sistem akuntansi yang sudah Anda pakai.',
            },
            {
              feature: 'sales-order-dari-penawaran',
              reason: 'agar tidak ada pengetikan ulang, pesanan perlu terbentuk dari penawaran yang disetujui.',
            },
            {
              feature: 'api-terbuka',
              reason: 'penyambungan dua sistem berjalan paling mulus bila tersedia jalur pertukaran data resmi.',
            },
          ],
        },
      ],
    },
  ],
};
