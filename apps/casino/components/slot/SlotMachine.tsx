"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Application, Graphics, Text, TextStyle, Container } from "pixi.js";
import { motion, AnimatePresence } from "framer-motion";
import { SYMBOL_DEFS, type SymbolId } from "./symbols";
import type { SpinResult } from "./types";

interface Props {
  model: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  spinResult: SpinResult | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
}

const REEL_COUNT_MAP = { Classic3Reel: 3, Standard5Reel: 5, FiveReelFreeSpins: 5 };
const SYMBOL_SIZE = 88;
const REEL_GAP = 8;
const VISIBLE_ROWS = 3;
const SPIN_DURATION = 1200; // ms

// Easing: ease-out cubic
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function SlotMachine({ model, spinResult, isSpinning, onSpinComplete }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const reelContainersRef = useRef<Container[]>([]);
  const animFrameRef = useRef<number>(0);
  const spinStartRef = useRef<number>(0);
  const [showWin, setShowWin] = useState(false);

  const reelCount = REEL_COUNT_MAP[model];
  const canvasW = reelCount * (SYMBOL_SIZE + REEL_GAP) - REEL_GAP + 40;
  const canvasH = VISIBLE_ROWS * (SYMBOL_SIZE + REEL_GAP) - REEL_GAP + 40;

  // Draw a single symbol cell
  function drawSymbol(symbolId: SymbolId, x: number, y: number, container: Container, highlighted = false) {
    const def = SYMBOL_DEFS[symbolId];

    const bg = new Graphics();
    bg.beginFill(highlighted ? 0xffd700 : 0x1a1a2e, highlighted ? 0.3 : 0.8);
    bg.lineStyle(highlighted ? 2 : 1, highlighted ? 0xffd700 : 0x333366, 1);
    bg.drawRoundedRect(x, y, SYMBOL_SIZE, SYMBOL_SIZE, 12);
    bg.endFill();
    container.addChild(bg);

    const style = new TextStyle({
      fontSize: symbolId.length <= 2 ? 38 : 24,
      fill: def.color,
      fontFamily: "Arial, sans-serif",
      align: "center",
    });
    const text = new Text(def.emoji, style);
    text.anchor.set(0.5);
    text.x = x + SYMBOL_SIZE / 2;
    text.y = y + SYMBOL_SIZE / 2;
    container.addChild(text);
  }

  // Render static reels from spin result
  function renderResult(result: SpinResult) {
    if (!appRef.current) return;
    const stage = appRef.current.stage;
    stage.removeChildren();

    // Draw border
    const border = new Graphics();
    border.lineStyle(2, 0x333366, 0.5);
    border.beginFill(0x0d0d1a, 0.95);
    border.drawRoundedRect(0, 0, canvasW, canvasH, 16);
    border.endFill();
    stage.addChild(border);

    const winLineSymbols = new Set<string>();
    result.winLines.forEach((wl) => {
      wl.symbols.forEach((_, ri) => {
        // Mark winning cells (simplified: mark whole reels that contributed)
        winLineSymbols.add(`${ri}`);
      });
    });

    for (let r = 0; r < reelCount; r++) {
      const cx = 20 + r * (SYMBOL_SIZE + REEL_GAP);
      for (let row = 0; row < VISIBLE_ROWS; row++) {
        const cy = 20 + row * (SYMBOL_SIZE + REEL_GAP);
        const sym = result.reels[r]?.[row] ?? "LEMON";
        const highlighted = result.winLines.length > 0 && winLineSymbols.has(String(r));
        drawSymbol(sym as SymbolId, cx, cy, stage as unknown as Container, highlighted);
      }
    }
  }

  // Animate spinning reels
  function animateSpin() {
    if (!appRef.current) return;
    const stage = appRef.current.stage;
    const symbols: SymbolId[] = ["SEVEN", "BAR3", "CHERRY", "BELL", "LEMON", "ORANGE", "BAR1", "BAR2", "WILD"];
    spinStartRef.current = performance.now();

    function frame(now: number) {
      if (!appRef.current) return;
      stage.removeChildren();

      const border = new Graphics();
      border.lineStyle(2, 0x333366, 0.5);
      border.beginFill(0x0d0d1a, 0.95);
      border.drawRoundedRect(0, 0, canvasW, canvasH, 16);
      border.endFill();
      stage.addChild(border);

      const elapsed = now - spinStartRef.current;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);

      for (let r = 0; r < reelCount; r++) {
        const cx = 20 + r * (SYMBOL_SIZE + REEL_GAP);
        // Each reel starts with a slight delay for cascade effect
        const reelProgress = Math.max(0, Math.min((progress - r * 0.04) / (1 - r * 0.04), 1));
        const offset = (1 - easeOut(reelProgress)) * SYMBOL_SIZE * 6;

        for (let row = 0; row < VISIBLE_ROWS; row++) {
          const cy = 20 + row * (SYMBOL_SIZE + REEL_GAP);
          const symIdx = (Math.floor((offset + row * SYMBOL_SIZE) / SYMBOL_SIZE) + r) % symbols.length;
          drawSymbol(symbols[symIdx], cx, cy, stage as unknown as Container);
        }
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        if (spinResult) renderResult(spinResult);
        onSpinComplete?.();
      }
    }

    animFrameRef.current = requestAnimationFrame(frame);
  }

  // Initialize PixiJS
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const app = new Application({
      width: canvasW,
      height: canvasH,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    canvasRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;

    // Draw idle state
    const stage = app.stage;
    const border = new Graphics();
    border.lineStyle(2, 0x333366, 0.5);
    border.beginFill(0x0d0d1a, 0.95);
    border.drawRoundedRect(0, 0, canvasW, canvasH, 16);
    border.endFill();
    stage.addChild(border);

    const idleSymbols: SymbolId[] = ["SEVEN", "BAR3", "CHERRY", "BELL", "LEMON", "ORANGE"];
    for (let r = 0; r < reelCount; r++) {
      for (let row = 0; row < VISIBLE_ROWS; row++) {
        const sym = idleSymbols[(r * VISIBLE_ROWS + row) % idleSymbols.length];
        drawSymbol(sym, 20 + r * (SYMBOL_SIZE + REEL_GAP), 20 + row * (SYMBOL_SIZE + REEL_GAP), stage as unknown as Container);
      }
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      app.destroy(true);
      appRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => {
    if (isSpinning) {
      setShowWin(false);
      cancelAnimationFrame(animFrameRef.current);
      animateSpin();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  useEffect(() => {
    if (spinResult && !isSpinning) {
      renderResult(spinResult);
      if (spinResult.winLines.length > 0) setShowWin(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinResult, isSpinning]);

  return (
    <div className="relative flex flex-col items-center">
      {/* Win flash overlay */}
      <AnimatePresence>
        {showWin && spinResult && spinResult.winLines.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-yellow-500/90 text-black font-black text-2xl px-6 py-3 rounded-2xl shadow-2xl"
            >
              {spinResult.isJackpot ? "🎰 JACKPOT! 🎰" : `WIN! ×${spinResult.winLines[0].multiplier}`}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={canvasRef} className="rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/30" />

      {/* Payline indicators */}
      {spinResult && spinResult.winLines.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center max-w-sm">
          {spinResult.winLines.map((wl, i) => (
            <div key={i} className="text-xs bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 px-2 py-1 rounded-lg">
              Line {wl.paylineIndex + 1}: ×{wl.multiplier}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
