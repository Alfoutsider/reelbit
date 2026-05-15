import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomBytes } from "crypto";
import { SlotEngine } from "./engine";
import { newServerSeed, hashServerSeed } from "./rng";
import {
  initSessionStore,
  createSession,
  getSession,
  incrementNonce,
  consumeSession,
  updateFreeSpins,
} from "./sessionStore";
import { initVolumeStore, addVolume, getVolume } from "./volumeStore";
import { computeEffectiveRtp, BASE_RTP } from "./paytable";
import type { SlotModel } from "./engine";

const API_URL         = process.env.API_URL             ?? "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "dev-secret-change-in-prod";
if (process.env.NODE_ENV === "production" && INTERNAL_SECRET === "dev-secret-change-in-prod") {
  throw new Error("INTERNAL_API_SECRET must be set to a non-default value in production");
}

async function debitBalance(wallet: string, usdcUnits: number): Promise<void> {
  const res = await fetch(`${API_URL}/internal/debit`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
    body:    JSON.stringify({ wallet, usdcUnits }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Balance error" }));
    throw new Error((err as { error: string }).error ?? "Failed to debit balance");
  }
}

async function creditBalance(wallet: string, usdcUnits: number): Promise<void> {
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 1_000;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${API_URL}/internal/credit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
        body:    JSON.stringify({ wallet, usdcUnits }),
      });
      if (res.ok) return;
      const body = await res.json().catch(() => ({}));
      lastErr = new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  // All attempts failed — emit a structured dead-letter entry for manual recovery
  console.error(JSON.stringify({
    event:     "credit-dead-letter",
    wallet,
    usdcUnits,
    timestamp: new Date().toISOString(),
    error:     String(lastErr),
  }));
}

// Slots are off-chain. The 4% house edge (100% - 96% RTP) funds the jackpot pool.
// This is fire-and-forget — a failed call doesn't block the player.
function fundJackpot(usdcUnits: number): void {
  if (usdcUnits <= 0) return;
  fetch(`${API_URL}/internal/jackpot-fund`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
    body:    JSON.stringify({ usdcUnits }),
  }).catch((err) => console.error("[game-server] jackpot-fund failed:", err));
}

async function fetchTokenRtp(mint: string, model: SlotModel): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/tokens/${mint}/rtp`);
    if (res.ok) {
      const data = await res.json() as { rtp: number };
      if (typeof data.rtp === "number" && data.rtp > 0) return data.rtp;
    }
  } catch {
    // fall through to default
  }
  return BASE_RTP[model] ?? 0.94;
}

// One entry per session currently executing a spin. Prevents a player from
// firing two concurrent /spin requests on the same session to cherry-pick results.
const spinLock = new Set<string>();

async function main() {
  // Load persisted sessions and volume data from disk before accepting requests
  initSessionStore();
  initVolumeStore();

  const app    = Fastify({ logger: true });
  const engine = new SlotEngine();

  await app.register(cors, {
    origin:  process.env.CASINO_ORIGIN ?? "http://localhost:3002",
    methods: ["GET", "POST"],
  });

  // ── POST /session/create ──────────────────────────────────────────────────

  app.post<{ Body: { wallet: string; model: SlotModel; mint: string } }>(
    "/session/create",
    async (req, reply) => {
      const { wallet, model, mint } = req.body;
      if (!wallet || !model || !mint) {
        return reply.code(400).send({ error: "wallet, model, and mint required" });
      }

      const id             = randomBytes(16).toString("hex");
      const serverSeed     = newServerSeed();
      const serverSeedHash = hashServerSeed(serverSeed);
      const now            = Date.now();
      const targetRtp      = await fetchTokenRtp(mint, model);

      await createSession({ id, wallet, mint, model, serverSeed, serverSeedHash, nonce: 0, createdAt: now, lastSpinAt: now, targetRtp, freeSpinsEarned: 0, freeSpinsUsed: 0 });

      return reply.send({ sessionId: id, serverSeedHash });
    },
  );

  // ── POST /spin ────────────────────────────────────────────────────────────

  // Bet amounts are in USDC micro-units (1 USDC = 1_000_000).
  // Range: $0.50 minimum (500_000) to $100 maximum (100_000_000).
  app.post<{ Body: { sessionId: string; clientSeed: string; betUsdc: number } }>(
    "/spin",
    async (req, reply) => {
      const { sessionId, clientSeed, betUsdc } = req.body;
      if (!sessionId || !clientSeed || betUsdc === undefined) {
        return reply.code(400).send({ error: "sessionId, clientSeed, betUsdc required" });
      }

      const session = getSession(sessionId);
      if (!session) return reply.code(404).send({ error: "Session not found" });

      if (spinLock.has(sessionId)) {
        return reply.code(429).send({ error: "Spin already in progress for this session" });
      }

      const isFree = betUsdc === 0;
      if (!isFree && (betUsdc < 500_000 || betUsdc > 100_000_000)) {
        return reply.code(400).send({ error: "Bet out of range ($0.50 – $100)" });
      }

      spinLock.add(sessionId);
      try {
        if (isFree) {
          if (session.freeSpinsEarned <= session.freeSpinsUsed) {
            return reply.code(400).send({ error: "No free spins remaining" });
          }
        } else {
          try {
            await debitBalance(session.wallet, betUsdc);
          } catch (err) {
            return reply.code(402).send({ error: (err as Error).message });
          }
        }

        // Persist nonce increment before spinning — if server crashes mid-spin
        // the nonce is already advanced, preventing any replay attack.
        const updated = await incrementNonce(sessionId);

        try {
          const cumulativeVolume = getVolume(updated.mint);
          const effectiveRtp = computeEffectiveRtp(updated.model, updated.targetRtp, cumulativeVolume);

          const result = engine.spin(
            updated.serverSeed,
            updated.serverSeedHash,
            updated.nonce,
            clientSeed,
            betUsdc,
            updated.model,
            effectiveRtp,
          );

          if (result.totalPayout > 0) {
            await creditBalance(updated.wallet, result.totalPayout);
          }

          // Track free spin consumption / award
          if (isFree) {
            await updateFreeSpins(sessionId, { used: 1 });
          }
          if (result.freeSpinsAwarded > 0) {
            await updateFreeSpins(sessionId, { earned: result.freeSpinsAwarded });
          }

          // 4% house edge from every bet goes to the jackpot pool
          if (!isFree && betUsdc > 0) {
            const houseEdge = Math.floor(betUsdc * 0.04);
            fundJackpot(houseEdge);
            addVolume(updated.mint, betUsdc);
          }

          if (result.isJackpot) {
            fetch(`${API_URL}/internal/jackpot-won`, {
              method:  "POST",
              headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
              body:    JSON.stringify({ wallet: updated.wallet, mint: updated.mint, sessionId }),
            }).catch((err) => app.log.error("[game-server] jackpot-won call failed:", err));
          }

          app.log.info({ wallet: updated.wallet, bet: betUsdc, payout: result.totalPayout, nonce: updated.nonce });
          return reply.send(result);
        } catch (err) {
          if (!isFree) await creditBalance(session.wallet, betUsdc);
          app.log.error(err);
          return reply.code(500).send({ error: "Spin failed" });
        }
      } finally {
        spinLock.delete(sessionId);
      }
    },
  );

  // ── POST /session/reveal ──────────────────────────────────────────────────

  app.post<{ Body: { sessionId: string } }>(
    "/session/reveal",
    async (req, reply) => {
      const session = await consumeSession(req.body.sessionId);
      if (!session) return reply.code(404).send({ error: "Session not found" });
      return reply.send({ serverSeed: session.serverSeed, serverSeedHash: session.serverSeedHash, nonce: session.nonce });
    },
  );

  // ── GET /health ───────────────────────────────────────────────────────────

  app.get("/health", async () => ({ status: "ok", ts: Date.now() }));

  const PORT = parseInt(process.env.PORT ?? "3003");
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`[game-server] Running on port ${PORT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
