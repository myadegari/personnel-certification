// File: proxy.js (Next.js middleware)
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isStaffRole } from "@/lib/roles";

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function proxy(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Forced password change (offline admin temp-password reset): a user who
    // logged in with a temporary password may ONLY reach the set-password page
    // until they choose a new one.
    if (token.mustChangePassword) {
      if (pathname !== "/authentication/set-password") {
        return NextResponse.redirect(
          new URL("/authentication/set-password", req.url)
        );
      }
      return NextResponse.next();
    }

    // If the user's account is pending admin verification
    if (token.status === "NEED_TO_VERIFY") {
      // Allow access ONLY to the dashboard page where they will see a message.
      if (pathname !== "/dashboard") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      // If they are on the dashboard, do nothing and let them see the page.
      return NextResponse.next();
    }

    // --- NEW: Role-based redirect from the root page ---
    // This part runs only for 'verified' users
    if (token.status === "VERIFIED") {
      // If a logged-in user lands on the homepage, send them to their correct dashboard.
      if (pathname === "/") {
        if (isStaffRole(token.role)) {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
        // For any other role, redirect to the user dashboard.
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      // --- EXISTING: Protect admin routes ---
      // If a non-admin tries to access an admin page, redirect them.
      if (pathname.startsWith("/admin") && !isStaffRole(token.role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
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
     * - fav-icon.png, logo.png (brand assets — favicon and email logos are
     *   fetched without a session, e.g. from mail clients)
     * - pdf.worker.min.mjs (pdf.js worker, fetched without auth context)
     * - login, forgot-password (public auth pages)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|fav-icon.png|logo.png|pdf.worker.min.mjs|authentication/login|authentication/forgot-password|verify).*)",
  ],
};
