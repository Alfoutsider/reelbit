"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Search, Trophy, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface GraduatedSlot {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  slotModel: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  heroImageUrl: string | null;
  bgImageUrl: string | null;
  primaryColor: string;
  accentColor: string;
  updatedAt: number;
}

const MODEL_LABEL: Record<string, string> = {
  Classic3Reel:      "3-Reel",
  Standard5Reel:     "5-Reel",
  FiveReelFreeSpins: "5-Reel + Free Spins",
};

type SortMode = "new" | "name";

export default function CasinoLobby() {
  const [slots, setSlots] = useState<GraduatedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("new");

  useEffect(() => {
    fetch(`${API_URL}/themes/graduated`)
      .then((r) => r.json())
      .then((data: GraduatedSlot[]) => setSlots(data))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = slots
    .filter(
      (s) =>
        s.tokenName.toLowerCase().includes(search.toLowerCase()) ||
        s.tokenSymbol.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "new" ? b.updatedAt - a.updatedAt : a.tokenName.localeCompare(b.tokenName),
    );

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <span className="font-black text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          reelbit.casino
        </span>
        <div className="flex items-center gap-1.5 text-green-400/70 text-xs">
          <Zap size={12} /> 96% RTP · Provably Fair
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Graduated Slots
          </h1>
          <p className="text-white/40 text-sm">
            Every slot here hit $100k market cap on reelbit.fun — now live forever.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ticker…"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-500/50"
            />
          </div>
          <div className="flex gap-2">
            {([
              { id: "new" as const, label: "Newest", icon: Clock },
              { id: "name" as const, label: "A–Z", icon: Trophy },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSort(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
                  sort === id
                    ? "bg-purple-600 text-white"
                    : "bg-white/[0.04] text-white/40 hover:text-white border border-white/5",
                )}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/30">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading slots…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <p className="text-white/20 text-sm">
              {search ? "No slots match your search." : "No graduated slots yet."}
            </p>
            <p className="text-white/15 text-xs">
              Tokens graduate from{" "}
              <a href="https://reelbit.fun" className="underline text-purple-400/50">
                reelbit.fun
              </a>{" "}
              when they hit $100k market cap.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((slot, i) => (
              <SlotCard key={slot.mint} slot={slot} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotCard({ slot, index }: { slot: GraduatedSlot; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/slot/${slot.mint}`}>
        <div
          className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all overflow-hidden cursor-pointer"
          style={{ borderColor: `${slot.primaryColor}22` }}
        >
          {/* Art */}
          <div
            className="h-36 flex items-center justify-center relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${slot.primaryColor}18, ${slot.accentColor}18)` }}
          >
            {slot.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.heroImageUrl}
                alt={slot.tokenName}
                className="w-24 h-24 object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl font-black"
                style={{ background: `${slot.primaryColor}30`, color: slot.primaryColor }}
              >
                {slot.tokenSymbol.slice(0, 2)}
              </div>
            )}
            <div className="absolute top-2 right-2 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-0.5 text-[10px] text-green-400 font-bold">
              LIVE
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm text-white">{slot.tokenName}</p>
                <p className="text-xs text-white/40">${slot.tokenSymbol}</p>
              </div>
              <span className="text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5">
                {MODEL_LABEL[slot.slotModel]}
              </span>
            </div>
            <div
              className="w-full text-center py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: `${slot.primaryColor}20`, color: slot.primaryColor }}
            >
              PLAY NOW
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
