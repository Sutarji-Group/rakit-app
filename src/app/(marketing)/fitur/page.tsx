import type { Metadata } from 'next';
import Link from 'next/link';

import { FeatureIndex } from '@/components/catalog';
import { listFeatureIndex } from '@/components/catalog/queries';
import { Section, SectionHeading } from '@/components/marketing/section';
import { Button, PriceImpact } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Katalog fitur aplikasi bisnis',
  description:
    'Telusuri seluruh fitur yang bisa dipasang: stock opname, surat jalan, follow-up pelanggan, ' +
    'laporan penjualan, dan lainnya. Setiap fitur punya penjelasan cara kerjanya.',
  alternates: { canonical: '/fitur' },
  openGraph: {
    title: 'Katalog fitur aplikasi bisnis',
    description:
      'Cari fitur berdasarkan pekerjaan yang ingin Anda rapikan, lalu pasang ke rakitan Anda.',
    url: '/fitur',
  },
};

/**
 * Indeks seluruh fitur terbit.
 *
 * Orang mencari pekerjaannya, bukan nama produk kami — "aplikasi stock opname",
 * bukan "modul rekonsiliasi persediaan". Halaman ini dirender penuh di server
 * agar setiap fitur punya jalur masuk sendiri dari mesin pencari (NFR SEO).
 */
export default async function FiturPage() {
  const categories = await listFeatureIndex();

  return (
    <>
      <Section size="sm">
        <div className="flex flex-col gap-8">
          <SectionHeading
            as="h1"
            eyebrow="Katalog fitur"
            title="Cari fitur dari pekerjaan yang ingin Anda rapikan"
            description="Ketik istilah yang Anda pakai sehari-hari — “stok opname”, “surat jalan”, “tagih pelanggan”. Setiap fitur punya halamannya sendiri: cara kerjanya, fitur lain yang harus ikut, dan di aplikasi mana ia dipasang."
          />

          <p className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-sunken p-3 text-xs leading-relaxed text-fg-muted">
            <PriceImpact level={2} />
            <span>
              Tanda ini menunjukkan seberapa besar sebuah fitur memengaruhi total, bukan harganya.
              Angka rupiah muncul di konfigurator, tempat seluruh rakitan dihitung sekaligus.
            </span>
          </p>

          <FeatureIndex categories={categories} />
        </div>
      </Section>

      <Section tone="sunken" size="sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-semibold leading-snug text-fg">
              Fitur yang Anda butuhkan belum ada di daftar?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
              Itu hal biasa — setiap usaha punya cara kerjanya sendiri. Tim kami bisa mengestimasi
              fitur khusus dan, bila ternyata banyak yang membutuhkannya, memasukkannya ke katalog.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/konsultasi">Ceritakan kebutuhan Anda</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/aplikasi">Lihat katalog aplikasi</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
