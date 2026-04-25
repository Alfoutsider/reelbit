"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  username: string;
  onDone:   () => void;
}

const SYMBOLS = ["🍒", "💎", "⭐", "7️⃣", "🎰", "🍋", "🔔", "💰"];
const CELL    = 60; // px per symbol

// ── Single reel ───────────────────────────────────────────────────────────────

interface ReelProps {
  final: string;
  delay: number;
  onStop: () => void;
}

function Reel({ final, delay, onStop }: ReelProps) {
  const [idx, setIdx]     = useState(0);       // displayed symbol index
  const [stopped, setStopped] = useState(false);

  // Spin: cycle through symbols quickly, then land on final
  useEffect(() => {
    const spinInterval = setInterval(() => {
      setIdx((i) => (i + 1) % SYMBOLS.length);
    }, 80);

    const stopTimeout = setTimeout(() => {
      clearInterval(spinInterval);
      setIdx(SYMBOLS.indexOf(final) === -1 ? 0 : SYMBOLS.indexOf(final));
      setStopped(true);
      onStop();
    }, delay);

    return () => { clearInterval(spinInterval); clearTimeout(stopTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once

  const symbol = SYMBOLS[idx];

  return (
    <motion.div
      className="relative flex items-center justify-center rounded-xl overflow-hidden"
      style={{
        width: 72, height: CELL,
        background: "#07070f",
        border: `1px solid ${stopped ? "rgba(212,160,23,0.8)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: stopped ? "0 0 18px rgba(212,160,23,0.4) inset" : "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}>
      <AnimatePresence mode="popLayout">
        <motion.div key={`${idx}-${stopped}`}
          initial={{ y: -CELL * 0.6, opacity: 0 }}
          animate={{ y: 0,           opacity: 1 }}
          exit={{   y:  CELL * 0.6,  opacity: 0 }}
          transition={{ duration: stopped ? 0.25 : 0.07, ease: stopped ? "backOut" : "linear" }}
          className="text-3xl select-none">
          {symbol}
        </motion.div>
      </AnimatePresence>

      {/* Top/bottom shade */}
      <div className="absolute inset-x-0 top-0 h-4 pointer-events-none"
        style={{ background: "linear-gradient(#07070f,transparent)" }} />
      <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none"
        style={{ background: "linear-gradient(transparent,#07070f)" }} />
    </motion.div>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const particles = Array.from({ length: 24 });
  const colors = ["#d4a017", "#f5c842", "#c41e1e", "#e84444", "#fff", "#06b6d4"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {particles.map((_, i) => (
        <motion.div key={i}
          className="absolute rounded-sm"
          style={{
            width: 5 + (i % 4) * 2,
            height: 5 + (i % 3),
            background: colors[i % colors.length],
            left: `${5 + (i * 17.3) % 90}%`,
            top: "0%",
          }}
          initial={{ y: -20, opacity: 1, rotate: 0, x: 0 }}
          animate={{
            y: 320,
            opacity: [1, 1, 0.8, 0],
            rotate: 360 * (i % 2 === 0 ? 1 : -1),
            x: ((i % 5) - 2) * 35,
          }}
          transition={{
            duration: 2.2 + (i % 4) * 0.3,
            delay: (i * 0.06) % 0.9,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SuccessAnimation({ username, onDone }: Props) {
  const [stopped, setStopped]     = useState(0);
  const [showJackpot, setJackpot] = useState(false);
  const [showWelcome, setWelcome] = useState(false);
  const [showBtn, setBtn]         = useState(false);

  const allStopped = stopped >= 3;

  useEffect(() => {
    if (!allStopped) return;
    const t1 = setTimeout(() => setJackpot(true),  200);
    const t2 = setTimeout(() => setWelcome(true),  600);
    const t3 = setTimeout(() => setBtn(true),     1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [allStopped]);

  // stable callback so Reel's effect doesn't re-run
  const onStop = useCallback(() => setStopped((n) => n + 1), []);

  return (
    <div className="relative flex flex-col items-center gap-7 py-4">

      {/* Logo */}
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="ReelBit" className="w-11 h-11 object-contain" />
        <span className="font-rajdhani text-2xl font-bold">
          <span className="text-white">Reel</span>
          <span style={{ color: "var(--brand-red)" }}>Bit</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>.fun</span>
        </span>
      </motion.div>

      {/* Slot machine frame */}
      <div className="relative">
        {/* Machine body */}
        <div className="rounded-2xl p-5 flex flex-col items-center gap-4"
          style={{
            background: "linear-gradient(145deg,#140404,#0f0f1e)",
            border: "2px solid rgba(196,30,30,0.35)",
            boxShadow: "0 0 50px rgba(196,30,30,0.15), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>

          {/* LED dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                style={{ background: allStopped ? "var(--gold)" : "rgba(255,255,255,0.1)" }}
                animate={allStopped ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ delay: i * 0.1, duration: 0.5, repeat: Infinity }} />
            ))}
          </div>

          {/* Reels row */}
          <div className="flex gap-3">
            {(["7️⃣", "7️⃣", "7️⃣"] as const).map((sym, i) => (
              <Reel key={i} final={sym} delay={900 + i * 450} onStop={onStop} />
            ))}
          </div>

          {/* Payline */}
          <div className="w-full h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(212,160,23,0.6),transparent)" }} />

          {/* JACKPOT text */}
          <div style={{ minHeight: 28 }}>
            <AnimatePresence>
              {showJackpot && (
                <motion.p key="j"
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="font-orbitron text-lg font-black tracking-[0.25em] text-center"
                  style={{
                    background: "linear-gradient(135deg,#f5c842,#d4a017,#a07810)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 10px rgba(212,160,23,0.9))",
                  }}>
                  JACKPOT!
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Confetti */}
        {allStopped && <Confetti />}

        {/* Gold radial burst */}
        {allStopped && (
          <motion.div initial={{ scale: 0.5, opacity: 0.7 }} animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle,rgba(212,160,23,0.5),transparent 65%)" }} />
        )}
      </div>

      {/* Welcome message */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div key="w" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-1">
            <p className="font-orbitron text-base font-black text-white tracking-wide">
              Welcome, <span className="red-text">{username}</span>!
            </p>
            <p className="font-rajdhani text-white/40 text-sm">Your account is live. Play, trade, and earn.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <AnimatePresence>
        {showBtn && (
          <motion.button key="b" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={onDone} className="btn-launch px-8 py-3 text-sm tracking-widest">
            START PLAYING →
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
