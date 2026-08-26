import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db/prisma';
import { site } from '@/lib/site';

export const revalidate = 3600;

/**
 * Peta situs.
 *
 * Halaman fitur ikut didaftarkan karena persyaratan non-fungsional SEO menyebut
 * halaman fitur ter-index sebagai potensi trafik organik terbesar produk ini —
 * orang mencari "aplikasi stock opname", bukan "software house".
 *
 * Halaman rakitan (/rakit/<token>) sengaja TIDAK didaftarkan: isinya pribadi
 * bagi pemilik tautannya.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, '');

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/aplikasi`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/cara-kerja`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/harga`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/fitur`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/konsultasi`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/kebijakan-privasi`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/syarat-layanan`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  try {
    const categories = await prisma.applicationCategory.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true },
    });

    const features = await prisma.feature.findMany({
      where: { status: 'PUBLISHED', category: { status: 'PUBLISHED' } },
      select: { slug: true, updatedAt: true, category: { select: { slug: true } } },
    });

    return [
      ...staticPages,
      ...categories.flatMap((category) => [
        {
          url: `${base}/aplikasi/${category.slug}`,
          lastModified: category.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.9,
        },
        {
          url: `${base}/fitur/${category.slug}`,
          lastModified: category.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        },
      ]),
      ...features.map((feature) => ({
        url: `${base}/fitur/${feature.category.slug}/${feature.slug}`,
        lastModified: feature.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })),
    ];
  } catch {
    // Basis data belum siap (mis. saat build pertama) — peta statis tetap terbit.
    return staticPages;
  }
}
