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
import { getProfile, createProfile, updateProfile, isUsernameTaken, savePfpFile } from "./profileStore";
import type { HeliusWebhookPayload } from "./types";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use("/images", express.static(path.resolve(process.cwd(), "data/images")));
app.use("/pfp",    express.static(path.resolve(process.cwd(), "data/pfp")));

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

// ── Profile endpoints ─────────────────────────────────────────────────────────

app.get("/profile/:wallet", (req: Request, res: Response) => {
  const profile = getProfile(req.params.wallet);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

app.post("/profile", (req: Request, res: Response) => {
  const { wallet, username } = req.body as { wallet: string; username: string };
  if (!wallet || !username) return res.status(400).json({ error: "wallet and username required" });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: "Username must be 3–20 chars" });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username: letters, numbers, underscore only" });
  if (isUsernameTaken(username)) return res.status(409).json({ error: "Username already taken" });
  const profile = createProfile(wallet, username);
  res.status(201).json(profile);
});

app.patch("/profile/:wallet", (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { username } = req.body as { username: string };
  if (!username) return res.status(400).json({ error: "username required" });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: "Username must be 3–20 chars" });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username: letters, numbers, underscore only" });
  if (isUsernameTaken(username, wallet)) return res.status(409).json({ error: "Username already taken" });
  try {
    const profile = updateProfile(wallet, { username });
    res.json(profile);
  } catch (err) { res.status(404).json({ error: (err as Error).message }); }
});

app.post("/profile/:wallet/pfp/upload", (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { base64, ext } = req.body as { base64: string; ext: string };
  if (!base64 || !ext) return res.status(400).json({ error: "base64 and ext required" });
  if (base64.length > 5_000_000) return res.status(413).json({ error: "Image too large (max ~3.5 MB)" });
  if (!getProfile(wallet)) return res.status(404).json({ error: "Create a profile first" });
  try {
    const filename = savePfpFile(wallet, base64, ext);
    const pfpUrl = `${config.serverBaseUrl}/pfp/${filename}`;
    const profile = updateProfile(wallet, { pfpUrl, pfpType: "upload", nftMint: null });
    res.json(profile);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

app.post("/profile/:wallet/pfp/nft", async (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { mint } = req.body as { mint: string };
  if (!mint) return res.status(400).json({ error: "mint required" });
  if (!getProfile(wallet)) return res.status(404).json({ error: "Create a profile first" });
  try {
    const imageUrl = await fetchNftImage(mint);
    const profile = updateProfile(wallet, { pfpUrl: imageUrl, pfpType: "nft", nftMint: mint });
    res.json(profile);
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

async function fetchNftImage(mintAddress: string): Promise<string> {
  const key = config.heliusApiKey;
  if (!key) throw new Error("Helius API key not configured");
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "nft-pfp", method: "getAsset", params: { id: mintAddress } }),
  });
  const json = await res.json() as { result?: { content?: { links?: { image?: string }; files?: { uri?: string; cdn_uri?: string }[]; json_uri?: string } } };
  const content = json.result?.content;
  if (!content) throw new Error("NFT not found");

  const direct = content.links?.image ?? content.files?.[0]?.cdn_uri ?? content.files?.[0]?.uri;
  if (direct) return direct;

  if (content.json_uri) {
    const metaRes = await fetch(content.json_uri, { signal: AbortSignal.timeout(10_000) });
    const meta = await metaRes.json() as { image?: string };
    if (meta.image) return meta.image;
  }
  throw new Error("Could not extract image from NFT metadata");
}

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
