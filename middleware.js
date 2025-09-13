// File: middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // --- NEW: Role-based redirect from the root page ---
    // If a logged-in user lands on the homepage, send them to their correct dashboard.
    if (pathname === '/') {
      if (token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      // For any other role, redirect to the user dashboard.
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // --- EXISTING: Protect admin routes ---
    // If a non-admin tries to access an admin page, redirect them.
    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      // This callback ensures that the middleware only runs if a user is logged in.
      authorized: ({ token }) => !!token,
    },
  }
);

// This specifies which routes the middleware should run on.
// We add the root path '/' to the matcher.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, signup, forgot-password (public auth pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password|verify|verify-email).*)',
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password|verify-email).*)",
  ],
};
