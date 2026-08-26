import type { CatalogDefinition } from './types';

/**
 * Katalog kategori POS — Aplikasi Kasir & Manajemen Toko/Outlet.
 *
 * Sasaran pengguna: pemilik ritel, F&B, atau apotek dengan 1–20 outlet.
 * Ada dua orang yang harus dilayani sekaligus oleh katalog ini — kasir yang
 * butuh layar cepat dan sederhana, serta pemilik yang ingin tahu kondisi tiap
 * outlet tanpa datang ke lokasi. Karena itu seluruh nama fitur ditulis dalam
 * bahasa operasional toko, bukan bahasa developer (Prinsip Produk #4).
 *
 * Catatan man-day (BR-18): manDayMin/manDayMax adalah MAN-DAY REFERENSI —
 * effort seandainya fitur dibangun dari nol, bukan effort aktual tim.
 * Batas lebar rentang mengikuti BASELINE_PRICING_RULE:
 *   CORE ≤ 1,15x — STANDARD ≤ 1,30x — CONFIGURABLE ≤ 1,80x.
 */
export const POS_CATALOG: CatalogDefinition = {
  slug: 'pos',
  name: 'POS — Aplikasi Kasir & Manajemen Outlet',
  shortName: 'POS',
  icon: 'Store',
  accent: 'emerald',

  tagline: 'Kasir yang cepat di depan, angka yang jelas di belakang.',
  description:
    'Aplikasi kasir untuk ritel, restoran, dan apotek yang mencatat setiap penjualan, stok, dan setoran kas dari seluruh outlet dalam satu sistem.',
  longDescription: [
    'Toko yang dijalankan dengan mesin kasir lama dan buku tulis selalu berakhir sama: omzet baru diketahui besok pagi, stok baru ketahuan kurang saat pembeli menanyakannya, dan selisih uang di laci berakhir sebagai tebakan. RAKIT POS memindahkan seluruh pencatatan itu ke satu sistem yang dipakai bersama oleh kasir, supervisor, dan pemilik.',
    'Katalog ini disusun mengikuti alur kerja nyata toko di Indonesia: produk dan variannya didaftarkan, kasir melayani antrean dengan barcode dan layar sentuh, pembayaran diterima tunai maupun QRIS, shift ditutup dengan hitungan kas fisik, lalu semuanya bermuara ke laporan harian yang bisa dibuka pemilik dari ponsel. Restoran mendapat tambahan denah meja, layar dapur, dan pemakaian bahan baku; apotek dan ritel mendapat stok per outlet, opname, serta laba kotor per produk.',
    'Anda memilih sendiri fitur mana yang dipakai. Warung kopi dengan satu outlet tidak perlu membayar dashboard multi-outlet atau sambungan ke payment gateway. Sebaliknya, jaringan minimarket dengan lima belas cabang bisa menambahkan harga berbeda per outlet, transfer stok antar cabang, dan sinkronisasi ke software akuntansi sejak hari pertama.',
  ].join('\n\n'),

  benefits: [
    'Pemilik tahu omzet tiap outlet hari ini dari ponsel, tanpa menelepon satu per satu atau menunggu rekap besok pagi.',
    'Kasir baru bisa melayani antrean di hari pertama karena layarnya berupa tombol besar, bukan kode barang yang harus dihafal.',
    'Stok berkurang sendiri setiap ada penjualan, jadi barang yang habis di satu cabang tidak lagi terlanjur dijanjikan ke pembeli.',
    'Selisih uang di laci ketahuan saat tutup shift, bukan akhir bulan, sehingga jelas shift siapa yang perlu ditanya.',
    'Promo, diskon, dan poin member berjalan sesuai aturan yang Anda tetapkan, bukan sesuai ingatan kasir yang sedang bertugas.',
    'Penjualan tunai, QRIS, kartu, dan pesanan online masuk ke satu laporan yang sama, jadi tidak ada omzet yang tercecer di aplikasi lain.',
  ],

  painPoints: [
    {
      title: 'Omzet baru diketahui besok pagi',
      body: 'Setiap malam kasir mengirim foto struk dan catatan tulis tangan lewat WhatsApp. Rekapnya baru selesai menjelang siang, dan saat angkanya jadi, hari itu sudah lewat tanpa bisa diperbaiki.',
    },
    {
      title: 'Uang di laci sering kurang tanpa penjelasan',
      body: 'Tidak ada catatan modal awal maupun rekap per shift. Saat kas kurang seratus ribu, tidak ada yang bisa memastikan itu terjadi di shift pagi, shift sore, atau karena kembalian yang salah hitung.',
    },
    {
      title: 'Stok di kasir dan stok di rak tidak sama',
      body: 'Penjualan dicatat di mesin kasir, sedangkan stok diurus di file Excel yang berbeda. Pembeli sering dijanjikan barang yang ternyata sudah habis dua hari lalu di cabang tersebut.',
    },
    {
      title: 'Cabang baru berarti sistem baru lagi',
      body: 'Setiap outlet punya mesin kasir sendiri yang datanya tidak saling terhubung. Membandingkan penjualan antar cabang berarti menggabungkan tiga file berbeda dengan format berbeda, setiap bulan.',
    },
  ],

  minViableFeatureCount: 9,
  seoTitle: 'Aplikasi Kasir & POS Custom untuk Multi Outlet | RAKIT',
  seoDescription:
    'Bangun aplikasi kasir sesuai cara kerja toko Anda: layar sentuh, barcode, QRIS, stok per outlet, shift kasir, dan laporan multi-cabang. Pilih fiturnya, harga langsung terlihat.',

  // -------------------------------------------------------------------------
  // KELOMPOK FITUR
  // -------------------------------------------------------------------------
  groups: [
    // ---- 1. Data Induk & Produk -------------------------------------------
    {
      slug: 'data-induk',
      name: 'Data Induk & Produk',
      description:
        'Fondasi seluruh sistem: apa yang dijual, bagaimana dikelompokkan, dan di outlet mana barang itu dijual.',
      icon: 'Boxes',
      features: [
        {
          slug: 'master-produk-varian',
          name: 'Daftar Produk & Varian',
          clientDescription:
            'Satu daftar produk yang dipakai semua outlet, lengkap dengan varian ukuran, rasa, atau warna beserta harga dan barcodenya masing-masing. Tidak ada lagi satu barang tercatat dengan tiga nama berbeda di tiga outlet berbeda.',
          internalDescription:
            'Entitas Product + ProductVariant: SKU, barcode, harga jual, harga modal, satuan, foto, status aktif. Menjadi acuan seluruh transaksi, stok, dan laporan.',
          type: 'CORE',
          manDayMin: 3.5,
          manDayMax: 4,
          keywords: ['master produk', 'varian produk', 'daftar barang', 'sku', 'barcode produk'],
          sortOrder: 1,
          seoTitle: 'Master Data Produk & Varian untuk Aplikasi Kasir',
          seoDescription:
            'Kelola satu daftar produk terpusat beserta varian, harga, dan barcode yang dipakai seluruh outlet, sehingga data penjualan tidak lagi tercecer per cabang.',
        },
        {
          slug: 'master-kategori',
          name: 'Kategori & Kelompok Produk',
          clientDescription:
            'Produk dikelompokkan menjadi kategori seperti minuman, makanan, atau obat bebas, sehingga kasir menemukannya dalam dua ketukan. Laporan penjualan pun bisa dibaca per kelompok, bukan per ribuan item.',
          internalDescription:
            'Kategori bertingkat (parent-child), urutan tampil pada grid kasir, warna tombol, relasi ke seluruh laporan agregat.',
          type: 'CORE',
          manDayMin: 2.2,
          manDayMax: 2.5,
          keywords: ['kategori produk', 'kelompok barang', 'grup produk'],
          sortOrder: 2,
        },
        {
          slug: 'master-outlet',
          name: 'Daftar Outlet & Cabang',
          clientDescription:
            'Setiap outlet punya identitas sendiri beserta alamat, jam buka, dan penanggung jawabnya. Angka penjualan dan stok tidak lagi tercampur menjadi satu tumpukan yang tidak bisa ditelusuri asalnya.',
          internalDescription:
            'Entitas Outlet: kode, alamat, zona waktu, jam operasional, penanggung jawab, status aktif. Basis seluruh filter dan pembatasan data per lokasi.',
          type: 'CORE',
          manDayMin: 2.4,
          manDayMax: 2.7,
          keywords: ['outlet', 'cabang', 'multi outlet', 'toko'],
          sortOrder: 3,
        },
        {
          slug: 'harga-pajak-per-outlet',
          name: 'Harga Jual & Pajak Berbeda per Outlet',
          clientDescription:
            'Outlet di mal bisa memakai harga dan pajak yang berbeda dari outlet di ruko, tanpa perlu membuat dua daftar produk. Kasir tidak pernah salah menagih karena sistem yang memilihkan harganya.',
          internalDescription:
            'Price list per outlet atau zona dengan periode berlaku dan prioritas resolusi harga; aturan pajak (PPN, PB1) serta service charge per outlet; pembulatan harga.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 5.6,
          keywords: ['harga per outlet', 'pajak restoran', 'pb1', 'ppn', 'harga berbeda'],
          sortOrder: 4,
        },
      ],
    },

    // ---- 2. Transaksi Kasir -----------------------------------------------
    {
      slug: 'transaksi-kasir',
      name: 'Transaksi Kasir',
      description:
        'Layar yang dipakai kasir sepanjang hari: melayani antrean, menahan transaksi, memisah tagihan, sampai mencetak struk.',
      icon: 'ScanBarcode',
      features: [
        {
          slug: 'kasir-layar-sentuh',
          name: 'Layar Kasir Sentuh',
          clientDescription:
            'Layar kasir dengan tombol besar yang bisa dioperasikan sambil berdiri, tanpa pelatihan berhari-hari. Kasir baru bisa melayani antrean di hari pertama kerjanya.',
          internalDescription:
            'UI POS: grid produk, keranjang, keypad kuantitas, shortcut keyboard, dukungan layar sentuh dan mouse, mode tablet, diskon per baris.',
          type: 'CORE',
          manDayMin: 4,
          manDayMax: 4.5,
          keywords: ['kasir', 'aplikasi kasir', 'layar sentuh', 'pos', 'touchscreen'],
          sortOrder: 1,
          seoTitle: 'Aplikasi Kasir Layar Sentuh untuk Toko & Restoran',
          seoDescription:
            'Layar kasir dengan tombol besar yang mudah dipakai kasir baru, mendukung tablet maupun desktop, dan dirancang untuk antrean jam sibuk.',
        },
        {
          slug: 'pencarian-produk-barcode',
          name: 'Cari Produk Cepat & Pindai Barcode',
          clientDescription:
            'Barang ditemukan dengan memindai barcode atau mengetik beberapa huruf namanya, bahkan bila daftar produk sudah puluhan ribu. Antrean di depan kasir berhenti mengular.',
          internalDescription:
            'Index pencarian (nama, SKU, barcode, singkatan), input scanner HID/keyboard-wedge, kamera ponsel sebagai pemindai, target hasil di bawah 100 ms.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          isEssential: true,
          keywords: ['scan barcode', 'cari produk', 'pindai', 'scanner kasir'],
          sortOrder: 2,
          seoTitle: 'Pencarian Produk & Scan Barcode di Aplikasi Kasir',
          seoDescription:
            'Temukan produk lewat pemindaian barcode atau ketikan singkat, meski katalog sudah puluhan ribu item. Antrean kasir tetap bergerak di jam sibuk.',
        },
        {
          slug: 'tahan-lanjutkan-transaksi',
          name: 'Tahan & Lanjutkan Transaksi',
          clientDescription:
            'Transaksi yang tertunda karena pembeli lupa mengambil satu barang bisa ditahan dulu, lalu dilanjutkan setelah antrean di belakangnya selesai dilayani. Tidak ada pembeli yang menunggu tanpa alasan.',
          internalDescription:
            'Multi-cart per terminal dengan label, persistensi lokal, batas jumlah cart tertahan, pemulihan otomatis setelah aplikasi ditutup.',
          type: 'STANDARD',
          manDayMin: 2.4,
          manDayMax: 3,
          keywords: ['hold transaksi', 'tahan bon', 'antrean kasir', 'pending'],
          sortOrder: 3,
        },
        {
          slug: 'split-bill',
          name: 'Pisah Tagihan per Orang',
          clientDescription:
            'Satu meja atau satu keranjang bisa dibagi menjadi beberapa tagihan sesuai siapa membayar apa. Kasir tidak perlu lagi menghitung di kertas saat rombongan minta bayar sendiri-sendiri.',
          internalDescription:
            'Split by item, by amount, atau rata; menghasilkan beberapa Payment dan struk terpisah dari satu Order induk.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          keywords: ['split bill', 'pisah bayar', 'bagi tagihan', 'patungan'],
          sortOrder: 4,
        },
        {
          slug: 'retur-pembatalan-penjualan',
          name: 'Retur Barang & Pembatalan Penjualan',
          clientDescription:
            'Barang yang dikembalikan pembeli dicatat lengkap dengan alasan dan persetujuan supervisor, lalu stok serta uangnya ikut menyesuaikan sendiri. Pembatalan tidak lagi dilakukan diam-diam di laci.',
          internalDescription:
            'Return/void flow dengan referensi struk asli, retur sebagian, alasan wajib, otorisasi PIN supervisor, jurnal balik stok dan kas.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['retur', 'batal transaksi', 'void', 'refund', 'kembalikan barang'],
          sortOrder: 5,
        },
        {
          slug: 'mode-offline',
          name: 'Kasir Tetap Jalan Saat Internet Putus',
          clientDescription:
            'Ketika internet mati, kasir tetap bisa melayani pembeli, mencetak struk, dan mencatat penjualan. Begitu koneksi kembali, semua transaksi terkirim sendiri ke pusat tanpa diketik ulang.',
          internalDescription:
            'Local-first store (IndexedDB/SQLite), antrean sinkronisasi, penomoran struk offline anti-bentrok, resolusi konflik stok, indikator status koneksi.',
          type: 'CONFIGURABLE',
          manDayMin: 5,
          manDayMax: 6.5,
          keywords: ['mode offline', 'kasir offline', 'internet putus', 'sinkronisasi'],
          sortOrder: 6,
          seoTitle: 'Aplikasi Kasir Offline: Tetap Jalan Saat Internet Mati',
          seoDescription:
            'Kasir tetap melayani dan mencetak struk meski internet putus, lalu seluruh transaksi tersinkron otomatis ke pusat setelah koneksi kembali.',
        },
        {
          slug: 'struk-cetak-digital',
          name: 'Struk Cetak & Struk Digital WhatsApp',
          clientDescription:
            'Struk keluar dari printer termal seperti biasa, dan bisa juga dikirim ke WhatsApp atau email pembeli. Toko hemat kertas, pembeli punya bukti belanja yang tidak luntur.',
          internalDescription:
            'Template struk ESC/POS yang dapat diatur (logo, footer, NPWP), cetak via USB/LAN/Bluetooth, pengiriman struk digital lewat tautan dan WhatsApp.',
          type: 'STANDARD',
          manDayMin: 3.2,
          manDayMax: 4,
          isEssential: true,
          keywords: ['struk', 'printer thermal', 'struk digital', 'nota', 'whatsapp'],
          sortOrder: 7,
        },
      ],
    },

    // ---- 3. Pembayaran ----------------------------------------------------
    {
      slug: 'pembayaran',
      name: 'Pembayaran',
      description:
        'Semua cara pembeli membayar, dari uang tunai sampai QRIS, beserta pencocokan setoran yang masuk ke rekening.',
      icon: 'CreditCard',
      features: [
        {
          slug: 'pembayaran-tunai',
          name: 'Pembayaran Tunai & Hitung Kembalian',
          clientDescription:
            'Kasir memasukkan uang yang diterima dan sistem langsung menampilkan kembaliannya dalam angka besar. Salah hitung kembalian di jam ramai berhenti terjadi.',
          internalDescription:
            'Tender tunai dengan saran pecahan, pembulatan, integrasi cash drawer, pencatatan otomatis ke sesi shift berjalan.',
          type: 'CORE',
          manDayMin: 2.6,
          manDayMax: 2.9,
          keywords: ['tunai', 'cash', 'kembalian', 'laci kasir'],
          sortOrder: 1,
        },
        {
          slug: 'pembayaran-qris',
          name: 'Pembayaran QRIS',
          clientDescription:
            'Pembeli memindai QRIS dan pembayarannya tercatat sebagai lunas di struk yang sama. Kasir tidak perlu lagi memeriksa layar ponsel pembeli satu per satu.',
          internalDescription:
            'QRIS statis maupun dinamis, polling/webhook status pembayaran, penanganan QR kedaluwarsa, pencocokan ke Order.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.3,
          keywords: ['qris', 'qr code', 'bayar scan', 'pembayaran digital'],
          sortOrder: 2,
          seoTitle: 'Pembayaran QRIS di Aplikasi Kasir Toko & Restoran',
          seoDescription:
            'Terima pembayaran QRIS langsung dari layar kasir dengan status lunas yang tercatat otomatis, sehingga kasir tidak perlu memeriksa ponsel pembeli.',
        },
        {
          slug: 'pembayaran-kartu-edc',
          name: 'Pembayaran Kartu Debit & Kredit',
          clientDescription:
            'Transaksi kartu dicatat lengkap dengan nama bank, jenis kartu, dan nomor persetujuan, sehingga setoran dari bank mudah dicocokkan di akhir bulan. Selisih EDC berhenti menjadi misteri.',
          internalDescription:
            'Tender kartu: pemilihan bank/acquirer, input trace atau approval code, biaya MDR per bank, rekap per acquirer untuk rekonsiliasi.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          keywords: ['edc', 'kartu debit', 'kartu kredit', 'mesin gesek'],
          sortOrder: 3,
        },
        {
          slug: 'pembayaran-ewallet',
          name: 'Pembayaran E-Wallet',
          clientDescription:
            'Pembayaran lewat dompet digital tercatat sebagai metode tersendiri di struk dan laporan. Anda tahu persis berapa penjualan yang uangnya belum masuk ke rekening.',
          internalDescription:
            'Tender e-wallet multi provider (GoPay, OVO, DANA, ShopeePay), status settlement, biaya MDR per provider, laporan piutang settlement.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.3,
          keywords: ['e-wallet', 'gopay', 'ovo', 'dana', 'dompet digital'],
          sortOrder: 4,
        },
        {
          slug: 'pembayaran-gabungan',
          name: 'Pembayaran Gabungan Tunai & Non-Tunai',
          clientDescription:
            'Satu tagihan bisa dibayar sebagian tunai dan sisanya dengan kartu atau QRIS tanpa membuat dua struk. Kasir tidak lagi menolak pembeli yang saldo dompet digitalnya kurang sedikit.',
          internalDescription:
            'Multi-tender per Order dengan sisa tagihan berjalan, validasi kelebihan dan kekurangan bayar, alokasi ke laporan per metode.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['split payment', 'bayar gabungan', 'multi metode', 'sebagian tunai'],
          sortOrder: 5,
        },
        {
          slug: 'uang-muka-pesanan',
          name: 'Uang Muka & Pesanan Titipan',
          clientDescription:
            'Pembeli bisa memesan barang dan membayar uang muka lebih dulu, lalu melunasinya saat barang diambil. Semua pesanan yang belum lunas terpantau, tidak lagi tercatat di buku tulis dekat kasir.',
          internalDescription:
            'Order berstatus pre-order/DP: jadwal pengambilan, sisa tagihan, pelunasan bertahap, pengingat, pembatalan dengan aturan pengembalian DP.',
          type: 'STANDARD',
          manDayMin: 3.2,
          manDayMax: 4,
          keywords: ['uang muka', 'dp', 'pesanan', 'pre order', 'titipan'],
          sortOrder: 6,
        },
        {
          slug: 'rekonsiliasi-nontunai-manual',
          name: 'Pencocokan Setoran Non-Tunai Manual',
          clientDescription:
            'Setiap akhir hari, penjualan QRIS, kartu, dan dompet digital dicocokkan dengan mutasi rekening yang Anda masukkan sendiri, lalu selisihnya ditandai. Cocok untuk toko yang belum menyambungkan sistem ke payment gateway.',
          internalDescription:
            'Modul rekonsiliasi manual: entri atau unggah mutasi, pencocokan otomatis berdasarkan nominal dan tanggal, penandaan selisih, catatan tindak lanjut.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          keywords: ['rekonsiliasi', 'setoran', 'cocokkan mutasi', 'selisih non tunai'],
          sortOrder: 7,
        },
      ],
    },

    // ---- 4. Layanan Restoran & Dapur --------------------------------------
    {
      slug: 'layanan-restoran',
      name: 'Layanan Restoran & Dapur',
      description:
        'Modul khusus F&B: mencatat pesanan dari meja, meneruskannya ke dapur, dan menghitung pemakaian bahan baku.',
      icon: 'UtensilsCrossed',
      features: [
        {
          slug: 'manajemen-meja-pesanan',
          name: 'Denah Meja & Pesanan Dapur',
          clientDescription:
            'Pelayan mencatat pesanan langsung dari meja, dan kondisi setiap meja terlihat dalam satu denah: kosong, terisi, atau menunggu bayar. Pesanan tidak lagi tertukar antar meja saat restoran penuh.',
          internalDescription:
            'Editor floor plan per outlet, status meja, order per meja dengan urutan penyajian, pindah dan gabung meja, pembagian per pramusaji.',
          type: 'CONFIGURABLE',
          manDayMin: 4.5,
          manDayMax: 6,
          keywords: ['manajemen meja', 'restoran', 'pesanan meja', 'denah meja', 'fnb'],
          sortOrder: 1,
          seoTitle: 'Aplikasi Kasir Restoran: Denah Meja & Pesanan Dapur',
          seoDescription:
            'Catat pesanan langsung dari meja, pantau status tiap meja dalam satu denah, dan teruskan pesanan ke dapur tanpa kertas yang terselip.',
        },
        {
          slug: 'tampilan-dapur',
          name: 'Tampilan Pesanan di Layar Dapur',
          clientDescription:
            'Pesanan langsung muncul di layar dapur beserta waktu tunggunya, dan hilang setelah ditandai selesai. Tidak ada lagi kertas pesanan yang terselip atau tulisan yang tidak terbaca.',
          internalDescription:
            'Kitchen Display System: antrean per stasiun (dapur panas, bar, dessert), timer, status bump, suara notifikasi, tata letak untuk layar besar.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['kitchen display', 'layar dapur', 'kds', 'antrean pesanan'],
          sortOrder: 2,
        },
        {
          slug: 'cetak-order-dapur',
          name: 'Cetak Struk Pesanan ke Dapur',
          clientDescription:
            'Setiap pesanan tercetak otomatis di printer dapur dan bar sesuai jenis menunya. Cara paling sederhana bagi dapur yang belum siap memakai layar.',
          internalDescription:
            'Routing item ke printer per stasiun berdasarkan kategori, cetak ulang, penanda pesanan tambahan dan pembatalan.',
          type: 'STANDARD',
          manDayMin: 2.2,
          manDayMax: 2.8,
          keywords: ['printer dapur', 'struk dapur', 'order dapur', 'cetak pesanan'],
          sortOrder: 3,
        },
        {
          slug: 'resep-bahan-baku',
          name: 'Resep & Pemakaian Bahan Baku',
          clientDescription:
            'Setiap menu punya daftar bahan bakunya, jadi menjual satu porsi otomatis mengurangi stok bahan di gudang dapur. Anda akhirnya tahu berapa banyak bahan yang hilang di luar penjualan.',
          internalDescription:
            'Bill of Material per menu, varian resep per outlet, konversi satuan (gram, ml, pcs), yield dan waste factor, konsumsi otomatis saat penjualan, laporan selisih pemakaian.',
          type: 'CONFIGURABLE',
          manDayMin: 4.2,
          manDayMax: 5.8,
          keywords: ['resep', 'bahan baku', 'hpp menu', 'stok dapur', 'porsi'],
          sortOrder: 4,
        },
      ],
    },

    // ---- 5. Stok & Antar Outlet -------------------------------------------
    {
      slug: 'stok-outlet',
      name: 'Stok & Antar Outlet',
      description:
        'Menjaga angka stok tiap outlet tetap benar: berkurang saat terjual, bertambah saat dibeli, dan dicocokkan lewat opname.',
      icon: 'Warehouse',
      features: [
        {
          slug: 'stok-per-outlet',
          name: 'Stok Terpisah per Outlet',
          clientDescription:
            'Setiap outlet punya angka stoknya sendiri yang berkurang saat terjadi penjualan. Anda tidak lagi menjanjikan barang yang ternyata habis di cabang tempat pembeli berdiri.',
          internalDescription:
            'Ledger stok per kombinasi outlet-produk-varian, mutasi otomatis dari penjualan, retur, transfer, dan opname; kartu stok yang dapat ditelusuri per tanggal.',
          type: 'STANDARD',
          manDayMin: 3.4,
          manDayMax: 4.2,
          isEssential: true,
          keywords: ['stok per outlet', 'stok toko', 'persediaan', 'stok cabang'],
          sortOrder: 1,
          seoTitle: 'Manajemen Stok per Outlet di Aplikasi Kasir',
          seoDescription:
            'Pantau stok tiap outlet secara terpisah dan berkurang otomatis setiap penjualan, agar tidak ada barang yang terlanjur dijanjikan padahal sudah habis.',
        },
        {
          slug: 'transfer-stok-antar-outlet',
          name: 'Kirim Stok Antar Outlet',
          clientDescription:
            'Barang yang menumpuk di satu outlet bisa dikirim ke outlet yang kehabisan, lengkap dengan status dalam perjalanan dan konfirmasi diterima. Barang tidak lagi hilang di tengah jalan tanpa jejak.',
          internalDescription:
            'Transfer order dengan status draft, dikirim, diterima sebagian, dan selesai; selisih penerimaan wajib beralasan; dokumen serah terima tercetak.',
          type: 'STANDARD',
          manDayMin: 3.2,
          manDayMax: 4,
          keywords: ['transfer stok', 'mutasi barang', 'kirim antar cabang', 'pindah stok'],
          sortOrder: 2,
        },
        {
          slug: 'stok-opname-outlet',
          name: 'Stok Opname per Outlet',
          clientDescription:
            'Penghitungan fisik dilakukan per outlet lewat ponsel atau tablet, lalu selisihnya langsung terlihat baris per baris sebelum disetujui. Toko tidak perlu tutup seharian hanya untuk menghitung barang.',
          internalDescription:
            'Sesi opname per outlet atau kategori, penghitungan buta, input dua orang, approval selisih, jurnal penyesuaian dengan alasan wajib.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['stok opname', 'hitung stok', 'selisih stok', 'opname'],
          sortOrder: 3,
        },
        {
          slug: 'penerimaan-barang-supplier',
          name: 'Pembelian & Penerimaan Barang dari Supplier',
          clientDescription:
            'Pesanan ke supplier dicatat, lalu barang yang datang tinggal dicocokkan dengan pesanannya beserta harga modal terbaru. Harga beli yang naik diam-diam langsung ketahuan.',
          internalDescription:
            'Purchase order dan goods receipt, penerimaan sebagian, pembaruan harga modal (moving average), ringkasan utang supplier, retur ke supplier.',
          type: 'STANDARD',
          manDayMin: 3.2,
          manDayMax: 4,
          keywords: ['pembelian', 'supplier', 'terima barang', 'purchase order', 'harga modal'],
          sortOrder: 4,
        },
      ],
    },

    // ---- 6. Promo & Loyalitas ---------------------------------------------
    {
      slug: 'promo-loyalitas',
      name: 'Promo & Loyalitas',
      description:
        'Alat untuk membuat pembeli kembali: promo terjadwal, kartu member, poin, dan voucher yang berjalan otomatis di kasir.',
      icon: 'Gift',
      features: [
        {
          slug: 'diskon-promo-terjadwal',
          name: 'Diskon & Promo Terjadwal',
          clientDescription:
            'Promo seperti beli dua gratis satu, potongan jam tertentu, atau paket hemat akhir pekan berjalan sendiri sesuai jadwal yang Anda tentukan. Kasir tidak perlu menghafal promo apa yang sedang berlaku hari ini.',
          internalDescription:
            'Rule engine promo: buy X get Y, potongan persen atau nominal, happy hour, bundling, syarat minimum belanja, prioritas dan penumpukan promo, jadwal per outlet.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 5.6,
          keywords: ['promo', 'diskon', 'beli 2 gratis 1', 'happy hour', 'potongan harga'],
          sortOrder: 1,
          seoTitle: 'Diskon & Promo Terjadwal Otomatis di Aplikasi Kasir',
          seoDescription:
            'Atur promo beli dua gratis satu, happy hour, dan paket hemat yang berjalan otomatis sesuai jadwal, tanpa kasir perlu menghafal aturannya.',
        },
        {
          slug: 'kartu-member-pelanggan',
          name: 'Kartu Member & Data Pelanggan',
          clientDescription:
            'Pelanggan tetap terdaftar dengan nomor ponselnya, sehingga riwayat belanjanya tercatat dan bisa dihubungi saat ada promo. Data pembeli menjadi milik toko, bukan catatan pribadi kasir.',
          internalDescription:
            'Entitas Customer: nomor member, kontak, tanggal lahir, tier, riwayat transaksi; pencarian cepat lewat nomor HP langsung dari layar kasir.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          keywords: ['member', 'pelanggan', 'kartu member', 'database pembeli'],
          sortOrder: 2,
        },
        {
          slug: 'poin-loyalitas',
          name: 'Poin Loyalitas & Penukaran Hadiah',
          clientDescription:
            'Pembeli mengumpulkan poin dari setiap belanja dan menukarkannya dengan potongan atau hadiah sesuai aturan yang Anda tetapkan sendiri. Pelanggan punya alasan untuk kembali ke toko Anda, bukan ke sebelah.',
          internalDescription:
            'Engine poin: rasio perolehan per kategori atau tier, masa berlaku, aturan penukaran, katalog hadiah, saldo poin lintas outlet, penyesuaian manual dengan otorisasi.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 5.5,
          keywords: ['poin', 'loyalitas', 'reward', 'tukar poin', 'member point'],
          sortOrder: 3,
          seoTitle: 'Program Poin Loyalitas & Member untuk Toko Ritel',
          seoDescription:
            'Bangun program poin dan penukaran hadiah dengan aturan sesuai bisnis Anda, berlaku lintas outlet dan langsung terpakai di layar kasir.',
        },
        {
          slug: 'voucher-kode-potongan',
          name: 'Voucher & Kode Potongan',
          clientDescription:
            'Voucher cetak maupun kode potongan digital bisa dipakai di kasir dan otomatis hangus setelah terpakai. Voucher palsu dan pemakaian berulang berhenti menggerus margin.',
          internalDescription:
            'Generator kode massal, batas pakai, masa berlaku, syarat minimum belanja, pembatasan per outlet atau produk, pelacakan redemption.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          keywords: ['voucher', 'kode promo', 'kupon', 'potongan'],
          sortOrder: 4,
        },
      ],
    },

    // ---- 7. Shift & Kas Kasir ---------------------------------------------
    {
      slug: 'shift-kas',
      name: 'Shift & Kas Kasir',
      description:
        'Menjaga uang tunai tetap terhitung: modal awal, rekap per shift, hitungan kas fisik, sampai setoran ke pusat.',
      icon: 'Wallet',
      features: [
        {
          slug: 'buka-tutup-shift',
          name: 'Buka & Tutup Shift Kasir',
          clientDescription:
            'Setiap kasir membuka shift dengan modal awal dan menutupnya dengan rekap penjualan miliknya sendiri. Saat ada selisih, jelas shift siapa yang perlu ditanya.',
          internalDescription:
            'Sesi shift per kombinasi terminal-user: modal awal, transaksi terikat sesi, penutupan dengan rekap per metode bayar, cetak laporan shift, penguncian sesi ganda.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          isEssential: true,
          keywords: ['shift kasir', 'buka kasir', 'tutup kasir', 'sesi kasir'],
          sortOrder: 1,
        },
        {
          slug: 'hitung-kas-fisik',
          name: 'Hitung Kas Fisik & Selisih Laci',
          clientDescription:
            'Saat tutup shift, kasir memasukkan jumlah uang per pecahan dan sistem langsung menunjukkan selisihnya terhadap catatan penjualan. Kebocoran kecil yang berulang jadi terlihat sejak hari pertama.',
          internalDescription:
            'Cash count per denominasi, perbandingan expected versus actual, ambang toleransi selisih, alasan wajib, riwayat selisih per kasir.',
          type: 'STANDARD',
          manDayMin: 2.4,
          manDayMax: 3,
          keywords: ['hitung kas', 'selisih kas', 'cash count', 'laci kasir'],
          sortOrder: 2,
        },
        {
          slug: 'setoran-kas-outlet',
          name: 'Setoran Kas Outlet ke Pusat',
          clientDescription:
            'Uang tunai yang disetorkan dari outlet ke bank atau ke pusat tercatat beserta bukti setornya. Anda tahu uang penjualan hari Sabtu sudah masuk rekening atau masih di brankas outlet.',
          internalDescription:
            'Dokumen setoran: sumber dari beberapa shift, nominal, penerima, unggah bukti transfer, status disetujui, saldo kas outlet berjalan.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          keywords: ['setoran', 'kas outlet', 'setor tunai', 'bukti setor'],
          sortOrder: 3,
        },
      ],
    },

    // ---- 8. Laporan & Pemantauan ------------------------------------------
    {
      slug: 'laporan',
      name: 'Laporan & Pemantauan',
      description:
        'Angka yang dibaca pemilik: omzet harian, produk terlaris, kinerja kasir, laba kotor, dan kondisi seluruh outlet.',
      icon: 'BarChart3',
      features: [
        {
          slug: 'laporan-penjualan-harian',
          name: 'Laporan Penjualan Harian',
          clientDescription:
            'Rekap penjualan hari ini per outlet dan per metode pembayaran siap dibaca tanpa menunggu admin membuat rekap. Anda tahu kondisi toko sebelum sampai di rumah.',
          internalDescription:
            'Agregasi harian: omzet, jumlah struk, rata-rata per struk, per metode bayar, per jam; ekspor Excel dan PDF; penjadwalan kirim otomatis.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          isEssential: true,
          keywords: ['laporan penjualan', 'omzet harian', 'rekap kasir', 'penjualan hari ini'],
          sortOrder: 1,
          seoTitle: 'Laporan Penjualan Harian Otomatis untuk Pemilik Toko',
          seoDescription:
            'Baca omzet hari ini per outlet dan per metode pembayaran langsung dari ponsel, tanpa menunggu rekap manual dari admin.',
        },
        {
          slug: 'laporan-per-produk',
          name: 'Laporan Penjualan per Produk',
          clientDescription:
            'Terlihat produk mana yang paling laku dan mana yang hanya memakan tempat di rak selama sebulan terakhir. Belanja stok berikutnya tidak lagi berdasarkan perasaan.',
          internalDescription:
            'Ranking penjualan per item, varian, dan kategori; perbandingan periode; kontribusi omzet; filter per outlet; deteksi produk mati.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          keywords: ['produk terlaris', 'laporan produk', 'best seller', 'barang tidak laku'],
          sortOrder: 2,
        },
        {
          slug: 'laporan-per-kasir',
          name: 'Laporan Penjualan per Kasir',
          clientDescription:
            'Penjualan, jumlah struk, diskon yang diberikan, dan pembatalan ditampilkan per kasir. Kasir yang berprestasi terlihat, dan pola pembatalan yang tidak wajar juga terlihat.',
          internalDescription:
            'Agregasi per user dan shift: omzet, average basket, jumlah void dan diskon manual, kecepatan layanan; dasar perhitungan insentif.',
          type: 'STANDARD',
          manDayMin: 2.4,
          manDayMax: 3,
          keywords: ['laporan kasir', 'kinerja kasir', 'per kasir', 'void kasir'],
          sortOrder: 3,
        },
        {
          slug: 'laporan-laba-kotor',
          name: 'Laporan Laba Kotor per Produk',
          clientDescription:
            'Selisih antara harga jual dan harga modal dihitung per produk, jadi Anda tahu barang mana yang ramai tetapi tidak menghasilkan untung. Omzet besar berhenti menyamarkan margin tipis.',
          internalDescription:
            'Perhitungan COGS per baris transaksi (moving average dari penerimaan barang), margin per item, kategori, dan outlet; tren margin antar periode.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.8,
          keywords: ['laba kotor', 'margin', 'untung per produk', 'hpp', 'profit'],
          sortOrder: 4,
        },
        {
          slug: 'dashboard-multi-outlet',
          name: 'Dashboard Pantau Semua Outlet',
          clientDescription:
            'Satu halaman yang menampilkan penjualan seluruh outlet hari ini beserta perbandingannya, dan bisa dibuka dari ponsel di mana saja. Pemilik tidak perlu lagi menelepon tiap outlet satu per satu.',
          internalDescription:
            'Dashboard konfigurabel: pemilihan widget dan KPI, target per outlet, perbandingan antar cabang, peringatan penjualan di bawah target, tampilan berbeda per peran.',
          type: 'CONFIGURABLE',
          manDayMin: 3.8,
          manDayMax: 5.2,
          keywords: ['dashboard', 'pantau outlet', 'multi outlet', 'monitoring toko'],
          sortOrder: 5,
          seoTitle: 'Dashboard Multi Outlet: Pantau Semua Cabang dari Ponsel',
          seoDescription:
            'Lihat penjualan seluruh outlet dalam satu halaman, bandingkan antar cabang, dan terima peringatan saat ada outlet di bawah target.',
        },
      ],
    },

    // ---- 9. Integrasi & Sistem --------------------------------------------
    {
      slug: 'integrasi-sistem',
      name: 'Integrasi & Sistem',
      description:
        'Penyambung ke aplikasi lain yang sudah Anda pakai, plus pengaturan akun, hak akses, dan jejak aktivitas.',
      icon: 'Plug',
      features: [
        {
          slug: 'integrasi-payment-gateway',
          name: 'Sambungan ke Payment Gateway',
          clientDescription:
            'Pembayaran QRIS, kartu, dan dompet digital terhubung langsung ke penyedia pembayaran, sehingga status lunas dan uang masuk tercatat otomatis. Rekonsiliasi harian yang biasanya satu jam selesai dalam hitungan menit.',
          internalDescription:
            'Integrasi Midtrans/Xendit/DOKU: pembuatan QR dinamis, webhook status, penarikan laporan settlement, pencocokan otomatis, penanganan refund.',
          type: 'CONFIGURABLE',
          manDayMin: 4.5,
          manDayMax: 6,
          keywords: ['payment gateway', 'midtrans', 'xendit', 'qris dinamis', 'settlement'],
          sortOrder: 1,
        },
        {
          slug: 'integrasi-akuntansi',
          name: 'Sambungan ke Software Akuntansi',
          clientDescription:
            'Penjualan harian, pembelian, dan penyesuaian stok mengalir sendiri ke software akuntansi dalam bentuk jurnal yang siap diposting. Tim keuangan berhenti mengetik ulang angka yang sudah ada di kasir.',
          internalDescription:
            'Pemetaan akun (penjualan, PPN, HPP, kas per metode bayar), sinkronisasi terjadwal, antrean ulang saat gagal kirim, konektor Accurate/Jurnal/Zahir.',
          type: 'CONFIGURABLE',
          manDayMin: 4.2,
          manDayMax: 5.8,
          keywords: ['integrasi akuntansi', 'accurate', 'jurnal', 'pembukuan', 'jurnal otomatis'],
          sortOrder: 2,
          seoTitle: 'Integrasi Aplikasi Kasir dengan Accurate & Jurnal',
          seoDescription:
            'Kirim penjualan, pembelian, dan penyesuaian stok dari kasir ke software akuntansi secara otomatis, tanpa entri ulang oleh tim keuangan.',
        },
        {
          slug: 'integrasi-marketplace',
          name: 'Sambungan ke Marketplace & Ojek Online',
          clientDescription:
            'Pesanan dari layanan pesan antar dan marketplace masuk ke sistem yang sama dengan penjualan di kasir, dan stoknya ikut berkurang. Tidak ada lagi pesanan online yang diterima padahal barangnya sudah habis.',
          internalDescription:
            'Konektor per kanal (GoFood, GrabFood, Tokopedia, Shopee): tarik pesanan, sinkron katalog dan harga kanal, pengurangan stok bersama, status pesanan, rekap komisi per kanal.',
          type: 'CONFIGURABLE',
          manDayMin: 4.8,
          manDayMax: 6,
          keywords: ['gofood', 'grabfood', 'marketplace', 'tokopedia', 'shopee'],
          sortOrder: 3,
        },
        {
          slug: 'manajemen-pengguna',
          name: 'Akun Pengguna & Kasir',
          clientDescription:
            'Setiap kasir, supervisor, dan pemilik punya akun sendiri lengkap dengan PIN cepat untuk masuk di terminal. Tidak ada lagi satu akun bersama yang membuat semua transaksi terlihat sama.',
          internalDescription:
            'User dengan PIN login POS, penugasan ke outlet, status aktif dan nonaktif, reset kredensial, pembatasan sesi ganda.',
          type: 'CORE',
          manDayMin: 3,
          manDayMax: 3.4,
          keywords: ['pengguna', 'akun kasir', 'login', 'pin kasir'],
          sortOrder: 4,
        },
        {
          slug: 'hak-akses-peran',
          name: 'Hak Akses per Peran',
          clientDescription:
            'Kasir hanya melihat layar kasir, supervisor bisa menyetujui pembatalan, dan pemilik melihat seluruh laporan. Siapa boleh melakukan apa ditentukan sekali, lalu berlaku di semua outlet.',
          internalDescription:
            'RBAC: peran bawaan (kasir, supervisor, manajer outlet, pemilik), izin per modul dan aksi, pembatasan data per outlet, otorisasi berjenjang untuk aksi sensitif.',
          type: 'CORE',
          manDayMin: 3.2,
          manDayMax: 3.6,
          keywords: ['hak akses', 'peran pengguna', 'izin', 'otorisasi'],
          sortOrder: 5,
        },
        {
          slug: 'audit-log',
          name: 'Jejak Aktivitas & Perubahan Data',
          clientDescription:
            'Setiap pembatalan struk, perubahan harga, dan penyesuaian stok tercatat lengkap dengan siapa dan kapan melakukannya. Saat ada yang janggal, jawabannya ada di sistem, bukan di ingatan orang.',
          internalDescription:
            'Audit trail immutable: aktor, aksi, entitas, nilai sebelum dan sesudah, IP atau terminal, retensi dan ekspor untuk pemeriksaan.',
          type: 'CORE',
          manDayMin: 2.8,
          manDayMax: 3.2,
          keywords: ['audit log', 'jejak aktivitas', 'riwayat perubahan', 'log'],
          sortOrder: 6,
        },
      ],
    },
  ],

  // -------------------------------------------------------------------------
  // DEPENDENSI
  // Seluruh REQUIRES membentuk graf tanpa siklus, dan tidak ada fitur CORE yang
  // menjadi SUMBER REQUIRES (core selalu ikut secara otomatis).
  // -------------------------------------------------------------------------
  dependencies: [
    // -- Stok: semua modul persediaan bertumpu pada stok per outlet ---------
    {
      feature: 'transfer-stok-antar-outlet',
      target: 'stok-per-outlet',
      kind: 'REQUIRES',
      note: 'Kiriman antar outlet harus mengurangi stok pengirim dan menambah stok penerima, jadi Stok Terpisah per Outlet ikut ditambahkan.',
    },
    {
      feature: 'stok-opname-outlet',
      target: 'stok-per-outlet',
      kind: 'REQUIRES',
      note: 'Hasil hitung fisik dibandingkan dengan angka sistem per outlet, jadi Stok Terpisah per Outlet ikut ditambahkan.',
    },
    {
      feature: 'penerimaan-barang-supplier',
      target: 'stok-per-outlet',
      kind: 'REQUIRES',
      note: 'Barang yang diterima harus masuk ke stok outlet penerima, jadi Stok Terpisah per Outlet ikut ditambahkan.',
    },
    {
      feature: 'resep-bahan-baku',
      target: 'stok-per-outlet',
      kind: 'REQUIRES',
      note: 'Pemakaian bahan baku mengurangi stok dapur outlet bersangkutan, jadi Stok Terpisah per Outlet ikut ditambahkan.',
    },

    // -- Restoran: pesanan dapur selalu berasal dari pesanan meja -----------
    {
      feature: 'tampilan-dapur',
      target: 'manajemen-meja-pesanan',
      kind: 'REQUIRES',
      note: 'Layar dapur menampilkan pesanan yang dicatat dari meja, jadi Denah Meja & Pesanan Dapur ikut ditambahkan.',
    },
    {
      feature: 'cetak-order-dapur',
      target: 'manajemen-meja-pesanan',
      kind: 'REQUIRES',
      note: 'Struk dapur dicetak dari pesanan yang dicatat di meja, jadi Denah Meja & Pesanan Dapur ikut ditambahkan.',
    },
    {
      feature: 'tampilan-dapur',
      target: 'cetak-order-dapur',
      kind: 'CONFLICTS_WITH',
      note: 'Pesanan hanya boleh diteruskan ke dapur lewat satu jalur. Bila dapur memakai layar, cetak struk dapur tidak lagi diperlukan.',
    },

    // -- Loyalitas ----------------------------------------------------------
    {
      feature: 'poin-loyalitas',
      target: 'kartu-member-pelanggan',
      kind: 'REQUIRES',
      note: 'Poin harus menempel pada seseorang, jadi Kartu Member & Data Pelanggan ikut ditambahkan.',
    },
    {
      feature: 'diskon-promo-terjadwal',
      target: 'kartu-member-pelanggan',
      kind: 'RECOMMENDS',
      note: 'Bila Anda ingin membuat promo khusus member, data pelanggan perlu ada lebih dulu.',
    },

    // -- Shift & kas --------------------------------------------------------
    {
      feature: 'hitung-kas-fisik',
      target: 'buka-tutup-shift',
      kind: 'REQUIRES',
      note: 'Uang di laci dihitung terhadap penjualan satu shift, jadi Buka & Tutup Shift Kasir ikut ditambahkan.',
    },
    {
      feature: 'setoran-kas-outlet',
      target: 'hitung-kas-fisik',
      kind: 'REQUIRES',
      note: 'Uang yang disetor berasal dari hasil hitungan kas saat tutup shift, jadi Hitung Kas Fisik & Selisih Laci ikut ditambahkan.',
    },
    {
      feature: 'laporan-per-kasir',
      target: 'buka-tutup-shift',
      kind: 'REQUIRES',
      note: 'Penjualan baru bisa dipisah per kasir bila setiap transaksi terikat pada shift, jadi Buka & Tutup Shift Kasir ikut ditambahkan.',
    },

    // -- Laporan ------------------------------------------------------------
    {
      feature: 'laporan-per-produk',
      target: 'laporan-penjualan-harian',
      kind: 'REQUIRES',
      note: 'Peringkat produk dihitung dari rekap penjualan, jadi Laporan Penjualan Harian ikut ditambahkan.',
    },
    {
      feature: 'laporan-laba-kotor',
      target: 'penerimaan-barang-supplier',
      kind: 'REQUIRES',
      note: 'Laba kotor perlu harga modal terbaru yang berasal dari pembelian, jadi Pembelian & Penerimaan Barang dari Supplier ikut ditambahkan.',
    },
    {
      feature: 'laporan-laba-kotor',
      target: 'resep-bahan-baku',
      kind: 'RECOMMENDS',
      note: 'Untuk usaha makanan, modal per porsi baru akurat bila resep dan pemakaian bahan bakunya ikut dicatat.',
    },
    {
      feature: 'dashboard-multi-outlet',
      target: 'laporan-penjualan-harian',
      kind: 'REQUIRES',
      note: 'Kartu angka di dashboard membaca rekap harian tiap outlet, jadi Laporan Penjualan Harian ikut ditambahkan.',
    },

    // -- Integrasi ----------------------------------------------------------
    {
      feature: 'integrasi-payment-gateway',
      target: 'pembayaran-qris',
      kind: 'REQUIRES',
      note: 'Payment gateway dipakai untuk menerbitkan dan memantau pembayaran QRIS, jadi Pembayaran QRIS ikut ditambahkan.',
    },
    {
      feature: 'integrasi-payment-gateway',
      target: 'rekonsiliasi-nontunai-manual',
      kind: 'CONFLICTS_WITH',
      note: 'Pencocokan setoran hanya perlu dilakukan sekali. Bila payment gateway tersambung, pencocokan manual tidak lagi diperlukan.',
    },
    {
      feature: 'integrasi-marketplace',
      target: 'stok-per-outlet',
      kind: 'RECOMMENDS',
      note: 'Pesanan online sebaiknya mengurangi stok outlet yang menyiapkan pesanannya, agar tidak ada pesanan masuk untuk barang yang habis.',
    },
    {
      feature: 'mode-offline',
      target: 'struk-cetak-digital',
      kind: 'RECOMMENDS',
      note: 'Saat internet putus, pembeli tetap perlu bukti bayar, jadi pencetakan struk dari printer lokal sangat membantu.',
    },
  ],

  // -------------------------------------------------------------------------
  // PRESET
  // -------------------------------------------------------------------------
  presets: [
    {
      slug: 'pos-starter',
      name: 'POS Starter',
      tagline: 'Ganti mesin kasir lama dengan sistem yang angkanya bisa dipercaya.',
      description:
        'Paket paling ringkas untuk memindahkan pencatatan toko dari mesin kasir lama dan buku tulis ke satu sistem: layani antrean dengan barcode, terima tunai dan QRIS, tutup shift dengan rekap, lalu baca omzet hari itu juga.',
      bestFor: [
        'Satu outlet dengan satu sampai dua kasir.',
        'Toko kelontong, kedai kopi, atau apotek kecil yang masih mencatat manual.',
        'Prioritasnya menghentikan selisih kas dan mengetahui omzet harian.',
        'Belum punya program member dan belum butuh laporan antar cabang.',
      ],
      features: [
        // Seluruh CORE
        'master-produk-varian',
        'master-kategori',
        'master-outlet',
        'kasir-layar-sentuh',
        'pembayaran-tunai',
        'manajemen-pengguna',
        'hak-akses-peran',
        'audit-log',
        // Alur kasir paling dasar
        'pencarian-produk-barcode',
        'struk-cetak-digital',
        'pembayaran-qris',
        'stok-per-outlet',
        'buka-tutup-shift',
        'laporan-penjualan-harian',
      ],
    },
    {
      slug: 'pos-growth',
      name: 'POS Growth',
      tagline: 'Beberapa outlet, banyak metode bayar, satu laporan.',
      description:
        'Paket yang dipakai mayoritas klien: seluruh alur Starter ditambah pembayaran kartu dan dompet digital, transfer stok antar outlet, stok opname, program member berpoin, promo terjadwal, serta dashboard untuk memantau semua cabang.',
      bestFor: [
        'Dua sampai delapan outlet dengan kasir bergantian tiap shift.',
        'Ritel, kafe, atau apotek yang sudah menerima QRIS, kartu, dan dompet digital.',
        'Sudah punya pelanggan tetap yang layak diberi program poin.',
        'Pemilik ingin membandingkan kinerja antar cabang tanpa datang ke lokasi.',
      ],
      isDefault: true,
      features: [
        // Seluruh CORE
        'master-produk-varian',
        'master-kategori',
        'master-outlet',
        'kasir-layar-sentuh',
        'pembayaran-tunai',
        'manajemen-pengguna',
        'hak-akses-peran',
        'audit-log',
        // Kasir & pembayaran
        'pencarian-produk-barcode',
        'struk-cetak-digital',
        'retur-pembatalan-penjualan',
        'pembayaran-qris',
        'pembayaran-kartu-edc',
        'pembayaran-ewallet',
        // Stok antar outlet
        'stok-per-outlet',
        'transfer-stok-antar-outlet',
        'stok-opname-outlet',
        // Member & promo
        'kartu-member-pelanggan',
        'diskon-promo-terjadwal',
        'poin-loyalitas',
        // Kas & laporan
        'buka-tutup-shift',
        'hitung-kas-fisik',
        'laporan-penjualan-harian',
        'laporan-per-produk',
        'laporan-per-kasir',
        'dashboard-multi-outlet',
      ],
    },
    {
      slug: 'pos-enterprise',
      name: 'POS Enterprise',
      tagline: 'Jaringan outlet yang terpantau, tersambung, dan terbukukan.',
      description:
        'Hampir seluruh katalog untuk jaringan ritel dan apotek: harga serta pajak berbeda per outlet, kasir yang tetap jalan saat internet putus, pembelian ke supplier, laba kotor per produk, sampai sambungan ke payment gateway, software akuntansi, dan kanal penjualan online. Modul restoran ditambahkan terpisah bila Anda juga mengelola dapur.',
      bestFor: [
        'Sembilan sampai dua puluh outlet dengan tim pusat yang mengawasi.',
        'Jaringan ritel, apotek, atau retail modern dengan banyak metode pembayaran.',
        'Sudah punya tim keuangan yang memakai software akuntansi.',
        'Berjualan juga lewat marketplace atau layanan pesan antar.',
      ],
      features: [
        // Seluruh CORE
        'master-produk-varian',
        'master-kategori',
        'master-outlet',
        'kasir-layar-sentuh',
        'pembayaran-tunai',
        'manajemen-pengguna',
        'hak-akses-peran',
        'audit-log',
        // Data induk lanjutan
        'harga-pajak-per-outlet',
        // Kasir
        'pencarian-produk-barcode',
        'tahan-lanjutkan-transaksi',
        'split-bill',
        'retur-pembatalan-penjualan',
        'mode-offline',
        'struk-cetak-digital',
        // Pembayaran
        'pembayaran-qris',
        'pembayaran-kartu-edc',
        'pembayaran-ewallet',
        'pembayaran-gabungan',
        'uang-muka-pesanan',
        // Stok
        'stok-per-outlet',
        'transfer-stok-antar-outlet',
        'stok-opname-outlet',
        'penerimaan-barang-supplier',
        // Promo & loyalitas
        'diskon-promo-terjadwal',
        'kartu-member-pelanggan',
        'poin-loyalitas',
        'voucher-kode-potongan',
        // Shift & kas
        'buka-tutup-shift',
        'hitung-kas-fisik',
        'setoran-kas-outlet',
        // Laporan
        'laporan-penjualan-harian',
        'laporan-per-produk',
        'laporan-per-kasir',
        'laporan-laba-kotor',
        'dashboard-multi-outlet',
        // Integrasi
        'integrasi-payment-gateway',
        'integrasi-akuntansi',
        'integrasi-marketplace',
      ],
    },
  ],

  // -------------------------------------------------------------------------
  // WIZARD
  // Seluruh pertanyaan berbasis kondisi bisnis yang diketahui pemilik toko,
  // bukan istilah teknis (B3, B4).
  // -------------------------------------------------------------------------
  wizard: [
    {
      slug: 'jenis-usaha',
      question: 'Jenis usaha apa yang Anda jalankan?',
      helpText: 'Pilih yang paling mendekati. Kebutuhan dapur dan kebutuhan rak memang berbeda.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'ritel-umum',
          label: 'Toko ritel atau minimarket',
          description: 'Barang dijual per kemasan dan dipindai di kasir.',
          icon: 'ShoppingCart',
          maps: [
            {
              feature: 'pencarian-produk-barcode',
              reason: 'Direkomendasikan karena usaha ritel menjual ratusan jenis barang berbarcode yang tidak mungkin dihafal kasir.',
            },
            {
              feature: 'stok-per-outlet',
              reason: 'Direkomendasikan karena barang ritel berkurang setiap penjualan dan harus terlihat sisanya secara langsung.',
            },
            {
              feature: 'laporan-per-produk',
              reason: 'Direkomendasikan agar Anda tahu barang mana yang layak ditambah dan mana yang hanya memakan rak.',
            },
          ],
        },
        {
          slug: 'fnb',
          label: 'Restoran, kafe, atau kedai',
          description: 'Pesanan dicatat dari meja lalu dikerjakan dapur.',
          icon: 'UtensilsCrossed',
          maps: [
            {
              feature: 'manajemen-meja-pesanan',
              reason: 'Direkomendasikan karena usaha makanan mencatat pesanan per meja, bukan per keranjang belanja.',
            },
            {
              feature: 'tampilan-dapur',
              reason: 'Direkomendasikan agar pesanan sampai ke dapur tanpa kertas yang terselip saat jam ramai.',
            },
            {
              feature: 'resep-bahan-baku',
              reason: 'Direkomendasikan agar setiap porsi yang terjual otomatis mengurangi stok bahan baku di dapur.',
            },
            {
              feature: 'split-bill',
              reason: 'Direkomendasikan karena rombongan di restoran kerap meminta tagihan dipisah per orang.',
            },
          ],
        },
        {
          slug: 'apotek',
          label: 'Apotek atau toko obat',
          description: 'Butuh ketelitian stok dan jejak setiap perubahan.',
          icon: 'Pill',
          maps: [
            {
              feature: 'stok-opname-outlet',
              reason: 'Direkomendasikan karena apotek wajib mencocokkan stok fisik secara berkala, bukan hanya saat akhir tahun.',
            },
            {
              feature: 'penerimaan-barang-supplier',
              reason: 'Direkomendasikan agar pembelian dari distributor tercatat beserta harga modal terbarunya.',
            },
            {
              feature: 'laporan-laba-kotor',
              reason: 'Direkomendasikan karena margin obat berbeda jauh antar item dan perlu dipantau per produk.',
            },
            {
              feature: 'audit-log',
              reason: 'Direkomendasikan agar setiap perubahan stok dan pembatalan penjualan punya jejak yang bisa diperiksa.',
            },
          ],
        },
        {
          slug: 'jasa',
          label: 'Usaha jasa (salon, laundry, bengkel)',
          description: 'Pelanggan memesan dulu, mengambil kemudian.',
          icon: 'Scissors',
          maps: [
            {
              feature: 'uang-muka-pesanan',
              reason: 'Direkomendasikan karena usaha jasa umumnya menerima uang muka lebih dulu dan dilunasi saat pengambilan.',
            },
            {
              feature: 'kartu-member-pelanggan',
              reason: 'Direkomendasikan karena pelanggan jasa cenderung berulang dan riwayat layanannya perlu tersimpan.',
            },
            {
              feature: 'struk-cetak-digital',
              reason: 'Direkomendasikan agar bukti pesanan bisa dikirim ke WhatsApp pelanggan sebagai tanda terima.',
            },
          ],
        },
      ],
    },
    {
      slug: 'jumlah-outlet',
      question: 'Berapa outlet yang Anda kelola saat ini?',
      helpText: 'Hitung juga gerai kecil, kios, dan cabang yang baru akan dibuka tahun ini.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'satu-outlet',
          label: '1 outlet',
          description: 'Semua penjualan terjadi di satu lokasi.',
          icon: 'Store',
          suggestPresetSlug: 'pos-starter',
          maps: [
            {
              feature: 'laporan-penjualan-harian',
              reason: 'Direkomendasikan karena dengan satu outlet, rekap harian adalah alat pantau utama Anda.',
            },
            {
              feature: 'buka-tutup-shift',
              reason: 'Direkomendasikan agar uang di laci tetap terhitung meski hanya ada satu atau dua kasir.',
            },
          ],
        },
        {
          slug: 'dua-lima-outlet',
          label: '2 – 5 outlet',
          description: 'Outlet utama dan beberapa cabang.',
          icon: 'Building2',
          suggestPresetSlug: 'pos-growth',
          maps: [
            {
              feature: 'stok-per-outlet',
              reason: 'Direkomendasikan karena Anda punya lebih dari 1 outlet, sehingga stok tiap cabang harus dihitung terpisah.',
            },
            {
              feature: 'transfer-stok-antar-outlet',
              reason: 'Direkomendasikan agar barang yang menumpuk di satu cabang bisa dipindahkan dengan jejak yang jelas.',
            },
            {
              feature: 'dashboard-multi-outlet',
              reason: 'Direkomendasikan agar seluruh cabang terlihat dalam satu halaman tanpa perlu menelepon satu per satu.',
            },
          ],
        },
        {
          slug: 'enam-sepuluh-outlet',
          label: '6 – 10 outlet',
          description: 'Jaringan menengah dengan tim pusat.',
          icon: 'Network',
          suggestPresetSlug: 'pos-growth',
          maps: [
            {
              feature: 'dashboard-multi-outlet',
              reason: 'Direkomendasikan karena outlet sebanyak ini mustahil dipantau lewat rekap manual tiap pagi.',
            },
            {
              feature: 'transfer-stok-antar-outlet',
              reason: 'Direkomendasikan karena perpindahan barang antar cabang menjadi rutin pada skala ini.',
            },
            {
              feature: 'setoran-kas-outlet',
              reason: 'Direkomendasikan agar setoran tunai dari tiap outlet ke pusat tercatat beserta buktinya.',
            },
            {
              feature: 'hak-akses-peran',
              reason: 'Direkomendasikan agar manajer cabang hanya melihat data outletnya sendiri.',
            },
          ],
        },
        {
          slug: 'sebelas-duapuluh-outlet',
          label: '11 – 20 outlet',
          description: 'Jaringan besar dengan standar operasi seragam.',
          icon: 'Globe',
          suggestPresetSlug: 'pos-enterprise',
          maps: [
            {
              feature: 'harga-pajak-per-outlet',
              reason: 'Direkomendasikan karena pada jaringan sebesar ini harga dan pajak biasanya berbeda antar lokasi.',
            },
            {
              feature: 'integrasi-akuntansi',
              reason: 'Direkomendasikan karena volume transaksi sebanyak ini tidak lagi masuk akal dibukukan manual.',
            },
            {
              feature: 'dashboard-multi-outlet',
              reason: 'Direkomendasikan agar kinerja seluruh cabang bisa dibandingkan dengan ukuran yang sama.',
            },
            {
              feature: 'setoran-kas-outlet',
              reason: 'Direkomendasikan agar aliran uang tunai dari semua outlet ke pusat dapat ditelusuri.',
            },
            {
              feature: 'audit-log',
              reason: 'Direkomendasikan agar setiap aksi sensitif di cabang mana pun meninggalkan jejak.',
            },
          ],
        },
      ],
    },
    {
      slug: 'kasir-per-outlet',
      question: 'Berapa kasir yang bertugas di satu outlet?',
      helpText: 'Hitung per shift, bukan total karyawan.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'satu-kasir',
          label: '1 kasir',
          description: 'Pemilik atau satu karyawan merangkap kasir.',
          icon: 'User',
          maps: [
            {
              feature: 'buka-tutup-shift',
              reason: 'Direkomendasikan agar modal awal dan hasil penjualan tetap terpisah meski hanya satu orang yang bertugas.',
            },
            {
              feature: 'hitung-kas-fisik',
              reason: 'Direkomendasikan agar selisih uang di laci ketahuan setiap hari, bukan setiap akhir bulan.',
            },
          ],
        },
        {
          slug: 'dua-tiga-kasir',
          label: '2 – 3 kasir bergantian',
          description: 'Ada pergantian shift pagi dan sore.',
          icon: 'Users',
          maps: [
            {
              feature: 'buka-tutup-shift',
              reason: 'Direkomendasikan karena dengan shift bergantian, selisih kas harus bisa ditelusuri ke shift tertentu.',
            },
            {
              feature: 'hitung-kas-fisik',
              reason: 'Direkomendasikan agar serah terima laci antar shift punya angka, bukan sekadar kepercayaan.',
            },
            {
              feature: 'laporan-per-kasir',
              reason: 'Direkomendasikan agar penjualan dan pembatalan dapat dibaca per orang yang bertugas.',
            },
          ],
        },
        {
          slug: 'empat-kasir-lebih',
          label: '4 kasir atau lebih',
          description: 'Beberapa terminal berjalan bersamaan.',
          icon: 'UsersRound',
          maps: [
            {
              feature: 'laporan-per-kasir',
              reason: 'Direkomendasikan karena dengan banyak kasir, kinerja dan pola pembatalan perlu dibandingkan antar orang.',
            },
            {
              feature: 'tahan-lanjutkan-transaksi',
              reason: 'Direkomendasikan karena antrean panjang menuntut kasir bisa menahan satu transaksi tanpa menghentikan yang lain.',
            },
            {
              feature: 'pencarian-produk-barcode',
              reason: 'Direkomendasikan karena kecepatan tiap terminal menentukan panjang antrean di jam sibuk.',
            },
            {
              feature: 'hak-akses-peran',
              reason: 'Direkomendasikan agar pembatalan dan diskon hanya bisa disetujui supervisor yang berwenang.',
            },
          ],
        },
      ],
    },
    {
      slug: 'kestabilan-internet',
      question: 'Bagaimana kondisi internet di outlet Anda?',
      helpText: 'Jawaban ini menentukan apakah kasir perlu tetap jalan saat koneksi terputus.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'sering-putus',
          label: 'Sering putus atau sinyalnya lemah',
          description: 'Outlet di pasar, basement, atau daerah dengan sinyal terbatas.',
          icon: 'WifiOff',
          maps: [
            {
              feature: 'mode-offline',
              reason: 'Direkomendasikan karena internet di lokasi Anda sering putus dan kasir tidak boleh ikut berhenti melayani.',
            },
            {
              feature: 'struk-cetak-digital',
              reason: 'Direkomendasikan agar struk tetap keluar dari printer lokal meski koneksi ke pusat sedang terputus.',
            },
          ],
        },
        {
          slug: 'kadang-putus',
          label: 'Kadang putus, tidak sampai mengganggu',
          description: 'Ada gangguan sesekali, biasanya cepat pulih.',
          icon: 'Wifi',
          maps: [
            {
              feature: 'mode-offline',
              reason: 'Direkomendasikan sebagai pengaman agar gangguan sesaat tidak membuat antrean berhenti sama sekali.',
            },
          ],
        },
        {
          slug: 'internet-stabil',
          label: 'Stabil, ada WiFi dan cadangan',
          description: 'Koneksi utama dan cadangan tersedia di setiap outlet.',
          icon: 'Router',
          maps: [
            {
              feature: 'integrasi-payment-gateway',
              reason: 'Direkomendasikan karena koneksi Anda stabil, sehingga status pembayaran digital bisa diandalkan secara langsung.',
            },
            {
              feature: 'dashboard-multi-outlet',
              reason: 'Direkomendasikan agar data tiap outlet terkirim ke pusat tanpa jeda dan bisa dipantau seketika.',
            },
          ],
        },
      ],
    },
    {
      slug: 'program-member',
      question: 'Apakah Anda punya program pelanggan tetap?',
      helpText: 'Termasuk kartu member, kartu stempel, atau diskon khusus langganan.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'member-sudah-jalan',
          label: 'Sudah jalan, tinggal dipindahkan',
          description: 'Sudah ada daftar member dan aturan poinnya.',
          icon: 'BadgeCheck',
          maps: [
            {
              feature: 'kartu-member-pelanggan',
              reason: 'Direkomendasikan karena daftar member yang sudah ada perlu tempat tinggal yang bisa diakses semua outlet.',
            },
            {
              feature: 'poin-loyalitas',
              reason: 'Direkomendasikan karena Anda sudah punya program poin yang aturannya perlu dijalankan otomatis di kasir.',
            },
            {
              feature: 'voucher-kode-potongan',
              reason: 'Direkomendasikan agar voucher hadiah untuk member tidak bisa dipakai berulang.',
            },
            {
              feature: 'diskon-promo-terjadwal',
              reason: 'Direkomendasikan agar promo khusus member berjalan sesuai jadwal tanpa dihafal kasir.',
            },
          ],
        },
        {
          slug: 'member-ingin-mulai',
          label: 'Belum, tapi ingin mulai',
          description: 'Pelanggan tetap sudah banyak, tinggal diformalkan.',
          icon: 'UserPlus',
          maps: [
            {
              feature: 'kartu-member-pelanggan',
              reason: 'Direkomendasikan sebagai langkah pertama, karena program apa pun butuh daftar pelanggan lebih dulu.',
            },
            {
              feature: 'poin-loyalitas',
              reason: 'Direkomendasikan agar pelanggan punya alasan konkret untuk kembali berbelanja di tempat Anda.',
            },
          ],
        },
        {
          slug: 'member-belum-perlu',
          label: 'Belum perlu untuk sekarang',
          description: 'Fokus dulu ke kecepatan kasir dan ketertiban stok.',
          icon: 'CircleSlash',
          maps: [
            {
              feature: 'diskon-promo-terjadwal',
              reason: 'Direkomendasikan karena tanpa program member pun, promo terjadwal tetap alat paling cepat menaikkan penjualan.',
            },
          ],
        },
      ],
    },
    {
      slug: 'alat-pembayaran',
      question: 'Alat pembayaran apa yang sudah Anda pakai?',
      helpText: 'Termasuk mesin EDC dari bank dan stiker QRIS di meja kasir.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'edc-dan-qris',
          label: 'Sudah pakai EDC dan QRIS',
          description: 'Menerima kartu, QRIS, dan dompet digital.',
          icon: 'CreditCard',
          maps: [
            {
              feature: 'pembayaran-kartu-edc',
              reason: 'Direkomendasikan karena Anda sudah memakai mesin EDC, sehingga setiap transaksi kartu perlu tercatat lengkap dengan banknya.',
            },
            {
              feature: 'pembayaran-qris',
              reason: 'Direkomendasikan agar pembayaran QRIS tercatat langsung sebagai lunas di struk yang sama.',
            },
            {
              feature: 'pembayaran-ewallet',
              reason: 'Direkomendasikan agar penjualan lewat dompet digital terpisah rapi dari penjualan tunai.',
            },
            {
              feature: 'pembayaran-gabungan',
              reason: 'Direkomendasikan karena dengan banyak metode bayar, pembeli kerap membayar sebagian tunai dan sisanya digital.',
            },
            {
              feature: 'integrasi-payment-gateway',
              reason: 'Direkomendasikan agar uang masuk dari seluruh metode digital tercocokkan otomatis, bukan diperiksa manual tiap malam.',
            },
          ],
        },
        {
          slug: 'qris-saja',
          label: 'Baru QRIS statis dari bank',
          description: 'Pembeli memindai stiker QR di meja kasir.',
          icon: 'QrCode',
          maps: [
            {
              feature: 'pembayaran-qris',
              reason: 'Direkomendasikan agar pembayaran QRIS masuk ke struk dan laporan, bukan hanya terlihat di ponsel pembeli.',
            },
            {
              feature: 'pembayaran-ewallet',
              reason: 'Direkomendasikan karena pembeli yang terbiasa QRIS umumnya juga membayar lewat dompet digital.',
            },
            {
              feature: 'rekonsiliasi-nontunai-manual',
              reason: 'Direkomendasikan karena dengan QRIS statis, setoran ke rekening masih perlu dicocokkan sendiri setiap hari.',
            },
          ],
        },
        {
          slug: 'tunai-saja',
          label: 'Masih tunai semua',
          description: 'Belum ada mesin EDC maupun QRIS.',
          icon: 'Banknote',
          maps: [
            {
              feature: 'pembayaran-qris',
              reason: 'Direkomendasikan sebagai langkah pertama ke pembayaran digital yang paling murah dan paling banyak dipakai pembeli.',
            },
            {
              feature: 'hitung-kas-fisik',
              reason: 'Direkomendasikan karena selama penjualan masih tunai, hitungan laci adalah pengaman utama Anda.',
            },
            {
              feature: 'setoran-kas-outlet',
              reason: 'Direkomendasikan agar uang tunai yang disetor ke bank tercatat beserta bukti setornya.',
            },
          ],
        },
      ],
    },
  ],
};
