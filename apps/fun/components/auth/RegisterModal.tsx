"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, AlertCircle, Wallet, ExternalLink, Check, Copy } from "lucide-react";
import { useConnectWallet } from "@privy-io/react-auth";
import { AvatarCropper } from "./AvatarCropper";
import { SuccessAnimation } from "./SuccessAnimation";
import { cn } from "@/lib/utils";

const API      = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

type Step = "dob" | "captcha" | "username" | "wallet" | "avatar" | "success";
const STEPS: Step[] = ["dob", "captcha", "username", "wallet", "avatar"];

export interface UserProfile {
  userId:    string;
  wallet:    string;
  username:  string;
  pfpUrl:    string | null;
  pfpType:   "upload" | "nft" | null;
  nftMint:   string | null;
  createdAt: number;
}

interface Props {
  wallet:  string;
  onClose: () => void;
  onDone:  (profile: UserProfile) => void;
}

export function RegisterModal({ wallet, onClose, onDone }: Props) {
  const [step, setStep]           = useState<Step>("dob");
  const [dob,  setDob]            = useState("");
  const [dobError, setDobError]   = useState<string | null>(null);
  const [cfToken, setCfToken]     = useState<string | null>(null);
  const [username, setUsername]   = useState("");
  const [usernameErr, setUsernameErr] = useState<string | null>(null);

  // Wallet step
  const [walletMode, setWalletMode]               = useState<"privy" | "connect">("privy");
  const [connectedExtWallet, setConnectedExtWallet] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet]             = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState<string | null>(null);
  const [finalProfile, setFinalProfile] = useState<UserProfile | null>(null);

  const cfRef     = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  const effectiveWallet = walletMode === "connect" && connectedExtWallet ? connectedExtWallet : wallet;

  // ── Privy: connect external wallet ───────────────────────────────────────────

  const handleConnectSuccess = useCallback(({ wallet: w }: { wallet: { address: string } }) => {
    setConnectedExtWallet(w.address);
  }, []);

  const { connectWallet } = useConnectWallet({ onSuccess: handleConnectSuccess });

  // ── Turnstile ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (document.querySelector('script[src*="turnstile"]')) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  useEffect(() => {
    if (step !== "captcha") return;
    let retries = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ts = () => (window as any).turnstile;
    const tryMount = () => {
      if (ts() && cfRef.current) {
        widgetRef.current = ts().render(cfRef.current, {
          sitekey: SITE_KEY, theme: "dark",
          callback: (token: string) => { setCfToken(token); setTimeout(() => setStep("username"), 400); },
        });
      } else if (retries < 20) { retries++; setTimeout(tryMount, 250); }
    };
    tryMount();
    return () => {
      if (widgetRef.current && ts()) { ts().remove(widgetRef.current); widgetRef.current = null; }
    };
  }, [step]);

  // ── Validators ────────────────────────────────────────────────────────────────

  function validateDob() {
    if (!dob) { setDobError("Please enter your date of birth."); return false; }
    const birth = new Date(dob); const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    if (age < 18) { setDobError("You must be 18 or older to use ReelBit."); return false; }
    setDobError(null); return true;
  }

  function validateUsername() {
    const clean = username.trim();
    if (clean.length < 3)  { setUsernameErr("Minimum 3 characters."); return false; }
    if (clean.length > 32) { setUsernameErr("Maximum 32 characters."); return false; }
    setUsernameErr(null); return true;
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function next() {
    if (step === "dob")       { if (!validateDob()) return; setStep("captcha"); }
    else if (step === "username") { if (!validateUsername()) return; setStep("wallet"); }
    else if (step === "wallet") {
      if (walletMode === "connect" && !connectedExtWallet) {
        // prompt connection instead of advancing
        connectWallet();
        return;
      }
      setStep("avatar");
    }
  }

  function back() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(pfpB64: string | null, pfpExt: string) {
    if (!validateUsername()) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const regRes = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: effectiveWallet, username: username.trim().toUpperCase(), dob, cfToken }),
      });
      const regData = await regRes.json() as UserProfile & { error?: string };
      if (!regRes.ok) throw new Error(regData.error ?? "Registration failed");

      let profile: UserProfile = regData;

      if (pfpB64) {
        const pfpRes = await fetch(`${API}/profile/${effectiveWallet}/pfp/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: pfpB64, ext: pfpExt }),
        });
        const pfpData = await pfpRes.json() as UserProfile;
        if (pfpRes.ok && pfpData.userId) profile = pfpData;
      }

      if (typeof window !== "undefined") localStorage.setItem("rb_wallet", effectiveWallet);

      setFinalProfile(profile);
      setStep("success");
    } catch (e) {
      setSubmitErr((e as Error).message);
      setSubmitting(false);
    }
  }

  function onCrop(b64: string, ext: string) { handleSubmit(b64, ext); }
  function skipAvatar()                     { handleSubmit(null, "jpg"); }

  const stepIdx = STEPS.indexOf(step);
  const maxDob  = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  })();

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>

      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md relative"
        style={{ background: "var(--bg-surface)", border: "1px solid rgba(196,30,30,0.2)", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(196,30,30,0.06)" }}>

        {step !== "success" && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
            <div>
              <p className="font-orbitron text-[9px] font-bold text-white/30 tracking-[0.2em] mb-0.5">REELBIT.FUN</p>
              <h2 className="font-orbitron text-base font-black text-white">Create Account</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
              <X size={16} />
            </button>
          </div>
        )}

        {step !== "success" && (
          <div className="flex items-center justify-center gap-2 pt-4 px-6">
            {STEPS.map((s, i) => (
              <div key={s} className={cn(
                "transition-all rounded-full",
                i === stepIdx ? "w-6 h-1.5 bg-red-500" : i < stepIdx ? "w-1.5 h-1.5 bg-red-800/60" : "w-1.5 h-1.5 bg-white/10"
              )} />
            ))}
          </div>
        )}

        <div className="px-6 py-6">
          <AnimatePresence mode="wait">

            {/* ── DOB ─────────────────────────────────────────────────────── */}
            {step === "dob" && (
              <motion.div key="dob" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Age Verification</h3>
                  <p className="font-rajdhani text-white/40 text-sm">You must be 18 or older to use this platform.</p>
                </div>
                <div className="space-y-2">
                  <label className="section-label">Date of Birth</label>
                  <input type="date" value={dob} max={maxDob} min="1900-01-01"
                    onChange={(e) => { setDob(e.target.value); setDobError(null); }}
                    className="input-casino text-sm w-full" style={{ colorScheme: "dark" }} />
                  {dobError && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-red-400 shrink-0" />
                      <p className="text-xs font-rajdhani text-red-400">{dobError}</p>
                    </div>
                  )}
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[11px] font-rajdhani text-white/30 leading-relaxed">
                    By continuing you confirm you are 18+ and agree to our Terms of Service and Privacy Policy. Gambling involves risk — play responsibly.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── CAPTCHA ──────────────────────────────────────────────────── */}
            {step === "captcha" && (
              <motion.div key="captcha" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Security Check</h3>
                  <p className="font-rajdhani text-white/40 text-sm">Complete the verification to continue.</p>
                </div>
                <div className="flex justify-center py-2"><div ref={cfRef} /></div>
                {!cfToken && <p className="text-center text-xs font-rajdhani text-white/25">Loading verification widget…</p>}
              </motion.div>
            )}

            {/* ── USERNAME ─────────────────────────────────────────────────── */}
            {step === "username" && (
              <motion.div key="username" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Choose a Username</h3>
                  <p className="font-rajdhani text-white/40 text-sm">Pick any name — it&apos;s just for display. Your unique ID links your account.</p>
                </div>
                <div className="space-y-2">
                  <input value={username} onChange={(e) => { setUsername(e.target.value); setUsernameErr(null); }}
                    placeholder="e.g. CRYPTOKING, LUCKYMARIA…" maxLength={32}
                    className={cn("input-casino text-sm uppercase", usernameErr && "error")}
                    onKeyDown={(e) => e.key === "Enter" && next()} />
                  {usernameErr && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-red-400 shrink-0" />
                      <p className="text-xs font-rajdhani text-red-400">{usernameErr}</p>
                    </div>
                  )}
                  {username.trim().length >= 3 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
                      <div className="w-7 h-7 rounded-full bg-red-900/40 border border-red-700/30 flex items-center justify-center text-xs font-orbitron font-black text-red-400">
                        {username.trim()[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-orbitron font-bold text-white text-sm leading-none uppercase">{username.trim()}</p>
                        <p className="font-mono text-[10px] text-white/25 mt-0.5">{wallet.slice(0, 8)}…</p>
                      </div>
                    </motion.div>
                  )}
                </div>
                <p className="text-[11px] font-rajdhani text-white/25">
                  Multiple players can share the same display name. Your unique account ID is assigned automatically.
                </p>
              </motion.div>
            )}

            {/* ── WALLET ───────────────────────────────────────────────────── */}
            {step === "wallet" && (
              <motion.div key="wallet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Choose Your Wallet</h3>
                  <p className="font-rajdhani text-white/40 text-sm">Select the Solana wallet that will be linked to your account.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Generate wallet (Privy embedded) */}
                  <button type="button" onClick={() => setWalletMode("privy")}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-2xl p-4 border-2 transition-all",
                      walletMode === "privy"
                        ? "border-red-500/60 bg-red-500/[0.08]"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    )}>
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
                      walletMode === "privy" ? "bg-red-500/20" : "bg-white/5")}>
                      <Wallet size={18} className={walletMode === "privy" ? "text-red-400" : "text-white/30"} />
                    </div>
                    <div className="text-center">
                      <p className={cn("font-orbitron text-[11px] font-bold tracking-wide",
                        walletMode === "privy" ? "text-white" : "text-white/40")}>GENERATE</p>
                      <p className="font-rajdhani text-[11px] text-white/30 mt-0.5">Auto-created by ReelBit</p>
                    </div>
                    {walletMode === "privy" && (
                      <div className="w-full bg-black/30 rounded-lg px-2 py-1.5">
                        <p className="font-mono text-[9px] text-white/40 break-all text-center">{wallet.slice(0, 20)}…</p>
                      </div>
                    )}
                  </button>

                  {/* Connect existing wallet */}
                  <button type="button" onClick={() => { setWalletMode("connect"); if (!connectedExtWallet) connectWallet(); }}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-2xl p-4 border-2 transition-all",
                      walletMode === "connect"
                        ? "border-blue-500/60 bg-blue-500/[0.08]"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    )}>
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
                      walletMode === "connect" ? "bg-blue-500/20" : "bg-white/5")}>
                      <ExternalLink size={16} className={walletMode === "connect" ? "text-blue-400" : "text-white/30"} />
                    </div>
                    <div className="text-center">
                      <p className={cn("font-orbitron text-[11px] font-bold tracking-wide",
                        walletMode === "connect" ? "text-blue-300" : "text-white/40")}>CONNECT</p>
                      <p className="font-rajdhani text-[11px] text-white/30 mt-0.5">Phantom, Solflare…</p>
                    </div>
                    {walletMode === "connect" && connectedExtWallet && (
                      <div className="w-full bg-black/30 rounded-lg px-2 py-1.5">
                        <p className="font-mono text-[9px] text-white/40 break-all text-center">{connectedExtWallet.slice(0, 20)}…</p>
                      </div>
                    )}
                  </button>
                </div>

                {/* Generate wallet info */}
                {walletMode === "privy" && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-1.5">
                    <p className="font-orbitron text-[10px] font-bold text-white/50 tracking-wide">ABOUT YOUR GENERATED WALLET</p>
                    <p className="text-[11px] font-rajdhani text-white/30 leading-relaxed">
                      ReelBit creates a secure Solana wallet for you automatically. After registration you can export your private key from your profile settings to back it up or use it in Phantom.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <div className="font-mono text-[10px] text-white/40 truncate flex-1">{wallet.slice(0, 24)}…</div>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(wallet); setCopiedWallet(true); setTimeout(() => setCopiedWallet(false), 1800); }}
                        className="shrink-0 p-1 hover:bg-white/5 rounded transition-all">
                        {copiedWallet ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-white/25" />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Connected wallet info */}
                {walletMode === "connect" && connectedExtWallet && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/[0.06] border border-green-500/20 rounded-xl p-3 space-y-1">
                    <p className="font-orbitron text-[10px] font-bold text-green-400 tracking-wide">✓ WALLET CONNECTED</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[10px] text-white/50 truncate">{connectedExtWallet}</p>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(connectedExtWallet); setCopiedWallet(true); setTimeout(() => setCopiedWallet(false), 1800); }}
                        className="shrink-0 p-1 hover:bg-white/5 rounded transition-all">
                        {copiedWallet ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-white/25" />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {walletMode === "connect" && !connectedExtWallet && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <button type="button" onClick={() => connectWallet()}
                      className="btn-launch w-full py-2.5 font-orbitron text-[11px] tracking-wide flex items-center justify-center gap-2">
                      <ExternalLink size={13} /> CONNECT WALLET
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── AVATAR ───────────────────────────────────────────────────── */}
            {step === "avatar" && (
              <motion.div key="avatar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm mb-1">Profile Picture</h3>
                  <p className="font-rajdhani text-white/40 text-sm">Upload and crop a photo, then tap &ldquo;USE THIS&rdquo; to finish — or skip to use your initials.</p>
                </div>
                {submitting ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-10 h-10 rounded-full border-2 border-white/20 border-t-red-500" />
                    <p className="font-rajdhani text-white/40 text-sm">Creating your account…</p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <AvatarCropper onCrop={onCrop} size={256} />
                  </div>
                )}
                {submitErr && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <p className="text-xs font-rajdhani text-red-300 leading-relaxed">{submitErr}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SUCCESS ──────────────────────────────────────────────────── */}
            {step === "success" && finalProfile && (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SuccessAnimation username={finalProfile.username} onDone={() => { onDone(finalProfile); onClose(); }} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== "success" && step !== "captcha" && step !== "avatar" && (
          <div className="px-6 pb-6 flex gap-3">
            {stepIdx > 0 && (
              <button onClick={back} className="btn-ghost flex-1 py-3 font-orbitron text-[11px] tracking-wide">
                BACK
              </button>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={next}
              className="btn-launch flex-1 flex items-center justify-center gap-2 py-3 text-[12px]">
              {walletMode === "connect" && step === "wallet" && !connectedExtWallet
                ? <><ExternalLink size={13} /> CONNECT WALLET</>
                : <>CONTINUE <ChevronRight size={14} /></>
              }
            </motion.button>
          </div>
        )}

        {step === "avatar" && !submitting && (
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={back} className="btn-ghost flex-1 py-3 font-orbitron text-[11px] tracking-wide">BACK</button>
            <button onClick={skipAvatar}
              className="btn-ghost flex-1 py-3 font-orbitron text-[11px] tracking-wide text-white/35 hover:text-white/60">
              SKIP →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
