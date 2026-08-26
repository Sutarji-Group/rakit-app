import { prisma } from '@/lib/db/prisma';
import { AdminShell } from '@/components/layout';
import { requireInternal } from '@/lib/auth/guards';

export const metadata = { title: 'Admin' };

/**
 * Kerangka area admin.
 *
 * Lencana pada navigasi dihitung di sini agar setiap halaman admin tidak
 * perlu mengulang kueri yang sama: antrean fitur custom yang menunggu,
 * konsultasi baru, dan lead baru yang belum ditangani.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireInternal('/admin');

  const [pendingCustom, newConsultations, newLeads] = await Promise.all([
    prisma.customFeatureRequest.count({
      where: { status: { in: ['PENDING', 'IN_REVIEW', 'NEEDS_CLARIFICATION'] } },
    }),
    prisma.consultationRequest.count({ where: { status: 'NEW' } }),
    prisma.lead.count({ where: { stage: 'NEW' } }),
  ]);

  return (
    <AdminShell
      user={{ name: user.name, role: user.role, email: user.email }}
      badges={{
        '/admin/custom': pendingCustom,
        '/admin/konsultasi': newConsultations,
        '/admin/pipeline': newLeads,
      }}
    >
      {children}
    </AdminShell>
  );
}
