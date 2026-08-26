import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CatalogIcon, StartConfigurationButton } from '@/components/catalog';
import type { RelatedFeatureView } from '@/components/catalog';
import { getFeatureDetail, listFeatureParams } from '@/components/catalog/queries';
import { toMetadataTitle, toMetaDescription } from '@/components/catalog/seo';
import { Section } from '@/components/marketing/section';
import { Badge, Button, Card, FeatureTypeBadge, PriceImpact } from '@/components/ui';
import { FEATURE_TYPE_DESCRIPTION, FEATURE_TYPE_LABEL } from '@/lib/domain/enums';
import { site } from '@/lib/site';

interface PageProps {
  params: Promise<{ categorySlug: string; featureSlug: string }>;
}

/**
 * Setiap fitur dirender lebih dulu menjadi halaman sendiri.
 *
 * Persyaratan non-fungsional SEO menyebut halaman fitur sebagai potensi
 * trafik organik terbesar: orang mengetik "aplikasi stock opname", bukan nama
 * perusahaan kami.
 */
export async function generateStaticParams() {
  return listFeatureParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug, featureSlug } = await params;
  const detail = await getFeatureDetail(categorySlug, featureSlug);
  if (!detail) return { title: 'Fitur tidak ditemukan' };

  const { category, feature } = detail;
  const title = feature.seoTitle ?? `${feature.name} — fitur ${category.shortName}`;
  const description = feature.seoDescription ?? toMetaDescription(feature.clientDescription);
  const path = `/fitur/${category.slug}/${feature.slug}`;

  return {
    title: toMetadataTitle(title),
    description,
    keywords: feature.keywords.length > 0 ? feature.keywords : undefined,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: 'article' },
  };
}

/**
 * Halaman satu fitur.
 *
 * Tidak ada angka rupiah per fitur di sini (C2.4) — hanya indikator dampak
 * bertingkat. Menampilkan harga per item mengundang perbandingan mikro dengan
 * kompetitor, padahal nilai produk ini ada pada rakitan utuhnya.
 */
export default async function FiturDetailPage({ params }: PageProps) {
  const { categorySlug, featureSlug } = await params;
  const detail = await getFeatureDetail(categorySlug, featureSlug);
  if (!detail) notFound();

  const { category, group, feature, requires, recommends, siblings } = detail;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Katalog fitur', item: `${site.url}/fitur` },
      {
        '@type': 'ListItem',
        position: 2,
        name: category.name,
        item: `${site.url}/aplikasi/${category.slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: feature.name,
        item: `${site.url}/fitur/${category.slug}/${feature.slug}`,
      },
    ],
  };

  return (
    <Section size="sm">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <article className="flex min-w-0 flex-1 flex-col gap-8">
          <div className="flex flex-col gap-4">
            <nav aria-label="Remah navigasi" className="flex flex-wrap items-center text-sm text-fg-muted">
              <Link
                href="/fitur"
                className="rounded-md underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Katalog fitur
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
              <span className="text-fg">{feature.name}</span>
            </nav>

            <h1 className="text-balance text-3xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-4xl">
              {feature.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              <FeatureTypeBadge type={feature.type} size="md" />
              <Badge variant="neutral">{group.name}</Badge>
              <PriceImpact level={feature.impact} showLabel />
            </div>

            <p className="max-w-2xl text-[15px] leading-relaxed text-fg-muted">
              {feature.clientDescription}
            </p>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold leading-snug text-fg">
              Apa arti status &ldquo;{FEATURE_TYPE_LABEL[feature.type]}&rdquo;
            </h2>
            <p className="rounded-xl border border-border bg-surface-sunken p-4 text-sm leading-relaxed text-fg-muted">
              {FEATURE_TYPE_DESCRIPTION[feature.type]}
            </p>
            {feature.type === 'CORE' && (
              <p className="text-xs leading-relaxed text-fg-subtle">
                Fitur seperti ini otomatis ikut di setiap rakitan {category.shortName} dan tidak
                dapat dihapus, karena seluruh fitur lain berdiri di atasnya.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold leading-snug text-fg">
              Bagian dari kelompok {group.name}
            </h2>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg">
                <CatalogIcon name={group.icon} />
              </span>
              <p className="text-sm leading-relaxed text-fg-muted">
                {group.description ??
                  `Kelompok fitur ${group.name} pada katalog ${category.name}.`}
              </p>
            </div>
          </section>

          {requires.length > 0 && (
            <RelatedSection
              title="Fitur yang harus ikut"
              description="Fitur ini berdiri di atas fitur di bawah, jadi keduanya otomatis masuk bersama saat Anda memilihnya. Keranjang yang mustahil dibangun memang sengaja tidak bisa dibuat."
              categorySlug={category.slug}
              items={requires}
            />
          )}

          {recommends.length > 0 && (
            <RelatedSection
              title="Biasanya dipasang bersama"
              description="Bukan keharusan — hanya kombinasi yang paling sering dipakai klien lain dengan kebutuhan serupa."
              categorySlug={category.slug}
              items={recommends}
            />
          )}

          {siblings.length > 0 && (
            <RelatedSection
              title={`Fitur lain di kelompok ${group.name}`}
              categorySlug={category.slug}
              items={siblings}
            />
          )}

          {feature.keywords.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-fg">Sering juga disebut</h2>
              <ul className="flex flex-wrap gap-2">
                {feature.keywords.map((keyword) => (
                  <li key={keyword}>
                    <Badge variant="neutral">{keyword}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className="w-full lg:sticky lg:top-24 lg:max-w-sm">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold text-fg">
                Pasang fitur ini di aplikasi {category.shortName} Anda
              </h2>
              <p className="text-sm leading-relaxed text-fg-muted">
                Konfigurator terbuka dengan paket bawaan {category.shortName} sebagai titik awal.
                Tambahkan fitur ini, lalu lihat harga dan waktu pengerjaannya bergerak seketika.
              </p>
            </div>

            <StartConfigurationButton
              categorySlug={category.slug}
              source="direct"
              label={`Rakit aplikasi ${category.shortName}`}
              size="lg"
              fullWidth
            />

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/aplikasi/${category.slug}/wizard`}>Bantu saya memilih fitur</Link>
              </Button>
              <Link
                href={`/aplikasi/${category.slug}`}
                className="rounded-md px-1 py-1 text-center text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Lihat semua paket {category.shortName}
              </Link>
            </div>

            <p className="text-xs leading-relaxed text-fg-subtle">
              Harga per fitur sengaja tidak ditampilkan di halaman ini. Yang Anda beli adalah satu
              aplikasi utuh, dan angkanya dihitung dari seluruh rakitan sekaligus.
            </p>
          </Card>
        </aside>
      </div>
    </Section>
  );
}

/** Daftar fitur terkait dengan tautan ke halaman fiturnya masing-masing. */
function RelatedSection({
  title,
  description,
  categorySlug,
  items,
}: {
  title: string;
  description?: string;
  categorySlug: string;
  items: RelatedFeatureView[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold leading-snug text-fg">{title}</h2>
      {description && <p className="text-sm leading-relaxed text-fg-muted">{description}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/fitur/${categorySlug}/${item.slug}`}
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-fg">{item.name}</span>
                <FeatureTypeBadge type={item.type} />
              </span>
              {item.note && (
                <span className="text-xs leading-relaxed text-fg-muted">{item.note}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
