"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Flame, Clock, TrendingUp, Rocket, Shield, Zap, Trophy, Lock, Loader2, Crown, ChevronDown, BarChart2 } from "lucide-react";
import Link from "next/link";
import { SlotCard } from "@/components/slot/SlotCard";
import { cn } from "@/lib/utils";
import type { SlotToken } from "@/types/slot";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_SIZE = 24;

interface TokenListItem {
  mint:             string;
  name:             string;
  symbol:           string;
  model:            string;
  image:            string;
  graduated:        boolean;
  devBuyPct:        number;
  creator:          string;
  mcapUsd:          number;
  priceUsd:         number;
  volume24h:        number;
  progressPct:      number;
  createdAt:        number;
  trendingScore:    number;
  creatorHoldRatio: number;
  creatorStatus:    "full" | "penalized" | "dumped";
  creatorRevPct:    number;
}

interface TokensResponse {
  total:  number;
  limit:  number;
  offset: number;
  tokens: TokenListItem[];
}

function mapToken(t: TokenListItem): SlotToken {
  return {
    mint:          t.mint,
    name:          t.name,
    ticker:        t.symbol,
    imageUri:      t.image,
    model:         t.model as SlotToken["model"],
    creator:       t.creator,
    graduated:     t.graduated,
    devBuyPct:     t.devBuyPct,
    mcapUsd:       t.mcapUsd,
    priceUsd:      t.priceUsd,
    volume24h:     t.volume24h,
    createdAt:     t.createdAt,
    creatorStatus: t.creatorStatus,
    creatorRevPct: t.creatorRevPct,
  };
}

const FEATURES = [
  { icon: Shield, title: "Provably Fair",  desc: "On-chain HMAC-SHA256 RNG. Every spin verifiable on Solana." },
  { icon: Zap,    title: "Instant Launch", desc: "Deploy your token in seconds. Zero cost. Zero code." },
  { icon: Trophy, title: "25% Revenue",    desc: "Earn 25% of all casino GGR and trading fees forever." },
  { icon: Lock,   title: "Up to 98% RTP",  desc: "Dynamic RTP assigned at graduation. Provably fair commit-reveal." },
];

const MODEL_LABEL: Record<string, string> = {
  Classic3Reel: "3-Reel", Standard5Reel: "5-Reel", FiveReelFreeSpins: "Free Spins",
};

type SortMode = "trending" | "new" | "graduating";

function fmtUsd(n: number) {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ── TopBit Reel featured card ─────────────────────────────────────────────────

function TopBitCard({ token }: { token: TokenListItem }) {
  const progressPct = Math.min(100, token.progressPct);
  const solFilled   = ((progressPct / 100) * 85).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border"
      style={{ borderColor: "rgba(212,175,55,0.35)", background: "rgba(212,175,55,0.04)" }}
    >
      {/* Animated shimmer */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 30%, rgba(212,175,55,0.06) 50%, transparent 70%)",
          animation: "shimmer 3s infinite" }} />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 px-5 py-4">

        {/* Crown badge */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)" }}>
          <Crown size={10} className="text-gold" />
          <span className="font-orbitron text-[9px] font-bold text-gold tracking-widest">TOPBIT REEL</span>
        </div>

        {/* Token image */}
        <div className="relative w-16 h-16 flex-shrink-0">
          {token.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={token.image} alt={token.name}
              className="w-full h-full rounded-xl object-cover"
              style={{ border: "2px solid rgba(212,175,55,0.4)" }} />
          ) : (
            <div className="w-full h-full rounded-xl flex items-center justify-center font-orbitron font-black text-xl text-gold"
              style={{ background: "rgba(212,175,55,0.1)", border: "2px solid rgba(212,175,55,0.4)" }}>
              {token.symbol.slice(0, 2)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-orbitron font-black text-lg text-white">{token.name}</span>
            <span className="font-rajdhani text-white/40 text-sm">${token.symbol}</span>
            <span className="rounded-full px-2 py-0.5 text-[9px] font-orbitron font-bold text-white/50"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {MODEL_LABEL[token.model] ?? token.model}
            </span>
          </div>

          <p className="font-rajdhani text-[11px] text-white/35 mt-0.5 mb-2.5">
            Leading the graduation race · {solFilled} / 85 SOL filled
          </p>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #a16207, #d4af37, #fde68a)" }}
              />
            </div>
            <span className="font-orbitron text-[11px] font-bold text-gold">{progressPct.toFixed(0)}%</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-2">
            {token.mcapUsd > 0 && (
              <div className="flex items-center gap-1">
                <BarChart2 size={9} className="text-white/20" />
                <span className="font-orbitron text-[10px] text-white/30">{fmtUsd(token.mcapUsd)}</span>
              </div>
            )}
            {token.volume24h > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp size={9} className="text-white/20" />
                <span className="font-orbitron text-[10px] text-white/30">{fmtUsd(token.volume24h)} 24h</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <Link href={`/slot/${token.mint}`} className="flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(212,175,55,0.35)" }}
            whileTap={{ scale: 0.97 }}
            className="btn-gold flex items-center gap-2 px-5 py-2.5 text-[12px] font-orbitron font-bold">
            <Zap size={12} /> Trade Now
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [slots,       setSlots]       = useState<SlotToken[]>([]);
  const [total,       setTotal]       = useState(0);
  const [topBit,      setTopBit]      = useState<TokenListItem | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search,      setSearch]      = useState("");
  const [sort,        setSort]        = useState<SortMode>("trending");
  const [offset,      setOffset]      = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef   = useRef(search);
  const sortRef     = useRef(sort);
  searchRef.current = search;
  sortRef.current   = sort;

  const fetchTokens = useCallback((q: string, s: SortMode, off: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else        setLoading(true);

    const params = new URLSearchParams({ sort: s, limit: String(PAGE_SIZE), offset: String(off) });
    if (q) params.set("q", q);

    fetch(`${API_URL}/tokens?${params}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<TokensResponse>; })
      .then((data) => {
        const mapped = (data.tokens ?? []).map(mapToken);
        setSlots((prev) => append ? [...prev, ...mapped] : mapped);
        setTotal(data.total ?? 0);
      })
      .catch(() => { if (!append) setSlots([]); })
      .finally(() => { if (append) setLoadingMore(false); else setLoading(false); });
  }, []);

  // On sort change: reset and refetch
  useEffect(() => {
    setOffset(0);
    fetchTokens(searchRef.current, sort, 0, false);
  }, [sort, fetchTokens]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      fetchTokens(search, sortRef.current, 0, false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, fetchTokens]);

  // TopBit Reel: always the leader by graduation progress
  useEffect(() => {
    fetch(`${API_URL}/tokens?sort=graduating&limit=1`)
      .then((r) => r.json() as Promise<TokensResponse>)
      .then((data) => {
        const t = data.tokens?.[0];
        if (t && t.progressPct > 5) setTopBit(t);
      })
      .catch(() => {});
  }, []);

  function handleLoadMore() {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchTokens(searchRef.current, sortRef.current, newOffset, true);
  }

  const hasMore     = slots.length < total;
  const totalVol    = slots.reduce((s, t) => s + (t.volume24h ?? 0), 0);
  const graduated   = slots.filter((t) => t.graduated).length;

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
              { label: "Tokens Live",  value: loading ? "…" : String(total)  },
              { label: "Total Volume", value: loading ? "…" : totalVol > 0 ? `$${(totalVol / 1000).toFixed(1)}k` : "—" },
              { label: "Graduated",    value: loading ? "…" : String(graduated) },
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
              <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(196,30,30,0.08)", border: "1px solid rgba(196,30,30,0.2)" }}>
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

        {/* TopBit Reel */}
        <AnimatePresence>
          {topBit && (
            <motion.div key="topbit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TopBitCard token={topBit} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header + controls */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-orbitron text-xl font-bold text-white tracking-wide">All Slots</h2>
            <p className="text-[11px] text-white/30 font-orbitron tracking-wider mt-0.5">
              {loading ? "Loading…" : `${total} TOKEN${total !== 1 ? "S" : ""}`}
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
              { id: "trending",   label: "Trending",   icon: Flame      },
              { id: "new",        label: "New",         icon: Clock      },
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

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/25">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading tokens…
          </div>
        ) : slots.length === 0 ? (
          <div className="col-span-full text-center py-24 space-y-4">
            <p className="font-orbitron text-sm text-white/20 tracking-widest">
              {total === 0 ? "NO TOKENS YET" : "NO RESULTS"}
            </p>
            {total === 0 && (
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {slots.map((slot, i) => (
                <SlotCard key={slot.mint} slot={slot} index={i} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-xl px-8 py-3 text-[13px] font-rajdhani font-bold text-white/50 hover:text-white transition-colors border border-white/8 hover:border-white/20 bg-white/[0.03]"
                >
                  {loadingMore
                    ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
                    : <><ChevronDown size={14} /> Load more ({total - slots.length} remaining)</>
                  }
                </motion.button>
              </div>
            )}
          </>
        )}

      </section>
    </div>
  );
}
