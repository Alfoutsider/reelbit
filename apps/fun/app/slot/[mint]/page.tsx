"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Copy, Zap } from "lucide-react";
import Link from "next/link";
import { BuySellPanel } from "@/components/slot/BuySellPanel";
import { BondingCurveChart } from "@/components/chart/BondingCurveChart";
import { cn, shortenAddress, formatUsd, graduationProgress } from "@/lib/utils";
import { SLOT_MODELS } from "@/lib/constants";
import type { SlotToken, TradeEvent } from "@/types/slot";

// Mock slot data — replaced by on-chain fetch in Sprint 3
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

export default function SlotPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params);
  const slot = MOCK_SLOT; // TODO: fetch by mint
  const progress = graduationProgress(slot.mcapUsd);
  const model = SLOT_MODELS.find((m) => m.id === slot.model);
  const SOL_PRICE = 150;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
        <ArrowLeft size={14} /> All Slots
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: token info + chart */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-900/40 to-black flex items-center justify-center text-3xl border border-white/5 shrink-0">
              🎰
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{slot.name}</h1>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/40">${slot.ticker}</span>
                {slot.graduated && (
                  <span className="flex items-center gap-1 rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-xs text-green-400">
                    <Zap size={10} /> Graduated
                  </span>
                )}
                <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                  {model?.emoji} {model?.label}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-sm text-white/40">
                <span>by {shortenAddress(slot.creator)}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(mint)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Copy size={11} /> {shortenAddress(mint)}
                </button>
                <a
                  href={`https://solscan.io/token/${mint}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <ExternalLink size={11} /> Solscan
                </a>
              </div>
            </div>
            {/* Price */}
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-white">${slot.priceUsd.toFixed(7)}</p>
              <p className="text-xs text-white/30">MCap {formatUsd(slot.mcapUsd / SOL_PRICE, SOL_PRICE)}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Market Cap",  value: formatUsd(slot.mcapUsd / SOL_PRICE, SOL_PRICE) },
              { label: "24h Volume",  value: formatUsd(slot.volume24h / SOL_PRICE, SOL_PRICE) },
              { label: "Curve",       value: `${progress.toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-0.5">
                <p className="text-xs text-white/35">{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Graduation progress */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Graduation Progress</span>
              <span className={cn("font-semibold", progress > 80 ? "text-purple-300" : "text-white/60")}>
                {progress.toFixed(1)}% to $100k
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  progress >= 100
                    ? "bg-green-400"
                    : "bg-gradient-to-r from-purple-500 to-pink-500"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <BondingCurveChart currentMcapUsd={slot.mcapUsd} />
          </div>

          {/* Trade history */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <h3 className="text-sm font-medium text-white">Trade History</h3>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {MOCK_TRADES.map((t) => (
                <motion.div
                  key={t.txSig}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between px-5 py-3 text-sm hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      t.type === "buy"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-red-500/15 text-red-400"
                    )}>
                      {t.type.toUpperCase()}
                    </span>
                    <span className="text-white/50 font-mono text-xs">{t.wallet}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="font-mono">
                      {t.type === "buy"
                        ? `${t.solAmount} SOL`
                        : `${t.tokenAmount.toLocaleString()} ${slot.ticker}`}
                    </span>
                    <span>{timeAgo(t.timestamp)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: buy/sell */}
        <div className="space-y-4">
          <BuySellPanel slot={slot} />

          {/* Creator earnings info */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-white/40 space-y-2">
            <p className="text-white/60 font-medium">Creator Earnings</p>
            <p>25% of all trading fees are sent directly to the creator wallet after graduation.</p>
            <p className="text-purple-300/70">Est. today: ~{formatUsd(slot.volume24h * 0.0004 / SOL_PRICE, SOL_PRICE)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
