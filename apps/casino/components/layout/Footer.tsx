"use client";

import Link from "next/link";
import { ExternalLink, Shield } from "lucide-react";

function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const LINKS = {
  casino: [
    { href: "/",           label: "Casino Lobby" },
    { href: "/calculator", label: "Calculator" },
    { href: "https://reelbit-fun.vercel.app/referral", label: "Referral Program", external: true },
    { href: "https://reelbit-fun.vercel.app",          label: "Launch a Slot",    external: true },
  ],
  legal: [
    { href: "/terms",                 label: "Terms of Service" },
    { href: "/privacy",               label: "Privacy Policy" },
    { href: "/cookies",               label: "Cookie Policy" },
    { href: "/responsible-gambling",  label: "Responsible Gambling" },
    { href: "/aml",                   label: "AML Policy" },
  ],
  social: [
    { href: "https://twitter.com/reelbitfun", label: "X / Twitter", icon: <XIcon /> },
    { href: "https://t.me/reelbit",           label: "Telegram",    icon: null },
    { href: "https://discord.gg/reelbit",     label: "Discord",     icon: null },
  ],
};

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 pt-10 pb-6 px-4" style={{ background: "rgba(6,6,15,0.8)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="ReelBit Casino" className="w-8 h-8 object-contain" />
              <span className="font-rajdhani text-[18px] font-bold leading-none">
                <span className="text-white">Reel</span>
                <span className="gold-text">Bit</span>
                <span style={{ color: "rgba(212,160,23,0.4)" }}>.casino</span>
              </span>
            </div>
            <p className="text-white/30 text-xs font-rajdhani leading-relaxed max-w-[180px]">
              Provably fair slots on Solana. Up to 98% RTP. Every spin verifiable on-chain.
            </p>
            <div className="flex items-center gap-1.5">
              <Shield size={10} className="text-green-400/60" />
              <span className="font-orbitron text-[9px] text-green-400/50 tracking-wider">PROVABLY FAIR</span>
            </div>
            <div className="flex gap-2">
              {LINKS.social.map(({ href, label, icon }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  title={label}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-all">
                  {icon ?? <ExternalLink size={11} />}
                </a>
              ))}
            </div>
          </div>

          {/* Casino */}
          <div>
            <p className="font-orbitron text-[9px] font-bold text-white/25 tracking-widest mb-3 uppercase">Casino</p>
            <ul className="space-y-2">
              {LINKS.casino.map(({ href, label, external }) => (
                <li key={href}>
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="text-white/40 hover:text-white text-sm font-rajdhani transition-colors flex items-center gap-1">
                      {label} <ExternalLink size={9} className="opacity-50" />
                    </a>
                  ) : (
                    <Link href={href} className="text-white/40 hover:text-white text-sm font-rajdhani transition-colors">
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-orbitron text-[9px] font-bold text-white/25 tracking-widest mb-3 uppercase">Legal & Safety</p>
            <ul className="space-y-2">
              {LINKS.legal.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-white/40 hover:text-white text-sm font-rajdhani transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Responsible gambling */}
          <div>
            <p className="font-orbitron text-[9px] font-bold text-white/25 tracking-widest mb-3 uppercase">Responsible Play</p>
            <p className="text-white/25 text-[11px] font-rajdhani leading-relaxed mb-3">
              Gambling can be addictive. Play responsibly. If you need help:
            </p>
            <ul className="space-y-1.5">
              {[
                { href: "https://www.begambleaware.org",  label: "BeGambleAware" },
                { href: "https://www.gamcare.org.uk",     label: "GamCare" },
                { href: "https://www.gamblingtherapy.org", label: "Gambling Therapy" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-white/30 hover:text-white text-xs font-rajdhani transition-colors flex items-center gap-1">
                    <ExternalLink size={9} className="opacity-50" /> {label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-orbitron font-bold" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)" }}>
              18+ ONLY
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-5 space-y-2 text-center">
          <p className="text-[10px] text-white/20 font-rajdhani leading-relaxed max-w-2xl mx-auto">
            ReelBit Casino is a cryptocurrency-based gaming platform. Gambling involves risk and may be illegal in your jurisdiction.
            Users are solely responsible for compliance with local laws. Not available in the United States, United Kingdom, and other restricted territories.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[10px] text-white/15 font-orbitron tracking-wide">
            <span>© {new Date().getFullYear()} ReelBit. All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <span>Provably Fair · Built on Solana</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
