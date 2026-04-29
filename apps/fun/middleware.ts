import { NextResponse, type NextRequest } from "next/server";

// Unambiguous referral code characters (matches CODE_CHARS in referralService)
const CODE_RE = /^[A-Z0-9]{6,10}$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /r/:code → set cookie + redirect to homepage
  if (pathname.startsWith("/r/")) {
    const raw  = pathname.slice(3).split("/")[0].toUpperCase().trim();
    const dest = new URL("/", request.url);

    if (CODE_RE.test(raw)) {
      const response = NextResponse.redirect(dest);
      response.cookies.set("rb_ref", raw, {
        maxAge:   30 * 24 * 60 * 60, // 30 days
        path:     "/",
        sameSite: "lax",
        httpOnly: false, // readable by JS for registration call
      });
      return response;
    }

    // Malformed code — redirect silently without setting cookie
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/r/:code*"],
};
