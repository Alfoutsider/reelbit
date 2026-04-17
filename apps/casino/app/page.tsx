"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

// Placeholder — casino lobby will list graduated slots (Sprint 6)
export default function CasinoLobby() {
  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-8 text-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          reelbit.casino
        </div>
        <p className="text-white/40">On-chain slots with 96% RTP. No rug, no house tricks.</p>
      </motion.div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 max-w-sm w-full text-center space-y-4">
        <div className="text-white/50 text-sm">Demo slot — Sprint 6 adds the full lobby</div>
        <Link
          href="/slot/So11111111111111111111111111111111111111112"
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 rounded-xl py-3 font-semibold transition-colors"
        >
          <Zap size={16} /> Play Demo Slot
        </Link>
      </div>
    </div>
  );
}
