import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'rakit_session';

/**
 * Penjaga rute tingkat tepi (edge).
 *
 * Middleware hanya memeriksa keabsahan tanda tangan token agar pengunjung
 * anonim langsung dialihkan tanpa membebani basis data. Pemeriksaan lengkap —
 * sesi masih hidup, akun masih aktif, dan hak akses per area — tetap dilakukan
 * di server component lewat guards, karena Prisma tidak berjalan di edge.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith('/admin');
  const isPortal = pathname.startsWith('/portal');
  const isAccount = pathname.startsWith('/akun');

  if (!isAdmin && !isPortal && !isAccount) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return redirectToLogin(request);
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.next();

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const role = typeof payload.role === 'string' ? payload.role : 'CLIENT';
    if (isAdmin && role === 'CLIENT') {
      return NextResponse.redirect(new URL('/akun', request.url));
    }
    return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const url = new URL('/masuk', request.url);
  url.searchParams.set('lanjut', request.nextUrl.pathname + request.nextUrl.search);
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/portal/:path*', '/akun/:path*'],
};
