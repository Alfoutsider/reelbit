import { supabase } from "./supabase";

export type DemoStatus = "pending" | "approved" | "denied";

export interface DemoApplication {
  wallet:    string;
  twitter:   string | null;
  reason:    string;
  status:    DemoStatus;
  appliedAt: number;
  reviewedAt?: number;
}

export const DEMO_CREDIT_USDC = 100 * 1_000_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toApp(row: any): DemoApplication {
  return {
    wallet:     row.wallet,
    twitter:    row.twitter    ?? null,
    reason:     row.reason,
    status:     row.status     as DemoStatus,
    appliedAt:  row.applied_at,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

export async function getApplication(wallet: string): Promise<DemoApplication | null> {
  const { data } = await supabase.from("demo_applications").select("*").eq("wallet", wallet).maybeSingle();
  return data ? toApp(data) : null;
}

export async function getAllApplications(): Promise<DemoApplication[]> {
  const { data } = await supabase.from("demo_applications").select("*").order("applied_at", { ascending: false });
  return (data ?? []).map(toApp);
}

export async function isDemoUser(wallet: string): Promise<boolean> {
  const { data } = await supabase.from("demo_users").select("wallet").eq("wallet", wallet).maybeSingle();
  return !!data;
}

export async function apply(wallet: string, reason: string, twitter: string | null = null): Promise<DemoApplication> {
  const existing = await getApplication(wallet);
  if (existing && (existing.status === "approved" || existing.status === "pending")) return existing;

  const row = { wallet, twitter, reason, status: "pending", applied_at: Date.now() };
  const { data, error } = await supabase.from("demo_applications").upsert(row, { onConflict: "wallet" }).select().single();
  if (error) throw new Error(error.message);
  return toApp(data);
}

export async function approve(wallet: string): Promise<DemoApplication> {
  const { data, error } = await supabase
    .from("demo_applications")
    .update({ status: "approved", reviewed_at: Date.now() })
    .eq("wallet", wallet)
    .select()
    .single();
  if (error) throw new Error(error.message ?? "No application found");
  await supabase.from("demo_users").upsert({ wallet }, { onConflict: "wallet" });
  return toApp(data);
}

export async function deny(wallet: string): Promise<DemoApplication> {
  const { data, error } = await supabase
    .from("demo_applications")
    .update({ status: "denied", reviewed_at: Date.now() })
    .eq("wallet", wallet)
    .select()
    .single();
  if (error) throw new Error(error.message ?? "No application found");
  return toApp(data);
}
