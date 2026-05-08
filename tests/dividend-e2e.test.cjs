/**
 * End-to-end devnet test for the Merkle dividend pipeline.
 *
 *   1. Launch a fresh token
 *   2. Buy past the (test-lowered) graduation threshold → flips
 *      slot_metadata.graduated = true on-chain
 *   3. Manually fund holder_dividend_vault with 0.1 SOL (simulating
 *      LP-fee accumulation, since we're skipping the Meteora pool
 *      creation step in this slice)
 *   4. Build a single-leaf Merkle tree (test wallet is the only holder)
 *   5. Call publish_dividend_root → debits the vault into a fresh
 *      DividendRound PDA, stores the root + bitmap
 *   6. Call claim_dividend → verifies proof, marks bitmap, transfers
 *      lamports back to the test wallet
 *   7. Re-call claim_dividend → expect AlreadyClaimed error
 */
"use strict";

const web3      = require("@solana/web3.js");
const splToken  = require("@solana/spl-token");
const anchor    = require("@coral-xyz/anchor");
const { createHash } = require("crypto");
const fs        = require("fs");
const path      = require("path");

const { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction, TransactionInstruction } = web3;
const Keypair = anchor.web3.Keypair;
const { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = splToken;
const { AnchorProvider, Program, BN, Wallet } = anchor;

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL = process.env.ANCHOR_PROVIDER_URL || "https://devnet.helius-rpc.com/?api-key=87f467c6-8315-418d-a730-3f8f058cf592";
const TOKEN_LAUNCH_ID  = new PublicKey("5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8");
const METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const FUND_VAULT_SOL = 0.1; // SOL to drop into holder_dividend_vault for the test

// ── Setup ─────────────────────────────────────────────────────────────────────

const walletPath = process.env.ANCHOR_WALLET ||
  path.resolve(process.env.HOME, ".config/solana/id.json");
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
);

const connection = new Connection(RPC_URL, "confirmed");
const provider   = new AnchorProvider(connection, new Wallet(payer), { commitment: "confirmed" });
anchor.setProvider(provider);

const idl     = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../target/idl/token_launch.json"), "utf-8"));
const program = new Program({ ...idl, address: TOKEN_LAUNCH_ID.toBase58() }, provider);

// ── PDA helpers ───────────────────────────────────────────────────────────────

const pda = (seeds, prog = TOKEN_LAUNCH_ID) => PublicKey.findProgramAddressSync(seeds, prog)[0];
const slotMetaPda     = (mint) => pda([Buffer.from("slot_metadata"),  mint.toBuffer()]);
const bondingPda      = (mint) => pda([Buffer.from("bonding_curve"),  mint.toBuffer()]);
const feeVaultPda     = (mint) => pda([Buffer.from("fee_vault"),      mint.toBuffer()]);
const jackpotVaultPda = (mint) => pda([Buffer.from("jackpot_vault"),  mint.toBuffer()]);
const walletCapPda    = (mint, w) => pda([Buffer.from("wallet_cap"),  mint.toBuffer(), w.toBuffer()]);
const metadataPda     = (mint) => pda([Buffer.from("metadata"), METADATA_PROGRAM.toBuffer(), mint.toBuffer()], METADATA_PROGRAM);
const platformCfgPda  = ()     => pda([Buffer.from("platform_config")]);
const holderDivPda    = (mint) => pda([Buffer.from("holder_dividend"), mint.toBuffer()]);
const dividendRoundPda = (mint, round) => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(round));
  return pda([Buffer.from("dividend_round"), mint.toBuffer(), buf]);
};

function log(label, value) {
  if (value !== undefined) console.log(`  ${(label + " ").padEnd(34, ".")} ${value}`);
  else console.log(`\n── ${label} ──`);
}

// ── Merkle helpers (must match Rust) ──────────────────────────────────────────

const sha = (...parts) => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest();
};

function buildLeaf(round, idx, holder, amount) {
  const buf = Buffer.alloc(8 + 1 + 32 + 8);
  buf.writeBigUInt64LE(BigInt(round), 0);
  buf.writeUInt8(idx, 8);
  Buffer.from(holder.toBuffer()).copy(buf, 9);
  buf.writeBigUInt64LE(BigInt(amount), 41);
  return sha(buf);
}

function hashPair(a, b) {
  return Buffer.compare(a, b) <= 0 ? sha(a, b) : sha(b, a);
}

// Build sorted-siblings tree, returns {root, proofs[]}
function buildTree(leaves) {
  const levels = [leaves.slice()];
  while (levels[levels.length - 1].length > 1) {
    const cur = levels[levels.length - 1];
    const next = [];
    for (let i = 0; i < cur.length; i += 2) {
      const left = cur[i];
      const right = i + 1 < cur.length ? cur[i + 1] : cur[i];
      next.push(hashPair(left, right));
    }
    levels.push(next);
  }
  const proofs = leaves.map((_, idx) => {
    const proof = [];
    let cur = idx;
    for (let depth = 0; depth < levels.length - 1; depth++) {
      const layer = levels[depth];
      const sibIdx = cur ^ 1;
      proof.push(sibIdx < layer.length ? layer[sibIdx] : layer[cur]);
      cur >>= 1;
    }
    return proof;
  });
  return { root: levels[levels.length - 1][0], proofs };
}

// ── Steps ─────────────────────────────────────────────────────────────────────

async function launchToken() {
  log("1. Launch token");
  const mintKp = Keypair.generate();
  const mint   = mintKp.publicKey;
  const slotMd        = slotMetaPda(mint);
  const bonding       = bondingPda(mint);
  const feeVault      = feeVaultPda(mint);
  const jackpotVault  = jackpotVaultPda(mint);
  const metadata      = metadataPda(mint);
  const vaultAta      = getAssociatedTokenAddressSync(mint, bonding, true);

  const sig = await program.methods
    .launchSlot({
      name:        "DivTest",
      ticker:      "DIVT",
      imageUri:    "https://placehold.co/512?text=DIVT",
      metadataUri: `https://reelbit-api.onrender.com/metadata/${mint.toBase58()}`,
      model:       { classic3Reel: {} },
      devBuySolAmount: new BN(0),
    })
    .accounts({
      creator:         payer.publicKey,
      mint,
      slotMetadata:    slotMd,
      bondingCurveVault: bonding,
      feeVault,
      jackpotVault,
      vaultTokenAccount: vaultAta,
      metadataAccount:   metadata,
      tokenMetadataProgram: METADATA_PROGRAM,
      tokenProgram:    TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram:   SystemProgram.programId,
      rent:            web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKp])
    .rpc();
  log("tx", sig);
  log("mint", mint.toBase58());
  return { mint, bonding, feeVault, jackpotVault, vaultAta };
}

async function buyToGraduation(mint, bonding, feeVault, vaultAta) {
  log("2. Buy past 5 SOL test threshold");
  const buyAta = getAssociatedTokenAddressSync(mint, payer.publicKey);
  const walletCap = walletCapPda(mint, payer.publicKey);

  // Buy 5.5 SOL — guarantees crossing the 5 SOL threshold even after fees.
  const buySol = 5.5 * LAMPORTS_PER_SOL;
  const sig = await program.methods
    .buyTokens(new BN(buySol), new BN(0))
    .accounts({
      buyer: payer.publicKey,
      mint,
      bondingCurveVault: bonding,
      feeVault,
      walletCap,
      buyerTokenAccount: buyAta,
      vaultTokenAccount: vaultAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  log("buy tx", sig);

  const slotMd = slotMetaPda(mint);
  const slotData = await program.account.slotMetadata.fetch(slotMd);
  log("graduated flag", slotData.graduated);
  if (!slotData.graduated) throw new Error("Token did not graduate after 5.5 SOL buy");
  log("✓ Graduation triggered", "slot_metadata.graduated == true");
}

async function fundHolderDividend(mint) {
  log("3. Manually fund holder_dividend_vault");
  const vault = holderDivPda(mint);
  const lamports = Math.floor(FUND_VAULT_SOL * LAMPORTS_PER_SOL);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey:   vault,
      lamports,
    }),
  );
  const sig = await web3.sendAndConfirmTransaction(connection, tx, [payer]);
  log("tx", sig);
  const balance = await connection.getBalance(vault);
  log("✓ vault funded", `${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  return BigInt(lamports);
}

async function publishRound(mint, distributable) {
  log("4. Build Merkle tree + publish_dividend_root");
  // Single-leaf tree for the test (only holder is the payer)
  const round = 0n;
  const leaves = [buildLeaf(round, 0, payer.publicKey, distributable)];
  const { root, proofs } = buildTree(leaves);
  log("merkle root", "0x" + root.toString("hex"));
  log("leaf hash",   "0x" + leaves[0].toString("hex"));

  const sig = await program.methods
    .publishDividendRoot(new BN(0), new BN(distributable.toString()), Array.from(root))
    .accounts({
      authority:           payer.publicKey,
      mint,
      platformConfig:      platformCfgPda(),
      holderDividendVault: holderDivPda(mint),
      dividendRound:       dividendRoundPda(mint, 0),
      systemProgram:       SystemProgram.programId,
    })
    .rpc();
  log("tx", sig);

  const round0 = await program.account.dividendRound.fetch(dividendRoundPda(mint, 0));
  log("on-chain total_amount", round0.totalAmount.toString());
  log("on-chain root matches", Buffer.from(round0.merkleRoot).equals(root));
  log("on-chain expires_at",   new Date(round0.expiresAt.toNumber() * 1000).toISOString());

  return { root, proof: proofs[0], distributable };
}

async function claim(mint, distributable, proof) {
  log("5. claim_dividend");
  const balanceBefore = await connection.getBalance(payer.publicKey);
  const sig = await program.methods
    .claimDividend(
      new BN(0),                              // round
      0,                                        // leaf_index
      new BN(distributable.toString()),         // amount
      proof.map((p) => Array.from(p)),          // proof: Vec<[u8;32]>
    )
    .accounts({
      claimer:       payer.publicKey,
      mint,
      dividendRound: dividendRoundPda(mint, 0),
    })
    .rpc();
  log("tx", sig);

  const balanceAfter = await connection.getBalance(payer.publicKey);
  const round0 = await program.account.dividendRound.fetch(dividendRoundPda(mint, 0));
  log("claimed_count",  round0.claimedCount);
  log("claimed_amount", round0.claimedAmount.toString());
  log("bitmap[0] bit 0 set", (round0.claimedBitmap[0] & 1) === 1);

  const delta = balanceAfter - balanceBefore;
  log("Δ balance (lamports)", delta.toString());
  // Note: delta = +amount - tx_fee. tx_fee ≈ 5000 lamports.
  if (delta < Number(distributable) - 100_000) throw new Error(`Claim payout too small: delta=${delta}, expected ~${distributable}`);
  log("✓ SOL received");
}

async function doubleClaim(mint, distributable, proof) {
  log("6. claim_dividend AGAIN — should fail with AlreadyClaimed");
  try {
    await program.methods
      .claimDividend(
        new BN(0), 0, new BN(distributable.toString()),
        proof.map((p) => Array.from(p)),
      )
      .accounts({
        claimer:       payer.publicKey,
        mint,
        dividendRound: dividendRoundPda(mint, 0),
      })
      .rpc();
    throw new Error("Double-claim succeeded — bitmap not enforced");
  } catch (err) {
    if (err.message?.includes("AlreadyClaimed") || (err.error?.errorCode?.code === "AlreadyClaimed")) {
      log("✓ Bitmap enforced", "AlreadyClaimed (expected)");
    } else if (err.logs?.some((l) => l.includes("AlreadyClaimed"))) {
      log("✓ Bitmap enforced", "AlreadyClaimed (in tx logs)");
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log("\n🎰  ReelBit Dividend Pipeline — Devnet E2E\n");
  console.log("    wallet:  ", payer.publicKey.toBase58());
  const bal = await connection.getBalance(payer.publicKey);
  console.log("    balance: ", `${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  if (bal < 7 * LAMPORTS_PER_SOL) throw new Error("Need ≥7 SOL on devnet");

  const { mint, bonding, feeVault, vaultAta } = await launchToken();
  await buyToGraduation(mint, bonding, feeVault, vaultAta);
  const distributable = await fundHolderDividend(mint);
  // Reserve rent floor before publishing — we can't drain the vault entirely.
  // The on-chain ix enforces this, so we publish slightly less than the full balance.
  const rentFloor = BigInt(await connection.getMinimumBalanceForRentExemption(0));
  const publishable = distributable - rentFloor;
  const { proof } = await publishRound(mint, publishable);
  await claim(mint, publishable, proof);
  await doubleClaim(mint, publishable, proof);

  console.log("\n✅  All dividend pipeline tests passed!\n");
}

main().catch((err) => {
  console.error("\n❌  Test failed:", err.message || err);
  if (err.logs) console.error("Logs:", err.logs.slice(-10).join("\n"));
  process.exit(1);
});
