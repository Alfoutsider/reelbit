import fs from "fs";
import path from "path";

const STORE_PATH = path.resolve(process.cwd(), "data/profiles.json");
const PFP_DIR    = path.resolve(process.cwd(), "data/pfp");

export interface UserProfile {
  userId:    string;          // permanent — randomly assigned at creation
  wallet:    string;          // permanent — the owning wallet
  username:  string;          // changeable
  pfpUrl:    string | null;   // changeable
  pfpType:   "upload" | "nft" | null;
  nftMint:   string | null;
  createdAt: number;
}

function generateUserId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O 1/I
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function readStore(): Record<string, UserProfile> {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")); }
  catch { return {}; }
}

function writeStore(s: Record<string, UserProfile>): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(s, null, 2));
}

export function getProfile(wallet: string): UserProfile | null {
  return readStore()[wallet] ?? null;
}

export function isUsernameTaken(username: string, excludeWallet?: string): boolean {
  return Object.values(readStore()).some(
    (p) => p.username.toLowerCase() === username.toLowerCase() && p.wallet !== excludeWallet,
  );
}

export function createProfile(wallet: string, username: string): UserProfile {
  const store = readStore();
  if (store[wallet]) return store[wallet];

  const existingIds = new Set(Object.values(store).map((p) => p.userId));
  let userId: string;
  do { userId = generateUserId(); } while (existingIds.has(userId));

  const profile: UserProfile = {
    userId, wallet, username,
    pfpUrl: null, pfpType: null, nftMint: null,
    createdAt: Date.now(),
  };
  store[wallet] = profile;
  writeStore(store);
  return profile;
}

export function updateProfile(
  wallet: string,
  updates: Partial<Pick<UserProfile, "username" | "pfpUrl" | "pfpType" | "nftMint">>,
): UserProfile {
  const store = readStore();
  if (!store[wallet]) throw new Error("Profile not found — create one first");
  store[wallet] = { ...store[wallet], ...updates };
  writeStore(store);
  return store[wallet];
}

/** Save base64 image data to disk, return the filename. */
export function savePfpFile(wallet: string, base64Data: string, ext: string): string {
  fs.mkdirSync(PFP_DIR, { recursive: true });
  const safeExt  = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
  const filename  = `${wallet.slice(0, 16)}_${Date.now()}.${safeExt}`;
  fs.writeFileSync(path.join(PFP_DIR, filename), Buffer.from(base64Data, "base64"));
  return filename;
}
