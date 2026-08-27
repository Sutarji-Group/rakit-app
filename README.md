# RAKIT

Platform jasa pembuatan aplikasi berbasis konfigurator fitur — implementasi
lengkap dari *PRD Rakit v1.1*.

Klien memilih jenis aplikasi (WMS, CRM, POS), **merakit sendiri ruang lingkupnya
fitur per fitur**, lalu melihat estimasi harga dan waktu pengerjaan bergerak
seketika mengikuti rakitan itu. Fitur di luar katalog dapat diajukan lewat
formulir terstruktur dan masuk antrean review dengan SLA 1×24 jam kerja.

Diferensiasinya bukan katalognya, melainkan **transparansi harga dan kontrol
atas ruang lingkup**: klien tahu persis apa yang dia bayar sebelum bicara dengan
siapa pun.

---

## Menjalankan

Dibutuhkan Node.js 20+ dan **PostgreSQL 14+** yang sudah berjalan.

```bash
createdb rakit                        # atau buat lewat klien Postgres pilihan Anda

npm install
cp .env.example .env                  # isi DATABASE_URL, DIRECT_URL, dan AUTH_SECRET
npm run db:deploy                     # terapkan migrasi
npm run db:seed                       # isi katalog, pengguna, dan data contoh
npm run dev
```

Buka <http://localhost:3000>.

`DIRECT_URL` boleh dikosongkan; bila kosong, `DATABASE_URL` yang dipakai untuk
migrasi. Perbedaannya baru relevan bila basis data berada di balik connection
pooler — lihat [Menggelar ke produksi](#menggelar-ke-produksi).

### Akun contoh

Kata sandi seluruh akun: `rakit2026`

| Email | Peran | Untuk melihat |
|---|---|---|
| `admin@rakit.id` | Super Admin | seluruh area admin |
| `katalog@rakit.id` | Admin Katalog | manajemen katalog & mesin harga |
| `consultant@rakit.id` | Solution Consultant | antrean review fitur custom |
| `sales@rakit.id` | Sales | pipeline lead & override harga |
| `pm@rakit.id` | Project Manager | proyek, milestone, laporan varians |
| `klien@contoh.id` | Klien | portal klien & rakitan tersimpan |

### Perintah

```bash
npm run dev          # server pengembangan
npm run build        # build produksi
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # pengujian mesin harga, dependensi, dan validasi
npm run db:migrate   # buat migrasi baru setelah mengubah schema.prisma
npm run db:deploy    # terapkan migrasi yang sudah ada
npm run db:reset     # kosongkan basis data lalu migrasi + seed ulang
npm run calibration  # laporan kalibrasi harga terhadap PRD Lampiran C
```

---

## Arsitektur

Monolith **Next.js 15 (App Router) + TypeScript + Prisma + PostgreSQL**.

Provider basis datanya sama antara lokal dan produksi, dan itu disengaja.
Perbedaan dialek — urutan `ORDER BY`, case-sensitivity `LIKE`, perilaku
transaksi saat penulisan berjalan paralel — tidak muncul saat pengembangan
kalau providernya berbeda; ia muncul di produksi, pada pengguna sungguhan.

Kolom JSON disimpan sebagai `String` dan "enum" disimpan sebagai `String`,
bukan tipe native Postgres. Tidak ada kueri yang menyaring berdasarkan isi JSON,
dan daftar nilai enum berubah mengikuti PRD, bukan mengikuti data — memindahkan
keduanya ke basis data hanya menambah migrasi tanpa menambah kemampuan.

### Dua mesin yang menjadi kontrak seluruh sistem

**Mesin harga** (`src/lib/pricing`) — fungsi murni tanpa ketergantungan pada
Prisma maupun React. Konsekuensinya perhitungan berjalan **identik di browser
dan di server**: konfigurator menghitung di klien untuk umpan balik instan
(persyaratan ≤ 200 ms), sementara server menghitung ulang sendiri sebelum
menyimpan dan tidak pernah mempercayai angka dari klien. Aturan harga ber-versi,
sehingga penawaran yang sudah terbit tidak ikut berubah saat tarif diperbarui.

**Mesin dependensi** (`src/lib/configurator/dependency.ts`) — menyelesaikan
relasi `requires` secara transitif, konflik dua arah, saran halus, dan cascade
penghapusan. `enforceSelection()` dipanggil server pada **setiap** penyimpanan,
sehingga konfigurasi yang melanggar aturan mustahil tersimpan apa pun yang
dikirim browser.

### Peta direktori

```
prisma/                  Skema data, seed katalog, dan data contoh
src/lib/pricing/         Mesin harga (PRD bagian 6)
src/lib/configurator/    Mesin dependensi + store konfigurator
src/lib/services/        Logika bisnis sisi server
src/lib/analytics/       Instrumentasi dan laporan agregat
src/lib/pdf/             Dokumen proposal
src/components/ui/       Primitif UI
src/app/(marketing)/     Halaman publik
src/app/rakit/           Konfigurator
src/app/admin/           Area internal
src/app/portal/          Portal klien
```

---

## Cakupan modul PRD

| # | Modul | Prioritas | Status |
|---|---|---|---|
| A | Landing & Katalog Aplikasi | P0 | Selesai |
| B | Wizard Rekomendasi | P1 | Selesai |
| C | Konfigurator Belanja Fitur | P0 | Selesai |
| D | Pengajuan Fitur Custom | P0 | Selesai |
| E | Konfigurasi Proyek | P0 | Selesai |
| F | Ringkasan & Generator Proposal PDF | P0 | Selesai |
| G | Akun Klien & Simpan Konfigurasi | P1 | Selesai |
| H | Checkout, DP Online & Invoice | P1 | Invoice, termin, dan pembayaran manual selesai · gateway belum tersambung |
| I | Kontrak Digital | P2 | Generator kontrak & lampiran SOW selesai · tanda tangan elektronik dicatat manual |
| J | Portal Klien | P1 | Selesai |
| K | Change Request dari portal | P2 | Selesai |
| L | Admin: Manajemen Katalog & Fitur | P0 | Selesai |
| M | Admin: Mesin Harga & Dependensi | P0 | Selesai |
| N | Admin: Antrean Review Fitur Custom | P0 | Selesai |
| O | Admin: Pipeline Quote/Lead | P0 | Selesai |
| P | Admin: Manajemen Proyek & Milestone | P1 | Selesai |
| Q | Admin: Dashboard Analitik | P1 | Selesai |

### Yang berhenti di batas integrasi

Tiga hal berikut sengaja berhenti di titik yang membutuhkan akun atau
perjanjian dengan pihak ketiga. Semuanya punya jalur pengganti yang benar-benar
berfungsi, dan tidak ada satu pun yang berpura-pura sudah bekerja:

| Yang belum tersambung | Yang dibangun sebagai gantinya |
|---|---|
| Pengiriman email dan WhatsApp | Notifikasi dicatat, dan tautan konfigurasi disediakan untuk disalin manual oleh tim. |
| Payment gateway (Midtrans/Xendit) — penyedianya masih pertanyaan terbuka PRD #6 | Transfer manual dengan konfirmasi bukti, pemisahan "dicatat" dan "diverifikasi", invoice berurutan dengan PPN, termin mengikuti milestone, dan penandaan jatuh tempo. Webhook penyedia nanti cukup memanggil pencatatan yang sama. |
| Tanda tangan elektronik (Privy/Digisign) | Penandatanganan dicatat beserta nama, email, waktu, dan pelakunya di audit log. Kolom bukti tanda tangan sudah disiapkan. |
| Integrasi kalender | Klien memilih slot hari kerja yang tersedia; pilihannya mengubah tahap lead dan memunculkan aktivitas di pipeline. |

---

## Kalibrasi harga

`npm run calibration` mereproduksi Lampiran C PRD dari mesin harga yang sungguh
dipakai aplikasi:

```
COGS per man-day  Rp 1.806.923   (PRD 6.2 menyebut ≈ Rp 1,8 juta)
Skenario A        Rp 56.680.000  (PRD: Rp 56,8 juta)
Skenario B        Rp 238.760.000 (PRD: Rp 239 juta)
```

Temuan kunci PRD tetap terjaga: margin skenario B lebih rendah daripada
skenario A meski nilainya 3,6× lebih besar — **proyek besar tidak otomatis
proyek sehat**.

### Dua ambiguitas PRD yang ditutup secara eksplisit

1. **Effort fitur Core** semula dapat terhitung ganda. Kini tiap fitur Core
   memakai `effortRatioCore`, dan `corePackageManDay` hanya menutup perakitan
   kerangka aplikasi yang tidak terwakili entri katalog mana pun.

2. **Dasar diskon skala.** Tabel 6.6 menyebut "jumlah fitur berbayar" (20 pada
   skenario B), sementara Lampiran C melabeli rakitan 28 fitur sebagai tier
   26–40. Perbedaan ini menjadi flag `discountCountsCoreFeatures` yang dapat
   diatur admin; mengaktifkannya mereproduksi Rp 215,1 juta persis seperti
   Lampiran C.

### Asumsi yang wajib diukur ulang sebelum produksi

Utilisasi billable 65% (PRD 6.2) adalah **asumsi**, dan merupakan variabel
tunggal paling sensitif terhadap margin. Menghitung dengan 20 hari billable per
bulan menghasilkan biaya semu Rp 1,1 juta yang berujung pada harga jual terlalu
rendah. Ukur dari data aktual tiap kuartal sebelum mengunci tarif —
pertanyaan terbuka PRD #9.

---

## Pengujian

```bash
npm test
```

Menguji mesin harga terhadap PRD bagian 6 dan Lampiran C, mesin dependensi
terhadap C.3 dan Lampiran B, serta normalisasi masukan formulir. Seed juga
memvalidasi katalog lebih dulu terhadap batas lebar rentang, dependensi
melingkar, rujukan slug, dan konsistensi preset — katalog cacat menggagalkan
seed alih-alih diam-diam masuk basis data.

---

## Menggelar ke produksi

Aplikasi ini berjalan di platform serverless mana pun yang mendukung Next.js;
petunjuk di bawah memakai Vercel sebagai contoh.

### 1. Siapkan basis data

Butuh PostgreSQL terkelola yang bisa diakses dari internet. **SQLite tidak bisa
dipakai**: berkas sistem di serverless bersifat hanya-baca dan tidak dibagi antar
instance, jadi setiap invocation akan melihat basis data yang berbeda atau tidak
ada sama sekali.

Cara termudah: buat basis data Neon lewat **Vercel → Storage → Create Database**.
Variabel lingkungannya terisi otomatis, termasuk koneksi langsung untuk migrasi.
Alternatifnya buat sendiri di [neon.com](https://neon.com) atau
[supabase.com](https://supabase.com), lalu salin URL-nya ke Vercel.

Basis data aplikasi ini kecil — katalog penuh berisi 132 fitur hanya beberapa
megabita — jadi paket gratis mana pun cukup untuk waktu yang lama.

### 2. Isi variabel lingkungan

| Variabel | Wajib | Isi |
|---|---|---|
| `DATABASE_URL` | ya | Koneksi yang dipakai aplikasi saat berjalan |
| `DIRECT_URL` | hanya bila pakai pooler | Koneksi **langsung** ke host basis data |
| `AUTH_SECRET` | ya | String acak minimal 32 karakter — `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ya | URL publik aplikasi, mis. `https://rakit.id` |
| `NEXT_PUBLIC_COMPANY_*` | tidak | Identitas perusahaan pada dokumen penawaran |

**Postgres tanpa pooler cukup `DATABASE_URL` saja.** Migrasi akan memakainya
juga, dan mencatat bahwa ia melakukannya.

**Neon dan Vercel Postgres tidak perlu diisi manual sama sekali.** Integrasinya
sudah menyuntikkan koneksi langsung dengan nama sendiri, dan migrasi mengenali
nama-nama itu — `DATABASE_URL_UNPOOLED` (Neon) dan `POSTGRES_URL_NON_POOLING`
(Vercel Postgres). `DIRECT_URL` yang Anda isi sendiri selalu menang atas
keduanya.

Dua URL baru dibutuhkan bila basis data berada di balik connection pooler, dan
alasannya berlawanan satu sama lain. Setiap invocation serverless membuka
koneksinya sendiri, sementara Postgres punya batas koneksi yang jauh lebih kecil
daripada jumlah invocation yang bisa hidup bersamaan — karena itu aplikasi
menyambung lewat pooler, dan `DATABASE_URL` membawa
`?pgbouncer=true&connection_limit=1`. Sebaliknya `prisma migrate` butuh advisory
lock yang hidup sepanjang sesi, sedangkan pooler transaction-mode memutus sesi
di antara pernyataan — karena itu migrasi memakai `DIRECT_URL`.

Contoh untuk Neon:

```
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/rakit?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/rakit?sslmode=require"
```

Perhatikan bedanya: host pooler mengandung `-pooler`, host langsung tidak.

### 3. Gelar

`npm run build` menjalankan `prisma generate`, lalu migrasi, baru `next build`. Migrasi karenanya ikut tergelar setiap kali deploy, dan build
gagal lebih dulu bila basis datanya tidak terjangkau — lebih baik gagal saat
build daripada terdeploy dalam keadaan tidak berfungsi.

### 4. Isi katalog satu kali

Basis data yang baru bermigrasi masih kosong: katalog, aturan harga, dan akun
belum ada. Jalankan seed sekali dari mesin Anda, mengarah ke basis data produksi:

```bash
DATABASE_URL="<DIRECT_URL produksi>" DIRECT_URL="<DIRECT_URL produksi>" npm run db:seed
```

Seed juga membuat akun contoh dengan kata sandi `rakit2026`. **Ganti atau hapus
akun-akun itu sebelum aplikasi dipakai sungguhan.**

Sebelum seed dijalankan, situs tetap menyala tanpa error — halaman katalog
merender kosong dan dirender ulang saat pertama diminta setelah datanya ada.
