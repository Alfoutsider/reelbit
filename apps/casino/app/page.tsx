"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Flame, Star, Trophy, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SlotEntry {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  slotModel: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  heroImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
  isDemo: boolean;
  isGraduated: boolean;
}

// ── Demo slots (always available) ─────────────────────────────────────────────

const DEMO_SLOTS: SlotEntry[] = [
  {
    mint: "So11111111111111111111111111111111111111112",
    tokenName: "Lucky 7s",
    tokenSymbol: "L7",
    slotModel: "Classic3Reel",
    heroImageUrl: null,
    primaryColor: "#d4a017",
    accentColor: "#8b5cf6",
    isDemo: true,
    isGraduated: false,
  },
  {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    tokenName: "Neon Joker",
    tokenSymbol: "JOKER",
    slotModel: "Standard5Reel",
    heroImageUrl: null,
    primaryColor: "#06b6d4",
    accentColor: "#8b5cf6",
    isDemo: true,
    isGraduated: false,
  },
  {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    tokenName: "Dragon's Fortune",
    tokenSymbol: "DRAG",
    slotModel: "FiveReelFreeSpins",
    heroImageUrl: null,
    primaryColor: "#ef4444",
    accentColor: "#d4a017",
    isDemo: true,
    isGraduated: false,
  },
  {
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    tokenName: "Diamond Rush",
    tokenSymbol: "DIAM",
    slotModel: "Standard5Reel",
    heroImageUrl: null,
    primaryColor: "#60a5fa",
    accentColor: "#e2e8f0",
    isDemo: true,
    isGraduated: false,
  },
  {
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    tokenName: "Phantom Reels",
    tokenSymbol: "PHNTM",
    slotModel: "FiveReelFreeSpins",
    heroImageUrl: null,
    primaryColor: "#a855f7",
    accentColor: "#ec4899",
    isDemo: true,
    isGraduated: false,
  },
  {
    mint: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
    tokenName: "Gold Rush",
    tokenSymbol: "GRUSH",
    slotModel: "Classic3Reel",
    heroImageUrl: null,
    primaryColor: "#f5c842",
    accentColor: "#ef4444",
    isDemo: true,
    isGraduated: false,
  },
];

const MODEL_LABEL: Record<string, string> = {
  Classic3Reel:      "3-Reel",
  Standard5Reel:     "5-Reel",
  FiveReelFreeSpins: "5-Reel + Free",
};

type Filter = "all" | "demo" | "graduated";
type SortMode = "featured" | "new" | "name";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CasinoLobby() {
  const [graduatedSlots, setGraduatedSlots] = useState<SlotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortMode>("featured");

  useEffect(() => {
    fetch(`${API_URL}/themes/graduated`)
      .then((r) => r.json())
      .then((data: Array<{ mint: string; tokenName: string; tokenSymbol: string; slotModel: string; heroImageUrl: string | null; primaryColor: string; accentColor: string }>) =>
        setGraduatedSlots(
          data.map((t) => ({
            ...t,
            slotModel: t.slotModel as SlotEntry["slotModel"],
            isDemo: false,
            isGraduated: true,
          })),
        ),
      )
      .catch(() => setGraduatedSlots([]))
      .finally(() => setLoading(false));
  }, []);

  const allSlots: SlotEntry[] = [...graduatedSlots, ...DEMO_SLOTS];

  const filtered = allSlots
    .filter((s) => {
      const matchSearch =
        s.tokenName.toLowerCase().includes(search.toLowerCase()) ||
        s.tokenSymbol.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "demo" && s.isDemo) ||
        (filter === "graduated" && s.isGraduated);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sort === "name") return a.tokenName.localeCompare(b.tokenName);
      // graduated first, then demo
      if (sort === "featured" || sort === "new") {
        if (a.isGraduated !== b.isGraduated) return a.isGraduated ? -1 : 1;
      }
      return 0;
    });

  return (
    <div className="min-h-screen">
      {/* Ambient orbs */}
      <div className="orb w-96 h-96 bg-purple-600/8 top-20 -left-32" style={{ animationDelay: "0s" }} />
      <div className="orb w-64 h-64 bg-cyan-500/5 bottom-40 right-10" style={{ animationDelay: "4s" }} />

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 pt-4">
          <h1 className="font-orbitron text-3xl md:text-4xl font-black tracking-tight">
            <span className="gold-text">Casino</span>{" "}
            <span className="text-white">Lobby</span>
          </h1>
          <p className="text-white/35 text-sm font-rajdhani max-w-lg mx-auto">
            Deposit SOL, pick a slot, and spin. 96% RTP enforced. Every result verifiable on-chain.
          </p>
          <div className="flex items-center justify-center gap-6 pt-1">
            {[
              { label: "Live Slots", value: String(allSlots.length) },
              { label: "Graduated", value: String(graduatedSlots.length) },
              { label: "RTP", value: "96%" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="font-orbitron text-lg font-black gold-text">{value}</p>
                <p className="text-[10px] text-white/25 font-orbitron tracking-widest uppercase">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slots…"
              className="input-casino pl-10 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: "all" as Filter,       label: "All",       icon: <Zap size={11} /> },
              { id: "graduated" as Filter, label: "Graduated", icon: <Trophy size={11} /> },
              { id: "demo" as Filter,      label: "Demo",      icon: <Star size={11} /> },
            ]).map(({ id, label, icon }) => (
              <button key={id} onClick={() => setFilter(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-bold font-rajdhani transition-all",
                  filter === id ? "bg-purple-600 text-white" : "bg-white/[0.04] text-white/40 hover:text-white border border-white/5",
                )}>
                {icon} {label}
              </button>
            ))}
            <div className="flex gap-1 ml-auto sm:ml-0">
              {([
                { id: "featured" as SortMode, label: "Featured" },
                { id: "name" as SortMode,     label: "A–Z" },
              ]).map(({ id, label }) => (
                <button key={id} onClick={() => setSort(id)}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-[11px] font-bold font-rajdhani transition-all",
                    sort === id ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50",
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Graduated section header */}
        {filter !== "demo" && graduatedSlots.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
            <span className="badge badge-graduated font-orbitron text-[10px]">
              <Flame size={10} /> GRADUATED FROM REELBIT.FUN
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-green-500/20 to-transparent" />
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/25">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-orbitron text-sm text-white/20 tracking-widest">NO SLOTS FOUND</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((slot, i) => <SlotCard key={slot.mint} slot={slot} index={i} />)}
          </div>
        )}

        {/* Demo slots section */}
        {filter !== "graduated" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] font-orbitron text-white/20 tracking-widest">FEATURED DEMO SLOTS</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Slot Card ─────────────────────────────────────────────────────────────────

function SlotCard({ slot, index }: { slot: SlotEntry; index: number }) {
  const symbolFallback = slot.tokenSymbol.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link href={`/slot/${slot.mint}`} className="block h-full">
        <div className="card-slot h-full cursor-pointer"
          style={{ "--hover-color": slot.primaryColor } as React.CSSProperties}>
          {/* Art area */}
          <div
            className="h-40 relative overflow-hidden slot-img-placeholder"
            style={{ background: `linear-gradient(135deg, ${slot.primaryColor}20, ${slot.accentColor}15, #0a0a18)` }}
          >
            {slot.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.heroImageUrl} alt={slot.tokenName}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center font-orbitron text-2xl font-black"
                  style={{ background: `${slot.primaryColor}25`, color: slot.primaryColor, boxShadow: `0 0 32px ${slot.primaryColor}30` }}
                >
                  {symbolFallback}
                </div>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex gap-1.5">
              {slot.isGraduated && (
                <span className="badge badge-graduated text-[9px]">
                  <Flame size={9} /> LIVE
                </span>
              )}
              {slot.isDemo && (
                <span className="badge badge-gold text-[9px]">
                  <Star size={9} /> DEMO
                </span>
              )}
            </div>

            {/* Model badge */}
            <div className="absolute top-2.5 right-2.5">
              <span className="badge badge-model text-[9px]">{MODEL_LABEL[slot.slotModel]}</span>
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[#12122a] to-transparent" />
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-orbitron text-sm font-bold text-white/90 leading-tight">{slot.tokenName}</p>
                <p className="text-[11px] text-white/35 font-rajdhani">${slot.tokenSymbol}</p>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-xl text-center text-[11px] font-orbitron font-bold tracking-wider transition-all"
              style={{ background: `${slot.primaryColor}20`, color: slot.primaryColor, border: `1px solid ${slot.primaryColor}30` }}
            >
              PLAY NOW
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
