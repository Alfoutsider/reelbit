"use client";

import { useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Wand2, Check, X, RotateCcw, ChevronLeft, Sparkles, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { usePrivy } from "@/lib/privy";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
};
// Covers all symbol IDs across classic, dragon, and egyptian themes
const SYMBOL_LABELS: Record<string, string> = {
  // Classic
  SEVEN: "Jackpot 7", WILD: "Wild", BAR3: "Triple Bar", BAR2: "Double Bar",
  BAR1: "Single Bar", BELL: "Bell", CHERRY: "Cherry", LEMON: "Lemon", ORANGE: "Orange",
  // Dragon
  DRAGON: "Dragon", FIRE_ORB: "Fire Orb", GEM: "Gem", SWORD: "Sword",
  SHIELD: "Shield", HELMET: "Helmet", SCATTER: "Scatter",
  // Egyptian
  PHARAOH: "Pharaoh", EYE_RA: "Eye of Ra", ANUBIS: "Anubis", SCARAB: "Scarab",
  ANKH: "Ankh", SNAKE: "Snake", VASE: "Vase",
};

interface StudioResult {
  themeDescription: string;
  palette: { primary: string; accent: string; bg: string };
  bgPrompt: string;
  symbols: Record<string, string>;
  symbolIds?: string[];   // ordered list from backend; falls back to Object.keys
  sourceImageUrl: string;
  bgImageUrl: string;
}

type Stage = "upload" | "analyzing" | "preview" | "applied";

export default function StudioPage() {
  const params = useParams();
  const mint = params.mint as string;
  const router = useRouter();
  const { authenticated } = usePrivy();

  const [stage, setStage] = useState<Stage>("upload");
  const [preview, setPreview] = useState<string | null>(null);       // data URL for preview
  const [base64, setBase64] = useState<string | null>(null);
  const [ext, setExt] = useState<string>("jpg");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<StudioResult | null>(null);
  const [applying, setApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("Only JPG, PNG, GIF, or WEBP images accepted.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Max file size is 8 MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [, b64] = dataUrl.split(",");
      setPreview(dataUrl);
      setBase64(b64);
      setExt(EXT_MAP[file.type] ?? "jpg");
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  async function analyze() {
    if (!base64) return;
    setStage("analyzing");
    setError(null);
    try {
      const res = await fetch(`${API}/studio/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, ext, mint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data as StudioResult);
      setStage("preview");
    } catch (e) {
      setError((e as Error).message);
      setStage("upload");
    }
  }

  async function apply() {
    if (!result) return;
    setApplying(true);
    try {
      const res = await fetch(`${API}/studio/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint, ...result }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Apply failed");
      setStage("applied");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  async function reset() {
    await fetch(`${API}/studio/reset/${mint}`, { method: "DELETE" });
    setStage("upload");
    setPreview(null);
    setBase64(null);
    setResult(null);
    setError(null);
  }

  function startOver() {
    setStage("upload");
    setPreview(null);
    setBase64(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link href={`/slot/${mint}`}
            className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm font-orbitron transition-colors mb-5">
            <ChevronLeft size={14} /> Back to slot
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.25)" }}>
              <Wand2 size={18} style={{ color: "#d4a017" }} />
            </div>
            <div>
              <h1 className="font-orbitron text-2xl font-black text-white">AI Slot Studio</h1>
              <p className="text-white/35 text-sm font-rajdhani">Upload any image — AI redesigns the entire slot theme to match</p>
            </div>
          </div>
        </div>

        {/* Auth gate */}
        {!authenticated && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-white/50 font-rajdhani mb-4">You must be logged in to use the AI Studio</p>
            <Link href={`/slot/${mint}`} className="btn-launch px-6 py-2 text-sm">
              Back to slot
            </Link>
          </div>
        )}

        {authenticated && (
          <div className="space-y-6">

            {/* Stage: Upload */}
            <AnimatePresence mode="wait">
              {stage === "upload" && (
                <motion.div key="upload" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">

                    {/* Drop zone */}
                    {!preview ? (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        onClick={() => inputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-5 h-64 cursor-pointer transition-all"
                        style={{
                          background: dragging ? "rgba(212,160,23,0.06)" : "transparent",
                          borderBottom: `2px dashed ${dragging ? "rgba(212,160,23,0.5)" : "rgba(255,255,255,0.08)"}`,
                        }}>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all"
                          style={{ background: dragging ? "rgba(212,160,23,0.15)" : "rgba(255,255,255,0.04)" }}>
                          {dragging
                            ? <ImageIcon size={28} style={{ color: "#d4a017" }} />
                            : <Upload size={28} className="text-white/25" />}
                        </div>
                        <div className="text-center px-6">
                          <p className="font-rajdhani font-bold text-white/60 text-lg">
                            {dragging ? "Drop to upload" : "Drop any image here, or click to browse"}
                          </p>
                          <p className="text-sm text-white/25 font-rajdhani mt-1">
                            JPG, PNG, GIF, WEBP — up to 8 MB · Any content: logo, photo, art, meme
                          </p>
                        </div>
                        <input ref={inputRef} type="file" accept={ACCEPTED_MIME.join(",")} className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
                      </div>
                    ) : (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Upload preview" className="w-full h-64 object-contain bg-black/40" />
                        <button onClick={startOver}
                          className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-red-500/30 text-white/50 hover:text-white transition-all">
                          <X size={14} />
                        </button>
                        <div className="absolute bottom-3 left-3 bg-black/70 rounded-lg px-3 py-1.5 flex items-center gap-2">
                          <ImageIcon size={12} style={{ color: "#d4a017" }} />
                          <span className="text-xs font-orbitron text-white/60">Ready to analyze</span>
                        </div>
                      </div>
                    )}

                    {/* Info row */}
                    <div className="px-6 py-4 flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 text-[11px] font-orbitron text-white/30">
                        <Sparkles size={11} style={{ color: "rgba(212,160,23,0.6)" }} />
                        Claude AI analyzes your image and generates 9 custom SVG symbols
                      </div>
                      <div className="ml-auto flex gap-2">
                        {preview && (
                          <button onClick={analyze}
                            className="btn-launch px-6 py-2 text-sm flex items-center gap-2">
                            <Wand2 size={14} />
                            Generate Theme
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <p className="mt-3 text-sm text-red-400 font-rajdhani bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                      {error}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Stage: Analyzing */}
              {stage === "analyzing" && (
                <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-[#d4a017]/20 border-t-[#d4a017] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wand2 size={24} style={{ color: "#d4a017" }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-orbitron text-white font-bold text-lg mb-2">Analyzing with Claude AI</p>
                    <p className="text-white/40 font-rajdhani text-sm">
                      Extracting theme, colors, and generating 9 custom SVG symbols…
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 text-center text-xs font-orbitron text-white/20 space-y-1">
                    {[
                      "Identifying visual theme",
                      "Extracting color palette",
                      "Generating premium symbols",
                      "Generating mid-tier symbols",
                      "Finalizing low-tier symbols",
                    ].map((step, i) => (
                      <motion.p key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 2.2 }}>
                        {step}…
                      </motion.p>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Stage: Preview */}
              {stage === "preview" && result && (
                <motion.div key="preview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-5">

                  {/* Theme summary */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg" style={{ background: result.palette.primary }} />
                      <div className="w-8 h-8 rounded-lg" style={{ background: result.palette.accent }} />
                      <div className="w-8 h-8 rounded-lg border border-white/10" style={{ background: result.palette.bg }} />
                    </div>
                    <div>
                      <p className="font-orbitron text-sm font-bold text-white">{result.themeDescription}</p>
                      <p className="text-white/30 text-xs font-rajdhani">Extracted palette · 9 custom symbols generated</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button onClick={startOver}
                        className="flex items-center gap-1.5 text-xs font-orbitron text-white/30 hover:text-white/60 transition-colors px-3 py-2 rounded-lg hover:bg-white/5">
                        <RotateCcw size={12} /> Try again
                      </button>
                      <button onClick={apply} disabled={applying}
                        className="btn-launch px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
                        {applying ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Apply to Slot
                      </button>
                    </div>
                  </div>

                  {/* Symbol grid — uses symbolIds from backend for correct theme order */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <p className="font-orbitron text-xs text-white/30 tracking-widest mb-4">GENERATED SYMBOLS</p>
                    {(() => {
                      const ids = result.symbolIds ?? Object.keys(result.symbols);
                      const cols = ids.length <= 7 ? ids.length : ids.length <= 9 ? 9 : ids.length;
                      return (
                        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min(cols, 9)}, minmax(0, 1fr))` }}>
                          {ids.map((id) => (
                            <div key={id} className="flex flex-col items-center gap-2">
                              <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                {result.symbols[id] ? (
                                  <div style={{ width: 80, height: 80 }} dangerouslySetInnerHTML={{ __html: result.symbols[id] }} />
                                ) : (
                                  <div className="text-white/10 text-xs font-orbitron">—</div>
                                )}
                              </div>
                              <span className="text-[9px] font-orbitron text-white/30 text-center">
                                {SYMBOL_LABELS[id] ?? id}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Background preview */}
                  {result.bgImageUrl && (
                    <div className="rounded-2xl border border-white/10 overflow-hidden">
                      <p className="font-orbitron text-xs text-white/30 tracking-widest p-4 pb-0">AI BACKGROUND PREVIEW</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.bgImageUrl}
                        alt="Generated background"
                        className="w-full h-40 object-cover opacity-80"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-red-400 font-rajdhani bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                      {error}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Stage: Applied */}
              {stage === "applied" && (
                <motion.div key="applied" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="rounded-2xl border border-green-500/20 bg-green-500/5 p-12 flex flex-col items-center gap-6 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
                    <Check size={28} className="text-green-400" />
                  </motion.div>
                  <div>
                    <p className="font-orbitron text-xl font-black text-white mb-2">Theme Applied!</p>
                    <p className="text-white/40 font-rajdhani">
                      Your slot now uses the AI-generated theme. All players will see the new design.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={reset}
                      className="flex items-center gap-2 text-sm font-orbitron text-white/30 hover:text-white/60 transition-colors px-4 py-2 rounded-xl hover:bg-white/5">
                      <RotateCcw size={13} /> Reset to default
                    </button>
                    <button onClick={() => router.push(`/slot/${mint}`)}
                      className="btn-launch px-6 py-2 text-sm flex items-center gap-2">
                      Play slot →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* How it works */}
            {stage === "upload" && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-6">
                <p className="font-orbitron text-xs text-white/20 tracking-widest mb-4">HOW IT WORKS</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { n: "1", title: "Upload any image", body: "A photo, logo, meme, artwork — anything. The AI figures out the theme from what it sees." },
                    { n: "2", title: "Claude analyzes it", body: "Claude vision extracts the color palette, mood, and key visual elements from your image." },
                    { n: "3", title: "Theme applied instantly", body: "9 custom SVG symbols and a matching background replace the default casino theme for this slot." },
                  ].map(({ n, title, body }) => (
                    <div key={n} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-orbitron text-xs font-black"
                        style={{ background: "rgba(212,160,23,0.1)", color: "#d4a017", border: "1px solid rgba(212,160,23,0.2)" }}>
                        {n}
                      </div>
                      <div>
                        <p className="font-orbitron text-xs text-white/60 mb-1">{title}</p>
                        <p className="text-xs text-white/30 font-rajdhani leading-relaxed">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
