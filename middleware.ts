import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('advoai_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Decode JWT payload (no verification — just to read the role claim)
  try {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padLength);

    const payload = JSON.parse(atob(base64));
    if (payload.role !== 'admin' && payload.role !== 'root_admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (err) {
    console.error('Middleware JWT decode error:', err);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
