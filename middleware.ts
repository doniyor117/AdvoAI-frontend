import { NextResponse, type NextRequest } from 'next/server';

// No-op middleware. All auth/role checks are handled client-side
// in app/admin/layout.tsx and enforced server-side by backend APIs.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
