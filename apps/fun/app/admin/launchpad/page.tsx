"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function apiFetch(path: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ path, ...Object.fromEntries(Object.entries(params).map(([k,v]) => [k, String(v)])) });
  return fetch(`/api/admin/proxy?${qs}`, { cache: "no-store" }).then((r) => r.json());
}

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

export default function LaunchpadPage() {
  const [days, setDays]           = useState(30);
  const [kpis, setKpis]           = useState<Record<string, unknown> | null>(null);
  const [chart, setChart]         = useState<Record<string, unknown>[]>([]);
  const [topTokens, setTopTokens] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/admin/kpis", { days }),
      apiFetch("/admin/chart", { platform: "launchpad", days }),
      apiFetch("/admin/top-tokens", { limit: 10 }),
    ])
      .then(([k, c, t]) => {
        setKpis(k);
        setChart(Array.isArray(c) ? c : []);
        setTopTokens(Array.isArray(t) ? t : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>;
  if (!kpis) return null;

  const lp = kpis.launchpad as Record<string, number>;
  const chartData = chart.map((r) => ({
    day:      new Date(r.hour as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    volUsd:   Number(r.trade_vol_usd ?? 0),
    launched: Number(r.tokens_launched ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Launchpad</h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded text-xs ${days === d ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tokens Launched" value={fmtNum(lp.tokensLaunched)} sub={`${days}d`} />
        <StatCard label="Graduated" value={fmtNum(lp.tokensGraduated)}
          sub={`${((lp.tokensGraduated / (lp.tokensLaunched || 1)) * 100).toFixed(1)}% rate`} />
        <StatCard label="Trade Volume" value={fmtUsd(lp.volumeUsd)} />
        <StatCard label="Total Trades" value={fmtNum(lp.tradeCount)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Daily Volume (USD)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} formatter={(v) => [fmtUsd(Number(v ?? 0)), "Volume"]} />
              <Bar dataKey="volUsd" fill="#7C3AED" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Tokens Launched per Day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
              <Bar dataKey="launched" fill="#10B981" radius={[2, 2, 0, 0]} name="Launched" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Top Tokens by Volume</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 text-xs border-b border-zinc-800">
              <th className="pb-2 pr-4">Mint</th>
              <th className="pb-2 pr-4">Volume (USD)</th>
              <th className="pb-2">Trades</th>
            </tr>
          </thead>
          <tbody>
            {topTokens.map((t, i) => (
              <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2 pr-4 font-mono text-xs text-zinc-400">{String(t.mint).slice(0, 12)}…</td>
                <td className="py-2 pr-4">{fmtUsd(Number(t.trade_vol_usd ?? 0))}</td>
                <td className="py-2">{fmtNum(Number(t.trade_count ?? 0))}</td>
              </tr>
            ))}
            {topTokens.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-zinc-600 text-xs">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
