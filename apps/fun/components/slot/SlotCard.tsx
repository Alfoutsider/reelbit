"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { TrendingUp, Users, Zap } from "lucide-react";
import { cn, formatUsd, shortenAddress, graduationProgress } from "@/lib/utils";
import type { SlotToken } from "@/types/slot";
import { SLOT_MODELS } from "@/lib/constants";

interface Props {
  slot: SlotToken;
  solPrice?: number;
  index?: number;
}

export function SlotCard({ slot, solPrice = 150, index = 0 }: Props) {
  const progress = graduationProgress(slot.mcapUsd);
  const model = SLOT_MODELS.find((m) => m.id === slot.model);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Link href={`/slot/${slot.mint}`}>
        <div className="group relative rounded-2xl border border-white/5 bg-white/[0.03] hover:border-purple-500/30 hover:bg-white/[0.06] transition-all duration-200 overflow-hidden">
          {/* Graduation glow when near threshold */}
          {progress > 80 && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none" />
          )}

          {/* Token image */}
          <div className="relative h-44 w-full bg-gradient-to-br from-purple-900/20 to-black/40 overflow-hidden">
            {slot.imageUri ? (
              <Image
                src={slot.imageUri}
                alt={slot.name}
                fill
                className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl">🎰</div>
            )}
            {/* Model badge */}
            <div className="absolute top-2 right-2 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-xs text-white/70">
              {model?.emoji} {model?.label}
            </div>
            {/* Graduated badge */}
            {slot.graduated && (
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/40 px-2 py-0.5 text-xs text-green-400">
                <Zap size={10} /> Graduated
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* Name + ticker */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white leading-tight">{slot.name}</p>
                <p className="text-xs text-white/40">${slot.ticker}</p>
              </div>
              <p className="text-sm font-mono text-purple-300">
                {formatUsd(slot.mcapUsd / solPrice, solPrice)}
              </p>
            </div>

            {/* Bonding curve progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/40">
                <span>Bonding curve</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    progress >= 100
                      ? "bg-green-400"
                      : progress > 70
                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                      : "bg-purple-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-xs text-white/40">
              <span className="flex items-center gap-1">
                <TrendingUp size={11} />
                Vol {formatUsd(slot.volume24h / solPrice, solPrice)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={11} />
                {shortenAddress(slot.creator)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
