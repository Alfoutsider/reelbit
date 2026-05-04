import { generateSlotArt } from "./imageGen";
import { getTheme, setTheme, deriveColors, type SlotModel } from "./themeStore";
import { broadcast } from "./sseEmitter";

const SERVER_BASE = process.env.SERVER_BASE_URL ?? "http://localhost:3001";

// Image-gen retry policy. Replicate/Pollinations occasionally 5xx or rate-limit;
// without retries a single transient blip leaves a token's slot stuck in
// "failed" forever. Exponential backoff: 5s, 25s, 125s. Total worst-case ~2.5min.
const RETRY_BACKOFF_MS = [5_000, 25_000, 125_000];

/** Deterministically assign a slot model from the mint address. */
function deriveSlotModel(mint: string): SlotModel {
  const models: SlotModel[] = ["Classic3Reel", "Standard5Reel", "FiveReelFreeSpins"];
  const hash = mint.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  return models[Math.abs(hash) % models.length];
}

const _delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run image generation with up to 4 attempts (1 + 3 retries) on exponential
 * backoff. The theme's `status` field stays at "generating" between attempts
 * so the UI keeps showing the loading state instead of flicking to "failed".
 */
async function generateWithRetry(
  mint: string,
  tokenName: string,
  tokenSymbol: string,
): Promise<{ heroFilename: string; bgFilename: string }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    try {
      return await generateSlotArt(mint, tokenName, tokenSymbol);
    } catch (err) {
      lastErr = err;
      const isLast = attempt === RETRY_BACKOFF_MS.length;
      console.warn(
        `[slotTheme] art-gen attempt ${attempt + 1}/${RETRY_BACKOFF_MS.length + 1} ` +
        `failed for ${tokenSymbol}${isLast ? " (no more retries)" : ""}:`,
        (err as Error).message,
      );
      if (isLast) break;
      await _delay(RETRY_BACKOFF_MS[attempt]);
    }
  }
  throw lastErr;
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
    const { heroFilename, bgFilename } = await generateWithRetry(mint, tokenName, tokenSymbol);
    const heroImageUrl = `${SERVER_BASE}/images/${heroFilename}`;
    const bgImageUrl   = `${SERVER_BASE}/images/${bgFilename}`;
    setTheme({
      mint,
      tokenName,
      tokenSymbol,
      slotModel,
      graduated,
      status: "ready",
      heroImageUrl,
      bgImageUrl,
      primaryColor: primary,
      accentColor: accent,
      updatedAt: Date.now(),
    });
    // Tell the casino lobby art is live so it can swap from placeholder.
    broadcast("theme:ready", {
      mint,
      tokenSymbol,
      heroImageUrl,
      bgImageUrl,
      ts: Date.now(),
    });
    console.log(`[slotTheme] Theme ready for ${tokenSymbol} (graduated=${graduated})`);
  } catch (err) {
    console.error(`[slotTheme] All retries exhausted for ${tokenSymbol}:`, err);
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

/**
 * Force-regenerate a theme regardless of its current status. Used by the
 * admin "Regenerate" button when a slot got stuck or its art is wrong.
 */
export async function regenerateTheme(mint: string): Promise<{ ok: boolean; error?: string }> {
  const existing = getTheme(mint);
  if (!existing) return { ok: false, error: "theme not found" };

  // Reset status so the trigger function doesn't no-op on a "ready" theme.
  setTheme({ ...existing, status: "generating", updatedAt: Date.now() });
  try {
    await triggerThemeGeneration(
      mint,
      existing.tokenName,
      existing.tokenSymbol,
      existing.graduated,
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
