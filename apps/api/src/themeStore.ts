import fs from "fs";
import path from "path";

export type SlotModel = "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";

export interface CustomAssets {
  themeDescription: string;
  palette: { primary: string; accent: string; bg: string };
  symbols: Record<string, string>; // symbolId → SVG string
  sourceImageUrl: string;
  bgImageUrl: string;
  bgPrompt: string;
  generatedAt: number;
}

export interface SlotTheme {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  slotModel: SlotModel;
  graduated: boolean;
  creator?: string;      // wallet that launched this slot (set during register)
  poolAddress?: string; // Meteora DLMM LB pair address (set after graduation migration)
  devBuyPct?: number;  // % of supply creator bought at launch (0 or absent = no dev buy)
  rtp?: number;              // assigned RTP at graduation (0–1), e.g. 0.956 = 95.6%
  creatorHoldRatio?: number;    // 0–1: fraction of original dev allocation still held
  creatorHoldCheckedAt?: number; // ms timestamp of last on-chain balance check
  devHasMinBuy?: boolean;        // true if creator spent ≥ 0.2 SOL on own token
  status: "generating" | "ready" | "failed";
  heroImageUrl: string | null;
  bgImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
  customAssets?: CustomAssets; // AI-generated custom slot skin
  updatedAt: number;
}

// RTP ranges per model — mirrors game-server/src/paytable.ts
const RTP_RANGES: Record<SlotModel, readonly [number, number]> = {
  Classic3Reel:      [0.94, 0.98],
  Standard5Reel:     [0.92, 0.96],
  FiveReelFreeSpins: [0.90, 0.94],
};

/** Pick a random RTP within the model's range and assign it to the theme. */
export function assignRtp(mint: string, model: SlotModel): number {
  const [min, max] = RTP_RANGES[model];
  const rtp = min + Math.random() * (max - min);
  const store = readStore();
  if (store[mint]) {
    store[mint].rtp = rtp;
    store[mint].updatedAt = Date.now();
    writeStore(store);
  }
  return rtp;
}

import { config } from "./config";
const STORE_PATH = path.join(config.dataDir, "themes.json");

function readStore(): Record<string, SlotTheme> {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, SlotTheme>): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getTheme(mint: string): SlotTheme | null {
  return readStore()[mint] ?? null;
}

export function getAllThemes(): SlotTheme[] {
  return Object.values(readStore());
}

export function getGraduatedThemes(): SlotTheme[] {
  return Object.values(readStore()).filter((t) => t.graduated && t.status === "ready");
}

export function markGraduated(mint: string, slotModel: SlotModel): void {
  const store = readStore();
  if (store[mint]) {
    store[mint].graduated = true;
    store[mint].slotModel = slotModel;
    store[mint].updatedAt = Date.now();
    writeStore(store);
  }
}

export function recordPoolAddress(mint: string, poolAddress: string): void {
  const store = readStore();
  if (store[mint]) {
    store[mint].poolAddress = poolAddress;
    store[mint].updatedAt   = Date.now();
    writeStore(store);
  }
}

export function getGraduatedWithPool(): SlotTheme[] {
  return Object.values(readStore()).filter(
    (t) => t.graduated && t.poolAddress != null,
  );
}

export function getThemesByCreator(creator: string): SlotTheme[] {
  return Object.values(readStore()).filter((t) => t.creator === creator);
}

export function setTheme(theme: SlotTheme): void {
  const store = readStore();
  store[theme.mint] = theme;
  writeStore(store);
}

export function setCreatorHoldRatio(mint: string, ratio: number): void {
  const store = readStore();
  if (store[mint]) {
    store[mint].creatorHoldRatio     = ratio;
    store[mint].creatorHoldCheckedAt = Date.now();
    writeStore(store);
  }
}

export function setCustomAssets(mint: string, assets: CustomAssets): void {
  const store = readStore();
  if (store[mint]) {
    store[mint].customAssets = assets;
    store[mint].updatedAt = Date.now();
    writeStore(store);
  }
}

export function setCreatorDevBuyInfo(mint: string, hasMinBuy: boolean): void {
  const store = readStore();
  if (store[mint]) {
    store[mint].devHasMinBuy = hasMinBuy;
    writeStore(store);
  }
}

/** Deterministic HSL → hex color from a symbol string */
export function deriveColors(symbol: string): { primary: string; accent: string } {
  let hash = 0;
  for (const c of symbol) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  const accentHue = (hue + 150) % 360;

  function hslToHex(h: number, s: number, l: number): string {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  return {
    primary: hslToHex(hue, 0.8, 0.55),
    accent:  hslToHex(accentHue, 0.7, 0.5),
  };
}
