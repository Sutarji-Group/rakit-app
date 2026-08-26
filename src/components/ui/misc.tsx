import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

export function Separator({
  className,
  orientation = 'horizontal',
}: {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  return (
    <div
      role="separator"
      className={cn(
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface-sunken',
        className,
      )}
      {...props}
    />
  );
}

export function Progress({
  value,
  className,
  tone = 'brand',
  showLabel = false,
}: {
  value: number;
  className?: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const toneClass = {
    brand: 'bg-brand',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }[tone];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', toneClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="tabular w-9 shrink-0 text-right text-xs font-medium text-fg-muted">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="text-fg-subtle">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="font-medium text-fg">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Kartu angka untuk dashboard admin (Q). */
export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand';
  icon?: ReactNode;
  className?: string;
}) {
  const toneClass = {
    neutral: 'text-fg',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    brand: 'text-brand',
  }[tone];
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
        {icon && <span className="text-fg-subtle">{icon}</span>}
      </div>
      <p className={cn('tabular mt-2 text-2xl font-semibold tracking-[-0.02em]', toneClass)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs leading-snug text-fg-muted">{hint}</p>}
    </div>
  );
}

/** Baris keterangan label→nilai, dipakai di ringkasan & detail. */
export function DescRow({
  label,
  value,
  className,
  emphasis = false,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', className)}>
      <dt className={cn('text-sm', emphasis ? 'font-medium text-fg' : 'text-fg-muted')}>
        {label}
      </dt>
      <dd
        className={cn(
          'tabular text-right text-sm',
          emphasis ? 'font-semibold text-fg' : 'text-fg',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-inverse px-2 py-1 text-xs font-medium text-fg-inverse shadow-md group-hover/tt:block group-focus-within/tt:block"
      >
        {content}
      </span>
    </span>
  );
}
