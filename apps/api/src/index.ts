import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { Connection } from "@solana/web3.js";
import { config } from "./config";
import { extractTokenLaunchEvents } from "./decoder";
import { handleGraduation } from "./migration";
import { getAllThemes, getTheme } from "./themeStore";
import { triggerThemeGeneration } from "./slotTheme";
import type { HeliusWebhookPayload } from "./types";

const app = express();
app.use(express.json({ limit: "10mb" }));

// Serve generated images
app.use("/images", express.static(path.resolve(process.cwd(), "data/images")));

const connection = new Connection(config.rpcUrl, "confirmed");

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", ts: Date.now() });
});

// ── Theme endpoints ───────────────────────────────────────────────────────────

app.get("/themes", (_req: Request, res: Response) => {
  res.json(getAllThemes());
});

app.get("/themes/:mint", (req: Request, res: Response) => {
  const theme = getTheme(req.params.mint);
  if (!theme) return res.status(404).json({ error: "Theme not found" });
  res.json(theme);
});

app.post("/themes/trigger", async (req: Request, res: Response) => {
  const { mint, tokenName, tokenSymbol } = req.body as Record<string, string>;
  if (!mint || !tokenName || !tokenSymbol) {
    return res.status(400).json({ error: "mint, tokenName, tokenSymbol required" });
  }
  res.json({ status: "generating" });
  triggerThemeGeneration(mint, tokenName, tokenSymbol).catch(console.error);
});

// ── Helius webhook ────────────────────────────────────────────────────────────

app.post("/webhooks/helius", async (req: Request, res: Response) => {
  const payloads: HeliusWebhookPayload[] = Array.isArray(req.body) ? req.body : [req.body];
  res.status(200).json({ received: payloads.length });

  for (const payload of payloads) {
    if (payload.transactionError) continue;
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
        // Fire-and-forget theme generation (name/symbol fetched off-chain in future sprint)
        triggerThemeGeneration(
          events.graduated.mint,
          events.graduated.mint.slice(0, 8),
          "TOKEN",
        ).catch(console.error);
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

app.listen(config.port, () => {
  console.log(`[api] ReelBit API running on port ${config.port}`);
});
