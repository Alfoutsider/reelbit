"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const AUTO_DISMISS_MS = 30_000;

interface GradEvent {
  mint:        string;
  tokenName?:  string;
  tokenSymbol?:string;
  ts:          number;
}

/**
 * Shows a sticky pill at the top of the casino UI whenever a token graduates.
 * Subscribed to /feed/stream so the pill appears within ~100ms of the on-chain
 * graduation event. Auto-dismisses after 30s; clicking it routes to the slot.
 *
 * Lives in the navbar so the user sees graduations on any page (lobby, slot
 * detail, profile), not just the lobby that already listens for them.
 */
export function GraduationPill() {
  const [event, setEvent] = useState<GradEvent | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API}/feed/stream`);
    es.addEventListener("theme:graduated", (ev) => {
      try {
        const d = JSON.parse((ev as MessageEvent).data) as GradEvent;
        setEvent(d);
      } catch {}
    });
    es.onerror = () => { /* browser auto-reconnects */ };
    return () => es.close();
  }, []);

  // Auto-dismiss timer. Restart whenever a new event lands so a fresh
  // graduation always gets a fresh 30s window.
  useEffect(() => {
    if (!event) return;
    const id = setTimeout(() => setEvent(null), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [event]);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.ts}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        >
          <Link
            href={`/slot/${event.mint}`}
            onClick={() => setEvent(null)}
            className="flex items-center gap-2.5 rounded-full pl-3 pr-2 py-1.5 bg-gradient-to-r from-emerald-500/95 to-green-600/95 shadow-lg shadow-emerald-500/30 backdrop-blur-sm border border-emerald-300/20"
          >
            <Zap size={12} className="text-white" />
            <span className="font-orbitron text-[11px] font-bold text-white tracking-wider">
              {event.tokenSymbol ? `$${event.tokenSymbol}` : event.tokenName ?? event.mint.slice(0, 8)}
              {" "}graduated — play now
            </span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEvent(null); }}
              aria-label="Dismiss"
              className="rounded-full p-0.5 hover:bg-white/15"
            >
              <X size={11} className="text-white/80" />
            </button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
