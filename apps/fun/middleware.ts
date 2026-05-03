import { NextResponse, type NextRequest } from "next/server";

const CODE_RE = /^[A-Z0-9]{6,10}$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin gate ────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    // Login page and auth API are always accessible
    if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth")) {
      return NextResponse.next();
    }

    const session = request.cookies.get("admin_session")?.value;
    const expected = process.env.ADMIN_CODE;

    if (!expected || session !== expected) {
      const login = new URL("/admin/login", request.url);
      return NextResponse.redirect(login);
    }

    return NextResponse.next();
  }

  // ── Referral shortlinks ───────────────────────────────────────────────────
  if (pathname.startsWith("/r/")) {
    const raw  = pathname.slice(3).split("/")[0].toUpperCase().trim();
    const dest = new URL("/", request.url);

    if (CODE_RE.test(raw)) {
      const response = NextResponse.redirect(dest);
      response.cookies.set("rb_ref", raw, {
        maxAge:   30 * 24 * 60 * 60,
        path:     "/",
        sameSite: "lax",
        httpOnly: false,
      });
      return response;
    }

    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/r/:code*"],
};
