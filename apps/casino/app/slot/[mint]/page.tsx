"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ArrowLeft, Shield, Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import { SlotMachine } from "@/components/slot/SlotMachine";
import { BetControls } from "@/components/slot/BetControls";
import { WalletModal } from "@/components/wallet/WalletModal";
import { createSession, spin, generateClientSeed, type Session } from "@/lib/gameClient";
import { fetchBalance } from "@/lib/balanceClient";
import { formatSol, shortenAddress } from "@/lib/utils";
import type { SpinResult } from "@/components/slot/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DEFAULT_BET = 0.1 * LAMPORTS_PER_SOL;

interface SlotTheme {
  tokenName: string;
  tokenSymbol: string;
  slotModel: "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";
  primaryColor: string;
  accentColor: string;
  heroImageUrl: string | null;
  bgImageUrl: string | null;
}

interface RecentSpin {
  result: SpinResult;
  ts: number;
}

export default function CasinoSlotPage({ params }: { params: { mint: string } }) {
  const { mint } = params;
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [theme, setTheme] = useState<SlotTheme | null>(null);
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
  const [walletOpen, setWalletOpen] = useState(false);

  const wallet = wallets[0];
  const walletAddress = wallet?.address ?? "";

  // Fetch slot theme
  useEffect(() => {
    fetch(`${API_URL}/themes/${mint}`)
      .then((r) => r.ok ? r.json() : null)
      .then((t) => t && setTheme(t))
      .catch(() => {});
  }, [mint]);

  // Fetch internal balance
  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    const bal = await fetchBalance(walletAddress);
    setBalance(bal);
  }, [walletAddress]);

  useEffect(() => {
    refreshBalance();
    const id = setInterval(refreshBalance, 8_000);
    return () => clearInterval(id);
  }, [refreshBalance]);

  // Create game session when wallet connects
  useEffect(() => {
    if (!authenticated || !walletAddress || session) return;
    createSession(walletAddress, theme?.slotModel ?? "Classic3Reel")
      .then(setSession)
      .catch((e) => setError(`Session error: ${e.message}`));
  }, [authenticated, walletAddress, session, theme]);

  const handleSpin = useCallback(async () => {
    if (!session || isSpinning) return;
    setError(null);
    setIsSpinning(true);

    try {
      const isFree = freeSpinsLeft > 0;
      const effectiveBet = isFree ? 0 : betLamports;
      const result = await spin(session.sessionId, clientSeed, effectiveBet || DEFAULT_BET);

      setSpinResult(result);
      setClientSeed(generateClientSeed());

      if (isFree) setFreeSpinsLeft((p) => p - 1);
      if (result.freeSpinsAwarded > 0) setFreeSpinsLeft((p) => p + result.freeSpinsAwarded);

      setTotalWagered((p) => p + (isFree ? 0 : betLamports));
      setTotalWon((p) => p + result.totalPayout);
      setRecentSpins((prev) => [{ result, ts: Date.now() }, ...prev].slice(0, 20));

      // Refresh balance after spin (game server updated it server-side)
      setTimeout(refreshBalance, 500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Spin failed";
      setError(msg);
      // If insufficient balance, prompt wallet deposit
      if (msg.toLowerCase().includes("insufficient")) {
        setWalletOpen(true);
      }
    } finally {
      // isSpinning cleared by onSpinComplete
    }
  }, [session, isSpinning, freeSpinsLeft, betLamports, clientSeed, refreshBalance]);

  function handleSpinComplete() {
    setIsSpinning(false);
  }

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

  const sessionRtp = totalWagered > 0 ? ((totalWon / totalWagered) * 100).toFixed(1) : "—";
  const slotName = theme?.tokenName ?? mint.slice(0, 8);

  return (
    <>
      <div
        className="min-h-screen text-white relative"
        style={theme?.bgImageUrl ? {
          background: `linear-gradient(to bottom, rgba(6,6,15,0.92), rgba(6,6,15,0.98)), url(${theme.bgImageUrl}) center/cover no-repeat fixed`,
        } : undefined}
      >
        {/* Sub-header */}
        <div className="border-b border-white/5 bg-[#06060f]/60 backdrop-blur px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
            <ArrowLeft size={15} /> {slotName}
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-green-400/70">
              <Shield size={11} /> 96% RTP
            </div>
            {authenticated && (
              <button
                onClick={() => setWalletOpen(true)}
                className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors"
              >
                <Wallet size={11} />
                {formatSol(balance)}
              </button>
            )}
            {authenticated ? (
              <span className="text-white/30 font-mono">{shortenAddress(walletAddress)}</span>
            ) : (
              <button onClick={login} className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded-lg transition-colors">
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Slot machine */}
          <div className="flex flex-col items-center gap-6">
            <SlotMachine
              model={theme?.slotModel ?? "Classic3Reel"}
              spinResult={spinResult}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
            />

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                {error}
                {error.toLowerCase().includes("insufficient") && (
                  <button
                    onClick={() => setWalletOpen(true)}
                    className="ml-2 underline text-purple-400 text-xs"
                  >
                    Deposit SOL
                  </button>
                )}
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

            <p className="text-white/15 text-xs">Press Space to spin</p>
          </div>

          {/* Session stats */}
          {authenticated && recentSpins.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Session RTP", value: `${sessionRtp}%` },
                { label: "Total Won",   value: formatSol(totalWon) },
                { label: "Spins",       value: String(recentSpins.length) },
              ].map(({ label, value }) => (
                <div key={label} className="stat-box text-center">
                  <div className="label">{label}</div>
                  <div className="value text-base">{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent spins */}
          {recentSpins.length > 0 && (
            <div className="card-panel p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Trophy size={13} /> Recent Spins
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recentSpins.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="text-white/30">
                      {s.result.reels.map((r) => SYMBOL_EMOJI[r[1] as keyof typeof SYMBOL_EMOJI] ?? "?").join(" ")}
                    </div>
                    <div className={s.result.totalPayout > 0 ? "text-green-400" : "text-white/25"}>
                      {s.result.totalPayout > 0 ? `+${formatSol(s.result.totalPayout)}` : `−${formatSol(s.result.betAmount)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provably fair */}
          {session && (
            <div className="card-panel p-5 space-y-2 text-xs text-white/30">
              <div className="text-white/50 font-orbitron text-[11px] font-bold flex items-center gap-1.5 tracking-wider">
                <Shield size={12} /> PROVABLY FAIR
              </div>
              <div className="break-all">Server seed hash: <span className="text-white/50 font-mono">{session.serverSeedHash}</span></div>
              <div>Client seed: <span className="text-white/50 font-mono">{clientSeed.slice(0, 16)}…</span></div>
            </div>
          )}
        </div>
      </div>

      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        walletAddress={walletAddress}
        onBalanceChange={setBalance}
      />
    </>
  );
}

const SYMBOL_EMOJI = {
  SEVEN: "7️⃣", BAR3: "▰▰▰", BAR2: "▰▰", BAR1: "▰",
  BELL: "🔔", CHERRY: "🍒", LEMON: "🍋", ORANGE: "🍊", WILD: "⭐",
} as const;
