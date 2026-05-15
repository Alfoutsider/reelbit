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
  onReelStop?: (reelIdx: number) => void;
  theme?: SlotTheme | null;
  customSymbols?: Record<string, string>;
}

const REEL_COUNT_MAP = { Classic3Reel: 3, Standard5Reel: 5, FiveReelFreeSpins: 5 };
const SYMBOL_SIZE = 100;
const SPECIAL_SYMBOLS = new Set(["WILD", "SCATTER"]);

// Spin pool uses Classic symbols for Classic, otherwise generic mid-tier symbols
const CLASSIC_POOL: SymbolId[] = [
  "SEVEN", "CHERRY", "BELL", "BAR3", "LEMON", "ORANGE",
  "BAR2", "WILD", "BAR1", "CHERRY", "LEMON", "SEVEN",
  "ORANGE", "BAR3", "BELL", "BAR2", "CHERRY", "LEMON",
];

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

// ── Chrome cabinet accent components ──────────────────────────────────────────

function ChromeShine() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.17) 0%, rgba(255,255,255,0.05) 28%, transparent 65%, rgba(0,0,0,0.2) 100%)",
        }}
      />
      <div
        className="absolute top-0 left-10 right-10 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
        }}
      />
    </>
  );
}

function Rivet({ top, left, right, bottom }: { top?: number; left?: number; right?: number; bottom?: number }) {
  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        top, left, right, bottom,
        width: 10, height: 10, borderRadius: "50%",
        background:
          "radial-gradient(circle at 33% 30%, rgba(255,255,255,0.6), rgba(190,195,210,0.3) 50%, rgba(0,0,0,0.55))",
        boxShadow: "0 1px 4px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.3)",
      }}
    />
  );
}

// ── Reel component ─────────────────────────────────────────────────────────────

interface ReelProps {
  reelIndex:    number;
  symbols:      string[];
  spinning:     boolean;
  stopDelay:    number;
  winCells:     Set<string>;
  onStop:       (reelIdx: number) => void;
  customSymbols?: Record<string, string>;
  themeId:      ThemeId;
  spinPool:     string[];
  anticipating: boolean;
}

function Reel({
  reelIndex, symbols, spinning, stopDelay, winCells,
  onStop, customSymbols, themeId, spinPool, anticipating,
}: ReelProps) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "anticipating" | "stopping" | "settled">("idle");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Main spin lifecycle
  useEffect(() => {
    if (spinning) {
      setPhase("spinning");
    } else if (phaseRef.current === "spinning" || phaseRef.current === "anticipating") {
      const t = setTimeout(() => {
        setPhase("stopping");
        setTimeout(() => {
          setPhase("settled");
          onStop(reelIndex);
        }, 300);
      }, stopDelay);
      return () => clearTimeout(t);
    }
  }, [spinning, stopDelay, onStop, reelIndex]);

  // Anticipation trigger: slow this reel while others' specials land
  useEffect(() => {
    if (anticipating && phaseRef.current === "spinning") {
      setPhase("anticipating");
    }
  }, [anticipating]);

  const spinStrip = [...spinPool, ...spinPool, ...spinPool];
  const isSpinActive = phase === "spinning" || phase === "stopping" || phase === "anticipating";

  return (
    <div
      className="reel-col flex-shrink-0 relative rounded-lg overflow-hidden"
      style={{ width: SYMBOL_SIZE, height: SYMBOL_SIZE * 3 }}
    >
      {/* Spinning strip */}
      {isSpinActive && (
        <div
          className="absolute inset-0"
          style={{
            filter:
              phase === "stopping"    ? "blur(1.5px)"
              : phase === "anticipating" ? "blur(2.5px)"
              : "blur(4px)",
            opacity: phase === "anticipating" ? 0.95 : 0.82,
          }}
        >
          <motion.div
            animate={phase === "stopping" ? { y: -SYMBOL_SIZE * 18 } : { y: [0, -SYMBOL_SIZE * 18] }}
            transition={
              phase === "stopping"
                ? { duration: 0.22, ease: "easeOut" }
                : phase === "anticipating"
                  ? { duration: 4.5, repeat: Infinity, ease: "linear" }
                  : { duration: 0.55, repeat: Infinity, ease: "linear" }
            }
          >
            {spinStrip.map((sym, i) => (
              <div key={i} style={{ width: SYMBOL_SIZE, height: SYMBOL_SIZE, flexShrink: 0 }}>
                <SymbolSVG id={sym} size={SYMBOL_SIZE} theme={themeId} customSvg={customSymbols?.[sym]} />
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Anticipation border flash — amber pulse around the reel */}
      {phase === "anticipating" && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none rounded-lg"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.65, repeat: Infinity, ease: "easeInOut" }}
          style={{
            border: "2px solid rgba(255,170,0,0.95)",
            boxShadow: "0 0 22px rgba(255,140,0,0.65), inset 0 0 20px rgba(255,140,0,0.18)",
          }}
        />
      )}

      {/* Settled symbols */}
      {(phase === "settled" || phase === "idle") &&
        symbols.map((sym, row) => {
          const isWin     = winCells.has(`${reelIndex}-${row}`);
          const isScatter = sym === "SCATTER";
          const isWild    = sym === "WILD";

          return (
            <motion.div
              key={`${reelIndex}-${row}-${sym}`}
              initial={phase === "settled" ? { y: -SYMBOL_SIZE * 0.4, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 480, damping: 26, delay: row * 0.035 }}
              style={{ position: "absolute", top: row * SYMBOL_SIZE, left: 0 }}
              className={isWin ? "symbol-win" : undefined}
            >
              <SymbolSVG
                id={sym}
                size={SYMBOL_SIZE}
                highlighted={isWin}
                theme={themeId}
                customSvg={customSymbols?.[sym]}
              />

              {/* Win cell glow border */}
              {isWin && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.6, 1] }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-1 rounded-lg pointer-events-none"
                  style={{
                    border: "2px solid rgba(255,215,0,0.75)",
                    boxShadow: "inset 0 0 14px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.2)",
                  }}
                />
              )}

              {/* Scatter ring pulse — expanding ring that fades out */}
              {isScatter && phase === "settled" && (
                <motion.div
                  key={`scatter-ring-${reelIndex}-${row}`}
                  className="absolute inset-0 pointer-events-none"
                  style={{ borderRadius: "50%", border: "2.5px solid rgba(255,210,50,0.95)" }}
                  initial={{ scale: 0.85, opacity: 1 }}
                  animate={{ scale: 2.3, opacity: 0 }}
                  transition={{ duration: 0.75, ease: "easeOut", delay: row * 0.08 }}
                />
              )}
              {isScatter && phase === "settled" && (
                <motion.div
                  key={`scatter-glow-${reelIndex}-${row}`}
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ background: "radial-gradient(ellipse, rgba(255,220,60,0.65) 0%, transparent 65%)" }}
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: row * 0.08 + 0.12 }}
                />
              )}

              {/* Wild expand glow — sphere that shrinks inward */}
              {isWild && phase === "settled" && (
                <motion.div
                  key={`wild-glow-${reelIndex}-${row}`}
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse, rgba(185,100,255,0.72) 0%, rgba(120,55,220,0.35) 50%, transparent 75%)",
                  }}
                  initial={{ scale: 1.45, opacity: 0.88 }}
                  animate={{ scale: 1.0, opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut", delay: row * 0.06 }}
                />
              )}
            </motion.div>
          );
        })}

      {/* Top/bottom fade masks — mask the reel behind the bezel edges */}
      <div
        className="absolute top-0 left-0 right-0 h-10 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(6,6,20,0.92), transparent)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-10 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(6,6,20,0.92), transparent)" }}
      />
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
              <span className="font-orbitron text-[9px] text-white/30">
                {activeIdx + 1}/{lines.length}
              </span>
            </>
          )}
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-500/40" />
      </motion.div>
    </AnimatePresence>
  );
}

// ── SlotMachine ────────────────────────────────────────────────────────────────

export function SlotMachine({
  model, spinResult, isSpinning, onSpinComplete, onReelStop, theme, customSymbols,
}: Props) {
  const themeId: ThemeId = MODEL_TO_THEME[model] ?? "classic";
  const themeConfig = getThemeForModel(model);
  const primary  = theme?.primaryColor ?? themeConfig.cabinet.primary;
  const accent   = theme?.accentColor  ?? themeConfig.cabinet.secondary;
  const reelCount = REEL_COUNT_MAP[model];
  const is5reel   = model !== "Classic3Reel";

  const prevSpinning    = useRef(false);
  const specialLandedRef = useRef(0);

  const [settled,      setSettled]      = useState(false);
  const [winFlash,     setWinFlash]     = useState(false);
  const [stoppedReels, setStoppedReels] = useState(0);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [anticipating, setAnticipating] = useState(false);

  const spinPool = buildSpinPool(themeId);

  // Reset anticipation state when a new spin begins
  useEffect(() => {
    if (isSpinning) {
      specialLandedRef.current = 0;
      setAnticipating(false);
    }
  }, [isSpinning]);

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

  const handleReelStop = (idx: number) => {
    setStoppedReels((n) => n + 1);
    onReelStop?.(idx);

    // Anticipation: if this reel has a special symbol and there are reels left to stop, slow them
    const reelSymbols = spinResult?.reels?.[idx];
    if (reelSymbols?.some((sym) => SPECIAL_SYMBOLS.has(sym))) {
      specialLandedRef.current++;
      if (specialLandedRef.current >= 2 && idx < reelCount - 1) {
        setAnticipating(true);
      }
    }
  };

  const totalWidth   = reelCount * SYMBOL_SIZE + (reelCount - 1) * 8;
  const cabinetWidth = totalWidth + 72;

  return (
    <>
      <div
        className="flex flex-col items-center gap-0 select-none"
        style={{ filter: "drop-shadow(0 12px 48px rgba(0,0,0,0.75))" }}
      >

        {/* ── Cabinet top bar — chrome metallic header ── */}
        <div
          className="relative flex items-center justify-center rounded-t-3xl px-6 py-3.5 overflow-hidden"
          style={{
            width: cabinetWidth,
            background: themeConfig.cabinet.bodyGrad,
            borderTop:    "2px solid rgba(255,255,255,0.20)",
            borderLeft:   "2px solid rgba(255,255,255,0.14)",
            borderRight:  "2px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(0,0,0,0.45)",
            boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 24px rgba(0,0,0,0.55)",
          }}
        >
          <ChromeShine />

          {/* Animated theme background at low opacity */}
          <div className="absolute inset-0 opacity-30">
            <ThemeBackground theme={themeId} />
          </div>

          {/* Left corner diamonds */}
          <div className="absolute left-5 top-1/2 -translate-y-1/2 flex gap-1 z-10">
            {[1, 0.5].map((o, i) => (
              <div key={i} className="text-sm" style={{ color: primary, opacity: o }}>◆</div>
            ))}
          </div>

          {/* Embossed title */}
          <div className="text-center z-10 relative">
            <div
              className="text-base tracking-[0.35em] font-black leading-none"
              style={{
                fontFamily: "Orbitron, sans-serif",
                color: primary,
                textShadow: `0 1px 0 rgba(0,0,0,0.6), 0 0 22px ${primary}bb, 0 -1px 0 rgba(255,255,255,0.08)`,
              }}
            >
              {theme?.status === "ready" ? theme.tokenSymbol : themeConfig.name.toUpperCase()}
            </div>
            <div
              className="text-[8px] tracking-[0.45em] font-medium mt-1"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              {theme?.status === "ready" ? theme.tokenName.toUpperCase() : themeConfig.tagline.toUpperCase()}
            </div>
          </div>

          {/* Right corner diamonds */}
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
            <BookOpen size={12} style={{ color: primary }} />
          </button>
        </div>

        {/* ── Chrome reel bezel — beveled frame surrounding the reel window ── */}
        <div
          className="relative"
          style={{
            width: cabinetWidth,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(90,90,115,0.07) 45%, rgba(0,0,0,0.28) 100%)",
            borderLeft:  "2px solid rgba(255,255,255,0.11)",
            borderRight: "2px solid rgba(255,255,255,0.06)",
            padding: "5px 0",
          }}
        >
          {/* Bezel corner rivets */}
          <Rivet top={5} left={7} />
          <Rivet top={5} right={7} />
          <Rivet bottom={5} left={7} />
          <Rivet bottom={5} right={7} />

          {/* Reel window — deep inset look */}
          <div
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              background: themeConfig.cabinet.reelGrad,
              padding: "18px 36px",
              boxShadow:
                "inset 0 7px 28px rgba(0,0,0,0.78), inset 0 -3px 14px rgba(0,0,0,0.42), inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Animated background */}
            <ThemeBackground theme={themeId} />

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
              style={{
                background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${accent}14 0%, transparent 70%)`,
              }}
            />

            {/* Win flash overlay */}
            <AnimatePresence>
              {winFlash && (
                <motion.div
                  key="winflash"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.55, 0.2, 0.45, 0] }}
                  transition={{ duration: 0.75, times: [0, 0.15, 0.5, 0.75, 1] }}
                  className="absolute inset-0 pointer-events-none z-30"
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
                  anticipating={anticipating}
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
        </div>

        {/* ── Win line readout ── */}
        <div
          className="px-6 py-2.5"
          style={{
            width: cabinetWidth,
            background: "linear-gradient(180deg, #0c0c1e 0%, #070712 100%)",
            borderLeft:   "2px solid rgba(255,255,255,0.07)",
            borderRight:  "2px solid rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(0,0,0,0.5)",
            minHeight: 44,
          }}
        >
          {settled && spinResult && spinResult.winLines.length > 0 ? (
            <WinLineDisplay result={spinResult} />
          ) : (
            <div className="flex items-center justify-between text-[9px] font-orbitron text-white/15 tracking-widest">
              <span>{model === "Classic3Reel" ? "1 LINE" : "20 LINES"}</span>
              <span>PROVABLY FAIR</span>
              <span>{reelCount} REELS</span>
            </div>
          )}
        </div>

        {/* ── Cabinet bottom — chrome footer with glass LED housing ── */}
        <div
          className="relative rounded-b-3xl overflow-hidden px-6 py-3"
          style={{
            width: cabinetWidth,
            background: "linear-gradient(180deg, #070712 0%, #04040c 65%, #020208 100%)",
            borderBottom: "2px solid rgba(255,255,255,0.09)",
            borderLeft:   "2px solid rgba(255,255,255,0.07)",
            borderRight:  "2px solid rgba(255,255,255,0.04)",
            boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 36px rgba(0,0,0,0.85)",
          }}
        >
          <ChromeShine />

          {/* Glass LED housing capsule */}
          <div className="relative flex items-center justify-center">
            <div
              className="flex items-center gap-2 px-6 py-2 rounded-full"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 10px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              {Array.from({ length: 9 }, (_, i) => (
                <motion.div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: `radial-gradient(circle at 33% 33%, rgba(255,255,255,0.85), ${primary})`,
                    boxShadow: `0 0 7px ${primary}cc, 0 0 2px ${primary}`,
                  }}
                  animate={{ opacity: [0.14, 1, 0.14] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.13,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
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
