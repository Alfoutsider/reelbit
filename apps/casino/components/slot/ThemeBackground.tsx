"use client";

// Animated CSS-only backgrounds for each slot theme.
// Layered parallax: sky → particles → mid-ground elements → foreground details.
// No canvas, no external deps — pure CSS keyframes injected via style tag.

import { useEffect, type JSX, type CSSProperties } from "react";
import type { ThemeId } from "@/lib/slotThemes";

const CSS = `
@keyframes rb-float-up {
  0%   { transform: translateY(0) translateX(0) scale(1); opacity:0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(-110vh) translateX(var(--drift,20px)) scale(0.5); opacity: 0; }
}
@keyframes rb-ember {
  0%   { transform: translate(0,0) scale(1); opacity:0; }
  8%   { opacity: 0.9; }
  92%  { opacity: 0.4; }
  100% { transform: translate(var(--ex,30px), -120px) scale(0.3); opacity:0; }
}
@keyframes rb-sand-drift {
  0%   { transform: translateX(-10px) translateY(0); opacity:0; }
  15%  { opacity:0.6; }
  85%  { opacity:0.3; }
  100% { transform: translateX(110px) translateY(var(--sy,-8px)); opacity:0; }
}
@keyframes rb-data-stream {
  0%   { transform: translateY(-100%); opacity: 0; }
  5%   { opacity: 0.7; }
  95%  { opacity: 0.2; }
  100% { transform: translateY(200%); opacity: 0; }
}
@keyframes rb-star-twinkle {
  0%,100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.4); }
}
@keyframes rb-gold-shimmer {
  0%,100% { opacity: 0.15; }
  50%      { opacity: 0.35; }
}
@keyframes rb-pulse-ring {
  0%   { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(2);   opacity: 0; }
}
@keyframes rb-neon-flicker {
  0%,100% { opacity:1; }
  2%       { opacity:0.8; }
  4%       { opacity:1; }
  50%      { opacity:0.95; }
  52%      { opacity:0.6; }
  54%      { opacity:1; }
}
`;

let cssInjected = false;
function injectCss() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const el = document.createElement("style");
  el.textContent = CSS;
  document.head.appendChild(el);
}

// ── Particle generator ────────────────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  opacity: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 2 + Math.random() * 5,
    delay: Math.random() * 8,
    duration: 4 + Math.random() * 8,
    drift: (Math.random() - 0.5) * 60,
    opacity: 0.4 + Math.random() * 0.6,
  }));
}

// ── Classic Vegas Background ──────────────────────────────────────────────────

function ClassicBackground() {
  const stars = generateParticles(20);
  const diamonds = [
    { x: 12, y: 15, size: 18, rot: 45 }, { x: 85, y: 20, size: 14, rot: 45 },
    { x: 5,  y: 60, size: 12, rot: 45 }, { x: 90, y: 65, size: 16, rot: 45 },
    { x: 48, y: 8,  size: 20, rot: 45 }, { x: 20, y: 85, size: 10, rot: 45 },
    { x: 78, y: 80, size: 12, rot: 45 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep velvet background */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, #1a0f00 0%, #0d0700 60%, #030200 100%)" }}/>
      {/* Gold dust particles */}
      {stars.map(p => (
        <div key={p.id} className="absolute rounded-full" style={{
          left: `${p.x}%`,
          bottom: "-10px",
          width: `${p.size * 0.6}px`,
          height: `${p.size * 0.6}px`,
          background: `radial-gradient(circle, #ffd700, #d4a017)`,
          animation: `rb-float-up ${p.duration}s ${p.delay}s infinite ease-in`,
          "--drift": `${p.drift}px`,
          opacity: p.opacity,
        } as CSSProperties}/>
      ))}
      {/* Rotating diamond ornaments */}
      {diamonds.map((d, i) => (
        <div key={i} className="absolute" style={{
          left: `${d.x}%`,
          top: `${d.y}%`,
          width: d.size,
          height: d.size,
          transform: `rotate(${d.rot}deg)`,
          background: "linear-gradient(135deg, rgba(212,160,23,0.3) 0%, rgba(212,160,23,0.05) 100%)",
          border: "1px solid rgba(212,160,23,0.2)",
          animation: `rb-gold-shimmer ${3 + i * 0.7}s ${i * 0.4}s infinite ease-in-out`,
        }}/>
      ))}
      {/* Art deco horizontal lines */}
      <div className="absolute inset-x-0" style={{ top: "8%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.15), transparent)" }}/>
      <div className="absolute inset-x-0" style={{ bottom: "8%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.15), transparent)" }}/>
      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)" }}/>
    </div>
  );
}

// ── Dragon Fire Background ────────────────────────────────────────────────────

function DragonBackground() {
  const embers = generateParticles(28);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Dark crimson sky gradient */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 30%, #2a0a00 0%, #140500 50%, #080200 100%)" }}/>
      {/* Distant mountain silhouette */}
      <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 400 120" preserveAspectRatio="none" height="30%">
        <path d="M0 120 L40 60 L80 90 L120 30 L160 70 L200 20 L240 65 L280 35 L320 80 L360 45 L400 70 L400 120Z"
          fill="#0a0200" opacity="0.9"/>
        <path d="M0 120 L60 80 L100 95 L150 50 L190 80 L230 40 L270 75 L310 55 L350 85 L400 60 L400 120Z"
          fill="#060100" opacity="0.95"/>
      </svg>
      {/* Fire embers rising */}
      {embers.map(p => (
        <div key={p.id} className="absolute" style={{
          left: `${p.x}%`,
          bottom: "10%",
          width: `${p.size}px`,
          height: `${p.size}px`,
          borderRadius: "50% 40% 50% 40%",
          background: `radial-gradient(circle, ${p.id % 3 === 0 ? '#ffdd00' : p.id % 3 === 1 ? '#ff8800' : '#ff4400'}, transparent)`,
          animation: `rb-ember ${p.duration}s ${p.delay}s infinite ease-out`,
          "--ex": `${p.drift}px`,
          opacity: p.opacity,
        } as CSSProperties}/>
      ))}
      {/* Ground fire glow */}
      <div className="absolute bottom-0 left-0 right-0 h-20" style={{
        background: "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(255,80,0,0.2) 0%, transparent 70%)",
      }}/>
      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.65) 100%)" }}/>
    </div>
  );
}

// ── Egyptian Gold Background ──────────────────────────────────────────────────

function EgyptianBackground() {
  const sandMotes = generateParticles(22);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Desert dusk sky */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #1a0c00 0%, #2a1400 40%, #100a00 100%)" }}/>
      {/* Stars */}
      {Array.from({length:15},(_,i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: `${(i * 37 + 13) % 100}%`,
          top: `${(i * 23 + 7) % 40}%`,
          width: `${1 + (i % 3)}px`,
          height: `${1 + (i % 3)}px`,
          background: "#ffd700",
          animation: `rb-star-twinkle ${2 + (i * 0.4) % 3}s ${i * 0.3}s infinite ease-in-out`,
        }}/>
      ))}
      {/* Pyramid silhouette far */}
      <svg className="absolute bottom-0" viewBox="0 0 400 100" preserveAspectRatio="none" width="100%" height="25%">
        <polygon points="60,100 140,20 220,100" fill="#0d0700" opacity="0.8"/>
        <polygon points="200,100 300,30 400,100" fill="#0a0500" opacity="0.85"/>
        <line x1="140" y1="20" x2="140" y2="0" stroke="rgba(255,200,50,0.3)" strokeWidth="2"/>
        {/* Capstone glow */}
        <circle cx="140" cy="20" r="5" fill="rgba(255,200,50,0.4)" />
        <circle cx="300" cy="30" r="4" fill="rgba(255,200,50,0.3)"/>
      </svg>
      {/* Drifting sand particles */}
      {sandMotes.map(p => (
        <div key={p.id} className="absolute" style={{
          left: "-5%",
          top: `${30 + p.x * 0.5}%`,
          width: `${p.size + 2}px`,
          height: `${Math.max(1, p.size * 0.3)}px`,
          borderRadius: "50%",
          background: "rgba(200,150,12,0.5)",
          animation: `rb-sand-drift ${p.duration * 1.5}s ${p.delay}s infinite linear`,
          "--sy": `${p.drift * 0.3}px`,
          opacity: p.opacity * 0.6,
        } as CSSProperties}/>
      ))}
      {/* Hieroglyphic border bands */}
      <div className="absolute inset-x-0 top-0 h-3" style={{ background: "linear-gradient(90deg, rgba(200,150,12,0), rgba(200,150,12,0.1) 20%, rgba(200,150,12,0.2) 50%, rgba(200,150,12,0.1) 80%, rgba(200,150,12,0))" }}/>
      <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: "linear-gradient(90deg, rgba(200,150,12,0), rgba(200,150,12,0.1) 20%, rgba(200,150,12,0.2) 50%, rgba(200,150,12,0.1) 80%, rgba(200,150,12,0))" }}/>
      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 100%)" }}/>
    </div>
  );
}

// ── Cyber Megaways Background ─────────────────────────────────────────────────

function CyberBackground() {
  const streams = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: (i / 16) * 100 + (Math.random() * 4),
    speed: 4 + Math.random() * 6,
    delay: Math.random() * 8,
    opacity: 0.2 + Math.random() * 0.4,
    length: 60 + Math.random() * 120,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep tech space */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, #001428 0%, #000814 60%, #000208 100%)" }}/>
      {/* Data stream columns */}
      {streams.map(s => (
        <div key={s.id} className="absolute" style={{
          left: `${s.x}%`,
          top: 0,
          width: "1px",
          height: `${s.length}px`,
          background: `linear-gradient(180deg, transparent, #00e5ff, #7c3aed, transparent)`,
          animation: `rb-data-stream ${s.speed}s ${s.delay}s infinite linear`,
          opacity: s.opacity,
        }}/>
      ))}
      {/* Neon grid floor */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: "35%",
        backgroundImage: `
          linear-gradient(0deg, rgba(0,229,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "40px 20px",
        maskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
      }}/>
      {/* Hex grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,229,255,0.03) 1px, transparent 0)`,
        backgroundSize: "24px 24px",
      }}/>
      {/* Neon flicker lines */}
      <div className="absolute inset-x-0" style={{ top: "15%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2) 30%, rgba(124,58,237,0.2) 70%, transparent)", animation: "rb-neon-flicker 4s 0.5s infinite" }}/>
      <div className="absolute inset-x-0" style={{ bottom: "15%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.2) 30%, rgba(0,229,255,0.2) 70%, transparent)", animation: "rb-neon-flicker 5s 1.5s infinite" }}/>
      {/* Circuit pulse rings */}
      {[{x:15,y:25},{x:82,y:18},{x:10,y:72},{x:88,y:68}].map((p,i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: `${p.x}%`, top: `${p.y}%`,
          width: "40px", height: "40px",
          border: "1px solid rgba(0,229,255,0.4)",
          transform: "translate(-50%,-50%)",
          animation: `rb-pulse-ring ${2 + i * 0.8}s ${i * 0.6}s infinite ease-out`,
        }}/>
      ))}
      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)" }}/>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

const BG_MAP: Record<ThemeId, () => JSX.Element> = {
  classic:  ClassicBackground,
  dragon:   DragonBackground,
  egyptian: EgyptianBackground,
  cyber:    CyberBackground,
};

interface Props {
  theme: ThemeId;
}

export function ThemeBackground({ theme }: Props) {
  useEffect(() => { injectCss(); }, []);
  const Bg = BG_MAP[theme] ?? BG_MAP.classic;
  return <Bg />;
}
