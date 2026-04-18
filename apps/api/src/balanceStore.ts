import fs from "fs";
import path from "path";

const BALANCE_PATH  = path.resolve(process.cwd(), "data/balances.json");
const DEPOSITS_PATH = path.resolve(process.cwd(), "data/deposits.json");

function readBalances(): Record<string, number> {
  try { return JSON.parse(fs.readFileSync(BALANCE_PATH, "utf-8")); }
  catch { return {}; }
}

function writeBalances(b: Record<string, number>): void {
  fs.mkdirSync(path.dirname(BALANCE_PATH), { recursive: true });
  fs.writeFileSync(BALANCE_PATH, JSON.stringify(b, null, 2));
}

export function isSeenDeposit(txSig: string): boolean {
  try {
    const seen: string[] = JSON.parse(fs.readFileSync(DEPOSITS_PATH, "utf-8"));
    return seen.includes(txSig);
  } catch { return false; }
}

export function markDepositSeen(txSig: string): void {
  let seen: string[] = [];
  try { seen = JSON.parse(fs.readFileSync(DEPOSITS_PATH, "utf-8")); } catch {}
  seen.push(txSig);
  fs.mkdirSync(path.dirname(DEPOSITS_PATH), { recursive: true });
  fs.writeFileSync(DEPOSITS_PATH, JSON.stringify(seen, null, 2));
}

export function getBalance(wallet: string): number {
  return readBalances()[wallet] ?? 0;
}

export function credit(wallet: string, lamports: number): number {
  const store = readBalances();
  store[wallet] = (store[wallet] ?? 0) + lamports;
  writeBalances(store);
  return store[wallet];
}

export function debit(wallet: string, lamports: number): number {
  const store = readBalances();
  const current = store[wallet] ?? 0;
  if (current < lamports) throw new Error(`Insufficient balance: have ${current}, need ${lamports}`);
  store[wallet] = current - lamports;
  writeBalances(store);
  return store[wallet];
}

export function transfer(from: string, to: string, lamports: number): void {
  const store = readBalances();
  const fromBal = store[from] ?? 0;
  if (fromBal < lamports) throw new Error("Insufficient balance");
  store[from] = fromBal - lamports;
  store[to] = (store[to] ?? 0) + lamports;
  writeBalances(store);
}
