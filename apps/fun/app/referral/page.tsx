"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Copy, CheckCheck, TrendingUp, Users, Trophy,
  Zap, Star, Crown, ChevronRight, ExternalLink, Share2,
} from "lucide-react";
import { usePrivy, useWallets } from "@/lib/privy";
import { cn, shortenAddress } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TierInfo { name: string; emoji: string; label: string; nextMin: number | null }

interface ReferralStats {
  wallet:          string;
  code:            string | null;
  totalPoints:     number;
  launchpadPoints: number;
  casinoPoints:    number;
  activeReferrals: number;
  totalReferrals:  number;
  rank:            number;
  tier:            TierInfo;
  recentEvents:    ReferralEvent[];
}

interface ReferralEvent {
  id:             string;
  event_type:     string;
  points:         number;
  source:         string;
  referee_wallet: string;
  metadata:       Record<string, unknown>;
  created_at:     string;
}

interface LeaderboardEntry {
  rank:            number;
  wallet:          string;
  totalPoints:     number;
  launchpadPoints: number;
  casinoPoints:    number;
  activeReferrals: number;
  totalReferrals:  number;
  tier:            TierInfo;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  bronze:  { bg: "rgba(180,100,40,0.10)",  border: "rgba(180,100,40,0.30)",  text: "#cd7f32", glow: "0 0 20px rgba(180,100,40,0.25)"  },
  silver:  { bg: "rgba(180,180,200,0.10)", border: "rgba(180,180,200,0.30)", text: "#c0c0c0", glow: "0 0 20px rgba(180,180,200,0.25)" },
  gold:    { bg: "rgba(212,160,23,0.10)",  border: "rgba(212,160,23,0.30)",  text: "#d4af37", glow: "0 0 24px rgba(212,160,23,0.35)"  },
  diamond: { bg: "rgba(56,189,248,0.10)",  border: "rgba(56,189,248,0.30)",  text: "#38bdf8", glow: "0 0 28px rgba(56,189,248,0.35)"  },
  royale:  { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.40)",  text: "#a855f7", glow: "0 0 32px rgba(168,85,247,0.45)"  },
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  first_buy:         { label: "First Buy",         color: "#4ade80" },
  token_launch:      { label: "Token Launch",       color: "#f59e0b" },
  graduation:        { label: "Graduation",         color: "#d4af37" },
  volume_tier:       { label: "Volume Bonus",       color: "#60a5fa" },
  milestone_5:       { label: "5 Referrals",        color: "#a855f7" },
  milestone_10:      { label: "10 Referrals",       color: "#a855f7" },
  milestone_25:      { label: "25 Referrals",       color: "#a855f7" },
  milestone_50:      { label: "50 Referrals",       color: "#d4af37" },
  casino_first_spin: { label: "Casino First Spin",  color: "#f43f5e" },
  casino_wager_100:  { label: "Casino Wager",       color: "#f43f5e" },
};

const HOW_IT_WORKS = [
  { icon: Gift,      step: "1", title: "Share Your Link",    desc: "Get your unique referral link and share it with anyone." },
  { icon: Users,     step: "2", title: "They Connect",       desc: "When they connect their wallet using your link, they're tracked." },
  { icon: TrendingUp,step: "3", title: "They Trade & Play",  desc: "Every buy, launch, and graduation earns you points." },
  { icon: Trophy,    step: "4", title: "Climb & Earn",       desc: "Hit milestones for bonus points. Top referrers share future rewards." },
];

const REWARDS_TABLE = [
  { event: "First Buy (≥ 0.1 SOL)",   pts: "200 pts",   icon: "🛒" },
  { event: "Token Launch",             pts: "500 pts",   icon: "🚀" },
  { event: "Token Graduates",          pts: "2,000 pts", icon: "🎓" },
  { event: "Per 10 SOL Traded",        pts: "100 pts",   icon: "📈" },
  { event: "5 Active Referrals",       pts: "+500 pts",  icon: "🎯" },
  { event: "10 Active Referrals",      pts: "+1,500 pts",icon: "🔥" },
  { event: "25 Active Referrals",      pts: "+5,000 pts",icon: "💫" },
  { event: "50 Active Referrals",      pts: "+15,000 pts",icon: "👑" },
];

const TIER_REWARDS = [
  { tier: "bronze",  emoji: "🥉", label: "Bronze",  pts: "0",      reward: "Early access to new features"              },
  { tier: "silver",  emoji: "🥈", label: "Silver",  pts: "1,000",  reward: "5% casino fee discount"                    },
  { tier: "gold",    emoji: "🥇", label: "Gold",    pts: "5,000",  reward: "10% fee discount + monthly SOL bonus"       },
  { tier: "diamond", emoji: "💎", label: "Diamond", pts: "20,000", reward: "15% fee discount + 2× monthly + early access" },
  { tier: "royale",  emoji: "👑", label: "Royale",  pts: "50,000", reward: "20% fee discount + 5× bonus + VIP badge"   },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TierBadge({ tier, size = "md" }: { tier: TierInfo; size?: "sm" | "md" | "lg" }) {
  const style = TIER_STYLES[tier.name] ?? TIER_STYLES.bronze;
  const sizeClass = size === "lg" ? "px-4 py-2 text-sm gap-2" : size === "sm" ? "px-2 py-0.5 text-[10px] gap-1" : "px-3 py-1 text-xs gap-1.5";
  return (
    <span
      className={cn("inline-flex items-center rounded-full font-orbitron font-bold tracking-wider", sizeClass)}
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text, boxShadow: style.glow }}
    >
      {tier.emoji} {tier.label}
    </span>
  );
}

function PointsBar({ label, pts, total, color }: { label: string; pts: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (pts / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="font-rajdhani text-white/50">{label}</span>
        <span className="font-orbitron font-bold" style={{ color }}>{pts.toLocaleString()} pts</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function EventRow({ event }: { event: ReferralEvent }) {
  const meta = EVENT_LABELS[event.event_type] ?? { label: event.event_type, color: "#ffffff" };
  const isRecent = Date.now() - new Date(event.created_at).getTime() < 5 * 60 * 1_000;
  return (
    <div className="flex items-center justify-between py-2.5 px-4 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
        <div>
          <p className="font-rajdhani text-[13px] text-white/70 font-semibold">{meta.label}</p>
          {event.referee_wallet !== "MILESTONE" && (
            <p className="font-mono text-[10px] text-white/25">{shortenAddress(event.referee_wallet)}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-orbitron text-xs font-bold" style={{ color: meta.color }}>+{event.points.toLocaleString()}</p>
        {isRecent && <p className="text-[9px] text-white/25 font-orbitron">just now</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address ?? "";

  const [stats,       setStats]       = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [copied,      setCopied]      = useState(false);
  const [activeTab,   setActiveTab]   = useState<"activity" | "leaderboard">("leaderboard");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://reelbit-fun.vercel.app";
  const referralLink = stats?.code ? `${baseUrl}/r/${stats.code}` : "";

  const fetchData = useCallback(async () => {
    const [lb] = await Promise.all([
      fetch(`${API}/referral/leaderboard?limit=50`).then((r) => r.ok ? r.json() : []).catch(() => []),
    ]);
    setLeaderboard(lb);

    if (authenticated && address) {
      // Ensure code is created, then fetch stats
      await fetch(`${API}/referral/code/${address}`).catch(() => {});
      const s = await fetch(`${API}/referral/stats/${address}`).then((r) => r.ok ? r.json() : null).catch(() => null);
      setStats(s);
    }
    setLoading(false);
  }, [authenticated, address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    });
  }

  function shareX() {
    const text = encodeURIComponent(
      `Join ReelBit — the first slot-machine launchpad on Solana 🎰\n\nLaunch tokens, earn 25% of all casino GGR forever.\n\nUse my link:`,
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`, "_blank");
  }

  function shareTelegram() {
    const text = encodeURIComponent(`Join ReelBit — Solana's slot-machine launchpad. Launch tokens, earn 25% casino GGR forever.`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, "_blank");
  }

  const tier      = stats ? stats.tier : { name: "bronze", emoji: "🥉", label: "Bronze", nextMin: 1_000 };
  const tierStyle = TIER_STYLES[tier.name] ?? TIER_STYLES.bronze;
  const tierPts   = stats?.totalPoints ?? 0;
  const nextTierMin = tier.nextMin;
  // Previous tier threshold
  const currentTierIdx = TIER_REWARDS.findIndex((t) => t.tier === tier.name);
  const prevTierMin = currentTierIdx < TIER_REWARDS.length - 1
    ? parseInt(TIER_REWARDS[currentTierIdx + 1].pts.replace(/,/g, ""))
    : 0;
  const segmentProgress = nextTierMin
    ? Math.min(100, ((tierPts - prevTierMin) / (nextTierMin - prevTierMin)) * 100)
    : 100;

  return (
    <div className="relative min-h-screen">
      <div className="grid-overlay opacity-40" />

      {/* ── Hero ── */}
      <section className="relative px-4 pt-16 pb-10 text-center overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-80 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(168,85,247,0.06), transparent)" }} />

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-2xl mx-auto space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <Gift size={12} style={{ color: "#a855f7" }} />
            <span className="font-orbitron text-[10px] font-bold tracking-widest" style={{ color: "#c084fc" }}>
              REFERRAL PROGRAM
            </span>
          </div>

          <h1 className="font-orbitron text-3xl md:text-5xl font-black leading-tight">
            <span className="text-white">Refer. Earn.</span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #a855f7, #d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Dominate the Board.
            </span>
          </h1>

          <p className="text-white/40 font-rajdhani text-base max-w-lg mx-auto">
            Share your link. Earn points when your referrals trade, launch tokens, and graduate to the casino.
            Top referrers unlock rewards, discounts, and future platform revenue.
          </p>
        </motion.div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-16 space-y-6 relative z-10">

        {/* ── Stat strip (when authenticated) ── */}
        {authenticated && stats && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {[
              { label: "Total Points",  value: stats.totalPoints.toLocaleString(),  icon: Star,    color: "#d4af37" },
              { label: "Global Rank",   value: `#${stats.rank}`,                    icon: Trophy,  color: "#a855f7" },
              { label: "Active Refs",   value: String(stats.activeReferrals),       icon: Users,   color: "#4ade80" },
              { label: "Total Refs",    value: String(stats.totalReferrals),        icon: Gift,    color: "#60a5fa" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-panel p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <p className="font-orbitron text-lg font-black text-white leading-none">{value}</p>
                  <p className="font-rajdhani text-[11px] text-white/35 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Two-col: share card + tier progress ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Share card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-3 card-panel p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <p className="font-orbitron text-[11px] font-bold text-white/50 tracking-widest">YOUR REFERRAL LINK</p>
              {stats?.tier && <TierBadge tier={stats.tier} size="sm" />}
            </div>

            {!authenticated ? (
              <div className="rounded-2xl flex flex-col items-center justify-center py-10 gap-3"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                <Gift size={28} className="text-white/20" />
                <p className="font-rajdhani text-white/30 text-sm">Connect your wallet to get your referral link</p>
              </div>
            ) : loading ? (
              <div className="h-24 rounded-2xl animate-pulse bg-white/[0.03]" />
            ) : (
              <>
                {/* Link display */}
                <div className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.18)" }}>
                  <code className="flex-1 font-mono text-sm text-white/70 truncate min-w-0">
                    {referralLink || "Generating…"}
                  </code>
                  {stats?.code && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={copyLink}
                      className={cn(
                        "flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-orbitron font-bold transition-all",
                        copied
                          ? "bg-green-500/15 border border-green-500/30 text-green-400"
                          : "bg-white/[0.06] border border-white/10 text-white/60 hover:text-white hover:bg-white/10",
                      )}>
                      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Copy"}
                    </motion.button>
                  )}
                </div>

                {/* Share buttons */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={shareX}
                    disabled={!referralLink}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-rajdhani font-bold text-white/60 hover:text-white transition-colors border border-white/8 hover:border-white/20 bg-white/[0.03] disabled:opacity-30">
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share on X
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={shareTelegram}
                    disabled={!referralLink}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-rajdhani font-bold text-white/60 hover:text-white transition-colors border border-white/8 hover:border-white/20 bg-white/[0.03] disabled:opacity-30">
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={copyLink}
                    disabled={!referralLink}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-rajdhani font-bold text-white/60 hover:text-white transition-colors border border-white/8 hover:border-white/20 bg-white/[0.03] disabled:opacity-30">
                    <Share2 size={12} />
                    Copy Link
                  </motion.button>
                </div>

                {/* Points breakdown */}
                {stats && (stats.launchpadPoints > 0 || stats.casinoPoints > 0) && (
                  <div className="space-y-2.5 pt-2 border-t border-white/5">
                    <PointsBar label="Launchpad Points" pts={stats.launchpadPoints} total={stats.totalPoints} color="#a855f7" />
                    <PointsBar label="Casino Points"    pts={stats.casinoPoints}    total={stats.totalPoints} color="#f43f5e" />
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Tier progress + rewards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-2 card-panel p-6 space-y-5"
          >
            <p className="font-orbitron text-[11px] font-bold text-white/50 tracking-widest">TIER PROGRESS</p>

            {/* Current tier badge */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, boxShadow: tierStyle.glow }}>
                {tier.emoji}
              </div>
              <div>
                <p className="font-orbitron font-black text-white text-xl">{tier.label}</p>
                <p className="font-orbitron text-sm font-bold" style={{ color: tierStyle.text }}>
                  {tierPts.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* Progress bar to next tier */}
            {nextTierMin ? (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-orbitron text-white/30">
                  <span>{tierPts.toLocaleString()} pts</span>
                  <span>{nextTierMin.toLocaleString()} pts needed</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${segmentProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${tierStyle.text}80, ${tierStyle.text})` }}
                  />
                </div>
                <p className="text-[10px] font-rajdhani text-white/25 text-right">
                  {(nextTierMin - tierPts).toLocaleString()} pts to next tier
                </p>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-2.5 text-center"
                style={{ background: tierStyle.bg, border: `1px solid ${tierStyle.border}` }}>
                <p className="font-orbitron text-xs font-bold" style={{ color: tierStyle.text }}>MAX TIER REACHED</p>
              </div>
            )}

            {/* Tier ladder */}
            <div className="space-y-1.5">
              {TIER_REWARDS.map(({ tier: t, emoji, label, pts, reward }) => {
                const isCurrent = t === tier.name;
                const style = TIER_STYLES[t];
                return (
                  <div key={t} className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all",
                    isCurrent ? "ring-1" : "opacity-40",
                  )}
                    style={isCurrent ? {
                      background: style.bg,
                      border:     `1px solid ${style.border}`,
                      boxShadow:  style.glow,
                    } : {}}>
                    <span className="text-sm">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-orbitron text-[10px] font-bold" style={{ color: isCurrent ? style.text : undefined }}>
                        {label} · {pts} pts
                      </p>
                      <p className="text-[9px] font-rajdhani text-white/30 truncate">{reward}</p>
                    </div>
                    {isCurrent && <ChevronRight size={10} style={{ color: style.text }} />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── How it works ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="card-panel p-6 space-y-5"
        >
          <p className="font-orbitron text-[11px] font-bold text-white/50 tracking-widest">HOW IT WORKS</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.20)" }}>
                    <Icon size={13} style={{ color: "#a855f7" }} />
                  </div>
                  <span className="font-orbitron text-[10px] font-bold text-white/20">STEP {step}</span>
                </div>
                <p className="font-orbitron text-[12px] font-bold text-white/80">{title}</p>
                <p className="font-rajdhani text-[12px] text-white/35 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Rewards table ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-panel p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-orbitron text-[11px] font-bold text-white/50 tracking-widest">POINT VALUES</p>
            <span className="text-[10px] font-rajdhani text-white/25">Max 5,000 pts per referred wallet</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REWARDS_TABLE.map(({ event, pts, icon }) => (
              <div key={event} className="rounded-xl p-3 space-y-1.5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xl">{icon}</span>
                <p className="font-orbitron text-[11px] font-black text-white/70">{pts}</p>
                <p className="font-rajdhani text-[11px] text-white/35 leading-tight">{event}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Activity + Leaderboard tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="card-panel overflow-hidden"
        >
          {/* Tab bar */}
          <div className="flex border-b border-white/5">
            {(["leaderboard", "activity"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-3.5 text-[10px] font-orbitron font-bold tracking-widest border-b-2 transition-all -mb-px capitalize",
                  activeTab === tab
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-white/25 hover:text-white/50",
                )}>
                {tab === "leaderboard" ? <Trophy size={10} /> : <Zap size={10} />}
                {tab === "leaderboard" ? "Leaderboard" : "My Activity"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Leaderboard ── */}
            {activeTab === "leaderboard" && (
              <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {leaderboard.length === 0 ? (
                  <div className="py-12 text-center">
                    <Trophy size={28} className="mx-auto text-white/10 mb-3" />
                    <p className="font-rajdhani text-white/25 text-sm">No referrers yet — be the first!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {leaderboard.map((entry) => {
                      const isMe = entry.wallet === address;
                      const tStyle = TIER_STYLES[entry.tier.name] ?? TIER_STYLES.bronze;
                      return (
                        <div key={entry.wallet}
                          className={cn("flex items-center gap-3 px-5 py-3.5 transition-colors",
                            isMe ? "bg-purple-500/5" : "hover:bg-white/[0.02]")}>
                          {/* Rank */}
                          <div className={cn("w-8 text-center font-orbitron font-black text-sm flex-shrink-0",
                            entry.rank === 1 ? "text-gold" : entry.rank === 2 ? "text-white/50" : entry.rank === 3 ? "text-amber-600" : "text-white/20")}>
                            {entry.rank === 1 ? "👑" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                          </div>
                          {/* Wallet */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="font-mono text-[12px] text-white/60 truncate">
                              {isMe ? <span style={{ color: "#a855f7" }}>You · </span> : ""}{shortenAddress(entry.wallet)}
                            </span>
                            <TierBadge tier={entry.tier} size="sm" />
                          </div>
                          {/* Active refs */}
                          <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/30 flex-shrink-0">
                            <Users size={10} />
                            <span className="font-orbitron">{entry.activeReferrals}</span>
                          </div>
                          {/* Points */}
                          <div className="text-right flex-shrink-0">
                            <p className="font-orbitron text-sm font-black" style={{ color: tStyle.text }}>
                              {entry.totalPoints.toLocaleString()}
                            </p>
                            <p className="text-[9px] text-white/20 font-orbitron">pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Activity feed ── */}
            {activeTab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!authenticated ? (
                  <div className="py-12 text-center">
                    <p className="font-rajdhani text-white/25 text-sm">Connect your wallet to see your activity</p>
                  </div>
                ) : !stats || stats.recentEvents.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Zap size={24} className="mx-auto text-white/10" />
                    <p className="font-rajdhani text-white/25 text-sm">No activity yet</p>
                    <p className="font-rajdhani text-white/15 text-xs">Share your link to start earning points</p>
                    {referralLink && (
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={copyLink}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-orbitron font-bold text-white/60 border border-white/10 hover:border-purple-500/30 hover:text-purple-400 transition-all">
                        <Copy size={12} /> Copy My Link
                      </motion.button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto">
                    {stats.recentEvents.map((event) => (
                      <EventRow key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Casino referrals CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
          style={{ background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.15)" }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Crown size={14} style={{ color: "#f43f5e" }} />
              <p className="font-orbitron text-[11px] font-bold tracking-widest" style={{ color: "#f43f5e" }}>
                CASINO REFERRALS — COMING SOON
              </p>
            </div>
            <p className="font-rajdhani text-white/50 text-sm max-w-lg">
              Earn an additional <span className="text-white font-bold">150 pts per first spin</span> and{" "}
              <span className="text-white font-bold">50 pts per 100 USDC wagered</span> by your referrals on reelbit.casino.
              Same link — both sides tracked automatically.
            </p>
          </div>
          <a href="https://reelbit-casino.vercel.app" target="_blank" rel="noopener noreferrer">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="flex-shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-orbitron font-bold text-white/60 border border-white/10 hover:border-red-500/30 hover:text-red-400 transition-all">
              <ExternalLink size={12} /> Try the Casino
            </motion.button>
          </a>
        </motion.div>

      </div>
    </div>
  );
}
