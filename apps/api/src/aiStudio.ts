import fs from "fs";
import path from "path";
import { config } from "./config";

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
  sourceImageUrl: string;
  bgImageUrl: string; // Pollinations URL (loads on demand)
}

const SYMBOL_IDS = ["SEVEN", "WILD", "BAR3", "BAR2", "BAR1", "BELL", "CHERRY", "LEMON", "ORANGE"];

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function buildAnalysisPrompt(): string {
  return `You are a professional slot machine game designer with expertise in SVG graphics.

Analyze this image carefully. Extract its visual theme, dominant colors, mood, and key design elements.

Then generate 9 unique SVG slot machine symbols that are thematically inspired by what you see in this image.

Symbol roles (listed from highest to lowest payout value):
- SEVEN: The jackpot/premium symbol — most dramatic, elaborate design, represents the image's most iconic element
- WILD: Special wild card — a star/special mark with the image's color palette
- BAR3: High value — triple horizontal bars motif using image's palette
- BAR2: Mid-high value — double horizontal bars motif
- BAR1: Mid value — single bar motif
- BELL: Mid-low value — a bell or bell-like shape in the image's theme
- CHERRY: Low-mid value — cherry or equivalent round paired objects
- LEMON: Low value — a citrus/oval fruit shape
- ORANGE: Lowest value — a round fruit shape

IMPORTANT SVG REQUIREMENTS:
- Every SVG must use viewBox="0 0 96 96" width="96" height="96"
- Use linearGradient or radialGradient for fills (gives depth)
- Each symbol must look visually distinct from the others
- Use the image's extracted color palette throughout
- Keep SVG code under 800 chars each (no excessive paths)
- No external references, only self-contained SVG
- Symbols must be clearly readable at 40px–120px sizes

CRITICAL: Return ONLY a valid JSON object with no markdown, no code blocks, no explanation text. Start immediately with { and end with }.

JSON structure:
{
  "themeDescription": "15-word max description of detected theme",
  "palette": {
    "primary": "#hexcolor",
    "accent": "#hexcolor",
    "bg": "#hexcolor"
  },
  "bgPrompt": "Detailed 30-word atmospheric background prompt for generating an enhanced slot machine background image that captures this image's theme, colors and mood",
  "symbols": {
    "SEVEN": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>",
    "WILD": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>",
    "BAR3": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>",
    "BAR2": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>",
    "BAR1": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>",
    "BELL": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>",
    "CHERRY": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>",
    "LEMON": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>",
    "ORANGE": "<svg viewBox=\\"0 0 96 96\\" width=\\"96\\" height=\\"96\\">...</svg>"
  }
}`;
}

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

function extractJsonFromText(text: string): string {
  // Strip markdown code blocks if present
  const stripped = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  // Find the first { and last }
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return stripped.slice(start, end + 1);
}

export async function analyzeImage(
  base64: string,
  ext: string,
  mint: string,
): Promise<StudioAnalysis> {
  const apiKey = config.anthropicApiKey;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const mimeType = MIME_MAP[ext.toLowerCase()] ?? "image/jpeg";

  // Save the uploaded image and get its URL
  const filename = saveUploadedImage(base64, ext, mint);
  const sourceImageUrl = `${config.serverBaseUrl}/images/${filename}`;

  console.log(`[aiStudio] Analyzing image for mint ${mint.slice(0, 8)}…`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: base64 },
            },
            { type: "text", text: buildAnalysisPrompt() },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
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
    const jsonStr = extractJsonFromText(rawText);
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error("[aiStudio] Failed to parse Claude response:", rawText.slice(0, 500));
    throw new Error("Claude returned invalid JSON");
  }

  // Validate all symbols are present
  const missing = SYMBOL_IDS.filter((id) => !parsed.symbols?.[id]);
  if (missing.length > 0) {
    console.warn(`[aiStudio] Missing symbols: ${missing.join(", ")}`);
  }

  // Build Pollinations URL for enhanced background (loads lazily on client)
  const bgImageUrl = buildPollinationsUrl(parsed.bgPrompt ?? parsed.themeDescription);

  console.log(`[aiStudio] Analysis complete for ${mint.slice(0, 8)}: "${parsed.themeDescription}"`);

  return {
    themeDescription: parsed.themeDescription ?? "Custom theme",
    palette: parsed.palette ?? { primary: "#d4a017", accent: "#8b5cf6", bg: "#06060f" },
    bgPrompt: parsed.bgPrompt ?? "",
    symbols: parsed.symbols ?? {},
    sourceImageUrl,
    bgImageUrl,
  };
}
