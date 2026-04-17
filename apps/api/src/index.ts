import express, { Request, Response, NextFunction } from "express";
import { Connection } from "@solana/web3.js";
import { config } from "./config";
import { extractTokenLaunchEvents } from "./decoder";
import { handleGraduation } from "./migration";
import type { HeliusWebhookPayload } from "./types";

const app = express();
app.use(express.json({ limit: "10mb" }));

const connection = new Connection(config.rpcUrl, "confirmed");

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", ts: Date.now() });
});

// ── Helius webhook endpoint ───────────────────────────────────────────────────
// Configure in Helius dashboard: POST https://<your-server>/webhooks/helius
// Transaction types: TOKEN_MINT, TRANSFER, UNKNOWN (catch-all for our programs)
// Address filter: token_launch program ID

app.post("/webhooks/helius", async (req: Request, res: Response) => {
  // Helius sends a JSON array of transactions
  const payloads: HeliusWebhookPayload[] = Array.isArray(req.body)
    ? req.body
    : [req.body];

  // Ack immediately — Helius retries on non-2xx
  res.status(200).json({ received: payloads.length });

  for (const payload of payloads) {
    if (payload.transactionError) continue;

    // Only process transactions that touched our token-launch program
    const touchesLaunch = payload.instructions.some(
      (ix) => ix.programId === config.tokenLaunchProgramId,
    );
    if (!touchesLaunch) continue;

    try {
      const events = await extractTokenLaunchEvents(payload, connection);

      if (events.bought) {
        const { mint, solIn, tokensOut, realSol } = events.bought;
        console.log(
          `[buy] ${mint.slice(0, 8)} — ${Number(solIn) / 1e9} SOL → ` +
          `${Number(tokensOut) / 1e6} tokens (vault: ${Number(realSol) / 1e9} SOL)`,
        );
      }

      if (events.graduated) {
        await handleGraduation(events.graduated, connection);
      }
    } catch (err) {
      console.error("[webhook] Error processing tx:", payload.signature, err);
    }
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`[api] ReelBit webhook server running on port ${config.port}`);
  console.log(`[api] RPC: ${config.rpcUrl}`);
  console.log(`[api] Watching program: ${config.tokenLaunchProgramId}`);
});
