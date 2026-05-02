"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const LINKS = {
  platform: [
    { href: "/",         label: "Explore" },
    { href: "/launch",   label: "Launch" },
    { href: "/referral", label: "Referral" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "https://reelbit-casino.vercel.app", label: "Casino", external: true },
  ],
  legal: [
    { href: "/terms",   label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/cookies", label: "Cookie Policy" },
  ],
  social: [
    { href: "https://twitter.com/reelbitfun", label: "X / Twitter", icon: <XIcon /> },
    { href: "https://t.me/reelbit",           label: "Telegram",    icon: null },
    { href: "https://discord.gg/reelbit",     label: "Discord",     icon: null },
  ],
};

export function Footer() {
  return (
    <footer className="mt-auto pt-10 pb-6 px-4" style={{ background: "#040408", borderTop: "1px solid rgba(196,30,30,0.1)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="ReelBit" className="w-8 h-8 object-contain" />
              <span className="font-orbitron text-[14px] font-black leading-none">
                <span style={{ color: "rgba(240,235,224,0.52)" }}>Reel</span>
                <span style={{ color: "var(--brand-red)" }}>Bit</span>
                <span style={{ color: "rgba(240,235,224,0.3)" }}>.fun</span>
              </span>
            </div>
            <p className="text-xs font-rajdhani leading-relaxed max-w-[180px]" style={{ color: "rgba(240,235,224,0.3)" }}>
              Pump.fun meets Vegas. Launch slot tokens on Solana.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LINKS.social.map(({ href, label }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-orbitron transition-all hover:opacity-80"
                  style={{ background: "rgba(196,30,30,0.04)", border: "1px solid rgba(196,30,30,0.12)", color: "rgba(240,235,224,0.52)" }}>
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <p className="font-orbitron text-[9px] font-bold tracking-widest mb-3 uppercase" style={{ color: "rgba(240,235,224,0.3)" }}>Platform</p>
            <ul className="space-y-2">
              {LINKS.platform.map(({ href, label, external }) => (
                <li key={href}>
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-rajdhani transition-colors flex items-center gap-1 hover:opacity-100"
                      style={{ color: "rgba(240,235,224,0.52)" }}>
                      {label} <ExternalLink size={9} className="opacity-50" />
                    </a>
                  ) : (
                    <Link href={href} className="text-sm font-rajdhani transition-colors hover:opacity-100"
                      style={{ color: "rgba(240,235,224,0.52)" }}>
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-orbitron text-[9px] font-bold tracking-widest mb-3 uppercase" style={{ color: "rgba(240,235,224,0.3)" }}>Legal</p>
            <ul className="space-y-2">
              {LINKS.legal.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm font-rajdhani transition-colors hover:opacity-100"
                    style={{ color: "rgba(240,235,224,0.52)" }}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Risk warning */}
          <div>
            <p className="font-orbitron text-[9px] font-bold tracking-widest mb-3 uppercase" style={{ color: "rgba(240,235,224,0.3)" }}>Risk Warning</p>
            <p className="text-[11px] font-rajdhani leading-relaxed" style={{ color: "rgba(240,235,224,0.3)" }}>
              Token trading involves significant risk. Only trade with funds you can afford to lose.
              Tokens launched on this platform are speculative assets.
            </p>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-orbitron tracking-wide"
          style={{ borderTop: "1px solid rgba(196,30,30,0.1)", color: "rgba(240,235,224,0.3)" }}>
          <span>© {new Date().getFullYear()} ReelBit. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Provably Fair · Built on Solana
          </span>
        </div>
      </div>
    </footer>
  );
}
