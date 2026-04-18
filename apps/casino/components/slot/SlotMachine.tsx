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
const SYMBOL_SIZE = 96;

const SPIN_POOL: SymbolId[] = [
  "SEVEN", "CHERRY", "BELL", "BAR3", "LEMON", "ORANGE",
  "BAR2", "WILD", "BAR1", "CHERRY", "LEMON", "SEVEN",
  "ORANGE", "BAR3", "BELL", "BAR2", "CHERRY", "LEMON",
];

function getWinCells(result: SpinResult | null): Set<string> {
  const cells = new Set<string>();
  if (!result) return cells;
  result.winLines.forEach((wl) => {
    wl.symbols.forEach((_, reel) => cells.add(`${reel}-1`));
  });
  return cells;
}

interface ReelProps {
  reelIndex: number;
  symbols: SymbolId[];
  spinning: boolean;
  stopDelay: number;
  winRows: Set<number>;
}

function Reel({ reelIndex, symbols, spinning, stopDelay, winRows }: ReelProps) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "settling" | "settled">("idle");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (spinning) {
      setPhase("spinning");
    } else if (phaseRef.current === "spinning") {
      const t = setTimeout(() => {
        setPhase("settling");
        setTimeout(() => setPhase("settled"), 350);
      }, stopDelay);
      return () => clearTimeout(t);
    }
  }, [spinning, stopDelay]);

  const spinStrip = [...SPIN_POOL, ...SPIN_POOL, ...SPIN_POOL];

  return (
    <div
      className="reel-col flex-shrink-0 relative"
      style={{ width: SYMBOL_SIZE, height: SYMBOL_SIZE * 3 }}
    >
      {(phase === "spinning" || phase === "settling") && (
        <div
          className="absolute inset-0 overflow-hidden rounded-lg"
          style={{ filter: phase === "settling" ? "blur(1px)" : "blur(3px)", opacity: 0.85 }}
        >
          <motion.div
            animate={phase === "spinning" ? { y: [0, -SYMBOL_SIZE * 18] } : { y: -SYMBOL_SIZE * 18 }}
            transition={
              phase === "spinning"
                ? { duration: 0.6, repeat: Infinity, ease: "linear" }
                : { duration: 0.25, ease: "easeOut" }
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

      {(phase === "settled" || phase === "idle") && symbols.map((sym, row) => (
        <motion.div
          key={`${reelIndex}-${row}-${sym}`}
          initial={phase === "settled" ? { y: -SYMBOL_SIZE * 0.3, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 28, delay: row * 0.04 }}
          style={{ position: "absolute", top: row * SYMBOL_SIZE, left: 0 }}
        >
          <SymbolSVG id={sym} size={SYMBOL_SIZE} highlighted={winRows.has(row)} />
        </motion.div>
      ))}

      <div className="absolute top-0 left-0 right-0 h-8 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #0b0b1c, transparent)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-8 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, #0b0b1c, transparent)" }} />
    </div>
  );
}

function WinLineOverlay({ result }: { result: SpinResult }) {
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const lines = result.winLines;

  useEffect(() => {
    if (lines.length <= 1) return;
    const t = setInterval(() => setActiveLineIdx((i) => (i + 1) % lines.length), 700);
    return () => clearInterval(t);
  }, [lines.length]);

  if (!lines.length) return null;
  const active = lines[activeLineIdx];
  if (!active) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeLineIdx}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-x-0 flex items-center justify-center pointer-events-none z-20"
        style={{ top: SYMBOL_SIZE, height: SYMBOL_SIZE }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent 2%, rgba(212,160,23,0.08) 20%, rgba(212,160,23,0.12) 50%, rgba(212,160,23,0.08) 80%, transparent 98%)",
            borderTop: "1px solid rgba(212,160,23,0.4)",
            borderBottom: "1px solid rgba(212,160,23,0.4)",
          }}
        />
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="relative z-10 bg-black/80 border border-yellow-500/40 rounded-lg px-3 py-1 text-xs font-bold"
          style={{ color: "#ffd700", fontFamily: "Orbitron, sans-serif" }}
        >
          LINE {active.paylineIndex + 1} — ×{active.multiplier}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function SlotMachine({ model, spinResult, isSpinning, onSpinComplete, theme }: Props) {
  const primary = theme?.primaryColor ?? "#d4a017";
  const accent  = theme?.accentColor  ?? "#8b5cf6";
  const reelCount = REEL_COUNT_MAP[model];
  const prevSpinning = useRef(false);
  const [settled, setSettled] = useState(false);
  const [showSmallWin, setShowSmallWin] = useState<string | null>(null);

  const reelGrid: SymbolId[][] = spinResult?.reels ?? Array.from(
    { length: reelCount },
    (_, r) => {
      const idle: SymbolId[] = ["CHERRY", "BELL", "BAR1"];
      return [idle[r % 3], idle[(r + 1) % 3], idle[(r + 2) % 3]];
    }
  );

  const winCells = getWinCells(spinResult);

  function stopDelay(reelIdx: number): number {
    return reelIdx * 220;
  }

  const lastReelDelay = stopDelay(reelCount - 1) + 400;

  useEffect(() => {
    if (prevSpinning.current && !isSpinning) {
      setSettled(false);
      const t = setTimeout(() => {
        setSettled(true);
        onSpinComplete?.();
        if (spinResult && spinResult.winLines.length > 0) {
          const topMult = Math.max(...spinResult.winLines.map((w) => w.multiplier));
          if (topMult < 10) {
            setShowSmallWin(`×${topMult}`);
            setTimeout(() => setShowSmallWin(null), 1200);
          }
        }
      }, lastReelDelay);
      return () => clearTimeout(t);
    }
    prevSpinning.current = isSpinning;
  }, [isSpinning, lastReelDelay, onSpinComplete, spinResult]);

  const totalWidth = reelCount * SYMBOL_SIZE + (reelCount - 1) * 6;

  return (
    <div className="flex flex-col items-center gap-0 select-none">
      <div
        className="relative flex items-center justify-center rounded-t-2xl px-6 py-3"
        style={{
          width: totalWidth + 64,
          background: "linear-gradient(180deg, #1a1030 0%, #0e0e22 100%)",
          borderTop: `2px solid ${primary}`,
          borderLeft: `2px solid ${primary}`,
          borderRight: `2px solid ${primary}`,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="text-center">
          <div
            className="text-lg tracking-[0.3em] font-black"
            style={{ fontFamily: "Orbitron, sans-serif", color: primary, textShadow: `0 0 16px ${primary}99` }}
          >
            {theme?.status === "ready" ? theme.tokenSymbol : "REELBIT"}
          </div>
          <div className="text-[9px] tracking-[0.4em] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            {theme?.status === "ready" ? theme.tokenName.toUpperCase() : "PROVABLY FAIR"}
          </div>
        </div>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: `${primary}80` }}>◆</div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: `${primary}80` }}>◆</div>
      </div>

      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          width: totalWidth + 64,
          background: "linear-gradient(180deg, #10101e 0%, #0a0a18 100%)",
          border: `2px solid ${primary}`,
          borderTop: "none",
          padding: "16px 32px",
        }}
      >
        {theme?.bgImageUrl && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${theme.bgImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.12,
              filter: "blur(1px)",
            }}
          />
        )}

        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 40% at 50% 50%, ${accent}10 0%, transparent 70%)` }} />

        <div className="relative flex gap-[6px]" style={{ height: SYMBOL_SIZE * 3 }}>
          {Array.from({ length: reelCount }, (_, r) => (
            <Reel
              key={r}
              reelIndex={r}
              symbols={reelGrid[r] ?? ["LEMON", "LEMON", "LEMON"]}
              spinning={isSpinning}
              stopDelay={stopDelay(r)}
              winRows={settled && spinResult && spinResult.winLines.length > 0
                ? new Set([1])
                : new Set<number>()}
            />
          ))}

          {settled && spinResult && spinResult.winLines.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-20">
              <WinLineOverlay result={spinResult} />
            </div>
          )}
        </div>

        <AnimatePresence>
          {showSmallWin && (
            <motion.div
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -60, opacity: 0, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
              style={{
                fontFamily: "Orbitron, sans-serif",
                fontSize: 28,
                fontWeight: 900,
                color: "#ffd700",
                textShadow: "0 0 20px rgba(255,215,0,0.9)",
              }}
            >
              {showSmallWin}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="flex items-center justify-between px-6 py-2 rounded-b-2xl text-xs"
        style={{
          width: totalWidth + 64,
          background: "linear-gradient(180deg, #0e0e22 0%, #080810 100%)",
          borderBottom: `2px solid ${primary}`,
          borderLeft: `2px solid ${primary}`,
          borderRight: `2px solid ${primary}`,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.3)",
          fontFamily: "Orbitron, sans-serif",
          letterSpacing: "0.05em",
        }}
      >
        <span>{model === "Classic3Reel" ? "1" : "20"} LINES</span>
        <span>96% RTP</span>
        <span>{reelCount} REELS</span>
      </div>
    </div>
  );
}
