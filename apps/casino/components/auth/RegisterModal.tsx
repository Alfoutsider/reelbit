"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Shield, Camera, AlertCircle, User } from "lucide-react";
import { AvatarCropper } from "./AvatarCropper";
import { SuccessAnimation } from "./SuccessAnimation";
import { cn } from "@/lib/utils";


const API      = process.env.NEXT_PUBLIC_API_URL      ?? "http://localhost:3001";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

type Step = "dob" | "captcha" | "username" | "avatar" | "submit" | "success";
const STEPS: Step[] = ["dob", "captcha", "username", "avatar", "submit"];

interface Props {
  wallet:  string;
  onClose: () => void;
  onDone:  (profile: { username: string; pfpUrl: string | null }) => void;
}

export function RegisterModal({ wallet, onClose, onDone }: Props) {
  const [step,       setStep]       = useState<Step>("dob");
  const [dob,        setDob]        = useState({ day: "", month: "", year: "" });
  const [dobError,   setDobError]   = useState<string | null>(null);
  const [cfToken,    setCfToken]    = useState<string | null>(null);
  const [username,   setUsername]   = useState("");
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [pfpB64,     setPfpB64]     = useState<string | null>(null);
  const [pfpExt,     setPfpExt]     = useState("jpg");
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr,  setSubmitErr]  = useState<string | null>(null);
  const [finalProfile, setFinalProfile] = useState<{ username: string; pfpUrl: string | null } | null>(null);

  const cfRef     = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  // Load Turnstile script once
  useEffect(() => {
    if (document.querySelector('script[src*="turnstile"]')) return;
    const s = document.createElement("script");
    s.src   = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch { /* already removed */ } };
  }, []);

  // Mount widget on captcha step
  useEffect(() => {
    if (step !== "captcha") return;
    let retries = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ts = () => (window as any).turnstile;
    const tryMount = () => {
      if (ts() && cfRef.current) {
        widgetRef.current = ts().render(cfRef.current, {
          sitekey:  SITE_KEY,
          theme:    "dark",
          callback: (token: string) => {
            setCfToken(token);
            setTimeout(() => setStep("username"), 400);
          },
        });
      } else if (retries++ < 20) setTimeout(tryMount, 250);
    };
    tryMount();
    return () => {
      if (widgetRef.current && ts()) {
        ts().remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, [step]);

  function validateDob() {
    const { day, month, year } = dob;
    if (!day || !month || !year) { setDobError("Please fill in your date of birth."); return false; }
    const birth = new Date(+year, +month - 1, +day);
    const now   = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    if (age < 18) { setDobError("You must be 18 or older to play on ReelBit."); return false; }
    setDobError(null);
    return true;
  }

  function validateUsername() {
    const c = username.trim();
    if (c.length < 3)  { setUsernameErr("Minimum 3 characters."); return false; }
    if (c.length > 32) { setUsernameErr("Maximum 32 characters."); return false; }
    setUsernameErr(null);
    return true;
  }

  function next() {
    if      (step === "dob")      { if (validateDob()) setStep("captcha"); }
    else if (step === "username") { if (validateUsername()) setStep("avatar"); }
  }

  function back() {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }

  const onCrop = useCallback((b64: string, ext: string) => {
    setPfpB64(b64);
    setPfpExt(ext);
    setPfpPreview(`data:image/${ext === "jpg" ? "jpeg" : ext};base64,${b64}`);
  }, []);

  async function handleSubmit() {
    if (!validateUsername()) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const dobStr = `${dob.year}-${dob.month.padStart(2, "0")}-${dob.day.padStart(2, "0")}`;
      const regRes = await fetch(`${API}/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ wallet, username: username.trim(), dob: dobStr, cfToken }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error ?? "Registration failed");

      let pfpUrl: string | null = null;
      if (pfpB64) {
        const pfpRes = await fetch(`${API}/profile/${wallet}/pfp/upload`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ base64: pfpB64, ext: pfpExt }),
        });
        if (pfpRes.ok) { const d = await pfpRes.json(); pfpUrl = d.pfpUrl ?? null; }
      }

      setFinalProfile({ username: username.trim(), pfpUrl });
      setStep("success");
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const stepIdx = STEPS.indexOf(step);
  const MONTHS  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const curYear = new Date().getFullYear();
  const years   = Array.from({ length: 100 }, (_, i) => curYear - i);

  const footerBtn =
    step === "avatar"   ? () => setStep("submit") :
    step === "submit"   ? handleSubmit :
    step === "captcha"  ? undefined :
    next;

  const footerLabel =
    step === "submit"  ? "CREATE ACCOUNT" :
    step === "avatar"  ? (pfpPreview ? "USE THIS PHOTO →" : "SKIP →") :
    "CONTINUE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== "submit") onClose(); }}>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-md relative"
        style={{
          background: "#0a0a18",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(212,160,23,0.04)",
        }}>

        {/* Header */}
        {step !== "success" && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
            <div>
              <p className="font-orbitron text-[9px] font-bold text-white/25 tracking-[0.2em] mb-0.5">REELBIT.CASINO</p>
              <h2 className="font-orbitron text-base font-black text-white">Create Account</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/25 hover:text-white/50 transition-all">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Progress dots */}
        {step !== "success" && (
          <div className="flex items-center justify-center gap-2 pt-4 px-6">
            {STEPS.map((s, i) => (
              <div key={s} className={cn(
                "transition-all rounded-full",
                i === stepIdx ? "w-6 h-1.5 bg-purple-500" :
                i < stepIdx  ? "w-1.5 h-1.5 bg-purple-800/60" :
                               "w-1.5 h-1.5 bg-white/8"
              )} />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-6">
          <AnimatePresence mode="wait">

            {/* DOB */}
            {step === "dob" && (
              <motion.div key="dob" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Age Verification</h3>
                  <p className="font-rajdhani text-white/40 text-sm">You must be 18 or older to play here.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-orbitron text-white/30 tracking-widest uppercase">Date of Birth</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Day",   value: dob.day,   key: "day"   as const, opts: Array.from({ length: 31 }, (_, i) => ({ v: String(i + 1), l: String(i + 1) })) },
                      { label: "Month", value: dob.month, key: "month" as const, opts: MONTHS.map((m, i) => ({ v: String(i + 1), l: m })) },
                      { label: "Year",  value: dob.year,  key: "year"  as const, opts: years.map((y) => ({ v: String(y), l: String(y) })) },
                    ].map(({ label, value, key, opts }) => (
                      <div key={key}>
                        <p className="text-[10px] font-rajdhani text-white/25 mb-1">{label}</p>
                        <select value={value} onChange={(e) => setDob((d) => ({ ...d, [key]: e.target.value }))} className="input-casino text-sm">
                          <option value="">--</option>
                          {opts.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  {dobError && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <AlertCircle size={12} className="text-red-400 shrink-0" />
                      <p className="text-xs font-rajdhani text-red-400">{dobError}</p>
                    </div>
                  )}
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[11px] font-rajdhani text-white/25 leading-relaxed">
                    By continuing you confirm you are 18+ and agree to our Terms of Service. Gambling carries risk — play responsibly.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Captcha */}
            {step === "captcha" && (
              <motion.div key="captcha" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Security Check</h3>
                  <p className="font-rajdhani text-white/40 text-sm">Complete the verification to continue.</p>
                </div>
                <div className="flex justify-center py-2">
                  <div ref={cfRef} />
                </div>
                {!cfToken && <p className="text-center text-xs font-rajdhani text-white/20">Loading widget…</p>}
              </motion.div>
            )}

            {/* Username */}
            {step === "username" && (
              <motion.div key="username" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Choose a Username</h3>
                  <p className="font-rajdhani text-white/40 text-sm">Pick any display name — your unique ID is assigned automatically.</p>
                </div>
                <div className="space-y-2">
                  <input value={username} onChange={(e) => { setUsername(e.target.value); setUsernameErr(null); }}
                    placeholder="e.g. LuckyPlayer, CryptoKing…" maxLength={32}
                    className={cn("input-casino text-sm", usernameErr && "border-red-500/40")}
                    onKeyDown={(e) => e.key === "Enter" && next()} />
                  {usernameErr && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-red-400 shrink-0" />
                      <p className="text-xs font-rajdhani text-red-400">{usernameErr}</p>
                    </div>
                  )}
                  {username.trim().length >= 3 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-2 bg-white/[0.02] rounded-xl px-3 py-2 border border-white/5">
                      <div className="w-7 h-7 rounded-full bg-purple-900/40 border border-purple-700/30 flex items-center justify-center text-xs font-orbitron font-black text-purple-300">
                        {username.trim()[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-rajdhani font-bold text-white text-sm leading-none">{username.trim()}</p>
                        <p className="font-mono text-[10px] text-white/25 mt-0.5">{wallet.slice(0, 8)}…</p>
                      </div>
                    </motion.div>
                  )}
                </div>
                <p className="text-[11px] font-rajdhani text-white/20">
                  Multiple players can share the same name. Your account ID is permanent and unique.
                </p>
              </motion.div>
            )}

            {/* Avatar */}
            {step === "avatar" && (
              <motion.div key="avatar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Profile Picture</h3>
                  <p className="font-rajdhani text-white/40 text-sm">Upload and crop your photo. You can change this anytime.</p>
                </div>
                <div className="flex justify-center">
                  <AvatarCropper onCrop={onCrop} size={256} />
                </div>
                {pfpPreview && <p className="text-center text-xs font-rajdhani text-green-400">✓ Avatar ready</p>}
              </motion.div>
            )}

            {/* Review + Submit */}
            {step === "submit" && (
              <motion.div key="submit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Confirm Registration</h3>
                  <p className="font-rajdhani text-white/40 text-sm">Review your details before we create your account.</p>
                </div>

                <div className="flex items-center gap-4 bg-white/[0.02] rounded-xl p-4 border border-white/5">
                  {pfpPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pfpPreview} alt="pfp" className="w-16 h-16 rounded-full object-cover ring-2 ring-purple-500/40" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-purple-900/30 border-2 border-purple-700/30 flex items-center justify-center text-2xl font-orbitron font-black text-purple-400">
                      {(username.trim()[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-rajdhani font-bold text-white text-lg leading-none">{username.trim()}</p>
                    <p className="font-mono text-xs text-white/30 mt-1 truncate max-w-[180px]">{wallet}</p>
                  </div>
                </div>

                {submitErr && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={13} className="text-red-400 shrink-0" />
                    <p className="text-xs font-rajdhani text-red-300">{submitErr}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Success */}
            {step === "success" && finalProfile && (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SuccessAnimation username={finalProfile.username} onDone={() => { onDone(finalProfile); onClose(); }} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== "success" && step !== "captcha" && footerBtn && (
          <div className="px-6 pb-6 flex gap-3">
            {stepIdx > 0 && (
              <button onClick={back} disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-white/8 text-white/30 hover:text-white/50 font-orbitron text-[11px] tracking-wide transition-all">
                BACK
              </button>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={footerBtn}
              disabled={submitting}
              className="btn-launch flex-1 flex items-center justify-center gap-2 py-3 text-[12px]">
              {submitting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>{footerLabel} {step !== "submit" && step !== "avatar" && <ChevronRight size={14} />}</>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
