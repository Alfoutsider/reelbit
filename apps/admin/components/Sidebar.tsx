"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearCode } from "@/lib/api";
import clsx from "clsx";

const nav = [
  { href: "/dashboard",  label: "Overview" },
  { href: "/launchpad",  label: "Launchpad" },
  { href: "/casino",     label: "Casino" },
  { href: "/revenue",    label: "Revenue" },
  { href: "/users",      label: "Users & Growth" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  function logout() {
    clearCode();
    router.replace("/");
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r border-zinc-800 min-h-screen">
      <div className="px-5 py-4 border-b border-zinc-800">
        <span className="text-violet-400 font-bold text-lg">ReelBit</span>
        <span className="ml-1 text-zinc-500 text-xs">admin</span>
      </div>
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "block rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-violet-600/20 text-violet-300"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-zinc-800">
        <button
          onClick={logout}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
