import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Aturan kata sandi minimum untuk akun klien maupun internal. */
export function validatePassword(plain: string): string | null {
  if (plain.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (!/[a-zA-Z]/.test(plain)) return 'Kata sandi harus memuat huruf.';
  if (!/[0-9]/.test(plain)) return 'Kata sandi harus memuat angka.';
  return null;
}
