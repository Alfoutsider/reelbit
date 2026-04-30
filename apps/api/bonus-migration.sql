-- ── Welcome Bonus Migration ───────────────────────────────────────────────────
-- Run in Supabase SQL editor BEFORE deploying the API changes.
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Extend the balances table with bonus state fields
ALTER TABLE balances
  ADD COLUMN IF NOT EXISTS bonus_state TEXT NOT NULL DEFAULT 'none'
    CONSTRAINT balances_bonus_state_check
    CHECK (bonus_state IN ('none','active','completed','forfeited','expired')),
  ADD COLUMN IF NOT EXISTS bonus_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 2. Audit table — append-only ledger of every bonus lifecycle event
CREATE TABLE IF NOT EXISTS bonus_ledger (
  id               BIGSERIAL    PRIMARY KEY,
  wallet           TEXT         NOT NULL,
  event            TEXT         NOT NULL
    CONSTRAINT bonus_ledger_event_check
    CHECK (event IN ('grant','wager','complete','forfeit','expire')),
  amount           BIGINT       NOT NULL DEFAULT 0,
  wagering_before  BIGINT       NOT NULL DEFAULT 0,
  wagering_after   BIGINT       NOT NULL DEFAULT 0,
  meta             JSONB,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bonus_ledger_wallet_idx ON bonus_ledger(wallet);
CREATE INDEX IF NOT EXISTS bonus_ledger_event_idx  ON bonus_ledger(event);

-- 3. Migrate existing rows that already have welcomeBonusClaimed = true
--    into the new 'completed' state so existing players aren't regressed.
--    (bonus already converted to playable in those rows, so bonus=0 is correct)
UPDATE balances
SET bonus_state = 'completed'
WHERE welcome_bonus_claimed = true
  AND bonus_state = 'none';
