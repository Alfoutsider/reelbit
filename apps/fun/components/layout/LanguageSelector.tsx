"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { LANGS, triggerGoogleTranslate, resetTranslation } from "@/lib/languages";

export function LanguageSelector() {
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState("en");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(code: string) {
    setSelected(code);
    setOpen(false);
    if (code === "en") { resetTranslation(); return; }
    triggerGoogleTranslate(code);
  }

  const current = LANGS.find((l) => l.code === selected) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-[11px] font-orbitron"
        aria-label="Select language"
      >
        <Globe size={12} />
        <span className="hidden sm:inline">{current.flag} {current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl border border-white/10 overflow-hidden shadow-2xl"
          style={{ background: "#0a0a1a", minWidth: 160, maxHeight: 320, overflowY: "auto" }}
        >
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => select(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors hover:bg-white/5 text-left ${
                selected === lang.code ? "text-white" : "text-white/45"
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="font-rajdhani font-semibold">{lang.label}</span>
              {selected === lang.code && <span className="ml-auto text-white/40">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
