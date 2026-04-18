"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wallet, LogOut, Zap } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { WalletModal } from "@/components/wallet/WalletModal";
import { fetchBalance } from "@/lib/balanceClient";
import { shortenAddress } from "@/lib/utils";

export function Navbar() {
  const { authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [walletOpen, setWalletOpen] = useState(false);
  const [balance, setBalance] = useState(0);

  const wallet = wallets[0];
  const walletAddress = wallet?.address ?? "";

  useEffect(() => {
    if (!walletAddress) return;
    fetchBalance(walletAddress).then(setBalance);
    const id = setInterval(() => fetchBalance(walletAddress).then(setBalance), 10_000);
    return () => clearInterval(id);
  }, [walletAddress]);

  const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(3);

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-30 bg-[#06060f]/80 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-orbitron text-base font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            reelbit.casino
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-green-400/60 text-xs font-orbitron">
              <Zap size={11} /> 96% RTP
            </div>

            {authenticated && walletAddress ? (
              <>
                {/* Balance chip */}
                <button
                  onClick={() => setWalletOpen(true)}
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-purple-500/30 rounded-xl px-3 py-1.5 transition-all"
                >
                  <Wallet size={13} className="text-purple-400" />
                  <span className="font-orbitron text-xs font-bold text-white">{solBalance}</span>
                  <span className="text-white/30 text-xs">SOL</span>
                </button>

                {/* Address */}
                <button
                  onClick={() => setWalletOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs font-mono transition-colors"
                >
                  {shortenAddress(walletAddress)}
                </button>

                {/* Logout */}
                <button
                  onClick={() => logout()}
                  className="text-white/20 hover:text-white/50 transition-colors"
                  title="Disconnect"
                >
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={login}
                className="btn-launch py-2 px-4 text-[11px]"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      <WalletModal
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        walletAddress={walletAddress}
        onBalanceChange={setBalance}
      />
    </>
  );
}
