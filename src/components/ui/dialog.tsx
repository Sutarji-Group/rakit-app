'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: ReactNode;
  className?: string;
  /** Menonaktifkan penutupan lewat backdrop — untuk konfirmasi yang wajib dijawab. */
  dismissible?: boolean;
}

const SIZE = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Modal berbasis elemen <dialog> native.
 *
 * Elemen native memberi jebakan fokus, penutupan lewat Escape, dan semantik
 * aria secara gratis — penting untuk kepatuhan WCAG 2.1 AA pada alur
 * konfigurator.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
  className,
  dismissible = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      document.body.style.overflow = 'hidden';
    } else if (!open && node.open) {
      node.close();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (dismissible) onClose();
    };
    node.addEventListener('cancel', handleCancel);
    return () => node.removeEventListener('cancel', handleCancel);
  }, [onClose, dismissible]);

  return (
    <dialog
      ref={ref}
      onClick={(event) => {
        if (!dismissible) return;
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-0 text-fg shadow-xl',
        'backdrop:bg-black/45 backdrop:backdrop-blur-[2px]',
        'open:animate-[scale-in_0.15s_cubic-bezier(0.16,1,0.3,1)]',
        SIZE[size],
        className,
      )}
    >
      {(title || description) && (
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex flex-col gap-1">
            {title && (
              <h2 className="text-base font-semibold leading-tight tracking-[-0.01em]">{title}</h2>
            )}
            {description && (
              <p className="text-sm leading-relaxed text-fg-muted">{description}</p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-m-1 shrink-0 rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                <path
                  d="m4 4 8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}
      {children && <div className="max-h-[70vh] overflow-y-auto p-5 scrollbar-slim">{children}</div>}
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-sunken/50 p-4">
          {footer}
        </div>
      )}
    </dialog>
  );
}

/**
 * Panel bawah yang dapat ditarik — bentuk ringkasan keranjang di mobile (C1.3).
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-black/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Panel'}
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[85vh] animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)]',
          'overflow-y-auto rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-xl scrollbar-slim',
          className,
        )}
      >
        <div className="sticky top-0 z-10 flex flex-col items-center gap-3 border-b border-border bg-surface px-4 pb-3 pt-3">
          <span className="h-1 w-10 rounded-full bg-border-strong" aria-hidden="true" />
          <div className="flex w-full items-center justify-between gap-3">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="ml-auto rounded-md p-1 text-fg-subtle hover:bg-surface-sunken hover:text-fg"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                <path
                  d="m4 4 8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
