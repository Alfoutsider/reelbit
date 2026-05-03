"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

const nav = [
  { href: "/admin/dashboard", label: "Overview"      },
  { href: "/admin/launchpad", label: "Launchpad"     },
  { href: "/admin/casino",    label: "Casino"        },
  { href: "/admin/revenue",   label: "Revenue"       },
  { href: "/admin/users",     label: "Users & Growth"},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

  // Login page renders without sidebar
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 flex flex-col border-r border-zinc-800">
        <div className="px-5 py-4 border-b border-zinc-800">
          <span className="text-violet-400 font-bold">ReelBit</span>
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

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
