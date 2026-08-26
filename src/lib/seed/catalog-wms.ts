import type { CatalogDefinition } from './types';

/**
 * Katalog kategori WMS — Sistem Manajemen Gudang.
 *
 * Sasaran pengguna: pemilik usaha distribusi/manufaktur dengan 1–5 gudang,
 * 18–200 karyawan, yang hari ini masih menjalankan gudang dengan Excel dan
 * WhatsApp. Karena itu seluruh nama fitur ditulis dalam bahasa operasional
 * gudang, bukan bahasa developer (Prinsip Produk #4).
 *
 * Catatan man-day (BR-18): manDayMin/manDayMax adalah MAN-DAY REFERENSI —
 * effort seandainya fitur dibangun dari nol. Batas lebar rentang mengikuti
 * BASELINE_PRICING_RULE: CORE 1,15x — STANDARD 1,30x — CONFIGURABLE 1,80x.
 */
export const WMS_CATALOG: CatalogDefinition = {
  slug: 'wms',
  name: 'WMS — Sistem Manajemen Gudang',
  shortName: 'WMS',
  icon: 'Warehouse',
  accent: 'amber',
  tagline: 'Stok yang bisa dipercaya, tanpa hitung ulang setiap akhir bulan.',
  description:
    'Sistem gudang yang mencatat setiap barang masuk, pindah, dan keluar sehingga angka stok di layar sama dengan yang ada di rak.',
  longDescription:
    'Gudang yang dijalankan dengan Excel dan grup WhatsApp selalu berakhir sama: angka stok benar hanya sampai orang berikutnya lupa mencatat. Selisih baru ketahuan saat stock opname, dan saat itu tidak ada yang bisa menjelaskan penyebabnya. Sistem Manajemen Gudang RAKIT memindahkan pencatatan itu ke satu tempat yang dipakai bersama, dari penerimaan barang sampai surat jalan.\n\nKatalog ini disusun mengikuti alur kerja nyata gudang distribusi dan manufaktur di Indonesia: master barang dan supplier, penerimaan berbasis Purchase Order, penataan barang ke rak, pengeluaran lewat Sales Order dan picking list, sampai stock opname dan penyesuaian stok. Setiap perpindahan meninggalkan jejak, jadi pertanyaan "kenapa stoknya kurang tiga dus" punya jawaban, bukan tebakan.\n\nAnda memilih sendiri fitur mana yang dipakai. Gudang tunggal dengan dua ribu SKU tidak perlu membayar putaway otomatis atau pelacakan nomor seri. Sebaliknya, distributor makanan dengan lima gudang bisa menambahkan manajemen kedaluwarsa, strategi picking FEFO, dan integrasi akuntansi sejak hari pertama.',
  benefits: [
    'Angka stok di sistem sama dengan isi rak, sehingga tim penjualan berhenti menjanjikan barang yang sebenarnya kosong.',
    'Setiap selisih stok punya riwayat: siapa yang memindahkan, kapan, dan dari dokumen mana.',
    'Stock opname tidak lagi menutup gudang seharian penuh karena penghitungan bisa dijadwalkan per rak.',
    'Barang lama dan barang mendekati kedaluwarsa terlihat sebelum menjadi kerugian.',
    'Surat jalan, picking list, dan label barcode tercetak dari data yang sama, jadi tidak ada salah ketik antar dokumen.',
    'Pemilik bisa melihat nilai persediaan dan pergerakan barang tanpa menunggu rekap manual dari admin gudang.',
  ],
  painPoints: [
    {
      title: 'Stok di Excel dan stok di rak tidak pernah sama',
      body: 'File stok dipegang admin, tetapi barang keluar-masuk lewat lisan dan WhatsApp. Saat dicocokkan akhir bulan, selisihnya puluhan item dan tidak ada yang tahu hilang di tahap mana.',
    },
    {
      title: 'Barang ada di gudang tapi tidak ketemu',
      body: 'Tidak ada catatan rak. Barang yang jelas tercatat masih ada harus dicari satu per satu, dan pengiriman tertunda hanya karena tim tidak tahu barang itu ditaruh di mana.',
    },
    {
      title: 'Stock opname menutup operasional dan hasilnya tetap diragukan',
      body: 'Gudang berhenti satu sampai dua hari untuk menghitung semuanya. Setelah selesai, selisihnya tetap besar dan penyesuaian dilakukan tanpa penjelasan penyebab.',
    },
    {
      title: 'Barang lama menumpuk sampai kedaluwarsa',
      body: 'Tidak ada yang memantau umur stok. Barang yang masuk lebih dulu justru tersimpan di belakang, dan baru ketahuan saat sudah tidak bisa dijual.',
    },
  ],
  minViableFeatureCount: 9,
  seoTitle: 'Software WMS Indonesia — Sistem Manajemen Gudang Custom | RAKIT',
  seoDescription:
    'Bangun sistem manajemen gudang sesuai alur kerja Anda: penerimaan barang, penataan rak, picking, surat jalan, stock opname, dan laporan stok. Pilih fiturnya, lihat estimasi harganya.',

  // -------------------------------------------------------------------------
  // KELOMPOK FITUR
  // -------------------------------------------------------------------------
  groups: [
    // ---- 1. Master Data ---------------------------------------------------
    {
      slug: 'master-data',
      name: 'Data Induk',
      description:
        'Fondasi seluruh sistem: daftar barang, mitra, dan tempat penyimpanan yang dipakai semua modul lain.',
      icon: 'Boxes',
      features: [
        {
          slug: 'master-barang-sku',
          name: 'Daftar Barang & Kode SKU',
          clientDescription:
            'Satu daftar barang yang dipakai seluruh tim, lengkap dengan kode SKU, foto, dan satuan. Tidak ada lagi satu barang tercatat dengan tiga nama berbeda di tiga file berbeda.',
          internalDescription:
            'Entitas Item: SKU unik, kategori, barcode, satuan dasar, atribut kustom, gambar, status aktif. Menjadi foreign key hampir seluruh modul.',
          type: 'CORE',
          manDayMin: 3.5,
          manDayMax: 4,
          keywords: ['master barang', 'sku', 'daftar produk', 'kode barang'],
          sortOrder: 10,
          seoTitle: 'Master Data Barang & SKU untuk Gudang | RAKIT',
          seoDescription:
            'Kelola satu daftar barang terpusat dengan kode SKU, barcode, dan satuan agar seluruh tim gudang memakai data yang sama.',
        },
        {
          slug: 'master-supplier',
          name: 'Daftar Supplier',
          clientDescription:
            'Data pemasok beserta kontak, alamat kirim, dan syarat pembayaran tersimpan rapi. Saat membuat pesanan pembelian, semuanya tinggal dipilih, tidak diketik ulang.',
          internalDescription:
            'Entitas Supplier: kontak person, termin, lead time, daftar item yang dipasok. Dipakai PO, GRN, dan retur ke supplier.',
          type: 'CORE',
          manDayMin: 2.4,
          manDayMax: 2.7,
          keywords: ['supplier', 'pemasok', 'vendor', 'data vendor'],
          sortOrder: 20,
        },
        {
          slug: 'master-pelanggan',
          name: 'Daftar Pelanggan',
          clientDescription:
            'Data pelanggan beserta alamat pengiriman dan harga khusus tersimpan di satu tempat. Surat jalan dan sales order langsung memakai alamat yang benar tanpa konfirmasi ulang.',
          internalDescription:
            'Entitas Customer: multi alamat kirim, kontak, term of payment, kategori harga.',
          type: 'CORE',
          manDayMin: 2.4,
          manDayMax: 2.7,
          keywords: ['pelanggan', 'customer', 'alamat kirim', 'data pembeli'],
          sortOrder: 30,
        },
        {
          slug: 'master-gudang',
          name: 'Daftar Gudang',
          clientDescription:
            'Setiap gudang atau titik penyimpanan punya identitas sendiri, jadi stok tidak lagi dijumlahkan menjadi satu angka besar yang menyesatkan. Anda tahu barang itu ada di gudang mana.',
          internalDescription:
            'Entitas Warehouse: kode, alamat, penanggung jawab, jenis (utama, transit, retur). Basis seluruh perhitungan stok per lokasi.',
          type: 'CORE',
          manDayMin: 2.2,
          manDayMax: 2.5,
          keywords: ['gudang', 'multi gudang', 'lokasi penyimpanan'],
          sortOrder: 40,
        },
        {
          slug: 'master-lokasi-rak',
          name: 'Peta Rak & Lokasi Simpan',
          clientDescription:
            'Gudang dipetakan sampai level rak, baris, dan tingkat. Barang tidak lagi dicari satu per satu karena sistem menunjukkan persis di rak mana barang itu diletakkan.',
          internalDescription:
            'Hirarki zone > aisle > rack > bin dengan kode lokasi tercetak. Kapasitas per bin, jenis bin (picking, bulk, quarantine).',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.7,
          keywords: ['lokasi rak', 'bin', 'peta gudang', 'tata letak gudang'],
          sortOrder: 50,
          seoTitle: 'Manajemen Lokasi Rak Gudang (Binning) | RAKIT',
          seoDescription:
            'Petakan gudang sampai level rak dan bin agar setiap barang punya alamat simpan yang jelas dan cepat ditemukan.',
        },
        {
          slug: 'master-satuan-konversi',
          name: 'Satuan & Konversi Dus ke Pcs',
          clientDescription:
            'Barang bisa dibeli per dus, disimpan per karton, dan dijual per pcs tanpa hitung manual. Sistem yang mengubah satuannya, jadi tidak ada lagi salah kali dua belas.',
          internalDescription:
            'UoM tree per item dengan faktor konversi, satuan dasar untuk stok, satuan beli dan satuan jual default.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          keywords: ['satuan', 'konversi dus', 'uom', 'pcs karton'],
          sortOrder: 60,
        },
      ],
    },

    // ---- 2. Penerimaan ----------------------------------------------------
    {
      slug: 'penerimaan',
      name: 'Penerimaan Barang',
      description:
        'Dari pesanan ke supplier sampai barang resmi masuk hitungan stok.',
      icon: 'PackageCheck',
      features: [
        {
          slug: 'purchase-order',
          name: 'Purchase Order ke Supplier',
          clientDescription:
            'Pesanan ke supplier dibuat dan disetujui di dalam sistem, bukan lewat chat. Anda selalu tahu barang apa yang sudah dipesan tetapi belum datang.',
          internalDescription:
            'PO dengan approval bertingkat, status open/partial/closed, lampiran, dan cetak PDF. Menjadi acuan pencocokan GRN.',
          type: 'STANDARD',
          manDayMin: 3.2,
          manDayMax: 4,
          isEssential: true,
          keywords: ['purchase order', 'po', 'pesan barang', 'pembelian'],
          sortOrder: 70,
        },
        {
          slug: 'penerimaan-barang',
          name: 'Penerimaan Barang (GRN)',
          clientDescription:
            'Barang datang dicek langsung terhadap pesanannya, termasuk bila dikirim bertahap. Kelebihan dan kekurangan kiriman ketahuan di meja penerimaan, bukan sebulan kemudian.',
          internalDescription:
            'GRN dengan pencocokan terhadap PO, dukungan penerimaan parsial (sisa PO tetap open), pencatatan nomor surat jalan supplier, dan posting stok masuk.',
          type: 'STANDARD',
          manDayMin: 3.4,
          manDayMax: 4.2,
          isEssential: true,
          keywords: ['penerimaan barang', 'grn', 'barang masuk', 'terima kiriman'],
          sortOrder: 80,
          seoTitle: 'Penerimaan Barang Gudang (GRN) Otomatis | RAKIT',
          seoDescription:
            'Catat barang masuk langsung dari Purchase Order, termasuk kiriman bertahap, dan pastikan jumlah yang diterima sesuai yang dipesan.',
        },
        {
          slug: 'inspeksi-kualitas',
          name: 'Pemeriksaan Mutu Barang Masuk',
          clientDescription:
            'Barang yang baru datang ditahan dulu sampai lolos pemeriksaan, sehingga barang cacat tidak pernah masuk ke stok yang siap dijual. Alasan penolakan tercatat per kiriman.',
          internalDescription:
            'Alur QC dengan lokasi karantina, checklist per kategori barang, hasil pass/partial/reject, dan pemicu otomatis retur ke supplier. Alur berbeda tiap industri, perlu penyesuaian.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 5.2,
          keywords: ['inspeksi', 'qc', 'quality control', 'barang cacat'],
          sortOrder: 90,
        },
        {
          slug: 'retur-ke-supplier',
          name: 'Retur Barang ke Supplier',
          clientDescription:
            'Barang rusak atau salah kirim dikembalikan dengan dokumen resmi dan stoknya otomatis berkurang. Klaim ke supplier punya bukti, bukan sekadar percakapan.',
          internalDescription:
            'Dokumen retur beli terkait GRN, alasan retur, status klaim (menunggu ganti, ganti barang, nota kredit).',
          type: 'STANDARD',
          manDayMin: 2.4,
          manDayMax: 3,
          keywords: ['retur supplier', 'barang rusak', 'klaim supplier'],
          sortOrder: 100,
        },
      ],
    },

    // ---- 3. Penyimpanan ---------------------------------------------------
    {
      slug: 'penyimpanan',
      name: 'Penyimpanan & Penataan',
      description:
        'Menaruh barang di tempat yang benar dan memindahkannya tanpa kehilangan jejak.',
      icon: 'Warehouse',
      features: [
        {
          slug: 'putaway-manual',
          name: 'Penempatan Barang ke Rak',
          clientDescription:
            'Petugas memilih sendiri rak tujuan setelah barang diterima, dan sistem mencatat pilihannya. Barang punya alamat sejak menit pertama masuk gudang.',
          internalDescription:
            'Putaway task manual: pilih bin tujuan, konfirmasi qty, update stok per lokasi. Alternatif sederhana dari putaway otomatis.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          keywords: ['putaway', 'simpan barang', 'penempatan rak'],
          sortOrder: 110,
        },
        {
          slug: 'putaway-otomatis',
          name: 'Saran Rak Otomatis',
          clientDescription:
            'Sistem menyarankan rak mana yang paling cocok untuk barang yang baru datang berdasarkan sisa ruang dan jenis barang. Petugas baru pun bisa menata gudang dengan benar di hari pertama.',
          internalDescription:
            'Rule engine saran lokasi: kapasitas bin, zona kategori, kedekatan area picking, rotasi FIFO. Aturan prioritas berbeda tiap klien, perlu konfigurasi.',
          type: 'CONFIGURABLE',
          manDayMin: 4.5,
          manDayMax: 6,
          keywords: ['putaway otomatis', 'saran lokasi', 'penempatan otomatis'],
          sortOrder: 120,
          seoTitle: 'Putaway Otomatis: Saran Lokasi Rak Gudang | RAKIT',
          seoDescription:
            'Sistem menentukan rak terbaik untuk setiap barang masuk berdasarkan kapasitas dan zona, sehingga penataan gudang tidak bergantung pada hafalan petugas.',
        },
        {
          slug: 'transfer-antar-lokasi',
          name: 'Pindah Barang Antar Rak',
          clientDescription:
            'Setiap perpindahan barang dari satu rak ke rak lain tercatat, jadi stok tidak pernah dianggap hilang hanya karena dipindah. Riwayatnya bisa ditelusuri kapan saja.',
          internalDescription:
            'Internal transfer antar bin dalam satu gudang, dengan alasan pindah dan pencatatan mutasi ganda (keluar-masuk lokasi).',
          type: 'STANDARD',
          manDayMin: 2.4,
          manDayMax: 3,
          keywords: ['transfer rak', 'pindah barang', 'mutasi lokasi'],
          sortOrder: 130,
        },
        {
          slug: 'transfer-antar-gudang',
          name: 'Kirim Barang Antar Gudang',
          clientDescription:
            'Barang yang dikirim dari gudang pusat ke cabang punya status "dalam perjalanan", jadi tidak terhitung dua kali atau hilang di tengah jalan. Gudang penerima wajib mengonfirmasi.',
          internalDescription:
            'Transfer order dua langkah dengan in-transit stock, konfirmasi terima, dan penanganan selisih kirim-terima.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.7,
          keywords: ['transfer gudang', 'antar cabang', 'mutasi gudang'],
          sortOrder: 140,
        },
        {
          slug: 'manajemen-batch-lot',
          name: 'Pelacakan Batch / Nomor Lot',
          clientDescription:
            'Setiap barang dicatat per batch produksi, jadi saat ada masalah mutu Anda tahu persis batch mana yang terkena dan sudah dikirim ke pelanggan siapa saja.',
          internalDescription:
            'Batch/lot tracking penuh: atribut batch (tanggal produksi, tanggal kedaluwarsa, sertifikat), stok per batch, dan penelusuran hulu-hilir. Struktur batch sangat berbeda antar industri.',
          type: 'CONFIGURABLE',
          manDayMin: 4.2,
          manDayMax: 5.6,
          keywords: ['batch', 'lot', 'penelusuran batch', 'recall'],
          sortOrder: 150,
        },
        {
          slug: 'pelacakan-serial-number',
          name: 'Pelacakan Nomor Seri',
          clientDescription:
            'Barang bernilai tinggi dilacak satu per satu lewat nomor serinya, dari diterima sampai diserahkan ke pelanggan. Klaim garansi bisa diverifikasi dalam hitungan detik.',
          internalDescription:
            'Serial number unik per unit, status per serial (in stock, shipped, returned), riwayat kepemilikan, dan validasi saat picking.',
          type: 'STANDARD',
          manDayMin: 3.2,
          manDayMax: 4,
          keywords: ['nomor seri', 'serial number', 'garansi', 'imei'],
          sortOrder: 160,
        },
        {
          slug: 'manajemen-kedaluwarsa',
          name: 'Kendali Tanggal Kedaluwarsa (FEFO)',
          clientDescription:
            'Barang yang paling dekat kedaluwarsa selalu ditawarkan keluar lebih dulu, dan Anda diperingatkan jauh hari sebelum barang tidak bisa dijual. Kerugian barang basi berhenti menjadi kejutan bulanan.',
          internalDescription:
            'Aturan FEFO pada alokasi stok, ambang peringatan bertingkat (90/60/30 hari), blokir otomatis batch lewat tanggal. Ambang dan kebijakan blokir dikonfigurasi per klien.',
          type: 'CONFIGURABLE',
          manDayMin: 3.8,
          manDayMax: 5.2,
          keywords: ['kedaluwarsa', 'expired', 'fefo', 'masa simpan'],
          sortOrder: 170,
          seoTitle: 'Manajemen Kedaluwarsa Barang FEFO di Gudang | RAKIT',
          seoDescription:
            'Pantau tanggal kedaluwarsa per batch dan keluarkan barang yang paling dekat kedaluwarsa lebih dulu agar stok tidak menjadi kerugian.',
        },
      ],
    },

    // ---- 4. Pengeluaran ---------------------------------------------------
    {
      slug: 'pengeluaran',
      name: 'Pengeluaran & Pengiriman',
      description:
        'Dari pesanan pelanggan sampai barang naik ke kendaraan pengiriman.',
      icon: 'Truck',
      features: [
        {
          slug: 'sales-order',
          name: 'Pesanan Penjualan (Sales Order)',
          clientDescription:
            'Pesanan pelanggan masuk ke satu antrean yang sama dan langsung mengunci stok, jadi barang yang sudah dijanjikan tidak ikut terjual ke orang lain.',
          internalDescription:
            'SO dengan reservasi stok, status open/partial/fulfilled, cek ketersediaan real time, dan approval batas kredit opsional.',
          type: 'STANDARD',
          manDayMin: 3.4,
          manDayMax: 4.2,
          isEssential: true,
          keywords: ['sales order', 'pesanan', 'so', 'order pelanggan'],
          sortOrder: 180,
        },
        {
          slug: 'picking-list',
          name: 'Daftar Ambil Barang (Picking List)',
          clientDescription:
            'Petugas gudang menerima daftar barang beserta lokasi raknya, urut sesuai jalur berjalan. Waktu ambil barang turun drastis dan salah ambil hampir tidak terjadi.',
          internalDescription:
            'Picking task per SO atau gelombang, urutan berdasarkan rute bin, konfirmasi qty per baris, penanganan short pick.',
          type: 'STANDARD',
          manDayMin: 3.2,
          manDayMax: 4,
          keywords: ['picking list', 'ambil barang', 'daftar pengambilan'],
          sortOrder: 190,
          seoTitle: 'Picking List Gudang Otomatis dari Sales Order | RAKIT',
          seoDescription:
            'Cetak daftar pengambilan barang lengkap dengan lokasi rak dan urutan jalur, agar proses picking cepat dan minim salah ambil.',
        },
        {
          slug: 'strategi-picking',
          name: 'Aturan Urutan Pengambilan (FIFO/FEFO/LIFO)',
          clientDescription:
            'Anda menentukan barang mana yang harus keluar lebih dulu: yang paling lama masuk, yang paling dekat kedaluwarsa, atau yang paling baru. Sistem yang memaksakannya, bukan kebiasaan petugas.',
          internalDescription:
            'Strategi alokasi stok per kategori barang: FIFO, FEFO, LIFO, atau nearest-bin. Kombinasi aturan berbeda tiap klien.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 5.4,
          keywords: ['fifo', 'fefo', 'lifo', 'strategi picking'],
          sortOrder: 200,
        },
        {
          slug: 'packing-verifikasi',
          name: 'Pengemasan & Cek Ulang Kiriman',
          clientDescription:
            'Sebelum dikemas, isi paket diperiksa ulang terhadap pesanan. Komplain "barang kurang" dari pelanggan berkurang karena setiap paket sudah terverifikasi.',
          internalDescription:
            'Packing station: scan verifikasi per item, pembentukan koli, berat dan dimensi, cetak label koli.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          keywords: ['packing', 'pengemasan', 'verifikasi kiriman', 'koli'],
          sortOrder: 210,
        },
        {
          slug: 'surat-jalan',
          name: 'Surat Jalan',
          clientDescription:
            'Surat jalan tercetak otomatis dari pesanan yang sudah dipacking, dengan penomoran berurutan yang tidak bisa ganda. Bukti terima dari pelanggan tersimpan di dokumen yang sama.',
          internalDescription:
            'Delivery order dengan penomoran otomatis, template cetak, tanda tangan penerima (unggah foto atau tanda tangan digital), posting stok keluar.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          isEssential: true,
          keywords: ['surat jalan', 'delivery order', 'do', 'bukti kirim'],
          sortOrder: 220,
          seoTitle: 'Cetak Surat Jalan Otomatis dari Sistem Gudang | RAKIT',
          seoDescription:
            'Surat jalan tercetak langsung dari data pesanan dengan penomoran otomatis dan bukti terima pelanggan yang tersimpan rapi.',
        },
        {
          slug: 'manajemen-pengiriman',
          name: 'Pengaturan Rute & Armada Kirim',
          clientDescription:
            'Kiriman dikelompokkan per kendaraan dan per rute, lengkap dengan status perjalanan. Anda bisa menjawab "barang saya sampai kapan" tanpa menelepon sopir.',
          internalDescription:
            'Shipment planning: muatan per armada, urutan drop, status in-transit/delivered/failed, bukti pengiriman, biaya kirim per rute. Model armada tiap klien berbeda.',
          type: 'CONFIGURABLE',
          manDayMin: 4.2,
          manDayMax: 5.6,
          keywords: ['pengiriman', 'rute', 'armada', 'ekspedisi'],
          sortOrder: 230,
        },
        {
          slug: 'retur-dari-pelanggan',
          name: 'Retur dari Pelanggan',
          clientDescription:
            'Barang yang dikembalikan pelanggan masuk kembali ke stok lewat pemeriksaan, bukan langsung ditumpuk di sudut gudang. Anda tahu berapa nilai barang retur yang masih bisa dijual.',
          internalDescription:
            'Return order terkait surat jalan, kondisi barang (layak jual, perlu perbaikan, rusak), lokasi retur terpisah, dan penyesuaian stok otomatis.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          keywords: ['retur pelanggan', 'barang kembali', 'return'],
          sortOrder: 240,
        },
      ],
    },

    // ---- 5. Stock Opname --------------------------------------------------
    {
      slug: 'stock-opname',
      name: 'Stock Opname & Penyesuaian',
      description:
        'Mencocokkan angka sistem dengan isi rak, dan mencatat setiap koreksinya.',
      icon: 'ClipboardCheck',
      features: [
        {
          slug: 'stock-opname-penuh',
          name: 'Stock Opname Seluruh Gudang',
          clientDescription:
            'Penghitungan menyeluruh dijalankan dengan lembar hitung yang dibagi per petugas, dan hasilnya langsung dibandingkan dengan catatan sistem. Selisih terlihat per barang, bukan sebagai satu angka besar.',
          internalDescription:
            'Sesi opname dengan freeze stok, penugasan area per petugas, entri hitungan (blind atau open count), rekap variance, dan posting penyesuaian.',
          type: 'STANDARD',
          manDayMin: 3.4,
          manDayMax: 4.2,
          isEssential: true,
          keywords: ['stock opname', 'hitung stok', 'selisih stok', 'opname'],
          sortOrder: 250,
          seoTitle: 'Aplikasi Stock Opname Gudang & Hitung Selisih | RAKIT',
          seoDescription:
            'Jalankan stock opname terjadwal dengan pembagian area per petugas dan laporan selisih per barang yang bisa langsung ditindaklanjuti.',
        },
        {
          slug: 'cycle-counting',
          name: 'Hitung Stok Bergilir per Rak',
          clientDescription:
            'Alih-alih menutup gudang setahun sekali, beberapa rak dihitung setiap hari secara bergilir. Selisih ketahuan lebih cepat dan operasional tidak pernah berhenti.',
          internalDescription:
            'Jadwal cycle count berbasis kelas ABC atau frekuensi mutasi, tugas harian per petugas, dan tren akurasi per zona.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.7,
          keywords: ['cycle counting', 'hitung bergilir', 'opname harian'],
          sortOrder: 260,
        },
        {
          slug: 'penyesuaian-stok',
          name: 'Koreksi Stok & Riwayat Perubahan',
          clientDescription:
            'Setiap koreksi jumlah stok wajib punya alasan dan persetujuan, dan seluruhnya tersimpan sebagai riwayat. Tidak ada lagi angka stok yang berubah tanpa ada yang bisa menjelaskan.',
          internalDescription:
            'Stock adjustment dengan kategori alasan (rusak, hilang, temuan opname, koreksi input), approval berjenjang, nilai rupiah dampak, dan log lengkap per transaksi.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          keywords: ['penyesuaian stok', 'koreksi stok', 'adjustment', 'selisih'],
          sortOrder: 270,
        },
      ],
    },

    // ---- 6. Laporan -------------------------------------------------------
    {
      slug: 'laporan',
      name: 'Laporan & Analisis',
      description:
        'Angka yang dipakai untuk mengambil keputusan, bukan sekadar rekap.',
      icon: 'BarChart3',
      features: [
        {
          slug: 'kartu-stok',
          name: 'Kartu Stok per Barang',
          clientDescription:
            'Setiap barang punya riwayat masuk-keluar yang bisa ditelusuri per tanggal, jadi selisih stok ketahuan penyebabnya, bukan sekadar ketahuan jumlahnya.',
          internalDescription:
            'Ledger pergerakan stok per item dan lokasi dengan saldo berjalan, tautan ke dokumen sumber, dan filter periode.',
          type: 'CORE',
          manDayMin: 3.2,
          manDayMax: 3.6,
          keywords: ['kartu stok', 'riwayat barang', 'mutasi barang'],
          sortOrder: 280,
          seoTitle: 'Kartu Stok Digital per Barang & Lokasi | RAKIT',
          seoDescription:
            'Telusuri riwayat masuk-keluar setiap barang lengkap dengan saldo berjalan dan dokumen sumbernya untuk menemukan penyebab selisih stok.',
        },
        {
          slug: 'laporan-mutasi',
          name: 'Laporan Pergerakan Barang',
          clientDescription:
            'Rekap barang masuk, keluar, dan pindah dalam satu periode, per gudang maupun per kategori. Anda melihat pola pergerakan tanpa menyusun pivot table sendiri.',
          internalDescription:
            'Laporan mutasi periodik: saldo awal, masuk, keluar, penyesuaian, saldo akhir. Ekspor Excel dan PDF.',
          type: 'STANDARD',
          manDayMin: 2.4,
          manDayMax: 3,
          keywords: ['laporan mutasi', 'pergerakan barang', 'rekap stok'],
          sortOrder: 290,
        },
        {
          slug: 'aging-stock',
          name: 'Umur Simpan Barang (Aging)',
          clientDescription:
            'Barang dikelompokkan berdasarkan berapa lama sudah mengendap di gudang. Modal yang tertahan di barang lambat laku terlihat sebelum menjadi barang mati.',
          internalDescription:
            'Aging bucket 0-30, 31-60, 61-90, di atas 90 hari berdasarkan tanggal masuk per batch, dengan nilai rupiah per bucket.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          keywords: ['aging stock', 'barang lama', 'barang mati', 'slow moving'],
          sortOrder: 300,
          seoTitle: 'Laporan Aging Stock: Deteksi Barang Lambat Laku | RAKIT',
          seoDescription:
            'Lihat berapa lama setiap barang mengendap di gudang dan berapa nilai modal yang tertahan di stok lambat laku.',
        },
        {
          slug: 'nilai-persediaan',
          name: 'Nilai Persediaan Gudang',
          clientDescription:
            'Berapa rupiah yang sedang tersimpan di gudang Anda hari ini, per gudang dan per kategori. Angka ini siap dipakai untuk laporan keuangan bulanan.',
          internalDescription:
            'Valuasi persediaan dengan metode moving average atau FIFO, snapshot per tanggal, dan rekonsiliasi terhadap ledger stok.',
          type: 'STANDARD',
          manDayMin: 3,
          manDayMax: 3.7,
          keywords: ['nilai persediaan', 'valuasi stok', 'inventory value'],
          sortOrder: 310,
        },
        {
          slug: 'analisis-abc',
          name: 'Pengelompokan Barang ABC',
          clientDescription:
            'Barang dikelompokkan menurut seberapa besar kontribusinya terhadap perputaran. Anda tahu barang mana yang wajib selalu tersedia dan mana yang tidak perlu ditumpuk.',
          internalDescription:
            'Klasifikasi ABC berbasis nilai atau frekuensi mutasi, perhitungan berkala, dan penandaan kelas pada master item untuk dipakai cycle counting.',
          type: 'STANDARD',
          manDayMin: 2.4,
          manDayMax: 3,
          keywords: ['analisis abc', 'fast moving', 'klasifikasi barang'],
          sortOrder: 320,
        },
        {
          slug: 'kinerja-picker',
          name: 'Kinerja Petugas Gudang',
          clientDescription:
            'Berapa baris yang diambil tiap petugas, berapa lama, dan berapa kali salah ambil. Pembagian tugas dan penilaian kerja punya dasar angka, bukan kesan.',
          internalDescription:
            'Metrik per operator: lines/jam, akurasi picking, waktu siklus, ranking periodik. Sumber data dari picking dan packing task.',
          type: 'STANDARD',
          manDayMin: 2.4,
          manDayMax: 3,
          keywords: ['kinerja picker', 'produktivitas gudang', 'kpi gudang'],
          sortOrder: 330,
        },
        {
          slug: 'dashboard-eksekutif',
          name: 'Dashboard Pemilik',
          clientDescription:
            'Satu halaman ringkas berisi kondisi gudang hari ini: nilai stok, barang kritis, pesanan tertunda, dan akurasi stok. Cukup dibuka dari ponsel tanpa minta rekap ke admin.',
          internalDescription:
            'Dashboard KPI dengan kartu ringkas, tren mingguan, dan drill down ke laporan detail. Pilihan KPI disesuaikan per klien.',
          type: 'STANDARD',
          manDayMin: 3.4,
          manDayMax: 4.2,
          keywords: ['dashboard', 'laporan pemilik', 'ringkasan gudang'],
          sortOrder: 340,
        },
      ],
    },

    // ---- 7. Integrasi -----------------------------------------------------
    {
      slug: 'integrasi',
      name: 'Sambungan ke Sistem Lain',
      description:
        'Menghubungkan gudang dengan pembukuan, toko online, dan kurir yang sudah Anda pakai.',
      icon: 'Plug',
      features: [
        {
          slug: 'integrasi-akuntansi',
          name: 'Sambungan ke Accurate / Jurnal',
          clientDescription:
            'Transaksi barang masuk dan keluar mengalir sendiri ke software akuntansi Anda. Admin berhenti mengetik ulang data yang sama untuk kedua sistem.',
          internalDescription:
            'Konektor dua arah ke Accurate Online dan Jurnal.id: sinkronisasi master item, posting GRN dan pengeluaran, pemetaan akun, antrean retry. Pemetaan akun berbeda tiap klien.',
          type: 'CONFIGURABLE',
          manDayMin: 4.5,
          manDayMax: 6,
          keywords: ['accurate', 'jurnal', 'integrasi akuntansi', 'pembukuan'],
          sortOrder: 350,
          seoTitle: 'Integrasi Gudang dengan Accurate & Jurnal.id | RAKIT',
          seoDescription:
            'Sambungkan sistem gudang ke Accurate Online atau Jurnal.id agar transaksi stok langsung terbukukan tanpa input ganda.',
        },
        {
          slug: 'integrasi-marketplace',
          name: 'Sambungan ke Shopee & Tokopedia',
          clientDescription:
            'Pesanan dari toko online masuk sendiri ke antrean gudang dan sisa stok ikut terkirim balik ke marketplace. Kejadian menjual barang yang sudah habis berhenti terjadi.',
          internalDescription:
            'Konektor Shopee dan Tokopedia: tarik pesanan, dorong stok, pemetaan SKU marketplace ke SKU internal, penanganan pembatalan. Perlu penyesuaian per akun toko.',
          type: 'CONFIGURABLE',
          manDayMin: 4.8,
          manDayMax: 6,
          keywords: ['shopee', 'tokopedia', 'marketplace', 'toko online'],
          sortOrder: 360,
        },
        {
          slug: 'integrasi-kurir',
          name: 'Sambungan ke Kurir Pengiriman',
          clientDescription:
            'Nomor resi dibuat langsung dari sistem dan status paket ikut terpantau sampai diterima. Tidak perlu lagi membuka satu per satu situs kurir untuk melacak kiriman.',
          internalDescription:
            'Integrasi agregator kurir: cek ongkir, generate resi dan label, webhook tracking status. Pilihan kurir dan skema ongkir berbeda tiap klien.',
          type: 'CONFIGURABLE',
          manDayMin: 3.8,
          manDayMax: 5.2,
          keywords: ['kurir', 'resi', 'ongkir', 'tracking pengiriman'],
          sortOrder: 370,
        },
        {
          slug: 'notifikasi-whatsapp',
          name: 'Pemberitahuan lewat WhatsApp',
          clientDescription:
            'Stok menipis, pesanan siap kirim, atau opname selesai dikabarkan otomatis ke WhatsApp orang yang tepat. Informasi penting tidak lagi tenggelam di grup.',
          internalDescription:
            'Gateway WhatsApp Business API dengan template pesan, aturan pemicu per kejadian, dan log pengiriman.',
          type: 'STANDARD',
          manDayMin: 2.8,
          manDayMax: 3.5,
          keywords: ['whatsapp', 'notifikasi', 'pemberitahuan stok'],
          sortOrder: 380,
        },
        {
          slug: 'api-terbuka',
          name: 'Jalur Sambungan untuk Sistem Lain',
          clientDescription:
            'Sistem lain yang Anda pakai bisa membaca dan menulis data gudang lewat jalur resmi yang aman. Anda tidak terkunci bila nanti menambah aplikasi baru.',
          internalDescription:
            'REST API terdokumentasi dengan API key per klien, rate limit, webhook keluar, dan halaman dokumentasi.',
          type: 'STANDARD',
          manDayMin: 3.2,
          manDayMax: 4,
          keywords: ['api', 'integrasi sistem', 'webhook'],
          sortOrder: 390,
        },
      ],
    },

    // ---- 8. Pengguna & Sistem ---------------------------------------------
    {
      slug: 'sistem',
      name: 'Pengguna & Perangkat',
      description:
        'Siapa boleh melakukan apa, dan alat yang dipakai tim di lantai gudang.',
      icon: 'ShieldCheck',
      features: [
        {
          slug: 'manajemen-pengguna',
          name: 'Pengelolaan Akun Pengguna',
          clientDescription:
            'Setiap orang punya akun sendiri, jadi setiap tindakan di sistem punya nama. Karyawan yang keluar bisa dinonaktifkan hari itu juga.',
          internalDescription:
            'CRUD user, undangan via email, reset password, status aktif/nonaktif, penugasan ke gudang tertentu.',
          type: 'CORE',
          manDayMin: 2.6,
          manDayMax: 2.9,
          keywords: ['pengguna', 'akun', 'user management'],
          sortOrder: 400,
        },
        {
          slug: 'hak-akses-peran',
          name: 'Pengaturan Hak Akses per Peran',
          clientDescription:
            'Petugas gudang, admin, dan pemilik melihat menu yang berbeda sesuai tanggung jawabnya. Data harga dan margin tidak terbuka untuk semua orang.',
          internalDescription:
            'RBAC dengan peran bawaan dan peran kustom, izin per modul dan per aksi, pembatasan data per gudang.',
          type: 'CORE',
          manDayMin: 3,
          manDayMax: 3.4,
          keywords: ['hak akses', 'role', 'izin pengguna'],
          sortOrder: 410,
        },
        {
          slug: 'audit-log',
          name: 'Jejak Aktivitas Pengguna',
          clientDescription:
            'Semua perubahan data tercatat lengkap dengan siapa, kapan, dan nilai sebelum-sesudahnya. Saat ada yang janggal, penelusurannya butuh menit, bukan hari.',
          internalDescription:
            'Audit trail immutable untuk seluruh entitas transaksional, diff before/after, filter per user dan per modul.',
          type: 'CORE',
          manDayMin: 2.4,
          manDayMax: 2.7,
          keywords: ['audit log', 'jejak aktivitas', 'riwayat perubahan'],
          sortOrder: 420,
        },
        {
          slug: 'cetak-barcode-label',
          name: 'Cetak Barcode & Label Rak',
          clientDescription:
            'Label barang dan label rak dicetak langsung dari sistem dengan format yang seragam. Barang tanpa barcode dari pabrik tetap bisa masuk alur pemindaian.',
          internalDescription:
            'Template label (Zebra/TSC dan printer biasa), barcode 1D dan QR, cetak massal per batch penerimaan atau per lokasi.',
          type: 'STANDARD',
          manDayMin: 2.6,
          manDayMax: 3.2,
          keywords: ['barcode', 'cetak label', 'label rak', 'qr code'],
          sortOrder: 430,
        },
        {
          slug: 'scanner-mobile',
          name: 'Aplikasi Scan di Ponsel',
          clientDescription:
            'Petugas bekerja langsung dari ponsel atau alat scan di lantai gudang, tanpa kembali ke komputer untuk input. Salah ketik jumlah dan kode barang hampir hilang.',
          internalDescription:
            'Antarmuka mobile untuk terima, putaway, transfer, picking, dan opname. Mode offline terbatas dengan sinkronisasi antrean. Perangkat dan alur scan berbeda tiap klien.',
          type: 'CONFIGURABLE',
          manDayMin: 4,
          manDayMax: 5.4,
          keywords: ['scanner', 'scan barcode', 'aplikasi gudang', 'handheld'],
          sortOrder: 440,
          seoTitle: 'Aplikasi Scan Barcode Gudang di Ponsel | RAKIT',
          seoDescription:
            'Terima, simpan, pindahkan, dan ambil barang langsung dari ponsel dengan pemindaian barcode, tanpa input ulang di komputer.',
        },
      ],
    },
  ],

  // -------------------------------------------------------------------------
  // DEPENDENSI
  // Catatan: seluruh REQUIRES membentuk graf tanpa siklus, dan tidak ada
  // fitur CORE yang menjadi SUMBER REQUIRES (core selalu ikut secara otomatis).
  // -------------------------------------------------------------------------
  dependencies: [
    // -- Acuan PRD Lampiran B ------------------------------------------------
    {
      feature: 'putaway-otomatis',
      target: 'master-lokasi-rak',
      kind: 'REQUIRES',
      note: 'Saran Rak Otomatis perlu tahu rak mana yang kosong, jadi Peta Rak & Lokasi Simpan ikut ditambahkan.',
    },
    {
      feature: 'putaway-otomatis',
      target: 'penerimaan-barang',
      kind: 'REQUIRES',
      note: 'Saran rak muncul tepat setelah barang diterima, jadi Penerimaan Barang (GRN) ikut ditambahkan.',
    },
    {
      feature: 'putaway-otomatis',
      target: 'putaway-manual',
      kind: 'CONFLICTS_WITH',
      note: 'Penempatan rak hanya boleh diatur oleh satu cara. Bila saran rak otomatis dipakai, Penempatan Barang ke Rak versi manual tidak lagi diperlukan.',
    },
    {
      feature: 'putaway-otomatis',
      target: 'scanner-mobile',
      kind: 'RECOMMENDS',
      note: 'Saran rak paling terasa manfaatnya bila petugas langsung membacanya dari ponsel di lantai gudang.',
    },
    {
      feature: 'manajemen-kedaluwarsa',
      target: 'manajemen-batch-lot',
      kind: 'REQUIRES',
      note: 'Tanggal kedaluwarsa melekat pada batch produksi, jadi Pelacakan Batch / Nomor Lot ikut ditambahkan.',
    },
    {
      feature: 'manajemen-kedaluwarsa',
      target: 'aging-stock',
      kind: 'RECOMMENDS',
      note: 'Laporan umur simpan membantu Anda melihat barang yang mendekati kedaluwarsa sebelum peringatan muncul.',
    },
    {
      feature: 'picking-list',
      target: 'sales-order',
      kind: 'REQUIRES',
      note: 'Daftar ambil barang dibuat dari pesanan pelanggan, jadi Pesanan Penjualan (Sales Order) ikut ditambahkan.',
    },
    {
      feature: 'picking-list',
      target: 'master-lokasi-rak',
      kind: 'REQUIRES',
      note: 'Daftar ambil barang harus menyebut lokasi rak, jadi Peta Rak & Lokasi Simpan ikut ditambahkan.',
    },
    {
      feature: 'picking-list',
      target: 'strategi-picking',
      kind: 'RECOMMENDS',
      note: 'Bila barang Anda punya batch atau umur simpan, aturan urutan pengambilan membuat sistem memilihkan stok yang benar.',
    },
    {
      feature: 'aging-stock',
      target: 'penerimaan-barang',
      kind: 'REQUIRES',
      note: 'Umur simpan dihitung dari tanggal barang diterima, jadi Penerimaan Barang (GRN) ikut ditambahkan.',
    },
    {
      feature: 'aging-stock',
      target: 'kartu-stok',
      kind: 'REQUIRES',
      note: 'Perhitungan umur simpan membaca riwayat pergerakan barang dari Kartu Stok per Barang.',
    },
    {
      feature: 'aging-stock',
      target: 'analisis-abc',
      kind: 'RECOMMENDS',
      note: 'Pengelompokan ABC membantu memisahkan barang lambat laku yang memang wajar dari yang benar-benar bermasalah.',
    },
    {
      feature: 'transfer-antar-gudang',
      target: 'master-gudang',
      kind: 'REQUIRES',
      note: 'Pengiriman antar gudang perlu daftar gudang asal dan tujuan, jadi Daftar Gudang ikut ditambahkan.',
    },
    {
      feature: 'transfer-antar-gudang',
      target: 'laporan-mutasi',
      kind: 'RECOMMENDS',
      note: 'Laporan pergerakan barang memudahkan memantau kiriman antar gudang yang belum dikonfirmasi diterima.',
    },
    {
      feature: 'cycle-counting',
      target: 'master-lokasi-rak',
      kind: 'REQUIRES',
      note: 'Hitung bergilir dijadwalkan per rak, jadi Peta Rak & Lokasi Simpan ikut ditambahkan.',
    },
    {
      feature: 'cycle-counting',
      target: 'scanner-mobile',
      kind: 'RECOMMENDS',
      note: 'Penghitungan harian jauh lebih cepat bila petugas memindai langsung dari ponsel di depan rak.',
    },
    {
      feature: 'pelacakan-serial-number',
      target: 'master-barang-sku',
      kind: 'REQUIRES',
      note: 'Nomor seri melekat pada barang tertentu, jadi Daftar Barang & Kode SKU ikut ditambahkan.',
    },
    {
      feature: 'pelacakan-serial-number',
      target: 'retur-dari-pelanggan',
      kind: 'RECOMMENDS',
      note: 'Nomor seri paling sering dipakai saat memverifikasi klaim garansi pada barang yang dikembalikan pelanggan.',
    },

    // -- Tambahan yang masuk akal secara operasional ------------------------
    {
      feature: 'penerimaan-barang',
      target: 'purchase-order',
      kind: 'REQUIRES',
      note: 'Barang yang datang dicocokkan dengan pesanannya, jadi Purchase Order ke Supplier ikut ditambahkan.',
    },
    {
      feature: 'retur-ke-supplier',
      target: 'penerimaan-barang',
      kind: 'REQUIRES',
      note: 'Retur selalu merujuk pada kiriman yang pernah diterima, jadi Penerimaan Barang (GRN) ikut ditambahkan.',
    },
    {
      feature: 'putaway-manual',
      target: 'master-lokasi-rak',
      kind: 'REQUIRES',
      note: 'Petugas hanya bisa memilih rak bila raknya sudah terdaftar, jadi Peta Rak & Lokasi Simpan ikut ditambahkan.',
    },
    {
      feature: 'packing-verifikasi',
      target: 'picking-list',
      kind: 'REQUIRES',
      note: 'Isi paket diperiksa terhadap barang yang sudah diambil, jadi Daftar Ambil Barang ikut ditambahkan.',
    },
    {
      feature: 'surat-jalan',
      target: 'sales-order',
      kind: 'REQUIRES',
      note: 'Surat jalan dicetak dari pesanan pelanggan, jadi Pesanan Penjualan (Sales Order) ikut ditambahkan.',
    },
    {
      feature: 'manajemen-pengiriman',
      target: 'surat-jalan',
      kind: 'REQUIRES',
      note: 'Muatan armada disusun dari surat jalan yang siap kirim, jadi Surat Jalan ikut ditambahkan.',
    },
    {
      feature: 'stock-opname-penuh',
      target: 'penyesuaian-stok',
      kind: 'REQUIRES',
      note: 'Selisih hasil opname harus dibukukan dengan alasan dan persetujuan, jadi Koreksi Stok & Riwayat Perubahan ikut ditambahkan.',
    },
    {
      feature: 'nilai-persediaan',
      target: 'kartu-stok',
      kind: 'REQUIRES',
      note: 'Nilai persediaan dihitung dari riwayat pergerakan barang di Kartu Stok per Barang.',
    },
    {
      feature: 'integrasi-akuntansi',
      target: 'nilai-persediaan',
      kind: 'REQUIRES',
      note: 'Angka yang dikirim ke software akuntansi berasal dari Nilai Persediaan Gudang, jadi laporan itu ikut ditambahkan.',
    },
    {
      feature: 'scanner-mobile',
      target: 'cetak-barcode-label',
      kind: 'REQUIRES',
      note: 'Barang dan rak harus berlabel dulu sebelum bisa dipindai, jadi Cetak Barcode & Label Rak ikut ditambahkan.',
    },
    {
      feature: 'dashboard-eksekutif',
      target: 'nilai-persediaan',
      kind: 'RECOMMENDS',
      note: 'Kartu nilai stok di dashboard baru terisi bila laporan Nilai Persediaan Gudang ikut dipilih.',
    },
  ],

  // -------------------------------------------------------------------------
  // PRESET
  // -------------------------------------------------------------------------
  presets: [
    {
      slug: 'wms-starter',
      name: 'WMS Starter',
      tagline: 'Hentikan dulu kebocoran pencatatan barang masuk dan keluar.',
      description:
        'Paket paling ringkas untuk memindahkan pencatatan gudang dari Excel ke satu sistem bersama: pesan ke supplier, terima barang, layani pesanan, cetak surat jalan, lalu cocokkan lewat stock opname.',
      bestFor: [
        'Satu gudang dengan kurang dari 1.000 SKU.',
        'Tim gudang 1 sampai 5 orang yang masih mencatat di buku dan Excel.',
        'Belum memakai barcode dan belum butuh pengaturan rak.',
        'Prioritasnya menghentikan selisih stok, bukan mengoptimalkan kecepatan picking.',
      ],
      features: [
        // Seluruh CORE
        'master-barang-sku',
        'master-supplier',
        'master-pelanggan',
        'master-gudang',
        'kartu-stok',
        'manajemen-pengguna',
        'hak-akses-peran',
        'audit-log',
        // Alur masuk-keluar paling dasar
        'purchase-order',
        'penerimaan-barang',
        'sales-order',
        'surat-jalan',
        'penyesuaian-stok',
        'stock-opname-penuh',
      ],
    },
    {
      slug: 'wms-growth',
      name: 'WMS Growth',
      tagline: 'Gudang berlokasi rak, dipindai, dan terukur.',
      description:
        'Paket yang dipakai mayoritas klien: seluruh alur Starter ditambah pengaturan rak, pemindaian barcode, pemeriksaan mutu barang masuk, aturan urutan pengambilan, dan pengaturan armada kirim.',
      bestFor: [
        'Satu sampai tiga gudang dengan 1.000 sampai 10.000 SKU.',
        'Tim gudang 6 sampai 20 orang dengan shift yang berganti.',
        'Sudah atau siap memakai barcode dan ponsel pemindai di lantai gudang.',
        'Pengiriman rutin ke banyak pelanggan dengan armada sendiri.',
      ],
      isDefault: true,
      features: [
        // Seluruh CORE
        'master-barang-sku',
        'master-supplier',
        'master-pelanggan',
        'master-gudang',
        'kartu-stok',
        'manajemen-pengguna',
        'hak-akses-peran',
        'audit-log',
        // Standard
        'master-lokasi-rak',
        'purchase-order',
        'penerimaan-barang',
        'putaway-manual',
        'transfer-antar-lokasi',
        'sales-order',
        'picking-list',
        'packing-verifikasi',
        'surat-jalan',
        'penyesuaian-stok',
        'stock-opname-penuh',
        'laporan-mutasi',
        'nilai-persediaan',
        'cetak-barcode-label',
        // Configurable
        'inspeksi-kualitas',
        'strategi-picking',
        'manajemen-pengiriman',
        'scanner-mobile',
      ],
    },
    {
      slug: 'wms-enterprise',
      name: 'WMS Enterprise',
      tagline: 'Banyak gudang, banyak batch, dan angka yang siap diaudit.',
      description:
        'Hampir seluruh katalog: penataan rak otomatis, pelacakan batch dan kedaluwarsa, hitung stok bergilir, laporan lengkap sampai dashboard pemilik, serta sambungan ke software akuntansi.',
      bestFor: [
        'Tiga sampai lima gudang atau cabang yang saling mengirim barang.',
        'Barang berbatch dengan masa simpan, seperti makanan, minuman, farmasi, atau kimia.',
        'Tim gudang di atas 20 orang dengan target akurasi stok yang diukur.',
        'Pembukuan sudah berjalan di Accurate atau Jurnal dan tidak boleh diinput dua kali.',
      ],
      features: [
        // Seluruh CORE
        'master-barang-sku',
        'master-supplier',
        'master-pelanggan',
        'master-gudang',
        'kartu-stok',
        'manajemen-pengguna',
        'hak-akses-peran',
        'audit-log',
        // Standard (tanpa putaway-manual karena konflik dengan putaway otomatis,
        // tanpa pelacakan nomor seri dan jalur API yang sifatnya kondisional)
        'master-lokasi-rak',
        'master-satuan-konversi',
        'purchase-order',
        'penerimaan-barang',
        'retur-ke-supplier',
        'transfer-antar-lokasi',
        'transfer-antar-gudang',
        'sales-order',
        'picking-list',
        'packing-verifikasi',
        'surat-jalan',
        'retur-dari-pelanggan',
        'stock-opname-penuh',
        'cycle-counting',
        'penyesuaian-stok',
        'laporan-mutasi',
        'aging-stock',
        'nilai-persediaan',
        'analisis-abc',
        'kinerja-picker',
        'dashboard-eksekutif',
        'notifikasi-whatsapp',
        'cetak-barcode-label',
        // Configurable (tanpa sambungan marketplace dan kurir yang hanya
        // relevan bila klien berjualan online)
        'inspeksi-kualitas',
        'putaway-otomatis',
        'manajemen-batch-lot',
        'manajemen-kedaluwarsa',
        'strategi-picking',
        'manajemen-pengiriman',
        'integrasi-akuntansi',
        'scanner-mobile',
      ],
    },
  ],

  // -------------------------------------------------------------------------
  // WIZARD — seluruh pertanyaan berbasis kondisi bisnis, bukan teknis.
  // -------------------------------------------------------------------------
  wizard: [
    {
      slug: 'jumlah-gudang',
      question: 'Berapa gudang atau titik penyimpanan yang Anda kelola?',
      helpText:
        'Hitung juga gudang transit, gudang cabang, dan ruko yang dipakai menyimpan barang.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'satu-gudang',
          label: '1 gudang',
          description: 'Semua barang disimpan di satu tempat.',
          icon: 'Warehouse',
          maps: [
            {
              feature: 'master-lokasi-rak',
              reason: 'Direkomendasikan karena dengan satu gudang, kecepatan mencari barang bergantung penuh pada penataan rak.',
            },
          ],
        },
        {
          slug: 'dua-tiga-gudang',
          label: '2 – 3 gudang',
          description: 'Gudang utama dan satu atau dua cabang.',
          icon: 'Building2',
          maps: [
            {
              feature: 'transfer-antar-gudang',
              reason: 'Direkomendasikan karena Anda punya lebih dari 1 gudang, sehingga kiriman antar gudang perlu status dalam perjalanan.',
            },
            {
              feature: 'master-lokasi-rak',
              reason: 'Direkomendasikan karena setiap gudang butuh peta raknya sendiri agar stok tidak tercampur.',
            },
            {
              feature: 'laporan-mutasi',
              reason: 'Direkomendasikan agar pergerakan barang antar gudang bisa dipantau dalam satu laporan.',
            },
          ],
        },
        {
          slug: 'empat-lima-gudang',
          label: '4 – 5 gudang',
          description: 'Jaringan distribusi dengan beberapa cabang.',
          icon: 'Network',
          maps: [
            {
              feature: 'transfer-antar-gudang',
              reason: 'Direkomendasikan karena Anda mengelola lebih dari 3 gudang yang saling mengirim barang.',
            },
            {
              feature: 'master-lokasi-rak',
              reason: 'Direkomendasikan agar setiap cabang memakai standar penataan rak yang sama.',
            },
            {
              feature: 'dashboard-eksekutif',
              reason: 'Direkomendasikan agar kondisi seluruh cabang terlihat dalam satu halaman tanpa menunggu rekap.',
            },
            {
              feature: 'hak-akses-peran',
              reason: 'Direkomendasikan agar kepala gudang cabang hanya melihat data gudangnya sendiri.',
            },
          ],
        },
        {
          slug: 'lebih-lima-gudang',
          label: 'Lebih dari 5 gudang',
          description: 'Jaringan besar dengan gudang regional.',
          icon: 'Globe',
          maps: [
            {
              feature: 'transfer-antar-gudang',
              reason: 'Direkomendasikan karena Anda mengelola lebih dari 5 gudang dengan perpindahan barang yang padat.',
            },
            {
              feature: 'dashboard-eksekutif',
              reason: 'Direkomendasikan karena kondisi gudang sebanyak itu mustahil dipantau lewat laporan manual.',
            },
            {
              feature: 'api-terbuka',
              reason: 'Direkomendasikan karena jaringan sebesar ini biasanya sudah punya sistem lain yang perlu disambung.',
            },
            {
              feature: 'kinerja-picker',
              reason: 'Direkomendasikan agar produktivitas tiap gudang bisa dibandingkan dengan ukuran yang sama.',
            },
          ],
        },
      ],
    },
    {
      slug: 'jumlah-sku',
      question: 'Kira-kira berapa jenis barang yang Anda simpan?',
      helpText:
        'Hitung per jenis barang, bukan per jumlah unit. Warna dan ukuran berbeda dihitung sebagai jenis berbeda.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'sku-kecil',
          label: 'Kurang dari 500 jenis',
          description: 'Masih mungkin dihafal sebagian oleh tim.',
          icon: 'Package',
          maps: [
            {
              feature: 'master-barang-sku',
              reason: 'Direkomendasikan agar penamaan barang seragam sejak awal, sebelum daftar barang membesar.',
            },
          ],
        },
        {
          slug: 'sku-menengah',
          label: '500 – 2.000 jenis',
          description: 'Sudah tidak bisa diingat, mulai sering salah ambil.',
          icon: 'Boxes',
          maps: [
            {
              feature: 'master-lokasi-rak',
              reason: 'Direkomendasikan karena dengan ribuan jenis barang, pencarian tanpa alamat rak memakan waktu paling banyak.',
            },
            {
              feature: 'cetak-barcode-label',
              reason: 'Direkomendasikan agar setiap barang dan rak punya label yang bisa dibaca cepat.',
            },
            {
              feature: 'analisis-abc',
              reason: 'Direkomendasikan agar Anda tahu barang mana yang wajib selalu tersedia.',
            },
          ],
        },
        {
          slug: 'sku-besar',
          label: '2.000 – 10.000 jenis',
          description: 'Butuh sistem penataan dan pemindaian.',
          icon: 'LayoutGrid',
          maps: [
            {
              feature: 'master-lokasi-rak',
              reason: 'Direkomendasikan karena jumlah jenis barang Anda menuntut setiap barang punya alamat rak yang pasti.',
            },
            {
              feature: 'scanner-mobile',
              reason: 'Direkomendasikan karena input manual pada skala ribuan jenis barang hampir pasti menimbulkan salah ketik.',
            },
            {
              feature: 'picking-list',
              reason: 'Direkomendasikan agar pengambilan barang mengikuti jalur yang sudah diurutkan sistem.',
            },
            {
              feature: 'analisis-abc',
              reason: 'Direkomendasikan agar barang cepat laku ditempatkan dekat area pengiriman.',
            },
          ],
        },
        {
          slug: 'sku-sangat-besar',
          label: 'Lebih dari 10.000 jenis',
          description: 'Skala distributor besar atau e-commerce.',
          icon: 'Layers',
          maps: [
            {
              feature: 'putaway-otomatis',
              reason: 'Direkomendasikan karena pada skala di atas 10.000 jenis barang, penentuan rak tidak lagi bisa mengandalkan hafalan petugas.',
            },
            {
              feature: 'scanner-mobile',
              reason: 'Direkomendasikan karena seluruh proses gudang pada skala ini harus berjalan lewat pemindaian.',
            },
            {
              feature: 'cycle-counting',
              reason: 'Direkomendasikan karena menghitung semua barang sekaligus akan menghentikan operasional terlalu lama.',
            },
            {
              feature: 'analisis-abc',
              reason: 'Direkomendasikan agar prioritas penghitungan dan penataan mengikuti nilai perputaran barang.',
            },
            {
              feature: 'kinerja-picker',
              reason: 'Direkomendasikan agar beban kerja petugas terbagi merata dan terukur.',
            },
          ],
        },
      ],
    },
    {
      slug: 'kondisi-barcode',
      question: 'Bagaimana kondisi penandaan barang Anda saat ini?',
      helpText:
        'Jawaban ini menentukan seberapa jauh proses gudang bisa dijalankan lewat pemindaian.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'belum-barcode',
          label: 'Belum pakai barcode sama sekali',
          description: 'Barang dikenali dari tulisan tangan atau ingatan.',
          icon: 'PenLine',
          maps: [
            {
              feature: 'cetak-barcode-label',
              reason: 'Direkomendasikan karena Anda belum memakai barcode, sehingga label perlu dicetak sendiri dari sistem.',
            },
            {
              feature: 'master-barang-sku',
              reason: 'Direkomendasikan agar setiap barang punya kode tetap sebelum labelnya dicetak.',
            },
          ],
        },
        {
          slug: 'sudah-barcode',
          label: 'Sudah pakai barcode',
          description: 'Barcode pabrik atau label cetak sendiri sudah dipakai.',
          icon: 'ScanLine',
          maps: [
            {
              feature: 'scanner-mobile',
              reason: 'Direkomendasikan karena Anda sudah memakai barcode, jadi proses gudang bisa langsung dijalankan lewat pemindaian ponsel.',
            },
            {
              feature: 'cetak-barcode-label',
              reason: 'Direkomendasikan untuk barang tanpa barcode pabrik dan untuk label rak.',
            },
            {
              feature: 'packing-verifikasi',
              reason: 'Direkomendasikan agar isi paket diperiksa ulang lewat scan sebelum dikirim.',
            },
          ],
        },
        {
          slug: 'batch-serial',
          label: 'Barang punya batch atau nomor seri',
          description: 'Ada tanggal kedaluwarsa, nomor lot, atau nomor seri unit.',
          icon: 'Fingerprint',
          maps: [
            {
              feature: 'manajemen-batch-lot',
              reason: 'Direkomendasikan karena barang Anda punya nomor batch yang harus bisa ditelusuri saat ada masalah mutu.',
            },
            {
              feature: 'manajemen-kedaluwarsa',
              reason: 'Direkomendasikan karena barang berbatch umumnya punya masa simpan yang harus dipantau.',
            },
            {
              feature: 'pelacakan-serial-number',
              reason: 'Direkomendasikan karena barang bernomor seri perlu dilacak satu per satu sampai ke tangan pelanggan.',
            },
            {
              feature: 'strategi-picking',
              reason: 'Direkomendasikan agar sistem memilihkan batch yang paling tepat dikeluarkan lebih dulu.',
            },
            {
              feature: 'scanner-mobile',
              reason: 'Direkomendasikan agar nomor batch dan nomor seri terbaca lewat pemindaian, bukan diketik.',
            },
          ],
        },
      ],
    },
    {
      slug: 'kanal-penjualan',
      question: 'Barang Anda dijual lewat kanal apa?',
      helpText: 'Pilih yang paling menggambarkan sebagian besar pesanan Anda.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'offline-saja',
          label: 'Offline saja',
          description: 'Penjualan lewat sales, toko, atau reseller.',
          icon: 'Store',
          maps: [
            {
              feature: 'sales-order',
              reason: 'Direkomendasikan agar pesanan dari sales tercatat dan langsung mengunci stok.',
            },
            {
              feature: 'surat-jalan',
              reason: 'Direkomendasikan karena pengiriman offline selalu butuh surat jalan bernomor resmi.',
            },
            {
              feature: 'manajemen-pengiriman',
              reason: 'Direkomendasikan agar kiriman ke banyak pelanggan bisa disusun per armada dan per rute.',
            },
          ],
        },
        {
          slug: 'online-saja',
          label: 'Online lewat marketplace',
          description: 'Sebagian besar pesanan dari Shopee, Tokopedia, dan sejenisnya.',
          icon: 'ShoppingCart',
          maps: [
            {
              feature: 'integrasi-marketplace',
              reason: 'Direkomendasikan karena Anda berjualan lewat marketplace, sehingga pesanan dan sisa stok perlu tersambung otomatis.',
            },
            {
              feature: 'integrasi-kurir',
              reason: 'Direkomendasikan agar nomor resi terbit langsung dari sistem tanpa membuka situs kurir.',
            },
            {
              feature: 'packing-verifikasi',
              reason: 'Direkomendasikan karena volume paket kecil yang banyak paling rawan salah isi.',
            },
            {
              feature: 'picking-list',
              reason: 'Direkomendasikan agar pesanan online diambil secara berkelompok, bukan satu per satu.',
            },
          ],
        },
        {
          slug: 'online-offline',
          label: 'Keduanya',
          description: 'Distribusi offline sekaligus berjualan di marketplace.',
          icon: 'Split',
          maps: [
            {
              feature: 'integrasi-marketplace',
              reason: 'Direkomendasikan karena stok yang sama dijual di dua kanal, sehingga sisa stok wajib selalu sinkron.',
            },
            {
              feature: 'sales-order',
              reason: 'Direkomendasikan agar pesanan offline dan online masuk ke satu antrean gudang yang sama.',
            },
            {
              feature: 'integrasi-kurir',
              reason: 'Direkomendasikan agar pengiriman paket online tidak dikerjakan terpisah dari sistem.',
            },
            {
              feature: 'notifikasi-whatsapp',
              reason: 'Direkomendasikan agar tim tahu pesanan baru dari kanal mana pun tanpa memantau layar terus-menerus.',
            },
          ],
        },
      ],
    },
    {
      slug: 'kondisi-akuntansi',
      question: 'Bagaimana pembukuan Anda dikerjakan saat ini?',
      helpText:
        'Jawaban ini menentukan apakah data gudang perlu mengalir otomatis ke sistem pembukuan.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'belum-software',
          label: 'Masih manual di Excel',
          description: 'Pembukuan dikerjakan admin dengan file terpisah.',
          icon: 'FileSpreadsheet',
          maps: [
            {
              feature: 'nilai-persediaan',
              reason: 'Direkomendasikan agar nilai stok bulanan bisa diambil langsung dari sistem, bukan dihitung ulang di Excel.',
            },
            {
              feature: 'laporan-mutasi',
              reason: 'Direkomendasikan agar rekap barang masuk dan keluar siap dipakai untuk pembukuan.',
            },
          ],
        },
        {
          slug: 'pakai-accurate-jurnal',
          label: 'Sudah pakai Accurate atau Jurnal',
          description: 'Pembukuan berjalan di software akuntansi.',
          icon: 'Calculator',
          maps: [
            {
              feature: 'integrasi-akuntansi',
              reason: 'Direkomendasikan karena Anda sudah memakai software akuntansi, sehingga transaksi stok tidak perlu diinput dua kali.',
            },
            {
              feature: 'nilai-persediaan',
              reason: 'Direkomendasikan karena angka yang dikirim ke pembukuan diambil dari laporan nilai persediaan.',
            },
            {
              feature: 'audit-log',
              reason: 'Direkomendasikan agar setiap koreksi yang berdampak ke pembukuan punya jejak yang bisa diperiksa.',
            },
          ],
        },
        {
          slug: 'software-lain',
          label: 'Pakai sistem lain / buatan sendiri',
          description: 'ERP atau aplikasi internal yang sudah berjalan.',
          icon: 'Boxes',
          maps: [
            {
              feature: 'api-terbuka',
              reason: 'Direkomendasikan karena sistem yang sudah Anda pakai perlu jalur resmi untuk membaca dan menulis data gudang.',
            },
            {
              feature: 'nilai-persediaan',
              reason: 'Direkomendasikan agar nilai stok tersedia dalam format yang siap dikirim ke sistem Anda.',
            },
            {
              feature: 'laporan-mutasi',
              reason: 'Direkomendasikan agar rekap pergerakan barang bisa diekspor rutin ke sistem lain.',
            },
          ],
        },
      ],
    },
    {
      slug: 'jumlah-staf-gudang',
      question: 'Berapa orang yang bekerja di gudang Anda?',
      helpText:
        'Jumlah orang menentukan seberapa ketat pembagian hak akses dan pengukuran kerja yang Anda butuhkan.',
      inputType: 'SINGLE',
      options: [
        {
          slug: 'staf-1-5',
          label: '1 – 5 orang',
          description: 'Tim kecil, semua orang mengerjakan semua hal.',
          icon: 'User',
          suggestPresetSlug: 'wms-starter',
          maps: [
            {
              feature: 'penyesuaian-stok',
              reason: 'Direkomendasikan agar koreksi stok tetap punya alasan tertulis meskipun timnya kecil.',
            },
            {
              feature: 'stock-opname-penuh',
              reason: 'Direkomendasikan karena tim kecil masih sanggup menghitung seluruh gudang secara berkala.',
            },
          ],
        },
        {
          slug: 'staf-6-15',
          label: '6 – 15 orang',
          description: 'Sudah ada pembagian tugas terima, simpan, dan kirim.',
          icon: 'Users',
          suggestPresetSlug: 'wms-growth',
          maps: [
            {
              feature: 'hak-akses-peran',
              reason: 'Direkomendasikan karena dengan tim sebesar ini, tidak semua orang boleh mengubah data yang sama.',
            },
            {
              feature: 'scanner-mobile',
              reason: 'Direkomendasikan agar setiap petugas bekerja dari ponselnya sendiri tanpa antre di komputer.',
            },
            {
              feature: 'picking-list',
              reason: 'Direkomendasikan agar tugas pengambilan barang terbagi jelas antar petugas.',
            },
          ],
        },
        {
          slug: 'staf-16-40',
          label: '16 – 40 orang',
          description: 'Beberapa shift dan penanggung jawab area.',
          icon: 'UsersRound',
          suggestPresetSlug: 'wms-growth',
          maps: [
            {
              feature: 'kinerja-picker',
              reason: 'Direkomendasikan karena dengan puluhan petugas, beban kerja perlu diukur agar pembagiannya adil.',
            },
            {
              feature: 'audit-log',
              reason: 'Direkomendasikan agar perubahan data lintas shift bisa ditelusuri sampai ke orangnya.',
            },
            {
              feature: 'cycle-counting',
              reason: 'Direkomendasikan agar penghitungan stok berjalan harian tanpa menghentikan shift lain.',
            },
            {
              feature: 'hak-akses-peran',
              reason: 'Direkomendasikan agar penanggung jawab area hanya mengakses data areanya.',
            },
          ],
        },
        {
          slug: 'staf-di-atas-40',
          label: 'Lebih dari 40 orang',
          description: 'Operasional gudang skala besar dengan banyak shift.',
          icon: 'Factory',
          suggestPresetSlug: 'wms-enterprise',
          maps: [
            {
              feature: 'kinerja-picker',
              reason: 'Direkomendasikan karena Anda punya lebih dari 40 petugas gudang yang produktivitasnya perlu dibandingkan.',
            },
            {
              feature: 'cycle-counting',
              reason: 'Direkomendasikan karena gudang sebesar ini tidak mungkin dihentikan untuk opname menyeluruh.',
            },
            {
              feature: 'dashboard-eksekutif',
              reason: 'Direkomendasikan agar pemilik melihat kondisi operasional harian tanpa meminta rekap manual.',
            },
            {
              feature: 'putaway-otomatis',
              reason: 'Direkomendasikan agar petugas baru bisa menata barang dengan benar tanpa pelatihan panjang.',
            },
            {
              feature: 'hak-akses-peran',
              reason: 'Direkomendasikan agar pembagian wewenang antar shift dan antar area tetap terkendali.',
            },
          ],
        },
      ],
    },
  ],
};
