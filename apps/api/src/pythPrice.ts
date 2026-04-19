/**
 * Pyth on-chain price reader for SOL/USD.
 *
 * Reads the Pyth price account directly from the Solana account data.
 * No subscription, no API key — just a single RPC getAccountInfo call.
 *
 * Price account pubkeys (both networks):
 *   Mainnet: H6ARHf6YXhGYeQfUzQNGFEn6CZLN5PJFpwzCa4Uj6dr
 *   Devnet:  J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config";

const PYTH_SOL_USD_MAINNET = new PublicKey("H6ARHf6YXhGYeQfUzQNGFEn6CZLN5PJFpwzCa4Uj6dr");
const PYTH_SOL_USD_DEVNET  = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");

const PYTH_PRICE_ACCOUNT = config.rpcUrl.includes("mainnet")
  ? PYTH_SOL_USD_MAINNET
  : PYTH_SOL_USD_DEVNET;

// Pyth v2 price account layout offsets (after 8-byte magic + header fields)
// Ref: https://docs.pyth.network/documentation/solana-price-feeds/price-accounts
const PRICE_OFFSET   = 208; // i64 price
const EXP_OFFSET     = 176; // i32 exponent
const STATUS_OFFSET  = 184; // u32 trading status (1 = trading)

let _cachedPrice: number | null = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 10_000; // re-fetch at most every 10 seconds

export async function getSolUsdPrice(connection: Connection): Promise<number> {
  if (_cachedPrice !== null && Date.now() - _cacheTs < CACHE_TTL_MS) {
    return _cachedPrice;
  }

  try {
    const info = await connection.getAccountInfo(PYTH_PRICE_ACCOUNT, "confirmed");
    if (!info) throw new Error("Pyth price account not found");

    const data   = info.data;
    const status = data.readUInt32LE(STATUS_OFFSET);
    if (status !== 1) throw new Error("Pyth price not in trading status");

    const exponent = data.readInt32LE(EXP_OFFSET);
    const priceBig = data.readBigInt64LE(PRICE_OFFSET);
    const price    = Number(priceBig) * Math.pow(10, exponent);

    if (price <= 0 || price > 100_000) throw new Error(`Pyth price out of range: ${price}`);

    _cachedPrice = price;
    _cacheTs     = Date.now();
    return price;
  } catch (err) {
    console.warn("[pyth] Price read failed, using fallback:", (err as Error).message);
    // Fallback to a conservative price if Pyth unavailable (devnet mostly)
    return _cachedPrice ?? 150;
  }
}

/** Convert lamports to USDC micro-units using live SOL price. */
export async function lamportsToUsdc(connection: Connection, lamports: number): Promise<number> {
  const price = await getSolUsdPrice(connection);
  const usdValue = (lamports / 1_000_000_000) * price;
  return Math.floor(usdValue * 1_000_000); // USDC has 6 decimals
}

/** Convert USDC micro-units to lamports using live SOL price. */
export async function usdcToLamports(connection: Connection, usdcUnits: number): Promise<number> {
  const price = await getSolUsdPrice(connection);
  const solAmount = (usdcUnits / 1_000_000) / price;
  return Math.floor(solAmount * 1_000_000_000);
}
