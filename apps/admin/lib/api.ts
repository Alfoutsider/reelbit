const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function getCode(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("admin_code") ?? "";
}

export function saveCode(code: string) {
  sessionStorage.setItem("admin_code", code);
}

export function clearCode() {
  sessionStorage.removeItem("admin_code");
}

async function adminFetch(path: string) {
  const code = getCode();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-admin-code": code },
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchKPIs(days = 30) {
  return adminFetch(`/admin/kpis?days=${days}`);
}

export async function fetchChart(platform: "launchpad" | "casino", days = 7) {
  return adminFetch(`/admin/chart?platform=${platform}&days=${days}`);
}

export async function fetchTopTokens(limit = 10) {
  return adminFetch(`/admin/top-tokens?limit=${limit}`);
}

export async function fetchJackpots(limit = 20) {
  return adminFetch(`/admin/jackpots?limit=${limit}`);
}

export function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}
