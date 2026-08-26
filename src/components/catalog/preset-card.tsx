import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatRupiahRange, formatWeekRange } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StartConfigurationButton } from './start-configuration-button';
import type { PresetSummary } from './types';

/**
 * Kartu preset (C1).
 *
 * Prinsip Produk #3 — "preset dulu, kustomisasi kemudian". Angka yang
 * ditampilkan bukan angka final: rentangnya berasal dari mesin harga dengan
 * aturan harga aktif, memakai pilihan proyek bawaan (web, cloud kami,
 * sampai 10 pengguna) — persis titik awal konfigurator.
 */
export function PresetCard({
  preset,
  categorySlug,
}: {
  preset: PresetSummary;
  categorySlug: string;
}) {
  return (
    <Card
      className={cn(
        'flex h-full flex-col',
        preset.isDefault && 'border-brand/60 ring-1 ring-brand/20',
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{preset.name}</CardTitle>
          {preset.isDefault && <Badge variant="brand">Paling sering dipilih</Badge>}
        </div>
        <p className="text-sm leading-relaxed text-fg-muted">{preset.tagline}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="rounded-lg bg-surface-sunken p-3">
          <p className="text-xs text-fg-muted">Perkiraan nilai proyek</p>
          <p className="tabular mt-0.5 text-xl font-semibold tracking-[-0.02em] text-fg">
            {formatRupiahRange(preset.priceMin, preset.priceMax)}
          </p>
          <p className="mt-1 text-xs text-fg-subtle">
            {preset.featureCount} fitur tercentang ·{' '}
            {formatWeekRange(preset.durationWeeksMin, preset.durationWeeksMax)} pengerjaan
          </p>
        </div>

        <p className="text-sm leading-relaxed text-fg-muted">{preset.description}</p>

        {preset.bestFor.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              Cocok untuk
            </p>
            <ul className="flex flex-col gap-1.5">
              {preset.bestFor.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-fg-muted">
                  <CheckGlyph />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-1">
          <StartConfigurationButton
            categorySlug={categorySlug}
            presetSlug={preset.slug}
            source="preset"
            label="Mulai dari preset ini"
            variant={preset.isDefault ? 'primary' : 'secondary'}
            fullWidth
          />
          <p className="mt-2 text-xs leading-snug text-fg-subtle">
            Semua fitur masih bisa ditambah atau dikurangi di langkah berikutnya.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 size-3.5 shrink-0 text-success" fill="none" aria-hidden="true">
      <path
        d="m3.5 8.5 3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
