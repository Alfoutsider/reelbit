"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "rb_casino_intro_seen";
const COIN_COUNT  = 18;

// Deterministic coin positions seeded per index so SSR and client match
function coinProps(i: number) {
  const left   = ((i * 47 + 11) % 93) + 3.5;
  const delay  = ((i * 137) % 1200) / 1000;
  const dur    = 1.0 + ((i * 61) % 800) / 1000;
  const size   = 12 + ((i * 29) % 16);
  const spin   = i % 2 === 0 ? 360 : -360;
  return { left, delay, dur, size, spin };
}

export function IntroAnimation() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"coins" | "logo" | "done">("coins");

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { return; }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
      return;
    }

    setShow(true);
    const t1 = setTimeout(() => setPhase("logo"),  900);
    const t2 = setTimeout(() => setPhase("done"),  2400);
    const t3 = setTimeout(() => {
      setShow(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }, 2900);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="casino-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, #0d0d20 0%, #06060f 100%)" }}
        >
          {/* Coin rain */}
          {Array.from({ length: COIN_COUNT }).map((_, i) => {
            const p = coinProps(i);
            return (
              <motion.div
                key={i}
                initial={{ y: "-120%", rotate: 0, opacity: 0.9 }}
                animate={{ y: "120vh", rotate: p.spin, opacity: [0.9, 0.9, 0] }}
                transition={{ delay: p.delay, duration: p.dur, ease: "easeIn" }}
                className="absolute top-0 flex items-center justify-center rounded-full font-bold select-none"
                style={{
                  left:       `${p.left}%`,
                  width:      p.size,
                  height:     p.size,
                  fontSize:   p.size * 0.55,
                  background: "radial-gradient(circle at 35% 35%, #f5c842, #b8860b)",
                  boxShadow:  "0 0 8px rgba(212,160,23,0.6)",
                  color:      "#7a5000",
                }}
              >
                $
              </motion.div>
            );
          })}

          {/* Centre logo burst */}
          <AnimatePresence>
            {(phase === "logo" || phase === "done") && (
              <motion.div
                key="logo-burst"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative flex flex-col items-center gap-5 select-none pointer-events-none"
              >
                {/* Glow ring */}
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.15, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute rounded-full"
                  style={{ width: 180, height: 180, background: "radial-gradient(circle, rgba(212,160,23,0.3), transparent 70%)" }}
                />

                {/* Slot reels */}
                <div className="flex items-center gap-2">
                  {["🍒", "7️⃣", "💎"].map((sym, ri) => (
                    <motion.div
                      key={ri}
                      initial={{ y: -40, opacity: 0 }}
                      animate={{ y: 0,   opacity: 1 }}
                      transition={{ delay: ri * 0.08, duration: 0.35, ease: "easeOut" }}
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                      style={{
                        background: "linear-gradient(135deg, rgba(212,160,23,0.18), rgba(160,120,16,0.1))",
                        border:     "1px solid rgba(212,160,23,0.4)",
                        boxShadow:  "0 0 20px rgba(212,160,23,0.2)",
                      }}
                    >
                      {sym}
                    </motion.div>
                  ))}
                </div>

                {/* Wordmark */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="text-center"
                >
                  <p className="font-orbitron text-3xl font-black tracking-wide">
                    <span style={{ color: "#ffffff" }}>Reel</span>
                    <span style={{ color: "#f5c842" }}>Bit</span>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>.casino</span>
                  </p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="font-orbitron text-[11px] tracking-[0.3em] mt-1"
                    style={{ color: "rgba(212,160,23,0.6)" }}
                  >
                    PROVABLY FAIR · ON SOLANA
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
