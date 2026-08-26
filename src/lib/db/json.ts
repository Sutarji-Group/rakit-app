/**
 * Helper baca/tulis kolom JSON.
 *
 * Payload JSON disimpan sebagai String, bukan tipe Json milik Postgres. Tidak
 * ada satu pun kueri yang menyaring atau mengurutkan berdasarkan isi JSON —
 * semuanya dibaca utuh — jadi tipe Json hanya akan menambah jalur konversi
 * tanpa menambah kemampuan.
 *
 * Konsekuensinya: isi kolom ini tidak divalidasi basis data. parseJson selalu
 * mengembalikan fallback bila isinya rusak, sehingga satu baris cacat tidak
 * menjatuhkan halaman yang membacanya.
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
