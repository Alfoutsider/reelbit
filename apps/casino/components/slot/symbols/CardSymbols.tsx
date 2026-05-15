// Shared card symbols (A/K/Q/J/10) — themed by color accent
// Each theme passes its primary/secondary colors for card styling.

import type { JSX } from "react";

// 3-param renderer — primary/secondary are already closed over
type ClosedRenderer = (uid: string, size: number, filter: string) => JSX.Element;

function makeCard(
  uid: string, size: number, filter: string,
  primary: string, secondary: string,
  letter: string, label: string,
): JSX.Element {
  const p = primary, s = secondary;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}${label}bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d0d1a"/>
          <stop offset="100%" stopColor="#050510"/>
        </linearGradient>
        <linearGradient id={`${uid}${label}plate`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={s} stopOpacity="0.1"/>
        </linearGradient>
        <linearGradient id={`${uid}${label}text`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p}/>
          <stop offset="100%" stopColor={s}/>
        </linearGradient>
      </defs>
      {/* Background */}
      <rect x="3" y="3" width="90" height="90" rx="12" fill={`url(#${uid}${label}bg)`}/>
      {/* Card plate */}
      <rect x="8" y="8" width="80" height="80" rx="10" fill={`url(#${uid}${label}plate)`} stroke={p} strokeWidth="1" strokeOpacity="0.5"/>
      {/* Corner pips */}
      <text x="12" y="24" fontSize="12" fontWeight="900" fontFamily="'Arial Black', sans-serif"
        fill={p} fillOpacity="0.8">{letter}</text>
      <text x="84" y="80" fontSize="12" fontWeight="900" fontFamily="'Arial Black', sans-serif"
        fill={p} fillOpacity="0.8" transform="rotate(180 84 80)">{letter}</text>
      {/* Main letter */}
      <text x="48" y="67"
        textAnchor="middle"
        fontSize="48"
        fontWeight="900"
        fontFamily="'Arial Black', sans-serif"
        fill={`url(#${uid}${label}text)`}
        strokeOpacity="0.3"
      >{letter}</text>
      {/* Subtle shine */}
      <rect x="8" y="8" width="80" height="40" rx="10" fill="rgba(255,255,255,0.04)"/>
      {/* Border highlight */}
      <rect x="8" y="8" width="80" height="80" rx="10" fill="none" stroke={p} strokeWidth="1.5" strokeOpacity="0.4"/>
    </svg>
  );
}

export function makeCardRenderers(primary: string, secondary: string): Record<string, ClosedRenderer> {
  return {
    ACE:   (uid, size, filter) => makeCard(uid, size, filter, primary, secondary, 'A', 'ACE'),
    KING:  (uid, size, filter) => makeCard(uid, size, filter, primary, secondary, 'K', 'KING'),
    QUEEN: (uid, size, filter) => makeCard(uid, size, filter, primary, secondary, 'Q', 'QUEEN'),
    JACK:  (uid, size, filter) => makeCard(uid, size, filter, primary, secondary, 'J', 'JACK'),
    TEN:   (uid, size, filter) => makeCard(uid, size, filter, primary, secondary, '10', 'TEN'),
  };
}

// Pre-built card sets per theme
export const DRAGON_CARDS  = makeCardRenderers('#ff4400', '#ffd700');
export const EGYPTIAN_CARDS = makeCardRenderers('#c8960c', '#4a9fff');
export const CYBER_CARDS   = makeCardRenderers('#00e5ff', '#7c3aed');
