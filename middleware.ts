// Middleware intentionally left empty.
// All auth/role checks are handled client-side in app/admin/layout.tsx
// and enforced server-side by backend API endpoints.
//
// A previous version checked cookies here, but it caused redirect loops
// because the token lives in localStorage (not always in cookies).
