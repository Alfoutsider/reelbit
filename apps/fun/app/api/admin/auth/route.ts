import { NextRequest, NextResponse } from "next/server";

const COOKIE = "admin_session";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const expected = process.env.ADMIN_CODE;

  if (!expected || code !== expected) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, expected, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   7 * 24 * 60 * 60, // 7 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
