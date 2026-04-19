import { useId } from "react";
import type { SymbolId } from "./symbols";

interface Props {
  id: SymbolId;
  size?: number;
  highlighted?: boolean;
}

export function SymbolSVG({ id, size = 100, highlighted = false }: Props) {
  // useId gives a unique per-instance prefix, preventing gradient ID collisions
  // when the same symbol appears on multiple reels simultaneously
  const uid = useId().replace(/:/g, "");
  const filter = highlighted
    ? "drop-shadow(0 0 10px rgba(255,215,0,1)) drop-shadow(0 0 20px rgba(255,215,0,0.7))"
    : "drop-shadow(0 2px 4px rgba(0,0,0,0.6))";

  const symbols: Record<SymbolId, JSX.Element> = {
    SEVEN: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id={`${uid}sevenG`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7070" />
            <stop offset="50%" stopColor="#ee0000" />
            <stop offset="100%" stopColor="#880000" />
          </linearGradient>
          <linearGradient id={`${uid}sevenShine`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="84" height="84" rx="14" fill={`url(#${uid}sevenG)`} stroke="#ff5555" strokeWidth="2" />
        <rect x="6" y="6" width="84" height="42" rx="14" fill={`url(#${uid}sevenShine)`} />
        <text x="48" y="70" textAnchor="middle" fontSize="54" fontWeight="900"
          fontFamily="Arial Black, sans-serif" fill="#fff" stroke="#ffcccc" strokeWidth="0.5">7</text>
      </svg>
    ),

    BAR3: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id={`${uid}bar3G`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5c842" />
            <stop offset="50%" stopColor="#d4a017" />
            <stop offset="100%" stopColor="#9a7010" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="88" height="88" rx="12" fill="#120c00" stroke="#d4a01740" strokeWidth="1" />
        {[18, 38, 58].map((y, i) => (
          <g key={i}>
            <rect x="8" y={y} width="80" height="18" rx="5" fill={`url(#${uid}bar3G)`} stroke="#f5c84260" strokeWidth="1" />
            <text x="48" y={y + 13} textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="Arial" fill="#0a0a18" letterSpacing="2">BAR</text>
          </g>
        ))}
      </svg>
    ),

    BAR2: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id={`${uid}bar2G`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5c842" />
            <stop offset="100%" stopColor="#9a7010" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="88" height="88" rx="12" fill="#120c00" stroke="#d4a01740" strokeWidth="1" />
        {[24, 50].map((y, i) => (
          <g key={i}>
            <rect x="8" y={y} width="80" height="20" rx="6" fill={`url(#${uid}bar2G)`} stroke="#f5c84260" strokeWidth="1" />
            <text x="48" y={y + 14} textAnchor="middle" fontSize="10" fontWeight="800" fontFamily="Arial" fill="#0a0a18" letterSpacing="2">BAR</text>
          </g>
        ))}
      </svg>
    ),

    BAR1: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id={`${uid}bar1G`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5c842" />
            <stop offset="100%" stopColor="#9a7010" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="88" height="88" rx="12" fill="#120c00" stroke="#d4a01740" strokeWidth="1" />
        <rect x="10" y="34" width="76" height="28" rx="9" fill={`url(#${uid}bar1G)`} stroke="#f5c842" strokeWidth="2" />
        <text x="48" y="52" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="Arial" fill="#0a0a18" letterSpacing="3">BAR</text>
      </svg>
    ),

    BELL: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id={`${uid}bellG`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#d4a017" />
          </linearGradient>
          <linearGradient id={`${uid}bellShine`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path d="M48 10 C28 10 18 28 18 46 L12 70 L84 70 L78 46 C78 28 68 10 48 10Z"
          fill={`url(#${uid}bellG)`} stroke="#f5c842" strokeWidth="1.5" />
        <path d="M48 10 C38 10 28 20 26 36 L18 60 L68 60 C66 44 60 24 48 10Z"
          fill={`url(#${uid}bellShine)`} />
        <rect x="36" y="70" width="24" height="8" rx="2" fill="#c49010" />
        <ellipse cx="48" cy="79" rx="9" ry="6" fill="#c49010" stroke="#f5c842" strokeWidth="1.5" />
        <circle cx="48" cy="22" r="5" fill="rgba(255,255,255,0.35)" />
      </svg>
    ),

    CHERRY: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <radialGradient id={`${uid}cherryG`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ff9ec0" />
            <stop offset="50%" stopColor="#ee004a" />
            <stop offset="100%" stopColor="#880030" />
          </radialGradient>
        </defs>
        {/* Stems */}
        <path d="M48 20 Q54 6 64 9" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M48 20 Q38 10 30 16" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Leaves */}
        <ellipse cx="58" cy="9" rx="5" ry="3" fill="#22c55e" transform="rotate(-20 58 9)" />
        <ellipse cx="31" cy="15" rx="5" ry="3" fill="#22c55e" transform="rotate(30 31 15)" />
        {/* Cherries */}
        <circle cx="33" cy="63" r="18" fill={`url(#${uid}cherryG)`} stroke="#ee004a" strokeWidth="1.5" />
        <circle cx="63" cy="63" r="18" fill={`url(#${uid}cherryG)`} stroke="#ee004a" strokeWidth="1.5" />
        {/* Highlights */}
        <circle cx="27" cy="56" r="5" fill="rgba(255,255,255,0.35)" />
        <circle cx="57" cy="56" r="5" fill="rgba(255,255,255,0.35)" />
      </svg>
    ),

    LEMON: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <radialGradient id={`${uid}lemonG`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="60%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#a16207" />
          </radialGradient>
        </defs>
        <ellipse cx="48" cy="50" rx="36" ry="28" fill={`url(#${uid}lemonG)`} stroke="#fbbf24" strokeWidth="1.5" />
        {/* Texture lines */}
        <path d="M14 50 Q48 32 82 50" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
        <path d="M20 62 Q48 50 76 62" stroke="rgba(255,255,255,0.10)" strokeWidth="1" fill="none" />
        {/* Shine */}
        <ellipse cx="32" cy="38" rx="9" ry="6" fill="rgba(255,255,255,0.25)" transform="rotate(-30 32 38)" />
        {/* Nubs */}
        <ellipse cx="13" cy="50" rx="3" ry="5" fill="#d97706" />
        <ellipse cx="83" cy="50" rx="3" ry="5" fill="#d97706" />
      </svg>
    ),

    ORANGE: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <radialGradient id={`${uid}orangeG`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#9a3412" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="54" r="34" fill={`url(#${uid}orangeG)`} stroke="#ea6010" strokeWidth="1.5" />
        {/* Leaf */}
        <path d="M44 18 Q48 6 52 18 Q48 24 44 18Z" fill="#22c55e" stroke="#16a34a" strokeWidth="1" />
        {/* Segment lines */}
        <line x1="48" y1="20" x2="48" y2="88" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
        <line x1="14" y1="54" x2="82" y2="54" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
        <line x1="24" y1="30" x2="72" y2="78" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
        <line x1="72" y1="30" x2="24" y2="78" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
        {/* Shine */}
        <ellipse cx="34" cy="40" rx="8" ry="5" fill="rgba(255,255,255,0.22)" transform="rotate(-30 34 40)" />
      </svg>
    ),

    WILD: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id={`${uid}wildG`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="35%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id={`${uid}wildShine`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id={`${uid}wildGlow`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Star */}
        <polygon points="48,6 58,36 90,36 66,54 76,84 48,66 20,84 30,54 6,36 38,36"
          fill={`url(#${uid}wildG)`} stroke="#c084fc" strokeWidth="1.5" />
        <polygon points="48,6 58,36 90,36 66,54 76,84 48,66 20,84 30,54 6,36 38,36"
          fill={`url(#${uid}wildShine)`} />
        <text x="48" y="58" textAnchor="middle" fontSize="13" fontWeight="900"
          fontFamily="Arial Black" fill="#fff" letterSpacing="1" filter={`url(#${uid}wildGlow)`}>WILD</text>
      </svg>
    ),
  };

  return symbols[id] ?? symbols.LEMON;
}
