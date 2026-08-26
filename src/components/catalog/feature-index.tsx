'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { Badge, EmptyState, Field, FeatureTypeBadge, Input, PriceImpact } from '@/components/ui';
import { CatalogIcon } from './icon';
import type { FeatureIndexCategory } from './types';

/**
 * Indeks seluruh fitur terbit, dikelompokkan per kategori aplikasi.
 *
 * Seluruh daftar dirender di server lebih dulu (bukan diambil lewat API) agar
 * mesin pencari melihat isinya — halaman fitur adalah sumber trafik organik
 * terbesar pada persyaratan non-fungsional SEO. Pencarian di sini hanya
 * menyaring daftar yang sudah ada, tanpa permintaan tambahan ke server.
 */
export function FeatureIndex({ categories }: { categories: FeatureIndexCategory[] }) {
  const [query, setQuery] = useState('');
  const searchId = useId();

  const keyword = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!keyword) return categories;
    return categories
      .map((category) => ({
        ...category,
        features: category.features.filter((feature) =>
          [
            feature.name,
            feature.clientDescription,
            feature.groupName,
            category.name,
            category.shortName,
            ...feature.keywords,
          ]
            .join(' ')
            .toLowerCase()
            .includes(keyword),
        ),
      }))
      .filter((category) => category.features.length > 0);
  }, [categories, keyword]);

  const total = filtered.reduce((sum, category) => sum + category.features.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Field
          label="Cari fitur"
          htmlFor={searchId}
          hint="Contoh: stock opname, surat jalan, follow up pelanggan, laporan penjualan."
        >
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ketik pekerjaan yang ingin Anda rapikan…"
            autoComplete="off"
            leadingIcon={
              <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            }
          />
        </Field>
        <p className="text-xs text-fg-muted" role="status" aria-live="polite">
          {keyword
            ? `${total} fitur cocok dengan "${query.trim()}".`
            : `${total} fitur siap dipasang di seluruh kategori aplikasi.`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Belum ada fitur yang cocok"
          description="Coba kata lain yang lebih umum, misalnya “stok”, “invoice”, atau “pelanggan”. Bila memang belum ada, tim kami bisa mengestimasinya sebagai fitur khusus."
          action={
            <Link
              href="/konsultasi"
              className="rounded-md text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Ceritakan kebutuhan Anda
            </Link>
          }
        />
      ) : (
        filtered.map((category) => (
          <section key={category.slug} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg">
                  <CatalogIcon name={category.icon} />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-fg">{category.name}</h2>
                  <p className="text-xs text-fg-muted">{category.features.length} fitur</p>
                </div>
              </div>
              <Link
                href={`/aplikasi/${category.slug}`}
                className="rounded-md text-sm font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Lihat paket {category.shortName}
              </Link>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.features.map((feature) => (
                <li key={feature.slug}>
                  <Link
                    href={`/fitur/${category.slug}/${feature.slug}`}
                    className="flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-snug text-fg">
                        {feature.name}
                      </span>
                      <PriceImpact level={feature.impact} className="mt-0.5" />
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-fg-muted">
                      {feature.clientDescription}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      <FeatureTypeBadge type={feature.type} />
                      <Badge variant="neutral">{feature.groupName}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
