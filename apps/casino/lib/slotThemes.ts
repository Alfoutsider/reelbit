// Full slot theme configuration system — 4 built-in themes with math models
// Each SlotModel maps 1:1 to a visual theme; customAssets from the AI studio
// replace theme-specific symbols while card symbols stay themed.

export type ThemeId = 'classic' | 'dragon' | 'egyptian' | 'cyber';
export type SlotModelId = 'Classic3Reel' | 'Standard5Reel' | 'FiveReelFreeSpins';

export const MODEL_TO_THEME: Record<SlotModelId, ThemeId> = {
  Classic3Reel:       'classic',
  Standard5Reel:      'dragon',
  FiveReelFreeSpins:  'egyptian',
};

export interface SymbolPay {
  x3: number;
  x4?: number;
  x5?: number;
}

export interface ThemeSymbolDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  pay: SymbolPay;
  isWild?: boolean;
  isScatter?: boolean;
  scatterPay?: { x3: number; x4: number; x5: number }; // scatter bonus spins
  substituteLabel?: string; // what wild substitutes
}

export interface ThemeCabinet {
  primary: string;     // main color (borders, LEDs, glow)
  secondary: string;   // secondary accent
  bodyGrad: string;    // CSS gradient for cabinet body
  reelGrad: string;    // CSS gradient for reel background
  glow: string;        // radial glow color (rgba)
}

export interface ThemeBackground {
  type: 'classic' | 'dragon' | 'egyptian' | 'cyber';
  dominantColor: string;
  particleColor: string;
}

export interface ThemeFeature {
  icon: string;       // unicode icon
  name: string;
  description: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  slotModel: SlotModelId;
  reelCount: number;
  rowCount: number;
  paylineCount: number;
  rtp: string;
  volatility: 'Low' | 'Medium' | 'High' | 'Very High';
  maxWin: string;     // e.g. "2,500×"
  symbols: ThemeSymbolDef[];
  paylines?: number[][];
  cabinet: ThemeCabinet;
  background: ThemeBackground;
  features: ThemeFeature[];
}

// ── Payline grids ─────────────────────────────────────────────────────────────

const PAYLINES_3REEL: number[][] = [[1, 1, 1]];

const PAYLINES_5REEL: number[][] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2],
  [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2], [1, 0, 2, 0, 1],
];

// ── Classic Vegas (3-Reel) ────────────────────────────────────────────────────

const CLASSIC_THEME: ThemeConfig = {
  id: 'classic',
  name: 'Classic Vegas',
  tagline: 'Old school. Pure luck. Jackpot.',
  slotModel: 'Classic3Reel',
  reelCount: 3,
  rowCount: 3,
  paylineCount: 1,
  rtp: '96.0%',
  volatility: 'Medium',
  maxWin: '2,000×',
  symbols: [
    { id: 'WILD',   name: 'Lucky Star',    tier: 1, pay: { x3: 100 }, isWild: true, substituteLabel: 'all symbols' },
    { id: 'SEVEN',  name: 'Lucky 7',       tier: 1, pay: { x3: 80  } },
    { id: 'BAR3',   name: 'Triple BAR',    tier: 2, pay: { x3: 25  } },
    { id: 'BAR2',   name: 'Double BAR',    tier: 2, pay: { x3: 15  } },
    { id: 'BAR1',   name: 'Single BAR',    tier: 2, pay: { x3: 8   } },
    { id: 'BELL',   name: 'Golden Bell',   tier: 3, pay: { x3: 6   } },
    { id: 'CHERRY', name: 'Cherry',        tier: 3, pay: { x3: 4   } },
    { id: 'LEMON',  name: 'Lemon',         tier: 4, pay: { x3: 3   } },
    { id: 'ORANGE', name: 'Orange',        tier: 4, pay: { x3: 3   } },
  ],
  paylines: PAYLINES_3REEL,
  cabinet: {
    primary:   '#d4a017',
    secondary: '#ff3b3b',
    bodyGrad:  'linear-gradient(180deg, #1a0f00 0%, #0d0800 100%)',
    reelGrad:  'linear-gradient(180deg, #0a0700 0%, #040300 100%)',
    glow:      'rgba(212,160,23,0.18)',
  },
  background: {
    type: 'classic',
    dominantColor: '#d4a017',
    particleColor: '#ffd700',
  },
  features: [
    { icon: '⭐', name: 'Wild Star',      description: 'Wild substitutes for any symbol to complete wins.' },
    { icon: '7️⃣', name: 'Lucky 7 Jackpot', description: '3× Lucky 7 on the center line pays 80× your bet.' },
    { icon: '🔔', name: 'Bell Bonus',      description: 'Mixed BAR symbols on the payline pay 5×.' },
  ],
};

// ── Dragon Fire (5-Reel, 20 Lines) ───────────────────────────────────────────

const DRAGON_THEME: ThemeConfig = {
  id: 'dragon',
  name: 'Dragon Fire',
  tagline: 'Ancient power. Blazing riches.',
  slotModel: 'Standard5Reel',
  reelCount: 5,
  rowCount: 3,
  paylineCount: 20,
  rtp: '96.5%',
  volatility: 'High',
  maxWin: '5,000×',
  symbols: [
    { id: 'WILD',    name: 'Dragon Wild',   tier: 1, pay: { x3: 0, x4: 0, x5: 0 }, isWild: true, substituteLabel: 'all except Scatter' },
    { id: 'SCATTER', name: 'Fire Scatter',  tier: 1, pay: { x3: 0, x4: 0, x5: 0 }, isScatter: true, scatterPay: { x3: 10, x4: 15, x5: 20 } },
    { id: 'DRAGON',  name: 'Dragon',        tier: 1, pay: { x3: 15, x4: 75,  x5: 250 } },
    { id: 'FIRE_ORB',name: 'Fire Orb',      tier: 2, pay: { x3: 10, x4: 40,  x5: 100 } },
    { id: 'GEM',     name: 'Dragon Gem',    tier: 2, pay: { x3: 6,  x4: 20,  x5: 60  } },
    { id: 'SWORD',   name: 'Dragon Sword',  tier: 3, pay: { x3: 5,  x4: 15,  x5: 50  } },
    { id: 'SHIELD',  name: 'Dragon Shield', tier: 3, pay: { x3: 4,  x4: 10,  x5: 30  } },
    { id: 'HELMET',  name: 'War Helmet',    tier: 4, pay: { x3: 3,  x4: 8,   x5: 20  } },
    { id: 'ACE',     name: 'Ace',           tier: 5, pay: { x3: 2,  x4: 5,   x5: 15  } },
    { id: 'KING',    name: 'King',          tier: 5, pay: { x3: 2,  x4: 4,   x5: 12  } },
    { id: 'QUEEN',   name: 'Queen',         tier: 5, pay: { x3: 1,  x4: 3,   x5: 10  } },
    { id: 'JACK',    name: 'Jack',          tier: 5, pay: { x3: 1,  x4: 3,   x5: 8   } },
    { id: 'TEN',     name: '10',            tier: 5, pay: { x3: 1,  x4: 2,   x5: 6   } },
  ],
  paylines: PAYLINES_5REEL,
  cabinet: {
    primary:   '#ff4400',
    secondary: '#ffd700',
    bodyGrad:  'linear-gradient(180deg, #1a0000 0%, #0d0000 100%)',
    reelGrad:  'linear-gradient(180deg, #0a0000 0%, #040000 100%)',
    glow:      'rgba(255,68,0,0.2)',
  },
  background: {
    type: 'dragon',
    dominantColor: '#ff2200',
    particleColor: '#ff8800',
  },
  features: [
    { icon: '🐉', name: 'Dragon Wild',    description: 'Dragon Wild appears on reels 2–5 and substitutes for all symbols except Scatter.' },
    { icon: '🔥', name: 'Fire Free Spins', description: '3, 4, or 5 Fire Scatter symbols award 10, 15, or 20 Free Spins.' },
    { icon: '💎', name: 'Dragon Multiplier', description: 'During Free Spins, all Dragon symbol wins are multiplied by 3×.' },
  ],
};

// ── Egyptian Gold (5-Reel, Free Spins) ───────────────────────────────────────

const EGYPTIAN_THEME: ThemeConfig = {
  id: 'egyptian',
  name: 'Egyptian Gold',
  tagline: 'Unearth the Pharaoh\'s riches.',
  slotModel: 'FiveReelFreeSpins',
  reelCount: 5,
  rowCount: 3,
  paylineCount: 20,
  rtp: '96.5%',
  volatility: 'High',
  maxWin: '5,000×',
  symbols: [
    { id: 'WILD',    name: 'Cartouche Wild', tier: 1, pay: { x3: 0, x4: 0, x5: 0 }, isWild: true, substituteLabel: 'all except Scatter' },
    { id: 'SCATTER', name: 'Pyramid',        tier: 1, pay: { x3: 0, x4: 0, x5: 0 }, isScatter: true, scatterPay: { x3: 12, x4: 20, x5: 30 } },
    { id: 'PHARAOH', name: 'Pharaoh',        tier: 1, pay: { x3: 20, x4: 80,  x5: 300 } },
    { id: 'EYE_RA',  name: 'Eye of Ra',      tier: 2, pay: { x3: 12, x4: 50,  x5: 120 } },
    { id: 'ANUBIS',  name: 'Anubis',         tier: 2, pay: { x3: 8,  x4: 25,  x5: 75  } },
    { id: 'SCARAB',  name: 'Scarab',         tier: 3, pay: { x3: 5,  x4: 15,  x5: 45  } },
    { id: 'ANKH',    name: 'Ankh',           tier: 3, pay: { x3: 4,  x4: 12,  x5: 35  } },
    { id: 'SNAKE',   name: 'Cobra',          tier: 4, pay: { x3: 3,  x4: 8,   x5: 20  } },
    { id: 'VASE',    name: 'Canopic Jar',    tier: 4, pay: { x3: 2,  x4: 6,   x5: 15  } },
    { id: 'ACE',     name: 'Ace',            tier: 5, pay: { x3: 2,  x4: 5,   x5: 12  } },
    { id: 'KING',    name: 'King',           tier: 5, pay: { x3: 1,  x4: 4,   x5: 10  } },
    { id: 'QUEEN',   name: 'Queen',          tier: 5, pay: { x3: 1,  x4: 3,   x5: 8   } },
    { id: 'JACK',    name: 'Jack',           tier: 5, pay: { x3: 1,  x4: 2,   x5: 6   } },
    { id: 'TEN',     name: '10',             tier: 5, pay: { x3: 1,  x4: 2,   x5: 5   } },
  ],
  paylines: PAYLINES_5REEL,
  cabinet: {
    primary:   '#c8960c',
    secondary: '#4a9fff',
    bodyGrad:  'linear-gradient(180deg, #140e00 0%, #0a0800 100%)',
    reelGrad:  'linear-gradient(180deg, #0c0800 0%, #060400 100%)',
    glow:      'rgba(200,150,12,0.2)',
  },
  background: {
    type: 'egyptian',
    dominantColor: '#c8960c',
    particleColor: '#ffd700',
  },
  features: [
    { icon: '📜', name: 'Cartouche Wild',   description: 'Cartouche Wild substitutes for all symbols except the Pyramid Scatter.' },
    { icon: '🏛️', name: 'Pyramid Scatters', description: '3, 4, or 5 Pyramids anywhere award 12, 20, or 30 Free Spins.' },
    { icon: '👁️', name: 'Eye of Ra Expand', description: 'During Free Spins, Eye of Ra expands to fill entire reel.' },
  ],
};

// ── Cyber Megaways (6-Reel) ───────────────────────────────────────────────────

const CYBER_THEME: ThemeConfig = {
  id: 'cyber',
  name: 'Cyber Megaways',
  tagline: 'Infinite ways. Maximum voltage.',
  slotModel: 'Standard5Reel', // placeholder until SixReelMegaways model is added
  reelCount: 6,
  rowCount: 7, // variable 2-7 per reel (max ways: 6^7 = 117,649 is wrong; 7^6 = 117,649 ways)
  paylineCount: 117649,
  rtp: '96.0%',
  volatility: 'Very High',
  maxWin: '10,000×',
  symbols: [
    { id: 'WILD',         name: 'Cyber Wild',    tier: 1, pay: { x3: 0, x4: 0, x5: 0 }, isWild: true, substituteLabel: 'all except Scatter' },
    { id: 'SCATTER',      name: 'Data Core',     tier: 1, pay: { x3: 0, x4: 0, x5: 0 }, isScatter: true, scatterPay: { x3: 10, x4: 15, x5: 20 } },
    { id: 'CHIP',         name: 'Quantum Chip',  tier: 1, pay: { x3: 25, x4: 100, x5: 400 } },
    { id: 'BITCOIN',      name: 'Bitcoin',       tier: 2, pay: { x3: 12, x4: 50,  x5: 150 } },
    { id: 'LIGHTNING',    name: 'Lightning',     tier: 2, pay: { x3: 8,  x4: 30,  x5: 100 } },
    { id: 'SHIELD_CYBER', name: 'Cyber Shield',  tier: 3, pay: { x3: 5,  x4: 20,  x5: 60  } },
    { id: 'CIRCUIT',      name: 'Circuit',       tier: 3, pay: { x3: 4,  x4: 15,  x5: 40  } },
    { id: 'ACE',          name: 'Ace',           tier: 4, pay: { x3: 2,  x4: 5,   x5: 15  } },
    { id: 'KING',         name: 'King',          tier: 4, pay: { x3: 2,  x4: 4,   x5: 12  } },
    { id: 'QUEEN',        name: 'Queen',         tier: 4, pay: { x3: 1,  x4: 3,   x5: 10  } },
    { id: 'JACK',         name: 'Jack',          tier: 4, pay: { x3: 1,  x4: 2,   x5: 8   } },
    { id: 'TEN',          name: '10',            tier: 4, pay: { x3: 1,  x4: 2,   x5: 6   } },
  ],
  cabinet: {
    primary:   '#00e5ff',
    secondary: '#7c3aed',
    bodyGrad:  'linear-gradient(180deg, #000d1a 0%, #00050d 100%)',
    reelGrad:  'linear-gradient(180deg, #000a14 0%, #000306 100%)',
    glow:      'rgba(0,229,255,0.18)',
  },
  background: {
    type: 'cyber',
    dominantColor: '#00e5ff',
    particleColor: '#7c3aed',
  },
  features: [
    { icon: '⚡', name: 'Megaways Engine',  description: 'Each reel shows 2–7 symbols randomly, creating up to 117,649 ways to win every spin.' },
    { icon: '💥', name: 'Cascade Wins',     description: 'Winning symbols explode and new ones fall in — cascades continue until no new win.' },
    { icon: '🔋', name: 'Free Spins + Multiplier', description: '3+ Data Core Scatters trigger Free Spins with an increasing win multiplier.' },
  ],
};

// ── Exports ───────────────────────────────────────────────────────────────────

export const THEME_CONFIGS: Record<ThemeId, ThemeConfig> = {
  classic:  CLASSIC_THEME,
  dragon:   DRAGON_THEME,
  egyptian: EGYPTIAN_THEME,
  cyber:    CYBER_THEME,
};

export function getThemeForModel(model: SlotModelId): ThemeConfig {
  return THEME_CONFIGS[MODEL_TO_THEME[model]];
}

export function getThemeById(id: ThemeId): ThemeConfig {
  return THEME_CONFIGS[id];
}

// Win tier labels (Pragmatic Play standard thresholds in × bet)
export function getWinTier(multiplier: number): string | null {
  if (multiplier >= 1000) return 'EPIC WIN';
  if (multiplier >= 500)  return 'SENSATIONAL WIN';
  if (multiplier >= 100)  return 'SUPER WIN';
  if (multiplier >= 50)   return 'MEGA WIN';
  if (multiplier >= 20)   return 'BIG WIN';
  return null;
}
