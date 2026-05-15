"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Flame, Star, Trophy, Zap, TrendingUp, Rocket, Gift, ChevronRight, DollarSign } from "lucide-react";
import { useJackpot, fmtJackpot } from "@/lib/jackpot";
import { SlotCardSkeletonGrid } from "@/components/slot/SlotCardSkeleton";
import Link from "next/link";
import { usePrivy, useWallets } from "@/lib/privy";
import { cn } from "@/lib/utils";
import { getDemoSession, getDemoSlots, type DemoSlot } from "@/lib/demoSession";
import { SymbolSVG } from "@/components/slot/SymbolSVG";
import { MODEL_TO_THEME } from "@/lib/slotThemes";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

const DEMO_SLOTS: SlotEntry[] = [
  { mint: "So11111111111111111111111111111111111111112",          tokenName: "Lucky 7s",        tokenSymbol: "L7",    slotModel: "Classic3Reel",      heroImageUrl: null, primaryColor: "#d4a017", accentColor: "#8b5cf6", isDemo: true, isGraduated: false },
  { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",       tokenName: "Neon Joker",      tokenSymbol: "JOKER", slotModel: "Standard5Reel",     heroImageUrl: null, primaryColor: "#06b6d4", accentColor: "#8b5cf6", isDemo: true, isGraduated: false },
  { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",        tokenName: "Dragon's Fortune",tokenSymbol: "DRAG",  slotModel: "FiveReelFreeSpins", heroImageUrl: null, primaryColor: "#ef4444", accentColor: "#d4a017", isDemo: true, isGraduated: false },
  { mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",        tokenName: "Diamond Rush",    tokenSymbol: "DIAM",  slotModel: "Standard5Reel",     heroImageUrl: null, primaryColor: "#60a5fa", accentColor: "#e2e8f0", isDemo: true, isGraduated: false },
  { mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",         tokenName: "Phantom Reels",   tokenSymbol: "PHNTM", slotModel: "FiveReelFreeSpins", heroImageUrl: null, primaryColor: "#a855f7", accentColor: "#ec4899", isDemo: true, isGraduated: false },
  { mint: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",         tokenName: "Gold Rush",       tokenSymbol: "GRUSH", slotModel: "Classic3Reel",      heroImageUrl: null, primaryColor: "#f5c842", accentColor: "#ef4444", isDemo: true, isGraduated: false },
];

const MODEL_LABEL: Record<string, string> = {
  Classic3Reel: "3-Reel", Standard5Reel: "5-Reel", FiveReelFreeSpins: "Free Spins",
};

const MODEL_COLOR: Record<string, string> = {
  Classic3Reel: "#d4a017", Standard5Reel: "#c0c0c0", FiveReelFreeSpins: "#22c55e",
};

// TODO(mainnet): Replace with live feed. Set SHOW_SAMPLE_SOCIAL=false and wire up real WebSocket events.
const SHOW_SAMPLE_SOCIAL = process.env.NEXT_PUBLIC_SHOW_SAMPLE_SOCIAL !== "false";
// Sample recent-win events in USD — will be replaced by live feed post-launch
const SAMPLE_WINS = [
  { wallet: "7xK…gAs", usd: 2_376,  slot: "Lucky 7s",         mult: 144, minsAgo: 3  },
  { wallet: "9Wz…NqM", usd: 140,    slot: "Neon Joker",       mult: 8,   minsAgo: 7  },
  { wallet: "BrE…jnC", usd: 528,    slot: "Dragon's Fortune", mult: 32,  minsAgo: 12 },
  { wallet: "5yF…KKC", usd: 248,    slot: "Phantom Reels",    mult: 15,  minsAgo: 18 },
  { wallet: "HN7…WrH", usd: 7_920,  slot: "Gold Rush",        mult: 480, minsAgo: 24 },
  { wallet: "ATo…Aev", usd: 99,     slot: "Diamond Rush",     mult: 6,   minsAgo: 31 },
  { wallet: "3h1…bYL", usd: 825,    slot: "Lucky 7s",         mult: 50,  minsAgo: 45 },
  { wallet: "9xQ…Fin", usd: 347,    slot: "Dragon's Fortune", mult: 21,  minsAgo: 58 },
];

// Links big-win cards to the correct demo slot
const WIN_SLOT_MINT: Record<string, string> = {
  "Lucky 7s":         "So11111111111111111111111111111111111111112",
  "Neon Joker":       "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Dragon's Fortune": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "Phantom Reels":    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  "Gold Rush":        "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
  "Diamond Rush":     "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
};

function fmtUsd(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

type Tab       = "lobby" | "my-slots";
type Filter    = "all" | "demo" | "graduated";
type ModelFilter = "all" | "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
type SortMode  = "featured" | "new" | "name";

// ── Live stats bar ────────────────────────────────────────────────────────────

function LiveStatsBar({ slotCount, graduatedCount }: { slotCount: number; graduatedCount: number }) {
  return (
    <div className="flex items-center gap-4 sm:gap-8 flex-wrap py-3 px-5 rounded-2xl border border-white/5"
      style={{ background: "rgba(255,255,255,0.02)" }}>
      {SHOW_SAMPLE_SOCIAL ? (
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="font-orbitron text-[10px] text-white/40 tracking-widest">243 PLAYERS ONLINE</span>
        </div>
      ) : null}
      <div className="flex items-center gap-1.5 font-orbitron text-[10px] text-white/30 tracking-widest">
        <Zap size={9} style={{ color: "#d4a017" }} />
        {slotCount} SLOTS LIVE
      </div>
      <div className="flex items-center gap-1.5 font-orbitron text-[10px] text-green-400/50 tracking-widest">
        <Trophy size={9} />
        {graduatedCount} GRADUATED
      </div>
      {SHOW_SAMPLE_SOCIAL && (
        <div className="hidden sm:flex items-center gap-1.5 font-orbitron text-[10px] text-white/25 tracking-widest">
          <DollarSign size={9} />
          $697K WAGERED TODAY
        </div>
      )}
    </div>
  );
}

// ── Live wins ticker ──────────────────────────────────────────────────────────

function LiveTicker() {
  const wins = [...SAMPLE_WINS, ...SAMPLE_WINS]; // doubled for seamless loop
  return (
    <div className="border-b py-2 overflow-hidden" style={{ background: "var(--ticker-bg)", borderColor: "var(--bdr2)" }}>
      <div className="marquee-track">
        <div className="marquee-inner">
          {wins.map((w, i) => (
            <div key={i} className="flex items-center gap-2 px-8 text-[11px] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <span className="font-mono" style={{ color: "var(--fg4)" }}>{w.wallet}</span>
              <span style={{ color: "var(--fg4)" }}>just won</span>
              <span className="font-bold text-green-400">{fmtUsd(w.usd)}</span>
              <span style={{ color: "var(--fg4)" }}>on</span>
              <span className="font-rajdhani font-semibold" style={{ color: "var(--fg2)" }}>{w.slot}</span>
              {w.mult >= 50 && (
                <span className="badge badge-gold text-[9px] px-1.5 py-0.5">×{w.mult}</span>
              )}
              <span className="text-white/10 px-3">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Jackpot banner ────────────────────────────────────────────────────────────

function JackpotBanner({ onPlay }: { onPlay: () => void }) {
  const jackpot = useJackpot();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      onClick={onPlay}
      style={{
        background: "linear-gradient(135deg, rgba(160,120,16,0.28) 0%, rgba(212,160,23,0.12) 40%, rgba(6,6,15,0.9) 100%)",
        border: "1px solid rgba(212,160,23,0.35)",
      }}
    >
      <div className="card-sheen" style={{ background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.1), transparent)" }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(212,160,23,0.15),transparent_55%)]" />

      <div className="relative px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left */}
        <div className="text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
            <span className="live-dot" />
            <span className="font-orbitron text-[9px] font-bold tracking-[0.2em] text-white/40">GROWING JACKPOT</span>
          </div>
          <motion.p
            key={Math.floor(jackpot)}
            className="font-orbitron text-4xl sm:text-5xl font-black tracking-tight gold-text tabular-nums"
          >
            {fmtJackpot(jackpot)}
          </motion.p>
          <p className="font-rajdhani text-sm text-white/35 mt-1">
            Feeds with every spin — anyone can win it on any slot
          </p>
        </div>

        {/* Right */}
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: "0 0 32px rgba(212,160,23,0.5)" }}
          whileTap={{ scale: 0.97 }}
          className="btn-launch flex items-center gap-2 px-7 py-3.5 text-[13px] flex-shrink-0"
        >
          🎰 SPIN TO WIN
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Big wins grid ─────────────────────────────────────────────────────────────

function BigWinsGrid() {
  // Sort by usd descending for max visual impact
  const top = [...SAMPLE_WINS].sort((a, b) => b.usd - a.usd).slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Flame size={12} style={{ color: "#d4a017" }} />
        <span className="font-orbitron text-[10px] font-bold tracking-widest" style={{ color: "var(--fg4)" }}>
          RECENT BIG WINS
        </span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(to right, rgba(212,160,23,0.25), transparent)" }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {top.map((w, i) => {
          const mint = WIN_SLOT_MINT[w.slot];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.06, 0.24) }}
            >
              <Link href={mint ? `/slot/${mint}` : "/"} className="block group">
                <div className="relative overflow-hidden rounded-2xl border border-white/5 hover:border-[rgba(212,160,23,0.25)] transition-colors p-4 space-y-3"
                  style={{ background: "var(--bg-card)" }}>
                  <div className="card-sheen" />

                  {/* Multiplier badge */}
                  {w.mult >= 30 && (
                    <div className="absolute top-3 right-3">
                      <span className="badge badge-gold text-[9px]">×{w.mult}</span>
                    </div>
                  )}

                  {/* Slot + player */}
                  <div>
                    <p className="font-orbitron text-[11px] font-bold text-white/80 tracking-wide">{w.slot}</p>
                    <p className="font-mono text-[10px] text-white/30 mt-0.5">{w.wallet}</p>
                  </div>

                  {/* Win amount */}
                  <p className="font-orbitron text-2xl font-black text-green-400">
                    {fmtUsd(w.usd)}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="font-rajdhani text-[10px] text-white/25">{w.minsAgo}m ago</span>
                    <span className="font-orbitron text-[9px] font-bold tracking-wider text-white/30 group-hover:text-[#d4a017] transition-colors">
                      PLAY →
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CasinoLobby() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? "";

  const [tab,           setTab]           = useState<Tab>("lobby");
  const [graduatedSlots, setGraduatedSlots] = useState<SlotEntry[]>([]);
  const [mySlots,       setMySlots]       = useState<SlotEntry[]>([]);
  const [demoSlots,     setDemoSlots]     = useState<DemoSlot[]>([]);
  const [isDemo,        setIsDemo]        = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [myLoading,     setMyLoading]     = useState(false);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState<Filter>("all");
  const [modelFilter,   setModelFilter]   = useState<ModelFilter>("all");
  const [sort,          setSort]          = useState<SortMode>("featured");

  // Detect demo session
  useEffect(() => {
    const sess = getDemoSession();
    setIsDemo(sess !== null);
    if (sess) setDemoSlots(getDemoSlots());
    const timer = setInterval(() => {
      const s = getDemoSession();
      setIsDemo(s !== null);
      if (s) setDemoSlots(getDemoSlots());
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/themes/graduated`)
      .then((r) => r.json())
      .then((data: Array<{ mint: string; tokenName: string; tokenSymbol: string; slotModel: string; heroImageUrl: string | null; primaryColor: string; accentColor: string }>) =>
        setGraduatedSlots(data.map((t) => ({
          ...t,
          slotModel: t.slotModel as SlotEntry["slotModel"],
          isDemo: false, isGraduated: true,
        }))),
      )
      .catch(() => setGraduatedSlots([]))
      .finally(() => setLoading(false));

    // Live updates — when a token graduates or its art finishes generating,
    // the lobby now updates within ~100ms instead of waiting for a refresh
    // or the 30s revalidate cache.
    const es = new EventSource(`${API_URL}/feed/stream`);
    es.addEventListener("theme:graduated", (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data) as {
          mint: string; tokenName?: string; tokenSymbol?: string; slotModel: string;
        };
        setGraduatedSlots((prev) => {
          if (prev.some((s) => s.mint === d.mint)) return prev;
          return [{
            mint:         d.mint,
            tokenName:    d.tokenName    ?? d.mint.slice(0, 8),
            tokenSymbol:  d.tokenSymbol  ?? "TOKEN",
            slotModel:    d.slotModel as SlotEntry["slotModel"],
            heroImageUrl: null,
            primaryColor: "#7C3AED",
            accentColor:  "#10B981",
            isDemo:       false,
            isGraduated:  true,
          }, ...prev];
        });
      } catch {}
    });
    es.addEventListener("theme:ready", (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data) as {
          mint: string; heroImageUrl: string;
        };
        setGraduatedSlots((prev) =>
          prev.map((s) => s.mint === d.mint ? { ...s, heroImageUrl: d.heroImageUrl } : s),
        );
      } catch {}
    });
    es.onerror = () => { /* Browser auto-reconnects; nothing to do. */ };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (tab !== "my-slots" || !walletAddress) return;
    setMyLoading(true);
    fetch(`${API_URL}/themes/by-creator/${walletAddress}`)
      .then((r) => r.json())
      .then((data: Array<{ mint: string; tokenName: string; tokenSymbol: string; slotModel: string; heroImageUrl: string | null; primaryColor: string; accentColor: string; graduated: boolean }>) =>
        setMySlots(data.map((t) => ({
          ...t,
          slotModel: t.slotModel as SlotEntry["slotModel"],
          isDemo: false, isGraduated: t.graduated,
        }))),
      )
      .catch(() => setMySlots([]))
      .finally(() => setMyLoading(false));
  }, [tab, walletAddress]);

  const allSlots: SlotEntry[] = [...graduatedSlots, ...DEMO_SLOTS];
  const activeSlots = tab === "my-slots" ? mySlots : allSlots;

  const filtered = activeSlots
    .filter((s) => {
      if (tab === "my-slots") return true;
      const q = search.toLowerCase();
      const matchSearch = s.tokenName.toLowerCase().includes(q) || s.tokenSymbol.toLowerCase().includes(q);
      const matchFilter =
        filter === "all" ||
        (filter === "demo" && s.isDemo) ||
        (filter === "graduated" && s.isGraduated);
      const matchModel = modelFilter === "all" || s.slotModel === modelFilter;
      return matchSearch && matchFilter && matchModel;
    })
    .sort((a, b) => {
      if (sort === "name") return a.tokenName.localeCompare(b.tokenName);
      if (a.isGraduated !== b.isGraduated) return a.isGraduated ? -1 : 1;
      return 0;
    });

  return (
    <div className="min-h-screen">
      {/* Ambient orbs */}
      <div className="orb w-[500px] h-[500px] top-10 -left-48" style={{ background: "rgba(212,160,23,0.05)", animationDelay: "0s" }} />
      <div className="orb w-80 h-80 bottom-40 right-10" style={{ background: "rgba(160,120,16,0.04)", animationDelay: "4s" }} />

      {SHOW_SAMPLE_SOCIAL && <LiveTicker />}

      {/* Tab bar */}
      <div className="border-b" style={{ background: "var(--bg2)", borderColor: "var(--bdr2)" }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1">
          {([
            { id: "lobby" as Tab,    label: "Casino Lobby" },
            { id: "my-slots" as Tab, label: "My Slots" },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { if (id === "my-slots" && !authenticated && !isDemo) { login(); return; } setTab(id); }}
              className={cn(
                "px-4 py-3 text-xs font-orbitron font-bold tracking-wide border-b-2 transition-all -mb-px",
                tab === id
                  ? "border-[#d4a017] text-[#f5c842]"
                  : "border-transparent hover:text-white/60",
              )}
              style={tab !== id ? { color: "var(--tab-c)" } : undefined}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto">
            {isDemo ? (
              <Link
                href="/demo/launch"
                className="flex items-center gap-1.5 text-[10px] font-orbitron font-bold transition-colors px-3 py-3"
                style={{ color: "var(--fg3)" }}
              >
                <Rocket size={11} /> Launch a Slot
              </Link>
            ) : (
              <Link
                href="/demo"
                className="flex items-center gap-1.5 text-[10px] font-orbitron font-bold transition-colors px-3 py-3"
                style={{ color: "var(--fg3)" }}
              >
                Try Demo
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">

        {/* Welcome bonus banner — shown to unauthenticated non-demo users */}
        {!authenticated && !isDemo && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl cursor-pointer group"
            style={{ background: "linear-gradient(135deg, rgba(160,120,16,0.22) 0%, rgba(212,160,23,0.10) 50%, rgba(6,6,15,0.8) 100%)", border: "1px solid rgba(212,160,23,0.25)" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(212,160,23,0.12),transparent_60%)]" />
            <div className="relative flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.3)" }}>
                  <Gift size={18} style={{ color: "#d4a017" }} />
                </div>
                <div>
                  <p className="font-orbitron text-sm font-black tracking-wide" style={{ color: "var(--fg)" }}>
                    100% Welcome Bonus <span style={{ color: "var(--silver-text)" }}>up to $200</span>
                  </p>
                  <p className="text-xs font-rajdhani mt-0.5" style={{ color: "var(--fg3)" }}>
                    First deposit · 45× wagering · 7 days to complete
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={login}
                className="btn-silver flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-orbitron font-bold flex-shrink-0"
              >
                CLAIM <ChevronRight size={11} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 pt-2"
        >
          <div className="inline-flex items-center gap-2 bg-green-500/8 border border-green-500/20 rounded-full px-4 py-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-orbitron text-[10px] font-bold text-green-400/80 tracking-widest">PROVABLY FAIR · UP TO 98% RTP · LIVE ON SOLANA</span>
          </div>

          <h1 className="font-orbitron text-3xl md:text-5xl font-black tracking-tight leading-tight">
            <span className="gold-text">Casino</span>{" "}
            <span className="text-white">Lobby</span>
          </h1>
          <p className="text-sm font-rajdhani max-w-md mx-auto" style={{ color: "var(--fg3)" }}>
            Every spin provably fair. Deposit SOL, pick a machine, and play.
          </p>

          {/* Stats strip */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 pt-2 flex-wrap">
            {([
              ...(SHOW_SAMPLE_SOCIAL ? [{ label: "Players Online", value: "243",    color: "text-green-400" }] : []),
              { label: "Live Slots",    value: loading ? "…" : String(allSlots.length), color: "gold-text" },
              ...(SHOW_SAMPLE_SOCIAL ? [{ label: "Biggest Win",    value: "$7,920", color: "gold-text"      }] : []),
              ...(SHOW_SAMPLE_SOCIAL ? [{ label: "Wagered Today",  value: "$697K",  color: "",              valueStyle: { color: "var(--fg2)" } as React.CSSProperties }] : []),
            ]).map(({ label, value, color, valueStyle }) => (
              <div key={label} className="text-center">
                <p className={`font-orbitron text-xl font-black ${color}`} style={valueStyle}>{value}</p>
                <p className="text-[9px] font-orbitron tracking-widest uppercase mt-0.5" style={{ color: "var(--fg4)" }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Jackpot banner + big wins — lobby only */}
        {tab === "lobby" && (
          <>
            <JackpotBanner onPlay={() => {
              const first = filtered[0];
              if (first) window.location.href = `/slot/${first.mint}`;
            }} />
            {SHOW_SAMPLE_SOCIAL && <BigWinsGrid />}
          </>
        )}

        {/* Live stats bar */}
        {tab === "lobby" && !loading && (
          <LiveStatsBar slotCount={allSlots.length} graduatedCount={graduatedSlots.length} />
        )}

        {/* Model filter chips — lobby only */}
        {tab === "lobby" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {([
              { id: "all"               as ModelFilter, label: "All Games",   icon: "🎰" },
              { id: "Classic3Reel"      as ModelFilter, label: "Classic 3-Reel", icon: "🍒" },
              { id: "Standard5Reel"     as ModelFilter, label: "5-Reel",      icon: "💎" },
              { id: "FiveReelFreeSpins" as ModelFilter, label: "Free Spins",  icon: "🔔" },
            ]).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setModelFilter(id)}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-orbitron font-bold whitespace-nowrap transition-all flex-shrink-0"
                style={modelFilter === id ? {
                  background: "var(--chip-active-bg)",
                  border: "1px solid var(--chip-active-bdr)",
                  color: "var(--chip-active-c)",
                } : {
                  background: "var(--chip-bg)",
                  border: "1px solid var(--chip-bdr)",
                  color: "var(--chip-c)",
                }}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        )}

        {/* My Slots tab content */}
        {tab === "my-slots" && (
          <div className="space-y-6">
            {/* Demo mode: show localStorage slots */}
            {isDemo ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-orbitron text-[10px] text-white/30 tracking-widest">YOUR DEMO SLOTS</p>
                  <Link href="/demo/launch">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="btn-launch flex items-center gap-1.5 py-2 px-4 text-[11px]"
                    >
                      <Rocket size={12} /> LAUNCH A SLOT
                    </motion.button>
                  </Link>
                </div>
                {demoSlots.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <p className="font-orbitron text-sm text-white/15 tracking-widest">NO DEMO SLOTS YET</p>
                    <p className="text-white/25 text-sm font-rajdhani">
                      Launch your first simulated slot token and watch the bonding curve fill up.
                    </p>
                    <Link href="/demo/launch">
                      <button className="btn-launch flex items-center gap-2 mx-auto py-2.5 px-6 text-[12px]">
                        <Rocket size={13} /> LAUNCH YOUR FIRST SLOT
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {demoSlots.map((slot, i) => (
                      <DemoSlotCard key={slot.id} slot={slot} index={i} />
                    ))}
                  </div>
                )}
              </>
            ) : myLoading ? (
              <SlotCardSkeletonGrid count={4} />
            ) : mySlots.length === 0 ? (
              <div className="text-center py-28 space-y-3">
                <p className="font-orbitron text-sm text-white/15 tracking-widest">NO SLOTS YET</p>
                <p className="text-white/25 text-sm font-rajdhani">
                  Launch your slot on{" "}
                  <a href="https://reelbit.fun" target="_blank" rel="noopener noreferrer" style={{ color: "#d4a017" }} className="hover:underline">
                    reelbit.fun
                  </a>{" "}
                  — when it graduates it appears here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {mySlots.map((slot, i) => <SlotCard key={slot.mint} slot={slot} index={i} />)}
              </div>
            )}
          </div>
        )}

        {/* Filter / search controls — lobby tab only */}
        {tab === "lobby" && <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slots…"
              className="input-casino pl-10 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: "all" as Filter,       label: "All",        icon: <Zap size={11} /> },
              { id: "graduated" as Filter, label: "Graduated",  icon: <Trophy size={11} /> },
              { id: "demo" as Filter,      label: "Demo",       icon: <Star size={11} /> },
            ]).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-bold font-rajdhani transition-all",
                  filter === id
                    ? "border"
                    : "bg-white/[0.04] text-white/40 hover:text-white border border-white/5",
                )}
                style={filter === id ? {
                  background: "linear-gradient(135deg, rgba(160,120,16,0.9), rgba(212,160,23,0.85))",
                  color: "#0a0a18",
                  borderColor: "rgba(212,160,23,0.6)",
                } : {}}
              >
                {icon} {label}
              </button>
            ))}
            <div className="flex gap-1 ml-auto sm:ml-0">
              {([
                { id: "featured" as SortMode, label: "Featured" },
                { id: "name" as SortMode,     label: "A–Z" },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSort(id)}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-[11px] font-bold font-rajdhani transition-all",
                    sort === id ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>}

        {/* Graduated section divider — lobby only */}
        {tab === "lobby" && filter !== "demo" && graduatedSlots.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
            <span className="badge badge-graduated font-orbitron text-[9px]">
              <Flame size={9} /> GRADUATED FROM REELBIT.FUN
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-green-500/20 to-transparent" />
          </div>
        )}

        {/* Featured graduated slots */}
        {tab === "lobby" && !loading && filter !== "demo" && graduatedSlots.length >= 2 && (
          <FeaturedSlotsRow slots={graduatedSlots} />
        )}

        {/* Slot grid — lobby only */}
        {tab === "lobby" && (loading ? (
          <SlotCardSkeletonGrid count={8} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-28 max-w-md mx-auto space-y-3 px-4">
            <p className="font-orbitron text-sm text-white/15 tracking-widest">NO SLOTS YET</p>
            <p className="text-sm text-white/35 font-rajdhani leading-relaxed">
              Slots appear here the moment a token graduates on{" "}
              <a href="https://reelbit.fun" target="_blank" rel="noopener noreferrer" style={{ color: "#d4a017" }} className="hover:underline">
                reelbit.fun
              </a>{" "}
              — that means a creator hit $100k mcap on the launchpad. Each slot has its own RTP (90–98%) and shared jackpot pool.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((slot, i) => (
              <SlotCard key={slot.mint} slot={slot} index={i} />
            ))}
          </div>
        ))}

        {/* Demo section label — lobby only */}
        {tab === "lobby" && filter !== "graduated" && !loading && (
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-white/[0.04]" />
            <span className="text-[9px] font-orbitron text-white/15 tracking-widest">FEATURED DEMO SLOTS — NO DEPOSIT REQUIRED</span>
            <div className="h-px flex-1 bg-white/[0.04]" />
          </div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-2xl px-8 py-7 text-center"
          style={{ border: "1px solid rgba(212,160,23,0.28)", background: "linear-gradient(135deg, rgba(160,120,16,0.15) 0%, rgba(212,160,23,0.06) 50%, rgba(6,6,15,0.85) 100%)" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,160,23,0.07),transparent_70%)]" />
          {isDemo ? (
            <>
              <p className="relative font-orbitron text-sm font-bold tracking-wide mb-1" style={{ color: "var(--fg)" }}>
                Want to try the creator side?
              </p>
              <p className="relative text-sm font-rajdhani mb-4" style={{ color: "var(--fg3)" }}>
                Launch a simulated slot token and watch bots drive it to $100k.
              </p>
              <Link
                href="/demo/launch"
                className="relative inline-flex items-center gap-2 btn-launch py-2.5 px-6 text-[11px]"
              >
                <Rocket size={13} /> Launch a Demo Slot
              </Link>
            </>
          ) : (
            <>
              <p className="relative font-orbitron text-sm font-bold tracking-wide mb-1" style={{ color: "var(--fg)" }}>
                Have a token on reelbit.fun?
              </p>
              <p className="relative text-sm font-rajdhani mb-4" style={{ color: "var(--fg3)" }}>
                Reach 85 SOL on the bonding curve and your slot graduates here automatically.
              </p>
              <a
                href="https://reelbit.fun"
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex items-center gap-2 btn-launch py-2.5 px-6 text-[11px]"
              >
                <TrendingUp size={13} /> Launch on reelbit.fun
              </a>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ── RTP map per model (displayed on cards) ───────────────────────────────────
const MODEL_RTP: Record<string, string> = {
  Classic3Reel: "96%", Standard5Reel: "97%", FiveReelFreeSpins: "98%",
};

// ── Slot Card ─────────────────────────────────────────────────────────────────

function SlotCard({ slot, index }: { slot: SlotEntry; index: number }) {
  const modelColor = MODEL_COLOR[slot.slotModel] ?? "#c0c0c0";
  const isHot      = index < 2 && slot.isGraduated;
  const rtp        = MODEL_RTP[slot.slotModel] ?? "96%";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.18), ease: "easeOut" }}
    >
      <Link href={`/slot/${slot.mint}?model=${slot.slotModel}`} className="block h-full group">
        <div
          className="card-slot h-full cursor-pointer"
          style={{ "--hover-color": slot.primaryColor } as React.CSSProperties}
        >
          {/* Art area */}
          <div
            className="h-44 relative overflow-hidden slot-img-placeholder"
            style={{
              background: `linear-gradient(135deg, ${slot.primaryColor}22 0%, ${slot.accentColor}14 50%, #080818 100%)`,
            }}
          >
            {slot.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slot.heroImageUrl}
                alt={slot.tokenName}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <PlaceholderArt slot={slot} />
            )}

            {/* Hover play overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: "rgba(0,0,0,0.45)" }}>
              <div className="font-orbitron text-[11px] font-black text-white tracking-widest bg-white/15 backdrop-blur-sm rounded-xl px-5 py-2.5 border border-white/20">
                PLAY NOW →
              </div>
            </div>

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
              {slot.isGraduated && (
                <span className="badge badge-graduated text-[9px]">
                  <Flame size={8} /> LIVE
                </span>
              )}
              {slot.isDemo && (
                <span className="badge badge-gold text-[9px]">
                  <Star size={8} /> DEMO
                </span>
              )}
              {isHot && (
                <span className="badge badge-hot text-[9px]">🔥 HOT</span>
              )}
            </div>

            {/* Model + RTP */}
            <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
              <span
                className="badge text-[9px]"
                style={{ background: `${modelColor}18`, border: `1px solid ${modelColor}35`, color: modelColor }}
              >
                {MODEL_LABEL[slot.slotModel]}
              </span>
            </div>

            {/* Bottom info strip */}
            <div className="absolute bottom-0 inset-x-0 px-3 pb-2.5">
              <div className="h-px bg-white/5 mb-2" />
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-orbitron text-white/30 tracking-wider">RTP</span>
                <span className="text-[9px] font-orbitron font-bold text-green-400/70">{rtp}</span>
              </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#10101e] to-transparent" />
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-orbitron text-sm font-bold text-white/90 leading-tight">{slot.tokenName}</p>
                <p className="text-[11px] text-white/30 font-rajdhani mt-0.5">${slot.tokenSymbol}</p>
              </div>
              <div className="text-right">
                <p className="font-orbitron text-[8px] text-white/20 tracking-widest">AUTO SPIN</p>
                <p className="font-orbitron text-[10px] font-bold mt-0.5" style={{ color: "rgba(212,160,23,0.6)" }}>✓</p>
              </div>
            </div>

            <div
              className="w-full py-2.5 rounded-xl text-center text-[11px] font-orbitron font-bold tracking-wider transition-all group-hover:brightness-110"
              style={{
                background: `${slot.primaryColor}18`,
                color: slot.primaryColor,
                border: `1px solid ${slot.primaryColor}30`,
              }}
            >
              PLAY NOW →
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Placeholder art — mini slot preview using real SVG symbols ───────────────

const LOBBY_SYMBOLS: Record<string, string[]> = {
  Classic3Reel:      ["SEVEN", "CHERRY", "BELL"],
  Standard5Reel:     ["DRAGON", "GEM", "SWORD"],
  FiveReelFreeSpins: ["PHARAOH", "EYE_RA", "SCARAB"],
};

function PlaceholderArt({ slot }: { slot: SlotEntry }) {
  const syms    = LOBBY_SYMBOLS[slot.slotModel] ?? ["SEVEN", "CHERRY", "BELL"];
  const themeId = MODEL_TO_THEME[slot.slotModel] ?? "classic";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      {/* Mini reel window */}
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
        style={{
          background: "rgba(0,0,0,0.45)",
          border: `1px solid ${slot.primaryColor}22`,
          boxShadow: `inset 0 2px 10px rgba(0,0,0,0.55), 0 0 24px ${slot.primaryColor}18`,
        }}
      >
        {syms.map((sym, i) => (
          <SymbolSVG key={i} id={sym} size={46} theme={themeId} />
        ))}
      </div>
      {/* Token ticker */}
      <div
        className="font-orbitron text-[11px] font-black tracking-[0.22em]"
        style={{ color: slot.primaryColor, textShadow: `0 0 18px ${slot.primaryColor}80` }}
      >
        {slot.tokenSymbol}
      </div>
    </div>
  );
}

// ── Demo Slot Card ────────────────────────────────────────────────────────────

const DEMO_MODEL_LABEL: Record<string, string> = {
  Classic3Reel: "3-Reel", Standard5Reel: "5-Reel", FiveReelFreeSpins: "Free Spins",
};

function DemoSlotCard({ slot, index }: { slot: DemoSlot; index: number }) {
  const progress   = Math.min(slot.realSolSim / 85, 1);
  const modelColor = slot.primaryColor;
  const demoSyms   = LOBBY_SYMBOLS[slot.model] ?? ["SEVEN", "CHERRY", "BELL"];
  const demoTheme  = MODEL_TO_THEME[slot.model] ?? "classic";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.18), ease: "easeOut" }}
    >
      <Link href={`/demo/slot/${slot.id}`} className="block h-full group">
        <div
          className="card-slot h-full cursor-pointer"
          style={{ "--hover-color": slot.primaryColor } as React.CSSProperties}
        >
          {/* Art area */}
          <div
            className="h-44 relative overflow-hidden slot-img-placeholder"
            style={{
              background: `linear-gradient(135deg, ${slot.primaryColor}22 0%, ${slot.accentColor}14 50%, #080818 100%)`,
            }}
          >
            {slot.imageUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slot.imageUri} alt={slot.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    border: `1px solid ${slot.primaryColor}22`,
                    boxShadow: `inset 0 2px 10px rgba(0,0,0,0.55), 0 0 24px ${slot.primaryColor}18`,
                  }}
                >
                  {demoSyms.map((sym, i) => (
                    <SymbolSVG key={i} id={sym} size={46} theme={demoTheme} />
                  ))}
                </div>
                <div
                  className="font-orbitron text-[11px] font-black tracking-[0.22em]"
                  style={{ color: slot.primaryColor, textShadow: `0 0 18px ${slot.primaryColor}80` }}
                >
                  ${slot.ticker}
                </div>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex gap-1.5">
              {slot.graduated ? (
                <span className="badge badge-graduated text-[9px]">
                  <Trophy size={8} /> LIVE
                </span>
              ) : (
                <span className="badge badge-gold text-[9px]">
                  <Star size={8} /> DEMO
                </span>
              )}
            </div>

            {/* Model badge */}
            <div className="absolute top-2.5 right-2.5">
              <span className="badge text-[9px]"
                style={{ background: `${modelColor}18`, border: `1px solid ${modelColor}35`, color: modelColor }}>
                {DEMO_MODEL_LABEL[slot.model]}
              </span>
            </div>

            {/* Bonding curve progress bar */}
            <div className="absolute bottom-0 inset-x-0 px-3 pb-2">
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress * 100}%`,
                    background: slot.graduated
                      ? "linear-gradient(90deg,#22c55e,#16a34a)"
                      : `linear-gradient(90deg,${slot.primaryColor},${slot.accentColor})`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5 text-[8px] font-rajdhani text-white/25">
                <span>{slot.realSolSim.toFixed(1)} SOL</span>
                <span>85 SOL</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div>
              <p className="font-orbitron text-sm font-bold text-white/90 leading-tight">{slot.name}</p>
              <p className="text-[11px] text-white/30 font-rajdhani mt-0.5">${slot.ticker}</p>
            </div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-xl text-center text-[11px] font-orbitron font-bold tracking-wider transition-all"
              style={{
                background: `${slot.primaryColor}18`,
                color: slot.primaryColor,
                border: `1px solid ${slot.primaryColor}30`,
              }}
            >
              {slot.graduated ? "PLAY NOW →" : "VIEW CURVE →"}
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Featured Slot Card (wide, card-premium border) ─────────────────────────────

function FeaturedSlotCard({ slot, rank }: { slot: SlotEntry; rank: number }) {
  const rtp = MODEL_RTP[slot.slotModel] ?? "96%";
  return (
    <Link href={`/slot/${slot.mint}?model=${slot.slotModel}`} className="block group flex-1 min-w-0">
      <div
        className="relative overflow-hidden rounded-2xl card-premium cursor-pointer h-full"
        style={{ "--bgc": "var(--bg-card)" } as React.CSSProperties}
      >
        <div className="card-sheen" />

        {/* Art */}
        <div
          className="h-52 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${slot.primaryColor}25 0%, ${slot.accentColor}15 50%, #080818 100%)` }}
        >
          {slot.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slot.heroImageUrl} alt={slot.tokenName}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <PlaceholderArt slot={slot} />
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="font-orbitron text-sm font-black text-white tracking-widest bg-white/15 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
              PLAY NOW →
            </div>
          </div>

          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="badge badge-gold text-[9px] px-2 py-0.5">#{rank} FEATURED</span>
            <span className="badge badge-graduated text-[9px]"><Flame size={8} /> LIVE</span>
          </div>
          <div className="absolute top-3 right-3">
            <span className="font-orbitron text-[9px] font-bold text-green-400/80 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-1">
              {rtp} RTP
            </span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#10101e] to-transparent" />
        </div>

        {/* Info */}
        <div className="p-5 space-y-3">
          <div>
            <p className="font-orbitron text-base font-black text-white/95">{slot.tokenName}</p>
            <p className="text-[12px] text-white/35 font-rajdhani mt-0.5">${slot.tokenSymbol} · {MODEL_LABEL[slot.slotModel]}</p>
          </div>
          <div
            className="w-full py-3 rounded-xl text-center text-[11px] font-orbitron font-black tracking-wider transition-all group-hover:brightness-110"
            style={{
              background: `${slot.primaryColor}28`,
              color: slot.primaryColor,
              border: `1px solid ${slot.primaryColor}45`,
            }}
          >
            PLAY NOW →
          </div>
        </div>
      </div>
    </Link>
  );
}

function FeaturedSlotsRow({ slots }: { slots: SlotEntry[] }) {
  const featured = slots.slice(0, 2);
  if (featured.length < 2) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-orbitron text-[10px] font-bold tracking-widest" style={{ color: "var(--fg4)" }}>
          ★ FEATURED SLOTS
        </span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(to right, rgba(212,160,23,0.3), transparent)" }} />
      </div>
      <div className="flex gap-4">
        {featured.map((slot, i) => (
          <FeaturedSlotCard key={slot.mint} slot={slot} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
