import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config";
import type { HeliusWebhookPayload, SlotGraduatedEvent, TokensBoughtEvent } from "./types";

// Anchor log prefix for program events
const EVENT_LOG_PREFIX = "Program data: ";

// Discriminators (sha256("event:SlotGraduated")[0..8] etc.)
// These are emitted as base64-encoded borsh in program logs.
// We identify events by their Anchor log format: "Program data: <base64>"
// and decode using the program's IDL when available.
// For Sprint 3, we parse the structured log fields directly.

function parseAnchorLog(log: string): string | null {
  if (!log.startsWith(EVENT_LOG_PREFIX)) return null;
  return log.slice(EVENT_LOG_PREFIX.length);
}

/**
 * Extracts ReelBit token-launch events from a transaction's log messages.
 * Uses Helius's pre-parsed log format to avoid re-fetching the transaction.
 */
export async function extractTokenLaunchEvents(
  payload: HeliusWebhookPayload,
  connection: Connection,
): Promise<{ graduated?: SlotGraduatedEvent; bought?: TokensBoughtEvent }> {
  try {
    // Fetch full transaction for log messages
    const tx = await connection.getTransaction(payload.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx?.meta?.logMessages) return {};

    const result: { graduated?: SlotGraduatedEvent; bought?: TokensBoughtEvent } = {};
    const logs = tx.meta.logMessages;

    // Look for our program's event logs — presence of both program invocation
    // and "SlotGraduated" event is the signal. Full borsh decode added in Sprint 4
    // once IDL is deployed and @coral-xyz/anchor EventParser is wired up.
    for (const log of logs) {
      if (log.includes("SlotGraduated")) {
        // Extract mint from surrounding context logs (emitted by our program)
        // For now emit a placeholder with the tx's first non-fee-payer as mint
        const mintCandidates = payload.instructions
          .filter((ix) => ix.programId === config.tokenLaunchProgramId)
          .flatMap((ix) => ix.accounts)
          .filter(Boolean);

        if (mintCandidates[1]) {
          result.graduated = {
            mint: mintCandidates[1],
            creator: payload.feePayer,
            realSol: BigInt(0),
          };
        }
      }

      if (log.includes("TokensBought")) {
        const mintCandidates = payload.instructions
          .filter((ix) => ix.programId === config.tokenLaunchProgramId)
          .flatMap((ix) => ix.accounts);

        if (mintCandidates[1]) {
          result.bought = {
            mint: mintCandidates[1],
            buyer: payload.feePayer,
            solIn: BigInt(0),
            tokensOut: BigInt(0),
            realSol: BigInt(0),
            realTokens: BigInt(0),
          };
        }
      }
    }

    return result;
  } catch {
    return {};
  }
}
