/**
 * Merkle Dividend Cron — runs every 12 hours.
 *
 * Replaces the old push-style holderDividendCron with a pull/Merkle model:
 *   1. For each graduated mint with > MIN_PUBLISH lamports in its
 *      holder_dividend_vault PDA…
 *   2. Fetch top-100 holders from Helius DAS
 *   3. Compute pro-rata shares; drop dust below MIN_HOLDER_LAMPORTS
 *   4. Build a SHA-256 sorted-siblings Merkle tree (matches on-chain verifier)
 *   5. Persist (mint, round, holder, leaf_index, amount, proof) to Supabase
 *   6. Call publish_dividend_root to lock total_amount lamports + commit root
 *
 * Holders pull their share via claim_dividend on-chain; this cron never sends
 * SOL directly.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import fs from "fs";
import { config } from "./config";
import { getGraduatedWithPool } from "./themeStore";
import {
  getNextRoundFor,
  insertRound,
  insertProofs,
} from "./dividendRoundStore";
import { buildDividendTree } from "./merkleTree";
import TOKEN_LAUNCH_IDL from "./idl/token_launch.json";

// ── Tunables ──────────────────────────────────────────────────────────────────

const PUBLISH_INTERVAL_MS  = 12 * 60 * 60 * 1_000;        // every 12 hours
const STARTUP_DELAY_MS     = 10 * 60 * 1_000;             // first run after 10 min
const MIN_PUBLISH_LAMPORTS = 50_000_000;                  // 0.05 SOL min vault balance
const MAX_HOLDERS          = 100;                          // matches on-chain MAX_HOLDERS
const MIN_HOLDER_LAMPORTS  = 750_000;                      // ~$0.10 dust threshold @ $130 SOL

const TOKEN_LAUNCH_PROGRAM = new PublicKey(config.tokenLaunchProgramId);

const HELIUS_DAS_URL = config.rpcUrl.includes("mainnet")
  ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusApiKey}`
  : `https://devnet.helius-rpc.com/?api-key=${config.heliusApiKey}`;

// ── PDA helpers ───────────────────────────────────────────────────────────────

const platformConfigPda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("platform_config")], TOKEN_LAUNCH_PROGRAM)[0];

const holderDividendPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("holder_dividend"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM,
  )[0];

const dividendRoundPda = (mint: PublicKey, round: bigint) => {
  const roundBuf = Buffer.alloc(8);
  roundBuf.writeBigUInt64LE(round);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dividend_round"), mint.toBuffer(), roundBuf],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
};

// ── Authority / IDL helpers ───────────────────────────────────────────────────

let _authority: Keypair | null = null;

function getAuthority(): Keypair {
  if (_authority) return _authority;
  const raw = config.migrationKeypairJson
    ? JSON.parse(config.migrationKeypairJson)
    : JSON.parse(fs.readFileSync(config.migrationKeypairPath, "utf-8"));
  _authority = Keypair.fromSecretKey(Uint8Array.from(raw));
  return _authority;
}

function loadDiscriminator(instructionName: string): Buffer {
  const idl = TOKEN_LAUNCH_IDL as { instructions: Array<{ name: string; discriminator: number[] }> };
  const ix = idl.instructions.find((i) => i.name === instructionName);
  if (!ix) throw new Error(`Instruction "${instructionName}" not found in IDL`);
  return Buffer.from(ix.discriminator);
}

// ── Helius DAS: top-100 holders ───────────────────────────────────────────────

interface DasTokenAccount { owner: string; amount: string }

async function fetchTopHolders(mint: string): Promise<Array<{ owner: string; rawAmount: bigint }>> {
  if (!config.heliusApiKey) {
    console.warn("[merkle-div] HELIUS_API_KEY not set");
    return [];
  }

  const body = {
    jsonrpc: "2.0",
    id:      "merkle-div",
    method:  "getTokenAccounts",
    params:  { mint, limit: MAX_HOLDERS, page: 1, options: { showZeroBalance: false } },
  };
  const res = await fetch(HELIUS_DAS_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Helius DAS HTTP ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { result?: { token_accounts: DasTokenAccount[] } };
  const accounts = data.result?.token_accounts ?? [];

  return accounts
    .filter((a) => BigInt(a.amount) > 0n)
    .sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1))
    .slice(0, MAX_HOLDERS)
    .map((a) => ({ owner: a.owner, rawAmount: BigInt(a.amount) }));
}

// ── Tx builder: publish_dividend_root ─────────────────────────────────────────

function buildPublishIx(args: {
  authority:   PublicKey;
  mint:        PublicKey;
  round:       bigint;
  totalAmount: bigint;
  merkleRoot:  Buffer;
}): TransactionInstruction {
  const disc = loadDiscriminator("publish_dividend_root");
  const data = Buffer.alloc(8 + 8 + 8 + 32);
  disc.copy(data, 0);
  data.writeBigUInt64LE(args.round, 8);
  data.writeBigUInt64LE(args.totalAmount, 16);
  args.merkleRoot.copy(data, 24);

  const platformConfig = platformConfigPda();
  const holderVault    = holderDividendPda(args.mint);
  const round          = dividendRoundPda(args.mint, args.round);

  return new TransactionInstruction({
    programId: TOKEN_LAUNCH_PROGRAM,
    keys: [
      { pubkey: args.authority,            isSigner: true,  isWritable: true  },
      { pubkey: args.mint,                  isSigner: false, isWritable: false },
      { pubkey: platformConfig,             isSigner: false, isWritable: false },
      { pubkey: holderVault,                isSigner: false, isWritable: true  },
      { pubkey: round,                      isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId,    isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ── Per-mint round publication ────────────────────────────────────────────────

async function publishRoundFor(connection: Connection, mintStr: string): Promise<void> {
  const mint = new PublicKey(mintStr);
  const vault = holderDividendPda(mint);

  const vaultBalance = await connection.getBalance(vault);
  if (vaultBalance < MIN_PUBLISH_LAMPORTS) {
    return; // nothing to do
  }

  // Reserve rent floor on the vault — never empty it below rent
  const rentFloor    = await connection.getMinimumBalanceForRentExemption(0);
  const distributable = BigInt(Math.max(0, vaultBalance - rentFloor));
  if (distributable === 0n) return;

  const holders = await fetchTopHolders(mintStr);
  if (holders.length === 0) {
    console.log(`[merkle-div] ${mintStr.slice(0, 8)}… — no holders`);
    return;
  }

  // Pro-rata split, dust-filtered
  const totalRaw = holders.reduce((sum, h) => sum + h.rawAmount, 0n);
  if (totalRaw === 0n) return;

  const leaves = holders
    .map((h, i) => {
      const share = (distributable * h.rawAmount) / totalRaw;
      return { leafIndex: i, holder: new PublicKey(h.owner), amount: share };
    })
    .filter((l) => l.amount >= BigInt(MIN_HOLDER_LAMPORTS));

  if (leaves.length === 0) {
    console.log(`[merkle-div] ${mintStr.slice(0, 8)}… — all shares below dust`);
    return;
  }

  // Reassign leaf_index to be contiguous after dust filter (matches the bitmap
  // semantic: leaf_index ∈ [0, leaves.length))
  const compacted = leaves.map((l, i) => ({ ...l, leafIndex: i }));
  const totalAmount = compacted.reduce((sum, l) => sum + l.amount, 0n);

  // Determine next round number (sequential per mint)
  const round = BigInt(await getNextRoundFor(mintStr));

  // Build Merkle tree
  const { root, entries } = buildDividendTree(round, compacted);

  // Publish on-chain
  const authority = getAuthority();
  const ix = buildPublishIx({
    authority:   authority.publicKey,
    mint,
    round,
    totalAmount,
    merkleRoot:  root,
  });
  const tx = new Transaction().add(ix);
  let sig: string;
  try {
    sig = await sendAndConfirmTransaction(connection, tx, [authority], { commitment: "confirmed" });
  } catch (err) {
    console.error(
      `[merkle-div] ${mintStr.slice(0, 8)}… publish_dividend_root failed: ` +
      (err instanceof Error ? err.message : String(err)),
    );
    return;
  }

  // Persist proofs only after on-chain publish succeeds — if persist
  // fails we can republish (the on-chain account would already exist
  // and the second publish would fail, alerting us to manual recovery).
  await insertRound({
    mint:           mintStr,
    round:          Number(round),
    merkleRoot:     "0x" + root.toString("hex"),
    totalAmount:    Number(totalAmount),
    holderCount:    entries.length,
    expiresAt:      new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
    publishTxSig:   sig,
  });
  await insertProofs(entries.map((e) => ({
    mint:       mintStr,
    round:      Number(round),
    holder:     e.holder.toBase58(),
    leafIndex:  e.leafIndex,
    amount:     Number(e.amount),
    proof:      e.proof.map((p) => "0x" + p.toString("hex")),
  })));

  console.log(
    `[merkle-div] ✅ ${mintStr.slice(0, 8)}… round ${round} — ` +
    `${(Number(totalAmount) / LAMPORTS_PER_SOL).toFixed(6)} SOL across ${entries.length} holders ` +
    `(tx ${sig.slice(0, 8)}…)`,
  );
}

// ── Run + cron starter ────────────────────────────────────────────────────────

async function runPublishRound(connection: Connection): Promise<void> {
  const graduated = getGraduatedWithPool();
  if (graduated.length === 0) {
    console.log("[merkle-div] No graduated mints to publish for");
    return;
  }

  console.log(`\n[merkle-div] ── Publish round: ${graduated.length} graduated mint(s) ──`);

  for (const t of graduated) {
    try {
      await publishRoundFor(connection, t.mint);
    } catch (err) {
      console.error(
        `[merkle-div] ❌ ${t.mint.slice(0, 8)}… error: ` +
        (err instanceof Error ? err.message : String(err)),
      );
    }
  }
}

export function startMerkleDividendCron(connection: Connection): void {
  setTimeout(() => runPublishRound(connection).catch(console.error), STARTUP_DELAY_MS);
  setInterval(() => runPublishRound(connection).catch(console.error), PUBLISH_INTERVAL_MS);
  console.log("[merkle-div] Merkle dividend cron started (12h interval)");
}
