import { ClientAreaShell } from '@/components/portal/client-area-shell';

export const metadata = { title: 'Portal proyek', robots: { index: false, follow: false } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <ClientAreaShell>{children}</ClientAreaShell>;
}
