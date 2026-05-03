"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const DAYS = [7, 30, 90];

export default function DashboardPage() {
  const [days, setDays]   = useState(30);
  const [kpis, setKpis]   = useState<Record<string, unknown> | null>(null);
  const [chart, setChart] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/admin/kpis?days=${days}`),
      apiFetch(`/admin/chart?platform=launchpad&days=${days}`),
    ])
      .then(([k, c]) => { setKpis(k); setChart(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>;
  if (!kpis) return null;

  const lp = kpis.launchpad as Record<string, number>;
  const ca = kpis.casino   as Record<string, number>;

  const chartData = chart.map((r) => ({
    day:    new Date(r.hour as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volUsd: Number(r.trade_vol_usd ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Overview</h1>
        <div className="flex gap-2">
          {DAYS.map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs ${days === d ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tokens Launched"  value={fmtNum(lp.tokensLaunched)}  sub={`${days}d`} />
        <StatCard label="Graduated"        value={fmtNum(lp.tokensGraduated)} />
        <StatCard label="Trade Volume"     value={fmtUsd(lp.volumeUsd)} />
        <StatCard label="Unique Traders"   value={fmtNum(kpis.uniqueTraders as number)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Casino Spins"  value={fmtNum(ca.spins)} />
        <StatCard label="GGR"           value={fmtUsd(ca.ggrUsdc / 1e6)} sub="house edge" />
        <StatCard label="Jackpot Paid"  value={fmtUsd(ca.jackpotPaid / 1e6)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Launchpad Volume (USD)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
              formatter={(v: number) => [fmtUsd(v), "Volume"]}
            />
            <Line type="monotone" dataKey="volUsd" stroke="#7C3AED" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
