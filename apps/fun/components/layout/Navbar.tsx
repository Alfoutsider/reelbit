"use client";

import Link from "next/link";
import { usePrivy } from "@/lib/privy";
import { motion } from "framer-motion";
import { Wallet, ExternalLink, Zap } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 3 L30 10 L17 17 L4 10 Z" fill="#f0ebe0"/>
      <path d="M4 10 L17 17 L17 31 L4 24 Z" fill="#d8d3c8"/>
      <path d="M17 17 L30 10 L30 24 L17 31 Z" fill="#ccc8bc"/>
      <line x1="17" y1="3" x2="17" y2="5.5" stroke="#c41e1e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="25.5" y1="5.5" x2="24" y2="7.3" stroke="#c41e1e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="30" y1="10" x2="27.5" y2="10" stroke="#c41e1e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="25.5" y1="14.5" x2="24" y2="12.7" stroke="#c41e1e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8.5" y1="5.5" x2="10" y2="7.3" stroke="#c41e1e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="6.5" y2="10" stroke="#c41e1e" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8.5" y1="14.5" x2="10" y2="12.7" stroke="#c41e1e" strokeWidth="1.5" strokeLinecap="round"/>
      <text x="6.5" y="26" fontFamily="Georgia, serif" fontWeight="bold" fontSize="8" fill="#1a1a1a">R</text>
      <text x="20" y="26" fontFamily="Georgia, serif" fontWeight="bold" fontSize="8" fill="#c41e1e">B</text>
    </svg>
  );
}

export function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const address = user?.wallet?.address;

  return (
    <nav className="sticky top-0 z-50 nav-border bg-[#06060a]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-[rgba(196,30,30,0.25)] bg-[rgba(196,30,30,0.05)] group-hover:border-[rgba(196,30,30,0.5)] transition-all">
            <LogoMark size={28} />
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
