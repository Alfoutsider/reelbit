"use client";

import { useId, type JSX } from "react";
import type { ThemeId } from "@/lib/slotThemes";
import { CLASSIC_SYMBOLS } from "./symbols/ClassicSymbols";
import { DRAGON_SYMBOLS } from "./symbols/DragonSymbols";
import { EGYPTIAN_SYMBOLS } from "./symbols/EgyptianSymbols";
import { CYBER_SYMBOLS } from "./symbols/CyberSymbols";
import { DRAGON_CARDS, EGYPTIAN_CARDS, CYBER_CARDS } from "./symbols/CardSymbols";

interface Props {
  id: string;
  size?: number;
  highlighted?: boolean;
  customSvg?: string;
  theme?: ThemeId;
}

const THEME_MAPS: Record<ThemeId, Record<string, (uid: string, size: number, filter: string) => JSX.Element>> = {
  classic:  CLASSIC_SYMBOLS,
  dragon:   { ...DRAGON_SYMBOLS,   ...DRAGON_CARDS  },
  egyptian: { ...EGYPTIAN_SYMBOLS, ...EGYPTIAN_CARDS },
  cyber:    { ...CYBER_SYMBOLS,    ...CYBER_CARDS    },
};

export function SymbolSVG({ id, size = 100, highlighted = false, customSvg, theme = 'classic' }: Props) {
  const uid = useId().replace(/:/g, "");

  const winFilter = "drop-shadow(0 0 8px rgba(255,215,0,1)) drop-shadow(0 0 18px rgba(255,215,0,0.7))";
  const idleFilter = "drop-shadow(0 2px 6px rgba(0,0,0,0.7))";
  const filter = highlighted ? winFilter : idleFilter;

  // Custom AI-generated SVG (creator deployed custom theme)
  if (customSvg) {
    return (
      <div
        style={{ width: size, height: size, filter, flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: customSvg }}
      />
    );
  }

  const themeMap = THEME_MAPS[theme] ?? THEME_MAPS.classic;
  const renderer = themeMap[id];

  if (renderer) {
    return <div style={{ flexShrink: 0 }}>{renderer(uid, size, filter)}</div>;
  }

  // Fallback: try classic map
  const fallback = THEME_MAPS.classic[id];
  if (fallback) {
    return <div style={{ flexShrink: 0 }}>{fallback(uid, size, filter)}</div>;
  }

  // Unknown symbol — render a question mark placeholder
  return (
    <div style={{ flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <rect x="4" y="4" width="88" height="88" rx="14" fill="#1a1a2e" stroke="#333" strokeWidth="1.5"/>
        <text x="48" y="62" textAnchor="middle" fontSize="40" fontWeight="900"
          fontFamily="sans-serif" fill="rgba(255,255,255,0.2)">?</text>
      </svg>
    </div>
  );
}
