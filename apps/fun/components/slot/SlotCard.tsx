"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { TrendingUp, Zap, Clock } from "lucide-react";
import { cn, formatUsd, shortenAddress, graduationProgress } from "@/lib/utils";
import type { SlotToken } from "@/types/slot";
import { SLOT_MODELS } from "@/lib/constants";

interface Props {
  slot: SlotToken;
  solPrice?: number;
  index?: number;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export function SlotCard({ slot, solPrice = 150, index = 0 }: Props) {
  const progress = graduationProgress(slot.mcapUsd);
  const model = SLOT_MODELS.find((m) => m.id === slot.model);
  const nearGrad = progress > 75 && !slot.graduated;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Link href={`/slot/${slot.mint}`} className="block card-slot group">
        <div className="relative h-40 w-full overflow-hidden rounded-t-2xl">
          {slot.imageUri ? (
            <Image src={slot.imageUri} alt={slot.name} fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
          ) : (
            <div className="slot-img-placeholder h-full w-full relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-orbitron text-xl font-black text-white/10 tracking-widest">{slot.ticker}</span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-casino-card via-transparent to-transparent" />
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
            {slot.graduated ? (
              <span className="badge badge-graduated"><Zap size={8} /> LIVE</span>
            ) : nearGrad ? (
              <span className="badge badge-gold animate-pulse-gold">🔥 GRADUATING</span>
            ) : (
              <span className="badge badge-model">{model?.label}</span>
            )}
            <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-white/50 font-orbitron">
              <Clock size={8} />{timeAgo(slot.createdAt)}
            </span>
          </div>
        </div>

        <div className="card-body-cream p-4 space-y-3.5 rounded-b-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-rajdhani font-bold text-[15px] leading-tight truncate" style={{ color: "#1a1a1a" }}>{slot.name}</p>
              <p className="text-[11px] font-orbitron tracking-wider mt-0.5" style={{ color: "rgba(26,26,26,0.45)" }}>${slot.ticker}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-orbitron text-sm font-bold" style={{ color: "#1a1a1a" }}>{formatUsd(slot.mcapUsd / solPrice, solPrice)}</p>
              <p className="text-[10px] font-orbitron" style={{ color: "rgba(26,26,26,0.4)" }}>MCAP</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="section-label text-[9px]" style={{ color: "rgba(26,26,26,0.4)" }}>Bonding Curve</span>
              <span className={cn(
                "font-orbitron text-[10px] font-bold",
                slot.graduated ? "text-green-600" : nearGrad ? "animate-pulse-gold" : ""
              )} style={slot.graduated || nearGrad ? {} : { color: "var(--brand-red)" }}>
                {slot.graduated ? "GRADUATED" : `${progress.toFixed(1)}%`}
              </span>
            </div>
            <div className="bonding-bar-track">
              <motion.div
                className={cn("bonding-bar-fill", nearGrad && "near-grad")}
                style={{ width: `${Math.min(progress, 100)}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5" style={{ borderTop: "1px solid rgba(26,26,26,0.08)" }}>
            <span className="flex items-center gap-1.5 text-[11px] font-rajdhani font-semibold" style={{ color: "rgba(26,26,26,0.45)" }}>
              <TrendingUp size={11} style={{ color: "var(--brand-red)" }} />
              {formatUsd(slot.volume24h / solPrice, solPrice)} vol
            </span>
            <span className="text-[10px] font-mono" style={{ color: "rgba(26,26,26,0.35)" }}>{shortenAddress(slot.creator)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
