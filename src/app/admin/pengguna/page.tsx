import { PageBody, PageHeader } from '@/components/admin';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Stat,
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
} from '@/components/ui';
import { requireArea } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { INTERNAL_ROLES, USER_ROLES, USER_ROLE_LABEL, coerceEnum } from '@/lib/domain/enums';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { NewUserForm } from './_components/new-user-form';
import { UserRowControls } from './_components/user-row-controls';
import { ROLE_SCOPE, ROLE_VARIANT } from './_lib/shared';

export const metadata = { title: 'Pengguna' };

/**
 * Manajemen pengguna internal (modul Q).
 *
 * Hanya Super Admin yang boleh membuka papan ini: peran menentukan siapa yang
 * dapat mengubah tarif, menyetujui override harga di luar kuota (BR-16), dan
 * menerbitkan penawaran — jadi memberi peran sama artinya dengan memberi kunci
 * ke uang perusahaan.
 */
export default async function UsersPage() {
  const actor = await requireArea('users', '/admin/pengguna');

  const [users, clientCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: INTERNAL_ROLES } },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { ownedLeads: true, managedProjects: true, reviewedRequests: true },
        },
      },
    }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
  ]);

  const rows = users.map((user) => ({
    ...user,
    role: coerceEnum(user.role, USER_ROLES, 'SALES'),
  }));

  const activeCount = rows.filter((user) => user.isActive).length;
  const inactiveCount = rows.length - activeCount;
  const activeSuperAdmins = rows.filter(
    (user) => user.isActive && user.role === 'SUPER_ADMIN',
  ).length;

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Akun internal yang dapat masuk ke area admin. Peran menentukan area mana yang terbuka — termasuk siapa yang boleh mengubah tarif dan menyetujui override harga."
        actions={<NewUserForm />}
      />

      <PageBody className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Akun internal aktif"
            value={formatNumber(activeCount)}
            tone="brand"
            hint="Dapat masuk ke area admin sekarang juga."
          />
          <Stat
            label="Dinonaktifkan"
            value={formatNumber(inactiveCount)}
            hint="Riwayat pekerjaannya tetap utuh, aksesnya dicabut."
          />
          <Stat
            label="Super Admin aktif"
            value={formatNumber(activeSuperAdmins)}
            tone={activeSuperAdmins <= 1 ? 'warning' : 'neutral'}
            hint="Satu-satunya peran yang dapat membuka papan ini."
          />
          <Stat
            label="Akun klien"
            value={formatNumber(clientCount)}
            hint="Lahir sendiri dari portal klien — tidak dikelola dari sini."
          />
        </div>

        {activeSuperAdmins <= 1 && rows.length > 0 && (
          <Alert tone="warning" title="Hanya ada satu Super Admin aktif">
            Bila akun itu hilang aksesnya, tidak ada lagi yang dapat mengubah peran, menambah
            pengguna, atau menyetujui override harga di luar kuota. Angkat satu pengganti sebelum
            keadaan itu terjadi.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Daftar pengguna internal</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <EmptyState
                title="Belum ada pengguna internal"
                description="Akun tim yang dapat membuka area admin akan tampil di sini beserta perannya, kapan terakhir masuk, dan berapa banyak lead, proyek, serta review custom yang sedang ia pegang."
              />
            ) : (
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th>Pengguna</Th>
                      <Th>Peran</Th>
                      <Th className="text-right">Sedang dipegang</Th>
                      <Th>Terakhir masuk</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Ubah</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((user) => {
                      const isSelf = user.id === actor.id;
                      return (
                        <Tr key={user.id} className={user.isActive ? undefined : 'opacity-70'}>
                          <Td>
                            <div className="flex flex-col gap-0.5">
                              <span className="flex flex-wrap items-center gap-1.5 font-medium">
                                {user.name}
                                {isSelf && <Badge variant="outline">Anda</Badge>}
                              </span>
                              <span className="break-all text-xs text-fg-muted">{user.email}</span>
                              {user.phone && (
                                <span className="tabular text-xs text-fg-subtle">{user.phone}</span>
                              )}
                            </div>
                          </Td>
                          <Td>
                            <div className="flex max-w-64 flex-col gap-1">
                              <Badge variant={ROLE_VARIANT[user.role]} className="self-start">
                                {USER_ROLE_LABEL[user.role]}
                              </Badge>
                              <span className="text-xs leading-snug text-fg-subtle">
                                {ROLE_SCOPE[user.role]}
                              </span>
                            </div>
                          </Td>
                          <Td className="text-right">
                            <div className="tabular flex flex-col gap-0.5 text-xs text-fg-muted">
                              <span>{formatNumber(user._count.ownedLeads)} lead</span>
                              <span>{formatNumber(user._count.managedProjects)} proyek</span>
                              <span>{formatNumber(user._count.reviewedRequests)} review custom</span>
                            </div>
                          </Td>
                          <Td>
                            <div className="flex flex-col gap-0.5">
                              <span className="tabular text-sm">
                                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Belum pernah'}
                              </span>
                              <span className="tabular text-xs text-fg-subtle">
                                Dibuat {formatDate(user.createdAt)}
                              </span>
                            </div>
                          </Td>
                          <Td>
                            <Badge variant={user.isActive ? 'success' : 'neutral'}>
                              {user.isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </Td>
                          <Td>
                            <UserRowControls
                              userId={user.id}
                              userName={user.name}
                              role={user.role}
                              isActive={user.isActive}
                              isSelf={isSelf}
                            />
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrapper>
            )}
          </CardContent>
        </Card>

        <p className="text-xs leading-relaxed text-fg-subtle">
          Menonaktifkan akun mencabut seluruh sesinya seketika, tetapi tidak menghapus jejak
          pekerjaannya: lead, proyek, dan review custom yang pernah ia pegang tetap tercatat atas
          namanya. Karena itu akun tidak pernah dihapus dari sini, hanya dinonaktifkan.
        </p>
      </PageBody>
    </>
  );
}
