import Link from 'next/link';

import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface AttentionItem {
  key: string;
  count: number;
  label: string;
  description: string;
  href: string;
  /** Nada dipakai hanya bila count > 0. */
  tone: 'danger' | 'warning' | 'brand';
}

const COUNT_CLASS: Record<AttentionItem['tone'], string> = {
  danger: 'bg-danger-soft text-danger-soft-fg',
  warning: 'bg-warning-soft text-warning-soft-fg',
  brand: 'bg-brand-soft text-brand-soft-fg',
};

/**
 * Daftar pekerjaan yang menunggu keputusan manusia hari ini.
 *
 * Baris bernilai nol sengaja tetap ditampilkan dalam keadaan redup: papan ini
 * berfungsi sebagai daftar periksa harian, dan "sudah dicek, memang kosong"
 * adalah informasi yang berbeda dari "tidak pernah muncul di layar".
 */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  const ordered = [...items].sort((a, b) => Number(b.count > 0) - Number(a.count > 0));

  return (
    <ul className="flex flex-col gap-2">
      {ordered.map((item) => {
        const active = item.count > 0;
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-colors',
                active
                  ? 'border-border hover:border-border-strong hover:bg-surface-sunken/50'
                  : 'border-border/70 hover:bg-surface-sunken/40',
              )}
            >
              <span
                className={cn(
                  'tabular flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                  active ? COUNT_CLASS[item.tone] : 'bg-surface-sunken text-fg-subtle',
                )}
              >
                {formatNumber(item.count)}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    active ? 'text-fg' : 'text-fg-muted',
                  )}
                >
                  {item.label}
                </span>
                <span className="block text-xs leading-snug text-fg-subtle">
                  {active ? item.description : 'Bersih — tidak ada yang menunggu.'}
                </span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-fg-subtle">
                &rarr;
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
