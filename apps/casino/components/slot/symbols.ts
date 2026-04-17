// Symbol visual config for PixiJS renderer
export type SymbolId =
  | "SEVEN" | "BAR3" | "BAR2" | "BAR1"
  | "CHERRY" | "BELL" | "LEMON" | "ORANGE" | "WILD";

export interface SymbolDef {
  id: SymbolId;
  emoji: string;
  color: string;       // hex for tint / background
  glowColor: number;   // PIXI hex number for glow filter
  tier: number;        // 1=highest value, 5=lowest
}

export const SYMBOL_DEFS: Record<SymbolId, SymbolDef> = {
  SEVEN:  { id: "SEVEN",  emoji: "7",   color: "#ff3b3b", glowColor: 0xff3b3b, tier: 1 },
  BAR3:   { id: "BAR3",   emoji: "▰▰▰", color: "#ffd700", glowColor: 0xffd700, tier: 2 },
  BAR2:   { id: "BAR2",   emoji: "▰▰",  color: "#c0a020", glowColor: 0xc0a020, tier: 2 },
  BAR1:   { id: "BAR1",   emoji: "▰",   color: "#a08010", glowColor: 0xa08010, tier: 2 },
  BELL:   { id: "BELL",   emoji: "🔔",  color: "#ffa500", glowColor: 0xffa500, tier: 3 },
  CHERRY: { id: "CHERRY", emoji: "🍒",  color: "#e0143c", glowColor: 0xe0143c, tier: 3 },
  LEMON:  { id: "LEMON",  emoji: "🍋",  color: "#ffe135", glowColor: 0xffe135, tier: 4 },
  ORANGE: { id: "ORANGE", emoji: "🍊",  color: "#ff8c00", glowColor: 0xff8c00, tier: 4 },
  WILD:   { id: "WILD",   emoji: "⭐",  color: "#a855f7", glowColor: 0xa855f7, tier: 1 },
};

export const SYMBOL_ORDER: SymbolId[] = [
  "SEVEN", "WILD", "BAR3", "BAR2", "BAR1", "BELL", "CHERRY", "LEMON", "ORANGE",
];
