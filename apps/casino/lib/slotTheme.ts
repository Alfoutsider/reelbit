export interface SlotTheme {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  status: "generating" | "ready" | "failed";
  heroImageUrl: string | null;
  bgImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
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
