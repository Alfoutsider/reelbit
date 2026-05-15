import fs from "fs";
import path from "path";
import { config } from "./config";
import type { SlotModel } from "./themeStore";

export interface StudioPalette {
  primary: string;
  accent: string;
  bg: string;
}

export interface StudioAnalysis {
  themeDescription: string;
  palette: StudioPalette;
  bgPrompt: string;
  symbols: Record<string, string>; // symbolId → SVG string
  symbolIds: string[];              // ordered list of generated symbol IDs
  sourceImageUrl: string;
  bgImageUrl: string;              // Pollinations URL (loads on demand)
}

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", gif: "image/gif", webp: "image/webp",
};

// ── Per-theme symbol specs ────────────────────────────────────────────────────
// Cards (ACE/KING/QUEEN/JACK/TEN) are excluded — they use built-in themed renderers.

interface SymbolSpec {
  id: string;
  role: string;
}

const THEME_SPECS: Record<SlotModel, SymbolSpec[]> = {
  Classic3Reel: [
    { id: "SEVEN",  role: "Jackpot 7 — the premium symbol. A gleaming bold lucky number 7, radiant and iconic. Most elaborate design." },
    { id: "WILD",   role: "Wild — a shimmering special-card substitute with radiant energy, the image's accent color." },
    { id: "BAR3",   role: "Triple BAR — three stacked horizontal bars with depth and beveling, high value." },
    { id: "BAR2",   role: "Double BAR — two horizontal bars, same style but half the stack, medium-high." },
    { id: "BAR1",   role: "Single BAR — one horizontal bar, simplified, medium value." },
    { id: "BELL",   role: "Bell — an ornate ringing bell inspired by the image's color palette, medium-low." },
    { id: "CHERRY", role: "Cherry — a pair of ripe cherries on stems, small and bright, low-medium." },
    { id: "LEMON",  role: "Lemon — a glossy citrus lemon oval, low value." },
    { id: "ORANGE", role: "Orange — a round citrus orange fruit, lowest value." },
  ],
  Standard5Reel: [
    { id: "DRAGON",   role: "Dragon — the jackpot premium. Fierce dragon head with fire, scales, and glowing eyes inspired by the image's dominant element. Most elaborate." },
    { id: "FIRE_ORB", role: "Fire Orb — a blazing magical sphere or the image's iconic power object, wild-tier premium." },
    { id: "GEM",      role: "Gem — a multi-faceted precious gemstone in the image's richest colors, high value." },
    { id: "SWORD",    role: "Sword — an ornate blade or sharp emblem from the image's theme, high value." },
    { id: "SHIELD",   role: "Shield — a heraldic shield or protective crest element, medium-high." },
    { id: "HELMET",   role: "Helmet — an armored helmet or defining character motif from the image, medium." },
    { id: "WILD",     role: "Wild — a fire banner or glowing emblem wild substitute in the image's dominant hue." },
    { id: "SCATTER",  role: "Scatter — a glowing egg, orb, or secondary icon that triggers bonus rounds. Must look distinct from all others." },
  ],
  FiveReelFreeSpins: [
    { id: "PHARAOH",  role: "Pharaoh — the jackpot premium. A regal portrait or divine figure inspired by the image's most iconic element. Elaborate gold headdress or crown." },
    { id: "EYE_RA",   role: "Eye of Ra — a mystical all-seeing eye with sun rays or radiant spiritual symbol from the image." },
    { id: "ANUBIS",   role: "Anubis — a jackal-headed or beast-faced guardian, high value." },
    { id: "SCARAB",   role: "Scarab — a winged beetle or mechanical creature pushing a glowing orb, high value." },
    { id: "ANKH",     role: "Ankh — an ornate cross-of-life or looped key symbol with jewel accents, medium-high." },
    { id: "SNAKE",    role: "Snake — a coiled cobra or serpent with spread hood, medium value." },
    { id: "VASE",     role: "Vase — an ornate canopic jar or sacred vessel artifact, medium-low." },
    { id: "WILD",     role: "Wild — a golden cartouche or divine seal wild substitute in the image's richest color." },
    { id: "SCATTER",  role: "Scatter — a pyramid, temple portal, or sacred ruin that triggers free spins. Must be distinct from all others." },
  ],
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(specs: SymbolSpec[]): string {
  const symbolRoles = specs
    .map(({ id, role }, i) => {
      const tier = i === 0 ? "★ JACKPOT — highest value"
        : i === 1 ? "★★ premium"
        : i <= 3 ? "high value"
        : i <= 5 ? "medium value"
        : "low value";
      return `- ${id} (${tier}): ${role}`;
    })
    .join("\n");

  const jsonSymbols = specs
    .map(({ id }) => `    "${id}": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>"`)
    .join(",\n");

  return `You are a master slot machine artist creating symbols for a real online casino.

Analyze the uploaded image. Extract its visual theme, dominant colors, mood, and key design elements.

Generate ${specs.length} SVG slot machine symbols thematically inspired by what you see. Each symbol must capture the spirit of the image while fitting its assigned role:

${symbolRoles}

STRICT SVG RULES — violating these will break the game:
1. Every SVG must use exactly: viewBox="0 0 96 96" width="96" height="96"
2. Use radialGradient or linearGradient for richness — no flat fills on main shapes
3. CRITICAL: Prefix ALL SVG element IDs with the symbol name to avoid collisions. Example: for SEVEN use id="SEVEN_g1", for WILD use id="WILD_g1". Reference them as url(#SEVEN_g1) etc.
4. Each symbol must have a strong, distinct silhouette readable at 40px
5. Keep each SVG under 900 characters — compact paths, no comments
6. Self-contained: no <style> blocks, no external hrefs
7. Apply the image's extracted color palette consistently across all symbols

Return ONLY a valid JSON object. No markdown, no code blocks, no explanation. Start with { and end with }.

{
  "themeDescription": "concise sentence (max 12 words) describing the detected theme",
  "palette": {
    "primary": "#hexcolor",
    "accent": "#hexcolor",
    "bg": "#hexcolor"
  },
  "bgPrompt": "cinematic 30-word atmospheric background prompt for a dark slot machine background that captures this image's theme, mood, and color palette",
  "symbols": {
${jsonSymbols}
  }
}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function saveUploadedImage(base64: string, ext: string, mint: string): string {
  const imagesDir = path.join(config.dataDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });
  const filename = `studio_${mint.slice(0, 8)}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(imagesDir, filename), Buffer.from(base64, "base64"));
  return filename;
}

function buildPollinationsUrl(prompt: string): string {
  const encoded = encodeURIComponent(
    `${prompt}, casino slot machine background, dark atmospheric, neon glow, cinematic, no text, no UI elements`,
  );
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=512&model=flux&nologo=true`;
}

function extractJson(text: string): string {
  const stripped = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in Claude response");
  return stripped.slice(start, end + 1);
}

// ── analyzeImage ──────────────────────────────────────────────────────────────

export async function analyzeImage(
  base64: string,
  ext: string,
  mint: string,
  slotModel: SlotModel = "Classic3Reel",
): Promise<StudioAnalysis> {
  const apiKey = config.anthropicApiKey;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const mimeType  = MIME_MAP[ext.toLowerCase()] ?? "image/jpeg";
  const specs     = THEME_SPECS[slotModel] ?? THEME_SPECS.Classic3Reel;
  const symbolIds = specs.map((s) => s.id);

  const filename      = saveUploadedImage(base64, ext, mint);
  const sourceImageUrl = `${config.serverBaseUrl}/images/${filename}`;

  console.log(`[aiStudio] Analyzing image for mint ${mint.slice(0, 8)} model=${slotModel}…`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":          apiKey,
      "anthropic-version":  "2023-06-01",
      "content-type":       "application/json",
    },
    body: JSON.stringify({
      model:      "claude-opus-4-7",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            {
              type:   "image",
              source: { type: "base64", media_type: mimeType, data: base64 },
            },
            { type: "text", text: buildPrompt(specs) },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const rawText = data.content.find((c) => c.type === "text")?.text ?? "";
  if (!rawText) throw new Error("Empty response from Claude");

  let parsed: {
    themeDescription: string;
    palette: StudioPalette;
    bgPrompt: string;
    symbols: Record<string, string>;
  };

  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    console.error("[aiStudio] Failed to parse Claude response:", rawText.slice(0, 500));
    throw new Error("Claude returned invalid JSON");
  }

  const missing = symbolIds.filter((id) => !parsed.symbols?.[id]);
  if (missing.length > 0) {
    console.warn(`[aiStudio] Missing symbols for ${mint.slice(0, 8)}: ${missing.join(", ")}`);
  }

  const bgImageUrl = buildPollinationsUrl(parsed.bgPrompt ?? parsed.themeDescription ?? "casino");

  console.log(`[aiStudio] Complete for ${mint.slice(0, 8)}: "${parsed.themeDescription}"`);

  return {
    themeDescription: parsed.themeDescription ?? "Custom theme",
    palette:   parsed.palette ?? { primary: "#d4a017", accent: "#8b5cf6", bg: "#06060f" },
    bgPrompt:  parsed.bgPrompt ?? "",
    symbols:   parsed.symbols ?? {},
    symbolIds,
    sourceImageUrl,
    bgImageUrl,
  };
}
