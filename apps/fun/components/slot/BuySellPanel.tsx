"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowDownUp, Wallet, AlertTriangle } from "lucide-react";
import { cn, formatSol } from "@/lib/utils";
import { MAX_WALLET_PCT } from "@/lib/constants";
import type { SlotToken } from "@/types/slot";

interface Props {
  slot: SlotToken;
  solPrice?: number;
}

type Mode = "buy" | "sell";

const QUICK_AMOUNTS = [0.1, 0.5, 1, 5];

export function BuySellPanel({ slot, solPrice = 150 }: Props) {
  const { authenticated, login } = usePrivy();
  const [mode, setMode] = useState<Mode>("buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const solAmount = parseFloat(amount) || 0;
  const tokenOut = mode === "buy" ? solAmount / slot.priceUsd / solPrice : 0;
  const solOut    = mode === "sell" ? solAmount * slot.priceUsd * solPrice : 0;

  async function handleTrade() {
    if (!authenticated) { login(); return; }
    if (!solAmount) return;
    setLoading(true);
    // TODO: Anchor CPI to token-launch program buy_tokens / sell_tokens
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setAmount("");
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-white/[0.04] p-1 gap-1">
        {(["buy", "sell"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-all",
              mode === m
                ? m === "buy"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
                : "text-white/40 hover:text-white"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <label className="text-xs text-white/40">
          {mode === "buy" ? "SOL to spend" : "Tokens to sell"}
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min={0}
            className="w-full rounded-xl bg-white/[0.04] border border-white/5 px-4 py-3 pr-16 text-lg font-mono text-white placeholder:text-white/20 outline-none focus:border-purple-500/40 transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40">
            {mode === "buy" ? "SOL" : slot.ticker}
          </span>
        </div>

        {/* Quick amounts (buy mode) */}
        {mode === "buy" && (
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className="flex-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] py-1.5 text-xs text-white/50 hover:text-white transition-colors"
              >
                {q} SOL
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Output estimate */}
      {solAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3 space-y-1"
        >
          <div className="flex justify-between text-sm">
            <span className="text-white/40">You receive</span>
            <span className="text-white font-medium">
              {mode === "buy"
                ? `${tokenOut.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${slot.ticker}`
                : `${formatSol(solOut * 1e9)}`}
            </span>
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>Price impact</span>
            <span>~{(solAmount * 0.8).toFixed(2)}%</span>
          </div>
        </motion.div>
      )}

      {/* Wallet cap warning */}
      {mode === "buy" && solAmount > 2 && (
        <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-300">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>Max {MAX_WALLET_PCT}% of supply per wallet. Large buys may be rejected by the program.</span>
        </div>
      )}

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleTrade}
        disabled={loading}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-all",
          loading
            ? "opacity-60 cursor-not-allowed bg-white/10"
            : mode === "buy"
            ? "bg-green-600 hover:bg-green-500"
            : "bg-red-600 hover:bg-red-500"
        )}
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            className="w-4 h-4 rounded-full border-2 border-white border-t-transparent"
          />
        ) : (
          <>
            {authenticated ? <ArrowDownUp size={15} /> : <Wallet size={15} />}
            {authenticated
              ? mode === "buy" ? "Buy" : "Sell"
              : "Connect Wallet"}
          </>
        )}
      </motion.button>
    </div>
  );
}
