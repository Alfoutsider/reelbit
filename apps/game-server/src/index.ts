import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomBytes } from "crypto";
import { SlotEngine } from "./engine";
import { newServerSeed, hashServerSeed } from "./rng";
import type { SlotModel } from "./engine";

interface SessionStore {
  serverSeed: string;
  serverSeedHash: string;
  nonce: number;
  wallet: string;
  model: SlotModel;
}

const sessions = new Map<string, SessionStore>();

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? "dev-secret-change-in-prod";

async function debitBalance(wallet: string, lamports: number): Promise<void> {
  const res = await fetch(`${API_URL}/internal/debit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
    body: JSON.stringify({ wallet, lamports }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Balance error" }));
    throw new Error(err.error ?? "Failed to debit balance");
  }
}

async function creditBalance(wallet: string, lamports: number): Promise<void> {
  await fetch(`${API_URL}/internal/credit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
    body: JSON.stringify({ wallet, lamports }),
  }).catch((err) => console.error("[game-server] Failed to credit payout:", err));
}

async function main() {
  const app = Fastify({ logger: true });
  const engine = new SlotEngine();

  await app.register(cors, {
    origin: process.env.CASINO_ORIGIN ?? "http://localhost:3002",
    methods: ["GET", "POST"],
  });

  app.post<{
    Body: { wallet: string; model: SlotModel };
  }>("/session/create", async (req, reply) => {
    const { wallet, model } = req.body;
    if (!wallet || !model) return reply.code(400).send({ error: "wallet and model required" });

    const sessionId = randomBytes(16).toString("hex");
    const serverSeed = newServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);

    sessions.set(sessionId, { serverSeed, serverSeedHash, nonce: 0, wallet, model });
    engine.createSession(sessionId, serverSeed, serverSeedHash);

    return reply.send({ sessionId, serverSeedHash });
  });

  app.post<{
    Body: { sessionId: string; clientSeed: string; betLamports: number };
  }>("/spin", async (req, reply) => {
    const { sessionId, clientSeed, betLamports } = req.body;
    if (!sessionId || !clientSeed || betLamports === undefined) {
      return reply.code(400).send({ error: "sessionId, clientSeed, betLamports required" });
    }

    const session = sessions.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });

    const isFree = betLamports === 0;

    if (!isFree && (betLamports < 1_000_000 || betLamports > 10_000_000_000)) {
      return reply.code(400).send({ error: "Bet out of range (0.001 – 10 SOL)" });
    }

    // Debit bet from internal balance before spinning
    if (!isFree) {
      try {
        await debitBalance(session.wallet, betLamports);
      } catch (err) {
        return reply.code(402).send({ error: (err as Error).message });
      }
    }

    try {
      const result = engine.spin(sessionId, clientSeed, betLamports, session.model);

      // Credit payout (fire-and-forget — spin result is already returned)
      if (result.totalPayout > 0) {
        creditBalance(session.wallet, result.totalPayout);
      }

      app.log.info({ wallet: session.wallet, bet: betLamports, payout: result.totalPayout });
      return reply.send(result);
    } catch (err) {
      // Spin failed after debit — refund the bet
      if (!isFree) creditBalance(session.wallet, betLamports);
      app.log.error(err);
      return reply.code(500).send({ error: "Spin failed" });
    }
  });

  app.post<{
    Body: { sessionId: string };
  }>("/session/reveal", async (req, reply) => {
    const { sessionId } = req.body;
    const session = sessions.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });

    const { serverSeed, serverSeedHash, nonce } = session;
    sessions.delete(sessionId);
    return reply.send({ serverSeed, serverSeedHash, nonce });
  });

  app.get("/health", async () => ({ status: "ok", ts: Date.now() }));

  const PORT = parseInt(process.env.PORT ?? "3003");
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`[game-server] Running on port ${PORT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
