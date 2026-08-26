'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { site } from '@/lib/site';
import { Logo } from './logo';

const NAV = [
  { href: '/aplikasi', label: 'Katalog Aplikasi' },
  { href: '/cara-kerja', label: 'Cara Kerja' },
  { href: '/harga', label: 'Harga' },
  { href: '/konsultasi', label: 'Konsultasi' },
];

export function SiteHeader({ isSignedIn = false }: { isSignedIn?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={site.name}>
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Navigasi utama">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'text-brand'
                  : 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href={isSignedIn ? '/akun' : '/masuk'}>{isSignedIn ? 'Akun saya' : 'Masuk'}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/aplikasi">Mulai Rakit</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Buka menu"
          className="ml-auto rounded-md p-2 text-fg-muted hover:bg-surface-sunken md:hidden"
        >
          <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
            {open ? (
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3" aria-label="Navigasi seluler">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              <Button asChild variant="secondary" size="sm" className="flex-1">
                <Link href={isSignedIn ? '/akun' : '/masuk'}>{isSignedIn ? 'Akun saya' : 'Masuk'}</Link>
              </Button>
              <Button asChild size="sm" className="flex-1">
                <Link href="/aplikasi">Mulai Rakit</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
