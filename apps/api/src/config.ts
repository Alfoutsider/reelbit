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
  migrationKeypairPath: process.env.MIGRATION_KEYPAIR_PATH ?? `${process.env.HOME}/.config/solana/id.json`,
  tokenLaunchProgramId: "HkGiTLpuij4w7ZM87ooYYn3JPy9neEaxZPwpJKU2imzu",
  graduationDetectorProgramId: "HjrWDt8x46beDUP33NCzHc4VdswYKEE2axf6F2CoDxha",
  distributionProgramId: "58JoCZYPdLiixapnsYM6xXYB7Me8M6TKGXsqCewEto8v",
  lpVaultProgramId: "5Vobh8rxWv4eMKUme9Y15C3ta3vh6y1G7MW6N87SejwL",
};
