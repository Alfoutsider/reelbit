import "dotenv/config";

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001"),
  rpcUrl: process.env.RPC_URL ?? "https://api.devnet.solana.com",
  heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET ?? "",
  // Keypair: prefer JSON array env var (production), fall back to file (local dev)
  migrationKeypairJson: process.env.MIGRATION_KEYPAIR_JSON ?? "",
  migrationKeypairPath: process.env.MIGRATION_KEYPAIR_PATH ?? `${process.env.HOME}/.config/solana/id.json`,
  tokenLaunchProgramId: "5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8",
  graduationDetectorProgramId: "UkSurzWXkysn6j3jGcYxKT5zzox4riJoeuPBieod5jS",
  distributionProgramId: "GLkNLk84MXxDpf2xJyVuzrMn2GFMYdiQUF52AEaD3FtM",
  lpVaultProgramId: "GkafhSz23DhkebGnL3BKh2mJgFTXXLmE7PJ3rUQAwytm",
  internalSecret: process.env.INTERNAL_API_SECRET ?? "dev-secret-change-in-prod",
  adminKey:       process.env.ADMIN_API_KEY ?? "admin-dev-key",
  heliusApiKey:   process.env.HELIUS_API_KEY ?? "",
  serverBaseUrl:  process.env.SERVER_BASE_URL ?? "http://localhost:3001",
  dataDir:        process.env.DATA_DIR ?? "./data",
};
