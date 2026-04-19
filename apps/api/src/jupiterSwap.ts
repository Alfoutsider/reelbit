/**
 * Jupiter v6 SOL → USDC swap executed from the house wallet.
 *
 * Flow:
 *   1. GET /quote  — best route for inputLamports → USDC
 *   2. POST /swap  — build the swap transaction
 *   3. Sign with house keypair and send
 *   4. Return USDC micro-units received
 */

import {
  Connection,
  VersionedTransaction,
  sendAndConfirmRawTransaction,
} from "@solana/web3.js";
import { getHouseKeypair } from "./houseWallet";

// USDC mint addresses
const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_MINT_DEVNET  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
// Wrapped SOL mint
const WSOL_MINT = "So11111111111111111111111111111111111111112";

const JUP_API = "https://quote-api.jup.ag/v6";

import { config } from "./config";

export const USDC_MINT = config.rpcUrl.includes("mainnet")
  ? USDC_MINT_MAINNET
  : USDC_MINT_DEVNET;

interface QuoteResponse {
  outAmount: string;
  [key: string]: unknown;
}

export async function swapSolToUsdc(
  connection: Connection,
  lamports: number,
  slippageBps = 50,
): Promise<number> {
  const keypair = getHouseKeypair();

  // Step 1 — get best route
  const quoteUrl = new URL(`${JUP_API}/quote`);
  quoteUrl.searchParams.set("inputMint",   WSOL_MINT);
  quoteUrl.searchParams.set("outputMint",  USDC_MINT);
  quoteUrl.searchParams.set("amount",      lamports.toString());
  quoteUrl.searchParams.set("slippageBps", slippageBps.toString());
  quoteUrl.searchParams.set("onlyDirectRoutes", "false");

  const quoteRes = await fetch(quoteUrl.toString());
  if (!quoteRes.ok) throw new Error(`Jupiter quote failed: ${await quoteRes.text()}`);
  const quote = await quoteRes.json() as QuoteResponse;

  // Step 2 — build swap transaction
  const swapRes = await fetch(`${JUP_API}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse:     quote,
      userPublicKey:     keypair.publicKey.toBase58(),
      wrapAndUnwrapSol:  true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  if (!swapRes.ok) throw new Error(`Jupiter swap build failed: ${await swapRes.text()}`);

  const { swapTransaction } = await swapRes.json() as { swapTransaction: string };

  // Step 3 — sign and send
  const txBuf  = Buffer.from(swapTransaction, "base64");
  const tx     = VersionedTransaction.deserialize(txBuf);
  tx.sign([keypair]);

  const rawTx  = tx.serialize();
  const sig    = await sendAndConfirmRawTransaction(connection, Buffer.from(rawTx), {
    skipPreflight: false,
    commitment: "confirmed",
  });

  console.log(`[jupiter] Swapped ${lamports} lamports → USDC  tx: ${sig}`);

  // Return USDC micro-units received
  return parseInt(quote.outAmount, 10);
}
