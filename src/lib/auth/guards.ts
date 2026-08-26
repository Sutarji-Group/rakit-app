import 'server-only';

import { redirect } from 'next/navigation';
import { can, getCurrentUser, isInternal, type AdminArea, type CurrentUser } from './session';

/** Memaksa pengguna sudah masuk; bila belum, arahkan ke halaman masuk. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = returnTo ? `?lanjut=${encodeURIComponent(returnTo)}` : '';
    redirect(`/masuk${target}`);
  }
  return user;
}

/** Memaksa pengguna internal (bukan klien). */
export async function requireInternal(returnTo?: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!isInternal(user.role)) redirect('/akun');
  return user;
}

/** Memaksa hak akses pada satu area admin. */
export async function requireArea(area: AdminArea, returnTo?: string): Promise<CurrentUser> {
  const user = await requireInternal(returnTo);
  if (!can(user.role, area)) redirect('/admin?akses=ditolak');
  return user;
}
