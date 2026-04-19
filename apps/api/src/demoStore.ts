/**
 * Demo / beta-access store.
 *
 * Users apply with wallet + optional twitter + reason.
 * Admins approve or deny via POST /demo/approve|deny.
 * Approved users receive $100 USDC demo credit (non-withdrawable).
 */

import fs from "fs";
import path from "path";

export type DemoStatus = "pending" | "approved" | "denied";

export interface DemoApplication {
  wallet:    string;
  twitter:   string | null;
  reason:    string;
  status:    DemoStatus;
  appliedAt: number;
  reviewedAt?: number;
}

const STORE_PATH = path.resolve(process.cwd(), "data/demo.json");
const DEMO_TMP   = STORE_PATH + ".tmp";

/** $100 USDC in micro-units credited on approval */
export const DEMO_CREDIT_USDC = 100 * 1_000_000;

interface DemoStore {
  applications: Record<string, DemoApplication>; // keyed by wallet
  demoUsers:    string[];                         // wallets approved; can play, cannot withdraw
}

function read(): DemoStore {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")); }
  catch { return { applications: {}, demoUsers: [] }; }
}

function write(store: DemoStore): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(DEMO_TMP, JSON.stringify(store, null, 2));
  fs.renameSync(DEMO_TMP, STORE_PATH);
}

export function getApplication(wallet: string): DemoApplication | null {
  return read().applications[wallet] ?? null;
}

export function getAllApplications(): DemoApplication[] {
  return Object.values(read().applications).sort((a, b) => b.appliedAt - a.appliedAt);
}

export function isDemoUser(wallet: string): boolean {
  return read().demoUsers.includes(wallet);
}

/**
 * Submit a demo application. One per wallet; re-applying after denial resets to pending.
 */
export function apply(
  wallet: string,
  reason: string,
  twitter: string | null = null,
): DemoApplication {
  const store = read();
  const existing = store.applications[wallet];
  if (existing && existing.status === "approved") return existing;

  const app: DemoApplication = {
    wallet,
    twitter,
    reason,
    status:    "pending",
    appliedAt: Date.now(),
  };
  store.applications[wallet] = app;
  write(store);
  return app;
}

/**
 * Approve an application. Returns the credited USDC amount so the endpoint can echo it.
 * The actual balance credit is done by the caller (index.ts) to avoid a circular dep.
 */
export function approve(wallet: string): DemoApplication {
  const store = read();
  const app = store.applications[wallet];
  if (!app) throw new Error("No application found for this wallet");

  app.status     = "approved";
  app.reviewedAt = Date.now();
  store.applications[wallet] = app;

  if (!store.demoUsers.includes(wallet)) store.demoUsers.push(wallet);
  write(store);
  return app;
}

export function deny(wallet: string): DemoApplication {
  const store = read();
  const app = store.applications[wallet];
  if (!app) throw new Error("No application found for this wallet");

  app.status     = "denied";
  app.reviewedAt = Date.now();
  store.applications[wallet] = app;
  write(store);
  return app;
}
