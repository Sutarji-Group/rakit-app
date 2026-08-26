import { prisma } from '@/lib/db/prisma';
import { createSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, ok, readBody } from '@/lib/api/respond';
import { loginSchema } from '@/lib/api/schemas';
import { isInternal } from '@/lib/auth/session';
import { coerceEnum, USER_ROLES } from '@/lib/domain/enums';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, 'login'), 10, 300);
  if (!limit.allowed) {
    return fail(
      `Terlalu banyak percobaan masuk. Coba lagi dalam ${limit.retryAfterSeconds} detik.`,
      429,
    );
  }

  const { data, response } = await readBody(request, loginSchema);
  if (response) return response;

  const user = await prisma.user.findUnique({ where: { email: data.email } });

  // Pesan kegagalan sengaja seragam agar tidak membocorkan email mana yang terdaftar.
  const invalid = fail('Email atau kata sandi tidak cocok.', 401);
  if (!user || !user.isActive) return invalid;

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) return invalid;

  await createSession(user.id, {
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  });

  const role = coerceEnum(user.role, USER_ROLES, 'CLIENT');
  return ok({ role, redirectTo: isInternal(role) ? '/admin' : '/akun' });
}
