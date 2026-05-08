-- ReelBit Dividend Rounds — Supabase Migration
-- Run once in Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- Stores per-round Merkle leaves and proofs so individual holders can
-- claim their on-chain share. The on-chain DividendRound PDA only
-- carries the 32-byte root + claimed bitmap; everything needed to
-- reconstruct a player's claim_dividend ix lives here.

-- ── Tables ────────────────────────────────────────────────────────────────────

-- One row per (mint, round) — admin/audit metadata. claimed_count and
-- claimed_amount are mirrored from on-chain via webhook for fast queries
-- without a Solana RPC roundtrip on every portfolio load.
create table if not exists dividend_rounds (
  mint             text        not null,
  round            bigint      not null,
  merkle_root      text        not null,                          -- hex, 64 chars
  total_amount     bigint      not null,                          -- total lamports allocated
  holder_count     smallint    not null,                          -- # of leaves in this round
  published_at     timestamptz default now(),
  expires_at       timestamptz not null,
  publish_tx_sig   text,
  -- Mirrored from on-chain via webhook:
  claimed_count    smallint    not null default 0,
  claimed_amount   bigint      not null default 0,
  expired          boolean     not null default false,
  primary key (mint, round)
);
create index if not exists dividend_rounds_active_idx
  on dividend_rounds (mint) where not expired;

-- One row per (mint, round, holder). Holder fetches their proof here
-- when assembling a claim_dividend instruction client-side.
create table if not exists dividend_proofs (
  mint        text        not null,
  round       bigint      not null,
  holder      text        not null,                                -- base58 wallet
  leaf_index  smallint    not null,                                -- 0..99
  amount      bigint      not null,                                -- lamports
  proof       jsonb       not null,                                -- ["hex32", "hex32", ...]
  claimed     boolean     not null default false,
  claimed_at  timestamptz,
  claim_tx_sig text,
  primary key (mint, round, holder),
  foreign key (mint, round) references dividend_rounds (mint, round) on delete cascade
);
-- Fast lookup: "what can this wallet claim, across every mint?"
create index if not exists dividend_proofs_holder_unclaimed_idx
  on dividend_proofs (holder) where not claimed;

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table dividend_rounds  enable row level security;
alter table dividend_proofs  enable row level security;

-- Public read (anyone can audit any holder's claimable amount).
create policy "dividend_rounds_read"
  on dividend_rounds for select to anon, authenticated using (true);
create policy "dividend_proofs_read"
  on dividend_proofs for select to anon, authenticated using (true);
-- Writes go through the service-role key only (api server).
