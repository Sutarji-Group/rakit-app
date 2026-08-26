import 'server-only';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { INTERNAL_ROLES, coerceEnum, USER_ROLES, type UserRole } from '@/lib/domain/enums';

export const SESSION_COOKIE = 'rakit_session';
const SESSION_DAYS = 14;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error(
      'AUTH_SECRET belum diatur atau terlalu pendek. Isi minimal 24 karakter di berkas .env.',
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  sessionId: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.sessionId !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : '',
      role: coerceEnum(payload.role as string, USER_ROLES, 'CLIENT'),
      sessionId: payload.sessionId,
    };
  } catch {
    return null;
  }
}

/**
 * Membuat sesi baru: baris Session di database (agar dapat dicabut) plus
 * cookie httpOnly berisi JWT.
 */
export async function createSession(
  userId: string,
  meta: { userAgent?: string; ipAddress?: string } = {},
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  const record = await prisma.session.create({
    data: {
      userId,
      token: crypto.randomUUID(),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: coerceEnum(user.role, USER_ROLES, 'CLIENT'),
    sessionId: record.id,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await prisma.session.deleteMany({ where: { id: payload.sessionId } });
    }
  }
  store.delete(SESSION_COOKIE);
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company: string | null;
  phone: string | null;
}

/**
 * Membaca pengguna aktif dari cookie.
 *
 * JWT diverifikasi lebih dulu (murah), lalu baris Session dicek agar sesi yang
 * sudah dicabut tidak lagi berlaku meski tokennya belum kedaluwarsa.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: coerceEnum(session.user.role, USER_ROLES, 'CLIENT'),
    company: session.user.company,
    phone: session.user.phone,
  };
}

export function isInternal(role: UserRole): boolean {
  return INTERNAL_ROLES.includes(role);
}

/** Peta hak akses per area admin. */
export const ADMIN_PERMISSIONS = {
  catalog: ['SUPER_ADMIN', 'CATALOG_ADMIN'] as UserRole[],
  pricing: ['SUPER_ADMIN', 'CATALOG_ADMIN'] as UserRole[],
  customQueue: ['SUPER_ADMIN', 'CONSULTANT', 'CATALOG_ADMIN'] as UserRole[],
  leads: ['SUPER_ADMIN', 'SALES', 'CONSULTANT'] as UserRole[],
  projects: ['SUPER_ADMIN', 'PM', 'CONSULTANT'] as UserRole[],
  analytics: ['SUPER_ADMIN', 'CATALOG_ADMIN', 'SALES', 'CONSULTANT', 'PM'] as UserRole[],
  users: ['SUPER_ADMIN'] as UserRole[],
  /** Persetujuan override harga di luar kuota (BR-16). */
  approveOverride: ['SUPER_ADMIN', 'CONSULTANT'] as UserRole[],
} as const;

export type AdminArea = keyof typeof ADMIN_PERMISSIONS;

export function can(role: UserRole, area: AdminArea): boolean {
  return ADMIN_PERMISSIONS[area].includes(role);
}
