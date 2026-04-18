"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  payout: number;     // lamports
  multiplier: number;
  onDismiss: () => void;
}

function useCountUp(target: number, duration: number) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function CoinParticle({ x, delay }: { x: number; delay: number }) {
  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, scale: 1 }}
      animate={{ y: 220, opacity: 0, scale: 0.5, rotate: 360 }}
      transition={{ duration: 1.2, delay, ease: "easeIn" }}
      className="absolute text-2xl pointer-events-none"
      style={{ left: `${x}%` }}
    >
      🪙
    </motion.div>
  );
}

export function WinPresenter({ payout, multiplier, onDismiss }: Props) {
  const solPayout = payout / 1e9;
  const displaySol = useCountUp(Math.round(solPayout * 1000), 800);
  const tier = multiplier >= 50 ? "jackpot" : multiplier >= 10 ? "mega" : multiplier >= 5 ? "big" : "small";

  const coins = Array.from({ length: tier === "jackpot" ? 12 : tier === "mega" ? 8 : 5 }, (_, i) => ({
    x: 5 + (i / 11) * 90,
    delay: i * 0.1,
  }));

  const autoTimeout = tier === "jackpot" ? 5000 : tier === "mega" ? 3500 : 2500;
  useEffect(() => {
    const t = setTimeout(onDismiss, autoTimeout);
    return () => clearTimeout(t);
  }, [autoTimeout, onDismiss]);

  if (tier === "small") {
    return (
      <motion.div
        initial={{ y: 0, opacity: 1, scale: 1 }}
        animate={{ y: -60, opacity: 0, scale: 1.3 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="pointer-events-none"
        style={{
          fontFamily: "Orbitron, sans-serif",
          fontSize: 24,
          fontWeight: 900,
          color: "#ffd700",
          textShadow: "0 0 20px rgba(255,215,0,0.9)",
        }}
      >
        ×{multiplier}
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      >
        {/* Screen flash */}
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: tier === "jackpot" ? "rgba(255,215,0,0.15)" : "rgba(139,92,246,0.1)" }}
        />

        {/* Coin rain */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden h-60 pointer-events-none">
          {coins.map((c, i) => <CoinParticle key={i} x={c.x} delay={c.delay} />)}
        </div>

        {/* Win card */}
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative text-center px-12 py-10 rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #1a1030 0%, #0e0e22 100%)",
            border: tier === "jackpot"
              ? "2px solid rgba(212,160,23,0.8)"
              : "2px solid rgba(139,92,246,0.6)",
            boxShadow: tier === "jackpot"
              ? "0 0 60px rgba(212,160,23,0.4), inset 0 0 40px rgba(212,160,23,0.05)"
              : "0 0 60px rgba(139,92,246,0.4), inset 0 0 40px rgba(139,92,246,0.05)",
          }}
        >
          <div
            className="text-sm font-black tracking-[0.3em] mb-2"
            style={{ fontFamily: "Orbitron, sans-serif", color: tier === "jackpot" ? "#d4a017" : "#c084fc" }}
          >
            {tier === "jackpot" ? "🎰 JACKPOT!" : tier === "mega" ? "⚡ MEGA WIN" : "🔥 BIG WIN"}
          </div>
          <div
            className="text-6xl font-black mb-2"
            style={{
              fontFamily: "Orbitron, sans-serif",
              color: "#fff",
              textShadow: "0 0 30px rgba(255,215,0,0.7)",
            }}
          >
            ×{multiplier}
          </div>
          <div
            className="text-2xl font-bold"
            style={{ fontFamily: "Orbitron, sans-serif", color: "#ffd700" }}
          >
            {(displaySol / 1000).toFixed(3)} SOL
          </div>
          <p className="text-white/30 text-xs mt-4" style={{ fontFamily: "Orbitron, sans-serif" }}>
            TAP TO CONTINUE
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
