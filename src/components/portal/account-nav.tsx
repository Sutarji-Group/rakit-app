'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/akun', label: 'Rakitan saya' },
  { href: '/portal', label: 'Proyek saya' },
];

/**
 * Navigasi antar dua ruang milik klien: rakitan yang masih dipertimbangkan
 * (/akun) dan proyek yang sudah berjalan (/portal). Dipisah karena keduanya
 * menjawab pertanyaan yang berbeda — "berapa harganya" versus "sampai mana".
 */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border scrollbar-slim"
      aria-label="Navigasi akun"
    >
      {ITEMS.map((item) => {
        const active =
          item.href === '/akun' ? pathname.startsWith('/akun') : pathname.startsWith('/portal');
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
