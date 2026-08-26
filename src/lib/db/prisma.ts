import { PrismaClient } from '@/generated/prisma';

/**
 * Singleton Prisma Client.
 *
 * Dua alasan, keduanya berujung pada kehabisan koneksi Postgres:
 *
 * 1. Pengembangan — Next.js melakukan hot-reload modul, dan tanpa cache global
 *    setiap reload membuat pool koneksi baru sementara yang lama masih hidup.
 * 2. Produksi serverless — satu instance lambda melayani banyak permintaan
 *    berturut-turut; client harus dipakai ulang, bukan dibuat per permintaan.
 *
 * Cache-nya global tanpa syarat lingkungan: membedakan keduanya tidak membawa
 * manfaat, sementara lupa mencakup salah satunya berakibat sama.
 *
 * Jumlah koneksi per instance diatur lewat `connection_limit` pada
 * DATABASE_URL, bukan di sini — lihat .env.example.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

globalForPrisma.prisma = prisma;
