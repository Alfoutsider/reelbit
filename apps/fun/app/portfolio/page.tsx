"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePrivy, useWallets } from "@/lib/privy";
import { ArrowLeft, Wallet, Zap, ExternalLink } from "lucide-react";
import Link from "next/link";
import { shortenAddress } from "@/lib/utils";
import { ReferralWidget } from "@/components/referral/ReferralWidget";
import { DividendsCard } from "@/components/portfolio/DividendsCard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Position {
  mint:         string;
  tokenName:    string;
  tokenSymbol:  string;
  slotModel:    "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  heroImageUrl: string | null;
  primaryColor: string;
  accentColor:  string;
  graduated:    boolean;
  balance:      number;   // tokens (decimal, 6-dp)
  supplyPct:    number;   // % of total supply
  valueUsd:     number;   // estimated value in USD
  priceUsd:     number;   // per token
  mcapUsd:      number;
  progressPct:  number;   // bonding curve progress 0–100
}

const MODEL_LABEL: Record<string, string> = {
  Classic3Reel: "3-Reel", Standard5Reel: "5-Reel", FiveReelFreeSpins: "Free Spins",
};
const MODEL_EMOJI: Record<string, string> = {
  Classic3Reel: "🎰", Standard5Reel: "🎲", FiveReelFreeSpins: "✨",
};

function fmtUsd(n: number) {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

export default function PortfolioPage() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address ?? "";

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated || !walletAddress) return;
    setLoading(true);
    setError(null);
    fetch(`${API}/portfolio/${walletAddress}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((data: Position[]) => setPositions(Array.isArray(data) ? data : []))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [authenticated, walletAddress]);

  const totalValueUsd = positions.reduce((s, p) => s + p.valueUsd, 0);

  if (!authenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="grid-overlay opacity-30" />
        <div className="relative z-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
            <Wallet size={28} className="text-white/30" />
          </div>
          <div>
            <p className="font-orbitron text-xl font-bold text-white">Connect Wallet</p>
            <p className="font-rajdhani text-white/40 mt-1">Sign in to view your token holdings</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={login}
            className="btn-launch px-8 py-3 font-orbitron font-bold text-sm">
            Connect Wallet
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="grid-overlay opacity-30" />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 relative z-10">

        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white transition-colors font-rajdhani font-semibold">
            <ArrowLeft size={14} /> All Slots
          </Link>
        </div>

        {/* PnL hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl px-6 py-6"
          style={{
            background: "linear-gradient(135deg, rgba(196,30,30,0.12) 0%, rgba(139,0,0,0.06) 50%, rgba(6,6,15,0.8) 100%)",
            border: "1px solid rgba(196,30,30,0.2)",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(196,30,30,0.1),transparent_60%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-orbitron text-[10px] font-bold tracking-widest mb-1" style={{ color: "rgba(196,30,30,0.7)" }}>
                PORTFOLIO VALUE
              </p>
              <p className="font-orbitron text-4xl font-black text-white">
                {loading ? <span className="skeleton inline-block w-36 h-9 rounded-lg" /> : fmtUsd(totalValueUsd)}
              </p>
              <p className="font-rajdhani text-sm text-white/35 mt-1">
                {shortenAddress(walletAddress)} · {positions.length} position{positions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-4 sm:flex-col sm:items-end">
              <div className="text-center sm:text-right">
                <p className="font-orbitron text-lg font-black text-white">{positions.length}</p>
                <p className="font-orbitron text-[9px] tracking-widest text-white/30 mt-0.5">POSITIONS</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-orbitron text-lg font-black text-green-400">{positions.filter(p => p.graduated).length}</p>
                <p className="font-orbitron text-[9px] tracking-widest text-white/30 mt-0.5">GRADUATED</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dividends card — renders only when the wallet has unclaimed rounds. */}
        <DividendsCard wallet={walletAddress} />

        {/* Referral widget — only renders if the API has a code for this wallet. */}
        <ReferralWidget wallet={walletAddress} />

        {/* Loading — skeleton rows match the position-row layout below so the */}
        {/* page doesn't jump when data lands. */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-panel p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 skeleton" />
                  <div className="h-2.5 w-20 skeleton" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-3 w-20 skeleton ml-auto" />
                  <div className="h-2.5 w-16 skeleton ml-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="card-panel p-6 text-center">
            <p className="font-rajdhani text-white/40">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && positions.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-panel p-12 text-center space-y-4">
            <div className="text-4xl">🎰</div>
            <p className="font-orbitron text-lg font-bold text-white/60">No holdings yet</p>
            <p className="font-rajdhani text-white/30 text-sm max-w-xs mx-auto">
              Buy into a slot token on the bonding curve and your position will appear here.
            </p>
            <Link href="/">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn-launch px-6 py-2.5 text-sm font-orbitron font-bold mx-auto">
                Explore Slots
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Position cards */}
        {!loading && positions.length > 0 && (
          <div className="space-y-3">
            {positions.map((p, i) => (
              <motion.div key={p.mint}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-panel p-5">
                <div className="flex items-center gap-4">
                  {/* Token image */}
                  <div className="relative w-12 h-12 flex-shrink-0">
                    {p.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.heroImageUrl} alt={p.tokenName}
                        className="w-full h-full rounded-xl object-cover border border-white/8" />
                    ) : (
                      <div className="w-full h-full rounded-xl border border-white/8 flex items-center justify-center"
                        style={{ background: `${p.primaryColor}22` }}>
                        <span className="font-orbitron text-base font-black" style={{ color: p.primaryColor }}>
                          {p.tokenSymbol.slice(0, 2)}
                        </span>
                      </div>
                    )}
                    {p.graduated && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-casino-card flex items-center justify-center">
                        <Zap size={8} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Token info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-orbitron font-bold text-white text-base">{p.tokenName}</span>
                      <span className="text-white/30 font-rajdhani text-sm">${p.tokenSymbol}</span>
                      <span className="badge badge-model text-[9px]">
                        {MODEL_EMOJI[p.slotModel]} {MODEL_LABEL[p.slotModel]}
                      </span>
                      {p.graduated && <span className="badge badge-graduated text-[9px]"><Zap size={7} /> LIVE</span>}
                    </div>
                    {/* Bonding curve progress bar (pre-graduation) */}
                    {!p.graduated && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-white/5">
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.min(100, p.progressPct)}%`, background: "var(--brand-red)" }} />
                        </div>
                        <span className="text-[10px] font-orbitron text-white/25">{p.progressPct.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Right: value block */}
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="font-orbitron font-black text-lg text-white">{fmtUsd(p.valueUsd)}</p>
                    <p className="text-[11px] text-white/30 font-rajdhani">
                      {fmtTokens(p.balance)} tokens · {p.supplyPct.toFixed(3)}% supply
                    </p>
                    <p className="text-[10px] text-white/20 font-mono">
                      {fmtUsd(p.priceUsd)} / token
                    </p>
                  </div>

                  {/* View link */}
                  <Link href={`/slot/${p.mint}`}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors ml-1">
                    <ExternalLink size={12} className="text-white/40" />
                  </Link>
                </div>

                {/* MCap row */}
                {p.mcapUsd > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px]">
                    <span className="text-white/20 font-rajdhani">Market cap</span>
                    <span className="font-orbitron text-white/40">{fmtUsd(p.mcapUsd)}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
