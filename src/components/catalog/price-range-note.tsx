'use client';

import { PRICE_RANGE_EXPLAINER } from '@/lib/site';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

/**
 * Penjelas "mengapa harga berupa rentang" (PRD 6.9 — wajib ada di UI).
 *
 * Memakai <details> asli agar tetap terbuka tanpa JavaScript dan tetap bisa
 * dioperasikan dengan keyboard. Event `price_explainer_opened` dipakai untuk
 * mengukur seberapa besar keraguan klien terhadap bentuk rentang.
 */
export function PriceRangeNote({ className }: { className?: string }) {
  return (
    <details
      className={cn(
        'group rounded-xl border border-border bg-surface-sunken p-4 text-sm',
        className,
      )}
      onToggle={(event) => {
        if (event.currentTarget.open) track('price_explainer_opened', {});
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        {PRICE_RANGE_EXPLAINER.short}
        <svg
          viewBox="0 0 16 16"
          className="size-4 shrink-0 text-fg-muted transition-transform group-open:rotate-180"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <p className="mt-3 leading-relaxed text-fg-muted">{PRICE_RANGE_EXPLAINER.body}</p>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {PRICE_RANGE_EXPLAINER.detail.map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-surface p-3">
            <dt className="text-xs font-semibold text-fg">{item.title}</dt>
            <dd className="mt-1 text-xs leading-relaxed text-fg-muted">{item.body}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
