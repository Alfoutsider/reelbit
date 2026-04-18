import fs from "fs";
import path from "path";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export interface ImageGenResult {
  heroLocalPath: string;
  bgLocalPath: string;
  heroFilename: string;
  bgFilename: string;
}

function encodePrompt(prompt: string): string {
  return encodeURIComponent(prompt);
}

async function downloadImage(imageUrl: string, filename: string): Promise<string> {
  const dir = path.resolve(process.cwd(), "data/images");
  fs.mkdirSync(dir, { recursive: true });
  const localPath = path.join(dir, filename);
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(localPath, buf);
  return localPath;
}

async function downloadImageWithRetry(imageUrl: string, filename: string): Promise<string> {
  let lastErr: Error = new Error("unknown");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 5000 * attempt));
    try {
      return await downloadImage(imageUrl, filename);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn(`[imageGen] Download attempt ${attempt + 1} failed: ${lastErr.message}`);
    }
  }
  throw lastErr;
}

async function generateViaPollinations(prompt: string, seed: number): Promise<string> {
  const url = `${POLLINATIONS_BASE}/${encodePrompt(prompt)}?width=512&height=512&model=flux&seed=${seed}&nologo=true`;
  console.log(`[imageGen] Pollinations request: ${prompt.slice(0, 60)}…`);
  return url;
}

async function generateViaReplicate(prompt: string, token: string): Promise<string> {
  const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: { prompt, num_inference_steps: 4, output_format: "webp", width: 512, height: 512 },
    }),
  });
  if (!res.ok) throw new Error(`Replicate API error ${res.status}: ${await res.text()}`);
  const pred = (await res.json()) as Record<string, unknown>;

  if (pred.status === "succeeded") {
    const output = pred.output as string | string[];
    return Array.isArray(output) ? output[0] : output;
  }

  const id = pred.id as string;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = (await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Record<string, unknown>;
    if (poll.status === "succeeded") {
      const out = poll.output as string | string[];
      return Array.isArray(out) ? out[0] : out;
    }
    if (poll.status === "failed" || poll.status === "canceled") {
      throw new Error(`Replicate prediction ${poll.status}: ${poll.error}`);
    }
  }
  throw new Error("Replicate prediction timed out");
}

export async function generateSlotArt(
  mintAddress: string,
  tokenName: string,
  tokenSymbol: string,
): Promise<ImageGenResult> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const shortMint = mintAddress.slice(0, 8);
  const seed = mintAddress.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);

  const heroPrompt = [
    `Casino slot machine jackpot symbol, ${tokenName} ${tokenSymbol} crypto token,`,
    `glowing neon icon, dark background, centered composition, highly detailed,`,
    `game art style, vibrant metallic colors, futuristic, no text, no letters`,
  ].join(" ");

  const bgPrompt = [
    `Casino slot machine background for ${tokenName} crypto token,`,
    `dark atmospheric scene with neon glow, bokeh light particles,`,
    `cyberpunk aesthetic, abstract depth, no text, no UI elements, cinematic`,
  ].join(" ");

  console.log(`[imageGen] Generating art for ${tokenSymbol} via ${replicateToken ? "Replicate" : "Pollinations"}…`);

  const heroFilename = `hero_${shortMint}.webp`;
  const bgFilename   = `bg_${shortMint}.webp`;

  if (replicateToken) {
    const [heroUrl, bgUrl] = await Promise.all([
      generateViaReplicate(heroPrompt, replicateToken),
      generateViaReplicate(bgPrompt, replicateToken),
    ]);
    const [heroLocalPath, bgLocalPath] = await Promise.all([
      downloadImage(heroUrl, heroFilename),
      downloadImage(bgUrl, bgFilename),
    ]);
    return { heroLocalPath, bgLocalPath, heroFilename, bgFilename };
  }

  // Pollinations: sequential with delay to avoid 429
  const heroUrl = await generateViaPollinations(heroPrompt, Math.abs(seed));
  const heroLocalPath = await downloadImageWithRetry(heroUrl, heroFilename);

  await new Promise((r) => setTimeout(r, 3000));

  const bgUrl = await generateViaPollinations(bgPrompt, Math.abs(seed) + 1);
  const bgLocalPath = await downloadImageWithRetry(bgUrl, bgFilename);

  console.log(`[imageGen] ✅ Art ready for ${tokenSymbol}: ${heroFilename}, ${bgFilename}`);
  return { heroLocalPath, bgLocalPath, heroFilename, bgFilename };
}
