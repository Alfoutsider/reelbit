"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy, useWallets } from "@/lib/privy";
import { Wallet, ExternalLink, Zap, User } from "lucide-react";
import { RegisterModal } from "@/components/auth/RegisterModal";
import { UserModal } from "@/components/auth/UserModal";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface UserProfile {
  userId:   string;
  wallet:   string;
  username: string;
  pfpUrl:   string | null;
  pfpType:  "upload" | "nft" | null;
  nftMint:  string | null;
  createdAt: number;
}

export function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const address = user?.wallet?.address ?? wallets[0]?.address;

  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showRegister, setShowRegister]   = useState(false);
  const [showUser, setShowUser]           = useState(false);

  // Fetch profile whenever wallet changes; auto-open register for new users
  useEffect(() => {
    if (!authenticated || !address) { setProfile(null); return; }
    setProfileLoading(true);
    fetch(`${API}/profile/${address}`)
      .then((r) => {
        if (r.status === 404) { setProfile(null); setShowRegister(true); return null; }
        return r.json();
      })
      .then((data) => { if (data?.userId) setProfile(data); })
      .catch(() => { setProfile(null); setShowRegister(true); })
      .finally(() => setProfileLoading(false));
  }, [authenticated, address]);

  async function handleLogout() {
    await logout();
    setProfile(null);
    setShowUser(false);
    setShowRegister(false);
  }

  function onRegistered() {
    if (!address) return;
    // Refetch full profile (to get userId etc)
    fetch(`${API}/profile/${address}`)
      .then((r) => r.json())
      .then((data) => { if (data?.userId) setProfile(data); });
  }

  const navLinks = [
    { href: "/",       label: "Explore" },
    { href: "/launch", label: "Launch" },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 nav-border bg-[#06060a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="ReelBit" className="w-10 h-10 object-contain" />
            <span className="font-rajdhani text-[20px] font-bold leading-none">
              <span className="text-white">Reel</span>
              <span style={{ color: "var(--brand-red)" }}>Bit</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>.fun</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-all font-rajdhani">
                {label}
              </Link>
            ))}
            <a href="https://reelbit-casino.vercel.app" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gold/70 hover:text-gold hover:bg-gold/5 transition-all font-rajdhani">
              <Zap size={13} className="text-gold" />
              Casino
              <ExternalLink size={10} className="opacity-50" />
            </a>
          </div>

          {/* Auth area */}
          <div className="flex items-center gap-2">
            {!ready || profileLoading ? (
              <div className="w-8 h-8 rounded-full border border-white/10 animate-pulse bg-white/5" />
            ) : authenticated && profile ? (
              /* ── Logged-in + registered: avatar button ── */
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowUser(true)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all"
                style={{ background: "rgba(196,30,30,0.08)", border: "1px solid rgba(196,30,30,0.22)" }}>
                <div className="w-7 h-7 rounded-full overflow-hidden border border-red-700/40 shrink-0"
                  style={{ background: "var(--bg-deep)" }}>
                  {profile.pfpUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.pfpUrl} alt="pfp" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-orbitron font-black text-xs text-red-400">
                      {profile.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-rajdhani font-bold text-sm text-white/80 max-w-[100px] truncate hidden sm:block">
                  {profile.username}
                </span>
                <User size={13} className="text-white/30 hidden sm:block" />
              </motion.button>
            ) : authenticated && !profile ? (
              /* ── Logged-in but not registered yet ── */
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowRegister(true)}
                className="btn-launch flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
                <Wallet size={14} />
                Complete Registration
              </motion.button>
            ) : (
              /* ── Not logged in ── */
              <div className="flex flex-col items-center gap-0.5">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={login} disabled={!ready}
                  className="btn-launch flex items-center gap-2 rounded-xl px-5 py-1.5 text-sm font-bold font-orbitron tracking-wide">
                  <Wallet size={14} />
                  Login
                </motion.button>
                <button onClick={login} disabled={!ready}
                  className="text-[9px] font-orbitron transition-colors"
                  style={{ color: "rgba(196,30,30,0.5)" }}>
                  Register
                </button>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showRegister && address && (
          <RegisterModal
            key="register"
            wallet={address}
            onClose={() => setShowRegister(false)}
            onDone={onRegistered}
          />
        )}
        {showUser && profile && (
          <UserModal
            key="user"
            profile={profile}
            onClose={() => setShowUser(false)}
            onUpdate={(p) => setProfile(p)}
            onLogout={() => { setShowUser(false); handleLogout(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
