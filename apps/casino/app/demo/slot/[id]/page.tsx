"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, TrendingUp, Zap, Trophy, ShoppingCart, TrendingDown,
  Gamepad2, CheckCircle, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  isDemoMode,
  getDemoSlot,
  getDemoSession,
  tickDemoBots,
  demoBuySlot,
  demoSellSlot,
  bondingMcapUsd,
  bondingPricePerToken,
  GRADUATION_SOL,
  DEMO_PLAY_MINTS,
  type DemoSlot,
} from "@/lib/demoSession";
import { formatUsdc } from "@/lib/balanceClient";

const SOL_PRICE_USD = 150;

// ── Activity event ────────────────────────────────────────────────────────────

interface ActivityEvent {
  id:        number;
  kind:      "buy" | "sell" | "bot_buy" | "graduated";
  wallet:    string;
  solAmount: number;
  tokens:    number;
  ts:        number;
}

const BOT_NAMES = [
  "7xK…gAs", "9Wz…NqM", "BrE…jnC", "5yF…KKC",
  "HN7…WrH", "ATo…Aev", "3h1…bYL", "9xQ…Fin",
  "mGr…PsV", "4Wd…xQZ", "LkR…mJT", "8cN…bWY",
];

function randomBot(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

function formatSol(n: number) {
  return n < 0.01 ? n.toFixed(4) : n.toFixed(3);
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DemoSlotPage({ params }: { params: { id: string } }) {
  const { id }   = params;
  const router   = useRouter();

  const [slot,      setSlot]      = useState<DemoSlot | null>(null);
  const [balance,   setBalance]   = useState(0);
  const [activity,  setActivity]  = useState<ActivityEvent[]>([]);
  const [buyAmt,    setBuyAmt]    = useState("1"); // USDC amount string
  const [sellPct,   setSellPct]   = useState(25);  // % of tokens to sell
  const [tab,       setTab]       = useState<"buy" | "sell">("buy");
  const [txMsg,     setTxMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const activityRef = useRef<ActivityEvent[]>([]);
  const eventIdRef  = useRef(0);

  // Redirect if not in demo mode
  useEffect(() => {
    if (!isDemoMode()) { router.replace("/demo"); return; }
    const s = getDemoSlot(id);
    if (!s) { router.replace("/"); return; }
    setSlot(s);
    const sess = getDemoSession();
    if (sess) setBalance(sess.balance);
  }, [id, router]);

  // Sync balance from localStorage
  useEffect(() => {
    const timer = setInterval(() => {
      const sess = getDemoSession();
      if (sess) setBalance(sess.balance);
      const s = getDemoSlot(id);
      if (s) setSlot(s);
    }, 500);
    return () => clearInterval(timer);
  }, [id]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const addEvent = useCallback((ev: Omit<ActivityEvent, "id">) => {
    const entry = { ...ev, id: ++eventIdRef.current };
    activityRef.current = [entry, ...activityRef.current].slice(0, 30);
    setActivity([...activityRef.current]);
  }, []);

  // Bot ticks — every 5-9s
  useEffect(() => {
    function tick() {
      const current = getDemoSlot(id);
      if (!current || current.graduated) return;

      const before       = current.realSolSim;
      const updated      = tickDemoBots(id);
      if (!updated) return;

      const delta        = updated.realSolSim - before;
      const approxTokens = Math.floor(delta * SOL_PRICE_USD / bondingPricePerToken(before));

      if (updated.graduated) {
        addEvent({ kind: "graduated", wallet: "System", solAmount: 0, tokens: 0, ts: Date.now() });
      } else {
        addEvent({ kind: "bot_buy", wallet: randomBot(), solAmount: delta, tokens: approxTokens, ts: Date.now() });
      }
      setSlot(updated);
    }

    function schedule() {
      tick();
      timerRef.current = setTimeout(schedule, 5_000 + Math.random() * 4_000);
    }

    timerRef.current = setTimeout(schedule, 5_000 + Math.random() * 4_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!slot) return null;

  const progress   = Math.min(slot.realSolSim / GRADUATION_SOL, 1);
  const mcapUsd    = bondingMcapUsd(slot.realSolSim);
  const priceUsd   = bondingPricePerToken(slot.realSolSim);
  const playMint   = DEMO_PLAY_MINTS[slot.model];

  // ── Buy handler ────────────────────────────────────────────────────────────
  function handleBuy() {
    const usdcFloat = parseFloat(buyAmt);
    if (isNaN(usdcFloat) || usdcFloat <= 0) return;
    const usdcUnits = Math.round(usdcFloat * 1_000_000);
    if (usdcUnits > balance) { setTxMsg({ ok: false, text: "Insufficient demo balance" }); return; }
    try {
      const { tokensReceived, graduated } = demoBuySlot(id, usdcUnits, SOL_PRICE_USD);
      const solSpent = usdcFloat / SOL_PRICE_USD;
      addEvent({ kind: "buy", wallet: "You", solAmount: solSpent, tokens: tokensReceived, ts: Date.now() });
      setTxMsg({ ok: true, text: `Bought ${formatTokens(tokensReceived)} $${slot.ticker}` });
      if (graduated) addEvent({ kind: "graduated", wallet: "System", solAmount: 0, tokens: 0, ts: Date.now() });
    } catch (e) {
      setTxMsg({ ok: false, text: (e as Error).message });
    }
    setTimeout(() => setTxMsg(null), 3_000);
  }

  // ── Sell handler ───────────────────────────────────────────────────────────
  function handleSell() {
    if (slot.tokensHeld <= 0) { setTxMsg({ ok: false, text: "You have no tokens to sell" }); return; }
    const tokenAmount = Math.floor(slot.tokensHeld * (sellPct / 100));
    if (tokenAmount <= 0) return;
    try {
      const { usdcReceived } = demoSellSlot(id, tokenAmount, SOL_PRICE_USD);
      addEvent({ kind: "sell", wallet: "You", solAmount: usdcReceived / 1_000_000 / SOL_PRICE_USD, tokens: tokenAmount, ts: Date.now() });
      setTxMsg({ ok: true, text: `Sold for ${formatUsdc(usdcReceived)}` });
    } catch (e) {
      setTxMsg({ ok: false, text: (e as Error).message });
    }
    setTimeout(() => setTxMsg(null), 3_000);
  }

  return (
    <div className="relative min-h-screen">

      {/* Header */}
      <div className="border-b border-white/5 bg-[#06060f]/60 backdrop-blur px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
          <ArrowLeft size={15} /> Lobby
        </Link>
        <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
          <Gamepad2 size={10} className="text-purple-400" />
          <span className="font-orbitron text-[9px] font-bold text-purple-300 tracking-widest">DEMO MODE</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Slot header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-orbitron text-2xl font-black text-white">{slot.name}</h1>
              <span
                className="font-orbitron text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: slot.primaryColor, borderColor: `${slot.primaryColor}40`, background: `${slot.primaryColor}12` }}
              >
                ${slot.ticker}
              </span>
            </div>
            <p className="text-white/35 text-sm font-rajdhani">{slot.description || "No description provided."}</p>
          </div>
          {slot.graduated && (
            <Link href={`/slot/${playMint}`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="btn-launch flex items-center gap-2 py-2.5 px-5 text-[12px]"
              >
                <Gamepad2 size={14} /> PLAY SLOT
              </motion.button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: curve + activity */}
          <div className="lg:col-span-2 space-y-5">

            {/* Graduation banner */}
            <AnimatePresence>
              {slot.graduated && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3"
                >
                  <Trophy size={18} className="text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-orbitron text-sm font-bold text-green-400">GRADUATED!</p>
                    <p className="text-white/50 text-xs font-rajdhani mt-0.5">
                      Your slot is now live on the demo casino. Play it with your demo balance!
                    </p>
                  </div>
                  <Link href={`/slot/${playMint}`} className="ml-auto shrink-0">
                    <button className="btn-launch py-2 px-4 text-[11px]">PLAY NOW</button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bonding curve card */}
            <div className="card-panel p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">BONDING CURVE</p>
                {!slot.graduated && (
                  <span className="text-[11px] font-rajdhani text-white/30">
                    {formatSol(slot.realSolSim)} / {GRADUATION_SOL} SOL raised
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: slot.graduated
                        ? "linear-gradient(90deg, #22c55e, #16a34a)"
                        : `linear-gradient(90deg, ${slot.primaryColor}, ${slot.accentColor})`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-rajdhani text-white/25">
                  <span>$5K MCap</span>
                  <span className="font-bold" style={{ color: slot.primaryColor }}>
                    {(progress * 100).toFixed(1)}%
                  </span>
                  <span>$100K 🎓</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "MCap",       value: `$${mcapUsd >= 1000 ? `${(mcapUsd / 1000).toFixed(1)}K` : mcapUsd.toFixed(0)}` },
                  { label: "SOL Raised", value: `${formatSol(slot.realSolSim)} SOL` },
                  { label: "Price/Token", value: `$${priceUsd < 0.000001 ? priceUsd.toExponential(2) : priceUsd.toFixed(6)}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                    <p className="font-orbitron text-[9px] text-white/25 tracking-widest mb-1">{label}</p>
                    <p className="font-orbitron text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Your tokens */}
              {slot.tokensHeld > 0 && (
                <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-[11px] font-rajdhani text-white/40">Your tokens</span>
                  <span className="font-orbitron text-sm font-bold text-purple-400">
                    {formatTokens(slot.tokensHeld)} ${slot.ticker}
                  </span>
                </div>
              )}
            </div>

            {/* Activity feed */}
            <div className="card-panel p-5 space-y-3">
              <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">ACTIVITY</p>
              {activity.length === 0 ? (
                <p className="text-white/20 text-xs font-rajdhani text-center py-4">
                  Waiting for first trade…
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {activity.map((ev) => (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-2 text-[11px] font-rajdhani p-2 rounded-lg ${
                          ev.kind === "graduated"
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-white/[0.02]"
                        }`}
                      >
                        {ev.kind === "graduated" ? (
                          <>
                            <Trophy size={12} className="text-green-400 shrink-0" />
                            <span className="text-green-400 font-bold">GRADUATED to casino!</span>
                          </>
                        ) : (
                          <>
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              ev.kind === "buy" || ev.kind === "bot_buy" ? "bg-green-400" : "bg-red-400"
                            }`} />
                            <span className="text-white/40 font-mono">{ev.wallet}</span>
                            <span className={ev.kind === "sell" ? "text-red-400" : "text-green-400"}>
                              {ev.kind === "sell" ? "sold" : "bought"}
                            </span>
                            <span className="text-white/60 font-bold">{formatTokens(ev.tokens)} ${slot.ticker}</span>
                            <span className="text-white/25">for {formatSol(ev.solAmount)} SOL</span>
                            <span className="text-white/15 ml-auto">{timeAgo(ev.ts)}</span>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Right: buy/sell panel */}
          <div className="space-y-4">
            <div className="card-panel p-5 space-y-4">
              {/* Balance */}
              <div className="flex items-center justify-between">
                <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">TRADE</p>
                <span className="text-[11px] font-rajdhani text-white/40">
                  Balance: <span className="text-white font-bold">{formatUsdc(balance)}</span>
                </span>
              </div>

              {/* Tab toggle */}
              <div className="flex rounded-xl overflow-hidden border border-white/8">
                <button
                  onClick={() => setTab("buy")}
                  className={`flex-1 py-2.5 text-[11px] font-orbitron font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tab === "buy"
                      ? "bg-green-500/20 text-green-400"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  <ShoppingCart size={11} /> BUY
                </button>
                <button
                  onClick={() => setTab("sell")}
                  className={`flex-1 py-2.5 text-[11px] font-orbitron font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tab === "sell"
                      ? "bg-red-500/20 text-red-400"
                      : "text-white/30 hover:text-white/50"
                  }`}
                >
                  <TrendingDown size={11} /> SELL
                </button>
              </div>

              {tab === "buy" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="section-label">Amount (USDC)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={buyAmt}
                      onChange={(e) => setBuyAmt(e.target.value)}
                      className="input-casino"
                      placeholder="1.00"
                    />
                  </div>
                  {/* Quick amounts */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {["1", "5", "10", "25"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setBuyAmt(v)}
                        className="text-[10px] font-orbitron py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-all"
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleBuy}
                    disabled={slot.graduated}
                    className="w-full py-3 rounded-xl font-orbitron font-bold text-[12px] bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <TrendingUp size={13} /> {slot.graduated ? "CURVE CLOSED" : "BUY"}
                  </motion.button>
                  {!slot.graduated && (
                    <p className="text-[10px] text-white/20 font-rajdhani text-center">
                      ≈ {parseFloat(buyAmt || "0") > 0
                        ? formatTokens(Math.floor(parseFloat(buyAmt) / priceUsd))
                        : "0"} tokens received
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="section-label">
                      Sell {sellPct}% of tokens
                      {slot.tokensHeld > 0 && (
                        <span className="text-white/20 ml-2">
                          ({formatTokens(Math.floor(slot.tokensHeld * (sellPct / 100)))})
                        </span>
                      )}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={sellPct}
                      onChange={(e) => setSellPct(Number(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-[9px] text-white/20 font-rajdhani">
                      <span>1%</span><span>25%</span><span>50%</span><span>100%</span>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSell}
                    disabled={slot.tokensHeld <= 0}
                    className="w-full py-3 rounded-xl font-orbitron font-bold text-[12px] bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <TrendingDown size={13} /> {slot.tokensHeld <= 0 ? "NO TOKENS" : "SELL"}
                  </motion.button>
                  <p className="text-[10px] text-white/20 font-rajdhani text-center">5% slippage applied</p>
                </div>
              )}

              {/* Tx feedback */}
              <AnimatePresence>
                {txMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 text-[11px] font-rajdhani p-3 rounded-xl ${
                      txMsg.ok
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                    }`}
                  >
                    {txMsg.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {txMsg.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info */}
            <div className="card-panel p-4 space-y-3">
              <p className="font-orbitron text-[9px] font-bold text-white/30 tracking-widest">SLOT INFO</p>
              {[
                { k: "Model",   v: slot.model.replace(/([A-Z])/g, " $1").trim() },
                { k: "Created", v: new Date(slot.createdAt).toLocaleDateString() },
                { k: "Supply",  v: "1,000,000,000" },
                { k: "RTP",     v: "96%" },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between text-[11px]">
                  <span className="text-white/25 font-rajdhani">{k}</span>
                  <span className="text-white/60 font-rajdhani font-bold">{v}</span>
                </div>
              ))}
            </div>

            {/* Play CTA — always visible */}
            <div className="card-panel p-4 text-center space-y-3">
              <p className="text-[11px] font-rajdhani text-white/30">
                {slot.graduated
                  ? "Your slot is live! Jump in and play."
                  : "Reach 85 SOL to graduate and play."}
              </p>
              <Link href={`/slot/${playMint}`}>
                <button
                  className={`w-full py-2.5 rounded-xl font-orbitron font-bold text-[11px] transition-colors ${
                    slot.graduated
                      ? "bg-purple-600 hover:bg-purple-500 text-white"
                      : "bg-white/[0.04] text-white/25 border border-white/8 cursor-default"
                  }`}
                >
                  <Gamepad2 size={12} className="inline mr-1.5" />
                  {slot.graduated ? "PLAY SLOT NOW" : "GRADUATE FIRST"}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
