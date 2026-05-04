import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config";

// Rolling LRU of recently-processed tx signatures so we can short-circuit
// Helius's at-least-once delivery without hitting Postgres.
//
// 10k signatures × ~88 bytes ≈ 1 MB resident; plenty for the burst windows
// Helius retries within (seconds, not hours).
const SEEN_MAX = 10_000;
const seen = new Set<string>();

export function isProcessed(sig: string): boolean {
  return seen.has(sig);
}

export function markProcessed(sig: string): void {
  if (seen.size >= SEEN_MAX) {
    // Drop the oldest ~10% in one sweep; cheaper than per-insert eviction.
    const toEvict = Math.floor(SEEN_MAX / 10);
    let i = 0;
    for (const s of seen) {
      seen.delete(s);
      if (++i >= toEvict) break;
    }
  }
  seen.add(sig);
}

// Helius signs the raw POST body with HMAC-SHA256 using the secret you set
// in their dashboard. The header name varies by webhook type — they accept
// either `Authorization` (raw secret, legacy) or `x-helius-signature` (HMAC).
// We support both: prefer HMAC, fall back to raw secret comparison.
//
// In dev, if the secret is unset, we skip verification and log a warning once.
let warnedNoSecret = false;

export function verifyHeliusSignature(req: Request): boolean {
  const secret = config.heliusWebhookSecret;
  if (!secret) {
    if (!warnedNoSecret) {
      console.warn("[webhook] HELIUS_WEBHOOK_SECRET unset — accepting all webhooks (DEV ONLY)");
      warnedNoSecret = true;
    }
    return true;
  }

  // Auth header form (raw shared secret)
  const auth = req.header("authorization") ?? req.header("Authorization");
  if (auth && timingSafeEqual(auth, secret)) return true;

  // HMAC form
  const sig = req.header("x-helius-signature") ?? req.header("X-Helius-Signature");
  if (!sig) return false;

  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!raw) return false;

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return timingSafeEqual(sig, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Express middleware that 401s any /webhooks/helius hit lacking a valid signature.
export function requireHeliusSignature(req: Request, res: Response, next: NextFunction) {
  if (!verifyHeliusSignature(req)) {
    console.warn("[webhook] rejected — invalid or missing signature", {
      ip: req.ip,
      sigPresent: Boolean(req.header("x-helius-signature") || req.header("authorization")),
    });
    res.status(401).json({ error: "invalid signature" });
    return;
  }
  next();
}
