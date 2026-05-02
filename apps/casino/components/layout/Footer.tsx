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
    <footer className="mt-auto pt-10 pb-6 px-4" style={{ background: "var(--footer-bg)", borderTop: "1px solid var(--footer-bdr)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="ReelBit Casino" className="w-8 h-8 object-contain" />
              <span className="font-rajdhani text-[18px] font-bold leading-none">
                <span style={{ color: "var(--footer-l)" }}>Reel</span>
                <span className="gold-text">Bit</span>
                <span style={{ color: "var(--footer-t)" }}>.casino</span>
              </span>
            </div>
            <p className="text-xs font-rajdhani leading-relaxed max-w-[180px]" style={{ color: "var(--footer-t)" }}>
              Provably fair slots on Solana. Up to 98% RTP. Every spin verifiable on-chain.
            </p>
            <div className="flex items-center gap-1.5">
              <Shield size={10} className="text-green-400/60" />
              <span className="font-orbitron text-[9px] text-green-400/50 tracking-wider">PROVABLY FAIR</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LINKS.social.map(({ href, label }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-orbitron transition-all hover:opacity-80"
                  style={{ background: "var(--stat-bg)", border: "1px solid var(--bdr)", color: "var(--footer-l)" }}>
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Casino */}
          <div>
            <p className="font-orbitron text-[9px] font-bold tracking-widest mb-3 uppercase" style={{ color: "var(--footer-t)" }}>Casino</p>
            <ul className="space-y-2">
              {LINKS.casino.map(({ href, label, external }) => (
                <li key={href}>
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-rajdhani transition-colors flex items-center gap-1 hover:opacity-100"
                      style={{ color: "var(--footer-l)" }}>
                      {label} <ExternalLink size={9} className="opacity-50" />
                    </a>
                  ) : (
                    <Link href={href} className="text-sm font-rajdhani transition-colors hover:opacity-100"
                      style={{ color: "var(--footer-l)" }}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-orbitron text-[9px] font-bold tracking-widest mb-3 uppercase" style={{ color: "var(--footer-t)" }}>Legal & Safety</p>
            <ul className="space-y-2">
              {LINKS.legal.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm font-rajdhani transition-colors hover:opacity-100"
                    style={{ color: "var(--footer-l)" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Responsible gambling */}
          <div>
            <p className="font-orbitron text-[9px] font-bold tracking-widest mb-3 uppercase" style={{ color: "var(--footer-t)" }}>Responsible Play</p>
            <p className="text-[11px] font-rajdhani leading-relaxed mb-3" style={{ color: "var(--footer-t)" }}>
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
                    className="text-xs font-rajdhani transition-colors flex items-center gap-1 hover:opacity-100"
                    style={{ color: "var(--footer-l)" }}>
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
        <div className="pt-5 space-y-2 text-center" style={{ borderTop: "1px solid var(--footer-bdr)" }}>
          <p className="text-[10px] font-rajdhani leading-relaxed max-w-2xl mx-auto" style={{ color: "var(--footer-t)" }}>
            ReelBit Casino is a cryptocurrency-based gaming platform. Gambling involves risk and may be illegal in your jurisdiction.
            Users are solely responsible for compliance with local laws. Not available in the United States, United Kingdom, and other restricted territories.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-[10px] font-orbitron tracking-wide" style={{ color: "var(--footer-t)" }}>
            <span>© {new Date().getFullYear()} ReelBit. All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Responsible Gambling · Built on Solana
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
