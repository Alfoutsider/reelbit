"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, Rocket, CheckCircle, Info, ChevronRight, Sparkles, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isDemoMode, createDemoSlot } from "@/lib/demoSession";
import { cn } from "@/lib/utils";

type Step = "form" | "preview" | "launching" | "success";
type SlotModel = "Classic3Reel" | "Standard5Reel" | "FiveReelFreeSpins";

interface FormData {
  name:        string;
  ticker:      string;
  imageUri:    string;
  model:       SlotModel;
  description: string;
}

const EMPTY: FormData = { name: "", ticker: "", imageUri: "", model: "Classic3Reel", description: "" };

const SLOT_MODELS = [
  { id: "Classic3Reel",      emoji: "🎰", label: "Classic 3-Reel",  reels: 3 },
  { id: "Standard5Reel",     emoji: "💎", label: "Standard 5-Reel", reels: 5 },
  { id: "FiveReelFreeSpins", emoji: "🔔", label: "Free Spins",       reels: 5 },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Launch for Free",   desc: "Token deploys at $5k mcap. Simulated — no real SOL needed." },
  { step: "02", title: "Bots Buy In",        desc: "Fake traders fill the bonding curve automatically." },
  { step: "03", title: "Graduate at $100k", desc: "Your slot goes live on the demo casino." },
  { step: "04", title: "Earn Credits",      desc: "Watch your creator fees accumulate in real time." },
];

export default function DemoLaunchPage() {
  const router = useRouter();
  const [step,  setStep]  = useState<Step>("form");
  const [form,  setForm]  = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [slotId, setSlotId] = useState("");

  useEffect(() => {
    if (!isDemoMode()) router.replace("/demo");
  }, [router]);

  function validate(): boolean {
    const e: Partial<FormData> = {};
    if (!form.name.trim())              e.name   = "Required";
    if (form.name.length > 32)          e.name   = "Max 32 chars";
    if (!form.ticker.trim())            e.ticker = "Required";
    if (form.ticker.length > 10)        e.ticker = "Max 10 chars";
    if (!/^[A-Z0-9]+$/.test(form.ticker.toUpperCase())) e.ticker = "Letters and numbers only";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handlePreview() {
    if (!validate()) return;
    setStep("preview");
  }

  async function handleLaunch() {
    setStep("launching");
    // Simulate a deploy delay
    await new Promise((r) => setTimeout(r, 2200));
    const slot = createDemoSlot({
      name:        form.name.trim(),
      ticker:      form.ticker.toUpperCase(),
      model:       form.model,
      description: form.description.trim(),
      imageUri:    form.imageUri.trim(),
    });
    setSlotId(slot.id);
    setStep("success");
  }

  return (
    <div className="relative min-h-screen">

      {/* Header */}
      <div className="border-b border-white/5 bg-[#06060f]/60 backdrop-blur px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
          <ArrowLeft size={15} /> Back to Lobby
        </Link>
        <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
          <Gamepad2 size={10} className="text-purple-400" />
          <span className="font-orbitron text-[9px] font-bold text-purple-300 tracking-widest">DEMO MODE</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-500/5 border border-purple-500/20 rounded-full px-3 py-1 mb-4">
            <Sparkles size={10} className="text-purple-400" />
            <span className="font-orbitron text-[9px] font-bold text-purple-400/70 tracking-widest">SIMULATED TOKEN LAUNCH</span>
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-black text-white tracking-tight">
            Launch a <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Demo Slot</span>
          </h1>
          <p className="text-white/40 font-rajdhani text-base mt-2">
            No real tokens · Fake bonding curve · Same mechanics as live
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Form panel */}
                <div className="lg:col-span-3 card-panel p-6 space-y-5">
                  <h2 className="font-orbitron text-sm font-bold text-white/70 tracking-widest">TOKEN DETAILS</h2>

                  <div className="space-y-1.5">
                    <label className="section-label">Slot Name <span className="text-red-400 ml-0.5">*</span></label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Dragon Hoard"
                      maxLength={32}
                      className={cn("input-casino", errors.name && "error")}
                    />
                    {errors.name && <p className="text-xs text-red-400 font-rajdhani">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="section-label">Ticker Symbol <span className="text-red-400 ml-0.5">*</span></label>
                    <input
                      value={form.ticker}
                      onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                      placeholder="DHOARD"
                      maxLength={10}
                      className={cn("input-casino font-orbitron tracking-widest", errors.ticker && "error")}
                    />
                    {errors.ticker && <p className="text-xs text-red-400 font-rajdhani">{errors.ticker}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="section-label">Slot Model</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SLOT_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, model: m.id as SlotModel }))}
                          className={cn(
                            "model-card",
                            form.model === m.id && "selected",
                          )}
                        >
                          <div className="text-2xl mb-2">{m.emoji}</div>
                          <p className="font-orbitron text-[10px] font-bold tracking-wide text-white/60">{m.label}</p>
                          <p className="text-[9px] text-white/25 font-rajdhani mt-0.5">{m.reels} reels</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="section-label">Image URL <span className="text-white/20 ml-1">(optional)</span></label>
                    <div className="relative">
                      <Upload size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                      <input
                        value={form.imageUri}
                        onChange={(e) => setForm((f) => ({ ...f, imageUri: e.target.value }))}
                        placeholder="https://… or leave blank"
                        className="input-casino pl-9"
                      />
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-white/25 font-rajdhani">
                      <Info size={10} className="text-purple-400/50" />
                      Leave blank — placeholder art is generated
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="section-label">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Tell players about your slot theme…"
                      rows={3}
                      className="input-casino resize-none"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 0 32px rgba(139,92,246,0.6)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePreview}
                    className="w-full btn-launch flex items-center justify-center gap-2.5 py-4 text-[13px]"
                  >
                    <Rocket size={16} />
                    PREVIEW LAUNCH
                    <ChevronRight size={14} />
                  </motion.button>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="card-panel p-5 space-y-4">
                    <p className="font-orbitron text-[10px] font-bold text-white/40 tracking-widest">HOW IT WORKS</p>
                    {HOW_IT_WORKS.map(({ step: s, title, desc }) => (
                      <div key={s} className="flex gap-3 items-start">
                        <span className="font-orbitron text-[10px] font-black text-purple-500/70 mt-0.5 shrink-0">{s}</span>
                        <div>
                          <p className="font-rajdhani font-bold text-white/70 text-[13px]">{title}</p>
                          <p className="font-rajdhani text-[12px] text-white/35 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Starting MCAP", value: "$5,000" },
                      { label: "Graduation",    value: "$100K" },
                      { label: "RTP",           value: "96%" },
                      { label: "Creator Share", value: "25%" },
                    ].map(({ label, value }) => (
                      <div key={label} className="stat-box">
                        <p className="label">{label}</p>
                        <p className="value text-purple-400 text-base">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4">
                    <p className="text-[11px] font-rajdhani text-purple-300/60 leading-relaxed">
                      This is a <strong>demo simulation</strong>. No real tokens are created,
                      no SOL is spent, and all bonding curve activity is fake.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto"
            >
              <div className="card-panel p-7 space-y-6">
                <div>
                  <p className="font-orbitron text-[10px] font-bold text-white/30 tracking-widest mb-1">CONFIRM DEMO LAUNCH</p>
                  <h2 className="font-orbitron text-xl font-black text-white">Review Details</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { k: "Token Name", v: form.name },
                    { k: "Ticker",     v: `$${form.ticker}` },
                    { k: "Model",      v: SLOT_MODELS.find((m) => m.id === form.model)?.label ?? "" },
                    { k: "Supply",     v: "1,000,000,000 tokens (simulated)" },
                    { k: "Your Cost",  v: "FREE — demo mode" },
                    { k: "RTP",        v: "96% enforced" },
                  ].map(({ k, v }) => (
                    <div key={k} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                      <span className="section-label">{k}</span>
                      <span className="font-rajdhani font-bold text-white text-sm">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-purple-500/8 border border-purple-500/20 rounded-xl p-4">
                  <p className="text-xs font-rajdhani text-purple-300/80 leading-relaxed">
                    A <strong>simulated bonding curve</strong> will be created. Fake bots will buy in
                    automatically. You can also buy/sell using your demo balance.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep("form")} className="flex-1 btn-ghost py-3 text-[12px] font-orbitron">BACK</button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLaunch}
                    className="flex-1 btn-launch flex items-center justify-center gap-2 py-3"
                  >
                    <Rocket size={14} /> LAUNCH
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "launching" && (
            <motion.div
              key="launching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-40 gap-6"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500"
                />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🎰</div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-orbitron text-sm font-bold text-white tracking-widest">DEPLOYING TOKEN</p>
                <p className="font-rajdhani text-white/35 text-sm">Generating bonding curve…</p>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center space-y-6 py-16"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className="mx-auto w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center"
              >
                <CheckCircle size={40} className="text-green-400" />
              </motion.div>
              <div className="space-y-2">
                <h2 className="font-orbitron text-2xl font-black text-white">Slot Launched!</h2>
                <p className="font-rajdhani text-white/40">
                  Drive your bonding curve to 85 SOL to graduate to the casino!
                </p>
              </div>
              <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4 space-y-1">
                <p className="section-label">DEMO SLOT ID</p>
                <p className="font-mono text-xs text-white/40 break-all">{slotId}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link href={`/demo/slot/${slotId}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-launch flex items-center gap-2 px-6 py-3"
                  >
                    VIEW BONDING CURVE
                  </motion.button>
                </Link>
                <button
                  onClick={() => { setStep("form"); setForm(EMPTY); setSlotId(""); }}
                  className="btn-ghost px-6 py-3 font-orbitron text-[11px] tracking-wide"
                >
                  LAUNCH ANOTHER
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
