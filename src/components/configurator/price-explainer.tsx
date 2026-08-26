'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui';
import { PRICE_RANGE_EXPLAINER } from '@/lib/site';
import { track } from '@/lib/analytics/track';
import { cn } from '@/lib/utils';

/**
 * Penjelas mengapa harga berupa rentang (C4.4, PRD 6.9).
 *
 * PRD menyebutnya wajib ada: tanpa penjelasan, rentang terbaca sebagai keraguan
 * — persis kebalikan dari kesan yang ingin dibangun produk ini.
 */
export function PriceExplainer({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          track('price_explainer_opened', {});
        }}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-2 hover:underline',
          className,
        )}
      >
        <svg viewBox="0 0 14 14" className="size-3.5" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.6 5.4a1.5 1.5 0 1 1 1.9 1.7v.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="7" cy="10" r="0.7" fill="currentColor" />
        </svg>
        {PRICE_RANGE_EXPLAINER.short}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={PRICE_RANGE_EXPLAINER.short}
        description={PRICE_RANGE_EXPLAINER.body}
      >
        <div className="flex flex-col gap-4">
          {PRICE_RANGE_EXPLAINER.detail.map((item, index) => (
            <div key={item.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-fg">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-fg">{item.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{item.body}</p>
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-border bg-surface-sunken/60 p-3.5">
            <p className="text-sm leading-relaxed text-fg-muted">
              Kami memilih menampilkan rentang yang jujur daripada satu angka pasti yang belum bisa
              kami pertanggungjawabkan. Selisih rentang adalah cadangan risiko untuk penyesuaian
              yang mungkin dibutuhkan — bukan ruang tawar-menawar yang sengaja kami sisakan.
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}
