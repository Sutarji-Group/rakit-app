import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Kepala halaman seragam untuk area akun dan portal klien. */
export function PageIntro({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-soft-fg">
            {eyebrow}
          </p>
        )}
        <h1 className="text-balance text-xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-2xl">
          {title}
        </h1>
        {description && (
          <div className="mt-1.5 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
