export interface CustomAssets {
  themeDescription: string;
  palette: { primary: string; accent: string; bg: string };
  symbols: Record<string, string>;
  sourceImageUrl: string;
  bgImageUrl: string;
  bgPrompt: string;
  generatedAt: number;
}

export interface SlotTheme {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  slotModel: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  status: "generating" | "ready" | "failed";
  heroImageUrl: string | null;
  bgImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
  customAssets?: CustomAssets;
  updatedAt: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function fetchSlotTheme(mint: string): Promise<SlotTheme | null> {
  try {
    const res = await fetch(`${API_URL}/themes/${mint}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchAllThemes(): Promise<SlotTheme[]> {
  try {
    const res = await fetch(`${API_URL}/themes`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
