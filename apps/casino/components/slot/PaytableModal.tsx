"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Zap, AlignJustify } from "lucide-react";
import type { ThemeConfig } from "@/lib/slotThemes";
import { SymbolSVG } from "./SymbolSVG";

interface Props {
  open: boolean;
  onClose: () => void;
  theme: ThemeConfig;
}

type Tab = "symbols" | "paylines" | "features";

// ── Payline diagrams for 3-reel and 5-reel ───────────────────────────────────

const PAYLINES_DISPLAY_5 = [
  { idx: 1,  label: "Center",    rows: [1,1,1,1,1], color: "#ffd700" },
  { idx: 2,  label: "Top",       rows: [0,0,0,0,0], color: "#00e5ff" },
  { idx: 3,  label: "Bottom",    rows: [2,2,2,2,2], color: "#ff4444" },
  { idx: 4,  label: "V Shape",   rows: [0,1,2,1,0], color: "#a855f7" },
  { idx: 5,  label: "Inv-V",     rows: [2,1,0,1,2], color: "#22c55e" },
  { idx: 6,  label: "Top-left",  rows: [1,0,0,0,1], color: "#f97316" },
  { idx: 7,  label: "Bot-left",  rows: [1,2,2,2,1], color: "#ec4899" },
  { idx: 8,  label: "Stair-dn",  rows: [0,0,1,2,2], color: "#14b8a6" },
  { idx: 9,  label: "Stair-up",  rows: [2,2,1,0,0], color: "#eab308" },
  { idx: 10, label: "Dip",       rows: [1,1,0,1,1], color: "#6366f1" },
];

function PaylineDiagram({ rows, color }: { rows: number[]; color: string }) {
  const W = 12, H = 10, GAP = 3;
  const totalW = rows.length * W + (rows.length - 1) * GAP;
  const points = rows.map((row, col) => [
    col * (W + GAP) + W / 2,
    row * (H + GAP) + H / 2,
  ]);
  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <svg width={totalW} height={3 * H + 2 * GAP} viewBox={`0 0 ${totalW} ${3 * H + 2 * GAP}`}>
      {/* Grid cells */}
      {rows.map((_, col) =>
        [0,1,2].map(row => (
          <rect key={`${col}-${row}`}
            x={col * (W + GAP)} y={row * (H + GAP)}
            width={W} height={H} rx="2"
            fill={rows[col] === row ? `${color}20` : "rgba(255,255,255,0.04)"}
            stroke={rows[col] === row ? color : "rgba(255,255,255,0.08)"}
            strokeWidth={rows[col] === row ? "1.2" : "0.6"}
          />
        ))
      )}
      {/* Payline path */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Active cell dots */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={color}/>
      ))}
    </svg>
  );
}

// ── Symbol row component ──────────────────────────────────────────────────────

function SymbolRow({ sym, theme }: { sym: ThemeConfig["symbols"][number]; theme: ThemeConfig }) {
  const is5reel = theme.reelCount === 5;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
      {/* Symbol icon */}
      <div className="flex-shrink-0">
        <SymbolSVG id={sym.id} size={52} theme={theme.id}/>
      </div>
      {/* Name + tier */}
      <div className="w-28 flex-shrink-0">
        <p className="font-orbitron text-[10px] font-bold text-white/80 leading-tight">{sym.name}</p>
        {sym.isWild && <span className="text-[8px] font-orbitron text-purple-400 tracking-wider">WILD</span>}
        {sym.isScatter && <span className="text-[8px] font-orbitron text-yellow-400 tracking-wider">SCATTER</span>}
      </div>
      {/* Pay values */}
      {sym.isScatter && sym.scatterPay ? (
        <div className="flex gap-2 flex-1 items-center">
          <div className="text-center">
            <p className="text-[8px] text-white/30 font-orbitron">×3</p>
            <p className="text-[11px] font-orbitron font-bold text-yellow-400">{sym.scatterPay.x3} FS</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-white/30 font-orbitron">×4</p>
            <p className="text-[11px] font-orbitron font-bold text-yellow-400">{sym.scatterPay.x4} FS</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-white/30 font-orbitron">×5</p>
            <p className="text-[11px] font-orbitron font-bold text-yellow-400">{sym.scatterPay.x5} FS</p>
          </div>
          <p className="text-[8px] text-white/25 font-rajdhani ml-1">FREE SPINS</p>
        </div>
      ) : sym.isWild ? (
        <div className="flex-1">
          <p className="text-[10px] text-white/40 font-rajdhani">Substitutes for {sym.substituteLabel ?? "all symbols"}</p>
        </div>
      ) : (
        <div className="flex gap-2 flex-1 items-center">
          {sym.pay.x3 > 0 && (
            <div className="text-center min-w-[36px]">
              <p className="text-[8px] text-white/30 font-orbitron">×3</p>
              <p className="text-[11px] font-orbitron font-bold" style={{ color: sym.tier <= 2 ? '#ffd700' : sym.tier === 3 ? '#c0c0c0' : 'rgba(255,255,255,0.5)' }}>
                {sym.pay.x3}×
              </p>
            </div>
          )}
          {is5reel && sym.pay.x4 !== undefined && sym.pay.x4 > 0 && (
            <div className="text-center min-w-[36px]">
              <p className="text-[8px] text-white/30 font-orbitron">×4</p>
              <p className="text-[11px] font-orbitron font-bold" style={{ color: sym.tier <= 2 ? '#ffd700' : sym.tier === 3 ? '#c0c0c0' : 'rgba(255,255,255,0.5)' }}>
                {sym.pay.x4}×
              </p>
            </div>
          )}
          {is5reel && sym.pay.x5 !== undefined && sym.pay.x5 > 0 && (
            <div className="text-center min-w-[36px]">
              <p className="text-[8px] text-white/30 font-orbitron">×5</p>
              <p className="text-[11px] font-orbitron font-bold" style={{ color: sym.tier === 1 ? '#ffd700' : sym.tier === 2 ? '#e0c060' : sym.tier === 3 ? '#c0c0c0' : 'rgba(255,255,255,0.5)' }}>
                {sym.pay.x5}×
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function PaytableModal({ open, onClose, theme }: Props) {
  const [tab, setTab] = useState<Tab>("symbols");

  const primary = theme.cabinet.primary;

  // Sort: WILD/SCATTER first, then by tier
  const sortedSymbols = [...theme.symbols].sort((a, b) => {
    if (a.isWild && !b.isWild) return -1;
    if (b.isWild && !a.isWild) return 1;
    if (a.isScatter && !b.isScatter) return -1;
    if (b.isScatter && !a.isScatter) return 1;
    return a.tier - b.tier;
  });

  const is5reel = theme.reelCount >= 5;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="paytable-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg bg-[#080810] rounded-2xl overflow-hidden border"
            style={{ borderColor: `${primary}30`, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"
              style={{ background: `linear-gradient(135deg, ${primary}12, transparent)` }}>
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen size={14} style={{ color: primary }}/>
                  <p className="font-orbitron text-[11px] font-bold text-white/70 tracking-widest">PAYTABLE</p>
                </div>
                <p className="font-orbitron text-base font-black text-white mt-0.5">{theme.name}</p>
              </div>
              <div className="text-right mr-2">
                <p className="text-[9px] font-orbitron text-white/30">RTP</p>
                <p className="font-orbitron text-sm font-bold" style={{ color: primary }}>{theme.rtp}</p>
                <p className="text-[9px] font-orbitron text-white/30 mt-0.5">MAX WIN</p>
                <p className="font-orbitron text-[11px] font-bold text-yellow-400">{theme.maxWin}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/10 transition-colors"
              >
                <X size={14} className="text-white/60"/>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {([
                { id: "symbols" as Tab,   label: "Symbols",  icon: <Zap size={11}/> },
                { id: "paylines" as Tab,  label: "Paylines", icon: <AlignJustify size={11}/> },
                { id: "features" as Tab,  label: "Features", icon: <BookOpen size={11}/> },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-orbitron font-bold tracking-wider transition-all ${
                    tab === t.id
                      ? "text-white border-b-2"
                      : "text-white/35 hover:text-white/55"
                  }`}
                  style={tab === t.id ? { borderBottomColor: primary } : {}}
                >
                  <span style={{ color: tab === t.id ? primary : undefined }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">

              {tab === "symbols" && (
                <div>
                  {/* Header row */}
                  <div className="flex items-center gap-3 pb-2 mb-1">
                    <div className="w-14 flex-shrink-0"/>
                    <div className="w-28 flex-shrink-0">
                      <p className="text-[8px] font-orbitron text-white/25 tracking-widest">SYMBOL</p>
                    </div>
                    <div className="flex gap-2 flex-1">
                      <p className="text-[8px] font-orbitron text-white/25 tracking-widest min-w-[36px] text-center">3 OF KIND</p>
                      {is5reel && <p className="text-[8px] font-orbitron text-white/25 tracking-widest min-w-[36px] text-center">4 OF KIND</p>}
                      {is5reel && <p className="text-[8px] font-orbitron text-white/25 tracking-widest min-w-[36px] text-center">5 OF KIND</p>}
                    </div>
                  </div>
                  {/* Note about bet multipliers */}
                  <p className="text-[9px] text-white/20 font-rajdhani mb-3">
                    Pays shown as bet multipliers × per line bet. Highest win per line only.
                  </p>
                  {sortedSymbols.map(sym => (
                    <SymbolRow key={sym.id} sym={sym} theme={theme}/>
                  ))}
                </div>
              )}

              {tab === "paylines" && (
                <div className="space-y-4">
                  {theme.reelCount === 3 ? (
                    <div>
                      <p className="text-[9px] font-orbitron text-white/35 tracking-widest mb-3">1 PAYLINE — CENTER ROW ONLY</p>
                      <div className="bg-white/[0.04] rounded-xl p-4 flex items-center gap-4">
                        <PaylineDiagram rows={[1,1,1]} color="#ffd700"/>
                        <div>
                          <p className="font-orbitron text-xs font-bold text-yellow-400">Center Line</p>
                          <p className="text-[10px] text-white/40 font-rajdhani mt-1">All wins on the center row only.</p>
                        </div>
                      </div>
                    </div>
                  ) : theme.paylineCount > 1000 ? (
                    <div className="space-y-3">
                      <p className="text-[9px] font-orbitron text-white/35 tracking-widest">MEGAWAYS™ — UP TO {theme.paylineCount.toLocaleString()} WAYS</p>
                      <div className="bg-white/[0.04] rounded-xl p-4 space-y-3">
                        <p className="font-orbitron text-xs font-bold text-cyan-400">How Megaways Work</p>
                        <p className="text-[10px] text-white/50 font-rajdhani leading-relaxed">
                          Each reel shows 2–7 symbols at random. Wins pay left-to-right on consecutive reels.
                          The more symbols on each reel, the more ways you have to win.
                        </p>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {["Min Ways", "Max Ways", "Reels"].map((label, i) => (
                            <div key={i} className="bg-black/30 rounded-lg p-2 text-center">
                              <p className="text-[8px] font-orbitron text-white/25">{label}</p>
                              <p className="font-orbitron text-sm font-bold text-cyan-400">
                                {i === 0 ? "64" : i === 1 ? "117,649" : "6"}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] text-white/35 font-rajdhani">
                          Cascade: winning symbols are removed and new ones fall in — chains can multiply your winnings.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[9px] font-orbitron text-white/35 tracking-widest mb-3">{theme.paylineCount} PAYLINES — BOTH DIRECTIONS PAY</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PAYLINES_DISPLAY_5.map(pl => (
                          <div key={pl.idx} className="bg-white/[0.03] rounded-xl p-3 flex items-center gap-3">
                            <PaylineDiagram rows={pl.rows} color={pl.color}/>
                            <div>
                              <p className="text-[9px] font-orbitron font-bold" style={{ color: pl.color }}>Line {pl.idx}</p>
                              <p className="text-[8px] text-white/30 font-rajdhani">{pl.label}</p>
                            </div>
                          </div>
                        ))}
                        {theme.paylineCount > 10 && (
                          <div className="col-span-2 text-center py-2">
                            <p className="text-[9px] text-white/25 font-orbitron">+{theme.paylineCount - 10} more paylines active</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "features" && (
                <div className="space-y-3">
                  {/* Win tiers */}
                  <div className="bg-white/[0.03] rounded-xl p-4 space-y-2">
                    <p className="font-orbitron text-[10px] font-bold text-white/50 tracking-widest mb-3">WIN TIERS</p>
                    {[
                      { label: "BIG WIN",         mult: "20×",   color: "#ffd700" },
                      { label: "MEGA WIN",        mult: "50×",   color: "#00e5ff" },
                      { label: "SUPER WIN",       mult: "100×",  color: "#e879f9" },
                      { label: "SENSATIONAL WIN", mult: "500×",  color: "#ff8800" },
                      { label: "EPIC WIN",        mult: "1000×", color: "#ff4400" },
                    ].map(tier => (
                      <div key={tier.label} className="flex items-center justify-between">
                        <span className="font-orbitron text-[10px] font-black tracking-widest" style={{ color: tier.color }}>{tier.label}</span>
                        <span className="font-orbitron text-[10px] text-white/50">≥ {tier.mult} total bet</span>
                      </div>
                    ))}
                  </div>

                  {/* Theme features */}
                  {theme.features.map((feat, i) => (
                    <div key={i} className="bg-white/[0.03] rounded-xl p-4 flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{feat.icon}</span>
                      <div>
                        <p className="font-orbitron text-[11px] font-bold text-white/80 mb-1">{feat.name}</p>
                        <p className="text-[10px] text-white/45 font-rajdhani leading-relaxed">{feat.description}</p>
                      </div>
                    </div>
                  ))}

                  {/* General rules */}
                  <div className="bg-white/[0.02] rounded-xl p-4 space-y-2">
                    <p className="font-orbitron text-[9px] font-bold text-white/30 tracking-widest">GENERAL RULES</p>
                    {[
                      "All wins pay left to right on active paylines.",
                      "Only highest win per line is paid.",
                      "Malfunction voids all pays.",
                      "Provably fair — verify any spin on-chain.",
                    ].map((rule, i) => (
                      <p key={i} className="text-[9px] text-white/30 font-rajdhani">• {rule}</p>
                    ))}
                  </div>

                  {/* Stats bar */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "RTP",         value: theme.rtp },
                      { label: "VOLATILITY",  value: theme.volatility },
                      { label: "MAX WIN",     value: theme.maxWin },
                    ].map(stat => (
                      <div key={stat.label} className="bg-black/30 rounded-lg p-2.5 text-center">
                        <p className="text-[8px] font-orbitron text-white/25">{stat.label}</p>
                        <p className="font-orbitron text-xs font-bold mt-0.5" style={{ color: primary }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
