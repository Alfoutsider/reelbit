"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { LANGS, BROWSER_TO_GT, triggerGoogleTranslate } from "@/lib/languages";

const STORAGE_KEY = "rb_lang_pref";

type LangInfo = (typeof LANGS)[number];

export function LanguagePrompt() {
  const [detected, setDetected] = useState<LangInfo | null>(null);
  const [visible, setVisible]   = useState(false);

  useEffect(() => {
    // Already answered before — never prompt again
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Google Translate already active — user has a cookie preference
    if (document.cookie.includes("googtrans=/en/")) return;

    const prefix = navigator.language.split("-")[0].toLowerCase();
    if (prefix === "en") return;

    const gtCode = BROWSER_TO_GT[prefix];
    if (!gtCode) return;

    const langInfo = LANGS.find((l) => l.code === gtCode);
    if (!langInfo) return;

    setDetected(langInfo);
    // Delay so the page and Google Translate script settle first
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, []);

  function accept() {
    if (!detected) return;
    localStorage.setItem(STORAGE_KEY, detected.code);
    hide();
    triggerGoogleTranslate(detected.code);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    hide();
  }

  function hide() {
    setVisible(false);
    setTimeout(() => setDetected(null), 400);
  }

  if (!detected) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-400 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
      }`}
    >
      <div
        className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 shadow-2xl"
        style={{
          background: "rgba(10,10,26,0.92)",
          backdropFilter: "blur(16px)",
          maxWidth: "min(90vw, 420px)",
        }}
      >
        <span className="text-2xl leading-none flex-shrink-0">{detected.flag}</span>

        <p className="font-rajdhani text-sm text-white/70 leading-snug flex-1 min-w-0">
          Switch to{" "}
          <span className="text-white font-semibold">{detected.label}</span>?
        </p>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={accept}
            className="rounded-lg px-3 py-1.5 text-[11px] font-orbitron font-black tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg,#8b5cf6,#06b6d4)",
              color: "#fff",
            }}
          >
            YES
          </button>
          <button
            onClick={dismiss}
            className="rounded-lg px-2 py-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
            aria-label="No thanks"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
