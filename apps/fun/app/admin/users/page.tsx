"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function apiFetch(path: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ path, ...Object.fromEntries(Object.entries(params).map(([k,v]) => [k, String(v)])) });
  return fetch(`/api/admin/proxy?${qs}`, { cache: "no-store" }).then((r) => r.json());
}
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

export default function UsersPage() {
  const [days, setDays]   = useState(30);
  const [kpis, setKpis]   = useState<Record<string, unknown> | null>(null);
  const [chart, setChart] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([apiFetch("/admin/kpis", { days }), apiFetch("/admin/chart", { platform: "launchpad", days })])
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
    trades: Number(r.trade_count ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users & Growth</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs ${days === d ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Unique Traders" value={fmtNum(kpis.uniqueTraders as number)} sub={`${days}d`} />
        <StatCard label="Total Trades"   value={fmtNum(lp.tradeCount)} />
        <StatCard label="Casino Spins"   value={fmtNum(ca.spins)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Daily Trade Activity</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
            <Bar dataKey="trades" fill="#7C3AED" radius={[2, 2, 0, 0]} name="Trades" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Investor Snapshot</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1">Launchpad</p>
            <p className="font-semibold">{fmtNum(lp.tokensLaunched)} tokens launched</p>
            <p className="text-zinc-400 text-xs mt-1">
              {fmtNum(lp.tokensGraduated)} graduated ({((lp.tokensGraduated / (lp.tokensLaunched || 1)) * 100).toFixed(1)}% rate)
            </p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1">Casino</p>
            <p className="font-semibold">{fmtNum(ca.spins)} spins in {days}d</p>
            <p className="text-zinc-400 text-xs mt-1">
              Avg {fmtNum(ca.spins / days)} spins / day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
