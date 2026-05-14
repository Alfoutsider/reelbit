"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Flame, Clock, TrendingUp, Rocket, Shield, Zap, Trophy, Lock, Loader2, Crown, ChevronDown, BarChart2, Heart } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { SlotCard } from "@/components/slot/SlotCard";
import { SlotCardSkeletonGrid } from "@/components/slot/SlotCardSkeleton";
import { cn } from "@/lib/utils";
import { getWatchlist, subscribeWatchlist } from "@/lib/watchlist";
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
      <div className="card-sheen" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent)" }} />

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
  // Watchlist mode is a pure client-side filter on the already-fetched slot
  // set. We don't ask the API to filter because (a) the watchlist lives in
  // localStorage, not on the server, and (b) the lists are small enough that
  // it's fine to filter what's already rendered.
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  // "/" focuses the search input — matches Github / Twitter / Linear / Stripe.
  // Also handle Cmd+K / Ctrl+K for the same.
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't fire if the user is already typing somewhere
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;
      const isSlash = e.key === "/";
      const isCmdK  = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (isSlash || isCmdK) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Server-side filters. age cap + MCAP range. "" = no filter.
  type AgeFilter = "" | "1h" | "24h" | "7d";
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("");
  const [minMcap, setMinMcap] = useState("");
  const [maxMcap, setMaxMcap] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    setWatchlist(getWatchlist());
    return subscribeWatchlist(() => setWatchlist(getWatchlist()));
  }, []);

  // Live notifications via SSE. Two events that matter to a casual visitor:
  //   theme:graduated — "X just graduated and is live in the casino!"
  //   trade           — only flag big trades on watched tokens (signal:noise).
  useEffect(() => {
    const watched = new Set(getWatchlist());
    const updateWatched = () => { watched.clear(); for (const m of getWatchlist()) watched.add(m); };
    const unsub = subscribeWatchlist(updateWatched);

    const es = new EventSource(`${API_URL}/feed/stream`);
    es.addEventListener("theme:graduated", (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data) as {
          mint: string; tokenName?: string; tokenSymbol?: string;
        };
        const label = d.tokenSymbol ? `$${d.tokenSymbol}` : d.tokenName ?? d.mint.slice(0, 8);
        toast.success(`${label} just graduated! 🎰`, {
          description: "Now live in the casino — go play.",
          action: { label: "Play", onClick: () => { window.location.href = `https://reelbit-casino.vercel.app/slot/${d.mint}`; } },
          duration: 8000,
        });
      } catch {}
    });
    es.addEventListener("trade", (ev) => {
      try {
        const t = JSON.parse((ev as MessageEvent).data) as {
          mint: string; type: "buy" | "sell"; usdValue: number;
        };
        // Only ping for watched tokens AND trades >= $500. Everything else
        // becomes noise on a busy day.
        if (!watched.has(t.mint) || t.usdValue < 500) return;
        const direction = t.type === "buy" ? "Buy" : "Sell";
        toast(`${direction} on watched token`, {
          description: `$${t.usdValue.toFixed(0)} ${t.type} just hit ${t.mint.slice(0, 8)}…`,
          duration: 4000,
        });
      } catch {}
    });
    es.onerror = () => { /* browser auto-reconnects */ };
    return () => { es.close(); unsub(); };
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef    = useRef(search);
  const sortRef      = useRef(sort);
  const ageRef       = useRef(ageFilter);
  const minMcapRef   = useRef(minMcap);
  const maxMcapRef   = useRef(maxMcap);
  searchRef.current  = search;
  sortRef.current    = sort;
  ageRef.current     = ageFilter;
  minMcapRef.current = minMcap;
  maxMcapRef.current = maxMcap;

  interface FetchOpts { age: AgeFilter; minMcap: string; maxMcap: string }
  const fetchTokens = useCallback((q: string, s: SortMode, off: number, append: boolean, opts: FetchOpts) => {
    if (append) setLoadingMore(true);
    else        setLoading(true);

    const params = new URLSearchParams({ sort: s, limit: String(PAGE_SIZE), offset: String(off) });
    if (q) params.set("q", q);
    if (opts.age) params.set("age", opts.age);
    if (opts.minMcap && parseFloat(opts.minMcap) > 0) params.set("minMcap", opts.minMcap);
    if (opts.maxMcap && parseFloat(opts.maxMcap) > 0) params.set("maxMcap", opts.maxMcap);

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

  // On sort or filter change: reset and refetch (no debounce — these are
  // chip toggles, the user expects instant response).
  useEffect(() => {
    setOffset(0);
    fetchTokens(searchRef.current, sort, 0, false, { age: ageFilter, minMcap, maxMcap });
  }, [sort, ageFilter, fetchTokens]);

  // Debounce text and numeric MCAP fields together (any keystroke restarts
  // the timer). 350ms is a comfortable middle ground between responsiveness
  // and avoiding a request per keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
      fetchTokens(search, sortRef.current, 0, false, { age: ageRef.current, minMcap, maxMcap });
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, minMcap, maxMcap, fetchTokens]);

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
    fetchTokens(searchRef.current, sortRef.current, newOffset, true, {
      age: ageRef.current,
      minMcap: minMcapRef.current,
      maxMcap: maxMcapRef.current,
    });
  }

  const visibleSlots = showWatchlistOnly
    ? slots.filter((s) => watchlist.includes(s.mint))
    : slots;
  const hasMore     = !showWatchlistOnly && slots.length < total;
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
            <span className="font-bold" style={{ color: "#f5c842" }}>25% of all fees forever.</span>
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

      {/* Live stats strip */}
      {!loading && (
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <div className="flex items-center gap-4 sm:gap-8 flex-wrap py-3 px-5 rounded-2xl border border-white/5"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-orbitron text-[10px] text-white/40 tracking-widest">{total} TOKENS LIVE</span>
            </div>
            <div className="flex items-center gap-1.5 font-orbitron text-[10px] text-green-400/50 tracking-widest">
              <Zap size={9} />
              {graduated} GRADUATED TO CASINO
            </div>
            {topBit && (
              <div className="hidden sm:flex items-center gap-1.5 font-orbitron text-[10px] tracking-widest" style={{ color: "rgba(212,175,55,0.5)" }}>
                <TrendingUp size={9} />
                LEADING: ${topBit.symbol} · {topBit.progressPct.toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      )}

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
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ticker…"
              className="input-casino pl-10 pr-12 text-[13px]"
            />
            <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-white/30">
              /
            </kbd>
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
                onClick={() => { setSort(id); setShowWatchlistOnly(false); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold font-rajdhani transition-all",
                  !showWatchlistOnly && sort === id
                    ? "text-white"
                    : "bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.07] border border-white/5",
                )}
                style={!showWatchlistOnly && sort === id ? { background: "var(--brand-red)" } : {}}
              >
                <Icon size={12} /> {label}
              </motion.button>
            ))}
            {/* Watchlist toggle. Disabled when empty so the user gets feedback */}
            {/* the localStorage hasn't been populated yet. */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowWatchlistOnly((v) => !v)}
              disabled={watchlist.length === 0 && !showWatchlistOnly}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold font-rajdhani transition-all",
                showWatchlistOnly
                  ? "text-white bg-red-500"
                  : "bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.07] border border-white/5",
                watchlist.length === 0 && !showWatchlistOnly && "opacity-40 cursor-not-allowed",
              )}
            >
              <Heart size={12} fill={showWatchlistOnly ? "currentColor" : "none"} />
              Watchlist {watchlist.length > 0 && <span className="opacity-60">{watchlist.length}</span>}
            </motion.button>
            {/* Filter sheet toggle. Activates the badge when any filter is set. */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold font-rajdhani transition-all relative",
                filtersOpen || ageFilter || minMcap || maxMcap
                  ? "text-white bg-white/[0.07] border border-white/15"
                  : "bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.07] border border-white/5",
              )}
            >
              <BarChart2 size={12} /> Filters
              {(ageFilter || minMcap || maxMcap) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Filter sheet — shown when toggled, persists across sort changes. */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              key="filter-sheet"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-orbitron text-[10px] font-bold text-white/50 tracking-widest">FILTERS</p>
                  {(ageFilter || minMcap || maxMcap) && (
                    <button
                      onClick={() => { setAgeFilter(""); setMinMcap(""); setMaxMcap(""); }}
                      className="text-[10px] font-orbitron text-white/40 hover:text-white tracking-widest"
                    >
                      CLEAR ALL
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="section-label text-[10px]">Age</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["", "1h", "24h", "7d"] as AgeFilter[]).map((id) => (
                      <button
                        key={id || "any"}
                        onClick={() => setAgeFilter(id)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-[11px] font-rajdhani font-bold transition-all",
                          ageFilter === id
                            ? "bg-white/15 text-white"
                            : "bg-white/[0.03] text-white/40 hover:text-white hover:bg-white/[0.06] border border-white/5",
                        )}
                      >
                        {id || "Any age"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="section-label text-[10px]">Min MCAP (USD)</label>
                    <input
                      type="number"
                      min={0}
                      value={minMcap}
                      onChange={(e) => setMinMcap(e.target.value)}
                      placeholder="e.g. 5000"
                      className="input-casino text-[12px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="section-label text-[10px]">Max MCAP (USD)</label>
                    <input
                      type="number"
                      min={0}
                      value={maxMcap}
                      onChange={(e) => setMaxMcap(e.target.value)}
                      placeholder="e.g. 50000"
                      className="input-casino text-[12px]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {loading ? (
          <SlotCardSkeletonGrid count={8} />
        ) : visibleSlots.length === 0 ? (
          <div className="col-span-full text-center py-24 space-y-4 max-w-md mx-auto">
            <p className="font-orbitron text-sm text-white/20 tracking-widest">
              {showWatchlistOnly
                ? "NO WATCHED TOKENS IN VIEW"
                : total === 0 ? "NO TOKENS YET" : "NO RESULTS"}
            </p>
            {showWatchlistOnly ? (
              <p className="text-white/40 text-sm font-rajdhani leading-relaxed">
                Tap the <span className="text-red-400">♡</span> on a card to add it. Watched
                tokens stay on this device — clearing browser data wipes them.
              </p>
            ) : total === 0 ? (
              <>
                <p className="text-white/40 text-sm font-rajdhani leading-relaxed">
                  Every slot starts free at <strong className="text-white/70">$5k mcap</strong> on a bonding curve.
                  Hit <strong className="text-white/70">$100k</strong> and your token graduates — the slot goes live
                  in the casino and you earn <strong className="text-gold">25% of all GGR forever</strong>.
                </p>
                <Link href="/launch">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    className="btn-launch inline-flex items-center gap-2 px-6 py-3 text-[12px] mt-2"
                  >
                    <Rocket size={14} /> Be the first to launch
                  </motion.button>
                </Link>
              </>
            ) : (
              <p className="text-white/40 text-sm font-rajdhani leading-relaxed">
                No tokens match your filters. Try widening the MCAP range or clearing the
                age filter.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleSlots.map((slot, i) => (
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
