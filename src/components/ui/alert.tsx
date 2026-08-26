import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'brand' | 'neutral';

const TONE: Record<AlertTone, string> = {
  info: 'bg-info-soft text-info-soft-fg border-info/25',
  success: 'bg-success-soft text-success-soft-fg border-success/25',
  warning: 'bg-warning-soft text-warning-soft-fg border-warning/30',
  danger: 'bg-danger-soft text-danger-soft-fg border-danger/25',
  brand: 'bg-brand-soft text-brand-soft-fg border-brand/25',
  neutral: 'bg-surface-sunken text-fg-muted border-border',
};

export function Alert({
  tone = 'info',
  title,
  icon,
  action,
  className,
  children,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn('flex gap-3 rounded-lg border p-3.5 text-sm', TONE[tone], className)}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
