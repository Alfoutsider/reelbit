"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy, useWallets } from "@/lib/privy";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ArrowLeft, Shield, Trophy, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { SlotMachine } from "@/components/slot/SlotMachine";
import { BetControls } from "@/components/slot/BetControls";
import { WalletModal } from "@/components/wallet/WalletModal";
import { createSession, spin, generateClientSeed, revealSession, type Session } from "@/lib/gameClient";
import { appendSpin } from "@/lib/spinHistory";
import { checkSpin, recordSpin } from "@/lib/responsibleGambling";
import { fetchBalance, formatUsdc, USDC_UNIT, type BalanceEntry } from "@/lib/balanceClient";
import { getDemoSession, demoSpin, type DemoSession } from "@/lib/demoSession";
import { shortenAddress } from "@/lib/utils";
import type { SpinResult } from "@/components/slot/types";
import type { SlotTheme } from "@/lib/slotTheme";

const API_URL  = process.env.NEXT_PUBLIC_API_URL  ?? "http://localhost:3001";
const RPC_URL  = process.env.NEXT_PUBLIC_RPC_URL  ?? "https://api.devnet.solana.com";
const TOKEN_LAUNCH_PROGRAM = new PublicKey("5vy9vYy9A6wAy59nRvvpGd5drVwQU1JYqRuSg7xQZDD8");
const DEFAULT_BET_USDC = 5 * 1_000_000; // $5 default bet

function jackpotVaultPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("jackpot_vault"), mint.toBuffer()],
    TOKEN_LAUNCH_PROGRAM,
  )[0];
}

async function fetchJackpotLamports(mintStr: string): Promise<number> {
  try {
    const mint    = new PublicKey(mintStr);
    const vault   = jackpotVaultPda(mint);
    const conn    = new Connection(RPC_URL, "confirmed");
    const balance = await conn.getBalance(vault);
    return balance;
  } catch {
    return 0;
  }
}

interface RecentSpin {
  result: SpinResult;
  ts: number;
}

export default function CasinoSlotPage({ params }: { params: { mint: string } }) {
  const { mint } = params;
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  // Demo mode — bypasses Privy auth and game-server
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  useEffect(() => { setDemoSession(getDemoSession()); }, []);

  const isDemo      = demoSession !== null;
  const isLoggedIn  = isDemo || authenticated;

  const [theme, setTheme] = useState<SlotTheme | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clientSeed, setClientSeed] = useState(generateClientSeed);
  // Verifier modal state. Filled when the user taps "Reveal & verify" — calls
  // /session/reveal which returns the unhashed server seed so the player can
  // recompute every spin's outcome offline.
  const [revealed, setRevealed] = useState<{ serverSeed: string; serverSeedHash: string; nonce: number } | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [betUsdc, setBetUsdc] = useState(DEFAULT_BET_USDC);
  const [balance, setBalance] = useState<BalanceEntry | null>(null);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [recentSpins, setRecentSpins] = useState<RecentSpin[]>([]);
  const [totalWon, setTotalWon] = useState(0);
  const [totalWagered, setTotalWagered] = useState(0);
  const [error,          setError]          = useState<string | null>(null);
  const [walletOpen,     setWalletOpen]     = useState(false);
  const [jackpotLamports, setJackpotLamports] = useState(0);
  const [jackpotPrev,    setJackpotPrev]    = useState(0);
  const [autoSpinRemaining, setAutoSpinRemaining] = useState(0);

  const autoSpinStopRef = useRef(true);
  // Always holds the latest handleSpin without stale closure issues
  const handleSpinRef = useRef<() => Promise<void>>(async () => {});

  const wallet = wallets[0];
  const walletAddress = wallet?.address ?? "";

  // Fetch slot theme
  useEffect(() => {
    fetch(`${API_URL}/themes/${mint}`)
      .then((r) => r.ok ? r.json() : null)
      .then((t) => t && setTheme(t))
      .catch(() => {});
  }, [mint]);

  // Sync demo balance into balance entry shape
  useEffect(() => {
    if (!isDemo) return;
    const sync = () => {
      const s = getDemoSession();
      if (s) {
        setDemoSession(s);
        setBalance({ playable: s.balance, bonus: 0, wageringRequired: 0, wageringCompleted: 0, welcomeBonusClaimed: true, bonusState: 'none', bonusAmount: 0, bonusExpiresAt: null });
      }
    };
    sync();
    const id = setInterval(sync, 500);
    return () => clearInterval(id);
  }, [isDemo]);

  // Fetch real balance (non-demo only)
  const refreshBalance = useCallback(async () => {
    if (!walletAddress || isDemo) return;
    const entry = await fetchBalance(walletAddress);
    setBalance(entry);
  }, [walletAddress, isDemo]);

  useEffect(() => {
    if (isDemo) return;
    refreshBalance();
    const id = setInterval(refreshBalance, 8_000);
    return () => clearInterval(id);
  }, [refreshBalance, isDemo]);

  // Fetch live jackpot vault balance (skipped in demo)
  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    async function poll() {
      const lamports = await fetchJackpotLamports(mint);
      if (!cancelled) {
        setJackpotLamports((prev) => {
          if (lamports > prev) setJackpotPrev(prev);
          return lamports;
        });
      }
    }
    poll();
    const id = setInterval(poll, 15_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [mint, isDemo]);

  // Create game-server session (non-demo only)
  useEffect(() => {
    if (isDemo || !authenticated || !walletAddress || session) return;
    createSession(walletAddress, theme?.slotModel ?? "Classic3Reel", mint)
      .then(setSession)
      .catch((e) => setError(`Session error: ${e.message}`));
  }, [isDemo, authenticated, walletAddress, session, theme, mint]);

  const handleSpin = useCallback(async () => {
    if (isSpinning) return;
    if (!isDemo && !session) return;

    // Responsible-gambling pre-check. Self-exclusion or daily-loss-limit blocks
    // even before we hit the network so the user gets immediate feedback.
    if (!isDemo) {
      const block = checkSpin();
      if (block) { setError(block); return; }
    }

    setError(null);
    setIsSpinning(true);

    try {
      const isFree = freeSpinsLeft > 0;
      const effectiveBet = isFree ? 0 : betUsdc;

      let result: SpinResult;

      if (isDemo) {
        // Client-side demo spin — no server calls, balance updated in localStorage
        const demoBet = effectiveBet || DEFAULT_BET_USDC;
        if (!isFree && (getDemoSession()?.balance ?? 0) < demoBet) {
          throw new Error("Insufficient demo balance");
        }
        result = demoSpin(isFree ? 0 : demoBet, theme?.slotModel ?? "Classic3Reel");
      } else {
        result = await spin(session!.sessionId, clientSeed, effectiveBet || DEFAULT_BET_USDC);
        setClientSeed(generateClientSeed());
        setTimeout(refreshBalance, 500);
      }

      setSpinResult(result);
      setIsSpinning(false);
      if (isFree) setFreeSpinsLeft((p) => p - 1);
      if (result.freeSpinsAwarded > 0) setFreeSpinsLeft((p) => p + result.freeSpinsAwarded);
      setTotalWagered((p) => p + (isFree ? 0 : betUsdc));
      setTotalWon((p) => p + result.totalPayout);
      setRecentSpins((prev) => [{ result, ts: Date.now() }, ...prev].slice(0, 20));
      // Persist to cross-slot history so the /history page can render lifetime
      // stats. Demo spins skip this — they aren't real bets.
      if (!isDemo && theme) {
        appendSpin({
          ts:               Date.now(),
          mint:             theme.mint,
          tokenSymbol:      theme.tokenSymbol,
          betUsdc:          isFree ? 0 : betUsdc,
          payoutUsdc:       result.totalPayout,
          isJackpot:        result.isJackpot,
          isWin:            result.totalPayout > 0,
          freeSpinsAwarded: result.freeSpinsAwarded,
          serverSeedHash:   result.serverSeedHash,
          clientSeed:       result.clientSeed,
          nonce:            result.nonce,
        });
        // Track net loss against the daily loss limit. Wins above bet count
        // as zero loss (not negative — we don't refund the loss bucket).
        const netLoss = (isFree ? 0 : betUsdc) - result.totalPayout;
        recordSpin(netLoss);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Spin failed";
      setError(msg);
      setIsSpinning(false);
      // Stop auto-spin on any error (e.g. insufficient balance)
      autoSpinStopRef.current = true;
      setAutoSpinRemaining(0);
      if (!isDemo && msg.toLowerCase().includes("insufficient")) setWalletOpen(true);
      throw e;
    }
  }, [isSpinning, isDemo, session, freeSpinsLeft, betUsdc, clientSeed, refreshBalance, theme]);

  // Keep the ref updated so auto-spin loop always calls the latest version
  useEffect(() => { handleSpinRef.current = handleSpin; }, [handleSpin]);

  // Stop auto-spin on unmount
  useEffect(() => () => { autoSpinStopRef.current = true; }, []);

  const stopAutoSpin = useCallback(() => {
    autoSpinStopRef.current = true;
    setAutoSpinRemaining(0);
  }, []);

  const startAutoSpin = useCallback(async (totalCount: number) => {
    if (!autoSpinStopRef.current) return; // already running
    autoSpinStopRef.current = false;
    let remaining = totalCount; // -1 = infinite
    setAutoSpinRemaining(remaining);

    while (!autoSpinStopRef.current) {
      try {
        await handleSpinRef.current();
      } catch {
        break; // stop on any spin error
      }
      if (autoSpinStopRef.current) break;
      if (remaining > 0) {
        remaining--;
        setAutoSpinRemaining(remaining);
        if (remaining === 0) break;
      }
      // Small pause between auto-spins
      await new Promise<void>((r) => setTimeout(r, 500));
    }

    autoSpinStopRef.current = true;
    setAutoSpinRemaining(0);
  }, []);

  function handleSpinComplete() {
    setIsSpinning(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && !isSpinning && isLoggedIn) {
        e.preventDefault();
        // Manual spin cancels auto-spin
        if (autoSpinRemaining !== 0) { stopAutoSpin(); return; }
        handleSpin();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSpin, isSpinning, isLoggedIn, autoSpinRemaining, stopAutoSpin]);

  const sessionRtp = totalWagered > 0 ? ((totalWon / totalWagered) * 100).toFixed(1) : "—";
  const slotName = theme?.tokenName ?? mint.slice(0, 8);

  return (
    <>
      <div
        className="min-h-screen text-white relative"
        style={(() => {
          const bg = theme?.customAssets?.bgImageUrl || theme?.bgImageUrl;
          return bg ? { background: `linear-gradient(to bottom, rgba(6,6,15,0.92), rgba(6,6,15,0.98)), url(${bg}) center/cover no-repeat fixed` } : undefined;
        })()}
      >
        {/* Sub-header */}
        <div className="border-b border-white/5 bg-[#06060f]/60 backdrop-blur px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
            <ArrowLeft size={15} /> {slotName}
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-green-400/70">
              <Shield size={11} /> PROVABLY FAIR
            </div>
            {authenticated && !isDemo && (
              <Link href={`/studio/${mint}`}
                className="flex items-center gap-1 text-[#d4a017]/40 hover:text-[#d4a017]/70 transition-colors font-orbitron tracking-wider text-[10px]">
                <Zap size={10} /> AI STUDIO
              </Link>
            )}
            {isLoggedIn && (
              <button
                onClick={() => !isDemo && setWalletOpen(true)}
                className={`flex items-center gap-1.5 text-white/50 transition-colors ${!isDemo ? "hover:text-white" : "cursor-default"}`}
              >
                <Wallet size={11} />
                {balance ? formatUsdc(balance.playable) : "$0.00"}
              </button>
            )}
            {isDemo ? (
              <span className="text-purple-300/60 text-[10px] font-orbitron font-bold">DEMO</span>
            ) : authenticated ? (
              <span className="text-white/30 font-mono">{shortenAddress(walletAddress)}</span>
            ) : (
              <button onClick={login} className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded-lg transition-colors">
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Jackpot banner — hidden in demo mode */}
          {!isDemo && <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/5 via-yellow-500/8 to-gold/5 px-6 py-4"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.06),transparent_70%)]" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <Trophy size={16} className="text-gold" />
                </div>
                <div>
                  <p className="font-orbitron text-[9px] font-bold text-gold/50 tracking-widest">JACKPOT POOL</p>
                  <p className="font-rajdhani text-[11px] text-white/30 mt-0.5">
                    {slotName} · live on-chain
                  </p>
                </div>
              </div>

              <div className="text-right">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={jackpotLamports}
                    initial={{ opacity: 0, y: jackpotLamports > jackpotPrev ? -12 : 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="font-orbitron text-2xl font-black text-gold tracking-tight"
                  >
                    {jackpotLamports === 0 ? "—" : `${(jackpotLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`}
                  </motion.p>
                </AnimatePresence>
                <p className="font-rajdhani text-[11px] text-gold/40 mt-0.5">
                  {jackpotLamports === 0 ? "Building…" : "live on-chain"}
                </p>
              </div>

              {jackpotLamports > jackpotPrev && jackpotPrev > 0 && (
                <motion.div
                  initial={{ opacity: 1, y: 0, x: "-50%" }}
                  animate={{ opacity: 0, y: -24 }}
                  transition={{ duration: 1.2 }}
                  className="absolute top-2 left-1/2 font-orbitron text-[10px] font-bold text-green-400"
                >
                  +{((jackpotLamports - jackpotPrev) / LAMPORTS_PER_SOL).toFixed(4)} SOL
                </motion.div>
              )}
            </div>
          </motion.div>}

          {/* Slot machine */}
          <div className="flex flex-col items-center gap-6">
            <SlotMachine
              model={theme?.slotModel ?? "Classic3Reel"}
              spinResult={spinResult}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
              theme={theme}
              customSymbols={theme?.customAssets?.symbols && Object.keys(theme.customAssets.symbols).length > 0 ? theme.customAssets.symbols : undefined}
            />

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                {error}
                {!isDemo && error.toLowerCase().includes("insufficient") && (
                  <button
                    onClick={() => setWalletOpen(true)}
                    className="ml-2 underline text-purple-400 text-xs"
                  >
                    Deposit USDC
                  </button>
                )}
              </div>
            )}

            {isLoggedIn ? (
              <BetControls
                betUsdc={betUsdc}
                onBetChange={setBetUsdc}
                balance={balance?.playable ?? 0}
                bonus={balance?.bonus}
                wageringRequired={balance?.wageringRequired}
                wageringCompleted={balance?.wageringCompleted}
                isSpinning={isSpinning}
                onSpin={handleSpin}
                freeSpinsLeft={freeSpinsLeft}
                autoSpinRemaining={autoSpinRemaining}
                onStartAutoSpin={startAutoSpin}
                onStopAutoSpin={stopAutoSpin}
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
          {isLoggedIn && recentSpins.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Session RTP", value: `${sessionRtp}%` },
                { label: "Total Won",   value: formatUsdc(totalWon) },
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
                      {s.result.totalPayout > 0 ? `+${formatUsdc(s.result.totalPayout)}` : `−${formatUsdc(s.result.betAmount)}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provably fair / demo notice */}
          {isDemo ? (
            <div className="card-panel p-4 text-xs text-white/25 text-center font-rajdhani space-y-1">
              <p className="font-orbitron text-[10px] font-bold text-purple-400/40 tracking-wider">DEMO MODE</p>
              <p>Spins are simulated client-side. Balance resets when you exit. No real money involved.</p>
            </div>
          ) : session && (
            <div className="card-panel p-5 space-y-3 text-xs text-white/30">
              <div className="flex items-center justify-between">
                <div className="text-white/50 font-orbitron text-[11px] font-bold flex items-center gap-1.5 tracking-wider">
                  <Shield size={12} /> PROVABLY FAIR
                </div>
                <button
                  onClick={() => setVerifyOpen(true)}
                  className="text-[10px] font-orbitron text-purple-300 hover:text-purple-200 tracking-widest"
                >
                  VERIFY
                </button>
              </div>
              <div className="break-all">Server seed hash: <span className="text-white/50 font-mono">{session.serverSeedHash}</span></div>
              <div className="break-all">Client seed: <span className="text-white/50 font-mono">{clientSeed}</span></div>
              <div>Spins this session: <span className="text-white/50 font-mono">{recentSpins.length}</span></div>
            </div>
          )}
        </div>
      </div>

      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        walletAddress={walletAddress}
        onBalanceChange={(playable) => setBalance((prev) => prev ? { ...prev, playable } : null)}
      />

      {/* Provably-fair verify modal. Reveal ends the session — subsequent spins */}
      {/* will need a fresh session and a new server seed (which is the point: */}
      {/* the server CAN'T retroactively pick a seed once it's revealed). */}
      <AnimatePresence>
        {verifyOpen && session && (
          <motion.div
            key="verify-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setVerifyOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-purple-400" />
                <p className="font-orbitron text-[11px] font-bold text-white/60 tracking-widest">VERIFY THIS SESSION</p>
              </div>

              <p className="text-[12px] text-white/50 font-rajdhani leading-relaxed">
                Each spin's outcome is HMAC-SHA256(server_seed, client_seed:nonce:reel).
                The server seed was committed before any spins via its hash. Reveal
                it below to recompute every outcome offline and confirm we didn't
                cheat.
              </p>

              {!revealed ? (
                <div className="space-y-3">
                  <KV label="Server seed hash (committed before spins)" value={session.serverSeedHash} />
                  <KV label="Client seed (yours)" value={clientSeed} />
                  <KV label="Spins consumed" value={String(recentSpins.length)} />
                  <button
                    onClick={async () => {
                      if (revealLoading) return;
                      setRevealLoading(true);
                      try {
                        const r = await revealSession(session.sessionId);
                        setRevealed(r);
                      } catch (err) {
                        console.error("[verify] reveal failed:", err);
                      } finally {
                        setRevealLoading(false);
                      }
                    }}
                    disabled={revealLoading}
                    className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-3 text-white font-orbitron text-[12px] tracking-wider"
                  >
                    {revealLoading ? "REVEALING…" : "REVEAL SERVER SEED & END SESSION"}
                  </button>
                  <p className="text-[10px] text-white/30 font-rajdhani text-center">
                    Reveal ends the session. The next spin starts a fresh seed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <KV label="Revealed server seed" value={revealed.serverSeed} highlight />
                  <KV label="Server seed hash (verify SHA-256 matches)" value={revealed.serverSeedHash} />
                  <KV label="Client seed" value={clientSeed} />
                  <KV label="Final nonce" value={String(revealed.nonce)} />
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-[11px] text-purple-200/80 font-rajdhani leading-relaxed">
                    Verify: <code className="font-mono text-purple-100">sha256(serverSeed) === serverSeedHash</code>.
                    Outcome for spin <code className="font-mono">N</code> uses
                    {" "}<code className="font-mono">HMAC-SHA256(serverSeed, "{clientSeed.slice(0, 8)}…:N:reel")</code>.
                  </div>
                  <button
                    onClick={() => { setVerifyOpen(false); setRevealed(null); }}
                    className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-3 text-white/80 font-orbitron text-[12px] tracking-wider"
                  >
                    CLOSE
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function KV({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-orbitron tracking-widest text-white/40">{label}</p>
      <div className={`rounded-lg border px-3 py-2 font-mono text-[11px] break-all ${
        highlight
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          : "bg-black/40 border-white/8 text-white/70"
      }`}>
        {value}
      </div>
    </div>
  );
}

const SYMBOL_EMOJI = {
  SEVEN: "7️⃣", BAR3: "▰▰▰", BAR2: "▰▰", BAR1: "▰",
  BELL: "🔔", CHERRY: "🍒", LEMON: "🍋", ORANGE: "🍊", WILD: "⭐",
} as const;
