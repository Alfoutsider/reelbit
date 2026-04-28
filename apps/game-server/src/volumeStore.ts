/**
 * Tracks cumulative bet volume (USDC micro-units) per mint.
 * Used to drift effective RTP toward the range floor on high-volume slots.
 * Persisted to disk so restarts don't reset the drift.
 */

import fs from "fs";
import path from "path";

const DATA_DIR   = process.env.DATA_DIR ?? "./data";
const STORE_PATH = path.join(DATA_DIR, "volume.json");

let cache: Record<string, number> = {};

export function initVolumeStore(): void {
  try {
    cache = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  } catch {
    cache = {};
  }
  console.log(`[volume-store] Loaded ${Object.keys(cache).length} mint(s)`);
}

function flush(): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(cache));
}

export function addVolume(mint: string, usdcUnits: number): void {
  cache[mint] = (cache[mint] ?? 0) + usdcUnits;
  flush();
}

export function getVolume(mint: string): number {
  return cache[mint] ?? 0;
}
