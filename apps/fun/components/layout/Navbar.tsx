"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { Wallet, Zap } from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";

export function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const address = user?.wallet?.address;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <motion.span
            className="text-2xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            🎰
          </motion.span>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-white">reel</span>
            <span className="text-purple-400">bit</span>
            <span className="text-white/40">.fun</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          <Link href="/" className="hover:text-white transition-colors">Explore</Link>
          <Link href="/launch" className="hover:text-white transition-colors">Launch</Link>
          <a href="https://reelbit.casino" target="_blank" rel="noopener noreferrer"
             className="hover:text-white transition-colors flex items-center gap-1">
            Casino <Zap size={12} className="text-yellow-400" />
          </a>
        </div>

        {/* Wallet button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={authenticated ? logout : login}
          disabled={!ready}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
            authenticated
              ? "bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20"
              : "bg-purple-600 text-white hover:bg-purple-500"
          )}
        >
          <Wallet size={15} />
          {authenticated && address ? shortenAddress(address) : "Connect"}
        </motion.button>
      </div>
    </nav>
  );
}
