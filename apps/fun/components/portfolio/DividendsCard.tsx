"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWallets } from "@/lib/privy";
import { fetchClaimable, claimAll, type ClaimableSummary } from "@/lib/dividendClient";
import type { Transaction } from "@solana/web3.js";

interface Props {
  wallet: string;
}

const LAMPORTS_PER_SOL = 1_000_000_000;

function fmtSol(lamports: number): string {
  if (lamports === 0) return "0 SOL";
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol < 0.000001) return `${lamports.toLocaleString()} lamports`;
  return `${sol.toFixed(sol < 0.001 ? 6 : sol < 1 ? 4 : 3)} SOL`;
}

export function DividendsCard({ wallet }: Props) {
  const { wallets } = useWallets();
  const [summary, setSummary] = useState<ClaimableSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Fetch on mount + when wallet changes. Refresh every 60s to catch new rounds.
  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    const load = () =>
      fetchClaimable(wallet)
        .then((s) => { if (!cancelled) setSummary(s); })
        .catch(() => { if (!cancelled) setSummary(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [wallet]);

  if (loading) return null;
  if (!summary || summary.count === 0) return null;

  const grouped = summary.claims.reduce<Record<string, { rounds: number; total: number }>>((acc, c) => {
    if (!acc[c.mint]) acc[c.mint] = { rounds: 0, total: 0 };
    acc[c.mint].rounds += 1;
    acc[c.mint].total  += c.amount;
    return acc;
  }, {});

  const handleClaim = async () => {
    if (claiming || !summary || summary.count === 0) return;
    const w = wallets[0];
    if (!w) {
      toast.error("Connect a wallet first");
      return;
    }

    setClaiming(true);
    try {
      const signTransaction = async (tx: Transaction) => {
        // Privy embedded wallets expose signTransaction via the CrossAppEmbeddedWallet
        // shape; fall back to a generic shape if the typed accessor is missing.
        const anyW = w as unknown as { signTransaction?: (tx: Transaction) => Promise<Transaction> };
        if (!anyW.signTransaction) throw new Error("Wallet does not support signTransaction");
        return anyW.signTransaction(tx);
      };
      const result = await claimAll(
        { address: w.address, signTransaction },
        summary.claims,
      );
      if (result.successCount > 0) {
        toast.success(
          `Claimed ${result.successCount} round${result.successCount === 1 ? "" : "s"}` +
          (result.failedCount > 0 ? ` (${result.failedCount} failed)` : ""),
        );
        // Optimistically clear the summary; server will catch up via webhook.
        setSummary({ ...summary, count: 0, claims: [], totalUnclaimedLamports: 0 });
      } else {
        toast.error(result.errors[0] ?? "Claim failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-panel p-5 space-y-4 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Coins size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="font-orbitron text-[11px] tracking-widest text-emerald-400/80 font-bold">DIVIDENDS</p>
            <p className="font-orbitron text-xl text-white font-black">{fmtSol(summary.totalUnclaimedLamports)}</p>
            <p className="font-rajdhani text-xs text-white/40">
              across {summary.count} round{summary.count === 1 ? "" : "s"} · {Object.keys(grouped).length} mint{Object.keys(grouped).length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2.5 font-orbitron text-xs font-bold tracking-wider text-emerald-950 flex items-center gap-2"
        >
          {claiming ? (
            <><Loader2 size={12} className="animate-spin" /> CLAIMING…</>
          ) : (
            "CLAIM ALL"
          )}
        </button>
      </div>

      {/* Per-mint breakdown */}
      <div className="space-y-1.5 pt-2 border-t border-white/5">
        {Object.entries(grouped).map(([mint, info]) => (
          <div key={mint} className="flex items-center justify-between gap-2 text-[11px] font-rajdhani">
            <span className="text-white/30 font-mono">{mint.slice(0, 8)}…{mint.slice(-4)}</span>
            <div className="flex items-center gap-3">
              <span className="text-white/40">{info.rounds} round{info.rounds === 1 ? "" : "s"}</span>
              <span className="font-orbitron text-emerald-300 font-bold">{fmtSol(info.total)}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-white/25 font-rajdhani leading-relaxed">
        Rewards from LP fees on graduated tokens you hold. Claim within 30 days — unclaimed
        dividends roll into the per-mint jackpot pool.
        <a
          href="/dividends"
          className="ml-1 text-emerald-400/60 hover:text-emerald-400 inline-flex items-center gap-1"
        >
          History <ExternalLink size={9} />
        </a>
      </p>
    </motion.div>
  );
}
