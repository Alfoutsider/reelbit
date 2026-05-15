"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen } from "lucide-react";
import { SymbolSVG } from "./SymbolSVG";
import { ThemeBackground } from "./ThemeBackground";
import { PaytableModal } from "./PaytableModal";
import type { SlotTheme } from "@/lib/slotTheme";
import { getThemeForModel, MODEL_TO_THEME, type ThemeId } from "@/lib/slotThemes";

// Keep backward-compat import so pages using SymbolId from symbols.ts still compile
import type { SymbolId } from "./symbols";
import type { SpinResult } from "./types";

interface Props {
  model: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  spinResult: SpinResult | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
  theme?: SlotTheme | null;
  customSymbols?: Record<string, string>;
}

const REEL_COUNT_MAP = { Classic3Reel: 3, Standard5Reel: 5, FiveReelFreeSpins: 5 };
const SYMBOL_SIZE = 100;

// Spin pool uses Classic symbols for Classic, otherwise generic mid-tier symbols
const CLASSIC_POOL: SymbolId[] = [
  "SEVEN", "CHERRY", "BELL", "BAR3", "LEMON", "ORANGE",
  "BAR2", "WILD", "BAR1", "CHERRY", "LEMON", "SEVEN",
  "ORANGE", "BAR3", "BELL", "BAR2", "CHERRY", "LEMON",
];

// For non-classic themes we use the theme's symbol IDs as the spin pool
function buildSpinPool(themeId: ThemeId): string[] {
  switch (themeId) {
    case "dragon":
      return ["DRAGON","FIRE_ORB","GEM","SWORD","SHIELD","HELMET","ACE","KING","QUEEN","JACK","TEN","WILD","FIRE_ORB","GEM","SWORD"];
    case "egyptian":
      return ["PHARAOH","EYE_RA","ANUBIS","SCARAB","ANKH","SNAKE","VASE","ACE","KING","QUEEN","JACK","TEN","WILD","SCARAB","ANKH"];
    case "cyber":
      return ["CHIP","BITCOIN","LIGHTNING","SHIELD_CYBER","CIRCUIT","ACE","KING","QUEEN","JACK","TEN","WILD","CHIP","BITCOIN","LIGHTNING"];
    default:
      return CLASSIC_POOL as unknown as string[];
  }
}

// Payline definitions mirrored from game-server
const PAYLINES_3REEL: number[][] = [[1, 1, 1]];
const PAYLINES_5REEL: number[][] = [
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [1,0,0,0,1],[1,2,2,2,1],[0,0,1,2,2],[2,2,1,0,0],[1,1,0,1,1],
  [1,1,2,1,1],[0,1,1,1,0],[2,1,1,1,2],[0,0,2,0,0],[2,2,0,2,2],
  [1,0,1,2,1],[1,2,1,0,1],[0,2,0,2,0],[2,0,2,0,2],[1,0,2,0,1],
];

function getWinCells(result: SpinResult | null, is5reel: boolean): Set<string> {
  const cells = new Set<string>();
  if (!result || result.winLines.length === 0) return cells;
  const paylines = is5reel ? PAYLINES_5REEL : PAYLINES_3REEL;
  result.winLines.forEach((wl) => {
    const payline = paylines[wl.paylineIndex];
    if (!payline) return;
    payline.forEach((row, reel) => cells.add(`${reel}-${row}`));
  });
  return cells;
}

// ── Reel component ─────────────────────────────────────────────────────────────

interface ReelProps {
  reelIndex:    number;
  symbols:      string[];
  spinning:     boolean;
  stopDelay:    number;
  winCells:     Set<string>;
  onStop:       () => void;
  customSymbols?: Record<string, string>;
  themeId:      ThemeId;
  spinPool:     string[];
}

function Reel({ reelIndex, symbols, spinning, stopDelay, winCells, onStop, customSymbols, themeId, spinPool }: ReelProps) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "stopping" | "settled">("idle");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (spinning) {
      setPhase("spinning");
    } else if (phaseRef.current === "spinning") {
      const t = setTimeout(() => {
        setPhase("stopping");
        setTimeout(() => {
          setPhase("settled");
          onStop();
        }, 300);
      }, stopDelay);
      return () => clearTimeout(t);
    }
  }, [spinning, stopDelay, onStop]);

  const spinStrip = [...spinPool, ...spinPool, ...spinPool];

  return (
    <div
      className="reel-col flex-shrink-0 relative rounded-lg overflow-hidden"
      style={{ width: SYMBOL_SIZE, height: SYMBOL_SIZE * 3 }}
    >
      {/* Spinning strip */}
      {(phase === "spinning" || phase === "stopping") && (
        <div className="absolute inset-0" style={{ filter: phase === "stopping" ? "blur(1.5px)" : "blur(4px)", opacity: 0.82 }}>
          <motion.div
            animate={phase === "spinning" ? { y: [0, -SYMBOL_SIZE * 18] } : { y: -SYMBOL_SIZE * 18 }}
            transition={
              phase === "spinning"
                ? { duration: 0.55, repeat: Infinity, ease: "linear" }
                : { duration: 0.22, ease: "easeOut" }
            }
          >
            {spinStrip.map((sym, i) => (
              <div key={i} style={{ width: SYMBOL_SIZE, height: SYMBOL_SIZE, flexShrink: 0 }}>
                <SymbolSVG id={sym} size={SYMBOL_SIZE} theme={themeId} customSvg={customSymbols?.[sym]}/>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Settled symbols */}
      {(phase === "settled" || phase === "idle") && symbols.map((sym, row) => {
        const isWin = winCells.has(`${reelIndex}-${row}`);
        return (
          <motion.div
            key={`${reelIndex}-${row}-${sym}`}
            initial={phase === "settled" ? { y: -SYMBOL_SIZE * 0.4, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 480, damping: 26, delay: row * 0.035 }}
            style={{ position: "absolute", top: row * SYMBOL_SIZE, left: 0 }}
            className={isWin ? "symbol-win" : undefined}
          >
            <SymbolSVG id={sym} size={SYMBOL_SIZE} highlighted={isWin} theme={themeId} customSvg={customSymbols?.[sym]}/>

            {/* Win cell glow border */}
            {isWin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.6, 1] }}
                transition={{ duration: 0.4 }}
                className="absolute inset-1 rounded-lg pointer-events-none"
                style={{ border: "2px solid rgba(255,215,0,0.75)", boxShadow: "inset 0 0 14px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.2)" }}
              />
            )}
          </motion.div>
        );
      })}

      {/* Top/bottom fade masks */}
      <div className="absolute top-0 left-0 right-0 h-10 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(6,6,20,0.92), transparent)" }}/>
      <div className="absolute bottom-0 left-0 right-0 h-10 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(6,6,20,0.92), transparent)" }}/>
    </div>
  );
}

// ── Win line readout ───────────────────────────────────────────────────────────

function WinLineDisplay({ result }: { result: SpinResult }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const lines = result.winLines;

  useEffect(() => {
    if (lines.length <= 1) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % lines.length), 750);
    return () => clearInterval(t);
  }, [lines.length]);

  if (!lines.length) return null;
  const active = lines[activeIdx];
  if (!active) return null;
  const topMult = Math.max(...lines.map((l) => l.multiplier));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        className="flex items-center gap-3"
      >
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-500/40"/>
        <div className="flex items-center gap-2 bg-black/60 border border-yellow-500/30 rounded-full px-4 py-1.5">
          <span className="font-orbitron text-[10px] font-bold text-yellow-400/70">LINE {active.paylineIndex + 1}</span>
          <span className="w-px h-3 bg-white/10"/>
          <span className="font-orbitron text-sm font-black text-yellow-300">×{topMult}</span>
          {lines.length > 1 && (
            <>
              <span className="w-px h-3 bg-white/10"/>
              <span className="font-orbitron text-[9px] text-white/30">{activeIdx + 1}/{lines.length}</span>
            </>
          )}
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-500/40"/>
      </motion.div>
    </AnimatePresence>
  );
}

// ── SlotMachine ────────────────────────────────────────────────────────────────

export function SlotMachine({ model, spinResult, isSpinning, onSpinComplete, theme, customSymbols }: Props) {
  const themeId: ThemeId = MODEL_TO_THEME[model] ?? "classic";
  const themeConfig = getThemeForModel(model);
  const primary    = theme?.primaryColor ?? themeConfig.cabinet.primary;
  const accent     = theme?.accentColor  ?? themeConfig.cabinet.secondary;
  const reelCount  = REEL_COUNT_MAP[model];
  const is5reel    = model !== "Classic3Reel";
  const prevSpinning = useRef(false);
  const [settled, setSettled]     = useState(false);
  const [winFlash, setWinFlash]   = useState(false);
  const [stoppedReels, setStoppedReels] = useState(0);
  const [paytableOpen, setPaytableOpen] = useState(false);

  const spinPool = buildSpinPool(themeId);

  const reelGrid: string[][] = spinResult?.reels ?? Array.from(
    { length: reelCount },
    (_, r) => {
      const idle = spinPool.slice(0, 3);
      return [idle[r % 3], idle[(r + 1) % 3], idle[(r + 2) % 3]];
    },
  );

  const winCells = settled && spinResult ? getWinCells(spinResult, is5reel) : new Set<string>();

  function stopDelay(reelIdx: number): number { return reelIdx * 220; }
  const lastReelDelay = stopDelay(reelCount - 1) + 380;

  useEffect(() => {
    if (prevSpinning.current && !isSpinning) {
      setSettled(false);
      setStoppedReels(0);
      const t = setTimeout(() => {
        setSettled(true);
        onSpinComplete?.();
        if (spinResult && spinResult.winLines.length > 0) {
          setWinFlash(true);
          setTimeout(() => setWinFlash(false), 800);
        }
      }, lastReelDelay);
      return () => clearTimeout(t);
    }
    prevSpinning.current = isSpinning;
  }, [isSpinning, lastReelDelay, onSpinComplete, spinResult]);

  const handleReelStop = () => setStoppedReels((n) => n + 1);

  const totalWidth   = reelCount * SYMBOL_SIZE + (reelCount - 1) * 8;
  const cabinetWidth = totalWidth + 72;

  return (
    <>
      <div className="flex flex-col items-center gap-0 select-none">

        {/* ── Cabinet top bar ── */}
        <div
          className="relative flex items-center justify-center rounded-t-3xl px-6 py-3.5 overflow-hidden"
          style={{
            width: cabinetWidth,
            background: themeConfig.cabinet.bodyGrad,
            borderTop:    `2px solid ${primary}`,
            borderLeft:   `2px solid ${primary}`,
            borderRight:  `2px solid ${primary}`,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Animated theme background inside header */}
          <div className="absolute inset-0 opacity-30">
            <ThemeBackground theme={themeId}/>
          </div>

          {/* Left diamonds */}
          <div className="absolute left-5 top-1/2 -translate-y-1/2 flex gap-1 z-10">
            {[1, 0.5].map((o, i) => (
              <div key={i} className="text-sm" style={{ color: primary, opacity: o }}>◆</div>
            ))}
          </div>

          {/* Title */}
          <div className="text-center z-10 relative">
            <div
              className="text-base tracking-[0.35em] font-black leading-none"
              style={{ fontFamily: "Orbitron, sans-serif", color: primary, textShadow: `0 0 20px ${primary}aa` }}
            >
              {theme?.status === "ready" ? theme.tokenSymbol : themeConfig.name.toUpperCase()}
            </div>
            <div className="text-[8px] tracking-[0.45em] font-medium mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              {theme?.status === "ready" ? theme.tokenName.toUpperCase() : themeConfig.tagline.toUpperCase()}
            </div>
          </div>

          {/* Right diamonds */}
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex gap-1 z-10">
            {[0.5, 1].map((o, i) => (
              <div key={i} className="text-sm" style={{ color: primary, opacity: o }}>◆</div>
            ))}
          </div>

          {/* Paytable button */}
          <button
            onClick={() => setPaytableOpen(true)}
            className="absolute right-16 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
            title="View Paytable"
          >
            <BookOpen size={12} style={{ color: primary }}/>
          </button>
        </div>

        {/* ── Reel window ── */}
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{
            width: cabinetWidth,
            background: themeConfig.cabinet.reelGrad,
            borderLeft:  `2px solid ${primary}`,
            borderRight: `2px solid ${primary}`,
            padding: "18px 36px",
          }}
        >
          {/* Animated background */}
          <ThemeBackground theme={themeId}/>

          {/* Custom token BG image */}
          {(customSymbols ? theme?.customAssets?.bgImageUrl : theme?.bgImageUrl) && (
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{
                backgroundImage: `url(${customSymbols ? theme?.customAssets?.bgImageUrl : theme?.bgImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.12,
                filter: "blur(2px)",
              }}
            />
          )}

          {/* Accent radial glow */}
          <div
            className="absolute inset-0 pointer-events-none z-[2]"
            style={{ background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${accent}14 0%, transparent 70%)` }}
          />

          {/* Win flash overlay */}
          <AnimatePresence>
            {winFlash && (
              <motion.div
                key="winflash"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.55, 0.2, 0.45, 0] }}
                transition={{ duration: 0.75, times: [0, 0.15, 0.5, 0.75, 1] }}
                className="absolute inset-0 pointer-events-none z-30 rounded-none"
                style={{ background: `radial-gradient(ellipse at center, ${primary}55 0%, transparent 70%)` }}
              />
            )}
          </AnimatePresence>

          {/* Reels */}
          <div className="relative flex gap-[8px] z-10" style={{ height: SYMBOL_SIZE * 3 }}>
            {Array.from({ length: reelCount }, (_, r) => (
              <Reel
                key={r}
                reelIndex={r}
                symbols={reelGrid[r] ?? spinPool.slice(0, 3)}
                spinning={isSpinning}
                stopDelay={stopDelay(r)}
                winCells={winCells}
                onStop={handleReelStop}
                customSymbols={customSymbols}
                themeId={themeId}
                spinPool={spinPool}
              />
            ))}
          </div>

          {/* Center payline guide */}
          <div
            className="absolute inset-x-8 pointer-events-none z-10"
            style={{
              top: 18 + SYMBOL_SIZE,
              height: SYMBOL_SIZE,
              border: `1px solid ${primary}18`,
              borderRadius: 4,
            }}
          />
        </div>

        {/* ── Win line readout ── */}
        <div
          className="px-6 py-2.5"
          style={{
            width: cabinetWidth,
            background: "linear-gradient(180deg, #0e0e24 0%, #080818 100%)",
            borderLeft:   `2px solid ${primary}`,
            borderRight:  `2px solid ${primary}`,
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            minHeight: 44,
          }}
        >
          {settled && spinResult && spinResult.winLines.length > 0 ? (
            <WinLineDisplay result={spinResult}/>
          ) : (
            <div className="flex items-center justify-between text-[9px] font-orbitron text-white/15 tracking-widest">
              <span>{model === "Classic3Reel" ? "1 LINE" : "20 LINES"}</span>
              <span>PROVABLY FAIR</span>
              <span>{reelCount} REELS</span>
            </div>
          )}
        </div>

        {/* ── Cabinet bottom ── */}
        <div
          className="rounded-b-3xl px-6 py-2"
          style={{
            width: cabinetWidth,
            background: "linear-gradient(180deg, #080818 0%, #050510 100%)",
            borderBottom: `2px solid ${primary}`,
            borderLeft:   `2px solid ${primary}`,
            borderRight:  `2px solid ${primary}`,
          }}
        >
          {/* LED strip */}
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: primary }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Paytable modal */}
      <PaytableModal
        open={paytableOpen}
        onClose={() => setPaytableOpen(false)}
        theme={themeConfig}
      />
    </>
  );
}
