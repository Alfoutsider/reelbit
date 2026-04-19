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
} from "./sessionStore";
import type { SlotModel } from "./engine";

const API_URL         = process.env.API_URL             ?? "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "dev-secret-change-in-prod";

async function debitBalance(wallet: string, lamports: number): Promise<void> {
  const res = await fetch(`${API_URL}/internal/debit`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
    body:    JSON.stringify({ wallet, lamports }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Balance error" }));
    throw new Error((err as { error: string }).error ?? "Failed to debit balance");
  }
}

async function creditBalance(wallet: string, lamports: number): Promise<void> {
  await fetch(`${API_URL}/internal/credit`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
    body:    JSON.stringify({ wallet, lamports }),
  }).catch((err) => console.error("[game-server] Failed to credit payout:", err));
}

async function main() {
  // Load persisted sessions from disk before accepting requests
  initSessionStore();

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

      createSession({ id, wallet, mint, model, serverSeed, serverSeedHash, nonce: 0, createdAt: now, lastSpinAt: now });

      return reply.send({ sessionId: id, serverSeedHash });
    },
  );

  // ── POST /spin ────────────────────────────────────────────────────────────

  app.post<{ Body: { sessionId: string; clientSeed: string; betLamports: number } }>(
    "/spin",
    async (req, reply) => {
      const { sessionId, clientSeed, betLamports } = req.body;
      if (!sessionId || !clientSeed || betLamports === undefined) {
        return reply.code(400).send({ error: "sessionId, clientSeed, betLamports required" });
      }

      const session = getSession(sessionId);
      if (!session) return reply.code(404).send({ error: "Session not found" });

      const isFree = betLamports === 0;
      if (!isFree && (betLamports < 1_000_000 || betLamports > 10_000_000_000)) {
        return reply.code(400).send({ error: "Bet out of range (0.001 – 10 SOL)" });
      }

      if (!isFree) {
        try {
          await debitBalance(session.wallet, betLamports);
        } catch (err) {
          return reply.code(402).send({ error: (err as Error).message });
        }
      }

      // Persist nonce increment before spinning — if server crashes mid-spin
      // the nonce is already advanced, preventing any replay attack.
      const updated = incrementNonce(sessionId);

      try {
        const result = engine.spin(
          updated.serverSeed,
          updated.serverSeedHash,
          updated.nonce,
          clientSeed,
          betLamports,
          updated.model,
        );

        if (result.totalPayout > 0) {
          creditBalance(updated.wallet, result.totalPayout);
        }

        if (result.isJackpot) {
          fetch(`${API_URL}/internal/jackpot-won`, {
            method:  "POST",
            headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
            body:    JSON.stringify({ wallet: updated.wallet, mint: updated.mint, sessionId }),
          }).catch((err) => app.log.error("[game-server] jackpot-won call failed:", err));
        }

        app.log.info({ wallet: updated.wallet, bet: betLamports, payout: result.totalPayout, nonce: updated.nonce });
        return reply.send(result);
      } catch (err) {
        if (!isFree) creditBalance(session.wallet, betLamports);
        app.log.error(err);
        return reply.code(500).send({ error: "Spin failed" });
      }
    },
  );

  // ── POST /session/reveal ──────────────────────────────────────────────────

  app.post<{ Body: { sessionId: string } }>(
    "/session/reveal",
    async (req, reply) => {
      const session = consumeSession(req.body.sessionId);
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
