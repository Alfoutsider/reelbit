"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const API   = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SITE  = "https://reelbit.fun";

interface Props {
  wallet: string;
}

interface ReferralCodeResponse {
  code: string;
}

interface ReferralStats {
  totalReferrals: number;
  totalPoints:    number;
  tier:           string;
}

export function ReferralWidget({ wallet }: Props) {
  const [code,    setCode]    = useState<string | null>(null);
  const [stats,   setStats]   = useState<ReferralStats | null>(null);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    fetch(`${API}/referral/code/${wallet}`)
      .then((r) => r.ok ? r.json() as Promise<ReferralCodeResponse> : null)
      .then((d) => { if (!cancelled && d?.code) setCode(d.code); })
      .catch(() => {});
    fetch(`${API}/referral/stats/${wallet}`)
      .then((r) => r.ok ? r.json() as Promise<ReferralStats> : null)
      .then((d) => { if (!cancelled && d) setStats(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [wallet]);

  const link = code ? `${SITE}/r/${code}` : "";

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — long-press the link to copy manually");
    }
  }

  if (!code) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card-panel p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Gift size={13} className="text-purple-400" />
        <p className="font-orbitron text-[10px] font-bold text-white/50 tracking-widest">YOUR REFERRAL LINK</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg bg-black/40 border border-white/8 px-3 py-2.5 font-mono text-[12px] text-white/70 truncate">
          {link}
        </div>
        <button
          onClick={copyLink}
          aria-label="Copy referral link"
          className="rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 px-3 py-2.5 transition-colors"
        >
          {copied
            ? <Check size={14} className="text-green-400" />
            : <Copy  size={14} className="text-purple-300" />}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Stat label="Referrals" value={String(stats.totalReferrals ?? 0)} />
          <Stat label="Points"    value={String(stats.totalPoints    ?? 0)} />
          <Stat label="Tier"      value={stats.tier ?? "Rookie"} />
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
      <p className="text-[9px] font-orbitron tracking-widest text-white/40">{label}</p>
      <p className="font-orbitron text-[13px] font-bold text-white">{value}</p>
    </div>
  );
}
