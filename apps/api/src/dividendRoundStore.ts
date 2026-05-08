/**
 * Persistence layer for the on-chain Merkle dividend rounds.
 *
 * Maps to two Supabase tables (see dividend-migration.sql):
 *   dividend_rounds  — one row per (mint, round); admin/audit metadata
 *   dividend_proofs  — one row per (mint, round, holder); stores leaf + proof
 *
 * The on-chain DividendRound PDA is the source of truth for the merkle
 * root and claimed bitmap; this store carries the off-chain data players
 * need to assemble their claim_dividend instruction.
 */

import { supabase } from "./supabase";

export interface DividendRoundRow {
  mint:            string;
  round:           number;
  merkleRoot:      string;        // hex64
  totalAmount:     number;        // lamports
  holderCount:     number;
  publishedAt:     string;        // ISO timestamp
  expiresAt:       string;        // ISO timestamp
  publishTxSig?:   string;
  claimedCount:    number;
  claimedAmount:   number;
  expired:         boolean;
}

export interface DividendProofRow {
  mint:        string;
  round:       number;
  holder:      string;
  leafIndex:   number;
  amount:      number;            // lamports
  proof:       string[];           // array of hex32
  claimed:     boolean;
  claimedAt?:  string;
  claimTxSig?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function toRoundRow(r: any): DividendRoundRow {
  return {
    mint:          r.mint,
    round:         Number(r.round),
    merkleRoot:    r.merkle_root,
    totalAmount:   Number(r.total_amount),
    holderCount:   Number(r.holder_count),
    publishedAt:   r.published_at,
    expiresAt:     r.expires_at,
    publishTxSig:  r.publish_tx_sig ?? undefined,
    claimedCount:  Number(r.claimed_count),
    claimedAmount: Number(r.claimed_amount),
    expired:       Boolean(r.expired),
  };
}

function toProofRow(r: any): DividendProofRow {
  return {
    mint:       r.mint,
    round:      Number(r.round),
    holder:     r.holder,
    leafIndex:  Number(r.leaf_index),
    amount:     Number(r.amount),
    proof:      r.proof as string[],
    claimed:    Boolean(r.claimed),
    claimedAt:  r.claimed_at ?? undefined,
    claimTxSig: r.claim_tx_sig ?? undefined,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getNextRoundFor(mint: string): Promise<number> {
  const { data } = await supabase
    .from("dividend_rounds")
    .select("round")
    .eq("mint", mint)
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.round) + 1 : 0;
}

export async function insertRound(row: {
  mint:           string;
  round:          number;
  merkleRoot:     string;
  totalAmount:    number;
  holderCount:    number;
  expiresAt:      Date;
  publishTxSig?:  string;
}): Promise<void> {
  await supabase.from("dividend_rounds").insert({
    mint:            row.mint,
    round:           row.round,
    merkle_root:     row.merkleRoot,
    total_amount:    row.totalAmount,
    holder_count:    row.holderCount,
    expires_at:      row.expiresAt.toISOString(),
    publish_tx_sig:  row.publishTxSig ?? null,
  });
}

export async function insertProofs(rows: Array<{
  mint:       string;
  round:      number;
  holder:     string;
  leafIndex:  number;
  amount:     number;
  proof:      string[];
}>): Promise<void> {
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({
    mint:       r.mint,
    round:      r.round,
    holder:     r.holder,
    leaf_index: r.leafIndex,
    amount:     r.amount,
    proof:      r.proof,
  }));
  // Chunk to keep request body bounded
  const CHUNK = 200;
  for (let i = 0; i < payload.length; i += CHUNK) {
    await supabase.from("dividend_proofs").insert(payload.slice(i, i + CHUNK));
  }
}

/** Used by GET /dividends/:wallet — every unclaimed proof for this holder. */
export async function getUnclaimedForHolder(holder: string): Promise<DividendProofRow[]> {
  const { data } = await supabase
    .from("dividend_proofs")
    .select("*")
    .eq("holder", holder)
    .eq("claimed", false);
  return (data ?? []).map(toProofRow);
}

export async function markProofClaimed(
  mint:   string,
  round:  number,
  holder: string,
  txSig:  string,
): Promise<void> {
  await supabase.from("dividend_proofs").update({
    claimed:      true,
    claimed_at:   new Date().toISOString(),
    claim_tx_sig: txSig,
  }).match({ mint, round, holder });
}

/** Mirror on-chain claimed counters into Supabase (called from webhook). */
export async function bumpRoundClaimed(
  mint:        string,
  round:       number,
  amountDelta: number,
): Promise<void> {
  const { data } = await supabase
    .from("dividend_rounds")
    .select("claimed_count, claimed_amount")
    .match({ mint, round })
    .maybeSingle();
  if (!data) return;
  await supabase.from("dividend_rounds").update({
    claimed_count:  Number(data.claimed_count) + 1,
    claimed_amount: Number(data.claimed_amount) + amountDelta,
  }).match({ mint, round });
}

export async function markRoundExpired(mint: string, round: number): Promise<void> {
  await supabase.from("dividend_rounds").update({ expired: true }).match({ mint, round });
}

export async function getRound(mint: string, round: number): Promise<DividendRoundRow | null> {
  const { data } = await supabase
    .from("dividend_rounds")
    .select("*")
    .match({ mint, round })
    .maybeSingle();
  return data ? toRoundRow(data) : null;
}
