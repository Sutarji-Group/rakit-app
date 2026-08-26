import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '@/components/layout';
import { AccountNav } from './account-nav';

/**
 * Kerangka area milik klien (akun + portal).
 *
 * Memakai header dan footer publik yang sama, bukan kerangka admin: klien
 * tetap berada di situs yang sama dan tetap bisa kembali ke katalog kapan pun.
 */
export function ClientAreaShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader isSignedIn />
      <main id="konten-utama" className="flex-1 bg-surface-sunken/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <AccountNav />
          <div className="mt-6 sm:mt-8">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
