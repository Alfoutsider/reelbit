"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Edit2, Check, Wallet, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft,
  Copy, AlertCircle, RefreshCw, User,
} from "lucide-react";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { useWallets } from "@/lib/privy";
import { SwipeToConfirm } from "@/components/wallet/SwipeToConfirm";
import { AvatarCropper } from "./AvatarCropper";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const RPC = process.env.NEXT_PUBLIC_RPC_URL  ?? "https://api.devnet.solana.com";

type Tab = "profile" | "deposit" | "withdraw" | "transfer";

interface UserProfile {
  userId:   string;
  wallet:   string;
  username: string;
  pfpUrl:   string | null;
  pfpType:  "upload" | "nft" | null;
  nftMint:  string | null;
  createdAt: number;
}

interface Balance {
  playable:           number;
  bonus:              number;
  wageringRequired:   number;
  wageringCompleted:  number;
  welcomeBonusClaimed: boolean;
}

interface Props {
  profile:  UserProfile;
  onClose:  () => void;
  onUpdate: (p: UserProfile) => void;
  onLogout: () => void;
}

const PRESETS = [10, 30, 50, 100] as const;
const USDC    = 1_000_000; // micro-units per USDC

function fmt(usdcUnits: number) {
  return (usdcUnits / USDC).toFixed(2);
}

function shortenAddr(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

// ── Amount picker ─────────────────────────────────────────────────────────────

interface AmountPickerProps {
  value: number | null;
  onChange: (v: number | null) => void;
  max?: number;
}

function AmountPicker({ value, onChange, max }: AmountPickerProps) {
  const [custom, setCustom] = useState("");
  const [mode, setMode]     = useState<"preset" | "custom">("preset");

  function pick(n: number) {
    setMode("preset");
    if (max !== undefined && n > max) return;
    onChange(n);
  }

  function onCustomChange(v: string) {
    setCustom(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0) {
      if (max !== undefined && n > max) { onChange(null); return; }
      onChange(n);
    } else onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => {
          const disabled = max !== undefined && p > max;
          return (
            <button key={p} type="button"
              onClick={() => pick(p)}
              disabled={disabled}
              className={cn(
                "py-2.5 rounded-xl font-orbitron text-[11px] font-bold tracking-wide transition-all border",
                disabled ? "opacity-30 cursor-not-allowed border-white/5 text-white/20" :
                value === p && mode === "preset"
                  ? "border-red-500/60 bg-red-500/10 text-white"
                  : "border-white/8 bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/70"
              )}>
              ${p}
            </button>
          );
        })}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-rajdhani font-bold text-white/30 text-sm">$</span>
        <input value={custom}
          onChange={(e) => { setMode("custom"); onCustomChange(e.target.value); }}
          onFocus={() => setMode("custom")}
          placeholder="Custom amount"
          type="number" min="1" step="0.01"
          className={cn("input-casino pl-6 text-sm", mode === "custom" && value ? "border-red-500/40" : "")} />
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function UserModal({ profile: initialProfile, onClose, onUpdate, onLogout }: Props) {
  const { wallets } = useWallets();
  const [tab, setTab]           = useState<Tab>("profile");
  const [profile, setProfile]   = useState(initialProfile);
  const [balance, setBalance]   = useState<Balance | null>(null);
  const [solPrice, setSolPrice] = useState<number>(150);
  const [houseWallet, setHouseWallet] = useState<string>("");

  // Profile edit
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName]         = useState(profile.username);
  const [nameErr, setNameErr]         = useState<string | null>(null);
  const [savingName, setSavingName]   = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [pfpSaving, setPfpSaving]     = useState(false);

  // Deposit
  const [depositAmt, setDepositAmt] = useState<number | null>(null);
  const [depositErr, setDepositErr] = useState<string | null>(null);

  // Withdraw
  const [withdrawAmt, setWithdrawAmt]   = useState<number | null>(null);
  const [withdrawDest, setWithdrawDest] = useState<"self" | "other">("self");
  const [customAddr, setCustomAddr]     = useState("");
  const [withdrawErr, setWithdrawErr]   = useState<string | null>(null);

  // Transfer
  const [transferAmt, setTransferAmt] = useState<number | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [transferErr, setTransferErr] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBalance();
    fetchMeta();
  }, [profile.wallet]);

  async function fetchBalance() {
    try {
      const r = await fetch(`${API}/balance/${profile.wallet}`);
      if (r.ok) setBalance(await r.json());
    } catch { /* ignore */ }
  }

  async function fetchMeta() {
    try {
      const [priceRes, hwRes] = await Promise.all([
        fetch(`${API}/sol-price`),
        fetch(`${API}/house-wallet`),
      ]);
      if (priceRes.ok) { const d = await priceRes.json(); setSolPrice(d.price ?? 150); }
      if (hwRes.ok)    { const d = await hwRes.json(); setHouseWallet(d.address); }
    } catch { /* use defaults */ }
  }

  const playable = balance ? balance.playable / USDC : 0;
  const bonus    = balance ? balance.bonus    / USDC : 0;

  // ── Copy userId ───────────────────────────────────────────────────────────

  function copyId() {
    navigator.clipboard.writeText(`#${profile.userId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // ── Update username ───────────────────────────────────────────────────────

  async function saveName() {
    const clean = newName.trim();
    if (clean.length < 3)  { setNameErr("Min 3 characters."); return; }
    if (clean.length > 32) { setNameErr("Max 32 characters."); return; }
    setSavingName(true);
    setNameErr(null);
    try {
      const r = await fetch(`${API}/profile/${profile.wallet}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: clean }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to save");
      setProfile(data);
      onUpdate(data);
      setEditingName(false);
    } catch (e) {
      setNameErr((e as Error).message);
    } finally { setSavingName(false); }
  }

  // ── Upload PFP ────────────────────────────────────────────────────────────

  const onCrop = useCallback(async (b64: string, ext: string) => {
    setShowCropper(false);
    setPfpSaving(true);
    try {
      const r = await fetch(`${API}/profile/${profile.wallet}/pfp/upload`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ base64: b64, ext }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Upload failed");
      setProfile(data);
      onUpdate(data);
    } catch { /* silently fail */ }
    finally { setPfpSaving(false); }
  }, [profile.wallet, onUpdate]);

  // ── Deposit ───────────────────────────────────────────────────────────────

  async function doDeposit() {
    if (!depositAmt || depositAmt <= 0) throw new Error("Enter a valid amount");
    if (!wallets[0]) throw new Error("Wallet not connected");
    if (!houseWallet) throw new Error("House wallet unavailable");

    const connection = new Connection(RPC, "confirmed");
    const wallet = wallets[0] as unknown as AnchorWallet;
    const lamports = Math.round((depositAmt / solPrice) * LAMPORTS_PER_SOL);

    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    tx.add(SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey:   new PublicKey(houseWallet),
      lamports,
    }));

    const signed = await wallet.signTransaction(tx);
    const sig    = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    const r = await fetch(`${API}/deposit/confirm`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ txSignature: sig, wallet: profile.wallet }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Deposit confirmation failed");

    await fetchBalance();
    setDepositAmt(null);
    setDepositErr(null);
  }

  // ── Withdraw ──────────────────────────────────────────────────────────────

  async function doWithdraw() {
    if (!withdrawAmt || withdrawAmt <= 0) throw new Error("Enter a valid amount");
    const usdcUnits = Math.round(withdrawAmt * USDC);
    if (balance && usdcUnits > balance.playable) throw new Error("Insufficient balance");

    const destination = withdrawDest === "other" ? customAddr.trim() : undefined;
    if (withdrawDest === "other" && !destination) throw new Error("Enter a destination address");
    if (destination) {
      try { new PublicKey(destination); }
      catch { throw new Error("Invalid Solana address"); }
    }

    const r = await fetch(`${API}/withdraw`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ wallet: profile.wallet, usdcUnits, destination }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Withdrawal failed");

    await fetchBalance();
    setWithdrawAmt(null);
    setWithdrawErr(null);
  }

  // ── Transfer ──────────────────────────────────────────────────────────────

  async function doTransfer() {
    if (!transferAmt || transferAmt <= 0) throw new Error("Enter a valid amount");
    const usdcUnits = Math.round(transferAmt * USDC);
    if (balance && usdcUnits > balance.playable) throw new Error("Insufficient balance");
    const toId = recipientId.trim().replace(/^#/, "");
    if (!toId) throw new Error("Enter a recipient ID");

    const r = await fetch(`${API}/transfer`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ from: profile.wallet, toUserId: toId, usdcUnits }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? "Transfer failed");

    await fetchBalance();
    setTransferAmt(null);
    setRecipientId("");
    setTransferErr(null);
  }

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "profile",  icon: <User size={14} />,             label: "Profile" },
    { id: "deposit",  icon: <ArrowDownCircle size={14} />,  label: "Deposit" },
    { id: "withdraw", icon: <ArrowUpCircle size={14} />,    label: "Withdraw" },
    { id: "transfer", icon: <ArrowRightLeft size={14} />,   label: "Transfer" },
  ];

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
            {/* Avatar */}
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
              <p className="font-rajdhani font-bold text-white text-base leading-none">{profile.username}</p>
              <button onClick={copyId} className="flex items-center gap-1 mt-0.5 group">
                <span className="font-mono text-[11px] text-white/30 group-hover:text-white/50 transition-colors">#{profile.userId}</span>
                {copied ? <Check size={10} className="text-green-400" /> : <Copy size={9} className="text-white/20 group-hover:text-white/40" />}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Balance strip */}
        <div className="mx-5 mb-3 rounded-xl px-4 py-3 flex items-center justify-between shrink-0"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="section-label text-[9px]">PLAYABLE BALANCE</p>
            <p className="font-orbitron text-xl font-black text-white mt-0.5">${playable.toFixed(2)}</p>
          </div>
          {bonus > 0 && (
            <div className="text-right">
              <p className="section-label text-[9px]">BONUS</p>
              <p className="font-orbitron text-base font-bold text-yellow-400 mt-0.5">+${bonus.toFixed(2)}</p>
            </div>
          )}
          <button onClick={fetchBalance} className="p-1.5 hover:bg-white/5 rounded-lg text-white/25 hover:text-white/50 transition-all">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 gap-1 shrink-0 mb-4">
          {TABS.map(({ id, icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-orbitron text-[10px] font-bold tracking-wide transition-all",
                tab === id
                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                  : "text-white/30 hover:text-white/50 border border-transparent hover:border-white/8"
              )}>
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-5 pb-5 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">

            {/* ── PROFILE TAB ──────────────────────────────────────────── */}
            {tab === "profile" && (
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
                      <span className="font-rajdhani font-bold text-white text-sm">{profile.username}</span>
                      <button onClick={() => setEditingName(true)} className="text-white/30 hover:text-white/60 transition-colors">
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}
                  {nameErr && <p className="text-xs text-red-400 font-rajdhani">{nameErr}</p>}
                </div>

                {/* Account info */}
                <div className="space-y-2">
                  {[
                    { label: "USER ID", value: `#${profile.userId}`, mono: true },
                    { label: "WALLET", value: shortenAddr(profile.wallet), mono: true },
                    { label: "MEMBER SINCE", value: new Date(profile.createdAt).toLocaleDateString(), mono: false },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <span className="section-label text-[9px]">{label}</span>
                      <span className={cn("text-xs text-white/50", mono && "font-mono")}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Logout */}
                <button onClick={onLogout}
                  className="w-full py-3 rounded-xl border border-white/8 text-white/30 hover:text-red-400 hover:border-red-500/30 font-orbitron text-[11px] tracking-wide transition-all">
                  DISCONNECT WALLET
                </button>
              </motion.div>
            )}

            {/* ── DEPOSIT TAB ──────────────────────────────────────────── */}
            {tab === "deposit" && (
              <motion.div key="deposit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm">Deposit Funds</h3>
                  <p className="font-rajdhani text-white/35 text-xs mt-0.5">Send SOL — credited as USDC after swap. You pay gas fees.</p>
                </div>

                <AmountPicker value={depositAmt} onChange={setDepositAmt} />

                {depositAmt && depositAmt > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white/[0.02] rounded-xl p-3 border border-white/5 space-y-1.5 text-xs font-rajdhani">
                    <div className="flex justify-between text-white/50">
                      <span>You send</span>
                      <span className="font-mono">{(depositAmt / solPrice).toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between text-white/50">
                      <span>Platform fee (0.3%)</span>
                      <span className="font-mono">-${(depositAmt * 0.003).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1.5">
                      <span>You receive</span>
                      <span className="text-green-400 font-mono">${(depositAmt * 0.997).toFixed(2)} USDC</span>
                    </div>
                  </motion.div>
                )}

                {depositErr && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={13} className="text-red-400 shrink-0" />
                    <p className="text-xs font-rajdhani text-red-300">{depositErr}</p>
                  </div>
                )}

                <SwipeToConfirm
                  label="SWIPE TO DEPOSIT"
                  disabled={!depositAmt || depositAmt <= 0}
                  variant="purple"
                  onConfirm={doDeposit}
                  onError={(e) => setDepositErr(e.message)}
                />
                <p className="text-center text-[10px] font-rajdhani text-white/20">SOL price: ${solPrice.toFixed(2)}</p>
              </motion.div>
            )}

            {/* ── WITHDRAW TAB ─────────────────────────────────────────── */}
            {tab === "withdraw" && (
              <motion.div key="withdraw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm">Withdraw Funds</h3>
                  <p className="font-rajdhani text-white/35 text-xs mt-0.5">Withdraw USDC as SOL. $0.10 flat fee.</p>
                </div>

                <AmountPicker value={withdrawAmt} onChange={setWithdrawAmt} max={playable} />

                {/* Destination */}
                <div className="space-y-2">
                  <label className="section-label">Destination</label>
                  <div className="flex gap-2">
                    {(["self", "other"] as const).map((d) => (
                      <button key={d} type="button" onClick={() => setWithdrawDest(d)}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl font-orbitron text-[10px] font-bold tracking-wide border transition-all",
                          withdrawDest === d
                            ? "border-red-500/50 bg-red-500/10 text-white"
                            : "border-white/8 bg-white/[0.02] text-white/40 hover:text-white/60"
                        )}>
                        {d === "self" ? "MY WALLET" : "OTHER ADDRESS"}
                      </button>
                    ))}
                  </div>
                  {withdrawDest === "other" && (
                    <input value={customAddr} onChange={(e) => setCustomAddr(e.target.value)}
                      placeholder="Solana address (base58)…"
                      className="input-casino text-xs font-mono" />
                  )}
                </div>

                {withdrawAmt && withdrawAmt > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white/[0.02] rounded-xl p-3 border border-white/5 text-xs font-rajdhani space-y-1.5">
                    <div className="flex justify-between text-white/50">
                      <span>Flat fee</span><span>-$0.10</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1.5">
                      <span>You receive</span>
                      <span className="text-green-400 font-mono">~{((withdrawAmt - 0.1) / solPrice).toFixed(4)} SOL</span>
                    </div>
                  </motion.div>
                )}

                {withdrawErr && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={13} className="text-red-400 shrink-0" />
                    <p className="text-xs font-rajdhani text-red-300">{withdrawErr}</p>
                  </div>
                )}

                <SwipeToConfirm
                  label="SWIPE TO WITHDRAW"
                  disabled={!withdrawAmt || withdrawAmt <= 0 || withdrawAmt > playable}
                  variant="gold"
                  onConfirm={doWithdraw}
                  onError={(e) => setWithdrawErr(e.message)}
                />
              </motion.div>
            )}

            {/* ── TRANSFER TAB ─────────────────────────────────────────── */}
            {tab === "transfer" && (
              <motion.div key="transfer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h3 className="font-orbitron font-bold text-white text-sm">Transfer to Player</h3>
                  <p className="font-rajdhani text-white/35 text-xs mt-0.5">Instant off-chain. 1% platform fee on transfers.</p>
                </div>

                <AmountPicker value={transferAmt} onChange={setTransferAmt} max={playable} />

                <div className="space-y-1.5">
                  <label className="section-label">Recipient User ID</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-white/30 text-sm">#</span>
                    <input value={recipientId.replace(/^#/, "")}
                      onChange={(e) => setRecipientId(e.target.value)}
                      placeholder="8-char player ID (e.g. AB3C7F2D)"
                      className="input-casino pl-7 text-sm font-mono uppercase tracking-widest" />
                  </div>
                  <p className="text-[10px] font-rajdhani text-white/25">Find a player's ID in their profile.</p>
                </div>

                {transferAmt && transferAmt > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-white/[0.02] rounded-xl p-3 border border-white/5 text-xs font-rajdhani space-y-1.5">
                    <div className="flex justify-between text-white/50">
                      <span>Platform fee (1%)</span>
                      <span>-${(transferAmt * 0.01).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1.5">
                      <span>Recipient gets</span>
                      <span className="text-green-400 font-mono">${(transferAmt * 0.99).toFixed(2)}</span>
                    </div>
                  </motion.div>
                )}

                {transferErr && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={13} className="text-red-400 shrink-0" />
                    <p className="text-xs font-rajdhani text-red-300">{transferErr}</p>
                  </div>
                )}

                <SwipeToConfirm
                  label="SWIPE TO TRANSFER"
                  disabled={!transferAmt || transferAmt <= 0 || !recipientId.trim() || transferAmt > playable}
                  variant="cyan"
                  onConfirm={doTransfer}
                  onError={(e) => setTransferErr(e.message)}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
