"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Square, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const BET_STEPS = [0.5, 1, 2, 5, 10, 25, 50, 100].map((d) => Math.round(d * 1_000_000));
const AUTO_OPTIONS = [
  { label: "10",  value: 10  },
  { label: "25",  value: 25  },
  { label: "50",  value: 50  },
  { label: "100", value: 100 },
  { label: "∞",   value: -1  },
];

function fmtBet(usdcUnits: number): string {
  const d = usdcUnits / 1_000_000;
  return d < 1 ? `$${d.toFixed(2)}` : `$${d % 1 === 0 ? d : d.toFixed(2)}`;
}

interface Props {
  betUsdc:            number;
  onBetChange:        (usdcUnits: number) => void;
  balance:            number;
  bonus?:             number;
  wageringRequired?:  number;
  wageringCompleted?: number;
  isSpinning:         boolean;
  onSpin:             () => Promise<void>;
  freeSpinsLeft:      number;
  autoSpinRemaining:  number;
  onStartAutoSpin:    (count: number) => void;
  onStopAutoSpin:     () => void;
}

export function BetControls({
  betUsdc, onBetChange, balance,
  bonus = 0, wageringRequired = 0, wageringCompleted = 0,
  isSpinning, onSpin, freeSpinsLeft,
  autoSpinRemaining, onStartAutoSpin, onStopAutoSpin,
}: Props) {
  const [autoOpen, setAutoOpen]     = useState(false);
  const autoRef                     = useRef<HTMLDivElement>(null);
  const currentIdx  = BET_STEPS.indexOf(betUsdc);
  const isFree      = freeSpinsLeft > 0;
  const isAutoActive = autoSpinRemaining !== 0;
  const canSpin     = !isSpinning && (isFree || betUsdc <= balance);

  const bonusActive    = bonus > 0 && wageringRequired > 0;
  const wagerPct       = bonusActive ? Math.min(100, Math.round(wageringCompleted / wageringRequired * 100)) : 0;
  const wagerRemaining = Math.max(0, wageringRequired - wageringCompleted);

  function halfBet() {
    const half = Math.round(betUsdc / 2 / 500_000) * 500_000;
    const clamped = BET_STEPS.reduce((best, s) => s <= half && s > best ? s : best, BET_STEPS[0]);
    if (clamped <= balance) onBetChange(clamped);
  }

  function doubleBet() {
    const double = betUsdc * 2;
    const clamped = [...BET_STEPS].reverse().find((s) => s <= double && s <= balance);
    if (clamped) onBetChange(clamped);
  }

  function maxBet() {
    const top = [...BET_STEPS].reverse().find((s) => s <= balance);
    if (top) onBetChange(top);
  }

  function handleAutoSelect(count: number) {
    setAutoOpen(false);
    onStartAutoSpin(count);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none">

      {/* Bet row */}
      <div className="flex items-center gap-2">
        <button
          onClick={halfBet}
          disabled={isSpinning || isAutoActive || currentIdx <= 0}
          className="h-8 px-3 rounded-xl bg-white/[0.04] border border-white/8 text-[10px] font-orbitron font-bold text-white/35 hover:text-white/70 hover:bg-white/[0.08] disabled:opacity-20 transition-all"
        >
          ½
        </button>

        <div className="bg-[#07071a] border border-white/10 rounded-2xl px-5 py-2.5 text-center min-w-[120px]">
          <div className="font-orbitron font-black text-white text-lg leading-none tracking-tight">
            {isFree ? <span className="text-green-400 text-sm">FREE</span> : fmtBet(betUsdc)}
          </div>
          <div className="font-orbitron text-[8px] text-white/20 tracking-widest mt-1">PER SPIN</div>
        </div>

        <button
          onClick={doubleBet}
          disabled={isSpinning || isAutoActive || currentIdx >= BET_STEPS.length - 1 || betUsdc * 2 > balance}
          className="h-8 px-3 rounded-xl bg-white/[0.04] border border-white/8 text-[10px] font-orbitron font-bold text-white/35 hover:text-white/70 hover:bg-white/[0.08] disabled:opacity-20 transition-all"
        >
          2×
        </button>

        <button
          onClick={maxBet}
          disabled={isSpinning || isAutoActive || balance === 0}
          className="h-8 px-3 rounded-xl bg-white/[0.04] border border-white/8 text-[10px] font-orbitron font-bold text-white/25 hover:text-yellow-400/70 disabled:opacity-20 transition-all"
        >
          MAX
        </button>
      </div>

      {/* Spin row */}
      <div className="flex items-center gap-6">

        {/* Auto-spin control */}
        <div className="relative" ref={autoRef}>
          {isAutoActive ? (
            <motion.button
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={onStopAutoSpin}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-orbitron font-bold transition-all"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
            >
              <Square size={9} />
              STOP
              {autoSpinRemaining > 0 && (
                <span className="ml-0.5 text-white/40">({autoSpinRemaining})</span>
              )}
            </motion.button>
          ) : (
            <button
              onClick={() => !isSpinning && setAutoOpen((p) => !p)}
              disabled={isSpinning || balance < betUsdc}
              className={cn(
                "flex items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-orbitron font-bold transition-all",
                autoOpen
                  ? "bg-purple-600/20 border border-purple-500/40 text-purple-300"
                  : "bg-white/[0.04] border border-white/8 text-white/30 hover:text-white/60 hover:border-white/15",
                "disabled:opacity-20",
              )}
            >
              AUTO <ChevronDown size={9} className={cn("transition-transform", autoOpen && "rotate-180")} />
            </button>
          )}

          {/* Dropdown */}
          <AnimatePresence>
            {autoOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full mb-2 left-0 z-50 rounded-xl overflow-hidden border border-white/10"
                style={{ background: "#0d0d24", minWidth: 100 }}
              >
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="font-orbitron text-[9px] text-white/30 tracking-widest">AUTO SPIN</p>
                </div>
                {AUTO_OPTIONS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => handleAutoSelect(value)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-orbitron font-bold text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span>{label}</span>
                    {value > 0 && <span className="text-white/20 text-[9px]">spins</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main spin button */}
        <motion.button
          whileHover={canSpin ? { scale: 1.07 } : {}}
          whileTap={canSpin ? { scale: 0.91 } : {}}
          onClick={onSpin}
          disabled={!canSpin}
          className={cn(
            "spin-btn w-[104px] h-[104px] flex flex-col items-center justify-center gap-1",
            canSpin && !isSpinning && !isAutoActive && (isFree
              ? "!bg-gradient-to-b !from-green-500 !to-green-700 !border-green-400/60 !shadow-[0_0_40px_rgba(34,197,94,0.5),inset_0_2px_0_rgba(255,255,255,0.2)]"
              : "spin-btn-idle"),
            isAutoActive && !isSpinning && "!border-purple-400/60 !shadow-[0_0_40px_rgba(139,92,246,0.4),inset_0_2px_0_rgba(255,255,255,0.2)]",
          )}
          style={isAutoActive && !isSpinning ? { background: "linear-gradient(180deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)" } : undefined}
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
          ) : isAutoActive ? (
            <>
              <Zap size={20} className="text-white relative z-10" />
              <span className="font-orbitron text-[9px] font-bold text-white/80 tracking-widest relative z-10">AUTO</span>
              {autoSpinRemaining > 0 && (
                <span className="font-orbitron text-sm font-black text-white relative z-10 leading-none">{autoSpinRemaining}</span>
              )}
            </>
          ) : (
            <>
              <Zap size={24} className="text-white relative z-10" />
              <span className="font-orbitron text-[11px] font-black text-white tracking-[0.18em] relative z-10">SPIN</span>
            </>
          )}
        </motion.button>

        {/* Balance */}
        <div className="text-center min-w-[56px]">
          <div className="font-orbitron text-[8px] text-white/15 tracking-widest">BALANCE</div>
          <div className="font-orbitron text-xs text-white/40 mt-0.5 font-bold">
            ${(balance / 1_000_000).toFixed(2)}
          </div>
          {bonusActive && (
            <div className="font-orbitron text-[8px] text-purple-400/60 mt-1 tracking-wider">
              +${(bonus / 1_000_000).toFixed(2)} B
            </div>
          )}
        </div>
      </div>

      {/* Bonus wagering progress — only shown when bonus is active */}
      {bonusActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="w-full max-w-xs space-y-1"
        >
          <div className="flex items-center justify-between text-[9px] font-orbitron">
            <span className="text-purple-400/70 tracking-wider">BONUS WAGERING</span>
            <span className="text-white/30">{wagerPct}% · ${(wagerRemaining / 1_000_000).toFixed(0)} left</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }}
              initial={{ width: 0 }}
              animate={{ width: `${wagerPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          {betUsdc > 10_000_000 && (
            <p className="text-[9px] text-red-400/60 font-orbitron tracking-wider text-center">
              ⚠ Max bet $10 while bonus active
            </p>
          )}
        </motion.div>
      )}

    </div>
  );
}
