// Classic Vegas slot symbols — studio-quality illustrated SVGs

import type { JSX } from "react";

type Renderer = (uid: string, size: number, filter: string) => JSX.Element;

export const CLASSIC_SYMBOLS: Record<string, Renderer> = {

  SEVEN: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}7bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff8080"/>
          <stop offset="45%" stopColor="#dd0000"/>
          <stop offset="100%" stopColor="#6a0000"/>
        </linearGradient>
        <linearGradient id={`${uid}7shine`} x1="15%" y1="0%" x2="40%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)"/>
          <stop offset="55%" stopColor="rgba(255,255,255,0.05)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <linearGradient id={`${uid}7chrome`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff5555" stopOpacity="1"/>
          <stop offset="100%" stopColor="#880000" stopOpacity="1"/>
        </linearGradient>
        <filter id={`${uid}7glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Shadow */}
      <rect x="9" y="11" width="78" height="78" rx="14" fill="rgba(0,0,0,0.5)"/>
      {/* Base */}
      <rect x="6" y="6" width="84" height="84" rx="14" fill={`url(#${uid}7bg)`}/>
      {/* Bevel border */}
      <rect x="6" y="6" width="84" height="84" rx="14" fill="none" stroke="#ff6666" strokeWidth="1.5"/>
      <rect x="8" y="8" width="80" height="80" rx="12" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1"/>
      {/* Shine overlay */}
      <rect x="6" y="6" width="84" height="84" rx="14" fill={`url(#${uid}7shine)`}/>
      {/* The 7 */}
      <text x="50" y="73"
        textAnchor="middle"
        fontSize="58"
        fontWeight="900"
        fontFamily="'Arial Black', 'Impact', sans-serif"
        fill="#fff"
        stroke="#ffcccc"
        strokeWidth="0.8"
        filter={`url(#${uid}7glow)`}
        letterSpacing="-2"
      >7</text>
      {/* Specular highlight */}
      <ellipse cx="28" cy="22" rx="16" ry="10" fill="rgba(255,255,255,0.18)" transform="rotate(-15 28 22)"/>
    </svg>
  ),

  BAR3: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}b3bg`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a1200"/>
          <stop offset="100%" stopColor="#0a0700"/>
        </linearGradient>
        <linearGradient id={`${uid}b3bar`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff0a0"/>
          <stop offset="20%" stopColor="#f5c842"/>
          <stop offset="50%" stopColor="#d4a017"/>
          <stop offset="80%" stopColor="#c08c10"/>
          <stop offset="100%" stopColor="#8a6208"/>
        </linearGradient>
        <linearGradient id={`${uid}b3shine`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)"/>
          <stop offset="40%" stopColor="rgba(255,255,255,0.05)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.2)"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="12" fill={`url(#${uid}b3bg)`} stroke="#d4a01730" strokeWidth="1.5"/>
      {[14, 38, 62].map((y, i) => (
        <g key={i}>
          <rect x="7" y={y} width="82" height="19" rx="4" fill="rgba(0,0,0,0.3)"/>
          <rect x="6" y={y - 1} width="84" height="19" rx="5" fill={`url(#${uid}b3bar)`} stroke="#f5c84250" strokeWidth="0.5"/>
          <rect x="6" y={y - 1} width="84" height="9" rx="5" fill={`url(#${uid}b3shine)`}/>
          <text x="48" y={y + 13.5}
            textAnchor="middle"
            fontSize="10"
            fontWeight="900"
            fontFamily="'Arial Black', sans-serif"
            fill="#3a2800"
            letterSpacing="3.5"
          >BAR</text>
        </g>
      ))}
      <rect x="4" y="4" width="88" height="88" rx="12" fill="none" stroke="#d4a01740" strokeWidth="1"/>
    </svg>
  ),

  BAR2: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}b2bg`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a1200"/><stop offset="100%" stopColor="#0a0700"/>
        </linearGradient>
        <linearGradient id={`${uid}b2bar`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff0a0"/>
          <stop offset="18%" stopColor="#f5c842"/>
          <stop offset="50%" stopColor="#d4a017"/>
          <stop offset="82%" stopColor="#c08c10"/>
          <stop offset="100%" stopColor="#8a6208"/>
        </linearGradient>
        <linearGradient id={`${uid}b2shine`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.48)"/>
          <stop offset="35%" stopColor="rgba(255,255,255,0.04)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.15)"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="12" fill={`url(#${uid}b2bg)`} stroke="#d4a01730" strokeWidth="1.5"/>
      {[22, 55].map((y, i) => (
        <g key={i}>
          <rect x="7" y={y + 1} width="82" height="19" rx="4" fill="rgba(0,0,0,0.3)"/>
          <rect x="6" y={y} width="84" height="19" rx="5" fill={`url(#${uid}b2bar)`} stroke="#f5c84250" strokeWidth="0.5"/>
          <rect x="6" y={y} width="84" height="9" rx="5" fill={`url(#${uid}b2shine)`}/>
          <text x="48" y={y + 13.5}
            textAnchor="middle" fontSize="11" fontWeight="900"
            fontFamily="'Arial Black', sans-serif" fill="#3a2800" letterSpacing="3.5"
          >BAR</text>
        </g>
      ))}
    </svg>
  ),

  BAR1: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}b1bg`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1a1200"/><stop offset="100%" stopColor="#0a0700"/>
        </linearGradient>
        <linearGradient id={`${uid}b1bar`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff0a0"/>
          <stop offset="15%" stopColor="#f5c842"/>
          <stop offset="50%" stopColor="#d4a017"/>
          <stop offset="85%" stopColor="#c08c10"/>
          <stop offset="100%" stopColor="#7a5200"/>
        </linearGradient>
        <linearGradient id={`${uid}b1shine`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)"/>
          <stop offset="30%" stopColor="rgba(255,255,255,0.03)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.1)"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="12" fill={`url(#${uid}b1bg)`} stroke="#d4a01730" strokeWidth="1.5"/>
      {/* Wide single bar */}
      <rect x="7" y="37" width="82" height="22" rx="4" fill="rgba(0,0,0,0.3)"/>
      <rect x="6" y="36" width="84" height="24" rx="6" fill={`url(#${uid}b1bar)`} stroke="#f5c842" strokeWidth="1.5"/>
      <rect x="6" y="36" width="84" height="12" rx="6" fill={`url(#${uid}b1shine)`}/>
      <text x="48" y="52"
        textAnchor="middle" fontSize="13" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fill="#3a2800" letterSpacing="4"
      >BAR</text>
    </svg>
  ),

  BELL: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}bellG`} cx="38%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fff3b0"/>
          <stop offset="35%" stopColor="#fde047"/>
          <stop offset="70%" stopColor="#d4a017"/>
          <stop offset="100%" stopColor="#8a6208"/>
        </radialGradient>
        <linearGradient id={`${uid}bellShine`} x1="10%" y1="5%" x2="55%" y2="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)"/>
          <stop offset="60%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <linearGradient id={`${uid}bellShadow`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,0,0,0)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)"/>
        </linearGradient>
      </defs>
      {/* Bell body shadow */}
      <path d="M50 12 C28 12 16 30 16 50 L10 74 L86 74 L80 50 C80 30 68 12 50 12Z" fill="rgba(0,0,0,0.35)"/>
      {/* Bell body */}
      <path d="M48 10 C26 10 14 28 14 48 L8 72 L88 72 L82 48 C82 28 70 10 48 10Z" fill={`url(#${uid}bellG)`} stroke="#f5c842" strokeWidth="1.2"/>
      {/* Shine */}
      <path d="M48 10 C36 10 24 22 22 40 L15 62 L70 62 C68 44 60 22 48 10Z" fill={`url(#${uid}bellShine)`}/>
      {/* Shadow */}
      <path d="M48 10 C60 10 72 28 74 48 L80 66 L48 66 C48 50 48 28 48 10Z" fill={`url(#${uid}bellShadow)`}/>
      {/* Clapper mount */}
      <rect x="38" y="72" width="20" height="7" rx="2" fill="#c49010" stroke="#e8b820" strokeWidth="0.5"/>
      {/* Clapper */}
      <ellipse cx="48" cy="82" rx="10" ry="7" fill="#c49010" stroke="#f5c842" strokeWidth="1.2"/>
      <ellipse cx="48" cy="84" rx="5" ry="4" fill="#a07808"/>
      {/* Crown nut */}
      <circle cx="48" cy="16" r="5" fill="#fde047" stroke="#f5c842" strokeWidth="0.8"/>
      <circle cx="48" cy="16" r="2.5" fill="rgba(255,255,255,0.5)"/>
      {/* Specular dot */}
      <ellipse cx="30" cy="30" rx="9" ry="6" fill="rgba(255,255,255,0.3)" transform="rotate(-30 30 30)"/>
    </svg>
  ),

  CHERRY: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}cherG`} cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#ff9eb8"/>
          <stop offset="40%" stopColor="#e8003a"/>
          <stop offset="100%" stopColor="#7a0020"/>
        </radialGradient>
        <radialGradient id={`${uid}cher2G`} cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#ffaec6"/>
          <stop offset="40%" stopColor="#e8003a"/>
          <stop offset="100%" stopColor="#7a0020"/>
        </radialGradient>
      </defs>
      {/* Stems — drawn first (behind leaves) */}
      <path d="M48 24 Q56 8 66 11" stroke="#16a34a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <path d="M48 24 Q36 12 28 18" stroke="#16a34a" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      {/* Leaves */}
      <ellipse cx="62" cy="10" rx="7" ry="4" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" transform="rotate(-25 62 10)"/>
      <ellipse cx="29" cy="16" rx="6" ry="4" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" transform="rotate(35 29 16)"/>
      {/* Cherry shadows */}
      <circle cx="35" cy="64" r="20" fill="rgba(0,0,0,0.3)"/>
      <circle cx="63" cy="64" r="20" fill="rgba(0,0,0,0.3)"/>
      {/* Cherries */}
      <circle cx="34" cy="63" r="20" fill={`url(#${uid}cherG)`} stroke="#c0002a" strokeWidth="1.2"/>
      <circle cx="64" cy="63" r="20" fill={`url(#${uid}cher2G)`} stroke="#c0002a" strokeWidth="1.2"/>
      {/* Highlights */}
      <ellipse cx="26" cy="54" rx="6" ry="4" fill="rgba(255,255,255,0.45)" transform="rotate(-20 26 54)"/>
      <ellipse cx="56" cy="54" rx="6" ry="4" fill="rgba(255,255,255,0.42)" transform="rotate(-20 56 54)"/>
      {/* Small spec */}
      <circle cx="30" cy="57" r="2" fill="rgba(255,255,255,0.6)"/>
      <circle cx="60" cy="57" r="2" fill="rgba(255,255,255,0.58)"/>
    </svg>
  ),

  LEMON: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}lemG`} cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fffff0"/>
          <stop offset="25%" stopColor="#fef9c3"/>
          <stop offset="60%" stopColor="#facc15"/>
          <stop offset="100%" stopColor="#9a6b00"/>
        </radialGradient>
        <linearGradient id={`${uid}lemTex`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.08)"/>
          <stop offset="50%" stopColor="rgba(255,255,255,0.1)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.08)"/>
        </linearGradient>
      </defs>
      {/* Drop shadow */}
      <ellipse cx="50" cy="56" rx="37" ry="30" fill="rgba(0,0,0,0.3)"/>
      {/* Lemon body */}
      <ellipse cx="48" cy="52" rx="36" ry="28" fill={`url(#${uid}lemG)`} stroke="#fbbf24" strokeWidth="1.2"/>
      {/* Skin texture */}
      <ellipse cx="48" cy="52" rx="36" ry="28" fill={`url(#${uid}lemTex)`}/>
      {/* Segment hints */}
      <path d="M12 52 Q48 34 84 52" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" fill="none"/>
      <path d="M18 66 Q48 52 78 66" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none"/>
      {/* Nubs */}
      <ellipse cx="12" cy="52" rx="4" ry="6" fill="#d97706"/>
      <ellipse cx="84" cy="52" rx="4" ry="6" fill="#d97706"/>
      {/* Shine */}
      <ellipse cx="30" cy="38" rx="11" ry="7" fill="rgba(255,255,255,0.32)" transform="rotate(-30 30 38)"/>
      <ellipse cx="30" cy="38" rx="5" ry="3" fill="rgba(255,255,255,0.55)" transform="rotate(-30 30 38)"/>
      {/* Leaf */}
      <ellipse cx="48" cy="23" rx="8" ry="5" fill="#22c55e" stroke="#15803d" strokeWidth="0.8"/>
    </svg>
  ),

  ORANGE: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}orgG`} cx="30%" cy="26%" r="74%">
          <stop offset="0%" stopColor="#fed7aa"/>
          <stop offset="35%" stopColor="#fb923c"/>
          <stop offset="70%" stopColor="#ea6010"/>
          <stop offset="100%" stopColor="#7c2d00"/>
        </radialGradient>
      </defs>
      {/* Shadow */}
      <circle cx="50" cy="58" r="34" fill="rgba(0,0,0,0.3)"/>
      {/* Orange body */}
      <circle cx="48" cy="54" r="34" fill={`url(#${uid}orgG)`} stroke="#c2550a" strokeWidth="1.2"/>
      {/* Segment lines */}
      <line x1="48" y1="20" x2="48" y2="88" stroke="rgba(0,0,0,0.1)" strokeWidth="1.2"/>
      <line x1="14" y1="54" x2="82" y2="54" stroke="rgba(0,0,0,0.1)" strokeWidth="1.2"/>
      <line x1="22" y1="30" x2="74" y2="78" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>
      <line x1="74" y1="30" x2="22" y2="78" stroke="rgba(0,0,0,0.07)" strokeWidth="1"/>
      {/* Texture pores */}
      {[{x:30,y:40},{x:52,y:34},{x:62,y:50},{x:38,y:64},{x:58,y:68}].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r="1.2" fill="rgba(0,0,0,0.12)"/>
      ))}
      {/* Leaf */}
      <path d="M44 18 Q48 6 52 18 Q48 24 44 18Z" fill="#22c55e" stroke="#15803d" strokeWidth="0.8"/>
      {/* Shine */}
      <ellipse cx="32" cy="38" rx="10" ry="6" fill="rgba(255,255,255,0.3)" transform="rotate(-30 32 38)"/>
      <ellipse cx="32" cy="38" rx="4" ry="2.5" fill="rgba(255,255,255,0.5)" transform="rotate(-30 32 38)"/>
    </svg>
  ),

  WILD: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}wildG`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0abfc"/>
          <stop offset="25%" stopColor="#c084fc"/>
          <stop offset="50%" stopColor="#7c3aed"/>
          <stop offset="75%" stopColor="#2563eb"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>
        <linearGradient id={`${uid}wildShine`} x1="5%" y1="0%" x2="50%" y2="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)"/>
          <stop offset="55%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id={`${uid}wildGlw`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Outer glow ring */}
      <polygon points="48,4 60,34 92,34 66,54 78,86 48,66 18,86 30,54 4,34 36,34"
        fill="none" stroke="rgba(192,132,252,0.4)" strokeWidth="3"/>
      {/* Star shadow */}
      <polygon points="48,6 60,36 92,36 66,56 78,88 48,68 18,88 30,56 4,36 36,36"
        fill="rgba(0,0,0,0.35)"/>
      {/* Star body */}
      <polygon points="48,4 60,34 92,34 66,54 78,86 48,66 18,86 30,54 4,34 36,34"
        fill={`url(#${uid}wildG)`} stroke="#c084fc" strokeWidth="1.2"/>
      {/* Shine overlay on star */}
      <polygon points="48,4 60,34 92,34 66,54 78,86 48,66 18,86 30,54 4,34 36,34"
        fill={`url(#${uid}wildShine)`}/>
      {/* WILD text */}
      <text x="48" y="60"
        textAnchor="middle"
        fontSize="14"
        fontWeight="900"
        fontFamily="'Arial Black', sans-serif"
        fill="#ffffff"
        stroke="rgba(120,80,200,0.6)"
        strokeWidth="0.8"
        letterSpacing="1.5"
        filter={`url(#${uid}wildGlw)`}
      >WILD</text>
      {/* Specular */}
      <ellipse cx="34" cy="24" rx="8" ry="5" fill="rgba(255,255,255,0.35)" transform="rotate(-25 34 24)"/>
    </svg>
  ),
};
