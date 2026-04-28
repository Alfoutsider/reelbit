"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ExternalLink, Copy, Zap, TrendingUp, BarChart2, RefreshCw, Twitter, MessageSquare, Users, Heart, Send } from "lucide-react";
import Link from "next/link";
import { usePrivy, useWallets } from "@/lib/privy";
import { BuySellPanel } from "@/components/slot/BuySellPanel";
import { BondingCurveChart, type PricePoint } from "@/components/chart/BondingCurveChart";
import { cn, shortenAddress, formatUsd, graduationProgress } from "@/lib/utils";
import { SLOT_MODELS } from "@/lib/constants";
import type { SlotToken, TradeEvent } from "@/types/slot";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const POLL_INTERVAL_MS  = 12_000;
const CHART_POLL_MS     = 15_000;
const TRADES_POLL_MS    = 10_000;
const COMMENTS_POLL_MS  = 15_000;

interface Comment {
  id:        string;
  wallet:    string;
  text:      string;
  timestamp: number;
  likes:     number;
}

interface Holder {
  wallet: string;
  amount: number;
  pct:    number;
}

// ── API response type ─────────────────────────────────────────────────────────

interface TokenApiResponse {
  mint: string;
  name: string;
  symbol: string;
  model: string;
  image: string;
  graduated: boolean;
  devBuyPct: number;
  bondingCurve: {
    creator: string;
    virtualSol: string;
    virtualTokens: string;
    realSol: string;
    realTokens: string;
    pricePerTokenSol: number;
    mcapSol: number;
    progressPct: number;
    graduationEtaMs: number | null;
  } | null;
}

function mapApiToSlotToken(r: TokenApiResponse, solPriceUsd: number): SlotToken {
  const mcapSol  = r.bondingCurve?.mcapSol  ?? 0;
  const priceSol = r.bondingCurve?.pricePerTokenSol ?? 0;
  return {
    mint:       r.mint,
    name:       r.name,
    ticker:     r.symbol,
    imageUri:   r.image ?? "",
    model:      (r.model as SlotToken["model"]) ?? "Classic3Reel",
    creator:    r.bondingCurve?.creator ?? "",
    graduated:  r.graduated,
    devBuyPct:  r.devBuyPct ?? 0,
    mcapUsd:    mcapSol  * solPriceUsd,
    priceUsd:   priceSol * solPriceUsd * 1e9,
    volume24h:  0,
    createdAt:  Date.now(),
  };
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatEta(ms: number | null): string | null {
  if (ms === null) return null;
  if (ms <= 0)     return "Imminent";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `~${Math.round(h / 24)}d`;
  if (h > 0)   return `~${h}h ${m}m`;
  if (m > 0)   return `~${m}m`;
  return "<1m";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SlotPage({ params }: { params: { mint: string } }) {
  const { mint } = params;
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? "";

  const [slot,       setSlot]      = useState<SlotToken | null>(null);
  const [solPrice,   setSolPrice]  = useState(150);
  const [progress,   setProgress]  = useState(0);
  const [etaMs,      setEtaMs]     = useState<number | null>(null);
  const [trades,     setTrades]    = useState<TradeEvent[]>([]);
  const [chartData,  setChartData] = useState<PricePoint[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState<string | null>(null);
  const [tradeKey,   setTradeKey]  = useState(0);

  // Comments
  const [comments,     setComments]     = useState<Comment[]>([]);
  const [commentText,  setCommentText]  = useState("");
  const [commenting,   setCommenting]   = useState(false);
  const [activeTab,    setActiveTab]    = useState<"trades" | "comments">("trades");

  // Holders
  const [holders,      setHolders]      = useState<Holder[]>([]);
  const [holdersLoaded, setHoldersLoaded] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchToken = useCallback(async () => {
    try {
      const [priceRes, tokenRes] = await Promise.all([
        fetch(`${API}/sol-price`).then((r) => r.ok ? r.json() as Promise<{ price: number }> : null).catch(() => null),
        fetch(`${API}/tokens/${mint}`),
      ]);
      const currentSolPrice = priceRes?.price ?? solPrice;
      if (priceRes?.price) setSolPrice(priceRes.price);

      if (!tokenRes.ok) {
        if (tokenRes.status === 404) throw new Error("Token not found");
        throw new Error(`API error ${tokenRes.status}`);
      }
      const data: TokenApiResponse = await tokenRes.json();
      const mapped = mapApiToSlotToken(data, currentSolPrice);
      setSlot(mapped);
      setProgress(data.bondingCurve?.progressPct ?? graduationProgress(mapped.mcapUsd));
      setEtaMs(data.bondingCurve?.graduationEtaMs ?? null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [mint, solPrice]);

  const fetchChart = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tokens/${mint}/chart?limit=300`);
      if (res.ok) setChartData(await res.json());
    } catch {}
  }, [mint]);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tokens/${mint}/trades?limit=50`);
      if (res.ok) setTrades(await res.json());
    } catch {}
  }, [mint]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tokens/${mint}/comments?limit=100`);
      if (res.ok) setComments(await res.json());
    } catch {}
  }, [mint]);

  const fetchHolders = useCallback(async () => {
    if (holdersLoaded) return;
    try {
      const res = await fetch(`${API}/tokens/${mint}/holders?limit=50`);
      if (res.ok) {
        setHolders(await res.json());
        setHoldersLoaded(true);
      }
    } catch {}
  }, [mint, holdersLoaded]);

  const submitComment = async () => {
    if (!commentText.trim() || !walletAddress || commenting) return;
    setCommenting(true);
    try {
      const res = await fetch(`${API}/tokens/${mint}/comments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ wallet: walletAddress, text: commentText.trim() }),
      });
      if (res.ok) {
        const c: Comment = await res.json();
        setComments((prev) => [c, ...prev]);
        setCommentText("");
      }
    } catch {} finally {
      setCommenting(false);
    }
  };

  const likeComment = async (commentId: string) => {
    try {
      await fetch(`${API}/tokens/${mint}/comments/${commentId}/like`, { method: "POST" });
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likes: c.likes + 1 } : c));
    } catch {}
  };

  // Initial load + slow poll for curve state and chart (SSE handles trades/price)
  useEffect(() => {
    fetchToken();
    fetchChart();
    fetchTrades();
    fetchComments();
    fetchHolders();
    // Keep slow poll for full token refresh and chart; SSE handles the hot path
    const tokenId    = setInterval(fetchToken,    POLL_INTERVAL_MS);
    const chartId    = setInterval(fetchChart,    CHART_POLL_MS);
    const commentsId = setInterval(fetchComments, COMMENTS_POLL_MS);
    return () => { clearInterval(tokenId); clearInterval(chartId); clearInterval(commentsId); };
  }, [fetchToken, fetchChart, fetchComments, fetchHolders]);

  // SSE: real-time trade and price updates — no polling needed for these
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API}/tokens/${mint}/stream`);

      es.addEventListener("trade", (e: MessageEvent) => {
        try {
          const t = JSON.parse(e.data) as TradeEvent;
          setTrades((prev) => [t, ...prev].slice(0, 50));
        } catch {}
      });

      es.addEventListener("price", (e: MessageEvent) => {
        try {
          const p = JSON.parse(e.data) as { mcapUsd: number; priceUsd: number; progressPct: number };
          setSlot((prev) => prev ? { ...prev, mcapUsd: p.mcapUsd, priceUsd: p.priceUsd } : prev);
          setProgress(p.progressPct);
          // Append new candle to chart
          setChartData((prev) => [...prev, { ts: Date.now(), priceUsd: p.priceUsd, mcapUsd: p.mcapUsd, realSolLamports: 0, progressPct: p.progressPct }]);
        } catch {}
      });

      es.onerror = () => {
        // SSE disconnected — fall back to polling until reconnect
        es?.close();
      };
    } catch {
      // EventSource not supported (SSR guard) — polling already running
    }
    return () => es?.close();
  }, [mint]);

  function onTradeComplete() {
    setTradeKey((k) => k + 1);
    // Brief delay so the chain confirms before we re-fetch price
    setTimeout(fetchToken, 3_000);
  }

  const model    = SLOT_MODELS.find((m) => m.id === slot?.model);
  const nearGrad = progress > 75 && !slot?.graduated;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="grid-overlay opacity-30" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500" />
          <p className="font-orbitron text-xs text-white/30 tracking-widest">LOADING TOKEN</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !slot) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="grid-overlay opacity-30" />
        <div className="relative z-10 text-center space-y-4">
          <p className="font-orbitron text-xl text-white/60">{error ?? "Token not found"}</p>
          <p className="font-rajdhani text-white/30 text-sm">Mint: {mint.slice(0, 16)}…</p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 font-rajdhani font-semibold">
            <ArrowLeft size={14} /> Back to all slots
          </Link>
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen">
      <div className="grid-overlay opacity-30" />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white transition-colors font-rajdhani font-semibold">
          <ArrowLeft size={14} /> All Slots
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* Header card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-panel p-6">
              <div className="flex items-start gap-5">
                <div className="relative w-[72px] h-[72px] shrink-0">
                  {slot.imageUri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.imageUri} alt={slot.name}
                      className="w-full h-full rounded-2xl object-cover border border-white/8" />
                  ) : (
                    <div className="w-full h-full rounded-2xl slot-img-placeholder border border-white/8 flex items-center justify-center">
                      <span className="font-orbitron text-lg font-black text-white/15 tracking-wider">
                        {slot.ticker.slice(0, 2)}
                      </span>
                    </div>
                  )}
                  {slot.graduated && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-casino-card flex items-center justify-center">
                      <Zap size={10} className="text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-orbitron text-2xl font-black text-white">{slot.name}</h1>
                    <span className="badge badge-model">{model?.emoji} {model?.label}</span>
                    {slot.graduated && <span className="badge badge-graduated"><Zap size={8} /> GRADUATED</span>}
                    {nearGrad && <span className="badge badge-gold animate-pulse-gold">🔥 NEAR GRADUATION</span>}
                    {slot.devBuyPct > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-orbitron font-bold border border-green-500/30 bg-green-500/8 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        DEV HOLDING · {slot.devBuyPct}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[12px] text-white/35 font-rajdhani font-semibold flex-wrap">
                    {slot.creator && <span>by {shortenAddress(slot.creator)}</span>}
                    <button onClick={() => navigator.clipboard.writeText(mint)}
                      className="flex items-center gap-1 hover:text-white transition-colors">
                      <Copy size={10} /> {shortenAddress(mint)}
                    </button>
                    <a href={`https://solscan.io/token/${mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-white transition-colors">
                      <ExternalLink size={10} /> Solscan
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just launched ${slot.name} ($${slot.ticker}) — a slot machine token on @ReelBitFun 🎰\n\nPlay it at reelbit.fun/slot/${mint}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-sky-400 transition-colors">
                      <Twitter size={10} /> Share
                    </a>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-orbitron text-xl font-black text-white">
                    ${slot.priceUsd < 0.01 ? slot.priceUsd.toFixed(8) : slot.priceUsd.toFixed(4)}
                  </p>
                  <p className="font-orbitron text-[10px] text-white/25 tracking-wider mt-1">
                    MCAP {formatUsd(slot.mcapUsd / solPrice, solPrice)}
                  </p>
                  <button onClick={fetchToken} className="mt-1 text-white/20 hover:text-white/50 transition-colors">
                    <RefreshCw size={11} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-3 gap-3">
              {[
                { label: "Market Cap", value: formatUsd(slot.mcapUsd / solPrice, solPrice), icon: BarChart2 },
                { label: "24h Volume",  value: slot.volume24h > 0 ? formatUsd(slot.volume24h / solPrice, solPrice) : "—", icon: TrendingUp },
                { label: "Curve",       value: slot.graduated ? "GRADUATED" : `${progress.toFixed(1)}%`, icon: Zap },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="stat-box">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={10} className="text-purple-400" />
                    <p className="label">{label}</p>
                  </div>
                  <p className="value text-lg">{value}</p>
                </div>
              ))}
            </motion.div>

            {/* Bonding curve progress */}
            {!slot.graduated && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="card-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">GRADUATION PROGRESS</p>
                    <p className="font-rajdhani text-sm text-white/40 mt-0.5">$100,000 target · 85 SOL in vault</p>
                  </div>
                  <span className={cn("font-orbitron text-lg font-black",
                    nearGrad ? "text-gold" : "text-purple-400")}>
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <div className="bonding-bar-track" style={{ height: 10, borderRadius: 5 }}>
                  <motion.div className={cn("bonding-bar-fill", nearGrad && "near-grad")}
                    style={{ height: "100%", width: `${Math.min(progress, 100)}%` }}
                    initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }} />
                </div>
                <div className="flex justify-between text-[11px] text-white/25 font-orbitron">
                  <span>${(slot.mcapUsd / 1000).toFixed(1)}K current</span>
                  <div className="flex items-center gap-3">
                    {formatEta(etaMs) && (
                      <span className="text-purple-400/70">ETA {formatEta(etaMs)}</span>
                    )}
                    <span className="text-white/40">85 SOL target</span>
                  </div>
                </div>
                <BondingCurveChart
                  chartData={chartData}
                  currentMcapUsd={slot.mcapUsd}
                  currentPriceUsd={slot.priceUsd}
                />
              </motion.div>
            )}

            {/* Trades / Comments tabs */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="card-panel overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-white/5">
                {([
                  { id: "trades"   as const, label: "Trades",   icon: TrendingUp,    count: trades.length },
                  { id: "comments" as const, label: "Comments", icon: MessageSquare, count: comments.length },
                ]).map(({ id, label, icon: Icon, count }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-5 py-3.5 text-[10px] font-orbitron font-bold tracking-widest border-b-2 transition-all -mb-px",
                      activeTab === id
                        ? "border-purple-500 text-purple-400"
                        : "border-transparent text-white/25 hover:text-white/50",
                    )}>
                    <Icon size={10} /> {label}
                    {count > 0 && <span className="ml-0.5 text-white/20">({count})</span>}
                  </button>
                ))}
              </div>

              {/* Trades panel */}
              <AnimatePresence mode="wait">
                {activeTab === "trades" && (
                  <motion.div key="trades" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {trades.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="font-rajdhani text-white/25 text-sm">No trades recorded yet.</p>
                        <p className="font-rajdhani text-white/15 text-xs mt-1">New trades appear here automatically.</p>
                      </div>
                    ) : (
                      <div className="max-h-[340px] overflow-y-auto">
                        {trades.map((t, i) => (
                          <motion.div key={t.txSig} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }} className="trade-row">
                            <div className="flex items-center gap-3">
                              <span className={cn("badge text-[9px]",
                                t.type === "buy"
                                  ? "bg-green-500/12 border-green-500/25 text-green-400"
                                  : "bg-red-500/12 border-red-500/25 text-red-400")}>
                                {t.type.toUpperCase()}
                              </span>
                              <span className="font-mono text-[11px] text-white/40">{shortenAddress(t.wallet)}</span>
                            </div>
                            <div className="flex items-center gap-5 text-[11px] text-white/30 font-rajdhani font-semibold">
                              <span className="font-mono">
                                {t.type === "buy"
                                  ? `${t.solAmount.toFixed(3)} SOL`
                                  : `${(t.tokenAmount / 1_000_000).toFixed(1)}M $${slot.ticker}`}
                              </span>
                              <span className="text-white/20">{timeAgo(t.timestamp)}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Comments panel */}
                {activeTab === "comments" && (
                  <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* Input */}
                    <div className="p-4 border-b border-white/5">
                      {authenticated && walletAddress ? (
                        <div className="flex gap-2">
                          <textarea
                            ref={commentInputRef}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                            placeholder="Share your thoughts…"
                            rows={2}
                            maxLength={500}
                            className="flex-1 rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2.5 text-sm font-rajdhani text-white placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-colors resize-none"
                          />
                          <button
                            onClick={submitComment}
                            disabled={!commentText.trim() || commenting}
                            className="flex-shrink-0 w-10 h-10 self-end rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center hover:bg-purple-600/40 transition-colors disabled:opacity-30">
                            <Send size={13} className="text-purple-400" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-center text-[11px] text-white/25 font-rajdhani py-1">Connect wallet to comment</p>
                      )}
                    </div>

                    {/* Comment list */}
                    <div className="max-h-[340px] overflow-y-auto divide-y divide-white/[0.04]">
                      {comments.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                          <p className="font-rajdhani text-white/25 text-sm">No comments yet. Be the first!</p>
                        </div>
                      ) : comments.map((c) => (
                        <div key={c.id} className="px-4 py-3 flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[9px] font-orbitron text-purple-400/70">{c.wallet.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono text-white/40">{shortenAddress(c.wallet)}</span>
                              <span className="text-[10px] text-white/20 font-rajdhani">{timeAgo(c.timestamp)}</span>
                            </div>
                            <p className="text-[13px] font-rajdhani text-white/70 leading-relaxed break-words">{c.text}</p>
                          </div>
                          <button onClick={() => likeComment(c.id)}
                            className="flex items-center gap-1 text-[10px] text-white/20 hover:text-pink-400 transition-colors flex-shrink-0 mt-1">
                            <Heart size={10} /> {c.likes > 0 ? c.likes : ""}
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <BuySellPanel key={tradeKey} slot={slot} onTradeComplete={onTradeComplete} />
            </motion.div>

            {/* Fee distribution */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">FEE DISTRIBUTION</p>
              <div className="space-y-2">
                {[
                  { k: "Creator",          v: "25%", highlight: true },
                  { k: "Platform",         v: "25%", highlight: false },
                  { k: "Jackpot Pool",     v: "45%", highlight: false },
                  { k: "Legal+Licensing",  v: "5%",  highlight: false },
                ].map(({ k, v, highlight }) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="font-rajdhani text-[12px] text-white/40">{k}</span>
                    <span className={`font-orbitron text-xs font-bold ${highlight ? "text-gold" : "text-white/50"}`}>{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/25 font-rajdhani border-t border-white/5 pt-3">
                Distributed every 30 min from the fee vault. Jackpot seeds the casino prize pool at graduation.
              </p>
            </motion.div>

            {/* Projection stats */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">CREATOR PROJECTIONS</p>
              <div className="space-y-2.5">
                {(() => {
                  const avgFeePct  = 0.015; // 1.5% mid-tier
                  const creatorCut = 0.25;
                  const mcapUsd    = slot.mcapUsd;
                  const solLeft    = Math.max(0, 100_000 - mcapUsd);

                  // Assume 1% daily turnover on remaining liquidity
                  const estDailyVolUsd   = mcapUsd * 0.01;
                  const estDailyCreator  = estDailyVolUsd * avgFeePct * creatorCut;
                  const estWeeklyCreator = estDailyCreator * 7;

                  const pctToGrad = Math.max(0, 100 - progress).toFixed(0);

                  return [
                    {
                      label: "Est. daily creator fees",
                      value: estDailyCreator > 0.01 ? `$${estDailyCreator.toFixed(2)}` : "—",
                      sub: "at current MCap × 1% daily vol × 1.5% fee",
                    },
                    {
                      label: "Est. weekly creator fees",
                      value: estWeeklyCreator > 0.01 ? `$${estWeeklyCreator.toFixed(2)}` : "—",
                      sub: "same velocity",
                    },
                    {
                      label: slot.graduated ? "Post-grad LP share" : "At graduation — LP share",
                      value: `~$3,000/mo`,
                      sub: "25% of casino LP fees (est. $10k/day volume)",
                    },
                    {
                      label: "Remaining to graduation",
                      value: slot.graduated ? "✓ Graduated" : `${pctToGrad}% left`,
                      sub: slot.graduated ? "Your slot is live in the casino" : `~$${(solLeft / 1000).toFixed(0)}K MCap to go`,
                    },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <span className="font-rajdhani text-[11px] text-white/35">{label}</span>
                        <span className="font-orbitron text-xs font-bold text-purple-400">{value}</span>
                      </div>
                      <p className="text-[9px] text-white/20 font-rajdhani">{sub}</p>
                    </div>
                  ));
                })()}
              </div>
              <p className="text-[9px] text-white/15 font-rajdhani border-t border-white/5 pt-3">
                Projections are estimates based on current curve state and assumed trading velocity. Not financial advice.
              </p>
            </motion.div>

            {/* Token details */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">TOKEN DETAILS</p>
              <div className="space-y-2">
                {[
                  { k: "Model",    v: `${model?.emoji ?? ""} ${model?.label ?? slot.model}` },
                  { k: "Reels",    v: `${model?.reels ?? "?"} reels` },
                  { k: "RTP",      v: slot.model === "Classic3Reel" ? "94–98%" : slot.model === "Standard5Reel" ? "92–96%" : "90–94%" },
                  { k: "Supply",   v: "1,000,000,000" },
                  { k: "Network",  v: "Solana devnet" },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between text-[12px]">
                    <span className="text-white/30 font-orbitron tracking-wide text-[10px]">{k}</span>
                    <span className="text-white/70 font-rajdhani font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Holder list */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              className="card-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users size={11} className="text-purple-400" />
                  <p className="font-orbitron text-[10px] font-bold text-white/50 tracking-widest">TOP HOLDERS</p>
                </div>
                {holders.length > 0 && (
                  <span className="text-[9px] text-white/20 font-orbitron">{holders.length} wallets</span>
                )}
              </div>
              {holders.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="font-rajdhani text-white/20 text-xs">Holder data loads from Helius DAS</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04] max-h-[280px] overflow-y-auto">
                  {holders.slice(0, 20).map((h, i) => (
                    <div key={h.wallet} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-[10px] font-orbitron text-white/20 w-5 text-right flex-shrink-0">{i + 1}</span>
                      <span className="flex-1 font-mono text-[11px] text-white/50 truncate">{shortenAddress(h.wallet)}</span>
                      <div className="text-right flex-shrink-0">
                        <span className="font-orbitron text-[10px] text-white/60">{h.pct.toFixed(2)}%</span>
                      </div>
                      {/* Mini bar */}
                      <div className="w-16 h-1.5 rounded-full bg-white/5 flex-shrink-0">
                        <div className="h-full rounded-full bg-purple-500/50"
                          style={{ width: `${Math.min(100, h.pct / (holders[0]?.pct || 1) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
