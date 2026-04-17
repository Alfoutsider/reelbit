"use client";

import {
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import {
  getTokenLaunchProgram,
  slotMetadataPda,
  bondingCurvePda,
  walletCapPda,
} from "./anchor";

// ── Bonding curve math (mirrors Rust x*y=k) ───────────────────────────────────

const VIRTUAL_SOL = BigInt(30 * LAMPORTS_PER_SOL);
const VIRTUAL_TOKENS = BigInt("1073000191000000");

export function calcTokensOut(
  virtualSol: bigint,
  virtualTokens: bigint,
  solIn: bigint,
): bigint {
  return (virtualTokens * solIn) / (virtualSol + solIn);
}

export function calcSolOut(
  virtualSol: bigint,
  virtualTokens: bigint,
  tokensIn: bigint,
): bigint {
  return (virtualSol * tokensIn) / (virtualTokens + tokensIn);
}

export function estimateTokensForSol(solLamports: bigint): bigint {
  return calcTokensOut(VIRTUAL_SOL, VIRTUAL_TOKENS, solLamports);
}

export function estimateSolForTokens(tokens: bigint): bigint {
  return calcSolOut(VIRTUAL_SOL, VIRTUAL_TOKENS, tokens);
}

// ── On-chain state fetcher ────────────────────────────────────────────────────

export interface BondingCurveState {
  mint: string;
  creator: string;
  virtualSol: bigint;
  virtualTokens: bigint;
  realSol: bigint;
  realTokens: bigint;
}

type AnchorAccountRecord = Record<string, { fetch: (key: PublicKey) => Promise<Record<string, unknown>> }>;
type AnchorMethodRecord = Record<string, (...args: unknown[]) => { accounts: (a: unknown) => { rpc: () => Promise<string> } }>;

export async function fetchBondingCurve(
  wallet: AnchorWallet,
  mint: PublicKey,
): Promise<BondingCurveState | null> {
  try {
    const program = await getTokenLaunchProgram(wallet);
    const [vaultPda] = bondingCurvePda(mint);
    const accounts = program.account as unknown as AnchorAccountRecord;
    const data = await accounts.bondingCurveVault.fetch(vaultPda);
    return {
      mint: (data.mint as PublicKey).toBase58(),
      creator: (data.creator as PublicKey).toBase58(),
      virtualSol: BigInt((data.virtualSol as BN).toString()),
      virtualTokens: BigInt((data.virtualTokens as BN).toString()),
      realSol: BigInt((data.realSol as BN).toString()),
      realTokens: BigInt((data.realTokens as BN).toString()),
    };
  } catch {
    return null;
  }
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface BuyResult {
  signature: string;
  tokensOut: bigint;
}

export async function buyTokens(
  wallet: AnchorWallet,
  mint: PublicKey,
  solLamports: bigint,
  slippageBps: number = 100,
): Promise<BuyResult> {
  const program = await getTokenLaunchProgram(wallet);

  const [slotMetadata] = slotMetadataPda(mint);
  const [bondingCurve] = bondingCurvePda(mint);
  const [walletCap] = walletCapPda(mint, wallet.publicKey);

  const curveState = await fetchBondingCurve(wallet, mint);
  const vs = curveState?.virtualSol ?? VIRTUAL_SOL;
  const vt = curveState?.virtualTokens ?? VIRTUAL_TOKENS;

  const tokensOut = calcTokensOut(vs, vt, solLamports);
  const minTokensOut = (tokensOut * BigInt(10_000 - slippageBps)) / BigInt(10_000);

  const accounts = program.account as unknown as AnchorAccountRecord;
  const metaData = await accounts.slotMetadata.fetch(slotMetadata);
  const creator = metaData.creator as PublicKey;

  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, bondingCurve, true);
  const buyerTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey);

  const methods = program.methods as unknown as AnchorMethodRecord;
  const signature = await methods
    .buyTokens(new BN(solLamports.toString()) as unknown as string, new BN(minTokensOut.toString()) as unknown as string)
    .accounts({
      buyer: wallet.publicKey,
      mint,
      slotMetadata,
      bondingCurveVault: bondingCurve,
      vaultTokenAccount,
      walletCap,
      buyerTokenAccount,
      creator,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, tokensOut };
}

export interface SellResult {
  signature: string;
  solOut: bigint;
}

export async function sellTokens(
  wallet: AnchorWallet,
  mint: PublicKey,
  tokenAmount: bigint,
  slippageBps: number = 100,
): Promise<SellResult> {
  const program = await getTokenLaunchProgram(wallet);

  const [slotMetadata] = slotMetadataPda(mint);
  const [bondingCurve] = bondingCurvePda(mint);
  const [walletCap] = walletCapPda(mint, wallet.publicKey);

  const curveState = await fetchBondingCurve(wallet, mint);
  const vs = curveState?.virtualSol ?? VIRTUAL_SOL;
  const vt = curveState?.virtualTokens ?? VIRTUAL_TOKENS;

  const grossSol = calcSolOut(vs, vt, tokenAmount);
  const creatorFee = (grossSol * BigInt(50)) / BigInt(10_000);
  const netSol = grossSol - creatorFee * BigInt(2);
  const minSolOut = (netSol * BigInt(10_000 - slippageBps)) / BigInt(10_000);

  const accounts = program.account as unknown as AnchorAccountRecord;
  const metaData = await accounts.slotMetadata.fetch(slotMetadata);
  const creator = metaData.creator as PublicKey;

  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, bondingCurve, true);
  const sellerTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey);

  const methods = program.methods as unknown as AnchorMethodRecord;
  const signature = await methods
    .sellTokens(new BN(tokenAmount.toString()) as unknown as string, new BN(minSolOut.toString()) as unknown as string)
    .accounts({
      seller: wallet.publicKey,
      mint,
      slotMetadata,
      bondingCurveVault: bondingCurve,
      vaultTokenAccount,
      walletCap,
      sellerTokenAccount,
      creator,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature, solOut: netSol };
}
