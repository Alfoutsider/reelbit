import type { SymbolId } from "./symbols";

interface Props {
  id: SymbolId;
  size?: number;
  highlighted?: boolean;
}

export function SymbolSVG({ id, size = 96, highlighted = false }: Props) {
  const filter = highlighted
    ? "drop-shadow(0 0 8px rgba(255,215,0,0.9)) drop-shadow(0 0 16px rgba(255,215,0,0.6))"
    : "drop-shadow(0 2px 4px rgba(0,0,0,0.5))";

  const symbols: Record<SymbolId, JSX.Element> = {
    SEVEN: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="sevenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="50%" stopColor="#ee0000" />
            <stop offset="100%" stopColor="#990000" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="80" height="80" rx="12" fill="url(#sevenGrad)" stroke="#ff4444" strokeWidth="2" />
        <text x="48" y="68" textAnchor="middle" fontSize="52" fontWeight="900"
          fontFamily="Arial Black, sans-serif" fill="#fff" stroke="#ffaaaa" strokeWidth="1">7</text>
      </svg>
    ),
    BAR3: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="bar3Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5c842" />
            <stop offset="50%" stopColor="#d4a017" />
            <stop offset="100%" stopColor="#a07810" />
          </linearGradient>
        </defs>
        <rect x="6" y="22" width="84" height="16" rx="5" fill="url(#bar3Grad)" stroke="#f5c842" strokeWidth="1" />
        <rect x="6" y="40" width="84" height="16" rx="5" fill="url(#bar3Grad)" stroke="#f5c842" strokeWidth="1" />
        <rect x="6" y="58" width="84" height="16" rx="5" fill="url(#bar3Grad)" stroke="#f5c842" strokeWidth="1" />
        <text x="48" y="32" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="Arial" fill="#0a0a18">BAR</text>
        <text x="48" y="50" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="Arial" fill="#0a0a18">BAR</text>
        <text x="48" y="68" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="Arial" fill="#0a0a18">BAR</text>
      </svg>
    ),
    BAR2: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="bar2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5c842" />
            <stop offset="100%" stopColor="#a07810" />
          </linearGradient>
        </defs>
        <rect x="6" y="30" width="84" height="18" rx="6" fill="url(#bar2Grad)" stroke="#f5c842" strokeWidth="1" />
        <rect x="6" y="52" width="84" height="18" rx="6" fill="url(#bar2Grad)" stroke="#f5c842" strokeWidth="1" />
        <text x="48" y="43" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="Arial" fill="#0a0a18">BAR</text>
        <text x="48" y="65" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="Arial" fill="#0a0a18">BAR</text>
      </svg>
    ),
    BAR1: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="bar1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5c842" />
            <stop offset="100%" stopColor="#a07810" />
          </linearGradient>
        </defs>
        <rect x="10" y="36" width="76" height="24" rx="8" fill="url(#bar1Grad)" stroke="#f5c842" strokeWidth="2" />
        <text x="48" y="52" textAnchor="middle" fontSize="12" fontWeight="900" fontFamily="Arial" fill="#0a0a18">BAR</text>
      </svg>
    ),
    BELL: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="bellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5c842" />
            <stop offset="100%" stopColor="#d4a017" />
          </linearGradient>
        </defs>
        <path d="M48 12 C30 12 20 28 20 44 L16 68 L80 68 L76 44 C76 28 66 12 48 12Z"
          fill="url(#bellGrad)" stroke="#f5c842" strokeWidth="2" />
        <rect x="38" y="68" width="20" height="8" rx="2" fill="#d4a017" />
        <ellipse cx="48" cy="76" rx="8" ry="5" fill="#d4a017" stroke="#f5c842" strokeWidth="1.5" />
        <circle cx="48" cy="20" r="5" fill="#fff" opacity="0.3" />
      </svg>
    ),
    CHERRY: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="cherryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b9d" />
            <stop offset="100%" stopColor="#cc0044" />
          </linearGradient>
        </defs>
        <path d="M48 20 Q52 8 62 10 Q58 22 48 20Z" fill="#22c55e" strokeWidth="1" stroke="#16a34a" />
        <path d="M48 20 Q40 12 32 18 Q38 26 48 20Z" fill="#22c55e" strokeWidth="1" stroke="#16a34a" />
        <circle cx="34" cy="62" r="16" fill="url(#cherryGrad)" stroke="#ff4488" strokeWidth="2" />
        <circle cx="62" cy="62" r="16" fill="url(#cherryGrad)" stroke="#ff4488" strokeWidth="2" />
        <circle cx="30" cy="57" r="4" fill="rgba(255,255,255,0.3)" />
        <circle cx="58" cy="57" r="4" fill="rgba(255,255,255,0.3)" />
      </svg>
    ),
    LEMON: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="lemonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>
        <ellipse cx="48" cy="50" rx="34" ry="28" fill="url(#lemonGrad)" stroke="#fbbf24" strokeWidth="2" />
        <path d="M14 50 Q48 30 82 50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
        <ellipse cx="30" cy="38" rx="8" ry="5" fill="rgba(255,255,255,0.2)" transform="rotate(-30 30 38)" />
      </svg>
    ),
    ORANGE: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="52" r="34" fill="url(#orangeGrad)" stroke="#f97316" strokeWidth="2" />
        <path d="M44 18 Q48 8 52 18 Q48 22 44 18Z" fill="#22c55e" stroke="#16a34a" strokeWidth="1" />
        <path d="M48 18 L48 52" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <path d="M14 52 L82 52" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <ellipse cx="35" cy="40" rx="7" ry="4" fill="rgba(255,255,255,0.2)" transform="rotate(-30 35 40)" />
      </svg>
    ),
    WILD: (
      <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }}>
        <defs>
          <linearGradient id="wildGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <polygon points="48,8 58,36 88,36 65,54 74,82 48,65 22,82 31,54 8,36 38,36"
          fill="url(#wildGrad)" stroke="#c084fc" strokeWidth="2" />
        <text x="48" y="56" textAnchor="middle" fontSize="14" fontWeight="900"
          fontFamily="Arial Black" fill="#fff" letterSpacing="0">WILD</text>
      </svg>
    ),
  };

  return symbols[id] ?? symbols.LEMON;
}
