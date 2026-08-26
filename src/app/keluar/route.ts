import { redirect } from 'next/navigation';
import { destroySession } from '@/lib/auth/session';

export const runtime = 'nodejs';

/** Keluar lewat pengiriman formulir biasa, agar tetap bekerja tanpa JavaScript. */
export async function POST() {
  await destroySession();
  redirect('/');
}

export async function GET() {
  await destroySession();
  redirect('/');
}
