"use client";

import type { SpinResult } from "@/components/slot/types";

const GAME_SERVER = process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "http://localhost:3003";

export interface Session {
  sessionId: string;
  serverSeedHash: string;
}

export async function createSession(
  wallet: string,
  model: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins",
  mint: string,
): Promise<Session> {
  const res = await fetch(`${GAME_SERVER}/session/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet, model, mint }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function spin(
  sessionId: string,
  clientSeed: string,
  betLamports: number,
): Promise<SpinResult> {
  const res = await fetch(`${GAME_SERVER}/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, clientSeed, betLamports }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Spin failed");
  }
  return res.json();
}

export async function revealSession(sessionId: string): Promise<{
  serverSeed: string;
  serverSeedHash: string;
  nonce: number;
}> {
  const res = await fetch(`${GAME_SERVER}/session/reveal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error("Failed to reveal session");
  return res.json();
}

// Generate a random client seed from the browser
export function generateClientSeed(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
