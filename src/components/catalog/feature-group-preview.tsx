import Link from 'next/link';
import { Badge, FeatureTypeBadge } from '@/components/ui';
import type { FeatureGroupDTO } from '@/lib/services/catalog';
import { CatalogIcon } from './icon';

/** Jumlah contoh fitur yang ditampilkan per kelompok pada halaman kategori. */
const SAMPLE_SIZE = 5;

/**
 * Daftar kelompok fitur beserta beberapa contoh isinya (A4).
 *
 * Tujuannya menjawab satu pertanyaan pemilik usaha: "apa saja yang bisa saya
 * dapat?" — tanpa memindahkan seluruh konfigurator ke halaman pemasaran.
 * Rupiah per fitur sengaja tidak ditampilkan di sini (C2.4).
 */
export function FeatureGroupPreview({
  groups,
  categorySlug,
}: {
  groups: FeatureGroupDTO[];
  categorySlug: string;
}) {
  const filled = groups.filter((group) => group.features.length > 0);

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {filled.map((group) => {
        const sample = group.features.slice(0, SAMPLE_SIZE);
        const rest = group.features.length - sample.length;

        return (
          <li
            key={group.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-fg">
                <CatalogIcon name={group.icon} />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold leading-snug text-fg">{group.name}</h3>
                  <Badge variant="neutral">{group.features.length} fitur</Badge>
                </div>
                {group.description && (
                  <p className="text-sm leading-relaxed text-fg-muted">{group.description}</p>
                )}
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {sample.map((feature) => (
                <li key={feature.id}>
                  <Link
                    href={`/fitur/${categorySlug}/${feature.slug}`}
                    className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className="font-medium">{feature.name}</span>
                    <FeatureTypeBadge type={feature.type} />
                  </Link>
                </li>
              ))}
            </ul>

            {rest > 0 && (
              <p className="text-xs text-fg-subtle">
                Dan {rest} fitur lain di kelompok ini, semuanya bisa dipilih satu per satu.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
