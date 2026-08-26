'use client';

import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { Logo } from '@/components/layout';
import { cn } from '@/lib/utils';
import type { ConfiguratorPayload } from '@/lib/services/configuration';
import type { SaveState } from '@/lib/configurator/store';

export type ConfiguratorStep = 'fitur' | 'proyek' | 'ringkasan' | 'kirim';

const STEPS: Array<{ key: ConfiguratorStep; label: string; path: string }> = [
  { key: 'fitur', label: 'Belanja Fitur', path: '' },
  { key: 'proyek', label: 'Konfigurasi Proyek', path: '/proyek' },
  { key: 'ringkasan', label: 'Ringkasan', path: '/ringkasan' },
  { key: 'kirim', label: 'Ambil Penawaran', path: '/kirim' },
];

/**
 * Kepala konfigurator dengan indikator langkah.
 *
 * Empat langkah ditampilkan sejak awal supaya klien tahu berapa lama lagi
 * prosesnya — ketidakjelasan panjang alur adalah salah satu penyebab utama
 * pengabaian keranjang (risiko R5).
 */
export function ConfiguratorHeader({
  payload,
  step,
  onShare,
  saveState,
}: {
  payload: ConfiguratorPayload;
  step: ConfiguratorStep;
  onShare?: () => void;
  saveState?: SaveState;
}) {
  const token = payload.configuration.token;
  const activeIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0" aria-label="Beranda">
          <Logo showWordmark={false} />
        </Link>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-fg">
            {payload.configuration.name}
          </p>
          <p className="truncate text-xs text-fg-subtle">
            {payload.catalog.category.name}
          </p>
        </div>

        {/* Indikator langkah — desktop */}
        <nav
          className="mx-auto hidden items-center gap-1 md:flex"
          aria-label="Tahapan merakit"
        >
          {STEPS.map((item, index) => {
            const isActive = index === activeIndex;
            const isDone = index < activeIndex;
            const href = `/rakit/${token}${item.path}`;
            const content = (
              <>
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                    isActive
                      ? 'bg-brand text-brand-fg'
                      : isDone
                        ? 'bg-success text-white'
                        : 'bg-surface-sunken text-fg-subtle',
                  )}
                >
                  {isDone ? (
                    <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden="true">
                      <path d="m3 6.2 2 2 4-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                {item.label}
              </>
            );

            return isDone ? (
              <Link
                key={item.key}
                href={href}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
              >
                {content}
              </Link>
            ) : (
              <span
                key={item.key}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
                  isActive ? 'text-brand' : 'text-fg-subtle',
                )}
              >
                {content}
              </span>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {!payload.configuration.isEditable && (
            <Badge variant="info" className="hidden sm:inline-flex">
              Sudah dikirim
            </Badge>
          )}
          {saveState === 'error' && (
            <Badge variant="danger" className="hidden sm:inline-flex">
              Gagal simpan
            </Badge>
          )}
          {onShare && (
            <Button variant="secondary" size="sm" onClick={onShare}>
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
                <path
                  d="M11 5.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM5 9.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM11 14.1a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM6.6 7.1l3-1.4M6.6 8.9l3 1.4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              <span className="hidden sm:inline">Simpan / bagikan</span>
            </Button>
          )}
        </div>
      </div>

      {/* Indikator langkah — mobile */}
      <div className="border-t border-border px-4 py-2 md:hidden">
        <div className="flex items-center gap-1.5">
          {STEPS.map((item, index) => (
            <div
              key={item.key}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                index <= activeIndex ? 'bg-brand' : 'bg-surface-sunken',
              )}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-fg-muted">
          Langkah {activeIndex + 1} dari {STEPS.length} · {STEPS[activeIndex]?.label}
        </p>
      </div>
    </header>
  );
}
