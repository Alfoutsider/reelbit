"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router  = useRouter();
  const [code, setCode]     = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code }),
    });
    if (res.ok) {
      router.replace("/admin/dashboard");
    } else {
      setError("Invalid access code");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-violet-400 mb-1">ReelBit</div>
          <p className="text-zinc-500 text-sm">Admin Dashboard</p>
        </div>
        <form
          onSubmit={submit}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
        >
          <label className="block">
            <span className="text-xs text-zinc-400 uppercase tracking-wide">Access Code</span>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter access code"
              autoFocus
              className="mt-1 w-full bg-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500"
            />
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg py-2.5 font-medium transition-colors text-white"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
