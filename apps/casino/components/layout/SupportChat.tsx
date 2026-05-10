"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ACCENT = "#d4a017";

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch(`${API}/support/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json() as { message?: string; error?: string };
      setMessages([...next, { role: "assistant", content: data.message ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Can't connect right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ background: ACCENT, boxShadow: `0 0 24px ${ACCENT}55` }}
        aria-label="Support chat"
      >
        {open ? <X size={22} color="#0d0d1a" /> : <MessageCircle size={22} color="#0d0d1a" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10"
          style={{ background: "#0d0d1a", height: 480 }}
        >
          <div className="px-4 py-3 flex items-center gap-3 border-b border-white/10" style={{ background: ACCENT + "15" }}>
            <Bot size={18} style={{ color: ACCENT }} />
            <div>
              <div className="text-sm font-semibold text-white">ReelBit Support</div>
              <div className="text-xs text-white/35">AI assistant · Always online</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="text-center mt-10">
                <Bot size={28} className="mx-auto mb-3" style={{ color: ACCENT + "77" }} />
                <p className="text-white/30 text-sm">Hi! Ask me anything about ReelBit.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                  style={
                    m.role === "user"
                      ? { background: ACCENT, color: "#0d0d1a", fontWeight: 500 }
                      : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.82)" }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <span className="inline-flex gap-1 items-center">
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: ACCENT + "99", animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything…"
              className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none border border-white/10 focus:border-white/25 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30 flex-shrink-0"
              style={{ background: ACCENT }}
            >
              <Send size={15} color="#0d0d1a" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
