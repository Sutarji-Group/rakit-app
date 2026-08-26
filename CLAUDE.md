# RAKIT — panduan untuk kontributor

Platform jasa pembuatan aplikasi berbasis konfigurator fitur. Monolith
Next.js 15 (App Router) + TypeScript + Prisma. Implementasi mengacu pada
`PRD Rakit v1.1`; setiap keputusan penting merujuk nomor bagian PRD.

## Aturan menulis

- **Seluruh teks yang dilihat pengguna berbahasa Indonesia.** Nama variabel,
  tipe, dan nama berkas tetap bahasa Inggris; komentar berbahasa Indonesia.
- Nama fitur dan deskripsi ditulis dalam **bahasa manfaat operasional**, bukan
  bahasa developer (Prinsip Produk #4). "Cek stok fisik vs sistem", bukan
  "Stock Reconciliation Module".
- Komentar menjelaskan **mengapa**, bukan apa. Rujuk aturan bisnis dengan
  kodenya (BR-13) atau nomor bagian PRD (6.8) bila relevan.
- Jangan menambahkan dependensi baru tanpa alasan kuat.

## Perintah

```bash
npm run dev          # server pengembangan
npm run build        # build produksi (menjalankan prisma generate lebih dulu)
npm run typecheck    # tsc --noEmit — wajib bersih
npm run lint         # eslint — wajib bersih tanpa warning
npm test             # pengujian mesin harga & dependensi
npm run db:push      # sinkronkan skema ke SQLite
npm run db:seed      # isi katalog, pengguna, dan data contoh
npm run db:reset     # hapus dev.db lalu push + seed ulang
```

Akun contoh setelah seed (kata sandi semua `rakit2026`):
`admin@rakit.id`, `katalog@rakit.id`, `consultant@rakit.id`, `sales@rakit.id`,
`pm@rakit.id`, `klien@contoh.id`.

## Peta direktori

```
prisma/schema.prisma          Skema data (PRD bagian 10)
prisma/seed.ts                Seed + validasi katalog
prisma/seed-demo.ts           Data contoh untuk seluruh papan admin

src/lib/domain/enums.ts       Union type + label bahasa Indonesia untuk semua "enum"
src/lib/db/prisma.ts          Singleton Prisma Client
src/lib/db/json.ts            Helper kolom JSON (SQLite menyimpannya sebagai String)

src/lib/pricing/              MESIN HARGA — fungsi murni, PRD bagian 6
  engine.ts                     computePrice(), validateRangeWidth(), evaluatePriceOverride()
  types.ts                      PricingRuleSnapshot, PriceBreakdown
  rule.ts                       toPricingRuleSnapshot(), BASELINE_PRICING_RULE
  defaults.ts                   Pengali platform/deployment, tier diskon

src/lib/configurator/         MESIN DEPENDENSI — fungsi murni, PRD C.3
  dependency.ts                 resolveAdd/resolveRemove/enforceSelection/detectRequiresCycle

src/lib/services/             Logika bisnis sisi server (impor 'server-only')
  catalog.ts                    loadCatalogBundle(), listPublishedCategories()
  configuration.ts              getConfiguratorPayload(), updateSelection(), recomputeConfiguration()
  custom-request.ts             Antrean fitur custom, SLA, promosi ke katalog
  lead.ts                       submitConfiguration(), pipeline, override harga
  pricing-rule.ts               getActivePricingRule(), getPricingRuleById()

src/lib/analytics/            events.ts (daftar event), track.ts (klien), report.ts (agregat)
src/lib/auth/                 Sesi, kata sandi, penjaga akses
src/lib/api/                  Helper respons, skema Zod, pembatas laju

src/components/ui/            Primitif UI — SELALU pakai ini, jangan buat baru
src/components/layout/        SiteHeader, SiteFooter, AdminShell, Logo

src/app/(marketing)/          Halaman publik dengan header + footer
src/app/api/                  Route handler REST
```

## Dua mesin yang menjadi kontrak seluruh sistem

### Mesin harga (`src/lib/pricing`)

Fungsi murni tanpa ketergantungan Prisma/React, sehingga perhitungan berjalan
**identik di klien dan di server**. Konfigurator menghitung di browser untuk
umpan balik instan (NFR ≤ 200 ms); server menghitung ulang sendiri sebelum
menyimpan dan tidak pernah mempercayai angka dari klien.

```ts
import { computePrice } from '@/lib/pricing';
const breakdown = computePrice({ rule, features, customRequests, addOns, platform, deployment, userTier });
```

`breakdown.internal` berisi COGS dan gross margin — **tidak pernah ditampilkan
ke klien**, hanya di area admin (PRD 6.4).

### Mesin dependensi (`src/lib/configurator/dependency.ts`)

Prinsip Produk #2: keranjang yang mustahil dibangun tidak boleh bisa dibuat.
`enforceSelection()` dipanggil server pada **setiap** penyimpanan, jadi apa pun
yang dikirim browser akan dinormalkan ulang.

## Aturan bisnis yang paling sering terlewat

| Kode | Aturan |
|---|---|
| BR-01 | Fitur Core selalu masuk keranjang, tidak dapat dihapus |
| BR-02 | Fitur custom tidak pernah masuk total sebelum diestimasi manusia |
| BR-03 | Maksimal 5 fitur custom per konfigurasi |
| BR-05 | Lebar rentang: Core ≤1,15× · Standard ≤1,30× · Configurable ≤1,80× |
| BR-07 | Perubahan tarif tidak berlaku surut terhadap penawaran yang terbit |
| BR-12 | Biaya berulang selalu terpisah dari nilai proyek |
| BR-13 | Nilai proyek minimum Rp 35 juta |
| BR-14 | Biaya setup Rp 10 juta tetap, tidak ikut didiskon |
| BR-16 | Override harga sales dibatasi 10%, di atas itu wajib approval |
| BR-17 | Gross margin < 40% wajib approval eksplisit |

C2.4: kartu fitur menampilkan **indikator bertingkat** (`<PriceImpact />`),
bukan angka rupiah per fitur. Rupiah hanya muncul di "lihat rincian".

## Konvensi UI

- Impor primitif dari `@/components/ui` — Button, Card, Badge, FeatureTypeBadge,
  Field/Input/Select/Switch, Alert, Dialog, BottomSheet, Tabs, Table, Progress,
  Stat, DescRow, EmptyState, PriceImpact, useToast.
- Warna hanya lewat token semantik: `bg-surface`, `text-fg-muted`,
  `border-border`, `bg-brand-soft`, `text-danger`. **Jangan** memakai warna
  Tailwind mentah seperti `bg-blue-500` — mode gelap akan rusak.
- Angka uang memakai kelas `tabular` agar tidak bergoyang saat berubah.
- Format lewat `@/lib/format`: `formatRupiah`, `formatRupiahShort`,
  `formatRupiahRange`, `formatPercent`, `formatDate`, `formatWeekRange`.
- Tabel lebar dibungkus `<TableWrapper>` agar menggulir sendiri, bukan halaman.
- Server Component secara bawaan; tambahkan `'use client'` hanya bila memang
  butuh state atau event handler.

## Sebelum menyatakan selesai

```bash
npm run typecheck && npm run lint && npm test
```
Ketiganya wajib bersih.
