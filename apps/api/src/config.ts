import "dotenv/config";

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  if (!process.env.ADMIN_API_KEY || process.env.ADMIN_API_KEY === "admin-dev-key") {
    throw new Error("[config] ADMIN_API_KEY must be set to a secret value in production");
  }
  if (!process.env.INTERNAL_API_SECRET || process.env.INTERNAL_API_SECRET === "dev-secret-change-in-prod") {
    throw new Error("[config] INTERNAL_API_SECRET must be set to a secret value in production");
  }
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
  serverBaseUrl:       process.env.SERVER_BASE_URL ?? "http://localhost:3001",
  dataDir:             process.env.DATA_DIR ?? "./data",
  turnstileSecretKey:  process.env.TURNSTILE_SECRET_KEY ?? "",
  funUrl:              process.env.FUN_URL ?? "http://localhost:3000",
  frontendUrl:         process.env.FRONTEND_URL ?? "http://localhost:3002",
  supabaseUrl:         process.env.SUPABASE_URL ?? "",
  supabaseKey:         process.env.SUPABASE_KEY ?? "",
  anthropicApiKey:     process.env.ANTHROPIC_API_KEY ?? "",
};
