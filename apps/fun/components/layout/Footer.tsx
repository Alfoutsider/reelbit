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
    <footer className="mt-auto border-t border-white/5 bg-[#06060a]/80 pt-10 pb-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="ReelBit" className="w-8 h-8 object-contain" />
              <span className="font-rajdhani text-[18px] font-bold leading-none">
                <span className="text-white">Reel</span>
                <span style={{ color: "var(--brand-red)" }}>Bit</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>.fun</span>
              </span>
            </div>
            <p className="text-white/30 text-xs font-rajdhani leading-relaxed max-w-[180px]">
              Pump.fun meets Vegas. Launch slot tokens on Solana.
            </p>
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

          {/* Platform */}
          <div>
            <p className="font-orbitron text-[9px] font-bold text-white/25 tracking-widest mb-3 uppercase">Platform</p>
            <ul className="space-y-2">
              {LINKS.platform.map(({ href, label, external }) => (
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
            <p className="font-orbitron text-[9px] font-bold text-white/25 tracking-widest mb-3 uppercase">Legal</p>
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

          {/* Risk warning */}
          <div>
            <p className="font-orbitron text-[9px] font-bold text-white/25 tracking-widest mb-3 uppercase">Risk Warning</p>
            <p className="text-white/25 text-[11px] font-rajdhani leading-relaxed">
              Token trading involves significant risk. Only trade with funds you can afford to lose.
              Tokens launched on this platform are speculative assets.
            </p>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-white/20 font-orbitron tracking-wide">
          <span>© {new Date().getFullYear()} ReelBit. All rights reserved.</span>
          <span>Built on Solana · Not available in restricted jurisdictions</span>
        </div>
      </div>
    </footer>
  );
}
