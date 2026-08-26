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

```bash
npm install
cp .env.example .env      # sesuaikan AUTH_SECRET untuk produksi
npm run db:push           # buat skema di SQLite
npm run db:seed           # isi katalog, pengguna, dan data contoh
npm run dev
```

Buka <http://localhost:3000>.

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
npm run db:reset     # hapus dev.db lalu push + seed ulang
npm run calibration  # laporan kalibrasi harga terhadap PRD Lampiran C
```

---

## Arsitektur

Monolith **Next.js 15 (App Router) + TypeScript + Prisma**. Tidak ada layanan
eksternal yang wajib: SQLite dipakai secara bawaan agar aplikasi bisa dijalankan
di mana pun. Untuk produksi, ubah `provider` di `prisma/schema.prisma` menjadi
`postgresql` — seluruh model sudah kompatibel.

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
| A | Landing & Katalog Aplikasi | P0 | ✅ |
| B | Wizard Rekomendasi | P1 | ✅ |
| C | Konfigurator Belanja Fitur | P0 | ✅ |
| D | Pengajuan Fitur Custom | P0 | ✅ |
| E | Konfigurasi Proyek | P0 | ✅ |
| F | Ringkasan & Generator Proposal PDF | P0 | ✅ |
| G | Akun Klien & Simpan Konfigurasi | P1 | ✅ |
| H | Checkout, DP Online & Invoice | P1 | Invoice & termin ✅ · gateway pembayaran belum tersambung |
| I | Kontrak Digital | P2 | Model & generator ✅ · tanda tangan elektronik belum tersambung |
| J | Portal Klien | P1 | ✅ |
| K | Change Request dari portal | P2 | ✅ |
| L | Admin: Manajemen Katalog & Fitur | P0 | ✅ |
| M | Admin: Mesin Harga & Dependensi | P0 | ✅ |
| N | Admin: Antrean Review Fitur Custom | P0 | ✅ |
| O | Admin: Pipeline Quote/Lead | P0 | ✅ |
| P | Admin: Manajemen Proyek & Milestone | P1 | ✅ |
| Q | Admin: Dashboard Analitik | P1 | ✅ |

### Yang belum tersambung ke layanan luar

Bagian berikut sengaja berhenti di batas integrasi, bukan karena belum
dikerjakan. Titik sambungannya sudah tersedia dan terisolasi:

- **Pengiriman email dan WhatsApp** — notifikasi dicatat dan tautannya
  disediakan untuk disalin manual. Tidak ada yang berpura-pura terkirim.
- **Payment gateway** (Midtrans/Xendit) — invoice, termin, dan pencatatan
  pembayaran manual sudah berjalan; pemilihan penyedia masih pertanyaan terbuka
  PRD #6.
- **Tanda tangan elektronik** (Privy/Digisign) dan **integrasi kalender**.

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
