"use client";

import Link from "next/link";
import { usePrivy } from "@/lib/privy";
import { motion } from "framer-motion";
import { Wallet, ExternalLink, Zap } from "lucide-react";
import { shortenAddress } from "@/lib/utils";


export function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const address = user?.wallet?.address;

  return (
    <nav className="sticky top-0 z-50 nav-border bg-[#06060a]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden border border-[rgba(196,30,30,0.25)] group-hover:border-[rgba(196,30,30,0.5)] transition-all">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.jpg" alt="ReelBit" className="w-full h-full object-cover" />
          </div>
          <span className="font-orbitron text-[15px] font-bold tracking-wider">
            <span style={{ color: "var(--brand-cream)" }}>Reel</span>
            <span className="red-text">Bit</span>
            <span style={{ color: "rgba(240,235,224,0.3)" }}>.fun</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {[{ href: "/", label: "Explore" }, { href: "/launch", label: "Launch" }].map(({ href, label }) => (
            <Link key={href} href={href}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-all font-rajdhani">
              {label}
            </Link>
          ))}
          <a href="https://reelbit.casino" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gold/70 hover:text-gold hover:bg-gold/5 transition-all font-rajdhani">
            <Zap size={13} className="text-gold" />
            Casino
            <ExternalLink size={10} className="opacity-50" />
          </a>
        </div>

        {authenticated && address ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={logout}
            disabled={!ready}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all font-orbitron tracking-wide"
            style={{ background: "rgba(196,30,30,0.1)", color: "var(--brand-red-light)", border: "1px solid rgba(196,30,30,0.3)" }}
          >
            <Wallet size={14} />
            {shortenAddress(address)}
          </motion.button>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={login}
              disabled={!ready}
              className="btn-launch flex items-center gap-2 rounded-xl px-5 py-1.5 text-sm font-bold font-orbitron tracking-wide"
            >
              <Wallet size={14} />
              Login
            </motion.button>
            <button
              onClick={login}
              disabled={!ready}
              className="text-[9px] font-orbitron transition-colors"
              style={{ color: "rgba(196,30,30,0.5)" }}
            >
              Register
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
