import { ClientAreaShell } from '@/components/portal/client-area-shell';

export const metadata = { title: 'Akun saya', robots: { index: false, follow: false } };

export default function AkunLayout({ children }: { children: React.ReactNode }) {
  return <ClientAreaShell>{children}</ClientAreaShell>;
}
