import type { Metadata } from 'next';
import Link from 'next/link';

import { CategoryCard, ConsultationCard, PriceRangeNote } from '@/components/catalog';
import { listCatalogCards } from '@/components/catalog/queries';
import { Section, SectionHeading } from '@/components/marketing/section';
import { Button, EmptyState } from '@/components/ui';
import { HOW_IT_WORKS } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Katalog aplikasi bisnis siap rakit',
  description:
    'Pilih jenis aplikasi yang ingin Anda bangun — gudang, pelanggan, kasir, dan lainnya. ' +
    'Setiap katalog memuat jumlah fitur, rentang harga, dan perkiraan waktu pengerjaan.',
  alternates: { canonical: '/aplikasi' },
  openGraph: {
    title: 'Katalog aplikasi bisnis siap rakit',
    description:
      'Setiap jenis aplikasi berisi preset siap pakai beserta rentang harga dan waktu pengerjaannya.',
    url: '/aplikasi',
  },
};

/**
 * Katalog kategori aplikasi (A3).
 *
 * Tiga angka pada setiap kartu — jumlah fitur, rentang harga, dan lama
 * pengerjaan — menjawab pertanyaan yang biasanya baru terjawab setelah dua
 * kali rapat. Menjawabnya di halaman pertama adalah inti janji produk ini.
 */
export default async function KatalogAplikasiPage() {
  const categories = await listCatalogCards();

  return (
    <>
      <Section size="md">
        <div className="flex flex-col gap-8">
          <SectionHeading
            as="h1"
            eyebrow="Katalog aplikasi"
            title="Aplikasi apa yang ingin Anda rakit?"
            description="Pilih yang paling mendekati pekerjaan Anda sehari-hari. Di dalamnya sudah ada paket siap pakai yang bisa Anda tambah atau kurangi sendiri, lengkap dengan harganya."
          />

          {categories.length === 0 ? (
            <EmptyState
              title="Katalog sedang disiapkan"
              description="Belum ada kategori yang terbit saat ini. Ceritakan kebutuhan Anda dan tim kami akan memetakannya secara manual."
              action={
                <Button asChild>
                  <Link href="/konsultasi">Ceritakan kebutuhan Anda</Link>
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <li key={category.id}>
                  <CategoryCard category={category} />
                </li>
              ))}
              <li>
                <ConsultationCard />
              </li>
            </ul>
          )}

          <PriceRangeNote />
        </div>
      </Section>

      <Section tone="sunken" size="sm">
        <div className="flex flex-col gap-6">
          <SectionHeading
            title="Setelah memilih kategori, hanya tiga langkah"
            description="Tidak ada formulir panjang di awal. Anda baru meninggalkan kontak ketika sudah melihat angkanya sendiri."
          />
          <ol className="grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <li
                key={item.step}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-5"
              >
                <span className="tabular inline-flex size-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-fg">
                  {item.step}
                </span>
                <h3 className="text-base font-semibold text-fg">{item.title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>
    </>
  );
}
