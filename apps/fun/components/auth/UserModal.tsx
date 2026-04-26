"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Check, Copy, AlertCircle, RefreshCw } from "lucide-react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AvatarCropper } from "./AvatarCropper";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const RPC = process.env.NEXT_PUBLIC_RPC_URL  ?? "https://api.devnet.solana.com";

interface UserProfile {
  userId:   string;
  wallet:   string;
  username: string;
  pfpUrl:   string | null;
  pfpType:  "upload" | "nft" | null;
  nftMint:  string | null;
  createdAt: number;
}

interface Props {
  profile:  UserProfile;
  onClose:  () => void;
  onUpdate: (p: UserProfile) => void;
  onLogout: () => void;
}

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export function UserModal({ profile: initialProfile, onClose, onUpdate, onLogout }: Props) {
  const [profile, setProfile]       = useState(initialProfile);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [solPrice, setSolPrice]     = useState(150);
  const [refreshing, setRefreshing] = useState(false);

  // Profile edit
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName]         = useState(profile.username);
  const [nameErr, setNameErr]         = useState<string | null>(null);
  const [savingName, setSavingName]   = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [pfpSaving, setPfpSaving]     = useState(false);

  // Copy states
  const [copiedId, setCopiedId]       = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSolBalance();
    fetchSolPrice();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.wallet]);

  async function fetchSolBalance() {
    try {
      const conn = new Connection(RPC, "confirmed");
      const bal  = await conn.getBalance(new PublicKey(profile.wallet));
      setSolBalance(bal / LAMPORTS_PER_SOL);
    } catch { /* ignore */ }
  }

  async function fetchSolPrice() {
    try {
      const r = await fetch(`${API}/sol-price`);
      if (r.ok) { const d = await r.json(); setSolPrice(d.price ?? 150); }
    } catch { /* use default */ }
  }

  async function refresh() {
    setRefreshing(true);
    await Promise.all([fetchSolBalance(), fetchSolPrice()]);
    setRefreshing(false);
  }

  const usdValue = solBalance != null ? solBalance * solPrice : null;

  // ── Copy ──────────────────────────────────────────────────────────────────

  function copyId() {
    navigator.clipboard.writeText(`#${profile.userId}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  }

  function copyWallet() {
    navigator.clipboard.writeText(profile.wallet);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 1800);
  }

  // ── Username ──────────────────────────────────────────────────────────────

  async function saveName() {
    const clean = newName.trim();
    if (clean.length < 3)  { setNameErr("Min 3 characters."); return; }
    if (clean.length > 32) { setNameErr("Max 32 characters."); return; }
    setSavingName(true);
    setNameErr(null);
    try {
      const r = await fetch(`${API}/profile/${profile.wallet}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: clean }),
      });
      const data = await r.json() as UserProfile & { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Failed to save");
      setProfile(data);
      onUpdate(data);
      setEditingName(false);
    } catch (e) {
      setNameErr((e as Error).message);
    } finally { setSavingName(false); }
  }

  // ── PFP ───────────────────────────────────────────────────────────────────

  const onCrop = useCallback(async (b64: string, ext: string) => {
    setShowCropper(false);
    setPfpSaving(true);
    try {
      const r = await fetch(`${API}/profile/${profile.wallet}/pfp/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: b64, ext }),
      });
      const data = await r.json() as UserProfile;
      if (!r.ok) throw new Error("Upload failed");
      setProfile(data);
      onUpdate(data);
    } catch { /* silently fail */ }
    finally { setPfpSaving(false); }
  }, [profile.wallet, onUpdate]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <motion.div initial={{ scale: 0.93, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full max-w-md flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid rgba(196,30,30,0.18)", borderRadius: 20, boxShadow: "0 40px 100px rgba(0,0,0,0.85)", maxHeight: "90vh", overflow: "hidden" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-red-700/40"
                style={{ background: "var(--bg-deep)" }}>
                {profile.pfpUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.pfpUrl} alt="pfp" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-orbitron font-black text-lg text-red-400">
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              {pfpSaving && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                    className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}
            </div>
            <div>
              <p className="font-orbitron font-bold text-white text-sm leading-none uppercase">{profile.username}</p>
              <button onClick={copyId} className="flex items-center gap-1 mt-0.5 group">
                <span className="font-mono text-[11px] text-white/30 group-hover:text-white/50 transition-colors">#{profile.userId}</span>
                {copiedId ? <Check size={10} className="text-green-400" /> : <Copy size={9} className="text-white/20 group-hover:text-white/40" />}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Balance strip */}
        <div className="mx-5 mb-4 rounded-xl px-4 py-3 flex items-center justify-between shrink-0"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="section-label text-[9px]">BALANCE</p>
            <p className="font-orbitron text-xl font-black text-white mt-0.5">
              ◎ {solBalance != null ? solBalance.toFixed(4) : "—"}
            </p>
            {usdValue != null && (
              <p className="font-rajdhani text-xs text-white/35 mt-0.5">${usdValue.toFixed(2)}</p>
            )}
          </div>
          <button onClick={refresh} className="p-1.5 hover:bg-white/5 rounded-lg text-white/25 hover:text-white/50 transition-all">
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ repeat: refreshing ? Infinity : 0, duration: 0.9, ease: "linear" }}>
              <RefreshCw size={13} />
            </motion.div>
          </button>
        </div>

        {/* Profile content */}
        <div className="px-5 pb-5 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

              {/* PFP section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-red-700/30"
                    style={{ background: "var(--bg-deep)" }}>
                    {profile.pfpUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.pfpUrl} alt="pfp" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-orbitron font-black text-3xl text-red-400/60">
                        {profile.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setShowCropper((v) => !v)}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <Edit2 size={20} className="text-white" />
                  </button>
                </div>
                {showCropper && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <AvatarCropper onCrop={onCrop} size={256} />
                  </motion.div>
                )}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="section-label">Username</label>
                {editingName ? (
                  <div className="flex gap-2">
                    <input value={newName} onChange={(e) => { setNewName(e.target.value); setNameErr(null); }}
                      className={cn("input-casino text-sm flex-1", nameErr && "error")}
                      onKeyDown={(e) => e.key === "Enter" && saveName()}
                      maxLength={32} />
                    <button onClick={saveName} disabled={savingName}
                      className="btn-launch px-3 py-2 text-xs flex items-center gap-1">
                      {savingName ? "…" : <><Check size={13} /> SAVE</>}
                    </button>
                    <button onClick={() => { setEditingName(false); setNewName(profile.username); setNameErr(null); }}
                      className="btn-ghost px-3 py-2 text-xs">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white/[0.02] rounded-xl px-4 py-3 border border-white/5">
                    <span className="font-orbitron font-bold text-white text-sm uppercase">{profile.username}</span>
                    <button onClick={() => setEditingName(true)} className="text-white/30 hover:text-white/60 transition-colors">
                      <Edit2 size={13} />
                    </button>
                  </div>
                )}
                {nameErr && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={11} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-400 font-rajdhani">{nameErr}</p>
                  </div>
                )}
              </div>

              {/* Account info */}
              <div className="space-y-0">
                {/* User ID */}
                <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                  <span className="section-label text-[9px]">USER ID</span>
                  <button onClick={copyId} className="flex items-center gap-1.5 group">
                    <span className="font-mono text-xs text-white/50 group-hover:text-white/70 transition-colors">#{profile.userId}</span>
                    {copiedId ? <Check size={10} className="text-green-400" /> : <Copy size={9} className="text-white/20 group-hover:text-white/40" />}
                  </button>
                </div>

                {/* Wallet */}
                <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                  <span className="section-label text-[9px]">WALLET</span>
                  <button onClick={copyWallet} className="flex items-center gap-1.5 group">
                    <span className="font-mono text-xs text-white/50 group-hover:text-white/70 transition-colors">{shortenAddr(profile.wallet)}</span>
                    {copiedWallet ? <Check size={10} className="text-green-400" /> : <Copy size={9} className="text-white/20 group-hover:text-white/40" />}
                  </button>
                </div>

                {/* Member since */}
                <div className="flex items-center justify-between py-2.5">
                  <span className="section-label text-[9px]">MEMBER SINCE</span>
                  <span className="text-xs text-white/50">{new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Logout */}
              <button onClick={onLogout}
                className="w-full py-3 rounded-xl border border-white/8 text-white/30 hover:text-red-400 hover:border-red-500/30 font-orbitron text-[11px] tracking-wide transition-all">
                DISCONNECT WALLET
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
