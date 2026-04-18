"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wallet, LogOut, Zap, User } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { WalletModal } from "@/components/wallet/WalletModal";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { fetchBalance } from "@/lib/balanceClient";
import { fetchProfile, type UserProfile } from "@/lib/profileClient";
import { shortenAddress } from "@/lib/utils";

export function Navbar() {
  const { authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [walletOpen,  setWalletOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [balance,     setBalance]     = useState(0);
  const [profile,     setProfile]     = useState<UserProfile | null>(null);

  const wallet        = wallets[0];
  const walletAddress = wallet?.address ?? "";

  // Poll balance every 10s
  useEffect(() => {
    if (!walletAddress) return;
    fetchBalance(walletAddress).then(setBalance);
    const id = setInterval(() => fetchBalance(walletAddress).then(setBalance), 10_000);
    return () => clearInterval(id);
  }, [walletAddress]);

  // Load profile once wallet connects
  useEffect(() => {
    if (!walletAddress) { setProfile(null); return; }
    fetchProfile(walletAddress).then(setProfile).catch(() => {});
  }, [walletAddress]);

  const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(3);

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-30 bg-[#06060f]/85 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="font-orbitron text-base font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            reelbit.casino
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-green-400/50 text-[10px] font-orbitron tracking-wider">
              <Zap size={10} /> 96% RTP
            </div>

            {authenticated && walletAddress ? (
              <>
                {/* Balance */}
                <button
                  onClick={() => setWalletOpen(true)}
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-purple-500/30 rounded-xl px-3 py-1.5 transition-all"
                >
                  <Wallet size={12} className="text-purple-400" />
                  <span className="font-orbitron text-[11px] font-bold text-white">{solBalance}</span>
                  <span className="text-white/25 text-[10px]">SOL</span>
                </button>

                {/* Profile avatar */}
                <button
                  onClick={() => setProfileOpen(true)}
                  className="relative w-8 h-8 rounded-full ring-1 ring-white/10 hover:ring-purple-500/50 transition-all overflow-hidden flex-shrink-0"
                  title={profile ? `${profile.username} · #${profile.userId}` : "Set up profile"}
                >
                  {profile?.pfpUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.pfpUrl} alt="pfp" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-700/60 to-purple-900/40 flex items-center justify-center">
                      {profile ? (
                        <span className="font-orbitron text-xs font-black text-white/70">
                          {profile.username[0].toUpperCase()}
                        </span>
                      ) : (
                        <User size={13} className="text-white/30" />
                      )}
                    </div>
                  )}
                </button>

                {/* Username or address */}
                <button
                  onClick={() => setProfileOpen(true)}
                  className="hidden sm:block text-white/35 hover:text-white/60 text-[11px] font-mono transition-colors"
                >
                  {profile ? profile.username : shortenAddress(walletAddress)}
                </button>

                {/* Logout */}
                <button onClick={logout} className="text-white/15 hover:text-white/40 transition-colors" title="Disconnect">
                  <LogOut size={13} />
                </button>
              </>
            ) : (
              <button onClick={login} className="btn-launch py-2 px-4 text-[11px]">
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

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        walletAddress={walletAddress}
        onProfileChange={setProfile}
      />
    </>
  );
}
