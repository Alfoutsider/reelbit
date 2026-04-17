// ── Symbols ───────────────────────────────────────────────────────────────────

export type SymbolId =
  | "SEVEN"    // 🎰 jackpot trigger
  | "BAR3"     // triple bar
  | "BAR2"     // double bar
  | "BAR1"     // single bar
  | "CHERRY"   // cherry (pays on 1-2 match too)
  | "BELL"     // bell
  | "LEMON"    // lemon
  | "ORANGE"   // orange
  | "WILD";    // wild (5-reel models only)

export interface Symbol {
  id: SymbolId;
  label: string;
  emoji: string;
  weight3: number; // reel weight for 3-reel models
  weight5: number; // reel weight for 5-reel models
}

export const SYMBOLS: Record<SymbolId, Symbol> = {
  SEVEN:  { id: "SEVEN",  label: "7",          emoji: "7️⃣",  weight3: 1,  weight5: 1  },
  BAR3:   { id: "BAR3",   label: "Triple Bar", emoji: "▰▰▰", weight3: 2,  weight5: 2  },
  BAR2:   { id: "BAR2",   label: "Double Bar", emoji: "▰▰",  weight3: 3,  weight5: 3  },
  BAR1:   { id: "BAR1",   label: "Single Bar", emoji: "▰",   weight3: 4,  weight5: 4  },
  BELL:   { id: "BELL",   label: "Bell",       emoji: "🔔",  weight3: 5,  weight5: 5  },
  CHERRY: { id: "CHERRY", label: "Cherry",     emoji: "🍒",  weight3: 6,  weight5: 6  },
  LEMON:  { id: "LEMON",  label: "Lemon",      emoji: "🍋",  weight3: 8,  weight5: 8  },
  ORANGE: { id: "ORANGE", label: "Orange",     emoji: "🍊",  weight3: 9,  weight5: 9  },
  WILD:   { id: "WILD",   label: "Wild",       emoji: "⭐",  weight3: 0,  weight5: 2  },
};

// ── Paytable (multipliers on bet) ─────────────────────────────────────────────

// Classic 3-reel: 1 payline (center row)
export const PAYTABLE_3REEL: Record<string, number> = {
  "SEVEN,SEVEN,SEVEN":   500,
  "BAR3,BAR3,BAR3":      100,
  "BAR2,BAR2,BAR2":       50,
  "BAR1,BAR1,BAR1":       25,
  "BELL,BELL,BELL":       18,
  "CHERRY,CHERRY,CHERRY": 12,
  "LEMON,LEMON,LEMON":     6,
  "ORANGE,ORANGE,ORANGE":  4,
  // Any BAR combo
  "BAR1,BAR2,BAR3":        3,
  "BAR1,BAR3,BAR2":        3,
  "BAR2,BAR1,BAR3":        3,
  "BAR2,BAR3,BAR1":        3,
  "BAR3,BAR1,BAR2":        3,
  "BAR3,BAR2,BAR1":        3,
  // Cherry on reel 1
  "CHERRY,*,*":            2,
  // Cherry on reels 1+2
  "CHERRY,CHERRY,*":       4,
};

// Standard 5-reel: 20 paylines
export const PAYTABLE_5REEL: Record<string, number> = {
  // 5 of a kind
  "SEVEN,SEVEN,SEVEN,SEVEN,SEVEN":   500,
  "WILD,WILD,WILD,WILD,WILD":        250,
  "BAR3,BAR3,BAR3,BAR3,BAR3":        100,
  "BAR2,BAR2,BAR2,BAR2,BAR2":         50,
  "BAR1,BAR1,BAR1,BAR1,BAR1":         30,
  "BELL,BELL,BELL,BELL,BELL":          20,
  "CHERRY,CHERRY,CHERRY,CHERRY,CHERRY":15,
  "LEMON,LEMON,LEMON,LEMON,LEMON":     8,
  "ORANGE,ORANGE,ORANGE,ORANGE,ORANGE": 6,
  // 4 of a kind
  "SEVEN,SEVEN,SEVEN,SEVEN,*":         80,
  "BAR3,BAR3,BAR3,BAR3,*":             20,
  "BAR2,BAR2,BAR2,BAR2,*":             12,
  "BAR1,BAR1,BAR1,BAR1,*":              8,
  "BELL,BELL,BELL,BELL,*":              6,
  "CHERRY,CHERRY,CHERRY,CHERRY,*":      5,
  "LEMON,LEMON,LEMON,LEMON,*":          3,
  "ORANGE,ORANGE,ORANGE,ORANGE,*":      2,
  // 3 of a kind
  "SEVEN,SEVEN,SEVEN,*,*":             20,
  "BAR3,BAR3,BAR3,*,*":                 8,
  "BAR2,BAR2,BAR2,*,*":                 5,
  "BAR1,BAR1,BAR1,*,*":                 3,
  "BELL,BELL,BELL,*,*":                 2,
  "CHERRY,CHERRY,CHERRY,*,*":           2,
  "LEMON,LEMON,LEMON,*,*":              1,
  "ORANGE,ORANGE,ORANGE,*,*":           1,
};

// ── Reel strips ───────────────────────────────────────────────────────────────

function weightedStrip(weights: Record<SymbolId, number>): SymbolId[] {
  const strip: SymbolId[] = [];
  for (const [id, w] of Object.entries(weights)) {
    for (let i = 0; i < w; i++) strip.push(id as SymbolId);
  }
  // Shuffle deterministically enough for a strip
  return strip.sort(() => 0.5 - Math.random());
}

export function buildReelStrip(model: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins"): SymbolId[][] {
  const is5reel = model !== "Classic3Reel";
  const reelCount = is5reel ? 5 : 3;
  const weights = Object.fromEntries(
    Object.entries(SYMBOLS).map(([id, s]) => [id, is5reel ? s.weight5 : s.weight3])
  ) as Record<SymbolId, number>;

  return Array.from({ length: reelCount }, () => weightedStrip(weights));
}
