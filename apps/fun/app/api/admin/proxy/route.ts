import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Two-keys-or-one model:
//   ADMIN_CODE      — what the user types at /admin/login (browser-facing).
//   ADMIN_API_KEY   — what we forward to the Render API (machine-to-machine).
// They MAY be the same value (simple deploys) or different (rotated independently).
// Falls back to ADMIN_CODE if ADMIN_API_KEY is unset, which keeps legacy single-
// secret deployments working.
export async function GET(req: NextRequest) {
  const session     = req.cookies.get("admin_session")?.value;
  const browserCode = process.env.ADMIN_CODE;
  const apiKey      = process.env.ADMIN_API_KEY ?? browserCode;

  if (!browserCode || session !== browserCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url    = new URL(req.url);
  const path   = url.searchParams.get("path") ?? "";
  url.searchParams.delete("path");
  const qs     = url.searchParams.toString();
  const target = `${API}${path}${qs ? `?${qs}` : ""}`;

  const res  = await fetch(target, {
    // Send both headers during the migration window. Drop x-admin-code once
    // the API stops accepting it (see apps/api/src/index.ts:requireAdmin).
    headers: { "x-admin-key": apiKey ?? "", "x-admin-code": apiKey ?? "" },
    cache:   "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
