import { PrismaClient } from '@/generated/prisma';

/**
 * Singleton Prisma Client.
 *
 * Next.js melakukan hot-reload modul di mode pengembangan; tanpa cache global,
 * setiap reload akan membuat koneksi baru sampai batas koneksi habis.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
