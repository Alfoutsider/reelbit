"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { Upload, Rocket, CheckCircle, Info } from "lucide-react";
import { BondingCurveChart } from "@/components/chart/BondingCurveChart";
import { cn } from "@/lib/utils";
import { SLOT_MODELS, STARTING_MCAP_USD, RTP_PCT } from "@/lib/constants";
import type { SlotModel } from "@/types/slot";

type Step = "form" | "preview" | "launching" | "success";

interface FormData {
  name: string;
  ticker: string;
  imageUri: string;
  model: SlotModel;
  description: string;
}

const EMPTY: FormData = { name: "", ticker: "", imageUri: "", model: "Classic3Reel", description: "" };

export default function LaunchPage() {
  const { authenticated, login } = usePrivy();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [mintAddress, setMintAddress] = useState("");

  function validate(): boolean {
    const e: Partial<FormData> = {};
    if (!form.name.trim())               e.name = "Required";
    if (form.name.length > 32)           e.name = "Max 32 chars";
    if (!form.ticker.trim())             e.ticker = "Required";
    if (form.ticker.length > 10)         e.ticker = "Max 10 chars";
    if (!/^[A-Z0-9]+$/.test(form.ticker.toUpperCase())) e.ticker = "Letters and numbers only";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLaunch() {
    if (!authenticated) { login(); return; }
    if (!validate()) return;
    setStep("preview");
  }

  async function confirmLaunch() {
    setStep("launching");
    // TODO: call token-launch program via Anchor client
    await new Promise((r) => setTimeout(r, 2000));
    setMintAddress("So11111111111111111111111111111111111111112");
    setStep("success");
  }

  const field = (key: keyof FormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
    className: cn(
      "w-full rounded-xl bg-white/[0.04] border px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-colors",
      errors[key] ? "border-red-500/60" : "border-white/5 focus:border-purple-500/50"
    ),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-3xl font-bold text-white">Launch a Slot Token</h1>
        <p className="text-white/40 text-sm">Free to deploy. 96% RTP enforced. You earn 25% of all fees forever.</p>
      </div>

      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form */}
              <div className="lg:col-span-3 space-y-5 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <h2 className="font-semibold text-white">Token Details</h2>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">Slot Name <span className="text-red-400">*</span></label>
                  <input {...field("name")} placeholder="Dragon Hoard" maxLength={32} />
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                {/* Ticker */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">Ticker Symbol <span className="text-red-400">*</span></label>
                  <input
                    {...field("ticker")}
                    placeholder="DHOARD"
                    maxLength={10}
                    onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                  />
                  {errors.ticker && <p className="text-xs text-red-400">{errors.ticker}</p>}
                </div>

                {/* Slot model */}
                <div className="space-y-2">
                  <label className="text-xs text-white/50">Slot Model</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SLOT_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, model: m.id as SlotModel }))}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-center text-xs font-medium transition-all",
                          form.model === m.id
                            ? "border-purple-500/60 bg-purple-500/10 text-purple-300"
                            : "border-white/5 bg-white/[0.03] text-white/50 hover:border-white/10"
                        )}
                      >
                        <div className="text-xl mb-1">{m.emoji}</div>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image URL */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">Image URL</label>
                  <div className="relative">
                    <Upload size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      {...field("imageUri")}
                      placeholder="https://… or leave blank for AI generation"
                      className={cn(field("imageUri").className, "pl-9")}
                    />
                  </div>
                  <p className="text-xs text-white/25 flex items-center gap-1">
                    <Info size={10} /> Leave blank — AI generates slot art at graduation
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Tell players about your slot theme…"
                    rows={3}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-500/50 transition-colors resize-none"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLaunch}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-3 font-semibold text-white transition-colors"
                >
                  <Rocket size={16} />
                  {authenticated ? "Preview Launch" : "Connect Wallet to Launch"}
                </motion.button>
              </div>

              {/* Preview + info */}
              <div className="lg:col-span-2 space-y-4">
                {/* Bonding curve preview */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                  <BondingCurveChart currentMcapUsd={STARTING_MCAP_USD} />
                </div>

                {/* Rules */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3 text-xs text-white/50">
                  <h3 className="text-white/70 font-medium text-sm">How it works</h3>
                  {[
                    ["🎰", "Your token launches at $5k mcap. Zero cost to you."],
                    ["📈", "Traders buy on the bonding curve. 5% max wallet cap prevents manipulation."],
                    [`🎯`, `Reach $100k mcap → your slot graduates to reelbit.casino automatically.`],
                    ["💰", "You earn 25% of all trading fees + casino GGR forever."],
                    [`🎲`, `${RTP_PCT}% RTP enforced on-chain. Players always have fair odds.`],
                  ].map(([icon, text]) => (
                    <div key={text as string} className="flex gap-2">
                      <span>{icon}</span>
                      <span>{text as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "preview" && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
              <h2 className="font-semibold text-white text-lg">Confirm Launch</h2>
              <div className="space-y-2 text-sm">
                {[
                  ["Name",   form.name],
                  ["Ticker", `$${form.ticker}`],
                  ["Model",  SLOT_MODELS.find((m) => m.id === form.model)?.label ?? ""],
                  ["Supply", "1,000,000,000 tokens"],
                  ["Cost",   "FREE (you pay ~0.01 SOL rent)"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <span className="text-white/40">{k as string}</span>
                    <span className="text-white font-medium">{v as string}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-xs text-purple-300">
                This will send a transaction to the ReelBit Token Launch program on devnet.
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("form")}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                  Back
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={confirmLaunch}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-sm font-semibold text-white transition-colors">
                  <Rocket size={14} /> Launch
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "launching" && (
          <motion.div key="launching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32 gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent"
            />
            <p className="text-white/60">Launching your slot token…</p>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center space-y-5 py-20">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
              <CheckCircle size={56} className="mx-auto text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white">Slot Launched! 🎰</h2>
            <p className="text-white/40 text-sm">
              Your token is live on the bonding curve. Share the link and drive it to $100k mcap!
            </p>
            <div className="rounded-xl bg-white/[0.04] border border-white/5 p-3 font-mono text-xs text-white/60 break-all">
              {mintAddress}
            </div>
            <div className="flex gap-3 justify-center">
              <a href={`/slot/${mintAddress}`}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-sm font-medium text-white transition-colors">
                View Slot
              </a>
              <button onClick={() => { setStep("form"); setForm(EMPTY); }}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/60 hover:text-white transition-colors">
                Launch Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
