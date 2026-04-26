"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, AlertCircle, Wallet, Key, Copy, Check, AlertTriangle } from "lucide-react";
import { Keypair } from "@solana/web3.js";
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

// ── Private-key parser ────────────────────────────────────────────────────────

function base58Decode(s: string): Uint8Array {
  const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const map = new Uint8Array(256).fill(255);
  for (let i = 0; i < ALPHA.length; i++) map[ALPHA.charCodeAt(i)] = i;
  const out: number[] = [];
  for (const ch of s) {
    let carry = map[ch.charCodeAt(0)];
    if (carry === 255) throw new Error("Invalid base58 character");
    for (let j = 0; j < out.length; j++) {
      carry += out[j] * 58;
      out[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) { out.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of s) { if (ch === "1") out.push(0); else break; }
  return new Uint8Array(out.reverse());
}

function parsePrivateKey(raw: string): Keypair {
  const t = raw.trim();
  // JSON array format: [1,2,...,64]
  if (t.startsWith("[")) {
    let arr: number[];
    try { arr = JSON.parse(t) as number[]; } catch { throw new Error("Invalid JSON — expected [1,2,...,64]."); }
    if (!Array.isArray(arr) || arr.length !== 64) throw new Error("Expected a 64-element byte array.");
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }
  // Hex format: 128 chars
  if (/^[0-9a-fA-F]{128}$/.test(t)) {
    const b = new Uint8Array(64);
    for (let i = 0; i < 64; i++) b[i] = parseInt(t.slice(i * 2, i * 2 + 2), 16);
    return Keypair.fromSecretKey(b);
  }
  // Base58 (~88 chars)
  const b = base58Decode(t);
  if (b.length !== 64) throw new Error("Expected 64 bytes. Use JSON array, hex, or base58 format.");
  return Keypair.fromSecretKey(b);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegisterModal({ wallet, onClose, onDone }: Props) {
  const [step, setStep]           = useState<Step>("dob");
  const [dob,  setDob]            = useState("");
  const [dobError, setDobError]   = useState<string | null>(null);
  const [cfToken, setCfToken]     = useState<string | null>(null);
  const [username, setUsername]   = useState("");
  const [usernameErr, setUsernameErr] = useState<string | null>(null);

  // Wallet choice
  const [walletMode, setWalletMode]     = useState<"privy" | "import">("privy");
  const [importInput, setImportInput]   = useState("");
  const [importErr, setImportErr]       = useState<string | null>(null);
  const [importedAddr, setImportedAddr] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr]     = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState<string | null>(null);
  const [finalProfile, setFinalProfile] = useState<UserProfile | null>(null);

  const cfRef     = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  const effectiveWallet = walletMode === "import" && importedAddr ? importedAddr : wallet;

  // ── Turnstile ─────────────────────────────────────────────────────────────

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

  // ── Validators ────────────────────────────────────────────────────────────

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

  function verifyImportedKey() {
    setImportErr(null);
    if (!importInput.trim()) { setImportErr("Paste your private key above."); return; }
    try {
      const kp   = parsePrivateKey(importInput);
      const addr = kp.publicKey.toBase58();
      setImportedAddr(addr);
      // Stored only in sessionStorage — never sent to the server
      sessionStorage.setItem("rb_imported_keypair", JSON.stringify(Array.from(kp.secretKey)));
      sessionStorage.setItem("rb_imported_address", addr);
    } catch (e) {
      setImportErr((e as Error).message);
      setImportedAddr(null);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function next() {
    if (step === "dob")       { if (!validateDob()) return; setStep("captcha"); }
    else if (step === "username") { if (!validateUsername()) return; setStep("wallet"); }
    else if (step === "wallet") {
      if (walletMode === "import" && !importedAddr) { setImportErr("Verify your key first."); return; }
      setStep("avatar");
    }
  }

  function back() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(pfpB64: string | null, pfpExt: string) {
    if (!validateUsername()) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const regRes = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: effectiveWallet, username: username.trim(), dob, cfToken }),
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

      // Persist effective wallet so Navbar can look up the right profile on next load
      if (typeof window !== "undefined") localStorage.setItem("rb_wallet", effectiveWallet);

      setFinalProfile(profile);
      setStep("success");
    } catch (e) {
      setSubmitErr((e as Error).message);
      setSubmitting(false);
    }
  }

  // Called by AvatarCropper "USE THIS" — immediately submits with chosen avatar
  function onCrop(b64: string, ext: string) {
    handleSubmit(b64, ext);
  }

  function skipAvatar() {
    handleSubmit(null, "jpg");
  }

  const stepIdx = STEPS.indexOf(step);
  const maxDob  = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>

      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md relative"
        style={{ background: "var(--bg-surface)", border: "1px solid rgba(196,30,30,0.2)", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(196,30,30,0.06)" }}>

        {/* Header */}
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

        {/* Step dots */}
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
                    <div className="flex items-center gap-1.5 mt-1">
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
                    placeholder="e.g. CryptoKing, LuckyMaria…" maxLength={32}
                    className={cn("input-casino text-sm", usernameErr && "error")}
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
                        <p className="font-rajdhani font-bold text-white text-sm leading-none">{username.trim()}</p>
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
                  {/* Generated (Privy) wallet */}
                  <button type="button"
                    onClick={() => { setWalletMode("privy"); setImportedAddr(null); setImportErr(null); setImportInput(""); }}
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
                        walletMode === "privy" ? "text-white" : "text-white/40")}>GENERATED</p>
                      <p className="font-rajdhani text-[11px] text-white/30 mt-0.5">Auto-created by ReelBit</p>
                    </div>
                    {walletMode === "privy" && (
                      <div className="w-full bg-black/30 rounded-lg px-2 py-1.5">
                        <p className="font-mono text-[9px] text-white/40 break-all text-center">{wallet.slice(0, 20)}…</p>
                      </div>
                    )}
                  </button>

                  {/* Import wallet */}
                  <button type="button"
                    onClick={() => setWalletMode("import")}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-2xl p-4 border-2 transition-all",
                      walletMode === "import"
                        ? "border-amber-500/60 bg-amber-500/[0.08]"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    )}>
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
                      walletMode === "import" ? "bg-amber-500/20" : "bg-white/5")}>
                      <Key size={18} className={walletMode === "import" ? "text-amber-400" : "text-white/30"} />
                    </div>
                    <div className="text-center">
                      <p className={cn("font-orbitron text-[11px] font-bold tracking-wide",
                        walletMode === "import" ? "text-amber-300" : "text-white/40")}>IMPORT</p>
                      <p className="font-rajdhani text-[11px] text-white/30 mt-0.5">Bring your own wallet</p>
                    </div>
                  </button>
                </div>

                {/* Import section */}
                {walletMode === "import" && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className="flex items-start gap-2.5 bg-amber-500/[0.08] border border-amber-500/25 rounded-xl p-3">
                      <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-orbitron text-[10px] font-bold text-amber-400 tracking-wide mb-1">SECURITY WARNING</p>
                        <p className="text-[11px] font-rajdhani text-amber-300/70 leading-relaxed">
                          Your key is processed entirely in your browser — it is never sent to any server. Only import a wallet dedicated to this platform. Never reuse a key that holds significant funds.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="section-label">Private Key</label>
                      <textarea value={importInput}
                        onChange={(e) => { setImportInput(e.target.value); setImportErr(null); setImportedAddr(null); }}
                        placeholder={"Accepted formats:\n• JSON array: [1,2,...,64]\n• Base58 (~88 chars)\n• Hex (128 chars)"}
                        rows={3} spellCheck={false} autoComplete="off"
                        className="input-casino text-xs font-mono w-full resize-none"
                        style={{ lineHeight: 1.6 }} />
                    </div>

                    <button type="button" onClick={verifyImportedKey}
                      className="btn-launch w-full py-2.5 font-orbitron text-[11px] tracking-wide">
                      VERIFY KEY
                    </button>

                    {importErr && (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={12} className="text-red-400 shrink-0" />
                        <p className="text-xs font-rajdhani text-red-400">{importErr}</p>
                      </div>
                    )}

                    {importedAddr && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-green-500/[0.08] border border-green-500/25 rounded-xl p-3 space-y-1.5">
                        <p className="font-orbitron text-[10px] font-bold text-green-400 tracking-wide">✓ KEY VERIFIED</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-[10px] text-white/50 truncate">{importedAddr}</p>
                          <button type="button" onClick={() => {
                            navigator.clipboard.writeText(importedAddr);
                            setCopiedAddr(true);
                            setTimeout(() => setCopiedAddr(false), 1800);
                          }} className="shrink-0 p-1 hover:bg-white/5 rounded transition-all">
                            {copiedAddr ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-white/30" />}
                          </button>
                        </div>
                        <p className="text-[10px] font-rajdhani text-white/30">This address will be linked to your account.</p>
                      </motion.div>
                    )}
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

        {/* Footer — hidden during captcha, success, and avatar (avatar has its own) */}
        {step !== "success" && step !== "captcha" && step !== "avatar" && (
          <div className="px-6 pb-6 flex gap-3">
            {stepIdx > 0 && (
              <button onClick={back} className="btn-ghost flex-1 py-3 font-orbitron text-[11px] tracking-wide">
                BACK
              </button>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={next}
              className="btn-launch flex-1 flex items-center justify-center gap-2 py-3 text-[12px]">
              CONTINUE <ChevronRight size={14} />
            </motion.button>
          </div>
        )}

        {/* Avatar footer — back + skip */}
        {step === "avatar" && !submitting && (
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={back} className="btn-ghost flex-1 py-3 font-orbitron text-[11px] tracking-wide">
              BACK
            </button>
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
