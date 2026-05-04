// Translates raw Anchor / Solana error strings into something a non-technical
// user can act on. The fallback (`unknownErrorFallback`) trims to a sane length
// and strips the noisy "Program failed to complete: ..." preamble that wallets
// surface for any custom-program error.

interface MappedError {
  match: RegExp;
  message: string;
}

// Order matters: most specific matches first.
const MAP: MappedError[] = [
  // ── User mistakes ────────────────────────────────────────────────────────────
  { match: /Wallet would exceed 5% token cap/i,           message: "This wallet already holds 5% of the supply — the per-wallet cap." },
  { match: /Insufficient lamports|insufficient funds/i,    message: "Not enough SOL in your wallet for this trade and the network fee." },
  { match: /SlippageExceeded|Slippage tolerance/i,         message: "Price moved too much during the trade. Try again or raise slippage." },
  { match: /InsufficientSol|Insufficient SOL in vault/i,   message: "The bonding curve doesn't have enough SOL for that sell. Try a smaller amount." },
  { match: /InsufficientTokens/i,                          message: "Not enough tokens left in the curve to fulfill this buy." },
  { match: /VaultInsolvent/i,                              message: "Vault balance check failed — try a smaller amount or refresh." },
  { match: /InvalidJackpotWinner/i,                        message: "This wallet isn't eligible to receive a jackpot payout." },
  { match: /AlreadyGraduated|graduated/i,                  message: "This token already graduated — trade it on the AMM, not the bonding curve." },
  { match: /ZeroAmount/i,                                  message: "Amount must be greater than zero." },
  { match: /Unauthorized/i,                                message: "Only the platform authority can perform this action." },

  // ── Wallet / signing flow ───────────────────────────────────────────────────
  { match: /User rejected the request|user rejected/i,     message: "You declined the wallet signature." },
  { match: /Transaction simulation failed/i,               message: "Transaction would fail on-chain. Check your balance and try again." },
  { match: /blockhash not found|expired/i,                 message: "Transaction took too long to confirm. Please try again." },

  // ── Network / RPC ───────────────────────────────────────────────────────────
  { match: /timed out|timeout/i,                           message: "Network is slow. Your transaction may still go through — check your wallet history." },
  { match: /ECONN|network error|fetch failed/i,            message: "Couldn't reach the network. Check your connection and try again." },
  { match: /Account not found|AccountNotFound/i,           message: "Token account doesn't exist yet — usually self-resolves on the next buy." },
];

const ANCHOR_ERROR_RE = /Error Message:\s*([^\n]+)/i;
const CUSTOM_PROGRAM_ERROR_RE = /custom program error:\s*0x([0-9a-f]+)/i;

export function friendlyError(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  const raw = err instanceof Error ? err.message : String(err);

  // First try the structured Anchor "Error Message: ..." format which already
  // contains a human-readable string from the on-chain `#[error_code]` enum.
  const anchorMatch = raw.match(ANCHOR_ERROR_RE);
  const probe = anchorMatch ? anchorMatch[1] : raw;

  for (const { match, message } of MAP) {
    if (match.test(probe) || match.test(raw)) return message;
  }

  // Custom program error code with no friendly name — show the code so users
  // can grep the program source if curious, instead of a wall of bytes.
  const codeMatch = raw.match(CUSTOM_PROGRAM_ERROR_RE);
  if (codeMatch) {
    return `Transaction rejected by the program (code 0x${codeMatch[1]}). Try again or contact support.`;
  }

  return unknownErrorFallback(raw);
}

function unknownErrorFallback(raw: string): string {
  // Strip the "Program failed to complete: " preamble that wallets prepend to
  // every program error. Then trim to ~140 chars so it fits a small toast.
  const cleaned = raw
    .replace(/^Error:\s*/i, "")
    .replace(/Program (?:[A-Za-z0-9]+ )?failed to complete:?\s*/i, "")
    .trim();
  return cleaned.length > 140 ? cleaned.slice(0, 137) + "…" : cleaned;
}
