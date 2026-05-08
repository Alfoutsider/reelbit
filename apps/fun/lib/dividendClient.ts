"use client";

/**
 * Claim flow for on-chain Merkle dividend rounds.
 *
 * Flow:
 *  1. fetchClaimable(wallet) → calls api `/dividends/wallet/:wallet` and
 *     returns every unclaimed (mint, round, leaf_index, amount, proof) row
 *  2. claimAll(wallet, claims, sign) → bundles claim_dividend ix calls into
 *     transactions of CLAIMS_PER_TX, asks the connected Privy wallet to
 *     sign each tx, sends + confirms
 *
 * Encoding of the claim_dividend Anchor instruction matches the on-chain
 * verifier in token-launch::lib.rs:
 *   8 bytes  discriminator  (from IDL)
 *   8 bytes  round (u64 LE)
 *   1 byte   leaf_index (u8)
 *   8 bytes  amount (u64 LE)
 *   4 bytes  proof.len() (u32 LE) + proof.len() * 32 bytes
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import TOKEN_LAUNCH_IDL from "./idl/token_launch.json";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const TOKEN_LAUNCH_PROGRAM = new PublicKey("5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8");

// Solana legacy-tx size limit is 1232 bytes. Each claim_dividend ix at
// depth-7 proof + 3 unique accounts is ~352 bytes. With 4 unique
// dividend_round accounts and 4 ix the tx hits ~1450 bytes (over). 3 ix
// per tx lands at ~1100 bytes — comfortable safety margin.
const CLAIMS_PER_TX = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClaimableProof {
  mint:      string;
  round:     number;
  holder:    string;
  leafIndex: number;
  amount:    number;          // lamports
  proof:     string[];         // hex32 strings, each prefixed with "0x"
}

export interface ClaimableSummary {
  wallet:                 string;
  totalUnclaimedLamports: number;
  count:                  number;
  claims:                 ClaimableProof[];
}

// ── API ───────────────────────────────────────────────────────────────────────

export async function fetchClaimable(wallet: string): Promise<ClaimableSummary> {
  const res = await fetch(`${API}/dividends/wallet/${wallet}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Ix builder ────────────────────────────────────────────────────────────────

let _claimDisc: Buffer | null = null;
function claimDiscriminator(): Buffer {
  if (_claimDisc) return _claimDisc;
  const idl = TOKEN_LAUNCH_IDL as { instructions: Array<{ name: string; discriminator: number[] }> };
  const ix  = idl.instructions.find((i) => i.name === "claim_dividend");
  if (!ix) throw new Error("claim_dividend not found in IDL");
  _claimDisc = Buffer.from(ix.discriminator);
  return _claimDisc;
}

function dividendRoundPda(mint: PublicKey, round: bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(round);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dividend_round"), mint.toBuffer(), buf],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
}

export function buildClaimIx(claimer: PublicKey, claim: ClaimableProof): TransactionInstruction {
  const mint  = new PublicKey(claim.mint);
  const round = BigInt(claim.round);

  const proofBytes = claim.proof.map((p) => {
    const hex = p.startsWith("0x") ? p.slice(2) : p;
    return Buffer.from(hex, "hex");
  });
  if (proofBytes.some((p) => p.length !== 32)) throw new Error("invalid proof element length");

  const roundBuf = Buffer.alloc(8);  roundBuf.writeBigUInt64LE(round);
  const amountBuf = Buffer.alloc(8); amountBuf.writeBigUInt64LE(BigInt(claim.amount));
  const proofLenBuf = Buffer.alloc(4); proofLenBuf.writeUInt32LE(proofBytes.length);

  const data = Buffer.concat([
    claimDiscriminator(),
    roundBuf,
    Buffer.from([claim.leafIndex]),
    amountBuf,
    proofLenBuf,
    ...proofBytes,
  ]);

  return new TransactionInstruction({
    programId: TOKEN_LAUNCH_PROGRAM,
    keys: [
      { pubkey: claimer,                        isSigner: true,  isWritable: true  },
      { pubkey: mint,                           isSigner: false, isWritable: false },
      { pubkey: dividendRoundPda(mint, round),  isSigner: false, isWritable: true  },
    ],
    data,
  });
}

// ── Bundled Claim All ─────────────────────────────────────────────────────────

interface PrivyWalletLike {
  address: string;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

export interface ClaimResult {
  successCount: number;
  failedCount:  number;
  txSigs:       string[];
  errors:       string[];
}

export async function claimAll(
  wallet: PrivyWalletLike,
  claims: ClaimableProof[],
): Promise<ClaimResult> {
  const conn    = new Connection(RPC, "confirmed");
  const claimer = new PublicKey(wallet.address);
  const result: ClaimResult = { successCount: 0, failedCount: 0, txSigs: [], errors: [] };

  // Bundle into batches of CLAIMS_PER_TX. Each batch is one tx.
  for (let i = 0; i < claims.length; i += CLAIMS_PER_TX) {
    const batch = claims.slice(i, i + CLAIMS_PER_TX);
    const tx    = new Transaction();
    for (const c of batch) tx.add(buildClaimIx(claimer, c));

    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer        = claimer;

    try {
      const signed = await wallet.signTransaction(tx);
      const sig    = await conn.sendRawTransaction(signed.serialize(), {
        skipPreflight:       false,
        preflightCommitment: "processed",
      });
      await conn.confirmTransaction(sig, "confirmed");
      result.successCount += batch.length;
      result.txSigs.push(sig);
    } catch (err) {
      result.failedCount += batch.length;
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return result;
}

// Suppress the unused-import warning for SystemProgram — kept available for
// future ix variants without forcing the importer to add it again.
void SystemProgram;
