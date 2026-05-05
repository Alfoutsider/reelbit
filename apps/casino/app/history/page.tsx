"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart2, Trophy, TrendingUp, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getSpinHistory, getStats, clearSpinHistory, type SpinRecord } from "@/lib/spinHistory";

function fmtUsdc(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtTime(ts: number): string {
  const date = new Date(ts);
  const now = Date.now();
  const diffMs = now - ts;
  if (diffMs < 60_000)    return `${Math.floor(diffMs / 1_000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HistoryPage() {
  const [records, setRecords] = useState<SpinRecord[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setRecords(getSpinHistory({ limit: 200 }));
  }, []);

  const stats = getStats(records);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-white/40 hover:text-white"><ArrowLeft size={16} /></Link>
        <h1 className="font-orbitron text-xl font-black text-white">Bet History</h1>
        <span className="text-xs text-white/30 font-rajdhani">stored locally on this device</span>
        <div className="flex-1" />
        {records.length > 0 && (
          <button
            onClick={() => {
              if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
              clearSpinHistory();
              setRecords([]);
              setConfirmClear(false);
            }}
            className={`text-[11px] font-orbitron tracking-widest flex items-center gap-1.5 transition-colors ${
              confirmClear ? "text-red-400" : "text-white/30 hover:text-white/60"
            }`}
          >
            <Trash2 size={11} /> {confirmClear ? "TAP TO CONFIRM" : "CLEAR"}
          </button>
        )}
      </div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <Stat icon={BarChart2} label="Total Spins" value={String(stats.totalSpins)} />
        <Stat
          icon={TrendingUp}
          label="Net P&L"
          value={fmtUsdc(stats.netUsdc)}
          accent={stats.netUsdc > 0 ? "win" : stats.netUsdc < 0 ? "loss" : undefined}
        />
        <Stat icon={BarChart2} label="Lifetime RTP" value={`${stats.rtpPct.toFixed(1)}%`} />
        <Stat icon={Trophy} label="Jackpots Hit" value={String(stats.jackpotsHit)} />
      </motion.div>

      {records.length === 0 ? (
        <div className="card-panel p-12 text-center space-y-2">
          <p className="font-orbitron text-sm text-white/30 tracking-widest">NO SPINS YET</p>
          <p className="text-white/40 text-sm font-rajdhani">
            Spin a graduated slot and your history will show here. Clearing your browser
            data wipes this list — the casino's authoritative records are unaffected.
          </p>
        </div>
      ) : (
        <div className="card-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-orbitron tracking-widest text-white/40 border-b border-white/5">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3 text-right">Bet</th>
                  <th className="px-4 py-3 text-right">Payout</th>
                  <th className="px-4 py-3 text-right">RTP</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Spin #</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const rtp = r.betUsdc > 0 ? (r.payoutUsdc / r.betUsdc) * 100 : 0;
                  return (
                    <tr key={r.ts} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-white/50 text-xs font-rajdhani">{fmtTime(r.ts)}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/slot/${r.mint}`} className="font-orbitron text-xs text-white/80 hover:text-white">
                          ${r.tokenSymbol}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-white/60">
                        {r.betUsdc > 0 ? fmtUsdc(r.betUsdc) : <span className="text-purple-400">free</span>}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${
                        r.payoutUsdc > 0 ? "text-emerald-400" : "text-white/30"
                      }`}>
                        {r.payoutUsdc > 0 ? fmtUsdc(r.payoutUsdc) : "—"}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${
                        rtp >= 100 ? "text-emerald-400" : rtp > 0 ? "text-yellow-400" : "text-white/30"
                      }`}>
                        {r.betUsdc > 0 ? `${rtp.toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[10px] text-white/30 hidden md:table-cell">
                        #{r.nonce}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {r.isJackpot && <span className="text-yellow-400 text-[11px]">🏆</span>}
                        {r.freeSpinsAwarded > 0 && <span className="text-purple-400 text-[10px] ml-1">+{r.freeSpinsAwarded} FS</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: { icon: LucideIcon; label: string; value: string; accent?: "win" | "loss" }) {
  return (
    <div className="stat-box">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={10} className="text-purple-400" />
        <p className="label">{label}</p>
      </div>
      <p className={`value text-lg ${
        accent === "win"  ? "text-emerald-400" :
        accent === "loss" ? "text-red-400"     : ""
      }`}>{value}</p>
    </div>
  );
}
