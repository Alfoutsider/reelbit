"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Camera, Image, Loader2, User, Pencil, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchProfile,
  createProfile,
  updateUsername,
  uploadPfp,
  setNftPfp,
  type UserProfile,
} from "@/lib/profileClient";

type PfpTab = "upload" | "nft";

interface Props {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
  onProfileChange?: (profile: UserProfile) => void;
}

export function ProfileModal({ open, onClose, walletAddress, onProfileChange }: Props) {
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null);
  const [username, setUsername]     = useState("");
  const [isNew, setIsNew]           = useState(false);
  const [copiedId, setCopiedId]     = useState(false);
  const [pfpTab, setPfpTab]         = useState<PfpTab>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [nftMint, setNftMint]       = useState("");
  const [nftPreview, setNftPreview] = useState<string | null>(null);
  const [nftLoading, setNftLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const p = await fetchProfile(walletAddress);
      if (p) {
        setProfile(p);
        setUsername(p.username);
        setIsNew(false);
      } else {
        setIsNew(true);
        setUsername("");
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [walletAddress]);

  useEffect(() => {
    if (open) { setMsg(null); setPreviewUrl(null); setPendingFile(null); setNftPreview(null); setNftMint(""); load(); }
  }, [open, load]);

  function copyUserId() {
    if (!profile) return;
    navigator.clipboard.writeText(`#${profile.userId}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) { setMsg({ text: "Please select an image file.", ok: false }); return; }
    if (file.size > 4_000_000) { setMsg({ text: "Image must be under 4 MB.", ok: false }); return; }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMsg(null);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  async function previewNft() {
    if (!nftMint.trim()) return;
    setNftLoading(true); setMsg(null); setNftPreview(null);
    try {
      // Fetch via API proxy to avoid CORS
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/profile/${walletAddress}/pfp/nft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint: nftMint.trim(), previewOnly: true }),
      });
      const data = await res.json();
      if (res.ok) {
        // Server updated profile; grab pfpUrl
        applyProfile(data);
        setMsg({ text: "✅ NFT set as your profile picture.", ok: true });
      } else {
        setMsg({ text: data.error ?? "NFT not found.", ok: false });
      }
    } catch { setMsg({ text: "Failed to fetch NFT.", ok: false }); }
    finally { setNftLoading(false); }
  }

  function applyProfile(p: UserProfile) {
    setProfile(p);
    setUsername(p.username);
    setIsNew(false);
    onProfileChange?.(p);
  }

  async function handleSave() {
    if (!username.trim()) { setMsg({ text: "Username is required.", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      let p: UserProfile;

      if (isNew) {
        p = await createProfile(walletAddress, username.trim());
      } else {
        if (username.trim() !== profile?.username) {
          p = await updateUsername(walletAddress, username.trim());
        } else {
          p = profile!;
        }
      }

      // Upload pending pfp
      if (pendingFile) {
        p = await uploadPfp(walletAddress, pendingFile);
        setPendingFile(null);
        setPreviewUrl(null);
      }

      applyProfile(p);
      setMsg({ text: "✅ Profile saved!", ok: true });
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false });
    } finally { setSaving(false); }
  }

  const displayPfp = previewUrl ?? profile?.pfpUrl;
  const initials   = (profile?.username?.[0] ?? walletAddress?.[0] ?? "?").toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#0a0a18] border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <span className="font-orbitron text-sm font-bold text-white tracking-wider">PROFILE</span>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-white/30">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Message */}
                {msg && (
                  <div className={cn(
                    "rounded-xl px-4 py-3 text-sm",
                    msg.ok ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-red-500/10 border border-red-500/20 text-red-300",
                  )}>
                    {msg.text}
                  </div>
                )}

                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <div
                    className="relative w-24 h-24 rounded-full cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {displayPfp ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={displayPfp} alt="pfp" className="w-24 h-24 rounded-full object-cover ring-2 ring-purple-500/40" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-800/50 to-purple-600/30 border border-purple-500/30 flex items-center justify-center">
                        <span className="font-orbitron text-3xl font-black text-white/60">{initials}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                  </div>
                  <p className="text-white/30 text-[11px]">Click avatar to upload</p>
                </div>

                {/* User ID (permanent) */}
                {profile && (
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-orbitron text-white/25 tracking-widest">USER ID · PERMANENT</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Shield size={11} className="text-white/20" />
                        <span className="font-orbitron text-base font-bold text-white/60">#{profile.userId}</span>
                      </div>
                    </div>
                    <button onClick={copyUserId} className="text-white/25 hover:text-white/60 transition-colors">
                      {copiedId ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-[10px] font-orbitron text-white/40 tracking-widest flex items-center gap-1.5">
                    <Pencil size={10} /> USERNAME
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isNew ? "Choose your username…" : "Username"}
                    maxLength={20}
                    className="input-casino"
                  />
                  <p className="text-white/20 text-[10px]">3–20 chars. Letters, numbers, underscore.</p>
                </div>

                {/* PFP section */}
                <div className="space-y-3">
                  <p className="text-[10px] font-orbitron text-white/40 tracking-widest flex items-center gap-1.5">
                    <Image size={10} /> PROFILE PICTURE
                  </p>

                  {/* Tabs */}
                  <div className="flex rounded-xl overflow-hidden border border-white/5">
                    {([
                      { id: "upload" as PfpTab, label: "Upload" },
                      { id: "nft"    as PfpTab, label: "Use NFT" },
                    ]).map(({ id, label }) => (
                      <button key={id} onClick={() => setPfpTab(id)}
                        className={cn(
                          "flex-1 py-2 text-[11px] font-orbitron font-bold tracking-wider transition-all",
                          pfpTab === id ? "bg-purple-600/30 text-purple-300" : "text-white/25 hover:text-white/50",
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {pfpTab === "upload" && (
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                        isDragging ? "border-purple-400/60 bg-purple-500/10" : "border-white/10 hover:border-white/20",
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDrop}
                    >
                      <Camera size={24} className="mx-auto mb-2 text-white/20" />
                      <p className="text-white/30 text-xs">Drag & drop or click to browse</p>
                      <p className="text-white/15 text-[10px] mt-1">JPG, PNG, GIF, WebP · max 4 MB</p>
                      {pendingFile && (
                        <p className="mt-2 text-green-400/70 text-[11px]">✓ {pendingFile.name}</p>
                      )}
                    </div>
                  )}

                  {pfpTab === "nft" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          value={nftMint}
                          onChange={(e) => setNftMint(e.target.value)}
                          placeholder="NFT mint address…"
                          className="input-casino flex-1 text-xs font-mono"
                        />
                        <button
                          onClick={previewNft}
                          disabled={nftLoading || !nftMint.trim()}
                          className="btn-launch px-3 py-2 text-[11px] flex items-center gap-1 disabled:opacity-40"
                        >
                          {nftLoading ? <Loader2 size={12} className="animate-spin" /> : "Set"}
                        </button>
                      </div>
                      {nftPreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={nftPreview} alt="NFT preview" className="w-20 h-20 rounded-xl object-cover border border-white/10" />
                      )}
                      <p className="text-white/20 text-[10px]">Paste any Solana NFT mint address. Works on mainnet.</p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileInputChange}
                  />
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={saving || !username.trim()}
                  className="btn-launch w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                  {isNew ? "Create Profile" : "Save Changes"}
                </button>

                {isNew && (
                  <p className="text-white/20 text-[11px] text-center">
                    Your User ID will be generated once and can never be changed.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
