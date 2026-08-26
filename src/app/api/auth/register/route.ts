import { prisma } from '@/lib/db/prisma';
import { createSession } from '@/lib/auth/session';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { clientKey, rateLimit } from '@/lib/api/rate-limit';
import { fail, ok, readBody } from '@/lib/api/respond';
import { registerSchema } from '@/lib/api/schemas';

export const runtime = 'nodejs';

/**
 * Pendaftaran akun klien (G1).
 *
 * Bila pengguna sudah merakit konfigurasi secara anonim, token rakitan tersebut
 * ikut dikaitkan ke akun baru sehingga progresnya tidak hilang.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, 'register'), 5, 600);
  if (!limit.allowed) return fail('Terlalu banyak pendaftaran dari perangkat ini.', 429);

  const { data, response } = await readBody(request, registerSchema);
  if (response) return response;

  const passwordIssue = validatePassword(data.password);
  if (passwordIssue) {
    return fail('Kata sandi belum memenuhi syarat.', 422, {
      fields: { password: passwordIssue },
    });
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return fail('Email ini sudah terdaftar.', 409, {
      fields: { email: 'Email ini sudah terdaftar. Silakan masuk.' },
    });
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      company: data.company ?? null,
      phone: data.phone ?? null,
      role: 'CLIENT',
      passwordHash: await hashPassword(data.password),
    },
  });

  if (data.claimToken) {
    await prisma.configuration.updateMany({
      where: { publicToken: data.claimToken, ownerId: null },
      data: { ownerId: user.id },
    });
  }

  await createSession(user.id, {
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  return ok({ redirectTo: '/akun' }, { status: 201 });
}
