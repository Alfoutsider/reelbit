-- ReelBit Referral Program — Supabase Migration
-- Run once in Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Tables ────────────────────────────────────────────────────────────────────

-- One referral code per wallet (auto-generated, 8 chars, unambiguous alphabet)
create table if not exists referral_codes (
  wallet     text        primary key,
  code       text unique not null,
  created_at timestamptz default now()
);
create index if not exists referral_codes_code_idx on referral_codes (code);

-- One referrer per referee, ever. Status: pending → active | flagged.
create table if not exists referrals (
  id               uuid        default gen_random_uuid() primary key,
  referrer_wallet  text        not null references referral_codes (wallet),
  referee_wallet   text        not null unique,
  status           text        not null default 'pending',  -- pending | active | flagged
  source           text        not null default 'launchpad', -- launchpad | casino
  ip_hash          text,
  created_at       timestamptz default now(),
  activated_at     timestamptz,
  constraint referrals_no_self check (referrer_wallet != referee_wallet)
);
create index if not exists referrals_referrer_idx on referrals (referrer_wallet);
create index if not exists referrals_status_idx   on referrals (referrer_wallet, status);

-- Append-only event log — source of truth for all points
create table if not exists referral_events (
  id               uuid        default gen_random_uuid() primary key,
  referrer_wallet  text        not null,
  referee_wallet   text        not null,  -- "MILESTONE" for milestone bonus rows
  event_type       text        not null,
  points           int         not null check (points > 0),
  source           text        not null default 'launchpad',
  metadata         jsonb       default '{}',
  created_at       timestamptz default now()
);
create index if not exists ref_events_referrer_idx on referral_events (referrer_wallet);
create index if not exists ref_events_referee_type_idx on referral_events (referee_wallet, event_type);

-- Aggregated points cache — updated after each event insert, fast for leaderboard
create table if not exists referral_points (
  wallet           text primary key,
  total_points     int  not null default 0,
  launchpad_points int  not null default 0,
  casino_points    int  not null default 0,
  active_referrals int  not null default 0,
  total_referrals  int  not null default 0,
  updated_at       timestamptz default now()
);

-- ── Row-level security (optional but recommended) ─────────────────────────────
-- If you have RLS enabled, allow service role full access:
-- alter table referral_codes  enable row level security;
-- alter table referrals       enable row level security;
-- alter table referral_events enable row level security;
-- alter table referral_points enable row level security;
-- (Service role bypasses RLS automatically)
