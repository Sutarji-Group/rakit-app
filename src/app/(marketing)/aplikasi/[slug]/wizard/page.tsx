import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { WizardRunner } from '@/components/catalog';
import { getWizardPageData } from '@/components/catalog/queries';
import { Section } from '@/components/marketing/section';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getWizardPageData(slug);
  if (!data) return { title: 'Kategori tidak ditemukan' };

  return {
    title: `Bantu saya memilih fitur ${data.category.shortName}`,
    description: `Jawab beberapa pertanyaan tentang kondisi usaha Anda, lalu kami susun daftar fitur ${data.category.name} yang paling masuk akal untuk Anda.`,
    // Alat interaktif, bukan halaman konten: tidak perlu masuk indeks, tetapi
    // tautan di dalamnya tetap boleh ditelusuri mesin pencari.
    robots: { index: false, follow: true },
  };
}

/**
 * Wizard rekomendasi fitur (Modul B).
 *
 * Persona Budi tidak tahu nama fitur yang dia butuhkan — dia hanya tahu
 * keluhannya. Halaman ini menanyakan kondisi bisnis (B2), memetakannya ke
 * fitur (B3), lalu menjelaskan alasan tiap rekomendasi sebelum berpindah ke
 * konfigurator (B4). Pertanyaan dan alasan seluruhnya berasal dari katalog.
 */
export default async function WizardPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getWizardPageData(slug);
  if (!data) notFound();

  const { category, questions, presets } = data;

  return (
    <Section size="sm" containerClassName="max-w-3xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
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
            <Link
              href={`/aplikasi/${category.slug}`}
              className="rounded-md underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {category.shortName}
            </Link>
            <span aria-hidden="true" className="px-2 text-fg-subtle">
              /
            </span>
            <span className="text-fg">Bantu saya memilih</span>
          </nav>

          <h1 className="text-balance text-2xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-3xl">
            Beberapa pertanyaan tentang usaha Anda
          </h1>
          <p className="text-[15px] leading-relaxed text-fg-muted">
            Tidak ada istilah teknis dan tidak ada isian bebas — cukup pilih kondisi yang paling
            mendekati. Dari jawaban itu kami menyusun daftar fitur {category.name} beserta
            alasannya, sebelum Anda melihat harganya.
          </p>
        </div>

        <WizardRunner
          categorySlug={category.slug}
          categoryName={category.shortName}
          questions={questions}
          presets={presets}
        />
      </div>
    </Section>
  );
}
