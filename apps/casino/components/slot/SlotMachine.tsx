"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SymbolSVG } from "./SymbolSVG";
import type { SymbolId } from "./symbols";
import type { SpinResult } from "./types";
import type { SlotTheme } from "@/lib/slotTheme";

interface Props {
  model: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  spinResult: SpinResult | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
  theme?: SlotTheme | null;
}

const REEL_COUNT_MAP = { Classic3Reel: 3, Standard5Reel: 5, FiveReelFreeSpins: 5 };
const SYMBOL_SIZE = 100; // slightly larger than before

const SPIN_POOL: SymbolId[] = [
  "SEVEN", "CHERRY", "BELL", "BAR3", "LEMON", "ORANGE",
  "BAR2", "WILD", "BAR1", "CHERRY", "LEMON", "SEVEN",
  "ORANGE", "BAR3", "BELL", "BAR2", "CHERRY", "LEMON",
];

// Payline definitions mirrored from game-server for correct win-row highlighting
const PAYLINES_3REEL: number[][] = [[1, 1, 1]];
const PAYLINES_5REEL: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [1, 0, 2, 0, 1],
];

// Return the set of winning (reel, row) pairs from all active win lines
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

// ── Reel component ────────────────────────────────────────────────────────────

interface ReelProps {
  reelIndex: number;
  symbols: SymbolId[];
  spinning: boolean;
  stopDelay: number;
  winCells: Set<string>;
  onStop: () => void;
}

function Reel({ reelIndex, symbols, spinning, stopDelay, winCells, onStop }: ReelProps) {
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
        }, 280);
      }, stopDelay);
      return () => clearTimeout(t);
    }
  }, [spinning, stopDelay, onStop]);

  const spinStrip = [...SPIN_POOL, ...SPIN_POOL, ...SPIN_POOL];

  return (
    <div
      className="reel-col flex-shrink-0 relative rounded-lg overflow-hidden"
      style={{ width: SYMBOL_SIZE, height: SYMBOL_SIZE * 3 }}
    >
      {/* Spinning strip */}
      {(phase === "spinning" || phase === "stopping") && (
        <div className="absolute inset-0" style={{ filter: phase === "stopping" ? "blur(1.5px)" : "blur(4px)", opacity: 0.8 }}>
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
                <SymbolSVG id={sym} size={SYMBOL_SIZE} />
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
            <SymbolSVG id={sym} size={SYMBOL_SIZE} highlighted={isWin} />

            {/* Win glow border around winning cell */}
            {isWin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.6, 1] }}
                transition={{ duration: 0.4 }}
                className="absolute inset-1 rounded-lg pointer-events-none"
                style={{ border: "2px solid rgba(255,215,0,0.7)", boxShadow: "inset 0 0 12px rgba(255,215,0,0.25)" }}
              />
            )}
          </motion.div>
        );
      })}

      {/* Top/bottom fade */}
      <div className="absolute top-0 left-0 right-0 h-10 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(8,8,20,0.9), transparent)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-10 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(8,8,20,0.9), transparent)" }} />
    </div>
  );
}

// ── Win line display ──────────────────────────────────────────────────────────

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
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-500/40" />
        <div className="flex items-center gap-2 bg-black/60 border border-yellow-500/30 rounded-full px-4 py-1.5">
          <span className="font-orbitron text-[10px] font-bold text-yellow-400/70">
            LINE {active.paylineIndex + 1}
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span className="font-orbitron text-sm font-black text-yellow-300">×{topMult}</span>
          {lines.length > 1 && (
            <>
              <span className="w-px h-3 bg-white/10" />
              <span className="font-orbitron text-[9px] text-white/30">{activeIdx + 1}/{lines.length}</span>
            </>
          )}
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-500/40" />
      </motion.div>
    </AnimatePresence>
  );
}

// ── SlotMachine ───────────────────────────────────────────────────────────────

export function SlotMachine({ model, spinResult, isSpinning, onSpinComplete, theme }: Props) {
  const primary    = theme?.primaryColor ?? "#d4a017";
  const accent     = theme?.accentColor  ?? "#8b5cf6";
  const reelCount  = REEL_COUNT_MAP[model];
  const is5reel    = model !== "Classic3Reel";
  const prevSpinning = useRef(false);
  const [settled, setSettled]       = useState(false);
  const [winFlash, setWinFlash]     = useState(false);
  const [stoppedReels, setStoppedReels] = useState(0);

  const reelGrid: SymbolId[][] = spinResult?.reels ?? Array.from(
    { length: reelCount },
    (_, r) => {
      const idle: SymbolId[] = ["CHERRY", "BELL", "BAR1"];
      return [idle[r % 3], idle[(r + 1) % 3], idle[(r + 2) % 3]];
    },
  );

  const winCells = settled && spinResult ? getWinCells(spinResult, is5reel) : new Set<string>();

  function stopDelay(reelIdx: number): number {
    return reelIdx * 220;
  }

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

  const totalWidth = reelCount * SYMBOL_SIZE + (reelCount - 1) * 8;
  const cabinetWidth = totalWidth + 72;

  return (
    <div className="flex flex-col items-center gap-0 select-none">

      {/* ── Cabinet top bar ── */}
      <div
        className="relative flex items-center justify-center rounded-t-3xl px-6 py-3.5"
        style={{
          width: cabinetWidth,
          background: "linear-gradient(180deg, #1c1040 0%, #100e28 100%)",
          borderTop: `2px solid ${primary}`,
          borderLeft: `2px solid ${primary}`,
          borderRight: `2px solid ${primary}`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Left diamond */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex gap-1">
          {[1, 0.5].map((o, i) => (
            <div key={i} className="text-sm" style={{ color: primary, opacity: o }}>◆</div>
          ))}
        </div>

        <div className="text-center">
          <div
            className="text-base tracking-[0.35em] font-black leading-none"
            style={{ fontFamily: "Orbitron, sans-serif", color: primary, textShadow: `0 0 20px ${primary}aa` }}
          >
            {theme?.status === "ready" ? theme.tokenSymbol : "REELBIT"}
          </div>
          <div className="text-[8px] tracking-[0.45em] font-medium mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
            {theme?.status === "ready" ? theme.tokenName.toUpperCase() : "PROVABLY FAIR"}
          </div>
        </div>

        {/* Right diamond */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex gap-1">
          {[0.5, 1].map((o, i) => (
            <div key={i} className="text-sm" style={{ color: primary, opacity: o }}>◆</div>
          ))}
        </div>
      </div>

      {/* ── Reel window ── */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          width: cabinetWidth,
          background: "linear-gradient(180deg, #0a0a1c 0%, #060612 100%)",
          borderLeft: `2px solid ${primary}`,
          borderRight: `2px solid ${primary}`,
          padding: "18px 36px",
        }}
      >
        {/* Subtle BG image */}
        {theme?.bgImageUrl && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${theme.bgImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.1,
              filter: "blur(2px)",
            }}
          />
        )}

        {/* Accent glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${accent}12 0%, transparent 70%)` }}
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
              style={{ background: `radial-gradient(ellipse at center, ${primary}50 0%, transparent 70%)` }}
            />
          )}
        </AnimatePresence>

        {/* Reels */}
        <div className="relative flex gap-[8px]" style={{ height: SYMBOL_SIZE * 3 }}>
          {Array.from({ length: reelCount }, (_, r) => (
            <Reel
              key={r}
              reelIndex={r}
              symbols={reelGrid[r] ?? ["LEMON", "LEMON", "LEMON"]}
              spinning={isSpinning}
              stopDelay={stopDelay(r)}
              winCells={winCells}
              onStop={handleReelStop}
            />
          ))}
        </div>

        {/* Payline center guide (subtle) */}
        <div
          className="absolute inset-x-8 pointer-events-none"
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
          borderLeft: `2px solid ${primary}`,
          borderRight: `2px solid ${primary}`,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          minHeight: 44,
        }}
      >
        {settled && spinResult && spinResult.winLines.length > 0 ? (
          <WinLineDisplay result={spinResult} />
        ) : (
          <div className="flex items-center justify-between text-[9px] font-orbitron text-white/15 tracking-widest">
            <span>{model === "Classic3Reel" ? "1 LINE" : "20 LINES"}</span>
            <span>96% RTP</span>
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
          borderLeft: `2px solid ${primary}`,
          borderRight: `2px solid ${primary}`,
        }}
      >
        {/* Decorative LED strip */}
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: primary }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
