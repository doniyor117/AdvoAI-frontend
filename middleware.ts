import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('advoai_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role checking is now handled entirely on the client side in app/admin/layout.tsx
  // and securely on the backend APIs. This prevents aggressive PWA service workers
  // or iOS Safari cookie sync delays from caching a 307 redirect.

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
