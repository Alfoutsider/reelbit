-- ── ReelBit Analytics Schema Migration ───────────────────────────────────────
-- Run once against your Supabase project.

-- Tokens launched via the launchpad
CREATE TABLE IF NOT EXISTS tokens (
  mint          TEXT PRIMARY KEY,
  creator       TEXT NOT NULL,
  name          TEXT,
  symbol        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  graduated_at  TIMESTAMPTZ,
  is_graduated  BOOLEAN NOT NULL DEFAULT false,
  slot_model    TEXT
);

-- Raw SPL trades (buy/sell) indexed from Helius webhook
CREATE TABLE IF NOT EXISTS trades (
  id            BIGSERIAL PRIMARY KEY,
  tx_sig        TEXT UNIQUE NOT NULL,
  mint          TEXT NOT NULL,
  trade_type    TEXT NOT NULL CHECK (trade_type IN ('buy','sell')),
  wallet        TEXT NOT NULL,
  sol_amount    NUMERIC NOT NULL,
  token_amount  NUMERIC NOT NULL,
  usd_value     NUMERIC NOT NULL,
  traded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trades_mint_idx ON trades (mint);
CREATE INDEX IF NOT EXISTS trades_wallet_idx ON trades (wallet);
CREATE INDEX IF NOT EXISTS trades_traded_at_idx ON trades (traded_at DESC);

-- Jackpot payouts (one row per win)
CREATE TABLE IF NOT EXISTS jackpot_payouts (
  id            BIGSERIAL PRIMARY KEY,
  tx_sig        TEXT UNIQUE NOT NULL,
  mint          TEXT NOT NULL,
  winner_wallet TEXT NOT NULL,
  usdc_units    NUMERIC NOT NULL,
  paid_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fee distributions (one row per distribution cron run)
CREATE TABLE IF NOT EXISTS fee_distributions (
  id               BIGSERIAL PRIMARY KEY,
  mint             TEXT NOT NULL,
  source           TEXT NOT NULL CHECK (source IN ('trading_fee','lp_harvest','ggr')),
  total_amount     NUMERIC NOT NULL,
  platform_amount  NUMERIC NOT NULL,
  creator_amount   NUMERIC NOT NULL,
  jackpot_amount   NUMERIC NOT NULL,
  legal_amount     NUMERIC NOT NULL,
  dividend_amount  NUMERIC NOT NULL,
  distributed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fee_dist_mint_idx ON fee_distributions (mint);

-- Aggregated hourly buckets — the source of truth for dashboard charts
-- Mixing launchpad + casino into one table with a "platform" column.
CREATE TABLE IF NOT EXISTS analytics_hourly (
  id              BIGSERIAL PRIMARY KEY,
  hour            TIMESTAMPTZ NOT NULL,            -- truncated to the hour
  platform        TEXT NOT NULL CHECK (platform IN ('launchpad','casino')),
  -- Launchpad metrics
  tokens_launched INT         NOT NULL DEFAULT 0,
  tokens_graduated INT        NOT NULL DEFAULT 0,
  trade_count     INT         NOT NULL DEFAULT 0,
  trade_vol_sol   NUMERIC     NOT NULL DEFAULT 0,
  trade_vol_usd   NUMERIC     NOT NULL DEFAULT 0,
  new_wallets     INT         NOT NULL DEFAULT 0,  -- distinct new wallets buying for first time
  -- Casino metrics
  spins           INT         NOT NULL DEFAULT 0,
  ggr_usdc        NUMERIC     NOT NULL DEFAULT 0,  -- gross gaming revenue (house edge)
  jackpot_paid    NUMERIC     NOT NULL DEFAULT 0,
  -- Shared
  fees_distributed_usd NUMERIC NOT NULL DEFAULT 0,
  UNIQUE (hour, platform)
);
CREATE INDEX IF NOT EXISTS analytics_hourly_hour_idx ON analytics_hourly (hour DESC);

-- Admin action log (immutable audit trail of admin-triggered on-chain actions)
CREATE TABLE IF NOT EXISTS admin_actions (
  id          BIGSERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  params      JSONB,
  tx_sig      TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
