"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY  = "rb_fun_intro_seen";
const PARTICLE_CNT = 22;

// Deterministic particle positions
function particleProps(i: number) {
  const angle  = (i / PARTICLE_CNT) * 360;
  const dist   = 60 + ((i * 37) % 80);
  const rad    = (angle * Math.PI) / 180;
  const x      = Math.cos(rad) * dist;
  const y      = Math.sin(rad) * dist;
  const delay  = ((i * 83) % 600) / 1000;
  const size   = 3 + ((i * 17) % 5);
  return { x, y, delay, size };
}

export function IntroAnimation() {
  const [show,  setShow]  = useState(false);
  const [phase, setPhase] = useState<"rocket" | "burst" | "logo" | "done">("rocket");

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
    const t1 = setTimeout(() => setPhase("burst"), 700);
    const t2 = setTimeout(() => setPhase("logo"),  950);
    const t3 = setTimeout(() => setPhase("done"),  2300);
    const t4 = setTimeout(() => {
      setShow(false);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }, 2800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="fun-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, #0f0508 0%, #080008 100%)" }}
        >
          {/* Background grid pulse */}
          <motion.div
            animate={{ opacity: [0.03, 0.07, 0.03] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 grid-overlay"
          />

          {/* Rocket launch */}
          <AnimatePresence>
            {phase === "rocket" && (
              <motion.div
                key="rocket"
                initial={{ y: 60, opacity: 0, scale: 0.7 }}
                animate={{ y: -30, opacity: 1, scale: 1.1 }}
                exit={{ y: -120, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative flex flex-col items-center gap-2 select-none"
              >
                <div className="text-6xl">🚀</div>
                {/* Exhaust flame */}
                <motion.div
                  animate={{ scaleY: [1, 1.4, 0.8, 1.2, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                  className="w-3 rounded-full"
                  style={{ height: 24, background: "linear-gradient(180deg, #f97316, #ef4444, transparent)", marginTop: -4 }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Burst particles */}
          <AnimatePresence>
            {(phase === "burst" || phase === "logo" || phase === "done") && (
              <>
                {Array.from({ length: PARTICLE_CNT }).map((_, i) => {
                  const p = particleProps(i);
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{ x: p.x * 2.5, y: p.y * 2.5, opacity: 0, scale: 0.3 }}
                      transition={{ delay: p.delay, duration: 0.7, ease: "easeOut" }}
                      className="absolute rounded-full"
                      style={{
                        width:      p.size,
                        height:     p.size,
                        background: i % 3 === 0 ? "#c41e1e" : i % 3 === 1 ? "#f5c842" : "#ff6b35",
                        boxShadow:  `0 0 6px currentColor`,
                      }}
                    />
                  );
                })}
              </>
            )}
          </AnimatePresence>

          {/* Bonding curve fill + logo */}
          <AnimatePresence>
            {(phase === "logo" || phase === "done") && (
              <motion.div
                key="logo-reveal"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className="relative flex flex-col items-center gap-6 select-none"
              >
                {/* Bonding curve visual */}
                <div className="relative w-48 h-12 overflow-hidden rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,30,30,0.3)" }}>
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 rounded-xl"
                    style={{ background: "linear-gradient(90deg, #7f1d1d, #c41e1e, #ef4444)" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2">
                    <span className="font-orbitron text-[10px] font-bold text-white/70 tracking-widest">BONDING CURVE</span>
                    <span className="font-orbitron text-[10px] font-black text-white">85%</span>
                  </div>
                </div>

                {/* Wordmark */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                  className="text-center"
                >
                  <p className="font-orbitron text-3xl font-black tracking-wide">
                    <span style={{ color: "#ffffff" }}>Reel</span>
                    <span style={{ color: "#c41e1e" }}>Bit</span>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>.fun</span>
                  </p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="font-orbitron text-[11px] tracking-[0.3em] mt-1"
                    style={{ color: "rgba(196,30,30,0.7)" }}
                  >
                    LAUNCH · GRADUATE · EARN
                  </motion.p>
                </motion.div>

                {/* Glow */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -z-10 rounded-full"
                  style={{ width: 200, height: 200, background: "radial-gradient(circle, rgba(196,30,30,0.25), transparent 70%)" }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
