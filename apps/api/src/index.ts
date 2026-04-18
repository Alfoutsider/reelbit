import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { Connection } from "@solana/web3.js";
import { config } from "./config";
import { extractTokenLaunchEvents } from "./decoder";
import { handleGraduation } from "./migration";
import { getAllThemes, getTheme, getGraduatedThemes } from "./themeStore";
import { triggerThemeGeneration } from "./slotTheme";
import { getBalance, credit, debit, transfer, isSeenDeposit, markDepositSeen } from "./balanceStore";
import { getHouseWalletAddress, sendSol, verifyDepositTx } from "./houseWallet";
import type { HeliusWebhookPayload } from "./types";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use("/images", express.static(path.resolve(process.cwd(), "data/images")));

const connection = new Connection(config.rpcUrl, "confirmed");

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", ts: Date.now() });
});

// ── Theme endpoints ───────────────────────────────────────────────────────────

app.get("/themes", (_req: Request, res: Response) => {
  res.json(getAllThemes());
});

app.get("/themes/graduated", (_req: Request, res: Response) => {
  res.json(getGraduatedThemes());
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
  triggerThemeGeneration(mint, tokenName, tokenSymbol, false).catch(console.error);
});

// ── House wallet ──────────────────────────────────────────────────────────────

app.get("/house-wallet", (_req: Request, res: Response) => {
  res.json({ address: getHouseWalletAddress() });
});

// ── Balance endpoints ─────────────────────────────────────────────────────────

app.get("/balance/:wallet", (req: Request, res: Response) => {
  const balance = getBalance(req.params.wallet);
  res.json({ wallet: req.params.wallet, balance });
});

app.post("/deposit/confirm", async (req: Request, res: Response) => {
  const { txSignature, wallet } = req.body as { txSignature: string; wallet: string };
  if (!txSignature || !wallet) {
    return res.status(400).json({ error: "txSignature and wallet required" });
  }
  if (isSeenDeposit(txSignature)) {
    return res.status(409).json({ error: "This transaction has already been credited" });
  }
  try {
    const { lamports } = await verifyDepositTx(connection, txSignature);
    markDepositSeen(txSignature);
    const balance = credit(wallet, lamports);
    res.json({ balance, deposited: lamports });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/withdraw", async (req: Request, res: Response) => {
  const { wallet, lamports, destination } = req.body as {
    wallet: string;
    lamports: number;
    destination?: string;
  };
  if (!wallet || !lamports) {
    return res.status(400).json({ error: "wallet and lamports required" });
  }
  const to = destination ?? wallet;
  try {
    const newBalance = debit(wallet, lamports);
    const txSignature = await sendSol(connection, to, lamports);
    res.json({ txSignature, balance: newBalance });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post("/transfer", (req: Request, res: Response) => {
  const { from, to, lamports } = req.body as { from: string; to: string; lamports: number };
  if (!from || !to || !lamports) {
    return res.status(400).json({ error: "from, to, lamports required" });
  }
  try {
    transfer(from, to, lamports);
    res.json({ balance: getBalance(from) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── Internal endpoints (game-server ↔ api) ────────────────────────────────────

function requireInternal(req: Request, res: Response, next: NextFunction) {
  if (req.headers["x-internal-secret"] !== config.internalSecret) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

app.post("/internal/debit", requireInternal, (req: Request, res: Response) => {
  const { wallet, lamports } = req.body as { wallet: string; lamports: number };
  try {
    const balance = debit(wallet, lamports);
    res.json({ balance });
  } catch (err) {
    res.status(402).json({ error: (err as Error).message });
  }
});

app.post("/internal/credit", requireInternal, (req: Request, res: Response) => {
  const { wallet, lamports } = req.body as { wallet: string; lamports: number };
  const balance = credit(wallet, lamports);
  res.json({ balance });
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
        triggerThemeGeneration(
          events.graduated.mint,
          events.graduated.mint.slice(0, 8),
          "TOKEN",
          true,
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
