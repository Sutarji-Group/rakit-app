import { z } from 'zod';
import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
} from '@/lib/analytics/events';
import {
  BUDGET_BANDS,
  CONSULTATION_TOPICS,
  PROJECT_DEPLOYMENTS,
  PROJECT_PLATFORMS,
  REQUEST_PRIORITIES,
  USER_TIERS,
} from '@/lib/domain/enums';

/**
 * Nomor WhatsApp Indonesia.
 *
 * Divalidasi dengan menormalkan lebih dulu, bukan mencocokkan pola penulisan.
 * Orang Indonesia menulis nomornya dalam banyak bentuk — 0812-3456-7890,
 * +62 812 3456 7890, 62812.34567890 — dan menolak salah satunya hanya karena
 * pemisahnya berbeda adalah cara termahal kehilangan lead di formulir terakhir.
 */
const whatsappSchema = z
  .string()
  .trim()
  .min(8, 'Nomor WhatsApp terlalu pendek.')
  .max(24, 'Nomor WhatsApp terlalu panjang.')
  .transform((value) => normalizeIndonesianPhone(value))
  .refine((value) => value !== null, {
    message: 'Masukkan nomor WhatsApp Indonesia yang sah, contoh 0812-3456-7890.',
  })
  .transform((value) => value!);

/**
 * Menormalkan nomor telepon Indonesia ke bentuk 08xxxxxxxxxx.
 * Mengembalikan null bila nomornya tidak masuk akal.
 */
export function normalizeIndonesianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  let local = digits;

  if (local.startsWith('+62')) local = `0${local.slice(3)}`;
  else if (local.startsWith('62')) local = `0${local.slice(2)}`;
  else if (local.startsWith('8')) local = `0${local}`;

  // Nomor seluler Indonesia: 08 diikuti 8–12 digit (total 10–14 digit).
  if (!/^08\d{8,12}$/.test(local)) return null;
  return local;
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Masukkan alamat email yang sah.')
  .max(160);

export const analyticsEventSchema = z.object({
  name: z.enum(ANALYTICS_EVENTS as unknown as [AnalyticsEventName, ...AnalyticsEventName[]]),
  sessionId: z.string().min(3).max(80),
  configurationToken: z.string().min(6).max(40).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  path: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
});

export const createConfigurationSchema = z.object({
  categorySlug: z.string().min(1).max(60),
  presetSlug: z.string().max(60).nullish(),
  wizardAnswers: z.record(z.string(), z.array(z.string())).optional(),
  trafficSource: z.string().max(120).nullish(),
});

export const updateSelectionSchema = z.object({
  featureIds: z.array(z.string().min(1)).max(300),
});

export const updateOptionsSchema = z.object({
  platform: z.enum(PROJECT_PLATFORMS).optional(),
  deployment: z.enum(PROJECT_DEPLOYMENTS).optional(),
  userTier: z.enum(USER_TIERS).optional(),
  addOnIds: z.array(z.string().min(1)).max(60).optional(),
  completed: z.boolean().optional(),
});

export const customRequestSchema = z.object({
  groupId: z.string().nullish(),
  name: z
    .string()
    .trim()
    .min(4, 'Nama fitur minimal 4 karakter.')
    .max(160, 'Nama fitur maksimal 160 karakter.'),
  problem: z
    .string()
    .trim()
    .min(20, 'Jelaskan masalahnya sedikit lebih rinci, minimal 20 karakter.')
    .max(2000),
  userRoles: z
    .string()
    .trim()
    .min(3, 'Sebutkan siapa yang akan memakai fitur ini.')
    .max(400),
  flowSteps: z
    .array(z.string().trim().max(400))
    .min(1, 'Tuliskan setidaknya satu langkah alur.')
    .max(12),
  priority: z.enum(REQUEST_PRIORITIES),
  referenceLinks: z.array(z.string().trim().url('Tautan referensi tidak sah.')).max(5).optional(),
});

export const submitConfigurationSchema = z.object({
  contactName: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(120),
  company: z.string().trim().max(160).optional(),
  email: emailSchema,
  whatsapp: whatsappSchema,
  budgetBand: z.enum(BUDGET_BANDS).optional(),
  note: z.string().trim().max(1500).optional(),
  marketingConsent: z.boolean().optional(),
  trafficSource: z.string().max(120).nullish(),
});

export const consultationSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(120),
  company: z.string().trim().max(160).optional(),
  email: emailSchema,
  whatsapp: whatsappSchema,
  topic: z.enum(CONSULTATION_TOPICS),
  message: z
    .string()
    .trim()
    .min(10, 'Ceritakan sedikit kebutuhan Anda, minimal 10 karakter.')
    .max(2000),
  configurationToken: z.string().max(40).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Kata sandi wajib diisi.').max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(120),
  email: emailSchema,
  password: z.string().min(8, 'Kata sandi minimal 8 karakter.').max(200),
  company: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(30).optional(),
  /** Token konfigurasi anonim yang akan dikaitkan ke akun baru. */
  claimToken: z.string().max(40).optional(),
});

export const heartbeatSchema = z.object({
  timeSpentSeconds: z.number().int().min(0).max(86_400),
});

export const renameSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
