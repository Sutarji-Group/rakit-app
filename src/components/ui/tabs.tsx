'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
  size = 'md',
}: {
  items: TabItem[];
  value: string;
  onChange: (next: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-border scrollbar-slim',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative -mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 font-medium transition-colors',
              size === 'sm' ? 'px-3 py-2 text-[13px]' : 'px-4 py-2.5 text-sm',
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg',
              item.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'tabular rounded px-1.5 py-0.5 text-[11px] font-semibold',
                  active ? 'bg-brand-soft text-brand-soft-fg' : 'bg-surface-sunken text-fg-subtle',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
