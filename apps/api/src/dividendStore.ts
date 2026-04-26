import { supabase } from "./supabase";

export interface DividendEntry {
  accumulated:      number;
  lastDistributed:  number;
  totalDistributed: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEntry(row: any): DividendEntry {
  return {
    accumulated:      Number(row.accumulated),
    lastDistributed:  Number(row.last_distributed),
    totalDistributed: Number(row.total_distributed),
  };
}

export async function addDividend(mint: string, lamports: number): Promise<void> {
  if (lamports <= 0) return;
  const { data } = await supabase.from("dividends").select("*").eq("mint", mint).maybeSingle();
  if (data) {
    await supabase.from("dividends").update({ accumulated: Number(data.accumulated) + lamports }).eq("mint", mint);
  } else {
    await supabase.from("dividends").insert({ mint, accumulated: lamports, last_distributed: 0, total_distributed: 0 });
  }
}

export async function getDividend(mint: string): Promise<DividendEntry | null> {
  const { data } = await supabase.from("dividends").select("*").eq("mint", mint).maybeSingle();
  return data ? toEntry(data) : null;
}

export async function getAllDividends(): Promise<Array<{ mint: string } & DividendEntry>> {
  const { data } = await supabase.from("dividends").select("*");
  return (data ?? []).map((row) => ({ mint: row.mint, ...toEntry(row) }));
}

export async function recordDistribution(mint: string, lamportsDistributed: number): Promise<void> {
  const { data } = await supabase.from("dividends").select("*").eq("mint", mint).maybeSingle();
  if (!data) return;
  await supabase.from("dividends").update({
    accumulated:       Math.max(0, Number(data.accumulated) - lamportsDistributed),
    last_distributed:  Date.now(),
    total_distributed: Number(data.total_distributed) + lamportsDistributed,
  }).eq("mint", mint);
}
