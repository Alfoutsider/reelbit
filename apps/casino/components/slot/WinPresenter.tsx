"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ThemeId } from "@/lib/slotThemes";
import type { WinTierSfx } from "./useSlotSFX";

// ── Tier config ─────────────────────────────────────────────────────────────────

interface TierCfg {
  label: string;
  coins: number;
  spread: number;
  arcH: number;
  coinDuration: number;
  autoDismiss: number;
  borderColor: string;
  glowColor: string;
  bgGrad: string;
  coinColor: string;
  flashColor: string;
  fontSize: number;
}

const TIERS: Record<WinTierSfx, TierCfg> = {
  small: {
    label: "", coins: 0, spread: 0, arcH: 0, coinDuration: 0,
    autoDismiss: 1800,
    borderColor: "#ffd700", glowColor: "rgba(255,215,0,0.6)",
    bgGrad: "", coinColor: "#ffd700", flashColor: "rgba(255,215,0,0.25)",
    fontSize: 0,
  },
  big: {
    label: "BIG WIN",
    coins: 16, spread: 200, arcH: 130, coinDuration: 1.4,
    autoDismiss: 3500,
    borderColor: "#ffd700", glowColor: "rgba(255,215,0,0.35)",
    bgGrad: "linear-gradient(135deg, #1a1200 0%, #0c0c00 100%)",
    coinColor: "#ffd700", flashColor: "rgba(255,215,0,0.18)",
    fontSize: 64,
  },
  mega: {
    label: "MEGA WIN",
    coins: 24, spread: 240, arcH: 160, coinDuration: 1.6,
    autoDismiss: 4500,
    borderColor: "#00e5ff", glowColor: "rgba(0,229,255,0.35)",
    bgGrad: "linear-gradient(135deg, #001820 0%, #000c14 100%)",
    coinColor: "#00e5ff", flashColor: "rgba(0,229,255,0.15)",
    fontSize: 64,
  },
  super: {
    label: "SUPER WIN",
    coins: 32, spread: 280, arcH: 190, coinDuration: 1.8,
    autoDismiss: 5500,
    borderColor: "#c084fc", glowColor: "rgba(192,132,252,0.35)",
    bgGrad: "linear-gradient(135deg, #0e0022 0%, #06000f 100%)",
    coinColor: "#c084fc", flashColor: "rgba(192,132,252,0.15)",
    fontSize: 72,
  },
  sensational: {
    label: "SENSATIONAL!",
    coins: 48, spread: 320, arcH: 220, coinDuration: 2.0,
    autoDismiss: 7000,
    borderColor: "#ffffff", glowColor: "rgba(255,255,255,0.4)",
    bgGrad: "linear-gradient(135deg, #180025 0%, #08000e 100%)",
    coinColor: "#ffd700", flashColor: "rgba(255,255,255,0.15)",
    fontSize: 80,
  },
};

export function getWinDisplayTier(multiplier: number): WinTierSfx {
  if (multiplier >= 500) return "sensational";
  if (multiplier >= 100) return "super";
  if (multiplier >= 50)  return "mega";
  if (multiplier >= 20)  return "big";
  return "small";
}

// ── Arc coin particle ───────────────────────────────────────────────────────────

interface ArcCoinProps {
  angle: number;
  distance: number;
  arcH: number;
  arcHExtra: number;
  duration: number;
  delay: number;
  color: string;
  size: number;
}

function ArcCoin({ angle, distance, arcH, arcHExtra, duration, delay, color, size }: ArcCoinProps) {
  const rad     = (angle * Math.PI) / 180;
  const xTarget = Math.cos(rad) * distance;
  const yTarget = Math.sin(rad) * distance;

  return (
    <motion.div
      style={{
        position: "absolute",
        width: size, height: size,
        left: "50%", top: "50%",
        marginLeft: -(size / 2), marginTop: -(size / 2),
        borderRadius: "50%",
        background: `radial-gradient(circle at 38% 32%, ${color} 0%, ${color}88 50%, #7a5500 100%)`,
        boxShadow: `0 0 6px ${color}77`,
        pointerEvents: "none",
      }}
      initial={{ x: 0, y: 0, opacity: 0.9, scale: 0.5, rotate: 0 }}
      animate={{
        x: xTarget,
        y: [0, -(arcH + arcHExtra), yTarget + 50],
        opacity: [0.9, 1, 1, 0.6, 0],
        scale: [0.5, 1.1, 0.85],
        rotate: 540,
      }}
      transition={{
        delay,
        duration,
        x: { ease: "linear", duration, delay },
        y: { times: [0, 0.32, 1], ease: ["easeOut", "easeIn"], duration, delay },
        opacity: { times: [0, 0.08, 0.65, 0.88, 1], duration, delay },
        scale: { duration: duration * 0.45, ease: "easeOut", delay },
        rotate: { ease: "linear", duration, delay },
      }}
    />
  );
}

// ── Count-up hook ───────────────────────────────────────────────────────────────

function useCountUp(target: number, durationMs: number): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (durationMs <= 0) { setVal(target); return; }
    let raf: number;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / durationMs, 1);
      setVal(Math.floor((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

// ── WinPresenter ────────────────────────────────────────────────────────────────

interface Props {
  payoutUsdc: number;   // micro-USDC (÷ 1_000_000 = dollars)
  betUsdc: number;      // micro-USDC bet; 0 for free spin
  themeId: ThemeId;
  onDismiss: () => void;
  onCoinPing?: () => void;
}

export function WinPresenter({ payoutUsdc, betUsdc, themeId: _themeId, onDismiss, onCoinPing }: Props) {
  const rawMult = betUsdc > 0 ? payoutUsdc / betUsdc : 20;
  const mult    = Math.round(rawMult);
  const tier    = getWinDisplayTier(mult);
  const cfg     = TIERS[tier];

  const usdcCents = useCountUp(Math.round(payoutUsdc / 10_000), tier === "small" ? 0 : 1200);
  const displayStr = `$${(usdcCents / 100).toFixed(2)}`;

  useEffect(() => {
    const t = setTimeout(onDismiss, cfg.autoDismiss);
    return () => clearTimeout(t);
  }, [cfg.autoDismiss, onDismiss]);

  useEffect(() => {
    if (!onCoinPing || cfg.coins === 0) return;
    const pings    = Math.min(cfg.coins, 8);
    const interval = (cfg.coinDuration * 1000) / pings;
    let count = 0;
    const id = setInterval(() => {
      onCoinPing();
      if (++count >= pings) clearInterval(id);
    }, interval);
    return () => clearInterval(id);
  }, [onCoinPing, cfg.coins, cfg.coinDuration]);

  // Stable random coin positions — computed once per mount
  const [coins] = useState(() =>
    Array.from({ length: cfg.coins }, (_, i) => ({
      angle:     (i / cfg.coins) * 360 + Math.random() * (360 / cfg.coins),
      distance:  cfg.spread * (0.6 + Math.random() * 0.4),
      arcHExtra: Math.random() * 40,
      size:      14 + Math.floor(Math.random() * 8),
      delay:     Math.random() * 0.35,
    })),
  );

  // ── Small: floating text, no overlay ────────────────────────────────────────
  if (tier === "small") {
    return (
      <motion.div
        initial={{ y: 0, opacity: 1, scale: 1 }}
        animate={{ y: -80, opacity: 0, scale: 1.5 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="pointer-events-none text-center"
      >
        <div style={{
          fontFamily: "Orbitron, sans-serif", fontSize: 30, fontWeight: 900,
          color: "#ffd700",
          textShadow: "0 0 24px rgba(255,215,0,0.9), 0 0 50px rgba(255,215,0,0.4)",
        }}>
          ×{mult}
        </div>
        <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: 13, color: "rgba(255,215,0,0.7)", marginTop: 2 }}>
          {displayStr}
        </div>
      </motion.div>
    );
  }

  // ── Big / Mega / Super / Sensational: full overlay ──────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        key="win-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer select-none"
        style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(5px)" }}
        onClick={onDismiss}
      >
        {/* Screen flash */}
        <motion.div
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.65 }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: cfg.flashColor }}
        />

        {/* Win card */}
        <motion.div
          initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="relative text-center px-14 py-10 rounded-3xl"
          style={{
            background: cfg.bgGrad,
            border: `2px solid ${cfg.borderColor}`,
            boxShadow: `0 0 70px ${cfg.glowColor}, 0 0 140px ${cfg.glowColor}55, inset 0 0 50px ${cfg.glowColor}18`,
            minWidth: 330,
            overflow: "visible",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Coin arc burst — emanates from card center */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 30, overflow: "visible" }}
          >
            {coins.map((c, i) => (
              <ArcCoin
                key={i}
                angle={c.angle}
                distance={c.distance}
                arcH={cfg.arcH}
                arcHExtra={c.arcHExtra}
                duration={cfg.coinDuration}
                delay={c.delay}
                color={cfg.coinColor}
                size={c.size}
              />
            ))}
          </div>

          {/* Pulsing outer ring for sensational only */}
          {tier === "sensational" && (
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              animate={{
                boxShadow: [
                  `0 0 0px ${cfg.borderColor}00`,
                  `0 0 40px ${cfg.borderColor}`,
                  `0 0 0px ${cfg.borderColor}00`,
                ],
              }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
          )}

          {/* Tier label */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            style={{
              fontFamily: "Orbitron, sans-serif", fontSize: 11, fontWeight: 900,
              letterSpacing: "0.4em", color: cfg.borderColor, marginBottom: 16,
            }}
          >
            {cfg.label}
          </motion.div>

          {/* Multiplier pop */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.45 }}
            style={{
              fontFamily: "Orbitron, sans-serif", fontSize: cfg.fontSize,
              fontWeight: 900, lineHeight: 1, color: "#fff",
              textShadow: `0 0 30px ${cfg.glowColor}, 0 0 60px ${cfg.glowColor}88`,
              marginBottom: 16,
            }}
          >
            ×{mult}
          </motion.div>

          {/* Payout count-up */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32 }}
            style={{
              fontFamily: "Orbitron, sans-serif", fontSize: 26, fontWeight: 700,
              color: cfg.borderColor, textShadow: `0 0 18px ${cfg.glowColor}`,
            }}
          >
            {displayStr}
          </motion.div>

          <div style={{
            fontFamily: "Orbitron, sans-serif", fontSize: 10,
            letterSpacing: "0.3em", opacity: 0.25, marginTop: 24,
          }}>
            TAP TO CONTINUE
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
