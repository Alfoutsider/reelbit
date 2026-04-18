"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Flame, Clock, TrendingUp, Rocket, Shield, Zap, Trophy, Lock } from "lucide-react";
import Link from "next/link";
import { SlotCard } from "@/components/slot/SlotCard";
import { cn } from "@/lib/utils";
import type { SlotToken } from "@/types/slot";

const MOCK_SLOTS: SlotToken[] = [
  { mint: "So11111111111111111111111111111111111111112", name: "Dragon Hoard", ticker: "DHOARD", imageUri: "", model: "FiveReelFreeSpins", creator: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", graduated: false, mcapUsd: 84_200, priceUsd: 0.0000842, volume24h: 12_400, createdAt: Date.now() - 3600 * 3 * 1000 },
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", name: "Lucky Lotus", ticker: "LOTUS", imageUri: "", model: "Standard5Reel", creator: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", graduated: true, mcapUsd: 100_000, priceUsd: 0.0001, volume24h: 88_000, createdAt: Date.now() - 3600 * 48 * 1000 },
  { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", name: "Neon Cactus", ticker: "CACTUS", imageUri: "", model: "Classic3Reel", creator: "3h1zGmCwsRJnVk5BuRNMLsPaQu1y2eSjmaXBBXBbYVL", graduated: false, mcapUsd: 22_100, priceUsd: 0.0000221, volume24h: 5_800, createdAt: Date.now() - 3600 * 12 * 1000 },
  { mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", name: "Cyber Samurai", ticker: "CYBER", imageUri: "", model: "FiveReelFreeSpins", creator: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH", graduated: false, mcapUsd: 51_750, priceUsd: 0.0000518, volume24h: 31_200, createdAt: Date.now() - 3600 * 6 * 1000 },
  { mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", name: "Phantom Reels", ticker: "PHNTM", imageUri: "", model: "Standard5Reel", creator: "5yFBDjZzq9e2nK7hpKDWePvhWfhXSGGnBpW5MqERvKKC", graduated: false, mcapUsd: 38_900, priceUsd: 0.0000389, volume24h: 9_600, createdAt: Date.now() - 3600 * 2 * 1000 },
  { mint: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", name: "Gold Rush", ticker: "GRUSH", imageUri: "", model: "Classic3Reel", creator: "BrEAK7zGZ6dM71zUDACDqJnekihmwF15noTddWTsknjC", graduated: false, mcapUsd: 91_400, priceUsd: 0.0000914, volume24h: 44_800, createdAt: Date.now() - 3600 * 1 * 1000 },
  { mint: "kinXdEcpDQeHPEuQnqmUgtYykqKCSVreKzpTfa6SJHu", name: "Astro Jackpot", ticker: "ASTR", imageUri: "", model: "FiveReelFreeSpins", creator: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bev", graduated: false, mcapUsd: 14_200, priceUsd: 0.0000142, volume24h: 2_300, createdAt: Date.now() - 3600 * 18 * 1000 },
  { mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1Adv1234", name: "Orca Slots", ticker: "ORCA", imageUri: "", model: "Standard5Reel", creator: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", graduated: false, mcapUsd: 67_500, priceUsd: 0.0000675, volume24h: 19_100, createdAt: Date.now() - 3600 * 9 * 1000 },
];

const FEATURES = [
  { icon: Shield, title: "Provably Fair",  desc: "On-chain HMAC-SHA256 RNG. Every spin verifiable on Solana." },
  { icon: Zap,    title: "Instant Launch", desc: "Deploy your token in seconds. Zero cost. Zero code." },
  { icon: Trophy, title: "25% Revenue",    desc: "Earn 25% of all casino GGR and trading fees forever." },
  { icon: Lock,   title: "96% RTP",        desc: "Return-to-player enforced by smart contract. Always fair." },
];

type SortMode = "trending" | "new" | "graduating";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("trending");

  const filtered = MOCK_SLOTS
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.ticker.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "trending")   return b.volume24h - a.volume24h;
      if (sort === "new")        return b.createdAt - a.createdAt;
      if (sort === "graduating") return b.mcapUsd - a.mcapUsd;
      return 0;
    });

  return (
    <div className="relative">
      <div className="grid-overlay opacity-50" />

      {/* Hero */}
      <section className="relative px-4 pt-20 pb-16 text-center overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="relative max-w-3xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-gold/5 border border-gold/20 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-gold" />
            <span className="font-orbitron text-[10px] font-bold text-gold/80 tracking-widest">PUMP.FUN MEETS VEGAS — ON SOLANA</span>
          </motion.div>

          <h1 className="font-orbitron text-4xl md:text-6xl font-black leading-[1.1] tracking-tight">
            <span className="grad-text">Launch a Slot.</span>
            <br />
            <span className="text-white">Graduate to the</span>
            <br />
            <span className="gold-text">Casino.</span>
          </h1>

          <p className="text-white/50 text-lg font-rajdhani max-w-xl mx-auto leading-relaxed">
            Create your slot machine token for free. Reach <span className="text-white/80 font-bold">$100k market cap</span> and your
            slot goes live on reelbit.casino — earning you <span className="text-gold font-bold">25% of all fees forever.</span>
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
            <Link href="/launch">
              <motion.button whileHover={{ scale: 1.04, boxShadow: "0 0 32px rgba(139,92,246,0.6)" }} whileTap={{ scale: 0.97 }}
                className="btn-launch flex items-center gap-2.5 px-7 py-3.5 text-[13px]">
                <Rocket size={16} /> LAUNCH YOUR SLOT
              </motion.button>
            </Link>
            <a href="https://reelbit.casino" target="_blank" rel="noopener noreferrer">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="btn-ghost flex items-center gap-2 px-7 py-3.5 text-[13px] font-rajdhani font-bold">
                <Zap size={14} className="text-gold" /> Play Casino
              </motion.button>
            </a>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-8 pt-4 flex-wrap">
            {[{ label: "Tokens Launched", value: "2,847" }, { label: "Total Volume", value: "$4.2M" }, { label: "Graduated", value: "312" }].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="font-orbitron text-xl font-black gold-text">{value}</p>
                <p className="text-[10px] text-white/30 font-orbitron tracking-widest uppercase mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-4 py-8 border-y border-white/5">
        <div className="mx-auto max-w-7xl grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07 }}
              className="flex gap-3 items-start p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Icon size={15} className="text-purple-400" />
              </div>
              <div>
                <p className="font-orbitron text-[11px] font-bold text-white/80 tracking-wide">{title}</p>
                <p className="text-[11px] text-white/35 font-rajdhani mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Explore */}
      <section className="mx-auto max-w-7xl px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-orbitron text-xl font-bold text-white tracking-wide">All Slots</h2>
            <p className="text-[11px] text-white/30 font-orbitron tracking-wider mt-0.5">{filtered.length} TOKENS</p>
          </div>
          <Link href="/launch">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="btn-gold flex items-center gap-2 text-[11px] px-4 py-2.5">
              <Rocket size={12} /> NEW TOKEN
            </motion.button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ticker…" className="input-casino pl-10 text-[13px]" />
          </div>
          <div className="flex gap-2">
            {([
              { id: "trending", label: "Trending", icon: Flame },
              { id: "new", label: "New", icon: Clock },
              { id: "graduating", label: "Graduating", icon: TrendingUp },
            ] as const).map(({ id, label, icon: Icon }) => (
              <motion.button key={id} whileTap={{ scale: 0.96 }} onClick={() => setSort(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold font-rajdhani transition-all",
                  sort === id ? "bg-purple-600 text-white" : "bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.07] border border-white/5"
                )}>
                <Icon size={12} />{label}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((slot, i) => <SlotCard key={slot.mint} slot={slot} index={i} />)}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20">
              <p className="font-orbitron text-sm text-white/20 tracking-widest">NO SLOTS FOUND</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
