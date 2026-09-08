import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    try {
      const res = await fetch(`${API_URL}/admin/auth/me`, {
        headers: { cookie: request.headers.get('cookie') || '' },
      });
      if (!res.ok) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};