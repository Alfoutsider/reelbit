import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET(req: NextRequest) {
  // Validate session cookie
  const session  = req.cookies.get("admin_session")?.value;
  const expected = process.env.ADMIN_CODE;
  if (!expected || session !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Forward the path + all other query params to the Render API
  const url    = new URL(req.url);
  const path   = url.searchParams.get("path") ?? "";
  url.searchParams.delete("path");
  const qs     = url.searchParams.toString();
  const target = `${API}${path}${qs ? `?${qs}` : ""}`;

  const res  = await fetch(target, {
    headers: { "x-admin-code": expected },
    cache:   "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
