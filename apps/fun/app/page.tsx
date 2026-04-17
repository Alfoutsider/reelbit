"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Flame, Clock, TrendingUp, Rocket } from "lucide-react";
import Link from "next/link";
import { SlotCard } from "@/components/slot/SlotCard";
import { cn } from "@/lib/utils";
import type { SlotToken } from "@/types/slot";

const MOCK_SLOTS: SlotToken[] = [
  {
    mint: "So11111111111111111111111111111111111111112",
    name: "Dragon Hoard",
    ticker: "DHOARD",
    imageUri: "",
    model: "FiveReelFreeSpins",
    creator: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    graduated: false,
    mcapUsd: 84_200,
    priceUsd: 0.0000842,
    volume24h: 12_400,
    createdAt: Date.now() - 3600 * 3 * 1000,
  },
  {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    name: "Lucky Lotus",
    ticker: "LOTUS",
    imageUri: "",
    model: "Standard5Reel",
    creator: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    graduated: true,
    mcapUsd: 100_000,
    priceUsd: 0.0001,
    volume24h: 88_000,
    createdAt: Date.now() - 3600 * 48 * 1000,
  },
  {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    name: "Neon Cactus",
    ticker: "CACTUS",
    imageUri: "",
    model: "Classic3Reel",
    creator: "3h1zGmCwsRJnVk5BuRNMLsPaQu1y2eSjmaXBBXBbYVL",
    graduated: false,
    mcapUsd: 22_100,
    priceUsd: 0.0000221,
    volume24h: 5_800,
    createdAt: Date.now() - 3600 * 12 * 1000,
  },
  {
    mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    name: "Cyber Samurai",
    ticker: "CYBER",
    imageUri: "",
    model: "FiveReelFreeSpins",
    creator: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
    graduated: false,
    mcapUsd: 51_750,
    priceUsd: 0.0000518,
    volume24h: 31_200,
    createdAt: Date.now() - 3600 * 6 * 1000,
  },
];

type SortMode = "trending" | "new" | "graduating";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("trending");

  const filtered = MOCK_SLOTS
    .filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ticker.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "trending")   return b.volume24h - a.volume24h;
      if (sort === "new")        return b.createdAt - a.createdAt;
      if (sort === "graduating") return b.mcapUsd - a.mcapUsd;
      return 0;
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="grad-text">Launch a Slot.</span>
          <br />
          <span className="text-white/80">Graduate to the Casino.</span>
        </h1>
        <p className="text-white/40 max-w-xl mx-auto">
          Create your slot machine token for free. Reach $100k market cap and
          your slot goes live on reelbit.casino — earning you 25% of all trading fees forever.
        </p>
        <Link href="/launch">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 px-6 py-3 text-sm font-semibold text-white transition-colors glow-purple"
          >
            <Rocket size={16} /> Launch Your Slot
          </motion.button>
        </Link>
      </motion.div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search slots…"
            className="w-full rounded-xl bg-white/[0.04] border border-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {([
            { id: "trending",   label: "Trending",  icon: Flame },
            { id: "new",        label: "New",        icon: Clock },
            { id: "graduating", label: "Graduating", icon: TrendingUp },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSort(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                sort === id
                  ? "bg-purple-600 text-white"
                  : "bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.07]"
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Slot grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((slot, i) => (
          <SlotCard key={slot.mint} slot={slot} index={i} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-white/30 py-20">No slots found.</p>
        )}
      </div>
    </div>
  );
}
