import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/signup", "/setup"];

// Routes that are always accessible (API, static assets)
const BYPASS_ROUTES = ["/api", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, Next.js internals, and static assets
  if (BYPASS_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check system status via API
  try {
    const statusUrl = new URL("/api/auth/status", request.url);
    const response = await fetch(statusUrl, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      // API error, allow request to continue
      return NextResponse.next();
    }

    const status = await response.json();
    const { initialized, authenticated } = status;

    // System not initialized - redirect to setup
    if (!initialized) {
      if (pathname !== "/setup") {
        return NextResponse.redirect(new URL("/setup", request.url));
      }
      return NextResponse.next();
    }

    // System initialized but on setup page - redirect to login
    if (initialized && pathname === "/setup") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Not authenticated and not on public route - redirect to login
    if (!authenticated && !PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Authenticated and on login/signup page - redirect to home
    if (authenticated && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Admin routes check
    if (pathname.startsWith("/admin")) {
      if (!authenticated) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      if (status.user?.role !== "admin") {
        // Redirect non-admins away from admin routes
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    // Error calling API, allow request to continue
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
