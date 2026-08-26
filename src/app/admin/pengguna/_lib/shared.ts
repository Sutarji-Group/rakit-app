/**
 * Helper murni manajemen pengguna internal (modul Q).
 *
 * Tanpa 'server-only' maupun 'use client': halaman (Server Component), Server
 * Action, dan kontrol barisnya (Client Component) memakai daftar peran serta
 * bentuk balasan yang sama persis.
 */

import type { BadgeVariant } from '@/components/ui';
import { INTERNAL_ROLES, type UserRole } from '@/lib/domain/enums';

/**
 * Bentuk balasan seragam untuk seluruh Server Action modul ini.
 *
 * Penolakan aturan (mis. mencabut Super Admin terakhir) dikembalikan sebagai
 * data biasa, bukan exception, supaya form dapat menampilkan alasannya tanpa
 * membuang isian yang sudah diketik.
 */
export interface UserActionResult {
  ok: boolean;
  message: string;
  /** Pesan error per nama kolom form. */
  fieldErrors?: Record<string, string>;
}

export function actionOk(message: string): UserActionResult {
  return { ok: true, message };
}

export function actionFail(
  message: string,
  fieldErrors?: Record<string, string>,
): UserActionResult {
  return { ok: false, message, fieldErrors };
}

/** Isian form penambahan pengguna internal. */
export interface CreateInternalUserInput {
  name: string;
  email: string;
  role: string;
  password: string;
  phone?: string;
}

/** Peran yang boleh diberikan dari papan ini — akun klien lahir dari portal. */
export const ASSIGNABLE_ROLES: UserRole[] = INTERNAL_ROLES;

export const ROLE_VARIANT: Record<UserRole, BadgeVariant> = {
  SUPER_ADMIN: 'danger',
  CATALOG_ADMIN: 'brand',
  CONSULTANT: 'accent',
  SALES: 'info',
  PM: 'success',
  CLIENT: 'neutral',
};

/**
 * Ringkasan area yang terbuka untuk tiap peran.
 *
 * Ditulis ulang di sini, bukan diturunkan dari peta hak akses, karena peta itu
 * hidup di modul 'server-only'. Kalimatnya sengaja menyebut nama menu yang
 * dilihat pengguna supaya orang yang memberi peran tahu persis apa yang ia
 * serahkan.
 */
export const ROLE_SCOPE: Record<UserRole, string> = {
  SUPER_ADMIN: 'Seluruh area admin, termasuk pengguna dan persetujuan override harga.',
  CATALOG_ADMIN: 'Katalog, mesin harga, antrean fitur custom, dan analitik.',
  CONSULTANT: 'Antrean custom, pipeline, proyek, persetujuan override, dan analitik.',
  SALES: 'Pipeline lead dan analitik.',
  PM: 'Proyek & milestone serta analitik.',
  CLIENT: 'Tanpa akses ke area admin — hanya portal klien.',
};
