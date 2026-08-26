'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { USER_ROLE_LABEL, type UserRole } from '@/lib/domain/enums';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  section: string;
}

/** Struktur navigasi admin mengikuti pembagian modul PRD bagian 8. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'gauge', section: 'Ringkasan' },
  { href: '/admin/analitik', label: 'Analitik', icon: 'chart', section: 'Ringkasan' },

  { href: '/admin/pipeline', label: 'Pipeline Lead', icon: 'kanban', section: 'Penjualan' },
  { href: '/admin/custom', label: 'Antrean Fitur Custom', icon: 'inbox', section: 'Penjualan' },
  { href: '/admin/konsultasi', label: 'Permintaan Konsultasi', icon: 'headset', section: 'Penjualan' },

  { href: '/admin/katalog', label: 'Kategori & Fitur', icon: 'layers', section: 'Katalog' },
  { href: '/admin/katalog/preset', label: 'Preset', icon: 'package', section: 'Katalog' },
  { href: '/admin/katalog/wizard', label: 'Aturan Wizard', icon: 'wand', section: 'Katalog' },

  { href: '/admin/harga', label: 'Mesin Harga', icon: 'calculator', section: 'Harga' },
  { href: '/admin/harga/simulator', label: 'Simulator Harga', icon: 'flask', section: 'Harga' },
  { href: '/admin/harga/addon', label: 'Add-on', icon: 'puzzle', section: 'Harga' },
  { href: '/admin/harga/kalibrasi', label: 'Laporan Kalibrasi', icon: 'target', section: 'Harga' },

  { href: '/admin/proyek', label: 'Proyek & Milestone', icon: 'briefcase', section: 'Delivery' },
  { href: '/admin/kontrak', label: 'Kontrak Digital', icon: 'contract', section: 'Delivery' },
  { href: '/admin/tagihan', label: 'Tagihan & Pembayaran', icon: 'receipt', section: 'Delivery' },

  { href: '/admin/pengguna', label: 'Pengguna', icon: 'users', section: 'Sistem' },
];

const SECTIONS = ['Ringkasan', 'Penjualan', 'Katalog', 'Harga', 'Delivery', 'Sistem'];

export function AdminShell({
  user,
  badges,
  children,
}: {
  user: { name: string; role: UserRole; email: string };
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-5 p-3" aria-label="Navigasi admin">
      {SECTIONS.map((section) => {
        const items = ADMIN_NAV.filter((item) => item.section === section);
        if (items.length === 0) return null;
        return (
          <div key={section} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
              {section}
            </p>
            {items.map((item) => {
              const badge = badges?.[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-brand-soft text-brand-soft-fg'
                      : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
                  )}
                >
                  <NavIcon name={item.icon} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge != null && badge > 0 && (
                    <span className="tabular rounded bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
            <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
              Admin
            </span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-slim">{nav}</div>
        <UserBox user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu admin"
            className="rounded-md p-2 text-fg-muted hover:bg-surface-sunken"
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <Logo />
        </header>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} aria-hidden="true" />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-surface">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup menu"
                  className="rounded-md p-1 text-fg-subtle hover:bg-surface-sunken"
                >
                  <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                    <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-slim">{nav}</div>
              <UserBox user={user} />
            </aside>
          </div>
        )}

        <main id="konten-utama" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function UserBox({ user }: { user: { name: string; role: UserRole; email: string } }) {
  return (
    <div className="shrink-0 border-t border-border p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-fg">
          {user.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{user.name}</p>
          <p className="truncate text-xs text-fg-subtle">{USER_ROLE_LABEL[user.role]}</p>
        </div>
      </div>
      <form action="/api/auth/logout" method="post" className="mt-1">
        <button
          type="submit"
          formAction="/keluar"
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
        >
          Keluar
        </button>
      </form>
    </div>
  );
}

/** Ikon inline agar tidak menambah beban bundel dari pustaka ikon. */
function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    gauge: <path d="M10 3a7 7 0 0 0-6.1 10.4M10 3a7 7 0 0 1 6.1 10.4M10 10l3-3" />,
    chart: <path d="M3 16V8M7.7 16V4M12.3 16v-6M17 16v-9" />,
    kanban: <path d="M3.5 3.5h4v9h-4zM8.5 3.5h3v13h-3zM12.5 3.5h4v6h-4z" />,
    inbox: <path d="M3 10.5V5.5a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 17 5.5v5m-14 0h3.5l1 2h3l1-2H17m-14 0v4A1.5 1.5 0 0 0 4.5 16h11a1.5 1.5 0 0 0 1.5-1.5v-4" />,
    headset: <path d="M4 11V9.5a6 6 0 0 1 12 0V11M4 11v3h2v-3zm12 0v3h-2v-3zM16 14v.5a2 2 0 0 1-2 2h-2" />,
    layers: <path d="m10 3 7 3.5-7 3.5-7-3.5zM3 10.5 10 14l7-3.5" />,
    package: <path d="M10 3 3.5 6v8L10 17l6.5-3V6zM3.5 6 10 9.5 16.5 6M10 9.5V17" />,
    wand: <path d="m4 16 9-9M12 3l.7 1.8L14.5 5.5l-1.8.7L12 8l-.7-1.8L9.5 5.5l1.8-.7zM16 10l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" />,
    calculator: <path d="M5 3h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM6.5 6.5h7M6.5 10h1.5M9.5 10H11M12.5 10H14M6.5 13H8M9.5 13H11M12.5 13H14" />,
    flask: <path d="M8 3v4.5L4 15a1.5 1.5 0 0 0 1.3 2.2h9.4A1.5 1.5 0 0 0 16 15l-4-7.5V3M7 3h6M5.6 12h8.8" />,
    puzzle: <path d="M7.5 3.5h2a1.5 1.5 0 0 1 0 3h-2v3h-3a1.5 1.5 0 0 0 0 3h3v3h5v-3h3v-9h-8z" />,
    target: <path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 9v2" />,
    briefcase: <path d="M4 6.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM7.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M3 10.5h14" />,
    contract: <path d="M5.5 2.5h6L16 7v10.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1zM11 2.5V7h4.5M7 10.5h6M7 13.5h4" />,
    receipt: <path d="M5 2.5h10v15l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V2.5zM7.5 6.5h5M7.5 9.5h5M7.5 12.5h3" />,
    users: <path d="M7.5 9.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5zM2.5 16.5c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2M13 4.4a2.75 2.75 0 0 1 0 5.2M14.5 12.6c1.8.5 3 1.9 3 3.9" />,
  };
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.gauge}
    </svg>
  );
}
