// Egyptian Gold slot symbols — studio-quality illustrated SVGs

import type { JSX } from "react";

type Renderer = (uid: string, size: number, filter: string) => JSX.Element;

export const EGYPTIAN_SYMBOLS: Record<string, Renderer> = {

  PHARAOH: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}pbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1000"/><stop offset="100%" stopColor="#080600"/>
        </linearGradient>
        <linearGradient id={`${uid}phead`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="40%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#78350f"/>
        </linearGradient>
        <linearGradient id={`${uid}pstripe`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e40af"/>
          <stop offset="100%" stopColor="#1e3a8a"/>
        </linearGradient>
        <linearGradient id={`${uid}pband`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700"/>
          <stop offset="100%" stopColor="#c8960c"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}pbg)`} stroke="#c8960c20" strokeWidth="1.5"/>
      {/* Nemes headdress — cloth sides */}
      <path d="M20 20 L76 20 L82 72 L68 78 L28 78 L14 72Z" fill={`url(#${uid}phead)`}/>
      {/* Stripes */}
      {[0,1,2,3].map(i => (
        <path key={i} d={`M${22+i*16} 20 L${20+i*16} 78`} stroke={`url(#${uid}pstripe)`} strokeWidth="5" strokeOpacity="0.4"/>
      ))}
      {/* Crown top */}
      <path d="M36 20 L36 4 L44 10 L48 2 L52 10 L60 4 L60 20Z" fill={`url(#${uid}pband)`} stroke="#ffd700" strokeWidth="0.8"/>
      {/* Crown jewel */}
      <circle cx="48" cy="8" r="5" fill="#e879f9" stroke="#c084fc" strokeWidth="0.8"/>
      <circle cx="47" cy="7" r="2" fill="rgba(255,255,255,0.6)"/>
      {/* Forehead band */}
      <rect x="20" y="20" width="56" height="6" rx="2" fill={`url(#${uid}pband)`} stroke="#ffd700" strokeWidth="0.5"/>
      {/* Uraeus (cobra) */}
      <path d="M44 20 Q40 14 44 10 Q48 8 50 12 Q50 16 44 20" fill="#22c55e" stroke="#15803d" strokeWidth="0.8"/>
      <circle cx="47" cy="10" r="2" fill="#22c55e"/>
      {/* Face oval */}
      <ellipse cx="48" cy="52" rx="20" ry="22" fill="#f59e0b"/>
      {/* Eyes */}
      <path d="M34 48 L36 50 L34 52" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M62 48 L60 50 L62 52" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Kohl eye lines */}
      <path d="M28 50 L38 50" stroke="#1a0a00" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M58 50 L68 50" stroke="#1a0a00" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Eye irises */}
      <ellipse cx="37" cy="50" rx="4" ry="4" fill="#1a3060"/>
      <ellipse cx="59" cy="50" rx="4" ry="4" fill="#1a3060"/>
      <circle cx="37" cy="50" r="2" fill="#080808"/>
      <circle cx="59" cy="50" r="2" fill="#080808"/>
      <circle cx="36" cy="49" r="1.2" fill="rgba(255,255,255,0.7)"/>
      <circle cx="58" cy="49" r="1.2" fill="rgba(255,255,255,0.7)"/>
      {/* Nose */}
      <path d="M46 54 Q48 58 50 54" stroke="#c8760c" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* Mouth */}
      <path d="M40 66 Q48 70 56 66" stroke="#c8760c" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Beard */}
      <rect x="42" y="72" width="12" height="16" rx="3" fill={`url(#${uid}pband)`} stroke="#ffd700" strokeWidth="0.8"/>
      <line x1="48" y1="74" x2="48" y2="86" stroke="#c8960c" strokeWidth="0.8"/>
      {/* Collar */}
      <path d="M28 74 Q48 80 68 74" stroke={`url(#${uid}pband)`} strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* Shine */}
      <ellipse cx="34" cy="36" rx="8" ry="5" fill="rgba(255,255,255,0.2)" transform="rotate(-20 34 36)"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(200,150,12,0.35)" strokeWidth="1"/>
    </svg>
  ),

  EYE_RA: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}erbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0c0800"/><stop offset="100%" stopColor="#040300"/>
        </linearGradient>
        <radialGradient id={`${uid}eriris`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffd700"/>
          <stop offset="50%" stopColor="#d4a017"/>
          <stop offset="100%" stopColor="#8b5e00"/>
        </radialGradient>
        <filter id={`${uid}erGlow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}erbg)`} stroke="#c8960c25" strokeWidth="1.5"/>
      {/* Eye white */}
      <path d="M8 48 Q48 16 88 48 Q48 80 8 48Z" fill="#f0e0a0" stroke="#c8960c" strokeWidth="1.2"/>
      {/* Iris */}
      <ellipse cx="48" cy="48" rx="18" ry="18" fill={`url(#${uid}eriris)`} filter={`url(#${uid}erGlow)`}/>
      {/* Pupil */}
      <circle cx="48" cy="48" r="10" fill="#1a0a00"/>
      <ellipse cx="45" cy="45" rx="3" ry="3" fill="rgba(255,255,255,0.5)"/>
      {/* Inner iris ring */}
      <circle cx="48" cy="48" r="14" fill="none" stroke="#ffd700" strokeWidth="1" opacity="0.6"/>
      {/* Kohl lid lines */}
      <path d="M8 48 Q28 42 48 42 Q68 42 88 48" stroke="#1a0a00" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Bottom tear line */}
      <path d="M18 50 Q38 58 48 52 Q58 58 78 50" stroke="#1a0a00" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Left decorative line (kohl) */}
      <path d="M8 48 L4 56 L10 56" stroke="#1a0a00" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Right sun disc */}
      <circle cx="82" cy="28" r="10" fill="#ff8800" stroke="#ffd700" strokeWidth="1.5" filter={`url(#${uid}erGlow)`}/>
      {/* Sun rays */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => {
        const rad = deg * Math.PI / 180;
        const x1 = 82 + 11 * Math.cos(rad), y1 = 28 + 11 * Math.sin(rad);
        const x2 = 82 + 16 * Math.cos(rad), y2 = 28 + 16 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round"/>;
      })}
      <circle cx="81" cy="27" r="4" fill="rgba(255,255,255,0.4)"/>
      {/* Hieroglyphic detail below */}
      <path d="M20 76 L76 76 M28 82 L68 82" stroke="#c8960c" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(200,150,12,0.35)" strokeWidth="1"/>
    </svg>
  ),

  ANUBIS: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}anbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#100a00"/><stop offset="100%" stopColor="#040300"/>
        </linearGradient>
        <linearGradient id={`${uid}anhead`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1a"/>
          <stop offset="50%" stopColor="#0a0a0a"/>
          <stop offset="100%" stopColor="#050505"/>
        </linearGradient>
        <linearGradient id={`${uid}angold`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700"/>
          <stop offset="100%" stopColor="#c8960c"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}anbg)`} stroke="#c8960c20" strokeWidth="1.5"/>
      {/* Body/robes */}
      <path d="M30 58 L20 90 L76 90 L66 58 Z" fill="#1a1400" stroke="#c8960c40" strokeWidth="0.8"/>
      {/* Collar */}
      <path d="M28 58 Q48 66 68 58 L66 52 Q48 60 30 52 Z" fill={`url(#${uid}angold)`} stroke="#ffd700" strokeWidth="0.5"/>
      {/* Neck */}
      <rect x="40" y="46" width="16" height="12" rx="4" fill="#1a1a1a"/>
      {/* Head — jackal shape */}
      <path d="M18 32 L18 44 L26 50 L70 50 L78 44 L78 32 Q78 14 48 10 Q18 14 18 32Z" fill={`url(#${uid}anhead)`}/>
      {/* Muzzle/snout */}
      <path d="M32 40 Q48 36 64 40 L66 50 Q48 46 30 50Z" fill="#1a1a1a" stroke="#333" strokeWidth="0.5"/>
      {/* Pointed snout */}
      <path d="M36 42 Q48 36 60 42 L56 52 Q48 48 40 52Z" fill="#1a1a1a"/>
      {/* Ears */}
      <path d="M18 32 L8 6 L26 24Z" fill={`url(#${uid}anhead)`} stroke="#333" strokeWidth="0.5"/>
      <path d="M78 32 L88 6 L70 24Z" fill={`url(#${uid}anhead)`} stroke="#333" strokeWidth="0.5"/>
      {/* Inner ear */}
      <path d="M18 30 L12 10 L24 22Z" fill="#330000" opacity="0.7"/>
      <path d="M78 30 L84 10 L72 22Z" fill="#330000" opacity="0.7"/>
      {/* Eyes */}
      <ellipse cx="36" cy="36" rx="7" ry="6" fill="#ffd700"/>
      <ellipse cx="60" cy="36" rx="7" ry="6" fill="#ffd700"/>
      <ellipse cx="36" cy="36" rx="4" ry="4" fill="#1a0a00"/>
      <ellipse cx="60" cy="36" rx="4" ry="4" fill="#1a0a00"/>
      <ellipse cx="34.5" cy="35" rx="1.5" ry="1.5" fill="rgba(255,255,255,0.6)"/>
      <ellipse cx="58.5" cy="35" rx="1.5" ry="1.5" fill="rgba(255,255,255,0.6)"/>
      {/* Nose */}
      <ellipse cx="48" cy="46" rx="4" ry="2.5" fill="#222"/>
      {/* Gold headdress accent */}
      <rect x="18" y="28" width="60" height="4" rx="2" fill={`url(#${uid}angold)`} stroke="#ffd700" strokeWidth="0.3"/>
      {/* Staff hint */}
      <line x1="76" y1="55" x2="86" y2="90" stroke={`url(#${uid}angold)`} strokeWidth="3" strokeLinecap="round"/>
      {/* Top crook */}
      <path d="M84 55 Q90 48 84 44 Q78 40 76 48" stroke={`url(#${uid}angold)`} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(200,150,12,0.3)" strokeWidth="1"/>
    </svg>
  ),

  SCARAB: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}scbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#080e00"/><stop offset="100%" stopColor="#020400"/>
        </linearGradient>
        <radialGradient id={`${uid}scbody`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4ade80"/>
          <stop offset="40%" stopColor="#16a34a"/>
          <stop offset="80%" stopColor="#14532d"/>
          <stop offset="100%" stopColor="#052e16"/>
        </radialGradient>
        <linearGradient id={`${uid}scwing`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a3e635"/>
          <stop offset="50%" stopColor="#4ade80"/>
          <stop offset="100%" stopColor="#14532d"/>
        </linearGradient>
        <linearGradient id={`${uid}scgold`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700"/>
          <stop offset="100%" stopColor="#c8960c"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}scbg)`} stroke="#16a34a20" strokeWidth="1.5"/>
      {/* Wings */}
      <ellipse cx="20" cy="52" rx="18" ry="28" fill={`url(#${uid}scwing)`} stroke="#4ade80" strokeWidth="0.8" transform="rotate(15 20 52)"/>
      <ellipse cx="76" cy="52" rx="18" ry="28" fill={`url(#${uid}scwing)`} stroke="#4ade80" strokeWidth="0.8" transform="rotate(-15 76 52)"/>
      {/* Wing pattern lines */}
      {[0,1,2].map(i => (
        <line key={i} x1={14+i*4} y1={35+i*10} x2={28-i*2} y2={62+i*5} stroke="rgba(255,255,255,0.15)" strokeWidth="1.2"/>
      ))}
      {[0,1,2].map(i => (
        <line key={i} x1={82-i*4} y1={35+i*10} x2={68+i*2} y2={62+i*5} stroke="rgba(255,255,255,0.15)" strokeWidth="1.2"/>
      ))}
      {/* Body */}
      <ellipse cx="48" cy="56" rx="18" ry="22" fill={`url(#${uid}scbody)`} stroke="#22c55e" strokeWidth="1"/>
      {/* Body segments */}
      <line x1="34" y1="50" x2="62" y2="50" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>
      <line x1="32" y1="58" x2="64" y2="58" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>
      <line x1="34" y1="66" x2="62" y2="66" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>
      {/* Head */}
      <ellipse cx="48" cy="36" rx="12" ry="9" fill={`url(#${uid}scbody)`} stroke="#22c55e" strokeWidth="1"/>
      {/* Antennae */}
      <path d="M40 30 Q34 18 30 12" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M56 30 Q62 18 66 12" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="30" cy="12" r="3" fill="#ffd700" stroke="#c8960c" strokeWidth="0.8"/>
      <circle cx="66" cy="12" r="3" fill="#ffd700" stroke="#c8960c" strokeWidth="0.8"/>
      {/* Eyes */}
      <ellipse cx="42" cy="35" rx="4" ry="4" fill="#ffd700"/>
      <ellipse cx="54" cy="35" rx="4" ry="4" fill="#ffd700"/>
      <circle cx="42" cy="35" r="2" fill="#1a0a00"/>
      <circle cx="54" cy="35" r="2" fill="#1a0a00"/>
      {/* Sun disc (what scarab pushes) */}
      <circle cx="48" cy="14" r="8" fill={`url(#${uid}scgold)`} stroke="#ffd700" strokeWidth="1"/>
      {/* Sun rays */}
      {[0,45,90,135,180,225,270,315].map((d,i) => {
        const r = d*Math.PI/180, x1=48+9*Math.cos(r), y1=14+9*Math.sin(r), x2=48+13*Math.cos(r), y2=14+13*Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round"/>;
      })}
      <circle cx="47" cy="13" r="3" fill="rgba(255,255,255,0.4)"/>
      {/* Shine */}
      <ellipse cx="38" cy="46" rx="6" ry="4" fill="rgba(255,255,255,0.2)" transform="rotate(-20 38 46)"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(34,197,94,0.25)" strokeWidth="1"/>
    </svg>
  ),

  ANKH: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}akbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#100a00"/><stop offset="100%" stopColor="#040300"/>
        </linearGradient>
        <linearGradient id={`${uid}akgold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff5a0"/>
          <stop offset="25%" stopColor="#ffd700"/>
          <stop offset="60%" stopColor="#c8960c"/>
          <stop offset="100%" stopColor="#8b6914"/>
        </linearGradient>
        <linearGradient id={`${uid}akshine`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)"/>
          <stop offset="60%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id={`${uid}akGlow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}akbg)`} stroke="#c8960c25" strokeWidth="1.5"/>
      {/* Glow base */}
      <ellipse cx="48" cy="48" rx="30" ry="36" fill="rgba(212,160,23,0.1)" filter={`url(#${uid}akGlow)`}/>
      {/* Loop shadow */}
      <ellipse cx="50" cy="30" rx="19" ry="14" fill="rgba(0,0,0,0.4)"/>
      {/* Loop of ankh */}
      <ellipse cx="48" cy="28" rx="18" ry="13" fill="none" stroke={`url(#${uid}akgold)`} strokeWidth="10"/>
      {/* Loop inner */}
      <ellipse cx="48" cy="28" rx="12" ry="8" fill={`url(#${uid}akbg)`}/>
      {/* Vertical bar shadow */}
      <rect x="51" y="38" width="12" height="52" rx="5" fill="rgba(0,0,0,0.4)"/>
      {/* Vertical bar */}
      <rect x="40" y="38" width="16" height="52" rx="6" fill={`url(#${uid}akgold)`} stroke="#ffd700" strokeWidth="0.5"/>
      {/* Horizontal bar shadow */}
      <rect x="12" y="55" width="72" height="14" rx="5" fill="rgba(0,0,0,0.4)"/>
      {/* Horizontal bar */}
      <rect x="10" y="52" width="76" height="13" rx="6" fill={`url(#${uid}akgold)`} stroke="#ffd700" strokeWidth="0.5"/>
      {/* Jewels on cross */}
      <circle cx="48" cy="58" r="5" fill="#e879f9" stroke="#ffd700" strokeWidth="0.8" filter={`url(#${uid}akGlow)`}/>
      <circle cx="16" cy="58" r="4" fill="#e879f9" stroke="#ffd700" strokeWidth="0.8"/>
      <circle cx="80" cy="58" r="4" fill="#e879f9" stroke="#ffd700" strokeWidth="0.8"/>
      <circle cx="48" cy="84" r="4" fill="#c084fc" stroke="#ffd700" strokeWidth="0.8"/>
      {/* Shine overlay */}
      <ellipse cx="48" cy="28" rx="18" ry="13" fill="none" stroke={`url(#${uid}akshine)`} strokeWidth="5"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(200,150,12,0.35)" strokeWidth="1"/>
    </svg>
  ),

  SNAKE: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}snbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#080e00"/><stop offset="100%" stopColor="#020400"/>
        </linearGradient>
        <linearGradient id={`${uid}snbody`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#84cc16"/>
          <stop offset="50%" stopColor="#65a30d"/>
          <stop offset="100%" stopColor="#3f6212"/>
        </linearGradient>
        <linearGradient id={`${uid}snhead`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a3e635"/>
          <stop offset="100%" stopColor="#4d7c0f"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}snbg)`} stroke="#65a30d20" strokeWidth="1.5"/>
      {/* Coiled body shadow */}
      <path d="M48 80 Q80 80 85 60 Q90 40 70 30 Q60 24 50 30 Q30 38 30 58 Q30 72 48 80Z"
        stroke="rgba(0,0,0,0.35)" strokeWidth="12" fill="none" strokeLinecap="round"/>
      {/* Coiled body */}
      <path d="M48 80 Q80 80 85 60 Q90 40 70 30 Q60 24 50 30 Q30 38 30 58 Q30 72 48 80Z"
        stroke={`url(#${uid}snbody)`} strokeWidth="10" fill="none" strokeLinecap="round"/>
      {/* Scale pattern */}
      <path d="M48 80 Q80 80 85 60 Q90 40 70 30 Q60 24 50 30 Q30 38 30 58 Q30 72 48 80Z"
        stroke="rgba(0,0,0,0.2)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="6,5"/>
      {/* Head */}
      <ellipse cx="52" cy="22" rx="16" ry="11" fill={`url(#${uid}snhead)`} stroke="#84cc16" strokeWidth="0.8" transform="rotate(-20 52 22)"/>
      {/* Hood (cobra spread) */}
      <path d="M38 16 Q40 6 52 12 Q64 6 66 16 Q60 22 52 20 Q44 22 38 16Z" fill="#84cc16" stroke="#65a30d" strokeWidth="0.8"/>
      {/* Hood pattern */}
      <path d="M42 15 Q52 10 62 15" stroke="#a3e635" strokeWidth="1" fill="none" opacity="0.6"/>
      {/* Eyes */}
      <circle cx="46" cy="22" r="4" fill="#ffd700"/>
      <circle cx="58" cy="22" r="4" fill="#ffd700"/>
      <circle cx="46" cy="22" r="2.2" fill="#1a0a00"/>
      <circle cx="58" cy="22" r="2.2" fill="#1a0a00"/>
      <circle cx="45" cy="21" r="1.2" fill="rgba(255,255,255,0.6)"/>
      <circle cx="57" cy="21" r="1.2" fill="rgba(255,255,255,0.6)"/>
      {/* Forked tongue */}
      <path d="M52 28 L48 34 M52 28 L56 34" stroke="#cc2200" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Belly scales */}
      <path d="M48 80 Q80 80 85 60 Q90 40 70 30" stroke="rgba(180,220,60,0.3)" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {/* Egyptian eye on hood */}
      <path d="M42 14 Q52 10 62 14" stroke="#ffd700" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(100,163,15,0.3)" strokeWidth="1"/>
    </svg>
  ),

  VASE: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}vbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#100a00"/><stop offset="100%" stopColor="#040300"/>
        </linearGradient>
        <linearGradient id={`${uid}vjar`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="30%" stopColor="#f59e0b"/>
          <stop offset="65%" stopColor="#d97706"/>
          <stop offset="100%" stopColor="#92400e"/>
        </linearGradient>
        <linearGradient id={`${uid}vshine`} x1="10%" y1="5%" x2="40%" y2="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)"/>
          <stop offset="70%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <linearGradient id={`${uid}vgold`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd700"/>
          <stop offset="100%" stopColor="#c8960c"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}vbg)`} stroke="#c8960c20" strokeWidth="1.5"/>
      {/* Shadow */}
      <ellipse cx="50" cy="84" rx="22" ry="6" fill="rgba(0,0,0,0.4)"/>
      {/* Jar body — canopic jar shape */}
      <path d="M38 20 Q32 24 30 40 L28 68 Q28 78 38 82 L58 82 Q68 78 68 68 L66 40 Q64 24 58 20 Z" fill={`url(#${uid}vjar)`} stroke="#f59e0b" strokeWidth="1"/>
      {/* Shine */}
      <path d="M38 20 Q32 24 30 40 L28 56 Q32 50 38 44 L42 20 Z" fill={`url(#${uid}vshine)`}/>
      {/* Hieroglyphic band */}
      <rect x="28" y="45" width="40" height="12" rx="2" fill="rgba(0,0,0,0.2)" stroke="#c8960c" strokeWidth="0.8"/>
      {/* Eye of Ra on jar */}
      <path d="M32 51 Q48 46 64 51 Q48 56 32 51Z" fill="rgba(212,160,23,0.3)"/>
      <ellipse cx="48" cy="51" rx="5" ry="4" fill="#c8960c"/>
      <circle cx="48" cy="51" r="2.5" fill="#1a0a00"/>
      <circle cx="47" cy="50" r="1.2" fill="rgba(255,255,255,0.5)"/>
      {/* Lid */}
      <ellipse cx="48" cy="20" rx="16" ry="7" fill={`url(#${uid}vgold)`} stroke="#ffd700" strokeWidth="0.8"/>
      {/* Anubis head lid */}
      <ellipse cx="48" cy="14" rx="10" ry="7" fill="#1a1a1a" stroke="#c8960c" strokeWidth="0.8"/>
      {/* Lid ears */}
      <path d="M40 12 L34 4 L40 9Z" fill="#1a1a1a" stroke="#c8960c" strokeWidth="0.5"/>
      <path d="M56 12 L62 4 L56 9Z" fill="#1a1a1a" stroke="#c8960c" strokeWidth="0.5"/>
      {/* Neck band */}
      <rect x="32" y="19" width="32" height="4" rx="2" fill={`url(#${uid}vgold)`} stroke="#ffd700" strokeWidth="0.5"/>
      {/* Handle rings */}
      <ellipse cx="28" cy="56" rx="4" ry="8" fill="none" stroke={`url(#${uid}vgold)`} strokeWidth="2"/>
      <ellipse cx="68" cy="56" rx="4" ry="8" fill="none" stroke={`url(#${uid}vgold)`} strokeWidth="2"/>
      {/* Base ring */}
      <rect x="30" y="80" width="36" height="5" rx="2" fill={`url(#${uid}vgold)`} stroke="#ffd700" strokeWidth="0.5"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(200,150,12,0.3)" strokeWidth="1"/>
    </svg>
  ),

  WILD: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}ewbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#100a00"/><stop offset="100%" stopColor="#050300"/>
        </linearGradient>
        <linearGradient id={`${uid}ewcart`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="40%" stopColor="#ffd700"/>
          <stop offset="100%" stopColor="#b8860b"/>
        </linearGradient>
        <filter id={`${uid}ewGlow`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}ewbg)`} stroke="#c8960c25" strokeWidth="1.5"/>
      {/* Cartouche — Egyptian oval frame */}
      <rect x="10" y="22" width="76" height="52" rx="26" fill="none" stroke={`url(#${uid}ewcart)`} strokeWidth="5"/>
      <rect x="14" y="26" width="68" height="44" rx="22" fill="rgba(212,160,23,0.08)"/>
      {/* Cap lines (cartouche ends) */}
      <rect x="7" y="32" width="5" height="32" rx="2" fill={`url(#${uid}ewcart)`}/>
      <rect x="84" y="32" width="5" height="32" rx="2" fill={`url(#${uid}ewcart)`}/>
      {/* Hieroglyphic decorations above/below text */}
      <path d="M24 32 L72 32" stroke="#c8960c" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      <path d="M24 64 L72 64" stroke="#c8960c" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      {/* WILD text */}
      <text x="48" y="54"
        textAnchor="middle"
        fontSize="18"
        fontWeight="900"
        fontFamily="'Arial Black', sans-serif"
        fill="#ffd700"
        stroke="#8b6914"
        strokeWidth="1"
        filter={`url(#${uid}ewGlow)`}
        letterSpacing="1.5"
      >WILD</text>
      {/* Eye of Ra icon */}
      <path d="M30 14 Q48 8 66 14 Q48 20 30 14Z" fill="#c8960c" opacity="0.6"/>
      <ellipse cx="48" cy="14" rx="5" ry="3.5" fill="#ffd700" opacity="0.7"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(200,150,12,0.35)" strokeWidth="1"/>
    </svg>
  ),

  SCATTER: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}espbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#100a00"/><stop offset="100%" stopColor="#040300"/>
        </linearGradient>
        <linearGradient id={`${uid}esppyr`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="40%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#78350f"/>
        </linearGradient>
        <linearGradient id={`${uid}espshine`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)"/>
          <stop offset="60%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id={`${uid}espGlow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}espbg)`} stroke="#c8960c20" strokeWidth="1.5"/>
      {/* Sun/sky glow */}
      <circle cx="48" cy="28" r="14" fill="rgba(255,200,50,0.15)" filter={`url(#${uid}espGlow)`}/>
      {/* Sun disc */}
      <circle cx="48" cy="28" r="10" fill="#ff8800" stroke="#ffd700" strokeWidth="1.5"/>
      {/* Sun rays */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((d,i) => {
        const r=d*Math.PI/180, x1=48+11*Math.cos(r), y1=28+11*Math.sin(r), x2=48+17*Math.cos(r), y2=28+17*Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round"/>;
      })}
      <circle cx="47" cy="27" r="4" fill="rgba(255,255,255,0.4)"/>
      {/* Desert floor shadow */}
      <ellipse cx="48" cy="86" rx="34" ry="5" fill="rgba(0,0,0,0.4)"/>
      {/* Great Pyramid */}
      <polygon points="48,42 84,84 12,84" fill={`url(#${uid}esppyr)`} stroke="#f59e0b" strokeWidth="1"/>
      {/* Pyramid shadow face */}
      <polygon points="48,42 84,84 48,84" fill="rgba(0,0,0,0.25)"/>
      {/* Pyramid shine face */}
      <polygon points="48,42 12,84 48,84" fill={`url(#${uid}espshine)`}/>
      {/* Entrance */}
      <path d="M38 84 L44 68 L52 68 L58 84 Z" fill="rgba(0,0,0,0.5)"/>
      {/* Stone rows */}
      {[50,60,70].map((y,i) => (
        <line key={i} x1={12+(i*12)} y1={y} x2={84-(i*12)} y2={y} stroke="rgba(0,0,0,0.15)" strokeWidth="1"/>
      ))}
      {/* SCATTER */}
      <text x="48" y="94"
        textAnchor="middle" fontSize="7.5" fontWeight="700"
        fontFamily="'Arial Black', sans-serif" fill="#ffd700" letterSpacing="1.5"
      >SCATTER</text>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(200,150,12,0.35)" strokeWidth="1"/>
    </svg>
  ),
};
