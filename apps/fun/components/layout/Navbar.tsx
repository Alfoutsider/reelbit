"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy, useWallets } from "@/lib/privy";
import { Wallet, ExternalLink, Zap, BarChart2, Gift, Sun, Moon, Menu, X } from "lucide-react";
import { RegisterModal } from "@/components/auth/RegisterModal";
import type { UserProfile } from "@/components/auth/RegisterModal";
import { UserModal } from "@/components/auth/UserModal";
import { useTheme } from "@/components/layout/ThemeProvider";
import { LanguageSelector } from "@/components/layout/LanguageSelector";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/5 transition-all"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}

export function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const privyAddress = user?.wallet?.address ?? wallets[0]?.address;
  // If user registered with an imported wallet, use that address for profile lookup
  const address = (typeof window !== "undefined" ? localStorage.getItem("rb_wallet") : null) ?? privyAddress;

  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showRegister, setShowRegister]   = useState(false);
  const [showUser, setShowUser]           = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);

  // One-shot: register referral cookie when wallet first connects
  useEffect(() => {
    if (!authenticated || !address) return;
    const match = document.cookie.match(/(?:^|;\s*)rb_ref=([^;]+)/);
    const code  = match?.[1];
    if (!code) return;
    fetch(`${API}/referral/register`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ referee: address, code, source: "launchpad" }),
    })
      .then(() => {
        // Clear cookie regardless — even if already_referred, we don't want to retry forever
        document.cookie = "rb_ref=; max-age=0; path=/";
      })
      .catch(() => {});
  }, [authenticated, address]);

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

  function onRegistered(p: UserProfile) {
    setProfile(p);
    setShowRegister(false);
  }

  const navLinks = [
    { href: "/",          label: "Explore" },
    { href: "/launch",    label: "Launch"  },
    { href: "/referral",  label: "Referral", icon: Gift },
  ];

  const allNavLinks = [
    ...navLinks,
    ...(authenticated ? [{ href: "/portfolio", label: "Portfolio", icon: BarChart2 }] : []),
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 nav-border bg-[#06060a]/90 backdrop-blur-xl relative">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="ReelBit" className="w-10 h-10 object-contain" />
            <span className="font-orbitron text-[15px] font-black leading-none">
              <span style={{ color: "var(--brand-cream)" }}>Reel</span>
              <span style={{ color: "var(--brand-red)" }}>Bit</span>
              <span style={{ color: "rgba(240,235,224,0.22)" }}>.fun</span>
            </span>
          </Link>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-1">
            {allNavLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-all font-rajdhani">
                {Icon && <Icon size={13} className="opacity-70" />}
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
          <div className="flex items-center gap-1">
            <LanguageSelector />
            <ThemeToggle />
            <div className="w-px h-5 bg-white/10 mx-1" />
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen((p) => !p)}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            {!ready || profileLoading ? (
              <div className="w-8 h-8 rounded-full border border-white/10 animate-pulse bg-white/5" />
            ) : authenticated && profile ? (
              /* ── Logged-in + registered: avatar button ── */
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowUser(true)}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all"
                style={{ background: "rgba(196,30,30,0.08)", border: "1px solid rgba(196,30,30,0.22)" }}>
                <div className="w-7 h-7 rounded-full overflow-hidden border border-red-700/40 shrink-0"
                  style={{ background: "var(--bg-deep)" }}>
                  {profile.pfpUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.pfpUrl} alt="pfp" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-orbitron font-black text-2xl text-red-400">
                      {profile.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-orbitron font-bold text-sm text-white/80 max-w-[100px] truncate hidden sm:block uppercase">
                  {profile.username}
                </span>
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

        {/* Mobile nav menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="md:hidden absolute left-0 right-0 bg-[#06060a]/97 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex flex-col gap-1 z-50"
            >
              {allNavLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-all font-rajdhani">
                  {Icon && <Icon size={13} className="opacity-70" />}
                  {label}
                </Link>
              ))}
              <a href="https://reelbit-casino.vercel.app" target="_blank" rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-gold/70 hover:text-gold hover:bg-gold/5 transition-all font-rajdhani">
                <Zap size={13} className="text-gold" />
                Casino
                <ExternalLink size={10} className="opacity-50" />
              </a>
              {authenticated && profile && (
                <button onClick={() => { setMobileOpen(false); setShowUser(true); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-all font-rajdhani text-left">
                  <span className="font-orbitron uppercase">{profile.username}</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
