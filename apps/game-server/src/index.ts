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

async function main() {
  const app = Fastify({ logger: true });
  const engine = new SlotEngine();

  await app.register(cors, {
    origin: process.env.CASINO_ORIGIN ?? "http://localhost:3002",
    methods: ["GET", "POST"],
  });

  /**
   * POST /session/create
   * Returns sessionId + serverSeedHash for provably fair verification.
   */
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

  /**
   * POST /spin
   * betLamports: wager in lamports (0 for free spins).
   */
  app.post<{
    Body: { sessionId: string; clientSeed: string; betLamports: number };
  }>("/spin", async (req, reply) => {
    const { sessionId, clientSeed, betLamports } = req.body;
    if (!sessionId || !clientSeed || betLamports === undefined) {
      return reply.code(400).send({ error: "sessionId, clientSeed, betLamports required" });
    }

    const session = sessions.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });

    if (betLamports !== 0 && (betLamports < 1_000_000 || betLamports > 10_000_000_000)) {
      return reply.code(400).send({ error: "Bet out of range (0.001 – 10 SOL)" });
    }

    try {
      const result = engine.spin(sessionId, clientSeed, betLamports, session.model);
      const grr = betLamports - result.totalPayout;
      app.log.info({ wallet: session.wallet, bet: betLamports, payout: result.totalPayout, grr });
      return reply.send(result);
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: "Spin failed" });
    }
  });

  /**
   * POST /session/reveal
   * Reveals server seed for provably fair verification.
   */
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
