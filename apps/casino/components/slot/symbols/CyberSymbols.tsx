// Cyber Megaways slot symbols — studio-quality illustrated SVGs

import type { JSX } from "react";

type Renderer = (uid: string, size: number, filter: string) => JSX.Element;

export const CYBER_SYMBOLS: Record<string, Renderer> = {

  CHIP: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}chbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#000d1a"/><stop offset="100%" stopColor="#00030a"/>
        </linearGradient>
        <linearGradient id={`${uid}chbody`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a5f"/>
          <stop offset="50%" stopColor="#0f2040"/>
          <stop offset="100%" stopColor="#061020"/>
        </linearGradient>
        <linearGradient id={`${uid}chneon`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff"/>
          <stop offset="100%" stopColor="#0088ff"/>
        </linearGradient>
        <filter id={`${uid}chGlow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}chbg)`} stroke="#00e5ff20" strokeWidth="1.5"/>
      {/* Chip body */}
      <rect x="22" y="22" width="52" height="52" rx="6" fill={`url(#${uid}chbody)`} stroke={`url(#${uid}chneon)`} strokeWidth="1.5"/>
      {/* Circuit grid inside */}
      {[30,38,46,54,62].map(x => (
        <line key={x} x1={x} y1="28" x2={x} y2="68" stroke="#00e5ff18" strokeWidth="1"/>
      ))}
      {[30,38,46,54,62].map(y => (
        <line key={y} x1="28" y1={y} x2="68" y2={y} stroke="#00e5ff18" strokeWidth="1"/>
      ))}
      {/* Traces */}
      <path d="M28 46 L22 46" stroke={`url(#${uid}chneon)`} strokeWidth="2" strokeLinecap="round"/>
      <path d="M74 46 L80 46" stroke={`url(#${uid}chneon)`} strokeWidth="2" strokeLinecap="round"/>
      <path d="M48 28 L48 22" stroke={`url(#${uid}chneon)`} strokeWidth="2" strokeLinecap="round"/>
      <path d="M48 68 L48 74" stroke={`url(#${uid}chneon)`} strokeWidth="2" strokeLinecap="round"/>
      {/* Pin grid — top */}
      {[32,40,48,56,64].map((x,i) => (
        <rect key={i} x={x-3} y="6" width="6" height="14" rx="2" fill={`url(#${uid}chneon)`} opacity="0.7" filter={`url(#${uid}chGlow)`}/>
      ))}
      {/* Pin grid — bottom */}
      {[32,40,48,56,64].map((x,i) => (
        <rect key={i} x={x-3} y="76" width="6" height="14" rx="2" fill={`url(#${uid}chneon)`} opacity="0.7" filter={`url(#${uid}chGlow)`}/>
      ))}
      {/* Pin grid — left */}
      {[32,40,48,56,64].map((y,i) => (
        <rect key={i} x="6" y={y-3} width="14" height="6" rx="2" fill={`url(#${uid}chneon)`} opacity="0.7" filter={`url(#${uid}chGlow)`}/>
      ))}
      {/* Pin grid — right */}
      {[32,40,48,56,64].map((y,i) => (
        <rect key={i} x="76" y={y-3} width="14" height="6" rx="2" fill={`url(#${uid}chneon)`} opacity="0.7" filter={`url(#${uid}chGlow)`}/>
      ))}
      {/* Core die */}
      <rect x="32" y="32" width="32" height="32" rx="4" fill="#00e5ff18" stroke="#00e5ff" strokeWidth="1" filter={`url(#${uid}chGlow)`}/>
      {/* Core text */}
      <text x="48" y="53" textAnchor="middle" fontSize="11" fontWeight="900"
        fontFamily="'Courier New', monospace" fill="#00e5ff" filter={`url(#${uid}chGlow)`}>AI</text>
      {/* Shine */}
      <rect x="22" y="22" width="52" height="52" rx="6" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1"/>
    </svg>
  ),

  BITCOIN: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}btbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d0800"/><stop offset="100%" stopColor="#040300"/>
        </linearGradient>
        <radialGradient id={`${uid}btring`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff9f40"/>
          <stop offset="50%" stopColor="#f7931a"/>
          <stop offset="100%" stopColor="#8b4f00"/>
        </radialGradient>
        <filter id={`${uid}btGlow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}btbg)`} stroke="#f7931a25" strokeWidth="1.5"/>
      {/* Outer ring glow */}
      <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(247,147,26,0.15)" strokeWidth="4" filter={`url(#${uid}btGlow)`}/>
      {/* Main circle */}
      <circle cx="48" cy="48" r="34" fill={`url(#${uid}btring)`} stroke="#ff9f40" strokeWidth="1.5"/>
      {/* Inner dark circle */}
      <circle cx="48" cy="48" r="26" fill="#3a1800"/>
      {/* Bitcoin B symbol */}
      <text x="50" y="63"
        textAnchor="middle"
        fontSize="38"
        fontWeight="900"
        fontFamily="'Arial Black', sans-serif"
        fill="#f7931a"
        filter={`url(#${uid}btGlow)`}
        transform="rotate(12 50 48)"
      >₿</text>
      {/* Neon ring segments */}
      {[0,45,90,135,180,225,270,315].map((d,i) => {
        const r=d*Math.PI/180, x1=48+30*Math.cos(r), y1=48+30*Math.sin(r), x2=48+34*Math.cos(r), y2=48+34*Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.6" filter={`url(#${uid}btGlow)`}/>;
      })}
      {/* Shine */}
      <ellipse cx="36" cy="34" rx="12" ry="8" fill="rgba(255,255,255,0.18)" transform="rotate(-30 36 34)"/>
      <ellipse cx="36" cy="34" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-30 36 34)"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(247,147,26,0.3)" strokeWidth="1"/>
    </svg>
  ),

  LIGHTNING: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}ltbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06001a"/><stop offset="100%" stopColor="#020008"/>
        </linearGradient>
        <linearGradient id={`${uid}ltbolt`} x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="20%" stopColor="#e0f0ff"/>
          <stop offset="55%" stopColor="#00ccff"/>
          <stop offset="100%" stopColor="#0044cc"/>
        </linearGradient>
        <filter id={`${uid}ltGlow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}ltbg)`} stroke="#00ccff20" strokeWidth="1.5"/>
      {/* Glow aura */}
      <polygon points="54,6 36,46 52,46 42,90 60,46 44,46" fill="rgba(0,200,255,0.15)" filter={`url(#${uid}ltGlow)`}/>
      {/* Electric arcs / branch lightning */}
      <path d="M52 28 Q62 32 58 40" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M48 52 Q60 54 56 62" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.4"/>
      <path d="M44 36 Q34 38 38 46" stroke="#00e5ff" strokeWidth="1" fill="none" opacity="0.45"/>
      {/* Main bolt shadow */}
      <polygon points="56,8 38,48 54,48 44,92 62,48 46,48" fill="rgba(0,0,0,0.4)"/>
      {/* Main bolt */}
      <polygon points="54,6 36,46 52,46 42,90 60,46 44,46" fill={`url(#${uid}ltbolt)`} filter={`url(#${uid}ltGlow)`}/>
      {/* Inner bright core */}
      <polygon points="50,14 40,46 50,46 44,80 56,46 46,46" fill="rgba(255,255,255,0.25)"/>
      {/* Sparkle points */}
      {[{x:30,y:20},{x:68,y:28},{x:22,y:60},{x:74,y:65}].map((p,i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2.5" fill="#00e5ff" filter={`url(#${uid}ltGlow)`} opacity="0.7"/>
          <line x1={p.x-4} y1={p.y} x2={p.x+4} y2={p.y} stroke="#00e5ff" strokeWidth="1" opacity="0.5"/>
          <line x1={p.x} y1={p.y-4} x2={p.x} y2={p.y+4} stroke="#00e5ff" strokeWidth="1" opacity="0.5"/>
        </g>
      ))}
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(0,204,255,0.35)" strokeWidth="1"/>
    </svg>
  ),

  SHIELD_CYBER: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}cshbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#000d14"/><stop offset="100%" stopColor="#000408"/>
        </linearGradient>
        <linearGradient id={`${uid}cshbody`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f3a5f"/>
          <stop offset="50%" stopColor="#072040"/>
          <stop offset="100%" stopColor="#041020"/>
        </linearGradient>
        <linearGradient id={`${uid}cshneon`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <filter id={`${uid}cshGlow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}cshbg)`} stroke="#00e5ff20" strokeWidth="1.5"/>
      {/* Shield shadow */}
      <path d="M50 8 L86 20 L86 52 Q86 76 50 90 Q14 76 14 52 L14 20 Z" fill="rgba(0,0,0,0.35)"/>
      {/* Shield body */}
      <path d="M48 6 L84 18 L84 50 Q84 74 48 88 Q12 74 12 50 L12 18 Z" fill={`url(#${uid}cshbody)`}/>
      {/* Neon rim */}
      <path d="M48 6 L84 18 L84 50 Q84 74 48 88 Q12 74 12 50 L12 18 Z" fill="none" stroke={`url(#${uid}cshneon)`} strokeWidth="2.5" filter={`url(#${uid}cshGlow)`}/>
      {/* Hex grid pattern */}
      {[{x:30,y:30},{x:48,y:24},{x:66,y:30},{x:22,y:48},{x:40,y:48},{x:56,y:48},{x:74,y:48},{x:30,y:66},{x:48,y:66},{x:66,y:66}].map((p,i) => (
        <polygon key={i} points={`${p.x},${p.y-5} ${p.x+4},${p.y-2} ${p.x+4},${p.y+2} ${p.x},${p.y+5} ${p.x-4},${p.y+2} ${p.x-4},${p.y-2}`}
          fill="none" stroke="#00e5ff14" strokeWidth="1"/>
      ))}
      {/* Lock icon */}
      <rect x="38" y="46" width="20" height="18" rx="4" fill="#00e5ff18" stroke={`url(#${uid}cshneon)`} strokeWidth="1.5" filter={`url(#${uid}cshGlow)`}/>
      <path d="M38 46 Q38 34 48 34 Q58 34 58 46" fill="none" stroke={`url(#${uid}cshneon)`} strokeWidth="2.5" strokeLinecap="round" filter={`url(#${uid}cshGlow)`}/>
      <circle cx="48" cy="55" r="3.5" fill="#00e5ff" filter={`url(#${uid}cshGlow)`}/>
      <rect x="46.5" y="55" width="3" height="5" rx="1" fill="#00e5ff"/>
      {/* Corner nodes */}
      {[{x:12,y:18},{x:84,y:18},{x:12,y:74},{x:84,y:74}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#00e5ff" filter={`url(#${uid}cshGlow)`} opacity="0.7"/>
      ))}
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1"/>
    </svg>
  ),

  CIRCUIT: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}crbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#040d00"/><stop offset="100%" stopColor="#010500"/>
        </linearGradient>
        <linearGradient id={`${uid}crtrace`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ff88"/>
          <stop offset="100%" stopColor="#00cc66"/>
        </linearGradient>
        <filter id={`${uid}crGlow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}crbg)`} stroke="#00ff8820" strokeWidth="1.5"/>
      {/* Board background */}
      <rect x="8" y="8" width="80" height="80" rx="8" fill="#0a1a0a" stroke="#00ff8810" strokeWidth="1"/>
      {/* Circuit traces — horizontal */}
      <path d="M10 25 L30 25 L36 31 L56 31 L62 25 L86 25" stroke={`url(#${uid}crtrace)`} strokeWidth="2" fill="none" filter={`url(#${uid}crGlow)`} strokeLinecap="round"/>
      <path d="M10 48 L20 48 L26 54 L46 54 L52 48 L70 48 L76 54 L86 54" stroke={`url(#${uid}crtrace)`} strokeWidth="2" fill="none" filter={`url(#${uid}crGlow)`} strokeLinecap="round"/>
      <path d="M10 71 L34 71 L40 65 L56 65 L62 71 L86 71" stroke={`url(#${uid}crtrace)`} strokeWidth="2" fill="none" filter={`url(#${uid}crGlow)`} strokeLinecap="round"/>
      {/* Circuit traces — vertical */}
      <path d="M28 10 L28 25 M28 25 L28 48" stroke={`url(#${uid}crtrace)`} strokeWidth="1.5" fill="none" filter={`url(#${uid}crGlow)`}/>
      <path d="M60 10 L60 25 M60 54 L60 71 M60 71 L60 86" stroke={`url(#${uid}crtrace)`} strokeWidth="1.5" fill="none" filter={`url(#${uid}crGlow)`}/>
      <path d="M42 31 L42 48 M44 54 L44 65" stroke={`url(#${uid}crtrace)`} strokeWidth="1.5" fill="none" filter={`url(#${uid}crGlow)`}/>
      {/* Components */}
      <rect x="24" y="38" width="20" height="10" rx="2" fill="#0a1a0a" stroke="#00ff88" strokeWidth="1.2" filter={`url(#${uid}crGlow)`}/>
      <text x="34" y="46" textAnchor="middle" fontSize="5" fill="#00ff88" fontFamily="monospace">R1</text>
      <rect x="52" y="60" width="20" height="10" rx="2" fill="#0a1a0a" stroke="#00ff88" strokeWidth="1.2" filter={`url(#${uid}crGlow)`}/>
      <text x="62" y="68" textAnchor="middle" fontSize="5" fill="#00ff88" fontFamily="monospace">C2</text>
      {/* IC chip */}
      <rect x="34" y="20" width="24" height="14" rx="2" fill="#0f2010" stroke="#00ff88" strokeWidth="1.5" filter={`url(#${uid}crGlow)`}/>
      {[37,41,45,49,53].map((x,i) => (
        <line key={i} x1={x} y1="20" x2={x} y2="16" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
      ))}
      {[37,41,45,49,53].map((x,i) => (
        <line key={i} x1={x} y1="34" x2={x} y2="38" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
      ))}
      {/* Nodes/vias */}
      {[{x:28,y:48},{x:44,y:54},{x:60,y:71},{x:42,y:31}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#00ff88" stroke="#00cc66" strokeWidth="0.8" filter={`url(#${uid}crGlow)`}/>
      ))}
      {/* Scanning line effect */}
      <line x1="8" y1="8" x2="88" y2="8" stroke="rgba(0,255,136,0.1)" strokeWidth="1"/>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(0,255,136,0.25)" strokeWidth="1"/>
    </svg>
  ),

  WILD: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}cwbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#08001a"/><stop offset="100%" stopColor="#020008"/>
        </linearGradient>
        <linearGradient id={`${uid}cwgrd`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff"/>
          <stop offset="50%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#e879f9"/>
        </linearGradient>
        <filter id={`${uid}cwGlow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id={`${uid}cwGlitch`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" result="displaced"/>
          <feMerge><feMergeNode in="displaced"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}cwbg)`} stroke="#7c3aed25" strokeWidth="1.5"/>
      {/* Holographic hex frame */}
      <polygon points="48,6 82,24 82,72 48,90 14,72 14,24"
        fill="none" stroke={`url(#${uid}cwgrd)`} strokeWidth="2" filter={`url(#${uid}cwGlow)`}/>
      <polygon points="48,12 78,28 78,68 48,84 18,68 18,28"
        fill="rgba(124,58,237,0.06)"/>
      {/* Scan lines */}
      {[20,28,36,44,52,60,68,76].map((y,i) => (
        <line key={i} x1="14" y1={y} x2="82" y2={y} stroke={`url(#${uid}cwgrd)`} strokeWidth="0.4" opacity="0.25"/>
      ))}
      {/* Glitch slices */}
      <rect x="20" y="38" width="56" height="4" rx="1" fill="rgba(0,229,255,0.08)" filter={`url(#${uid}cwGlitch)`}/>
      <rect x="20" y="56" width="56" height="3" rx="1" fill="rgba(232,121,249,0.06)" filter={`url(#${uid}cwGlitch)`}/>
      {/* WILD main text */}
      <text x="48" y="58"
        textAnchor="middle"
        fontSize="22"
        fontWeight="900"
        fontFamily="'Arial Black', sans-serif"
        fill={`url(#${uid}cwgrd)`}
        filter={`url(#${uid}cwGlow)`}
        letterSpacing="2"
      >WILD</text>
      {/* Shadow text for depth */}
      <text x="49.5" y="59.5"
        textAnchor="middle"
        fontSize="22"
        fontWeight="900"
        fontFamily="'Arial Black', sans-serif"
        fill="rgba(232,121,249,0.3)"
        letterSpacing="2"
      >WILD</text>
      {/* Neon corner dots */}
      {[{x:14,y:24},{x:82,y:24},{x:14,y:72},{x:82,y:72}].map((p,i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#00e5ff" filter={`url(#${uid}cwGlow)`} opacity="0.8"/>
      ))}
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(124,58,237,0.3)" strokeWidth="1"/>
    </svg>
  ),

  SCATTER: (uid, size, filter) => (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ filter }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}cysbg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#060010"/><stop offset="100%" stopColor="#020005"/>
        </linearGradient>
        <radialGradient id={`${uid}cyscore`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="30%" stopColor="#00e5ff"/>
          <stop offset="70%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#1a0040"/>
        </radialGradient>
        <filter id={`${uid}cysGlow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="3" y="3" width="90" height="90" rx="14" fill={`url(#${uid}cysbg)`} stroke="#7c3aed20" strokeWidth="1.5"/>
      {/* Binary rings */}
      <circle cx="48" cy="48" r="38" fill="none" stroke="#00e5ff" strokeWidth="1" strokeDasharray="4,6" opacity="0.4"/>
      <circle cx="48" cy="48" r="30" fill="none" stroke="#7c3aed" strokeWidth="1" strokeDasharray="3,5" opacity="0.35"/>
      <circle cx="48" cy="48" r="22" fill="none" stroke="#00e5ff" strokeWidth="1" strokeDasharray="2,4" opacity="0.3"/>
      {/* Binary bits around ring */}
      {[0,20,40,60,80,100,120,140,160,180,200,220,240,260,280,300,320,340].map((d,i) => {
        const r=d*Math.PI/180, x=48+35*Math.cos(r), y=48+35*Math.sin(r);
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="5" fill="#00e5ff" fontFamily="monospace" opacity="0.5">{i%2}</text>;
      })}
      {/* Core data burst */}
      <circle cx="48" cy="48" r="18" fill={`url(#${uid}cyscore)`} filter={`url(#${uid}cysGlow)`}/>
      {/* Core inner dark */}
      <circle cx="48" cy="48" r="12" fill="#0a0020"/>
      {/* Burst rays */}
      {[0,45,90,135,180,225,270,315].map((d,i) => {
        const r=d*Math.PI/180, x1=48+13*Math.cos(r), y1=48+13*Math.sin(r), x2=48+22*Math.cos(r), y2=48+22*Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" filter={`url(#${uid}cysGlow)`} opacity="0.8"/>;
      })}
      {/* Center symbol */}
      <text x="48" y="52" textAnchor="middle" fontSize="10" fontWeight="900"
        fontFamily="monospace" fill="#00e5ff" filter={`url(#${uid}cysGlow)`}>{'</>'}</text>
      {/* SCATTER label */}
      <text x="48" y="91"
        textAnchor="middle" fontSize="7.5" fontWeight="700"
        fontFamily="'Arial Black', sans-serif" fill="#00e5ff" letterSpacing="1.5"
      >SCATTER</text>
      {/* Border */}
      <rect x="3" y="3" width="90" height="90" rx="14" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1"/>
    </svg>
  ),
};
