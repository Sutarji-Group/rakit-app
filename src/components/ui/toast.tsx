'use client';

import { cn } from '@/lib/utils';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback tanpa provider agar komponen tetap dapat dirender terisolasi.
    return { toast: () => '', dismiss: () => {} };
  }
  return ctx;
}

const TONE: Record<ToastTone, string> = {
  neutral: 'border-border bg-surface-raised',
  success: 'border-success/30 bg-success-soft text-success-soft-fg',
  warning: 'border-warning/35 bg-warning-soft text-warning-soft-fg',
  danger: 'border-danger/30 bg-danger-soft text-danger-soft-fg',
  brand: 'border-brand/30 bg-brand-soft text-brand-soft-fg',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (item: Omit<ToastItem, 'id'>) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-3), { ...item, id }]);
      const timer = setTimeout(() => dismiss(id), item.durationMs ?? 5000);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        role="region"
        aria-label="Notifikasi"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto animate-[slide-up_0.25s_cubic-bezier(0.16,1,0.3,1)] rounded-lg border p-3.5 shadow-lg',
              TONE[item.tone ?? 'neutral'],
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm font-semibold leading-snug">{item.title}</p>
                {item.description && (
                  <p className="text-xs leading-relaxed opacity-85">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Tutup notifikasi"
                className="-m-1 shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            {item.action && (
              <button
                type="button"
                onClick={() => {
                  item.action!.onClick();
                  dismiss(item.id);
                }}
                className="mt-2 text-xs font-semibold underline underline-offset-2"
              >
                {item.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
