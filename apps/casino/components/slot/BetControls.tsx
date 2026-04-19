"use client";

import { motion } from "framer-motion";
import { Zap, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Bet steps in USDC micro-units ($0.50, $1, $2, $5, $10, $25, $50, $100)
const BET_STEPS = [0.5, 1, 2, 5, 10, 25, 50, 100].map((d) => Math.round(d * 1_000_000));

function fmtBet(usdcUnits: number): string {
  const dollars = usdcUnits / 1_000_000;
  return dollars < 1 ? `$${dollars.toFixed(2)}` : `$${dollars % 1 === 0 ? dollars : dollars.toFixed(2)}`;
}

interface Props {
  betUsdc:       number;
  onBetChange:   (usdcUnits: number) => void;
  balance:       number; // USDC micro-units (playable only)
  isSpinning:    boolean;
  onSpin:        () => Promise<void>;
  freeSpinsLeft: number;
}

export function BetControls({ betUsdc, onBetChange, balance, isSpinning, onSpin, freeSpinsLeft }: Props) {
  const currentIdx = BET_STEPS.indexOf(betUsdc);
  const isFree     = freeSpinsLeft > 0;
  const canSpin    = !isSpinning && (isFree || betUsdc <= balance);

  function stepBet(dir: 1 | -1) {
    const next = BET_STEPS[currentIdx + dir];
    if (next !== undefined && next <= balance) onBetChange(next);
  }

  function maxBet() {
    const top = [...BET_STEPS].reverse().find((s) => s <= balance);
    if (top) onBetChange(top);
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full select-none">

      {/* Bet adjuster row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => stepBet(-1)}
          disabled={currentIdx <= 0 || isSpinning}
          className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/8 flex items-center justify-center text-white/35 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 transition-all"
        >
          <ChevronDown size={15} />
        </button>

        <div className="bg-[#07071a] border border-white/8 rounded-2xl px-5 py-3 text-center min-w-[110px]">
          <div className="font-mono font-bold text-white text-base leading-none">{fmtBet(betUsdc)}</div>
          <div className="font-orbitron text-[9px] text-white/20 tracking-widest mt-1">PER SPIN</div>
        </div>

        <button
          onClick={() => stepBet(1)}
          disabled={currentIdx >= BET_STEPS.length - 1 || BET_STEPS[currentIdx + 1] > balance || isSpinning}
          className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/8 flex items-center justify-center text-white/35 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 transition-all"
        >
          <ChevronUp size={15} />
        </button>
      </div>

      {/* Spin button + MAX */}
      <div className="flex items-center gap-5">
        <button
          onClick={maxBet}
          disabled={isSpinning || balance === 0}
          className="font-orbitron text-[10px] font-bold text-white/25 hover:text-yellow-400/70 disabled:opacity-20 transition-colors tracking-widest"
        >
          MAX
        </button>

        <motion.button
          whileHover={canSpin ? { scale: 1.07 } : {}}
          whileTap={canSpin ? { scale: 0.91 } : {}}
          onClick={onSpin}
          disabled={!canSpin}
          className={cn(
            "spin-btn w-[100px] h-[100px] flex flex-col items-center justify-center gap-1",
            canSpin && !isSpinning && (isFree
              ? "!bg-gradient-to-b !from-green-500 !to-green-700 !border-green-400/60 !shadow-[0_0_40px_rgba(34,197,94,0.5),inset_0_2px_0_rgba(255,255,255,0.2)]"
              : "spin-btn-idle"),
          )}
        >
          {isSpinning ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
              className="w-6 h-6 rounded-full border-2 border-white border-t-transparent relative z-10"
            />
          ) : isFree ? (
            <>
              <Zap size={22} className="text-white relative z-10" />
              <span className="font-orbitron text-[9px] font-bold text-white/80 tracking-wider relative z-10">FREE</span>
              <span className="font-orbitron text-sm font-black text-white relative z-10 leading-none">{freeSpinsLeft}</span>
            </>
          ) : (
            <>
              <Zap size={24} className="text-white relative z-10" />
              <span className="font-orbitron text-[11px] font-black text-white tracking-[0.18em] relative z-10">SPIN</span>
            </>
          )}
        </motion.button>

        {/* Balance indicator */}
        <div className="text-center">
          <div className="font-orbitron text-[9px] text-white/15 tracking-widest">BAL</div>
          <div className="font-mono text-xs text-white/30 mt-0.5">
            ${(balance / 1_000_000).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
