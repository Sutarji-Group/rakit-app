import { SiteFooter, SiteHeader } from '@/components/layout';
import { getCurrentUser } from '@/lib/auth/session';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader isSignedIn={Boolean(user)} />
      <main id="konten-utama" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
