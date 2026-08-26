'use client';

import Link from 'next/link';
import { ArrowRight, Clock, Layers } from 'lucide-react';
import { Card } from '@/components/ui';
import { CategoryIcon } from './category-icon';
import { track } from '@/lib/analytics/track';
import { formatRupiahRange, formatWeekRange } from '@/lib/format';
import type { CategoryDTO } from '@/lib/services/catalog';

/**
 * Kartu satu kategori aplikasi pada landing (PRD A3).
 *
 * Rentang harga sengaja dicetak di kartu, bukan disembunyikan di balik tombol
 * “hubungi kami”. Inilah satu-satunya pembeda yang paling terasa dibanding
 * kompetitor, dan menyaring pengunjung yang anggarannya memang tidak cocok
 * sebelum kedua pihak membuang waktu.
 *
 * Komponen ini berjalan di browser hanya karena perlu mengirim
 * `category_selected` — event tahap kedua corong konversi (PRD 4.2).
 */
export function CategoryCard({ category }: { category: CategoryDTO }) {
  const hasPrice = category.typicalPriceMin !== null && category.typicalPriceMax !== null;
  const hasDuration =
    category.typicalDurationWeeksMin !== null && category.typicalDurationWeeksMax !== null;

  return (
    <Link
      href={`/aplikasi/${category.slug}`}
      onClick={() => track('category_selected', { category: category.slug })}
      className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Card interactive className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg"
            aria-hidden="true"
          >
            <CategoryIcon name={category.icon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug tracking-[-0.01em] text-fg">
              {category.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-fg-muted">
              {category.tagline}
            </p>
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-subtle">
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Fitur tersedia</dt>
            <dd className="tabular">{category.featureCount} fitur tersedia</dd>
          </div>
          {hasDuration && (
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              <dt className="sr-only">Perkiraan pengerjaan</dt>
              <dd className="tabular">
                {formatWeekRange(
                  category.typicalDurationWeeksMin as number,
                  category.typicalDurationWeeksMax as number,
                )}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              Umumnya
            </p>
            {hasPrice ? (
              <p className="tabular mt-0.5 text-[15px] font-semibold text-accent-strong">
                {formatRupiahRange(
                  category.typicalPriceMin as number,
                  category.typicalPriceMax as number,
                )}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-fg-muted">Terlihat begitu Anda memilih fitur</p>
            )}
          </div>
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-fg-subtle transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-brand-fg"
            aria-hidden="true"
          >
            <ArrowRight className="size-4" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
