import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

export interface ApiError {
  error: string;
  /** Rincian per field untuk formulir. */
  fields?: Record<string, string>;
  code?: string;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function fail(
  message: string,
  status = 400,
  extra?: Omit<ApiError, 'error'>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function notFound(message = 'Data tidak ditemukan.'): NextResponse {
  return fail(message, 404);
}

export function unauthorized(message = 'Anda perlu masuk terlebih dahulu.'): NextResponse {
  return fail(message, 401);
}

export function forbidden(message = 'Anda tidak memiliki akses ke tindakan ini.'): NextResponse {
  return fail(message, 403);
}

/** Menerjemahkan kesalahan Zod menjadi pesan per field berbahasa Indonesia. */
export function fromZodError(error: ZodError): NextResponse {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fail('Data yang dikirim belum lengkap atau tidak sah.', 422, { fields });
}

/**
 * Membaca dan memvalidasi body JSON.
 * Mengembalikan tuple agar pemanggil dapat langsung mengembalikan respons error.
 */
export async function readBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T; response: null } | { data: null; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, response: fail('Body permintaan bukan JSON yang sah.') };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { data: null, response: fromZodError(parsed.error) };
  }
  return { data: parsed.data, response: null };
}
