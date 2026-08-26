import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Kepala halaman admin yang seragam di seluruh modul. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-border bg-surface px-5 py-5 sm:px-8', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle" aria-label="Remah roti">
          {breadcrumb.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-fg">
                  {crumb.label}
                </a>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-fg">{title}</h1>
          {description && (
            <div className="mt-1 max-w-2xl text-sm leading-relaxed text-fg-muted">{description}</div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Pembungkus isi halaman admin dengan padding yang konsisten. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-6 sm:px-8', className)}>{children}</div>;
}
