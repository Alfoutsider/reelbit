"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Flame, Clock, TrendingUp, Rocket, Shield, Zap, Trophy, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { SlotCard } from "@/components/slot/SlotCard";
import { cn } from "@/lib/utils";
import type { SlotToken } from "@/types/slot";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const FEATURES = [
  { icon: Shield, title: "Provably Fair",  desc: "On-chain HMAC-SHA256 RNG. Every spin verifiable on Solana." },
  { icon: Zap,    title: "Instant Launch", desc: "Deploy your token in seconds. Zero cost. Zero code." },
  { icon: Trophy, title: "25% Revenue",    desc: "Earn 25% of all casino GGR and trading fees forever." },
  { icon: Lock,   title: "96% RTP",        desc: "Return-to-player enforced by smart contract. Always fair." },
];

type SortMode = "trending" | "new" | "graduating";

export default function HomePage() {
  const [slots,   setSlots]   = useState<SlotToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState<SortMode>("trending");

  useEffect(() => {
    fetch(`${API_URL}/tokens`)
      .then((r) => {
        if (!r.ok) throw new Error("API unavailable");
        return r.json();
      })
      .then((data: SlotToken[]) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = slots
    .filter((s) => {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === "trending")   return (b.volume24h ?? 0) - (a.volume24h ?? 0);
      if (sort === "new")        return b.createdAt - a.createdAt;
      if (sort === "graduating") return (b.mcapUsd ?? 0) - (a.mcapUsd ?? 0);
      return 0;
    });

  const totalVol   = slots.reduce((s, t) => s + (t.volume24h ?? 0), 0);
  const graduated  = slots.filter((t) => t.graduated).length;

  return (
    <div className="relative">
      <div className="grid-overlay opacity-50" />

      {/* Hero */}
      <section className="relative px-4 pt-20 pb-16 text-center overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-[rgba(196,30,30,0.07)] via-transparent to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-3xl mx-auto space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: "rgba(196,30,30,0.07)", border: "1px solid rgba(196,30,30,0.2)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-gold" style={{ background: "var(--brand-red)" }} />
            <span className="font-orbitron text-[10px] font-bold tracking-widest" style={{ color: "var(--brand-red-light)" }}>
              PUMP.FUN MEETS VEGAS — ON SOLANA
            </span>
          </motion.div>

          <h1 className="font-orbitron text-4xl md:text-6xl font-black leading-[1.1] tracking-tight">
            <span className="grad-text">Launch a Slot.</span>
            <br />
            <span className="text-white">Graduate to the</span>
            <br />
            <span className="gold-text">Casino.</span>
          </h1>

          <p className="text-white/50 text-lg font-rajdhani max-w-xl mx-auto leading-relaxed">
            Create your slot machine token for free. Reach{" "}
            <span className="text-white/80 font-bold">85 SOL</span> on the bonding curve and
            your slot goes live on reelbit.casino — earning you{" "}
            <span className="text-gold font-bold">25% of all fees forever.</span>
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
            <Link href="/launch">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 0 32px rgba(196,30,30,0.6)" }}
                whileTap={{ scale: 0.97 }}
                className="btn-launch flex items-center gap-2.5 px-7 py-3.5 text-[13px]"
              >
                <Rocket size={16} /> LAUNCH YOUR SLOT
              </motion.button>
            </Link>
            <a href="https://reelbit-casino.vercel.app" target="_blank" rel="noopener noreferrer">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="btn-ghost flex items-center gap-2 px-7 py-3.5 text-[13px] font-rajdhani font-bold"
              >
                <Zap size={14} className="text-gold" /> Play Casino
              </motion.button>
            </a>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-8 pt-4 flex-wrap"
          >
            {[
              { label: "Tokens Live",   value: loading ? "…" : String(slots.length) },
              { label: "Total Volume",  value: loading ? "…" : totalVol > 0 ? `$${(totalVol / 1000).toFixed(1)}k` : "—" },
              { label: "Graduated",     value: loading ? "…" : String(graduated) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="font-orbitron text-xl font-black gold-text">{value}</p>
                <p className="text-[10px] text-white/30 font-orbitron tracking-widest uppercase mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features strip */}
      <section className="px-4 py-8 border-y border-white/5">
        <div className="mx-auto max-w-7xl grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              className="flex gap-3 items-start p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(196,30,30,0.08)", border: "1px solid rgba(196,30,30,0.2)" }}>
                <Icon size={15} style={{ color: "var(--brand-red-light)" }} />
              </div>
              <div>
                <p className="font-orbitron text-[11px] font-bold text-white/80 tracking-wide">{title}</p>
                <p className="text-[11px] text-white/35 font-rajdhani mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Slot explorer */}
      <section className="mx-auto max-w-7xl px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-orbitron text-xl font-bold text-white tracking-wide">All Slots</h2>
            <p className="text-[11px] text-white/30 font-orbitron tracking-wider mt-0.5">
              {loading ? "Loading…" : `${filtered.length} TOKENS`}
            </p>
          </div>
          <Link href="/launch">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-gold flex items-center gap-2 text-[11px] px-4 py-2.5"
            >
              <Rocket size={12} /> NEW TOKEN
            </motion.button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ticker…"
              className="input-casino pl-10 text-[13px]"
            />
          </div>
          <div className="flex gap-2">
            {([
              { id: "trending",   label: "Trending",   icon: Flame     },
              { id: "new",        label: "New",         icon: Clock     },
              { id: "graduating", label: "Graduating",  icon: TrendingUp },
            ] as const).map(({ id, label, icon: Icon }) => (
              <motion.button
                key={id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSort(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold font-rajdhani transition-all",
                  sort === id
                    ? "text-white"
                    : "bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.07] border border-white/5",
                )}
                style={sort === id ? { background: "var(--brand-red)" } : {}}
              >
                <Icon size={12} /> {label}
              </motion.button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/25">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading tokens…
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-24 space-y-4">
            <p className="font-orbitron text-sm text-white/20 tracking-widest">
              {slots.length === 0 ? "NO TOKENS YET" : "NO RESULTS"}
            </p>
            {slots.length === 0 && (
              <Link href="/launch">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  className="btn-launch inline-flex items-center gap-2 px-6 py-3 text-[12px] mt-2"
                >
                  <Rocket size={14} /> Be the first to launch
                </motion.button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((slot, i) => (
              <SlotCard key={slot.mint} slot={slot} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
