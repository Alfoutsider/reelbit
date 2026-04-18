import { generateSlotArt } from "./imageGen";
import { getTheme, setTheme, deriveColors, type SlotModel } from "./themeStore";

const SERVER_BASE = process.env.SERVER_BASE_URL ?? "http://localhost:3001";

/** Deterministically assign a slot model from the mint address. */
function deriveSlotModel(mint: string): SlotModel {
  const models: SlotModel[] = ["Classic3Reel", "Standard5Reel", "FiveReelFreeSpins"];
  const hash = mint.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  return models[Math.abs(hash) % models.length];
}

export async function triggerThemeGeneration(
  mint: string,
  tokenName: string,
  tokenSymbol: string,
  graduated = false,
): Promise<void> {
  const existing = getTheme(mint);
  if (existing?.status === "ready" && existing.graduated === graduated) return;

  const { primary, accent } = deriveColors(tokenSymbol);
  const slotModel = existing?.slotModel ?? deriveSlotModel(mint);

  setTheme({
    mint,
    tokenName,
    tokenSymbol,
    slotModel,
    graduated,
    status: "generating",
    heroImageUrl: null,
    bgImageUrl: null,
    primaryColor: primary,
    accentColor: accent,
    updatedAt: Date.now(),
  });

  try {
    const { heroFilename, bgFilename } = await generateSlotArt(mint, tokenName, tokenSymbol);
    setTheme({
      mint,
      tokenName,
      tokenSymbol,
      slotModel,
      graduated,
      status: "ready",
      heroImageUrl: `${SERVER_BASE}/images/${heroFilename}`,
      bgImageUrl: `${SERVER_BASE}/images/${bgFilename}`,
      primaryColor: primary,
      accentColor: accent,
      updatedAt: Date.now(),
    });
    console.log(`[slotTheme] Theme ready for ${tokenSymbol} (graduated=${graduated})`);
  } catch (err) {
    console.error(`[slotTheme] Failed to generate art for ${tokenSymbol}:`, err);
    setTheme({
      mint,
      tokenName,
      tokenSymbol,
      slotModel,
      graduated,
      status: "failed",
      heroImageUrl: null,
      bgImageUrl: null,
      primaryColor: primary,
      accentColor: accent,
      updatedAt: Date.now(),
    });
  }
}
