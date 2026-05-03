"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const apiFetch = (p: string) => fetch(`${API}${p}`, { cache: "no-store" }).then((r) => r.json());
const fmtUsd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CasinoPage() {
  const [days, setDays]         = useState(30);
  const [kpis, setKpis]         = useState<Record<string, unknown> | null>(null);
  const [chart, setChart]       = useState<Record<string, unknown>[]>([]);
  const [jackpots, setJackpots] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/admin/kpis?days=${days}`),
      apiFetch(`/admin/chart?platform=casino&days=${days}`),
      apiFetch(`/admin/jackpots?limit=20`),
    ])
      .then(([k, c, j]) => { setKpis(k); setChart(c); setJackpots(j); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>;
  if (!kpis) return null;

  const ca = kpis.casino as Record<string, number>;
  const chartData = chart.map((r) => ({
    day: new Date(r.hour as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    ggr: Number(r.ggr_usdc ?? 0) / 1e6,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Casino</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs ${days === d ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Total Spins" value={fmtNum(ca.spins)} sub={`${days}d`} />
        <StatCard label="Gross Gaming Revenue" value={fmtUsd(ca.ggrUsdc / 1e6)} sub="USDC" />
        <StatCard label="Jackpots Paid" value={fmtUsd(ca.jackpotPaid / 1e6)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Daily GGR (USDC)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} formatter={(v: number) => [fmtUsd(v), "GGR"]} />
            <Line type="monotone" dataKey="ggr" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Recent Jackpot Payouts</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 text-xs border-b border-zinc-800">
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 pr-4">Winner</th>
              <th className="pb-2 pr-4">Mint</th>
              <th className="pb-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {jackpots.map((j, i) => (
              <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2 pr-4 text-xs text-zinc-400">{new Date(j.paid_at as string).toLocaleDateString()}</td>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-400">{String(j.winner_wallet).slice(0, 10)}…</td>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-400">{String(j.mint).slice(0, 10)}…</td>
                <td className="py-2 text-emerald-400 font-medium">{fmtUsd(Number(j.usdc_units) / 1e6)}</td>
              </tr>
            ))}
            {jackpots.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-zinc-600 text-xs">No jackpots paid yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
