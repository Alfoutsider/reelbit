import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createPublicKey, verify as cryptoVerify } from "crypto";
import { Connection, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { config } from "./config";
import { extractTokenLaunchEvents } from "./decoder";
import { handleGraduation } from "./migration";
import { getAllThemes, getTheme, getGraduatedThemes, getThemesByCreator, setTheme, deriveColors, markGraduated, assignRtp, setCreatorHoldRatio, setCustomAssets } from "./themeStore";
import type { SlotModel } from "./themeStore";
import { analyzeImage } from "./aiStudio";
import { apply as demoApply, approve as demoApprove, deny as demoDeny, getApplication, getAllApplications, isDemoUser, DEMO_CREDIT_USDC } from "./demoStore";
import { getFakeActivity, tickFakeBots } from "./fakeBots";
import { appendPricePoint, getPriceHistory } from "./priceHistoryStore";
import { triggerThemeGeneration, regenerateTheme } from "./slotTheme";
import { getPlayable, credit, debit, transfer, isSeenDeposit, markDepositSeen, forfeitBonus, getBonusStatus } from "./balanceStore";
import { getHouseKeypair, getHouseWalletAddress, sendSol, verifyDepositTx } from "./houseWallet";
import { getProfile, createProfile, updateProfile, getProfileByUserId, savePfpFile } from "./profileStore";
import type { HeliusWebhookPayload } from "./types";
import {
  fetchBondingCurveState,
  buildBuyInstruction,
  buildSellInstruction,
  buildUnsignedTx,
  calcTokensOut,
  calcSolOut,
  mcapSol,
  pricePerToken,
} from "./tradingApi";
import { startDistributionCron, FEE_SPLIT } from "./distributionCron";
import { startLpHarvestCron } from "./lpHarvestCron";
import { startHolderDividendCron } from "./holderDividendCron";
import { startMerkleDividendCron } from "./merkleDividendCron";
import { getUnclaimedForHolder } from "./dividendRoundStore";
import { startCreatorHoldingCron } from "./creatorHoldingCron";
import { getAllDividends, getDividend } from "./dividendStore";
import { startMcapWatcher, checkOneToken as checkOneTokenForGraduation } from "./mcapWatcher";
import { getSolUsdPrice, lamportsToUsdc, usdcToLamports } from "./pythPrice";
import { swapSolToUsdc, USDC_MINT } from "./jupiterSwap";
import { USDC_UNIT, applyWelcomeBonus, recordWagering, getBalance } from "./balanceStore";
import { recordTrade, getTradesForMint, getGlobalFeed, getVolume24h, getGlobalVolume24h, loadTrades, flushTrades } from "./tradeStore";
import { getComments, addComment, likeComment } from "./commentStore";
import { addSSEClient, broadcast } from "./sseEmitter";
import { isProcessed, markProcessed, requireHeliusSignature, validateWallet, validateMint } from "./webhookSecurity";
import { loggedFnf } from "./loggedFireAndForget";
import { getCreatorRevTier, computeRevTier } from "./creatorHoldingTracker";
import { getStripe } from "./stripeClient";
import {
  getOrCreateCode, registerReferral, getReferrerStats, getLeaderboard,
  onTrade as referralOnTrade, onTokenLaunch as referralOnLaunch, onGraduation as referralOnGraduation,
  onCasinoBet as referralOnCasinoBet,
  POINT_VALUES, TIER_THRESHOLDS,
} from "./referralService";
import {
  logTrade as analyticsLogTrade,
  logGraduation as analyticsLogGraduation,
  logTokenLaunched as analyticsLogTokenLaunched,
  logJackpotPayout as analyticsLogJackpotPayout,
  logCasinoSpin as analyticsLogCasinoSpin,
  getKPIs, getHourlyChart, getTopTokens, getRecentJackpots,
} from "./analyticsStore";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

const ALLOWED_ORIGINS = [
  "https://reelbit-fun.vercel.app",
  "https://reelbit-casino.vercel.app",
  process.env.ADMIN_URL ?? "",
  config.funUrl,
  config.frontendUrl,
  ...(!isProduction ? ["http://localhost:3000", "http://localhost:3002", "http://localhost:3003"] : []),
].filter(Boolean);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-admin-key,x-admin-code");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

// Capture raw body so we can HMAC-verify webhook payloads (Helius signs the
// exact bytes we received, so any reserialization breaks the check).
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

app.use("/images", express.static(path.join(config.dataDir, "images")));
app.use("/pfp",    express.static(path.join(config.dataDir, "pfp")));

const connection = new Connection(config.rpcUrl, "confirmed");

// ── Health ────────────────────────────────────────────────────────────────────

// Tracked elsewhere so /health/ready can surface webhook freshness.
let _lastWebhookAt = 0;
function markWebhookReceived() { _lastWebhookAt = Date.now(); }

// Cheap liveness probe — Render hits this every few seconds, must stay <50ms.
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", ts: Date.now() });
});

// Deeper readiness probe. Pings Supabase + RPC, reports last-webhook-at.
// Return 503 if anything critical is broken so a load balancer can route
// around a degraded instance during a partial outage.
app.get("/health/ready", async (_req: Request, res: Response) => {
  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {};
  const probe = async (name: string, fn: () => Promise<unknown>) => {
    const t0 = Date.now();
    try {
      await fn();
      checks[name] = { ok: true, ms: Date.now() - t0 };
    } catch (err) {
      checks[name] = { ok: false, ms: Date.now() - t0, error: (err as Error).message.slice(0, 200) };
    }
  };

  await Promise.all([
    probe("rpc",      () => connection.getSlot()),
    probe("supabase", async () => {
      // tiny no-op query — fastest healthcheck Postgres has.
      const { error } = await (await import("./supabase")).supabase.from("tokens").select("mint").limit(1);
      if (error) throw new Error(error.message);
    }),
  ]);

  const allOk = Object.values(checks).every((c) => c.ok);
  const webhookAgeSec = _lastWebhookAt ? Math.floor((Date.now() - _lastWebhookAt) / 1000) : null;

  res.status(allOk ? 200 : 503).json({
    status:   allOk ? "ready" : "degraded",
    ts:       Date.now(),
    uptime_s: Math.floor(process.uptime()),
    checks,
    webhook:  { lastAt: _lastWebhookAt || null, ageSec: webhookAgeSec },
  });
});

// ── Server-Sent Events (real-time feed) ───────────────────────────────────────

function sseHeaders(res: Response) {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering
  res.flushHeaders();
}

/** GET /feed/stream — global real-time feed (all tokens) */
app.get("/feed/stream", (req: Request, res: Response) => {
  sseHeaders(res);
  addSSEClient(res, null);
  res.write(": connected\n\n");
  const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch { clearInterval(ping); } }, 25_000);
  req.on("close", () => clearInterval(ping));
});

/** GET /tokens/:mint/stream — per-token real-time feed (trades + price) */
app.get("/tokens/:mint/stream", (req: Request, res: Response) => {
  sseHeaders(res);
  addSSEClient(res, req.params.mint);
  res.write(": connected\n\n");
  const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch { clearInterval(ping); } }, 25_000);
  req.on("close", () => clearInterval(ping));
});

// ── House wallet ──────────────────────────────────────────────────────────────

app.get("/house-wallet", (_req: Request, res: Response) => {
  res.json({ address: getHouseWalletAddress() });
});

// ── Registration ──────────────────────────────────────────────────────────────

app.post("/register", async (req: Request, res: Response) => {
  const { wallet, username, dob, cfToken } = req.body as {
    wallet: string; username: string; dob: string; cfToken?: string;
  };
  if (!wallet || !username || !dob)
    return res.status(400).json({ error: "wallet, username, and dob required" });

  // 18+ check
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) {
    return res.status(400).json({ error: "Invalid date of birth" });
  }
  const now   = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  if (age < 18) return res.status(403).json({ error: "Must be 18 or older to register" });

  // Cloudflare Turnstile verification (skip in dev if key not configured)
  if (config.turnstileSecretKey && cfToken) {
    try {
      const cfRes  = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    `secret=${config.turnstileSecretKey}&response=${cfToken}`,
      });
      const cfData = await cfRes.json() as { success: boolean };
      if (!cfData.success) return res.status(403).json({ error: "Bot verification failed" });
    } catch {
      if (process.env.NODE_ENV === "production")
        return res.status(503).json({ error: "Could not verify captcha" });
    }
  }

  const clean = username.trim();
  if (clean.length < 3 || clean.length > 32)
    return res.status(400).json({ error: "Username must be 3–32 characters" });

  if (await getProfile(wallet)) return res.status(409).json({ error: "Already registered" });

  try {
    const profile = await createProfile(wallet, clean);
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Theme endpoints ───────────────────────────────────────────────────────────

app.get("/themes", (_req: Request, res: Response) => {
  res.json(getAllThemes());
});

app.get("/themes/graduated", (_req: Request, res: Response) => {
  res.json(getGraduatedThemes());
});

app.get("/themes/:mint", validateMint, (req: Request, res: Response) => {
  const theme = getTheme(req.params.mint);
  if (!theme) return res.status(404).json({ error: "Theme not found" });
  res.json(theme);
});

// Used by game-server to load the assigned RTP when creating a spin session
app.get("/tokens/:mint/rtp", (req: Request, res: Response) => {
  const theme = getTheme(req.params.mint);
  if (!theme) return res.status(404).json({ error: "Token not found" });
  const BASE_RTP: Record<string, number> = {
    Classic3Reel: 0.96, Standard5Reel: 0.94, FiveReelFreeSpins: 0.92,
  };
  const rtp = theme.rtp ?? BASE_RTP[theme.slotModel] ?? 0.94;
  res.json({ mint: theme.mint, rtp, model: theme.slotModel });
});

app.post("/themes/trigger", requireAdmin, async (req: Request, res: Response) => {
  const { mint, tokenName, tokenSymbol } = req.body as Record<string, string>;
  if (!mint || !tokenName || !tokenSymbol) {
    return res.status(400).json({ error: "mint, tokenName, tokenSymbol required" });
  }
  res.json({ status: "generating" });
  triggerThemeGeneration(mint, tokenName, tokenSymbol, false).catch(console.error);
});

// ── AI Slot Studio ────────────────────────────────────────────────────────────

/** POST /studio/analyze — upload image, Claude vision → SVG symbols + palette */
app.post("/studio/analyze", async (req: Request, res: Response) => {
  const { base64, ext, mint } = req.body as { base64: string; ext: string; mint: string };
  if (!base64 || !ext || !mint) return res.status(400).json({ error: "base64, ext, and mint required" });
  if (base64.length > 10_000_000) return res.status(413).json({ error: "Image too large (max ~7.5 MB)" });
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";

  if (!config.anthropicApiKey) return res.status(503).json({ error: "AI Studio not configured" });

  const theme = getTheme(mint);
  if (!theme) return res.status(404).json({ error: "Slot not found" });

  try {
    const analysis = await analyzeImage(base64, safeExt, mint);
    res.json(analysis);
  } catch (err) {
    console.error("[studio] analyze error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /studio/apply — save custom assets to theme */
app.post("/studio/apply", (req: Request, res: Response) => {
  const { mint, themeDescription, palette, symbols, sourceImageUrl, bgImageUrl, bgPrompt } =
    req.body as {
      mint: string;
      themeDescription: string;
      palette: { primary: string; accent: string; bg: string };
      symbols: Record<string, string>;
      sourceImageUrl: string;
      bgImageUrl: string;
      bgPrompt: string;
    };

  if (!mint || !symbols) return res.status(400).json({ error: "mint and symbols required" });

  const theme = getTheme(mint);
  if (!theme) return res.status(404).json({ error: "Slot not found" });

  setCustomAssets(mint, {
    themeDescription: themeDescription ?? "",
    palette: palette ?? { primary: "#d4a017", accent: "#8b5cf6", bg: "#06060f" },
    symbols,
    sourceImageUrl: sourceImageUrl ?? "",
    bgImageUrl: bgImageUrl ?? "",
    bgPrompt: bgPrompt ?? "",
    generatedAt: Date.now(),
  });

  res.json({ ok: true, theme: getTheme(mint) });
});

/** DELETE /studio/reset/:mint — remove custom assets, restore default theme */
app.delete("/studio/reset/:mint", (req: Request, res: Response) => {
  const theme = getTheme(req.params.mint);
  if (!theme) return res.status(404).json({ error: "Slot not found" });
  setCustomAssets(req.params.mint, {
    themeDescription: "",
    palette: { primary: "#d4a017", accent: "#8b5cf6", bg: "#06060f" },
    symbols: {},
    sourceImageUrl: "",
    bgImageUrl: "",
    bgPrompt: "",
    generatedAt: 0,
  });
  res.json({ ok: true });
});

// ── Profile endpoints ─────────────────────────────────────────────────────────

app.get("/profile/by-id/:userId", async (req: Request, res: Response) => {
  const profile = await getProfileByUserId(req.params.userId);
  if (!profile) return res.status(404).json({ error: "User ID not found" });
  res.json(profile);
});

app.get("/profile/:wallet", validateWallet, async (req: Request, res: Response) => {
  const profile = await getProfile(req.params.wallet);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

app.post("/profile", async (req: Request, res: Response) => {
  const { wallet, username } = req.body as { wallet: string; username: string };
  if (!wallet || !username) return res.status(400).json({ error: "wallet and username required" });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: "Username must be 3–20 chars" });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username: letters, numbers, underscore only" });
  const profile = await createProfile(wallet, username);
  res.status(201).json(profile);
});

app.patch("/profile/:wallet", validateWallet, async (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { username } = req.body as { username: string };
  if (!username) return res.status(400).json({ error: "username required" });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ error: "Username must be 3–20 chars" });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username: letters, numbers, underscore only" });
  try {
    const profile = await updateProfile(wallet, { username });
    res.json(profile);
  } catch (err) { res.status(404).json({ error: (err as Error).message }); }
});

app.post("/upload/slot-image", (req: Request, res: Response) => {
  const { base64, ext } = req.body as { base64: string; ext: string };
  if (!base64 || !ext) return res.status(400).json({ error: "base64 and ext required" });
  if (base64.length > 5_000_000) return res.status(413).json({ error: "Image too large (max ~3.5 MB)" });
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
  try {
    const fs = require("fs") as typeof import("fs");
    const imagesDir = path.join(config.dataDir, "images");
    fs.mkdirSync(imagesDir, { recursive: true });
    const filename = `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
    fs.writeFileSync(path.join(imagesDir, filename), Buffer.from(base64, "base64"));
    res.json({ url: `${config.serverBaseUrl}/images/${filename}` });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

app.post("/profile/:wallet/pfp/upload", validateWallet, async (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { base64, ext } = req.body as { base64: string; ext: string };
  if (!base64 || !ext) return res.status(400).json({ error: "base64 and ext required" });
  if (base64.length > 5_000_000) return res.status(413).json({ error: "Image too large (max ~3.5 MB)" });
  if (!await getProfile(wallet)) return res.status(404).json({ error: "Create a profile first" });
  try {
    const pfpUrl = await savePfpFile(wallet, base64, ext);
    const profile = await updateProfile(wallet, { pfpUrl, pfpType: "upload", nftMint: null });
    res.json(profile);
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

app.post("/profile/:wallet/pfp/nft", validateWallet, async (req: Request, res: Response) => {
  const { wallet } = req.params;
  const { mint } = req.body as { mint: string };
  if (!mint) return res.status(400).json({ error: "mint required" });
  if (!await getProfile(wallet)) return res.status(404).json({ error: "Create a profile first" });
  try {
    const imageUrl = await fetchNftImage(mint);
    const profile = await updateProfile(wallet, { pfpUrl: imageUrl, pfpType: "nft", nftMint: mint });
    res.json(profile);
  } catch (err) { res.status(400).json({ error: (err as Error).message }); }
});

async function fetchNftImage(mintAddress: string): Promise<string> {
  const key = config.heliusApiKey;
  if (!key) throw new Error("Helius API key not configured");
  const res = await fetch(config.heliusDasUrl, {
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

// ── Metaplex token metadata JSON ──────────────────────────────────────────────
// Served as the `metadata_uri` during launch_slot so tokens appear in all wallets/DEXes.

app.get("/metadata/:mint", (req: Request, res: Response) => {
  const theme = getTheme(req.params.mint);
  if (!theme) return res.status(404).json({ error: "Token not found" });
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({
    name: theme.tokenName,
    symbol: theme.tokenSymbol,
    description: `${theme.tokenName} ($${theme.tokenSymbol}) — a slot token on ReelBit. Trade on reelbit.fun`,
    image: theme.heroImageUrl ?? "",
    external_url: `https://reelbit.fun/slot/${req.params.mint}`,
    attributes: [
      { trait_type: "Slot Model", value: theme.slotModel },
      { trait_type: "Platform", value: "ReelBit" },
      { trait_type: "Graduated", value: theme.graduated ? "Yes" : "No" },
    ],
  });
});

// Pre-register a token before launch so /metadata/:mint is ready for the Metaplex URI
app.post("/themes/register", requireInternal, (req: Request, res: Response) => {
  const { mint, tokenName, tokenSymbol, imageUri, description, model, creator, devBuyPct } = req.body as {
    mint: string; tokenName: string; tokenSymbol: string;
    imageUri?: string; description?: string; model?: string; creator?: string; devBuyPct?: number;
  };
  if (!mint || !tokenName || !tokenSymbol) {
    return res.status(400).json({ error: "mint, tokenName, tokenSymbol required" });
  }
  const existing = getTheme(mint);
  if (existing) return res.json(existing);

  const colors = deriveColors(tokenSymbol);
  const theme = {
    mint,
    tokenName,
    tokenSymbol,
    creator: creator ?? undefined,
    slotModel: (model ?? "Classic3Reel") as SlotModel,
    graduated: false,
    devBuyPct: devBuyPct && devBuyPct > 0 ? devBuyPct : undefined,
    status: "generating" as const,
    heroImageUrl: imageUri ?? null,
    bgImageUrl: null,
    primaryColor: colors.primary,
    accentColor: colors.accent,
    updatedAt: Date.now(),
  };
  setTheme(theme);
  // Referral: token_launch points for the creator's referrer (fire-and-forget)
  if (creator) loggedFnf(referralOnLaunch(creator, mint), "referral:launch", { mint, creator });
  res.status(201).json(theme);
});

app.get("/themes/by-creator/:wallet", validateWallet, (req: Request, res: Response) => {
  res.json(getThemesByCreator(req.params.wallet));
});

// ── Fee constants ─────────────────────────────────────────────────────────────
// All fees are borne by the user; the platform never absorbs swap or gas costs.

const DEPOSIT_FEE_BPS      = 30;                // 0.30% — covers Jupiter gas + Solana tx fee
const WITHDRAWAL_FEE_USDC  = 100_000;           // $0.10 flat — covers house SOL send tx fee
const TRANSFER_FEE_BPS     = 100;               // 1.00% platform revenue on every transfer

const PLATFORM_REVENUE_KEY = "PLATFORM_REVENUE"; // internal balance store key for platform fees

// ── Balance endpoints ─────────────────────────────────────────────────────────
// All internal balances are in USDC micro-units (1 USDC = 1_000_000).

app.get("/balance/:wallet", validateWallet, async (req: Request, res: Response) => {
  const entry = await getBalance(req.params.wallet);
  res.json({ wallet: req.params.wallet, ...entry });
});

/**
 * GET /bonus/status/:wallet
 * Returns the current welcome bonus state, wagering progress, and expiry.
 */
app.get("/bonus/status/:wallet", validateWallet, async (req: Request, res: Response) => {
  try {
    const status = await getBonusStatus(req.params.wallet);
    res.json({ wallet: req.params.wallet, ...status });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /bonus/forfeit
 * Body: { wallet }
 * Allows the player to voluntarily burn their active bonus so they can withdraw.
 */
app.post("/bonus/forfeit", async (req: Request, res: Response) => {
  const { wallet, signature } = req.body as { wallet: string; signature: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  if (!signature || !verifyWithdrawSignature(wallet, "reelbit-forfeit-bonus", signature)) {
    return res.status(401).json({ error: "Valid wallet signature required" });
  }
  try {
    const entry = await forfeitBonus(wallet);
    res.json({ ok: true, playable: entry.playable, bonusState: entry.bonusState });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** GET /sol-price — live SOL/USD from Pyth (used by wallet modal for conversion display) */
app.get("/sol-price", async (_req: Request, res: Response) => {
  const price = await getSolUsdPrice(connection);
  res.json({ price, mint: USDC_MINT });
});

/**
 * POST /deposit/confirm
 * Body: { txSignature, wallet }
 * 1. Verifies the SOL transfer to house wallet
 * 2. Swaps SOL → USDC via Jupiter
 * 3. Credits USDC balance
 * 4. Applies welcome bonus on first deposit (100% match, max $200, 45× wagering, 7-day expiry)
 */
app.post("/deposit/confirm", async (req: Request, res: Response) => {
  const { txSignature, wallet } = req.body as { txSignature: string; wallet: string };
  if (!txSignature || !wallet) {
    return res.status(400).json({ error: "txSignature and wallet required" });
  }
  if (await isSeenDeposit(txSignature)) {
    return res.status(409).json({ error: "This transaction has already been credited" });
  }
  try {
    const { lamports, depositor } = await verifyDepositTx(connection, txSignature);
    if (depositor !== wallet) {
      return res.status(403).json({ error: "Transaction was not sent from this wallet" });
    }

    // Swap the received SOL to USDC (Jupiter routing fee already embedded in outAmount)
    const usdcSwapped  = await swapSolToUsdc(connection, lamports);

    // Deduct deposit fee (covers Jupiter gas reimbursement + Solana tx cost)
    const depositFee   = Math.floor(usdcSwapped * DEPOSIT_FEE_BPS / 10_000);
    const usdcCredited = usdcSwapped - depositFee;

    // Platform collects the fee
    await credit(PLATFORM_REVENUE_KEY, depositFee);
    await credit(wallet, usdcCredited);
    await markDepositSeen(txSignature);

    // Welcome bonus — one-time, first deposit only
    const wasAlreadyClaimed = (await getBalance(wallet)).welcomeBonusClaimed;
    const bonusEntry        = await applyWelcomeBonus(wallet, usdcCredited);
    const bonusJustClaimed  = !wasAlreadyClaimed && bonusEntry.welcomeBonusClaimed;

    res.json({
      deposited:    usdcCredited,
      depositFee,
      balance:      bonusEntry.playable,
      bonus:        bonusEntry.bonus,
      bonusClaimed: bonusJustClaimed,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /deposit/stripe/intent
 * Creates a Stripe PaymentIntent for a card deposit.
 * Returns { clientSecret } — used by the frontend to render Stripe Elements.
 */
app.post("/deposit/stripe/intent", async (req: Request, res: Response) => {
  const { wallet, amountUsd } = req.body as { wallet: string; amountUsd: number };
  if (!wallet || !amountUsd) {
    return res.status(400).json({ error: "wallet and amountUsd required" });
  }
  if (amountUsd < 10 || amountUsd > 10_000) {
    return res.status(400).json({ error: "Deposit amount must be between $10 and $10,000" });
  }
  if (!config.stripeSecretKey) {
    return res.status(503).json({ error: "Card payments not configured" });
  }
  try {
    const pi = await getStripe().paymentIntents.create({
      amount: Math.round(amountUsd * 100),
      currency: "usd",
      metadata: { wallet, amountUsd: amountUsd.toString() },
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: pi.client_secret });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /deposit/stripe/webhook
 * Stripe sends this when a payment succeeds — we credit the user's USDC balance.
 * Uses rawBody (captured by the express.json verify callback) for signature verification.
 */
app.post("/deposit/stripe/webhook", async (req: Request, res: Response) => {
  const sig     = req.headers["stripe-signature"] as string;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody || !sig) {
    return res.status(400).json({ error: "Missing body or signature" });
  }
  if (!config.stripeWebhookSecret) {
    console.warn("[stripe] STRIPE_WEBHOOK_SECRET not set — rejecting webhook");
    return res.status(503).json({ error: "Webhook not configured" });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, config.stripeWebhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook verification failed: ${(err as Error).message}` });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as { metadata: Record<string, string>; amount_received: number; id: string };
    const wallet = pi.metadata?.wallet;
    if (!wallet) {
      console.error("[stripe] PaymentIntent succeeded but no wallet in metadata", pi.id);
      return res.status(400).json({ error: "No wallet in metadata" });
    }
    // Idempotency — ignore if we've already processed this PaymentIntent
    if (await isSeenDeposit(`stripe:${pi.id}`)) {
      return res.json({ received: true, skipped: true });
    }
    await markDepositSeen(`stripe:${pi.id}`);

    // amount_received is in cents; 1 cent = 10,000 USDC micro-units
    const usdcCredited = pi.amount_received * 10_000;
    await credit(wallet, usdcCredited);
    await credit(PLATFORM_REVENUE_KEY, 0); // fee absorbed by house (Stripe fee comes out of payout)

    const bonusEntry = await applyWelcomeBonus(wallet, usdcCredited);
    console.log(`[stripe] Credited $${(usdcCredited / USDC_UNIT).toFixed(2)} USDC to ${wallet} (${pi.id})`);

    broadcast("balance", { wallet, playable: bonusEntry.playable }, wallet);
  }

  res.json({ received: true });
});

/**
 * POST /withdraw/stripe
 * Bank/card withdrawal. Requires Stripe Connect (payouts to external accounts).
 * Currently scaffolded — returns 503 until Stripe Connect is configured.
 */
app.post("/withdraw/stripe", async (req: Request, res: Response) => {
  const { wallet } = req.body as { wallet: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  // Stripe Connect payouts require additional KYC and account setup.
  // This endpoint will be wired once Stripe Connect is live.
  return res.status(503).json({
    error: "Bank withdrawals are being set up",
    detail: "Crypto (SOL) withdrawals are available now. Bank withdrawals will be enabled once Stripe Connect onboarding is complete.",
    eta: "coming soon",
  });
});

// ed25519 SPKI header (DER) — prepended to the raw 32-byte Solana public key
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const WITHDRAW_SIG_TTL_MS = 5 * 60 * 1000; // 5 minutes

function verifyWithdrawSignature(wallet: string, message: string, signatureBase64: string): boolean {
  try {
    const pubkeyBytes = new PublicKey(wallet).toBytes();
    const spkiKey     = Buffer.concat([ED25519_SPKI_PREFIX, pubkeyBytes]);
    const publicKey   = createPublicKey({ key: spkiKey, format: "der", type: "spki" });
    return cryptoVerify(null, Buffer.from(message), publicKey, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}

/**
 * POST /withdraw
 * Body: { wallet, usdcUnits, destination?, signature, message }
 * Requires a wallet-signed message to prove key ownership — prevents session-only drains.
 * message format: "ReelBit withdrawal {usdcUnits} at {unixMs}"
 */
app.post("/withdraw", async (req: Request, res: Response) => {
  const { wallet, usdcUnits, destination, signature, message } = req.body as {
    wallet: string;
    usdcUnits: number;
    destination?: string;
    signature: string;
    message: string;
  };
  if (!wallet || !usdcUnits) {
    return res.status(400).json({ error: "wallet and usdcUnits required" });
  }
  if (!signature || !message) {
    return res.status(401).json({ error: "Wallet signature required for withdrawal" });
  }
  if (usdcUnits < USDC_UNIT || usdcUnits > 100_000 * USDC_UNIT) {
    return res.status(400).json({ error: "Withdraw amount must be between $1 and $100,000" });
  }
  if (destination && destination !== wallet) {
    return res.status(400).json({ error: "Withdrawal destination must match the source wallet" });
  }
  // Verify the signed message matches this exact withdrawal and is fresh
  const expected = `ReelBit withdrawal ${usdcUnits} at `;
  const tsMatch  = message.match(/at (\d+)$/);
  const ts       = tsMatch ? parseInt(tsMatch[1]) : 0;
  if (!message.startsWith(expected) || Date.now() - ts > WITHDRAW_SIG_TTL_MS) {
    return res.status(401).json({ error: "Withdrawal message invalid or expired" });
  }
  if (!verifyWithdrawSignature(wallet, message, signature)) {
    return res.status(401).json({ error: "Invalid wallet signature" });
  }
  if (await isDemoUser(wallet)) {
    return res.status(403).json({ error: "Demo balances cannot be withdrawn. Deposit real funds to unlock withdrawals." });
  }
  // Withdrawal gate — block while welcome bonus is active (anti-abuse)
  const bonusStatus = await getBonusStatus(wallet);
  if (bonusStatus.state === 'active') {
    return res.status(403).json({
      error:  "Withdrawal locked while welcome bonus is active.",
      detail: `Complete your ${bonusStatus.wageringRemaining.toLocaleString()} μUSDC wagering requirement first, or forfeit the bonus via POST /bonus/forfeit.`,
      bonus:  bonusStatus,
    });
  }
  const to = wallet;
  try {
    // Deduct flat withdrawal fee before converting — user pays the house gas cost
    const totalDebit     = usdcUnits + WITHDRAWAL_FEE_USDC;
    const entry          = await debit(wallet, totalDebit);
    await credit(PLATFORM_REVENUE_KEY, WITHDRAWAL_FEE_USDC);

    const lamports       = await usdcToLamports(connection, usdcUnits);
    const txSignature    = await sendSol(connection, to, lamports);
    res.json({ txSignature, balance: entry.playable, withdrawn: usdcUnits, withdrawalFee: WITHDRAWAL_FEE_USDC });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /transfer
 * Body: { from, toUserId, usdcUnits }
 * Instant internal transfer — no blockchain tx, no gas.
 */
app.post("/transfer", async (req: Request, res: Response) => {
  const { from, toUserId, usdcUnits, signature } = req.body as { from: string; toUserId: string; usdcUnits: number; signature: string };
  if (!from || !toUserId || !usdcUnits) {
    return res.status(400).json({ error: "from, toUserId, usdcUnits required" });
  }
  const message = `reelbit-transfer:${toUserId}:${usdcUnits}`;
  if (!signature || !verifyWithdrawSignature(from, message, signature)) {
    return res.status(401).json({ error: "Valid wallet signature required" });
  }
  if (await isDemoUser(from)) {
    return res.status(403).json({ error: "Demo balances cannot be transferred. Deposit real funds to unlock transfers." });
  }
  const recipient = await getProfileByUserId(toUserId);
  if (!recipient) return res.status(404).json({ error: `User #${toUserId.replace(/^#/, "")} not found` });
  if (recipient.wallet === from) return res.status(400).json({ error: "Cannot transfer to yourself" });
  try {
    // 1% platform tax deducted from sender before the transfer
    const platformCut  = Math.floor(usdcUnits * TRANSFER_FEE_BPS / 10_000);
    const netTransfer  = usdcUnits - platformCut;

    // Debit full amount from sender, credit net to recipient and fee to platform
    await debit(from, usdcUnits);
    await credit(recipient.wallet, netTransfer);
    await credit(PLATFORM_REVENUE_KEY, platformCut);

    res.json({
      balance:     await getPlayable(from),
      transferred: netTransfer,
      transferFee: platformCut,
      recipient:   { userId: recipient.userId, username: recipient.username },
    });
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

app.post("/internal/debit", requireInternal, async (req: Request, res: Response) => {
  const { wallet, usdcUnits } = req.body as { wallet: string; usdcUnits: number };
  try {
    const entry = await debit(wallet, usdcUnits);
    await recordWagering(wallet, usdcUnits); // track toward bonus wagering requirement
    // Referral: casino first-spin + wagering points (fire-and-forget)
    loggedFnf(referralOnCasinoBet(wallet, usdcUnits), "referral:casinoBet", { wallet, usdcUnits });
    res.json({ balance: entry.playable, bonus: entry.bonus });
  } catch (err) {
    res.status(402).json({ error: (err as Error).message });
  }
});

app.post("/internal/credit", requireInternal, async (req: Request, res: Response) => {
  const { wallet, usdcUnits } = req.body as { wallet: string; usdcUnits: number };
  const entry = await credit(wallet, usdcUnits);
  res.json({ balance: entry.playable, bonus: entry.bonus });
});

// Discriminator: sha256("global:pay_jackpot")[0..8] = [162,254,59,123,187,96,225,171]
const PAY_JACKPOT_DISCRIMINATOR = Buffer.from([162, 254, 59, 123, 187, 96, 225, 171]);
const TOKEN_LAUNCH_PROGRAM_ID   = new PublicKey(config.tokenLaunchProgramId);

function buildPayJackpotInstruction(mint: PublicKey, winner: PublicKey): TransactionInstruction {
  const authority = getHouseKeypair().publicKey;

  const [platformConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    TOKEN_LAUNCH_PROGRAM_ID,
  );
  const [jackpotVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("jackpot_vault"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM_ID,
  );

  return new TransactionInstruction({
    programId: TOKEN_LAUNCH_PROGRAM_ID,
    data: PAY_JACKPOT_DISCRIMINATOR,
    keys: [
      { pubkey: authority,      isSigner: true,  isWritable: true  }, // authority
      { pubkey: mint,           isSigner: false, isWritable: false }, // mint
      { pubkey: platformConfig, isSigner: false, isWritable: false }, // platform_config
      { pubkey: jackpotVault,   isSigner: false, isWritable: true  }, // jackpot_vault
      { pubkey: winner,         isSigner: false, isWritable: true  }, // winner
      { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false }, // system_program
    ],
  });
}

const JACKPOT_KEY = "JACKPOT_POOL"; // internal accumulator for slot house-edge contributions

/**
 * POST /internal/jackpot-fund
 * Called by the game-server after each spin with the house-edge portion (4% of bet).
 * Accumulates off-chain; the on-chain jackpot vault is funded separately by distributionCron.
 */
app.post("/internal/jackpot-fund", requireInternal, async (req: Request, res: Response) => {
  const { usdcUnits } = req.body as { usdcUnits: number };
  if (!usdcUnits || usdcUnits <= 0) return res.status(400).json({ error: "usdcUnits required" });
  await credit(JACKPOT_KEY, usdcUnits);
  loggedFnf(analyticsLogCasinoSpin(usdcUnits), "analytics:casinoSpin", { usdcUnits });
  const entry = await getBalance(JACKPOT_KEY);
  res.json({ poolBalance: entry.playable });
});

/** GET /jackpot/pool — public endpoint so frontends can display the jackpot size */
app.get("/jackpot/pool", async (_req: Request, res: Response) => {
  const entry = await getBalance(JACKPOT_KEY);
  res.json({ usdcUnits: entry.playable });
});

app.post("/internal/jackpot-won", requireInternal, async (req: Request, res: Response) => {
  const { wallet, mint: mintStr } = req.body as { wallet: string; mint: string; sessionId: string };
  if (!wallet || !mintStr) {
    return res.status(400).json({ error: "wallet and mint required" });
  }

  let mint: PublicKey;
  let winner: PublicKey;
  try {
    mint   = new PublicKey(mintStr);
    winner = new PublicKey(wallet);
  } catch {
    return res.status(400).json({ error: "Invalid mint or wallet address" });
  }

  try {
    const keypair = getHouseKeypair();
    const ix      = buildPayJackpotInstruction(mint, winner);
    const tx      = new Transaction().add(ix);
    const txSignature = await sendAndConfirmTransaction(connection, tx, [keypair]);
    console.log(`[jackpot] Paid jackpot to ${wallet} for mint ${mintStr} — ${txSignature}`);
    const poolEntry = await getBalance(JACKPOT_KEY);
    await debit(JACKPOT_KEY, poolEntry.playable);
    loggedFnf(
      analyticsLogJackpotPayout({
        txSig:        txSignature,
        mint:         mintStr,
        winnerWallet: wallet,
        usdcUnits:    poolEntry.playable,
      }),
      "analytics:jackpotPayout",
      { mint: mintStr, sig: txSignature },
    );
    res.json({ txSignature });
  } catch (err) {
    console.error("[jackpot] pay_jackpot failed:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Helius webhook ────────────────────────────────────────────────────────────

app.post("/webhooks/helius", requireHeliusSignature, async (req: Request, res: Response) => {
  markWebhookReceived();
  const payloads: HeliusWebhookPayload[] = Array.isArray(req.body) ? req.body : [req.body];
  res.status(200).json({ received: payloads.length });

  for (const payload of payloads) {
    if (payload.transactionError) continue;

    // Helius retries failed deliveries; without dedupe we'd record the same
    // trade twice and double-broadcast. Signatures are unique per tx.
    if (payload.signature && isProcessed(payload.signature)) {
      continue;
    }

    const touchesLaunch = payload.instructions.some(
      (ix) => ix.programId === config.tokenLaunchProgramId,
    );
    if (!touchesLaunch) continue;

    if (payload.signature) markProcessed(payload.signature);

    try {
      const events = await extractTokenLaunchEvents(payload, connection);

      if (events.bought) {
        const { mint, solIn, tokensOut, realSol } = events.bought;
        console.log(
          `[buy] ${mint.slice(0, 8)} — ${Number(solIn) / 1e9} SOL → ` +
          `${Number(tokensOut) / 1e6} tokens (vault: ${Number(realSol) / 1e9} SOL)`,
        );
        // Snapshot price history for chart on every confirmed trade
        try {
          const mintPk  = new PublicKey(mint);
          const curve   = await fetchBondingCurveState(connection, mintPk);
          if (curve) {
            const vs       = curve.virtualSol;
            const vt       = curve.virtualTokens;
            const solPrice = await getSolUsdPrice(connection);
            const priceSol = pricePerToken(vs, vt);
            const mcap     = mcapSol(vs, vt) * solPrice;
            const pricePoint = {
              ts:              Date.now(),
              priceUsd:        priceSol * solPrice * 1e9,
              mcapUsd:         mcap,
              realSolLamports: Number(curve.realSol),
              progressPct:     Math.min(100, Math.round(Number(curve.realSol) / 85_000_000_000 * 100)),
            };
            appendPricePoint(mint, pricePoint);
            broadcast("price", pricePoint, mint);

            // Record the trade event for the trade feed
            if (events.bought) {
              const tradeEvent = {
                txSig:       payload.signature,
                mint,
                type:        "buy" as const,
                wallet:      events.bought.buyer ?? "unknown",
                solAmount:   Number(events.bought.solIn) / 1e9,
                tokenAmount: Number(events.bought.tokensOut),
                usdValue:    (Number(events.bought.solIn) / 1e9) * solPrice,
                timestamp:   Date.now(),
              };
              recordTrade(tradeEvent);
              broadcast("trade", tradeEvent, mint);
              broadcast("trade", tradeEvent, null);
              loggedFnf(analyticsLogTrade(tradeEvent), "analytics:trade", { mint, sig: payload.signature });
              // Referral: award points to referrer of this buyer (fire-and-forget)
              loggedFnf(
                referralOnTrade(tradeEvent.wallet, mint, tradeEvent.solAmount, payload.signature),
                "referral:trade",
                { mint, wallet: tradeEvent.wallet },
              );
              // Instant graduation check — don't wait for the next 5s poll
              // if this trade just crossed $100k MCap.
              loggedFnf(checkOneTokenForGraduation(connection, mint), "graduation:check", { mint });
            }
          }
        } catch {}
      }

      if (events.graduated) {
        // Mark graduated in theme store and assign a permanent RTP before DLMM migration
        const existingTheme = getTheme(events.graduated.mint);
        const model: SlotModel = (existingTheme?.slotModel ?? "Classic3Reel") as SlotModel;
        markGraduated(events.graduated.mint, model);
        assignRtp(events.graduated.mint, model);

        // Push the event to the casino lobby immediately. The slot's art is
        // still generating in the background (see triggerThemeGeneration); the
        // lobby renders a placeholder until a follow-up theme:ready event fires
        // from setTheme() inside slotTheme.ts.
        const broadcastTheme = getTheme(events.graduated.mint) ?? existingTheme;
        broadcast("theme:graduated", {
          mint:        events.graduated.mint,
          tokenName:   broadcastTheme?.tokenName,
          tokenSymbol: broadcastTheme?.tokenSymbol,
          slotModel:   model,
          ts:          Date.now(),
        });

        await handleGraduation(events.graduated, connection);
        loggedFnf(analyticsLogGraduation(events.graduated.mint), "analytics:graduation", { mint: events.graduated.mint });
        // Referral: graduation bonus for the creator's referrer
        loggedFnf(
          referralOnGraduation(events.graduated.creator, events.graduated.mint),
          "referral:graduation",
          { mint: events.graduated.mint, creator: events.graduated.creator },
        );
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

// ── Fee info ──────────────────────────────────────────────────────────────────
// Returns current fee architecture so frontends can display it accurately.

app.get("/fees/info", (_req: Request, res: Response) => {
  res.json({
    prebond: {
      tiers: [
        { progressPct: "0–20",  feeBps: 200, feeDisplay: "2.0%" },
        { progressPct: "20–60", feeBps: 150, feeDisplay: "1.5%" },
        { progressPct: "60–100",feeBps: 100, feeDisplay: "1.0%" },
      ],
      description: "Fee rate decreases as token approaches graduation — rewards the final push",
    },
    postbond: {
      source: "Meteora DLMM dynamic LP fees",
      description: "LP fees harvested every 24h and split via same structure",
    },
    split: FEE_SPLIT,
    distributionInterval: "30 minutes (minimum)",
    distributionThreshold: "0.05 SOL minimum to trigger distribution",
    jackpotExpiry: {
      days: 30,
      rule: "If token does not graduate within 30 days, the 30% jackpot allocation redirects to platform. Creator still receives 25% indefinitely.",
    },
    graduation: {
      threshold: "85 SOL in bonding curve vault",
      platformSponsorship: "Platform tops up jackpot to minimum $3,000 USD value if 30-day window elapsed before graduation",
    },
  });
});

// ── Graduation ETA helper ─────────────────────────────────────────────────────

/**
 * Estimates time-to-graduation in milliseconds based on recent SOL inflow rate.
 * Uses the last 6 hours of buy trade volume. Returns null if not enough data.
 */
function graduationEta(mint: string, realSolLamports: number): number | null {
  const GRADUATION_LAMPORTS = 85_000_000_000; // 85 SOL
  const remaining = GRADUATION_LAMPORTS - realSolLamports;
  if (remaining <= 0) return 0;

  // Use buy trades in the last 6 hours to estimate SOL inflow rate
  const windowMs  = 6 * 60 * 60 * 1_000;
  const cutoff    = Date.now() - windowMs;
  const recent    = getTradesForMint(mint, 1000).filter(
    (t) => t.type === "buy" && t.timestamp >= cutoff,
  );
  if (recent.length < 2) return null;

  const totalSolIn = recent.reduce((s, t) => s + t.solAmount, 0);
  const solPerMs   = totalSolIn / windowMs; // average SOL/ms inflow rate
  if (solPerMs <= 0) return null;

  const remainingSol = remaining / 1_000_000_000;
  return Math.round(remainingSol / solPerMs); // estimated ms to graduation
}

// ── Pre-graduation trading API (pump.fun-compatible) ─────────────────────────
//
// Trading terminals (Photon, Bullx, Trojan, BonkBot) call these endpoints to
// discover tokens and build transactions they sign + submit directly.
//
// GET  /tokens              — list all bonding-curve tokens with price/mcap
// GET  /tokens/:mint        — single token with live on-chain curve state
// POST /tokens/:mint/buy    — returns unsigned base64 tx (caller signs + sends)
// POST /tokens/:mint/sell   — returns unsigned base64 tx (caller signs + sends)

/**
 * GET /tokens
 * Query params:
 *   q       — search by name, symbol, or creator address (case-insensitive)
 *   sort    — "trending" (default) | "new" | "graduating"
 *   limit   — max results (default 50, max 200)
 *   offset  — pagination offset (default 0)
 *
 * Trending score = 60% volume24h (USD) + 30% progressPct (0–100 normalised to USD scale) + 10% recency bonus
 */
app.get("/tokens", (req: Request, res: Response) => {
  const q      = ((req.query.q as string) ?? "").toLowerCase().trim();
  const sort   = (req.query.sort as string) ?? "trending";
  const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit  as string) || 50));
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
  // Optional filters. age=1h|24h|7d caps how recent the token must be.
  // minMcap / maxMcap are USD bounds. NaN/negative values pass through (no filter).
  const ageWindow = (req.query.age as string) ?? "";
  const minMcap   = parseFloat((req.query.minMcap as string) ?? "");
  const maxMcap   = parseFloat((req.query.maxMcap as string) ?? "");
  const ageCutoff =
    ageWindow === "1h"  ? Date.now() - 3_600_000 :
    ageWindow === "24h" ? Date.now() - 86_400_000 :
    ageWindow === "7d"  ? Date.now() - 7 * 86_400_000 :
    0;

  const themes = getAllThemes().filter((t) => !t.graduated);

  // Enrich with live data from stores (no chain calls)
  const enriched = themes.map((t) => {
    const history    = getPriceHistory(t.mint, 1);
    const latest     = history[history.length - 1];
    const vol24h     = getVolume24h(t.mint);
    const progressPct = latest?.progressPct ?? 0;
    const ageMs      = Date.now() - (t.updatedAt ?? 0);
    const ageHours   = ageMs / 3_600_000;
    // Recency bonus: full score for tokens < 6h old, fades over 72h
    const recencyBonus = Math.max(0, 1 - ageHours / 72) * 10_000;
    const trendingScore = vol24h * 0.6 + progressPct * 400 * 0.3 + recencyBonus * 0.1;

    const holdRatio    = t.creatorHoldRatio ?? 1;
    const hasMinDevBuy = t.devHasMinBuy ?? false;
    const revTier      = computeRevTier(holdRatio, hasMinDevBuy);

    return {
      mint:             t.mint,
      name:             t.tokenName,
      symbol:           t.tokenSymbol,
      model:            t.slotModel,
      image:            t.heroImageUrl ?? "",
      graduated:        t.graduated,
      devBuyPct:        t.devBuyPct ?? 0,
      creator:          t.creator ?? "",
      mcapUsd:          latest?.mcapUsd  ?? 0,
      priceUsd:         latest?.priceUsd ?? 0,
      volume24h:        vol24h,
      progressPct,
      createdAt:        t.updatedAt,
      trendingScore,
      creatorHoldRatio:  holdRatio,
      creatorStatus:     revTier.label,
      creatorRevPct:     Math.round(revTier.creatorPct * 100),
      creatorHasMinBuy:  hasMinDevBuy,
      metadataUri:      `${config.serverBaseUrl}/metadata/${t.mint}`,
      program:          config.tokenLaunchProgramId,
    };
  });

  // Filter — text + numeric filters compose so the user can stack them.
  let filtered = q
    ? enriched.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.creator.toLowerCase().includes(q),
      )
    : enriched;

  if (ageCutoff > 0) {
    filtered = filtered.filter((t) => (t.createdAt ?? 0) >= ageCutoff);
  }
  if (Number.isFinite(minMcap) && minMcap > 0) {
    filtered = filtered.filter((t) => t.mcapUsd >= minMcap);
  }
  if (Number.isFinite(maxMcap) && maxMcap > 0) {
    filtered = filtered.filter((t) => t.mcapUsd <= maxMcap);
  }

  // Sort
  if (sort === "new")        filtered.sort((a, b) => b.createdAt - a.createdAt);
  else if (sort === "graduating") filtered.sort((a, b) => b.progressPct - a.progressPct);
  else                       filtered.sort((a, b) => b.trendingScore - a.trendingScore); // "trending"

  const total = filtered.length;
  const page  = filtered.slice(offset, offset + limit);
  res.json({ total, limit, offset, tokens: page });
});

app.get("/tokens/:mint", async (req: Request, res: Response) => {
  const { mint: mintStr } = req.params;
  let mint: PublicKey;
  try { mint = new PublicKey(mintStr); } catch { return res.status(400).json({ error: "Invalid mint address" }); }

  const theme = getTheme(mintStr);
  if (!theme) return res.status(404).json({ error: "Token not found" });

  const curve = await fetchBondingCurveState(connection, mint);
  const vs = curve?.virtualSol   ?? BigInt(30 * 1_000_000_000);
  const vt = curve?.virtualTokens ?? BigInt("1073000191000000");
  const rs = curve?.realSol      ?? 0n;

  // Creator tier: use cached value; fire-and-forget refresh if stale
  const HOLD_CACHE_TTL  = 30 * 60 * 1_000;
  const hasMinDevBuy    = theme.devHasMinBuy ?? false;
  let creatorTier       = computeRevTier(theme.creatorHoldRatio ?? 1, hasMinDevBuy);
  const cacheAge        = Date.now() - (theme.creatorHoldCheckedAt ?? 0);
  if (theme.creator && theme.devBuyPct && cacheAge > HOLD_CACHE_TTL) {
    loggedFnf(
      getCreatorRevTier(theme.creator, mintStr, theme.devBuyPct, hasMinDevBuy, connection)
        .then((t) => setCreatorHoldRatio(mintStr, t.holdRatio)),
      "creatorHoldRatio:refresh",
      { mint: mintStr },
    );
  }

  res.json({
    mint:           mintStr,
    name:           theme.tokenName,
    symbol:         theme.tokenSymbol,
    model:          theme.slotModel,
    image:          theme.heroImageUrl ?? "",
    description:    `${theme.tokenName} ($${theme.tokenSymbol}) — slot token on ReelBit`,
    graduated:      theme.graduated,
    devBuyPct:      theme.devBuyPct ?? 0,
    metadataUri:    `${config.serverBaseUrl}/metadata/${mintStr}`,
    program:        config.tokenLaunchProgramId,
    creator: {
      wallet:         theme.creator ?? null,
      hasMinDevBuy,
      holdRatio:      creatorTier.holdRatio,
      holdPct:        Math.round(creatorTier.holdRatio * 100),
      revenuePct:     Math.round(creatorTier.creatorPct * 100),
      holderBonusPct: Math.round(creatorTier.holderBonusPct * 100),
      status:         creatorTier.label,
    },
    bondingCurve: curve ? {
      creator:       curve.creator.toBase58(),
      virtualSol:    curve.virtualSol.toString(),
      virtualTokens: curve.virtualTokens.toString(),
      realSol:       curve.realSol.toString(),
      realTokens:    curve.realTokens.toString(),
      pricePerTokenSol:  pricePerToken(vs, vt),
      mcapSol:           mcapSol(vs, vt),
      progressPct:       Math.min(100, Math.round(Number(rs) / 85_000_000_000 * 100)),
      graduationEtaMs:   graduationEta(mintStr, Number(rs)),
    } : null,
  });
});

/** GET /tokens/:mint/chart?limit=200 — price history time-series for chart */
app.get("/tokens/:mint/chart", (req: Request, res: Response) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 200));
  res.json(getPriceHistory(req.params.mint, limit));
});

/** GET /tokens/:mint/trades?limit=50 — recent trades for this token */
app.get("/tokens/:mint/trades", (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  res.json(getTradesForMint(req.params.mint, limit));
});

/** GET /feed/trades?limit=50 — global trade feed across all tokens */
app.get("/feed/trades", (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  res.json(getGlobalFeed(limit));
});

// ── Holder list ───────────────────────────────────────────────────────────────

const HELIUS_DAS_URL = config.heliusDasUrl;

/** GET /tokens/:mint/holders?limit=50 — top token holders via Helius DAS */
app.get("/tokens/:mint/holders", async (req: Request, res: Response) => {
  const { mint } = req.params;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

  if (!config.heliusApiKey) {
    return res.json([]); // gracefully degrade without API key
  }

  try {
    const body = {
      jsonrpc: "2.0",
      id:      "holders",
      method:  "getTokenAccounts",
      params:  { mint, limit, page: 1, options: { showZeroBalance: false } },
    };
    const r = await fetch(HELIUS_DAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return res.json([]);

    const data = await r.json() as {
      result?: { token_accounts: Array<{ owner: string; amount: string }> };
    };
    const accounts = data.result?.token_accounts ?? [];
    const total = accounts.reduce((s, a) => s + BigInt(a.amount), 0n);

    const holders = accounts
      .filter((a) => BigInt(a.amount) > 0n)
      .map((a) => ({
        wallet:  a.owner,
        amount:  Number(BigInt(a.amount)) / 1_000_000,
        pct:     total > 0n ? Number(BigInt(a.amount) * 10_000n / total) / 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    res.json(holders);
  } catch {
    res.json([]);
  }
});

// ── Portfolio ─────────────────────────────────────────────────────────────────

/**
 * GET /portfolio/:wallet
 * Returns all ReelBit token positions held by a wallet.
 * Uses on-chain getParsedTokenAccountsByOwner — no Helius key required.
 */
app.get("/portfolio/:wallet", async (req: Request, res: Response) => {
  let walletPubkey: PublicKey;
  try { walletPubkey = new PublicKey(req.params.wallet); }
  catch { return res.status(400).json({ error: "Invalid wallet address" }); }

  // Build a lookup of all known ReelBit mints
  const themes = getAllThemes();
  const mintIndex = new Map(themes.map((t) => [t.mint, t]));
  if (mintIndex.size === 0) return res.json([]);

  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
      programId: TOKEN_PROGRAM_ID,
    });

    const positions = [];
    const TOTAL_SUPPLY = 1_000_000_000; // 1B tokens (6 decimals)

    for (const { account } of accounts.value) {
      const info = account.data.parsed?.info;
      if (!info) continue;
      const mint    = info.mint as string;
      const balance = Number(info.tokenAmount?.amount ?? 0) / 1_000_000; // raw → decimal
      if (balance <= 0) continue;

      const theme = mintIndex.get(mint);
      if (!theme) continue; // not a ReelBit token

      const history     = getPriceHistory(mint, 1);
      const latest      = history[history.length - 1];
      const priceUsd    = latest?.priceUsd    ?? 0;
      const mcapUsd     = latest?.mcapUsd     ?? 0;
      const progressPct = latest?.progressPct ?? 0;
      const valueUsd    = balance * priceUsd;
      const supplyPct   = (balance / TOTAL_SUPPLY) * 100;

      positions.push({
        mint,
        tokenName:   theme.tokenName,
        tokenSymbol: theme.tokenSymbol,
        slotModel:   theme.slotModel,
        heroImageUrl: theme.heroImageUrl,
        primaryColor: theme.primaryColor,
        accentColor:  theme.accentColor,
        graduated:    theme.graduated,
        balance,
        supplyPct,
        valueUsd,
        priceUsd,
        mcapUsd,
        progressPct,
      });
    }

    // Sort by USD value descending
    positions.sort((a, b) => b.valueUsd - a.valueUsd);
    res.json(positions);
  } catch (err) {
    console.error("[portfolio]", err);
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

// ── Comments ──────────────────────────────────────────────────────────────────

/** GET /tokens/:mint/comments?limit=100 */
app.get("/tokens/:mint/comments", (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
  res.json(getComments(req.params.mint, limit));
});

/** POST /tokens/:mint/comments  { wallet, text } */
app.post("/tokens/:mint/comments", (req: Request, res: Response) => {
  const { wallet, text } = req.body as { wallet?: string; text?: string };
  if (!wallet || !text?.trim()) {
    return res.status(400).json({ error: "wallet and text required" });
  }
  try {
    const comment = addComment(req.params.mint, wallet, text);
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** POST /tokens/:mint/comments/:id/like */
app.post("/tokens/:mint/comments/:id/like", (req: Request, res: Response) => {
  const ok = likeComment(req.params.mint, req.params.id);
  if (!ok) return res.status(404).json({ error: "Comment not found" });
  res.json({ ok: true });
});

/**
 * Build an unsigned buy transaction.
 * Body: { wallet: string, solAmount: string|number, slippageBps?: number }
 * Returns: { transaction: "<base64>", tokensOut: string, minTokensOut: string }
 */
app.post("/tokens/:mint/buy", async (req: Request, res: Response) => {
  const { mint: mintStr } = req.params;
  const { wallet, solAmount, slippageBps = 100 } = req.body as {
    wallet: string; solAmount: string | number; slippageBps?: number;
  };

  if (!wallet || !solAmount) return res.status(400).json({ error: "wallet and solAmount required" });

  let mint: PublicKey;
  let buyer: PublicKey;
  try { mint = new PublicKey(mintStr); buyer = new PublicKey(wallet); }
  catch { return res.status(400).json({ error: "Invalid mint or wallet address" }); }

  const solNum = Number(solAmount);
  if (!Number.isFinite(solNum) || solNum <= 0 || solNum > 1e18) {
    return res.status(400).json({ error: "solAmount out of range" });
  }
  const solLamports = BigInt(Math.round(solNum));

  const curve = await fetchBondingCurveState(connection, mint);
  if (!curve) return res.status(404).json({ error: "Bonding curve not found for this mint" });
  if (curve.graduated) return res.status(400).json({ error: "Token has graduated — trade on DEX" });

  const tokensOut    = calcTokensOut(curve.virtualSol, curve.virtualTokens, solLamports);
  const minTokensOut = (tokensOut * BigInt(10_000 - slippageBps)) / 10_000n;

  const ix = buildBuyInstruction(mint, buyer, curve.creator, solLamports, minTokensOut);
  const transaction = await buildUnsignedTx(connection, ix, buyer);

  res.json({ transaction, tokensOut: tokensOut.toString(), minTokensOut: minTokensOut.toString() });
});

/**
 * Build an unsigned sell transaction.
 * Body: { wallet: string, tokenAmount: string|number, slippageBps?: number }
 * Returns: { transaction: "<base64>", solOut: string, minSolOut: string }
 */
app.post("/tokens/:mint/sell", async (req: Request, res: Response) => {
  const { mint: mintStr } = req.params;
  const { wallet, tokenAmount, slippageBps = 100 } = req.body as {
    wallet: string; tokenAmount: string | number; slippageBps?: number;
  };

  if (!wallet || !tokenAmount) return res.status(400).json({ error: "wallet and tokenAmount required" });

  let mint: PublicKey;
  let seller: PublicKey;
  try { mint = new PublicKey(mintStr); seller = new PublicKey(wallet); }
  catch { return res.status(400).json({ error: "Invalid mint or wallet address" }); }

  const tokenNum = Number(tokenAmount);
  if (!Number.isFinite(tokenNum) || tokenNum <= 0 || tokenNum > 1e18) {
    return res.status(400).json({ error: "tokenAmount out of range" });
  }
  const rawTokens = BigInt(Math.round(tokenNum));

  const curve = await fetchBondingCurveState(connection, mint);
  if (!curve) return res.status(404).json({ error: "Bonding curve not found for this mint" });
  if (curve.graduated) return res.status(400).json({ error: "Token has graduated — trade on DEX" });

  const grossSol  = calcSolOut(curve.virtualSol, curve.virtualTokens, rawTokens);
  const creatorFee = (grossSol * 50n) / 10_000n;
  const netSol    = grossSol - creatorFee * 2n;
  const minSolOut = (netSol * BigInt(10_000 - slippageBps)) / 10_000n;

  const ix = buildSellInstruction(mint, seller, curve.creator, rawTokens, minSolOut);
  const transaction = await buildUnsignedTx(connection, ix, seller);

  res.json({ transaction, solOut: netSol.toString(), minSolOut: minSolOut.toString() });
});

// ── Demo / beta-access endpoints ─────────────────────────────────────────────

/** POST /demo/apply  { wallet, reason, twitter? } */
app.post("/demo/apply", async (req: Request, res: Response) => {
  const { wallet, reason, twitter } = req.body as { wallet: string; reason: string; twitter?: string };
  if (!wallet || !reason) return res.status(400).json({ error: "wallet and reason required" });
  if (reason.length < 20 || reason.length > 500) {
    return res.status(400).json({ error: "reason must be 20–500 characters" });
  }
  const existing = await getApplication(wallet);
  if (existing?.status === "approved") {
    return res.json({ status: "approved", message: "Already approved — check your balance." });
  }
  const app = await demoApply(wallet, reason, twitter ?? null);
  res.status(201).json({ status: app.status, appliedAt: app.appliedAt });
});

/** GET /demo/status/:wallet */
app.get("/demo/status/:wallet", async (req: Request, res: Response) => {
  const app = await getApplication(req.params.wallet);
  if (!app) return res.json({ status: "none" });
  res.json({
    status:    app.status,
    appliedAt: app.appliedAt,
    reviewedAt: app.reviewedAt ?? null,
    isDemo: await isDemoUser(req.params.wallet),
  });
});

// Single admin auth path. Accepts either header (x-admin-key or x-admin-code)
// and checks against ADMIN_API_KEY. Falls back to the legacy ADMIN_ACCESS_CODE
// and config.adminKey envs for the migration window — once all callers send
// x-admin-key against ADMIN_API_KEY, drop the fallbacks.
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const provided =
    (req.headers["x-admin-key"] as string | undefined) ??
    (req.headers["x-admin-code"] as string | undefined);

  const expected =
    process.env.ADMIN_API_KEY ??
    process.env.ADMIN_ACCESS_CODE ??
    config.adminKey;

  if (!provided || !expected || expected === "admin-dev-key" || expected === "change-me") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (provided !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Alias kept so the existing /admin/* routes don't have to be retouched.
const requireAdminCode = requireAdmin;

/** GET /demo/applications  (admin) */
app.get("/demo/applications", requireAdmin, async (_req: Request, res: Response) => {
  res.json(await getAllApplications());
});

/** POST /demo/approve  { wallet }  (admin) */
app.post("/demo/approve", requireAdmin, async (req: Request, res: Response) => {
  const { wallet } = req.body as { wallet: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  try {
    const app = await demoApprove(wallet);
    await credit(wallet, DEMO_CREDIT_USDC);
    res.json({ status: app.status, credited: DEMO_CREDIT_USDC });
  } catch (err) { res.status(404).json({ error: (err as Error).message }); }
});

/** POST /demo/deny  { wallet }  (admin) */
app.post("/demo/deny", requireAdmin, async (req: Request, res: Response) => {
  const { wallet } = req.body as { wallet: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  try {
    const app = await demoDeny(wallet);
    res.json({ status: app.status });
  } catch (err) { res.status(404).json({ error: (err as Error).message }); }
});

/** GET /demo/activity — simulated bot trades for demo display */
app.get("/demo/activity", (_req: Request, res: Response) => {
  res.json(getFakeActivity());
});

// ── Dividend endpoints ────────────────────────────────────────────────────────

app.get("/dividends", async (_req: Request, res: Response) => {
  res.json(await getAllDividends());
});

app.get("/dividends/:mint", async (req: Request, res: Response) => {
  const entry = await getDividend(req.params.mint);
  if (!entry) return res.status(404).json({ error: "No dividend record for this mint" });
  res.json({ mint: req.params.mint, ...entry });
});

/**
 * GET /dividends/wallet/:wallet — every unclaimed (mint, round, amount, proof)
 * tuple for this wallet. Used by apps/fun portfolio to render the claim list +
 * total claimable, and to assemble claim_dividend instructions client-side.
 *
 * Note: route is /dividends/wallet/:wallet (not /dividends/:wallet) to avoid
 * collision with /dividends/:mint above.
 */
app.get("/dividends/wallet/:wallet", validateWallet, async (req: Request, res: Response) => {
  try {
    const rows = await getUnclaimedForHolder(req.params.wallet);
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    res.json({ wallet: req.params.wallet, totalUnclaimedLamports: total, count: rows.length, claims: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Referral program ──────────────────────────────────────────────────────────

/** GET /referral/code/:wallet — get or create referral code for a wallet */
app.get("/referral/code/:wallet", validateWallet, async (req: Request, res: Response) => {
  const { wallet } = req.params;
  if (!wallet || wallet.length < 32) return res.status(400).json({ error: "invalid wallet" });
  try {
    const code = await getOrCreateCode(wallet);
    res.json({ wallet, code, link: `${config.funUrl}/r/${code}` });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** POST /referral/register — register referee → referrer relationship */
app.post("/referral/register", async (req: Request, res: Response) => {
  const { referee, code, source = "launchpad" } = req.body as {
    referee?: string; code?: string; source?: string;
  };
  if (!referee || !code) return res.status(400).json({ error: "referee and code required" });
  if (!["launchpad", "casino"].includes(source))
    return res.status(400).json({ error: "source must be launchpad or casino" });

  const ip = ((req.headers["x-forwarded-for"] as string) ?? "").split(",")[0].trim()
    || req.ip || "unknown";

  const result = await registerReferral(referee, code, source as "launchpad" | "casino", ip);
  if (!result.ok) {
    // already_referred is a silent no-op from the frontend perspective
    if (result.error === "already_referred" || result.error === "self_referral")
      return res.json({ ok: false, reason: result.error });
    return res.status(400).json({ ok: false, reason: result.error });
  }
  res.json({ ok: true });
});

/** GET /referral/stats/:wallet — personal stats for a wallet */
app.get("/referral/stats/:wallet", validateWallet, async (req: Request, res: Response) => {
  const { wallet } = req.params;
  if (!wallet || wallet.length < 32) return res.status(400).json({ error: "invalid wallet" });
  try {
    const stats = await getReferrerStats(wallet);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /referral/leaderboard?limit=50 */
app.get("/referral/leaderboard", async (req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 50));
  try {
    res.json(await getLeaderboard(limit));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /referral/meta — public: point values + tier thresholds (for frontend display) */
app.get("/referral/meta", (_req: Request, res: Response) => {
  res.json({ pointValues: POINT_VALUES, tiers: TIER_THRESHOLDS });
});

// ── Admin analytics API ───────────────────────────────────────────────────────
// Auth: x-admin-key (or legacy x-admin-code) header against ADMIN_API_KEY env.
// Both header names + legacy env names accepted by requireAdminCode (alias of
// requireAdmin defined above) during the migration window.

/** GET /admin/kpis?days=30 */
app.get("/admin/kpis", requireAdminCode, async (req: Request, res: Response) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
  try {
    res.json(await getKPIs(days));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /admin/chart?platform=launchpad&days=7 */
app.get("/admin/chart", requireAdminCode, async (req: Request, res: Response) => {
  const platform = (req.query.platform as string) === "casino" ? "casino" : "launchpad";
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 7));
  try {
    res.json(await getHourlyChart(platform, days));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /admin/top-tokens?limit=10 */
app.get("/admin/top-tokens", requireAdminCode, async (req: Request, res: Response) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  try {
    res.json(await getTopTokens(limit));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /admin/jackpots?limit=20 */
app.get("/admin/jackpots", requireAdminCode, async (req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  try {
    res.json(await getRecentJackpots(limit));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /admin/themes/:mint/regenerate
 * Force-regenerates the slot art for a token whose theme got stuck on
 * "failed" or rendered incorrectly. Triggers the same retry-wrapped image
 * generation flow used at graduation, so transient Replicate failures
 * are re-attempted automatically.
 */
app.post("/admin/themes/:mint/regenerate", requireAdminCode, async (req: Request, res: Response) => {
  const { mint } = req.params;
  if (!mint) return res.status(400).json({ error: "mint required" });
  // Fire-and-forget: art-gen can take 10-30s and we don't want to hold
  // the admin tab open while it runs. Status flips visibly via /themes.
  regenerateTheme(mint)
    .then((r) => console.log(`[admin] regenerate ${mint.slice(0, 8)}…:`, r))
    .catch((err) => console.error(`[admin] regenerate ${mint.slice(0, 8)}…:`, err));
  res.json({ accepted: true, mint });
});

// ── AI Customer Support ───────────────────────────────────────────────────────

const SUPPORT_SYSTEM_PROMPT = `You are the ReelBit support assistant — a helpful, concise AI for the ReelBit platform. Keep responses short (2-4 sentences max unless a list is needed). Never make up specific numbers or balances the user hasn't shared.

ReelBit has two products:
• reelbit.fun — free slot machine token launchpad on Solana. Launch a token for $0 upfront. It starts on a bonding curve at $5k market cap and graduates to the casino at $100k.
• reelbit.casino — provably fair slot machines powered by graduated tokens. Deposit SOL, play slots, win jackpots. 96% RTP, no player fees.

Key facts:
- Launching is free. Creators earn 25% of trading fees from their token.
- Trading fees are dynamic: 2% early, dropping to 1.5% then 1% as the token approaches graduation. Players never pay fees — the house edge is baked into RTP.
- Graduation: token hits $100k market cap → automatically migrates to casino. Holders keep their tokens and earn SOL dividends from casino revenue.
- Jackpot: land 3 ReelBit logos on the payline to drain the jackpot vault.
- Wallets: Phantom, Backpack, and all standard Solana wallets via Privy.
- Demo mode: new users can apply for a $100 USDC demo credit to try the casino risk-free.
- Minimum casino deposit: $10 USDC equivalent in SOL.

If asked about specific account balances, transaction status, or bugs, tell the user you can't access their account and ask them to contact the team on Discord.`;

const _supportRateMap = new Map<string, { count: number; resetAt: number }>();

app.post("/support/chat", async (req: Request, res: Response) => {
  if (!config.openRouterApiKey) {
    return res.status(503).json({ error: "Support chat not available" });
  }

  // Per-IP rate limit: 30 messages per minute
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown");
  const now = Date.now();
  const bucket = _supportRateMap.get(ip) ?? { count: 0, resetAt: now + 60_000 };
  if (now > bucket.resetAt) { bucket.count = 0; bucket.resetAt = now + 60_000; }
  bucket.count++;
  _supportRateMap.set(ip, bucket);
  if (bucket.count > 30) return res.status(429).json({ error: "Too many messages. Please wait a moment." });

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  const trimmed = (messages as Array<{ role: string; content: string }>)
    .slice(-20)
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 2000) }));

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.frontendUrl,
        "X-Title": "ReelBit Support",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free",
        max_tokens: 512,
        messages: [
          { role: "system", content: SUPPORT_SYSTEM_PROMPT },
          ...trimmed,
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const text = data.choices?.[0]?.message?.content ?? "";
    res.json({ message: text });
  } catch (err) {
    console.error("[support] OpenRouter error:", err);
    res.status(500).json({ error: "Support chat is temporarily unavailable." });
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`[api] ReelBit API running on port ${config.port}`);
  loadTrades();
  startDistributionCron(connection);
  startCreatorHoldingCron(connection);
  startLpHarvestCron(connection);
  // Merkle pull model — replaces the old push-style holderDividendCron.
  // The old cron stays imported but is not started; safe to remove once
  // every existing graduated mint has had at least one publish_dividend_root
  // call against the new on-chain ix.
  startMerkleDividendCron(connection);
  void startHolderDividendCron;  // explicitly retain import to avoid unused-import error during cutover
  startMcapWatcher(connection);

  // Tick fake bots every 20s for all known tokens when demo mode is enabled
  if (process.env.ENABLE_FAKE_BOTS === "true" && !isProduction) {
    setInterval(() => {
      const themes = getAllThemes().filter((t) => !t.graduated);
      for (const t of themes) tickFakeBots(t.mint);
    }, 20_000);
  }
});

// Flush the debounced trade snapshot on graceful shutdown so we don't lose the
// last ~10s of trades on a clean Render redeploy. Supabase still has every
// trade either way (analyticsLogTrade is the source of truth) — this just
// keeps the local cache warm across restarts so /tokens looks live faster.
function gracefulShutdown(signal: string) {
  console.log(`[api] received ${signal} — flushing trade snapshot`);
  try { flushTrades(); } catch (err) { console.error(err); }
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
