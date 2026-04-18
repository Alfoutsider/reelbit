import { generateSlotArt } from "./imageGen";
import { getTheme, setTheme, deriveColors } from "./themeStore";

const SERVER_BASE = process.env.SERVER_BASE_URL ?? "http://localhost:3001";

export async function triggerThemeGeneration(
  mint: string,
  tokenName: string,
  tokenSymbol: string,
): Promise<void> {
  if (getTheme(mint)?.status === "ready") return;

  const { primary, accent } = deriveColors(tokenSymbol);

  setTheme({
    mint,
    tokenName,
    tokenSymbol,
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
      status: "ready",
      heroImageUrl: `${SERVER_BASE}/images/${heroFilename}`,
      bgImageUrl: `${SERVER_BASE}/images/${bgFilename}`,
      primaryColor: primary,
      accentColor: accent,
      updatedAt: Date.now(),
    });
    console.log(`[slotTheme] Theme ready for ${tokenSymbol}`);
  } catch (err) {
    console.error(`[slotTheme] Failed to generate art for ${tokenSymbol}:`, err);
    setTheme({
      mint,
      tokenName,
      tokenSymbol,
      status: "failed",
      heroImageUrl: null,
      bgImageUrl: null,
      primaryColor: primary,
      accentColor: accent,
      updatedAt: Date.now(),
    });
  }
}
