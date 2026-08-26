import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatRupiahRange, formatWeekRange } from '@/lib/format';
import type { CategoryDTO } from '@/lib/services/catalog';
import { CatalogIcon } from './icon';
import { TrackedLink } from './tracked-link';

/**
 * Kartu satu kategori aplikasi pada katalog (A3).
 *
 * Tiga angka yang ditampilkan — jumlah fitur, rentang harga tipikal, dan
 * durasi tipikal — adalah tiga pertanyaan pertama yang selalu ditanyakan
 * pemilik usaha. Menjawabnya di kartu membuat orang berani masuk lebih dalam.
 */
export function CategoryCard({ category }: { category: CategoryDTO }) {
  const hasPrice = category.typicalPriceMin != null && category.typicalPriceMax != null;
  const hasDuration =
    category.typicalDurationWeeksMin != null && category.typicalDurationWeeksMax != null;

  return (
    <Card interactive className="relative flex h-full flex-col">
      <CardHeader className="gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg">
          <CatalogIcon name={category.icon} className="size-6" />
        </span>
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-lg">{category.name}</CardTitle>
          <p className="text-sm leading-relaxed text-fg-muted">{category.tagline}</p>
        </div>
      </CardHeader>

      <CardContent className="mt-auto flex flex-col gap-4">
        <dl className="flex flex-col gap-2 rounded-lg bg-surface-sunken p-3">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-fg-muted">Fitur tersedia</dt>
            <dd className="tabular text-sm font-semibold text-fg">{category.featureCount} fitur</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-fg-muted">Harga tipikal</dt>
            <dd className="tabular text-sm font-semibold text-fg">
              {hasPrice
                ? formatRupiahRange(category.typicalPriceMin!, category.typicalPriceMax!)
                : 'Dihitung saat merakit'}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-fg-muted">Waktu pengerjaan</dt>
            <dd className="tabular text-sm font-semibold text-fg">
              {hasDuration
                ? formatWeekRange(
                    category.typicalDurationWeeksMin!,
                    category.typicalDurationWeeksMax!,
                  )
                : 'Tergantung fitur'}
            </dd>
          </div>
        </dl>

        <TrackedLink
          href={`/aplikasi/${category.slug}`}
          event="category_selected"
          payload={{ category: category.slug }}
          ariaLabel={`Lihat fitur dan harga ${category.name}`}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-brand after:absolute after:inset-0 after:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Lihat fitur &amp; harga
          <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
            <path
              d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </TrackedLink>
      </CardContent>
    </Card>
  );
}
