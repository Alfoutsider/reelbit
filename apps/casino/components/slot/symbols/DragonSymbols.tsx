// Dragon Fire slot symbols — studio-quality illustrated SVGs

import type { JSX } from "react";

type Renderer = (uid: string, size: number, filter: string) => JSX.Element;

export const DRAGON_SYMBOLS: Record<string, Renderer> = {

  DRAGON: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}dbg`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#3a0000"/>
          <stop offset="100%" stopColor="#0d0000"/>
        </radialGradient>
        <linearGradient id={`${uid}dhead`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6600"/>
          <stop offset="40%" stopColor="#cc2200"/>
          <stop offset="100%" stopColor="#660000"/>
        </linearGradient>
        <linearGradient id={`${uid}dscale`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff8844"/>
          <stop offset="100%" stopColor="#882200"/>
        </linearGradient>
        <radialGradient id={`${uid}deye`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffee00"/>
          <stop offset="60%" stopColor="#ff8800"/>
          <stop offset="100%" stopColor="#cc4400"/>
        </radialGradient>
        <filter id={`${uid}dEyeGlow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Background */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}dbg)`} stroke="#ff440030" strokeWidth="1.5"/>
      {/* Dragon body/neck curve */}
      <path d="M20 80 Q10 55 25 40 Q35 28 45 32 Q60 36 55 50 Q50 62 60 68 Q72 74 75 80" stroke={`url(#${uid}dscale)`} strokeWidth="14" fill="none" strokeLinecap="round"/>
      {/* Scale texture on body */}
      <path d="M20 80 Q10 55 25 40 Q35 28 45 32 Q60 36 55 50 Q50 62 60 68 Q72 74 75 80" stroke="rgba(255,100,0,0.2)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="4,3"/>
      {/* Dragon head */}
      <ellipse cx="58" cy="30" rx="22" ry="16" fill={`url(#${uid}dhead)`} stroke="#ff4400" strokeWidth="1"/>
      {/* Snout */}
      <path d="M70 32 Q82 30 84 35 Q82 40 70 38Z" fill="#cc2200" stroke="#ff4400" strokeWidth="0.8"/>
      {/* Nostrils */}
      <ellipse cx="78" cy="34" rx="2" ry="1.2" fill="#ff6600" opacity="0.8"/>
      <ellipse cx="76" cy="36.5" rx="1.5" ry="1" fill="#ff6600" opacity="0.7"/>
      {/* Horn */}
      <path d="M52 18 L46 6 L56 16Z" fill="#d4a017" stroke="#ffd700" strokeWidth="0.8"/>
      <path d="M62 16 L58 5 L66 14Z" fill="#d4a017" stroke="#ffd700" strokeWidth="0.8"/>
      {/* Eye socket */}
      <ellipse cx="62" cy="27" rx="8" ry="7" fill="rgba(0,0,0,0.5)"/>
      {/* Eye glow */}
      <ellipse cx="62" cy="27" rx="6" ry="6" fill={`url(#${uid}deye)`} filter={`url(#${uid}dEyeGlow)`}/>
      <ellipse cx="62" cy="27" rx="3" ry="3.5" fill="#1a0000"/>
      <ellipse cx="60.5" cy="25.5" rx="1.5" ry="1.5" fill="rgba(255,255,255,0.7)"/>
      {/* Teeth */}
      {[72,76,80].map((x,i) => (
        <path key={i} d={`M${x} 38 L${x+1} 44 L${x+2} 38Z`} fill="ivory" stroke="#aaa" strokeWidth="0.3"/>
      ))}
      {/* Wing hint */}
      <path d="M40 36 Q20 15 5 25 Q15 40 35 42Z" fill="#cc2200" stroke="#ff4400" strokeWidth="0.8" opacity="0.7"/>
      <path d="M40 36 Q22 17 8 23" stroke="#ff6600" strokeWidth="0.8" fill="none" opacity="0.5"/>
      {/* Claws */}
      <path d="M18 76 L12 82 M20 78 L16 85 M24 80 L22 87" stroke="#d4a017" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Frame highlight */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(255,100,0,0.4)" strokeWidth="1"/>
    </svg>
  ),

  FIRE_ORB: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}forbg`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1a0800"/>
          <stop offset="100%" stopColor="#060200"/>
        </radialGradient>
        <radialGradient id={`${uid}forb`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff0a0"/>
          <stop offset="20%" stopColor="#ffcc00"/>
          <stop offset="50%" stopColor="#ff6600"/>
          <stop offset="75%" stopColor="#cc2200"/>
          <stop offset="100%" stopColor="#660000"/>
        </radialGradient>
        <radialGradient id={`${uid}forCore`} cx="42%" cy="38%" r="50%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="30%" stopColor="#fffacc"/>
          <stop offset="100%" stopColor="rgba(255,220,100,0)"/>
        </radialGradient>
        <filter id={`${uid}forGlow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}forbg)`} stroke="#ff440025" strokeWidth="1.5"/>
      {/* Outer glow aura */}
      <circle cx="48" cy="50" r="36" fill="rgba(255,80,0,0.12)" filter={`url(#${uid}forGlow)`}/>
      {/* Flame base */}
      <ellipse cx="48" cy="66" rx="24" ry="8" fill="rgba(255,80,0,0.3)"/>
      {/* Main orb */}
      <circle cx="48" cy="48" r="30" fill={`url(#${uid}forb)`}/>
      {/* Orb inner core */}
      <circle cx="48" cy="48" r="30" fill={`url(#${uid}forCore)`}/>
      {/* Flame tongues */}
      <path d="M48 18 Q38 8 44 2 Q50 8 48 18Z" fill="#ff8800" opacity="0.85"/>
      <path d="M48 18 Q56 5 60 14 Q54 16 48 18Z" fill="#ffcc00" opacity="0.7"/>
      <path d="M34 24 Q22 12 30 6 Q36 14 34 24Z" fill="#ff6600" opacity="0.6"/>
      <path d="M62 24 Q74 10 70 4 Q64 14 62 24Z" fill="#ff4400" opacity="0.55"/>
      {/* Specular */}
      <ellipse cx="36" cy="36" rx="10" ry="7" fill="rgba(255,255,255,0.4)" transform="rotate(-30 36 36)"/>
      <ellipse cx="36" cy="36" rx="4" ry="3" fill="rgba(255,255,255,0.6)" transform="rotate(-30 36 36)"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(255,140,0,0.4)" strokeWidth="1"/>
    </svg>
  ),

  GEM: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}gbg`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#0a0020"/>
          <stop offset="100%" stopColor="#020008"/>
        </radialGradient>
        <linearGradient id={`${uid}gem1`} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#ffd6f0"/>
          <stop offset="25%" stopColor="#e879f9"/>
          <stop offset="60%" stopColor="#9333ea"/>
          <stop offset="100%" stopColor="#4c0070"/>
        </linearGradient>
        <linearGradient id={`${uid}gem2`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.6)"/>
          <stop offset="50%" stopColor="rgba(200,100,255,0.3)"/>
          <stop offset="100%" stopColor="rgba(100,0,200,0.1)"/>
        </linearGradient>
        <linearGradient id={`${uid}gem3`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c084fc"/>
          <stop offset="100%" stopColor="#3b0066"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}gbg)`} stroke="#9333ea30" strokeWidth="1.5"/>
      {/* Gem shadow */}
      <polygon points="48,84 16,42 22,14 74,14 80,42" fill="rgba(0,0,0,0.35)"/>
      {/* Main gem body */}
      <polygon points="48,82 14,40 20,12 76,12 82,40" fill={`url(#${uid}gem1)`} stroke="#c084fc" strokeWidth="1"/>
      {/* Facet top-left */}
      <polygon points="20,12 48,32 14,40" fill={`url(#${uid}gem2)`} opacity="0.7"/>
      {/* Facet top-right */}
      <polygon points="76,12 48,32 82,40" fill="rgba(120,0,200,0.4)"/>
      {/* Facet center-top */}
      <polygon points="20,12 48,32 76,12" fill="rgba(255,255,255,0.15)"/>
      {/* Facet left */}
      <polygon points="14,40 48,32 48,82" fill="rgba(150,0,255,0.25)"/>
      {/* Facet right */}
      <polygon points="82,40 48,32 48,82" fill={`url(#${uid}gem3)`} opacity="0.5"/>
      {/* Internal flash */}
      <polygon points="48,16 38,26 48,32 58,26" fill="rgba(255,255,255,0.55)"/>
      {/* Shine */}
      <ellipse cx="30" cy="24" rx="8" ry="5" fill="rgba(255,255,255,0.4)" transform="rotate(-20 30 24)"/>
      <ellipse cx="30" cy="24" rx="3" ry="2" fill="rgba(255,255,255,0.7)" transform="rotate(-20 30 24)"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(192,132,252,0.35)" strokeWidth="1"/>
    </svg>
  ),

  SWORD: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}swbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a0500"/>
          <stop offset="100%" stopColor="#020100"/>
        </linearGradient>
        <linearGradient id={`${uid}swblade`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8ea0b0"/>
          <stop offset="25%" stopColor="#e8f0f8"/>
          <stop offset="50%" stopColor="#c0d0e0"/>
          <stop offset="75%" stopColor="#a0b8c8"/>
          <stop offset="100%" stopColor="#607080"/>
        </linearGradient>
        <linearGradient id={`${uid}swhilt`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700"/>
          <stop offset="50%" stopColor="#b8860b"/>
          <stop offset="100%" stopColor="#8b6914"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}swbg)`} stroke="#88770020" strokeWidth="1.5"/>
      {/* Sword shadow */}
      <line x1="51" y1="7" x2="51" y2="76" stroke="rgba(0,0,0,0.5)" strokeWidth="8" strokeLinecap="round"/>
      {/* Blade */}
      <polygon points="48,6 52,6 56,74 44,74" fill={`url(#${uid}swblade)`} stroke="#a0b8c8" strokeWidth="0.5"/>
      {/* Edge highlight */}
      <line x1="49" y1="8" x2="49.5" y2="72" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8"/>
      {/* Cross-guard */}
      <rect x="28" y="68" width="40" height="8" rx="4" fill={`url(#${uid}swhilt)`} stroke="#ffd700" strokeWidth="0.8"/>
      {/* Guard gems */}
      <circle cx="30" cy="72" r="4" fill="#e879f9" stroke="#c084fc" strokeWidth="0.5"/>
      <circle cx="66" cy="72" r="4" fill="#e879f9" stroke="#c084fc" strokeWidth="0.5"/>
      <ellipse cx="30" cy="71" rx="1.5" ry="1.5" fill="rgba(255,255,255,0.6)"/>
      {/* Grip */}
      <rect x="43" y="76" width="10" height="16" rx="3" fill="#5a3810" stroke="#d4a017" strokeWidth="0.8"/>
      {/* Grip wrapping */}
      {[80,83,86].map((y,i) => (
        <line key={i} x1="43" y1={y} x2="53" y2={y} stroke="#d4a01780" strokeWidth="1"/>
      ))}
      {/* Pommel */}
      <circle cx="48" cy="94" r="5" fill={`url(#${uid}swhilt)`} stroke="#ffd700" strokeWidth="0.8"/>
      <circle cx="47" cy="93" r="2" fill="rgba(255,255,255,0.4)"/>
      {/* Blade shine */}
      <line x1="50" y1="10" x2="54" y2="70" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(212,160,23,0.3)" strokeWidth="1"/>
    </svg>
  ),

  SHIELD: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}shbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a0200"/><stop offset="100%" stopColor="#020000"/>
        </linearGradient>
        <linearGradient id={`${uid}shbody`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cc2200"/>
          <stop offset="50%" stopColor="#881500"/>
          <stop offset="100%" stopColor="#440a00"/>
        </linearGradient>
        <linearGradient id={`${uid}shrim`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700"/>
          <stop offset="50%" stopColor="#c8960c"/>
          <stop offset="100%" stopColor="#8b6914"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}shbg)`} stroke="#88110010" strokeWidth="1.5"/>
      {/* Shield shadow */}
      <path d="M51 9 L87 22 L87 52 Q87 76 51 89 Q15 76 15 52 L15 22 Z" fill="rgba(0,0,0,0.4)"/>
      {/* Shield body */}
      <path d="M48 8 L84 20 L84 50 Q84 74 48 88 Q12 74 12 50 L12 20 Z" fill={`url(#${uid}shbody)`}/>
      {/* Rim */}
      <path d="M48 8 L84 20 L84 50 Q84 74 48 88 Q12 74 12 50 L12 20 Z" fill="none" stroke={`url(#${uid}shrim)`} strokeWidth="3"/>
      {/* Cross emblem */}
      <rect x="43" y="28" width="10" height="34" rx="3" fill="#ffd700" stroke="#c8960c" strokeWidth="0.5"/>
      <rect x="28" y="42" width="40" height="10" rx="3" fill="#ffd700" stroke="#c8960c" strokeWidth="0.5"/>
      {/* Dragon icon (simplified) at center */}
      <circle cx="48" cy="48" r="8" fill="#cc2200" stroke="#ffd700" strokeWidth="1"/>
      <path d="M44 45 Q48 40 52 45 Q50 50 48 52 Q46 50 44 45Z" fill="#ff4400"/>
      {/* Shine */}
      <path d="M18 22 Q28 16 38 20 L38 40 Q28 38 18 44 Z" fill="rgba(255,255,255,0.15)"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(212,160,23,0.35)" strokeWidth="1"/>
    </svg>
  ),

  HELMET: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}hbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#080808"/><stop offset="100%" stopColor="#020202"/>
        </linearGradient>
        <linearGradient id={`${uid}hmetal`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c0c8d0"/>
          <stop offset="30%" stopColor="#e8ecf0"/>
          <stop offset="60%" stopColor="#9aa8b0"/>
          <stop offset="100%" stopColor="#506070"/>
        </linearGradient>
        <linearGradient id={`${uid}hgold`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700"/>
          <stop offset="100%" stopColor="#c8960c"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}hbg)`} stroke="#55555510" strokeWidth="1.5"/>
      {/* Helmet shadow */}
      <ellipse cx="50" cy="66" rx="34" ry="20" fill="rgba(0,0,0,0.4)"/>
      {/* Helm body */}
      <path d="M48 10 Q16 10 12 40 L10 64 Q10 76 22 78 L74 78 Q86 76 86 64 L84 40 Q80 10 48 10Z" fill={`url(#${uid}hmetal)`} stroke="#9aa8b0" strokeWidth="1"/>
      {/* Visor opening */}
      <path d="M20 46 L76 46 L72 62 L24 62 Z" fill="rgba(0,0,0,0.7)" stroke="#707880" strokeWidth="1"/>
      {/* Visor bars */}
      {[50,55,60].map((y,i) => (
        <line key={i} x1="22" y1={y} x2="74" y2={y} stroke="#404850" strokeWidth="1.5"/>
      ))}
      {/* Nasal guard */}
      <rect x="44" y="30" width="8" height="36" rx="3" fill={`url(#${uid}hmetal)`} stroke="#707880" strokeWidth="0.8"/>
      {/* Crown ridge */}
      <path d="M24 12 Q48 4 72 12 L68 20 Q48 14 28 20Z" fill={`url(#${uid}hgold)`} stroke="#ffd700" strokeWidth="0.8"/>
      {/* Dragon crest */}
      <path d="M48 4 L44 0 L40 6 L42 10 L48 8 L54 10 L56 6 L52 0Z" fill="#cc2200" stroke="#ff4400" strokeWidth="0.8"/>
      {/* Ear guards */}
      <ellipse cx="12" cy="55" rx="6" ry="10" fill={`url(#${uid}hmetal)`} stroke="#9aa8b0" strokeWidth="0.8"/>
      <ellipse cx="84" cy="55" rx="6" ry="10" fill={`url(#${uid}hmetal)`} stroke="#9aa8b0" strokeWidth="0.8"/>
      {/* Shine */}
      <path d="M22 14 Q36 8 50 12 L48 28 Q34 24 20 30Z" fill="rgba(255,255,255,0.18)"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(160,176,192,0.3)" strokeWidth="1"/>
    </svg>
  ),

  WILD: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}dwbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a0800"/><stop offset="100%" stopColor="#060200"/>
        </linearGradient>
        <linearGradient id={`${uid}dwfire`} x1="0%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#ff2200"/>
          <stop offset="50%" stopColor="#ff8800"/>
          <stop offset="100%" stopColor="#ffdd00"/>
        </linearGradient>
        <filter id={`${uid}dwGlow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}dwbg)`} stroke="#ff440025" strokeWidth="1.5"/>
      {/* Flame banner shape */}
      <path d="M8 30 Q8 20 18 18 L78 18 Q88 20 88 30 L88 66 Q88 76 78 78 L60 78 Q52 88 48 88 Q44 88 36 78 L18 78 Q8 76 8 66 Z" fill="#1a0400" stroke="#ff440040" strokeWidth="1"/>
      {/* Fire base flames */}
      <path d="M20 78 Q30 65 48 88 Q66 65 76 78 L76 72 Q62 60 48 76 Q34 60 20 72Z" fill={`url(#${uid}dwfire)`} opacity="0.9"/>
      {/* Top fire tongues */}
      <path d="M30 18 Q28 6 36 8 Q36 14 30 18Z" fill="#ff8800" opacity="0.7"/>
      <path d="M48 18 Q46 2 52 4 Q50 12 48 18Z" fill="#ffcc00" opacity="0.8"/>
      <path d="M66 18 Q68 5 72 10 Q68 15 66 18Z" fill="#ff6600" opacity="0.7"/>
      {/* WILD text with fire glow */}
      <text x="48" y="58"
        textAnchor="middle"
        fontSize="22"
        fontWeight="900"
        fontFamily="'Arial Black', sans-serif"
        fill="#ffcc00"
        stroke="#ff4400"
        strokeWidth="1.5"
        filter={`url(#${uid}dwGlow)`}
        letterSpacing="1"
      >WILD</text>
      {/* Shine */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(255,140,0,0.3)" strokeWidth="1"/>
    </svg>
  ),

  SCATTER: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}scbg`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1a0a00"/>
          <stop offset="100%" stopColor="#050200"/>
        </radialGradient>
        <radialGradient id={`${uid}scegg`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff9960"/>
          <stop offset="50%" stopColor="#cc4400"/>
          <stop offset="100%" stopColor="#660000"/>
        </radialGradient>
        <linearGradient id={`${uid}sccrack`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffdd00"/>
          <stop offset="100%" stopColor="#ff8800"/>
        </linearGradient>
        <filter id={`${uid}scGlow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}scbg)`} stroke="#ff440020" strokeWidth="1.5"/>
      {/* Egg glow */}
      <ellipse cx="48" cy="52" rx="28" ry="34" fill="rgba(255,100,0,0.15)" filter={`url(#${uid}scGlow)`}/>
      {/* Dragon egg */}
      <ellipse cx="48" cy="52" rx="26" ry="32" fill={`url(#${uid}scegg)`} stroke="#cc4400" strokeWidth="1"/>
      {/* Scale pattern */}
      {[
        [36,36],[46,34],[56,36],[32,45],[42,43],[52,43],[62,45],
        [36,54],[46,52],[56,54],[38,63],[48,61],[58,63]
      ].map(([x,y],i) => (
        <path key={i} d={`M${x} ${y} Q${x+5} ${y-4} ${x+10} ${y} Q${x+5} ${y+4} ${x} ${y}Z`} fill="rgba(0,0,0,0.2)" stroke="rgba(200,80,0,0.3)" strokeWidth="0.5"/>
      ))}
      {/* Crack glow */}
      <path d="M48 20 L42 36 L50 38 L44 54" stroke={`url(#${uid}sccrack)`} strokeWidth="3" fill="none" strokeLinecap="round" filter={`url(#${uid}scGlow)`}/>
      {/* Crack */}
      <path d="M48 20 L42 36 L50 38 L44 54" stroke="#ffee00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Inner fire glow */}
      <path d="M48 20 L42 36 L50 38 L44 54" stroke="rgba(255,255,200,0.5)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5"/>
      {/* Shine */}
      <ellipse cx="34" cy="36" rx="8" ry="5" fill="rgba(255,255,255,0.25)" transform="rotate(-25 34 36)"/>
      {/* SCATTER label */}
      <text x="48" y="91"
        textAnchor="middle" fontSize="7.5" fontWeight="700"
        fontFamily="'Arial Black', sans-serif" fill="#ff8800" letterSpacing="1.5"
      >SCATTER</text>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(255,140,0,0.35)" strokeWidth="1"/>
    </svg>
  ),
};
