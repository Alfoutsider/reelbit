import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import { config } from "./config";
import type { SlotGraduatedEvent } from "./types";

let migrationKeypair: Keypair | null = null;

function getMigrationKeypair(): Keypair {
  if (migrationKeypair) return migrationKeypair;
  const raw = JSON.parse(fs.readFileSync(config.migrationKeypairPath, "utf-8"));
  migrationKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  return migrationKeypair;
}

/**
 * Called after a SlotGraduated event is detected.
 *
 * Current implementation: records the graduation on-chain via graduation-detector.
 * TODO Sprint 4: Add Meteora Dynamic AMM pool creation + LP seeding via @meteora-ag/dynamic-amm SDK.
 */
export async function handleGraduation(
  event: SlotGraduatedEvent,
  connection: Connection,
): Promise<void> {
  console.log(`[migration] Graduation detected for mint: ${event.mint}`);
  console.log(`[migration] Creator: ${event.creator}, SOL in vault: ${Number(event.realSol) / 1e9}`);

  const authority = getMigrationKeypair();
  const mint = new PublicKey(event.mint);

  // Derive graduation-detector GraduationState PDA
  const [gradState] = PublicKey.findProgramAddressSync(
    [Buffer.from("grad_state"), mint.toBuffer()],
    new PublicKey(config.graduationDetectorProgramId),
  );

  // Check if grad_state exists — it may not if registration was skipped on devnet
  const gradStateInfo = await connection.getAccountInfo(gradState);
  if (!gradStateInfo) {
    console.log(`[migration] grad_state PDA not found for ${event.mint} — skipping on-chain record`);
    return;
  }

  // TODO: CPI call to graduation_detector::record_migration once Dynamic AMM pool is live
  // For now log the event so the casino backend can pick it up
  console.log(`[migration] ✅ Slot ${event.mint} ready for Dynamic AMM pool creation`);
  console.log(`[migration]    grad_state PDA: ${gradState.toBase58()}`);

  // TODO Sprint 4:
  // 1. Create Meteora Dynamic AMM pool via @meteora-ag/dynamic-amm SDK
  // 2. Seed with LP from the bonding_curve_vault
  // 3. Call graduation_detector::record_migration(dynamic_amm_pool)
  // 4. Update casino DB to show slot as LIVE
}
