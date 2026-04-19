import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "fs";
import { config } from "./config";

let _keypair: Keypair | null = null;

export function getHouseKeypair(): Keypair {
  if (_keypair) return _keypair;
  const raw = config.migrationKeypairJson
    ? JSON.parse(config.migrationKeypairJson)
    : JSON.parse(fs.readFileSync(config.migrationKeypairPath, "utf-8"));
  _keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  return _keypair;
}

export function getHouseWalletAddress(): string {
  return getHouseKeypair().publicKey.toBase58();
}

export async function sendSol(
  connection: Connection,
  toAddress: string,
  lamports: number,
): Promise<string> {
  const payer = getHouseKeypair();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports,
    }),
  );
  return sendAndConfirmTransaction(connection, tx, [payer]);
}

export async function verifyDepositTx(
  connection: Connection,
  txSignature: string,
): Promise<{ depositor: string; lamports: number }> {
  const houseAddress = getHouseWalletAddress();

  const tx = await connection.getParsedTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || tx.meta?.err) throw new Error("Transaction not found or failed");

  const accounts = tx.transaction.message.accountKeys;
  const pre  = tx.meta!.preBalances;
  const post = tx.meta!.postBalances;

  let houseIdx   = -1;
  let depositor  = "";

  for (let i = 0; i < accounts.length; i++) {
    const addr  = accounts[i].pubkey.toBase58();
    const delta = post[i] - pre[i];
    if (addr === houseAddress && delta > 0) houseIdx = i;
    if (delta < 0 && !depositor) depositor = addr;
  }

  if (houseIdx === -1) throw new Error("No SOL received by house wallet in this transaction");

  const lamports = post[houseIdx] - pre[houseIdx];
  return { depositor: depositor || accounts[0].pubkey.toBase58(), lamports };
}
