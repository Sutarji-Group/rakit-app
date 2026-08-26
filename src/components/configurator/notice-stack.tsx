'use client';

import { cn } from '@/lib/utils';
import type { Notice } from '@/lib/configurator/store';

const TONE: Record<Notice['kind'], string> = {
  ADDED: 'border-info/25 bg-info-soft text-info-soft-fg',
  REMOVED: 'border-warning/30 bg-warning-soft text-warning-soft-fg',
  BLOCKED: 'border-border bg-surface-sunken text-fg-muted',
  INFO: 'border-brand/25 bg-brand-soft text-brand-soft-fg',
};

/**
 * Tumpukan penjelasan tindakan otomatis mesin dependensi (C3.1, C3.2).
 *
 * Setiap penambahan atau pelepasan otomatis selalu disertai kalimat yang
 * menjelaskan sebabnya. Keranjang yang berubah sendiri tanpa penjelasan adalah
 * cara tercepat menghilangkan kepercayaan pada estimasi yang ditampilkan.
 */
export function NoticeStack({
  notices,
  onDismiss,
  className,
}: {
  notices: Notice[];
  onDismiss: (id: string) => void;
  className?: string;
}) {
  if (notices.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)} aria-live="polite">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className={cn(
            'flex animate-[slide-up_0.2s_cubic-bezier(0.16,1,0.3,1)] items-start gap-2.5 rounded-lg border px-3 py-2.5',
            TONE[notice.kind],
          )}
        >
          <Glyph kind={notice.kind} />
          <p className="flex-1 text-xs leading-relaxed">{notice.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(notice.id)}
            aria-label="Tutup pemberitahuan"
            className="-m-1 shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
          >
            <svg viewBox="0 0 12 12" className="size-3" fill="none" aria-hidden="true">
              <path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function Glyph({ kind }: { kind: Notice['kind'] }) {
  const path = {
    ADDED: 'M6 2.5v7M2.5 6h7',
    REMOVED: 'M2.5 6h7',
    BLOCKED: 'M6 2.5v4M6 8.8v.4',
    INFO: 'M6 5.4v4M6 3v.4',
  }[kind];

  return (
    <svg viewBox="0 0 12 12" className="mt-0.5 size-3.5 shrink-0" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" opacity="0.4" />
      <path d={path} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
