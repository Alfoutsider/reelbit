"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ArrowLeft, CheckCircle, Clock, XCircle, Zap, Gift } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type DemoStatus = "none" | "pending" | "approved" | "denied" | "checking";

export default function DemoApplyPage() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const walletAddress = wallet?.address ?? "";

  const [status,   setStatus]   = useState<DemoStatus>("checking");
  const [reason,   setReason]   = useState("");
  const [twitter,  setTwitter]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!walletAddress) { setStatus("none"); return; }
    fetch(`${API_URL}/demo/status/${walletAddress}`)
      .then((r) => r.json())
      .then((d: { status: DemoStatus }) => setStatus(d.status ?? "none"))
      .catch(() => setStatus("none"));
  }, [walletAddress]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/demo/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress, reason, twitter: twitter || undefined }),
      });
      const data = await res.json() as { status?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setStatus("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-white/5 bg-[#06060f]/60 backdrop-blur px-6 py-3 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
          <ArrowLeft size={15} /> Back to Lobby
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
              <Gift size={24} className="text-purple-400" />
            </div>
            <h1 className="font-orbitron text-2xl font-black text-white">Beta Access</h1>
            <p className="text-white/35 text-sm font-rajdhani max-w-sm mx-auto">
              ReelBit Casino is invite-only during beta. Apply below — approved wallets receive
              <span className="text-purple-400 font-bold"> $100 free play credit</span>.
            </p>
          </motion.div>

          {/* State: not connected */}
          {!authenticated && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-panel p-6 text-center space-y-4">
              <p className="text-white/40 text-sm">Connect your wallet to apply.</p>
              <button onClick={login} className="btn-primary w-full py-3">
                Connect Wallet
              </button>
            </motion.div>
          )}

          {/* State: checking */}
          {authenticated && status === "checking" && (
            <div className="card-panel p-6 text-center text-white/30 text-sm">Checking status…</div>
          )}

          {/* State: approved */}
          <AnimatePresence mode="wait">
            {authenticated && status === "approved" && (
              <motion.div
                key="approved"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-panel p-6 space-y-4 border-green-500/20 bg-green-500/5"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={22} className="text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-white">Access Approved</p>
                    <p className="text-sm text-white/40">$100 USDC has been credited to your balance.</p>
                  </div>
                </div>
                <Link href="/" className="btn-primary w-full py-3 text-center block">
                  Play Now →
                </Link>
              </motion.div>
            )}

            {/* State: pending */}
            {authenticated && status === "pending" && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-panel p-6 space-y-3 border-yellow-500/20 bg-yellow-500/5"
              >
                <div className="flex items-center gap-3">
                  <Clock size={22} className="text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-white">Application Under Review</p>
                    <p className="text-sm text-white/40">We review applications manually. Check back in 24–48 hours.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* State: denied */}
            {authenticated && status === "denied" && (
              <motion.div
                key="denied"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-panel p-6 space-y-4 border-red-500/20 bg-red-500/5"
              >
                <div className="flex items-center gap-3">
                  <XCircle size={22} className="text-red-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-white">Not Approved</p>
                    <p className="text-sm text-white/40">This wallet was not approved for beta. You can re-apply below.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Application form (none or re-applying after denial) */}
          {authenticated && (status === "none" || status === "denied") && (
            <motion.form
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="card-panel p-6 space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-orbitron text-white/40 tracking-wider">
                  WHY DO YOU WANT ACCESS? *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us about yourself and what you're excited to try (20–500 chars)"
                  rows={4}
                  required
                  minLength={20}
                  maxLength={500}
                  className="input-casino w-full resize-none text-sm"
                />
                <p className="text-[10px] text-white/20">{reason.length}/500</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-orbitron text-white/40 tracking-wider">
                  TWITTER / X HANDLE (OPTIONAL)
                </label>
                <input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@yourhandle"
                  className="input-casino w-full text-sm"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || reason.length < 20}
                className="w-full py-3 rounded-xl font-orbitron font-bold text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={14} /> {submitting ? "Submitting…" : "Apply for Beta Access"}
              </button>

              <p className="text-[10px] text-white/20 text-center">
                Wallet: {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
              </p>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
}
