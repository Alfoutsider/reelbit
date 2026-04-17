"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ArrowLeft, Shield, Trophy } from "lucide-react";
import Link from "next/link";
import { SlotMachine } from "@/components/slot/SlotMachine";
import { BetControls } from "@/components/slot/BetControls";
import { createSession, spin, generateClientSeed, type Session } from "@/lib/gameClient";
import { formatSol, shortenAddress } from "@/lib/utils";
import type { SpinResult } from "@/components/slot/types";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const DEFAULT_BET = 0.1 * LAMPORTS_PER_SOL;
const DEFAULT_MODEL = "Classic3Reel" as const;

interface RecentSpin {
  result: SpinResult;
  ts: number;
}

export default function CasinoSlotPage({ params }: { params: { mint: string } }) {
  const { mint } = params;
  const { authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();

  const [session, setSession] = useState<Session | null>(null);
  const [clientSeed, setClientSeed] = useState(generateClientSeed);
  const [betLamports, setBetLamports] = useState(DEFAULT_BET);
  const [balance, setBalance] = useState(0);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [recentSpins, setRecentSpins] = useState<RecentSpin[]>([]);
  const [totalWon, setTotalWon] = useState(0);
  const [totalWagered, setTotalWagered] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wallet = wallets[0];
  const walletAddress = wallet?.address ?? "";

  // Fetch SOL balance
  useEffect(() => {
    if (!walletAddress) return;
    const conn = new Connection(RPC_URL, "confirmed");
    conn.getBalance(new PublicKey(walletAddress))
      .then(setBalance)
      .catch(() => {});
  }, [walletAddress]);

  // Create game session when wallet connects
  useEffect(() => {
    if (!authenticated || !walletAddress || session) return;
    createSession(walletAddress, DEFAULT_MODEL)
      .then(setSession)
      .catch((e) => setError(`Session error: ${e.message}`));
  }, [authenticated, walletAddress, session]);

  const handleSpin = useCallback(async () => {
    if (!session || isSpinning) return;
    setError(null);
    setIsSpinning(true);

    try {
      const isFree = freeSpinsLeft > 0;
      const effectiveBet = isFree ? 0 : betLamports;
      const result = await spin(session.sessionId, clientSeed, effectiveBet || DEFAULT_BET);

      setSpinResult(result);
      setClientSeed(generateClientSeed()); // rotate seed each spin

      if (isFree) setFreeSpinsLeft((p) => p - 1);
      if (result.freeSpinsAwarded > 0) setFreeSpinsLeft((p) => p + result.freeSpinsAwarded);

      setTotalWagered((p) => p + (isFree ? 0 : betLamports));
      setTotalWon((p) => p + result.totalPayout);

      setRecentSpins((prev) => [{ result, ts: Date.now() }, ...prev].slice(0, 20));

      // Update balance optimistically
      if (!isFree) setBalance((b) => b - betLamports + result.totalPayout);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Spin failed");
    } finally {
      // isSpinning stays true until animation completes (onSpinComplete resets it)
    }
  }, [session, isSpinning, freeSpinsLeft, betLamports, clientSeed]);

  function handleSpinComplete() {
    setIsSpinning(false);
  }

  // Keyboard shortcut: Space to spin
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && !isSpinning && authenticated) {
        e.preventDefault();
        handleSpin();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSpin, isSpinning, authenticated]);

  const sessionRtp = totalWagered > 0
    ? ((totalWon / totalWagered) * 100).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> reelbit.casino
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-green-400/80">
            <Shield size={13} /> 96% RTP
          </div>
          {authenticated && (
            <div className="text-white/40">{formatSol(balance)}</div>
          )}
          {authenticated ? (
            <div className="text-white/60 font-mono text-xs">{shortenAddress(walletAddress)}</div>
          ) : (
            <button
              onClick={login}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Slot machine */}
        <div className="flex flex-col items-center gap-6">
          <SlotMachine
            model={DEFAULT_MODEL}
            spinResult={spinResult}
            isSpinning={isSpinning}
            onSpinComplete={handleSpinComplete}
          />

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          {authenticated ? (
            <BetControls
              betLamports={betLamports}
              onBetChange={setBetLamports}
              balance={balance}
              isSpinning={isSpinning}
              onSpin={handleSpin}
              freeSpinsLeft={freeSpinsLeft}
            />
          ) : (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={login}
              className="bg-purple-600 hover:bg-purple-500 px-10 py-4 rounded-2xl font-bold text-lg transition-colors"
            >
              Connect Wallet to Play
            </motion.button>
          )}

          <p className="text-white/20 text-xs">Press Space to spin</p>
        </div>

        {/* Session stats */}
        {authenticated && recentSpins.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Session RTP", value: `${sessionRtp}%` },
              { label: "Total Won", value: formatSol(totalWon) },
              { label: "Spins", value: recentSpins.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                <div className="text-white font-bold text-lg">{value}</div>
                <div className="text-white/40 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent spins */}
        {recentSpins.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Trophy size={14} /> Recent Spins
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recentSpins.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="text-white/40">
                    {s.result.reels.map((r) => SYMBOL_DEFS_EMOJI[r[1] as keyof typeof SYMBOL_DEFS_EMOJI] ?? "?").join(" ")}
                  </div>
                  <div className={s.result.totalPayout > 0 ? "text-green-400" : "text-white/30"}>
                    {s.result.totalPayout > 0 ? `+${formatSol(s.result.totalPayout)}` : `−${formatSol(s.result.betAmount)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provably fair info */}
        {session && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-2 text-xs text-white/40">
            <div className="text-white/60 font-medium text-sm flex items-center gap-1.5"><Shield size={13} /> Provably Fair</div>
            <div className="break-all">Server seed hash: <span className="text-white/60 font-mono">{session.serverSeedHash}</span></div>
            <div>Client seed: <span className="text-white/60 font-mono">{clientSeed.slice(0, 16)}…</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline emoji map for recent spins display
const SYMBOL_DEFS_EMOJI = {
  SEVEN: "7️⃣", BAR3: "▰▰▰", BAR2: "▰▰", BAR1: "▰",
  BELL: "🔔", CHERRY: "🍒", LEMON: "🍋", ORANGE: "🍊", WILD: "⭐",
} as const;
