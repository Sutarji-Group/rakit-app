'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireArea } from '@/lib/auth/guards';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/prisma';
import { INTERNAL_ROLES, USER_ROLES, USER_ROLE_LABEL, type UserRole } from '@/lib/domain/enums';
import {
  actionFail,
  actionOk,
  type CreateInternalUserInput,
  type UserActionResult,
} from './_lib/shared';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.'),
  email: z.string().trim().min(1, 'Email wajib diisi.').regex(EMAIL_PATTERN, 'Format email tidak sah.'),
  role: z.enum(USER_ROLES),
  password: z.string().min(1, 'Kata sandi awal wajib diisi.'),
  phone: z.string().trim().max(30, 'Nomor telepon terlalu panjang.').optional(),
});

function refreshBoards(): void {
  revalidatePath('/admin/pengguna');
  // Dashboard menampilkan antrean yang bergantung pada siapa saja yang aktif.
  revalidatePath('/admin');
}

/** Menghitung Super Admin aktif selain satu pengguna tertentu (penjaga kunci). */
async function otherActiveSuperAdmins(exceptId: string): Promise<number> {
  return prisma.user.count({
    where: { role: 'SUPER_ADMIN', isActive: true, id: { not: exceptId } },
  });
}

/**
 * Menambah pengguna internal baru.
 *
 * Kata sandi awal di-hash sebelum menyentuh basis data dan tidak pernah
 * dikembalikan ke pemanggil — yang menambahkan akun bertugas menyampaikannya
 * lewat kanal terpisah, lalu pemiliknya menggantinya sendiri.
 */
export async function createInternalUser(
  input: CreateInternalUserInput,
): Promise<UserActionResult> {
  await requireArea('users', '/admin/pengguna');

  const parsed = createSchema.safeParse({ ...input, email: input.email.trim().toLowerCase() });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return actionFail(issue?.message ?? 'Data tidak sah.', {
      [String(issue?.path[0] ?? 'name')]: issue?.message ?? 'Data tidak sah.',
    });
  }

  const { name, email, role, password, phone } = parsed.data;

  if (!INTERNAL_ROLES.includes(role)) {
    return actionFail('Akun klien tidak dibuat dari papan ini.', {
      role: 'Pilih salah satu peran internal.',
    });
  }

  const passwordProblem = validatePassword(password);
  if (passwordProblem) return actionFail(passwordProblem, { password: passwordProblem });

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return actionFail('Email itu sudah terpakai.', {
      email: 'Sudah ada akun dengan email ini.',
    });
  }

  await prisma.user.create({
    data: {
      name,
      email,
      role,
      phone: phone && phone.length > 0 ? phone : null,
      passwordHash: await hashPassword(password),
      isActive: true,
    },
  });

  refreshBoards();

  return actionOk(`Akun ${name} dibuat sebagai ${USER_ROLE_LABEL[role]}.`);
}

const roleSchema = z.object({
  id: z.string().trim().min(1, 'Pengguna tidak dikenali.'),
  role: z.enum(USER_ROLES),
});

/**
 * Mengubah peran satu pengguna internal.
 *
 * Dua pintu ditutup di sini: seseorang tidak boleh mengubah peran dirinya
 * sendiri, dan Super Admin aktif terakhir tidak boleh diturunkan. Keduanya
 * mencegah satu klik menutup pintu manajemen pengguna untuk selamanya.
 */
export async function setUserRole(id: string, role: UserRole): Promise<UserActionResult> {
  const actor = await requireArea('users', '/admin/pengguna');

  const parsed = roleSchema.safeParse({ id, role });
  if (!parsed.success) {
    return actionFail(parsed.error.issues[0]?.message ?? 'Data tidak sah.');
  }

  if (parsed.data.id === actor.id) {
    return actionFail('Peran akun sendiri tidak dapat diubah dari sini.');
  }

  if (!INTERNAL_ROLES.includes(parsed.data.role)) {
    return actionFail('Peran itu bukan peran internal.');
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!target) return actionFail('Pengguna tidak ditemukan.');

  if (target.role === 'CLIENT') {
    return actionFail('Akun klien dikelola dari portal klien, bukan dari papan ini.');
  }

  if (target.role === parsed.data.role) {
    return actionFail(`${target.name} sudah berperan ${USER_ROLE_LABEL[parsed.data.role]}.`);
  }

  if (
    target.role === 'SUPER_ADMIN' &&
    target.isActive &&
    (await otherActiveSuperAdmins(target.id)) === 0
  ) {
    return actionFail('Ini Super Admin aktif terakhir — angkat penggantinya lebih dulu.');
  }

  await prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role } });

  refreshBoards();

  return actionOk(`${target.name} kini berperan ${USER_ROLE_LABEL[parsed.data.role]}.`);
}

const activeSchema = z.object({
  id: z.string().trim().min(1, 'Pengguna tidak dikenali.'),
  isActive: z.boolean(),
});

/**
 * Mengaktifkan atau menonaktifkan satu akun internal.
 *
 * Saat dinonaktifkan, seluruh sesi miliknya ikut dihapus. Sesi yang tertinggal
 * memang sudah ditolak saat dibaca, tetapi menghapusnya membuat pencabutan akses
 * berlaku seketika dan meninggalkan jejak yang jelas.
 */
export async function setUserActive(id: string, isActive: boolean): Promise<UserActionResult> {
  const actor = await requireArea('users', '/admin/pengguna');

  const parsed = activeSchema.safeParse({ id, isActive });
  if (!parsed.success) {
    return actionFail(parsed.error.issues[0]?.message ?? 'Data tidak sah.');
  }

  if (parsed.data.id === actor.id) {
    return actionFail('Akun sendiri tidak dapat dinonaktifkan dari sini.');
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!target) return actionFail('Pengguna tidak ditemukan.');

  if (target.role === 'CLIENT') {
    return actionFail('Akun klien dikelola dari portal klien, bukan dari papan ini.');
  }

  if (target.isActive === parsed.data.isActive) {
    return actionFail(
      parsed.data.isActive ? `${target.name} memang sudah aktif.` : `${target.name} memang sudah nonaktif.`,
    );
  }

  if (
    !parsed.data.isActive &&
    target.role === 'SUPER_ADMIN' &&
    (await otherActiveSuperAdmins(target.id)) === 0
  ) {
    return actionFail('Ini Super Admin aktif terakhir — angkat penggantinya lebih dulu.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { isActive: parsed.data.isActive } });
    if (!parsed.data.isActive) {
      await tx.session.deleteMany({ where: { userId: target.id } });
    }
  });

  refreshBoards();

  return actionOk(
    parsed.data.isActive
      ? `${target.name} diaktifkan kembali.`
      : `${target.name} dinonaktifkan dan seluruh sesinya dicabut.`,
  );
}
