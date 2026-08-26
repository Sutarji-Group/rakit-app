import { cn } from '@/lib/utils';
import { FEATURE_TYPE_LABEL, type FeatureType } from '@/lib/domain/enums';
import type { HTMLAttributes } from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'brand'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-sunken text-fg-muted border-border',
  brand: 'bg-brand-soft text-brand-soft-fg border-transparent',
  accent: 'bg-accent-soft text-accent-soft-fg border-transparent',
  success: 'bg-success-soft text-success-soft-fg border-transparent',
  warning: 'bg-warning-soft text-warning-soft-fg border-transparent',
  danger: 'bg-danger-soft text-danger-soft-fg border-transparent',
  info: 'bg-info-soft text-info-soft-fg border-transparent',
  outline: 'bg-transparent text-fg-muted border-border-strong',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'neutral', size = 'sm', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium leading-none',
        size === 'sm' ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1.5 text-xs',
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}

const TYPE_STYLE: Record<FeatureType, string> = {
  CORE: 'bg-type-core-soft text-type-core border-transparent',
  STANDARD: 'bg-type-standard-soft text-type-standard border-transparent',
  CONFIGURABLE: 'bg-type-configurable-soft text-type-configurable border-transparent',
  CUSTOM: 'bg-type-custom-soft text-type-custom border-transparent',
};

/** Badge tipe fitur dengan label bahasa klien (C2.3). */
export function FeatureTypeBadge({
  type,
  className,
  size = 'sm',
}: {
  type: FeatureType;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium leading-none',
        size === 'sm' ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1.5 text-xs',
        TYPE_STYLE[type],
        className,
      )}
    >
      {type === 'CORE' && <LockGlyph />}
      {FEATURE_TYPE_LABEL[type]}
    </span>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden="true">
      <rect x="2.5" y="5" width="7" height="5.5" rx="1.2" fill="currentColor" />
      <path
        d="M4 5V3.75a2 2 0 0 1 4 0V5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
