"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Copy, Zap, TrendingUp, BarChart2 } from "lucide-react";
import Link from "next/link";
import { BuySellPanel } from "@/components/slot/BuySellPanel";
import { BondingCurveChart } from "@/components/chart/BondingCurveChart";
import { cn, shortenAddress, formatUsd, graduationProgress } from "@/lib/utils";
import { SLOT_MODELS } from "@/lib/constants";
import type { SlotToken, TradeEvent } from "@/types/slot";

const MOCK_SLOT: SlotToken = {
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
};

const MOCK_TRADES: TradeEvent[] = [
  { txSig: "abc1", type: "buy",  wallet: "7xKX…AsU", solAmount: 1.5, tokenAmount: 17_812_500, priceUsd: 0.0000842, timestamp: Date.now() - 60000 },
  { txSig: "abc2", type: "sell", wallet: "9WzD…WM",  solAmount: 0.3, tokenAmount: 3_562_500,  priceUsd: 0.0000841, timestamp: Date.now() - 120000 },
  { txSig: "abc3", type: "buy",  wallet: "HN7c…rH",  solAmount: 5.0, tokenAmount: 59_375_000, priceUsd: 0.0000840, timestamp: Date.now() - 180000 },
  { txSig: "abc4", type: "buy",  wallet: "3h1z…VL",  solAmount: 0.8, tokenAmount: 9_500_000,  priceUsd: 0.0000839, timestamp: Date.now() - 300000 },
];

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function SlotPage({ params }: { params: { mint: string } }) {
  const { mint } = params;
  const slot = MOCK_SLOT;
  const progress = graduationProgress(slot.mcapUsd);
  const model = SLOT_MODELS.find((m) => m.id === slot.model);
  const nearGrad = progress > 75 && !slot.graduated;
  const SOL_PRICE = 150;

  return (
    <div className="relative min-h-screen">
      <div className="grid-overlay opacity-30" />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white transition-colors font-rajdhani font-semibold">
          <ArrowLeft size={14} /> All Slots
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-panel p-6">
              <div className="flex items-start gap-5">
                <div className="relative w-[72px] h-[72px] shrink-0">
                  <div className="w-full h-full rounded-2xl slot-img-placeholder border border-white/8 flex items-center justify-center">
                    <span className="font-orbitron text-lg font-black text-white/15 tracking-wider">{slot.ticker.slice(0, 2)}</span>
                  </div>
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
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[12px] text-white/35 font-rajdhani font-semibold flex-wrap">
                    <span>by {shortenAddress(slot.creator)}</span>
                    <button onClick={() => navigator.clipboard.writeText(mint)}
                      className="flex items-center gap-1 hover:text-white transition-colors">
                      <Copy size={10} /> {shortenAddress(mint)}
                    </button>
                    <a href={`https://solscan.io/token/${mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-white transition-colors">
                      <ExternalLink size={10} /> Solscan
                    </a>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-orbitron text-2xl font-black text-white">${slot.priceUsd.toFixed(7)}</p>
                  <p className="font-orbitron text-[10px] text-white/25 tracking-wider mt-1">MCAP {formatUsd(slot.mcapUsd / SOL_PRICE, SOL_PRICE)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-3 gap-3">
              {[
                { label: "Market Cap", value: formatUsd(slot.mcapUsd / SOL_PRICE, SOL_PRICE), icon: BarChart2 },
                { label: "24h Volume", value: formatUsd(slot.volume24h / SOL_PRICE, SOL_PRICE), icon: TrendingUp },
                { label: "Curve",      value: `${progress.toFixed(1)}%`, icon: Zap },
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

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="card-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">GRADUATION PROGRESS</p>
                  <p className="font-rajdhani text-sm text-white/40 mt-0.5">$100,000 target</p>
                </div>
                <span className={cn("font-orbitron text-lg font-black",
                  slot.graduated ? "text-green-400" : nearGrad ? "text-gold" : "text-purple-400")}>
                  {slot.graduated ? "GRADUATED" : `${progress.toFixed(1)}%`}
                </span>
              </div>
              <div className="bonding-bar-track" style={{ height: 10, borderRadius: 5 }}>
                <motion.div className={cn("bonding-bar-fill", nearGrad && "near-grad")}
                  style={{ height: "100%", width: `${Math.min(progress, 100)}%` }}
                  initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }} />
              </div>
              <div className="flex justify-between text-[11px] text-white/25 font-orbitron">
                <span>${(slot.mcapUsd / 1000).toFixed(1)}K</span>
                <span className="text-white/40">$100K graduation threshold</span>
              </div>
              <BondingCurveChart currentMcapUsd={slot.mcapUsd} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="card-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <p className="font-orbitron text-[10px] font-bold text-white/50 tracking-widest">TRADE HISTORY</p>
                <span className="badge badge-model text-[9px]">{MOCK_TRADES.length} trades</span>
              </div>
              <div>
                {MOCK_TRADES.map((t, i) => (
                  <motion.div key={t.txSig} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.06 }} className="trade-row">
                    <div className="flex items-center gap-3">
                      <span className={cn("badge text-[9px]",
                        t.type === "buy" ? "bg-green-500/12 border-green-500/25 text-green-400" : "bg-red-500/12 border-red-500/25 text-red-400")}>
                        {t.type.toUpperCase()}
                      </span>
                      <span className="font-mono text-[11px] text-white/40">{t.wallet}</span>
                    </div>
                    <div className="flex items-center gap-5 text-[11px] text-white/30 font-rajdhani font-semibold">
                      <span className="font-mono">{t.type === "buy" ? `${t.solAmount} SOL` : `${(t.tokenAmount / 1_000_000).toFixed(1)}M ${slot.ticker}`}</span>
                      <span className="text-white/20">{timeAgo(t.timestamp)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <BuySellPanel slot={slot} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">CREATOR EARNINGS</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-rajdhani text-[12px] text-white/40">Your share</span>
                  <span className="font-orbitron text-sm font-bold text-gold">25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-rajdhani text-[12px] text-white/40">Est. today</span>
                  <span className="font-orbitron text-sm font-bold text-green-400">
                    ~{formatUsd(slot.volume24h * 0.0004 / SOL_PRICE, SOL_PRICE)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-white/25 font-rajdhani border-t border-white/5 pt-3">
                25% of all trading fees are sent directly to the creator wallet after graduation.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">TOKEN DETAILS</p>
              <div className="space-y-2">
                {[
                  { k: "Model",   v: `${model?.emoji} ${model?.label}` },
                  { k: "Reels",   v: `${model?.reels} reels` },
                  { k: "RTP",     v: "96% (enforced)" },
                  { k: "Network", v: "Solana devnet" },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between text-[12px]">
                    <span className="text-white/30 font-orbitron tracking-wide text-[10px]">{k}</span>
                    <span className="text-white/70 font-rajdhani font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
