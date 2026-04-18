import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "ReelBit — Launch Slot Tokens on Solana",
  description: "Launch your slot machine token for free. Graduate to the casino at $100k mcap.",
  openGraph: { title: "ReelBit.fun", description: "Pump.fun meets Vegas. On Solana." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="casino-bg min-h-screen antialiased">
        <div className="orb w-[600px] h-[600px] top-[-200px] left-[-200px] bg-purple-900/20" style={{ animationDelay: "0s" }} />
        <div className="orb w-[400px] h-[400px] bottom-[10%] right-[-100px] bg-cyan-900/15" style={{ animationDelay: "4s" }} />
        <div className="orb w-[300px] h-[300px] top-[40%] left-[60%]" style={{ background: "rgba(212,160,23,0.04)", animationDelay: "8s" }} />
        <Providers>
          <Navbar />
          <main className="relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
