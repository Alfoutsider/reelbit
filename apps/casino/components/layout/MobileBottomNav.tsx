"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Wallet, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onWalletClick?: () => void;
  onProfileClick?: () => void;
}

export function MobileBottomNav({ onWalletClick, onProfileClick }: Props) {
  const path = usePathname();

  const itemCls = (active: boolean) =>
    cn(
      "flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[8px] font-orbitron tracking-widest transition-colors",
      active ? "text-[#d4a017]" : "text-white/25 hover:text-white/50",
    );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 sm:hidden z-40 flex border-t"
      style={{ background: "var(--bg2)", borderColor: "var(--bdr2)" }}
    >
      <Link href="/" className={itemCls(path === "/")}>
        <LayoutGrid size={19} />
        LOBBY
      </Link>

      <button onClick={onWalletClick} className={itemCls(false)}>
        <Wallet size={19} />
        WALLET
      </button>

      <Link href="/history" className={itemCls(path === "/history")}>
        <Clock size={19} />
        HISTORY
      </Link>

      <button onClick={onProfileClick} className={itemCls(false)}>
        <User size={19} />
        PROFILE
      </button>
    </nav>
  );
}
