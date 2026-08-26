/**
 * Helper baca/tulis kolom JSON.
 *
 * SQLite tidak mendukung tipe Json di Prisma, sehingga seluruh payload JSON
 * disimpan sebagai String. Seluruh akses melewati modul ini agar migrasi ke
 * Postgres cukup mengubah tipe kolom tanpa menyentuh kode pemanggil.
 */

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseStringArray(value: string | null | undefined): string[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
}
