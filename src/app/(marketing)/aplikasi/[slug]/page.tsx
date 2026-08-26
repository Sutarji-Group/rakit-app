import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  CatalogIcon,
  FeatureGroupPreview,
  PresetCard,
  PriceRangeNote,
  StartConfigurationButton,
} from '@/components/catalog';
import { getCategoryPageData, listCategoryParams } from '@/components/catalog/queries';
import { toMetadataTitle, toMetaDescription } from '@/components/catalog/seo';
import { Section, SectionHeading } from '@/components/marketing/section';
import { Button, Card } from '@/components/ui';
import { formatRupiahRange, formatWeekRange } from '@/lib/format';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Halaman kategori dirender lebih dulu agar terbaca mesin pencari (NFR SEO). */
export async function generateStaticParams() {
  return listCategoryParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryPageData(slug);
  if (!data) return { title: 'Kategori tidak ditemukan' };

  const { category } = data;
  // Judul & deskripsi SEO dikelola tim katalog lewat admin; teks bawaan hanya
  // dipakai bila kolomnya masih kosong.
  const title = category.seoTitle ?? `${category.name} — ${category.tagline}`;
  const description = category.seoDescription ?? toMetaDescription(category.description);

  return {
    title: toMetadataTitle(title),
    description,
    alternates: { canonical: `/aplikasi/${category.slug}` },
    openGraph: {
      title,
      description,
      url: `/aplikasi/${category.slug}`,
      type: 'website',
    },
  };
}

/**
 * Halaman satu kategori aplikasi (A4).
 *
 * Tiga pintu masuk disediakan berdampingan karena pengunjung datang dengan
 * tingkat kesiapan yang berbeda: langsung dari preset, dituntun wizard, atau
 * langsung merakit sendiri. Ketiganya bermuara ke konfigurator yang sudah
 * berisi fitur — tidak pernah ke halaman kosong (Prinsip Produk #3).
 */
export default async function KategoriPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getCategoryPageData(slug);
  if (!data) notFound();

  const { category, bundle, presets } = data;
  const hasPrice = category.typicalPriceMin != null && category.typicalPriceMax != null;
  const hasDuration =
    category.typicalDurationWeeksMin != null && category.typicalDurationWeeksMax != null;

  return (
    <>
      <Section size="sm">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <div className="flex flex-1 flex-col gap-5">
            <nav aria-label="Remah navigasi" className="text-sm text-fg-muted">
              <Link
                href="/aplikasi"
                className="rounded-md underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Katalog aplikasi
              </Link>
              <span aria-hidden="true" className="px-2 text-fg-subtle">
                /
              </span>
              <span className="text-fg">{category.shortName}</span>
            </nav>

            <div className="flex items-start gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-fg">
                <CatalogIcon name={category.icon} className="size-7" />
              </span>
              <div className="flex flex-col gap-2">
                <h1 className="text-balance text-3xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-4xl">
                  {category.name}
                </h1>
                <p className="text-[15px] leading-relaxed text-fg-muted">{category.tagline}</p>
              </div>
            </div>

            {category.longDescription && (
              <p className="max-w-2xl text-[15px] leading-relaxed text-fg-muted">
                {category.longDescription}
              </p>
            )}

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs text-fg-muted">Fitur tersedia</dt>
                <dd className="tabular mt-1 text-lg font-semibold text-fg">
                  {category.featureCount} fitur
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs text-fg-muted">Rentang harga tipikal</dt>
                <dd className="tabular mt-1 text-lg font-semibold text-fg">
                  {hasPrice
                    ? formatRupiahRange(category.typicalPriceMin!, category.typicalPriceMax!)
                    : 'Dihitung saat merakit'}
                </dd>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs text-fg-muted">Waktu pengerjaan</dt>
                <dd className="tabular mt-1 text-lg font-semibold text-fg">
                  {hasDuration
                    ? formatWeekRange(
                        category.typicalDurationWeeksMin!,
                        category.typicalDurationWeeksMax!,
                      )
                    : 'Tergantung fitur'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Dua jalur masuk selain preset (B5): dituntun, atau langsung merakit. */}
          <Card className="flex w-full flex-col gap-4 p-5 lg:max-w-sm">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold text-fg">Mulai dari mana?</h2>
              <p className="text-sm leading-relaxed text-fg-muted">
                Belum tahu fitur apa yang dibutuhkan? Jawab beberapa pertanyaan tentang kondisi
                usaha Anda, dan kami yang menyusun daftar awalnya.
              </p>
            </div>

            <Button asChild size="lg" className="w-full">
              <Link href={`/aplikasi/${category.slug}/wizard`}>Bantu saya memilih</Link>
            </Button>

            <StartConfigurationButton
              categorySlug={category.slug}
              source="direct"
              label="Saya sudah tahu apa yang saya butuhkan"
              variant="secondary"
              size="lg"
              fullWidth
            />

            <p className="text-xs leading-relaxed text-fg-subtle">
              Keduanya membuka konfigurator yang sudah berisi paket bawaan {category.shortName}.
              Tidak ada kolom kosong yang harus Anda isi dari nol, dan belum perlu meninggalkan
              nomor telepon.
            </p>
          </Card>
        </div>
      </Section>

      {category.painPoints.length > 0 && (
        <Section tone="sunken" size="sm">
          <div className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="Kenapa ini dibutuhkan"
              title="Keluhan yang paling sering kami dengar"
              description="Bila satu saja terdengar seperti kantor Anda, katalog ini kemungkinan besar cocok."
            />
            <ul className="grid gap-4 sm:grid-cols-2">
              {category.painPoints.map((point) => (
                <li
                  key={point.title}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5"
                >
                  <h3 className="text-base font-semibold leading-snug text-fg">
                    &ldquo;{point.title}&rdquo;
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-muted">{point.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {category.benefits.length > 0 && (
        <Section size="sm">
          <div className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="Hasilnya"
              title={`Yang berubah setelah ${category.shortName} berjalan`}
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {category.benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex gap-3 rounded-lg border border-border bg-surface p-4 text-[15px] leading-relaxed text-fg"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="mt-1 size-4 shrink-0 text-success"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m3.5 8.5 3 3 6-6.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section id="paket" tone="sunken" size="md">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Paket siap pakai"
            title="Pilih titik awal, bukan halaman kosong"
            description="Setiap paket adalah kumpulan fitur yang sudah terbukti dipakai bersama. Anda tetap bisa menambah atau membuang fitur apa pun setelahnya, dan harganya bergerak seketika."
          />

          {presets.length === 0 ? (
            <Card className="flex flex-col gap-3 p-5">
              <p className="text-sm leading-relaxed text-fg-muted">
                Paket bawaan untuk kategori ini sedang disiapkan. Anda tetap bisa merakit sendiri
                dari daftar fitur di bawah.
              </p>
              <div>
                <StartConfigurationButton
                  categorySlug={category.slug}
                  source="direct"
                  label="Mulai merakit sendiri"
                />
              </div>
            </Card>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-3">
              {presets.map((preset) => (
                <li key={preset.slug}>
                  <PresetCard preset={preset} categorySlug={category.slug} />
                </li>
              ))}
            </ul>
          )}

          <PriceRangeNote />

          <p className="text-xs leading-relaxed text-fg-subtle">
            Angka di atas adalah nilai proyek satu kali, sudah termasuk biaya setup. Biaya berulang
            seperti hosting dan pemeliharaan selalu dihitung terpisah (BR-12) dan baru muncul saat
            Anda memilih opsi proyek di konfigurator.
          </p>
        </div>
      </Section>

      <Section size="md">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Isi katalog"
            title={`Kelompok fitur di ${category.shortName}`}
            description="Semua fitur di bawah bisa dipilih satu per satu. Klik salah satu untuk membaca cara kerjanya sebelum memutuskan."
          />
          <FeatureGroupPreview groups={bundle.groups} categorySlug={category.slug} />
          <div>
            <Button asChild variant="secondary">
              <Link href="/fitur">Telusuri seluruh fitur</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section tone="sunken" size="sm">
        <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold leading-snug text-fg">
              Masih ragu paket mana yang pas?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
              Jawab beberapa pertanyaan tentang kondisi usaha Anda — jumlah gudang, cara mencatat
              hari ini, berapa orang yang memakai. Kami yang menerjemahkannya menjadi daftar fitur.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href={`/aplikasi/${category.slug}/wizard`}>Bantu saya memilih</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/konsultasi">Bicara dengan tim</Link>
            </Button>
          </div>
        </Card>
      </Section>
    </>
  );
}
