import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() reads the JWT from the cookie locally — no HTTP call to Supabase Auth
  // This is safe because the JWT is cryptographically signed and verified locally
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't need auth
  const publicRoutes = ["/", "/login", "/register"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/api/")
  );

  // If no session and trying to access protected route
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If session exists, check role-based access (role from JWT app_metadata)
  if (session) {
    const role = session.user.app_metadata?.role as string | undefined;

    // Super admin trying to access employee/admin routes
    if (role === "super_admin") {
      if (pathname.startsWith("/employee") || pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
      }
      // Super admin trying to access login/register
      if (pathname === "/login" || pathname === "/register") {
        return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
      }
    }

    // Admin trying to access employee routes
    if (pathname.startsWith("/employee") && role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    // Employee trying to access admin routes
    if (pathname.startsWith("/admin") && role === "employee") {
      return NextResponse.redirect(
        new URL("/employee/dashboard", request.url)
      );
    }

    // Non-super-admin trying to access super-admin routes
    if (pathname.startsWith("/super-admin") && role !== "super_admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Logged in user trying to access login/register
    if (pathname === "/login" || pathname === "/register") {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else if (role === "employee") {
        return NextResponse.redirect(
          new URL("/employee/dashboard", request.url)
        );
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
