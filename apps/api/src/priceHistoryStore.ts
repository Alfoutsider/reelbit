import fs from "fs";
import path from "path";
import { config } from "./config";

export interface PricePoint {
  ts: number;
  priceUsd: number;
  mcapUsd: number;
  realSolLamports: number;
  progressPct: number;
}

const MAX_POINTS = 500;

function historyDir(): string {
  return path.join(config.dataDir, "price-history");
}

function historyPath(mint: string): string {
  return path.join(historyDir(), `${mint}.json`);
}

export function appendPricePoint(mint: string, point: PricePoint): void {
  const dir = historyDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = historyPath(mint);
  let points: PricePoint[] = [];
  try { points = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}

  points.push(point);
  if (points.length > MAX_POINTS) points = points.slice(points.length - MAX_POINTS);
  fs.writeFileSync(file, JSON.stringify(points));
}

export function getPriceHistory(mint: string, limit = 200): PricePoint[] {
  try {
    const points: PricePoint[] = JSON.parse(fs.readFileSync(historyPath(mint), "utf8"));
    return points.slice(-Math.min(limit, MAX_POINTS));
  } catch {
    return [];
  }
}
