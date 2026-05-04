"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

function apiFetch(path: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ path, ...Object.fromEntries(Object.entries(params).map(([k,v]) => [k, String(v)])) });
  return fetch(`/api/admin/proxy?${qs}`, { cache: "no-store" }).then((r) => r.json());
}

const fmtUsd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// Mirror of on-chain split (programs/token-launch/src/lib.rs:64-68 +
// apps/api/src/distributionCron.ts:48). Keep in sync if the on-chain math
// changes — frontend display must match what actually moves on chain.
const FEE_SPLIT = {
  creator:   0.25,
  platform:  0.25,
  jackpot:   0.45,
  legal:     0.025,
  licensing: 0.025,
};

export default function RevenuePage() {
  const [days, setDays]   = useState(30);
  const [kpis, setKpis]   = useState<Record<string, unknown> | null>(null);
  const [chart, setChart] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/admin/kpis", { days }),
      apiFetch("/admin/chart", { platform: "launchpad", days }),
    ])
      .then(([k, c]) => { setKpis(k); setChart(Array.isArray(c) ? c : []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>;
  if (!kpis) return null;

  const lp = kpis.launchpad as Record<string, number>;
  const ca = kpis.casino as Record<string, number>;
  const estFees = lp.volumeUsd * 0.015;
  const estPlatform = estFees * FEE_SPLIT.platform;

  const chartData = chart.map((r) => ({
    day:  new Date(r.hour as string).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    vol:  Number(r.trade_vol_usd ?? 0),
    fees: Number(r.trade_vol_usd ?? 0) * 0.015,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Revenue</h1>
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
        <StatCard label="Trading Volume"    value={fmtUsd(lp.volumeUsd)} sub={`${days}d`} />
        <StatCard label="Est. Fees (~1.5%)" value={fmtUsd(estFees)} />
        <StatCard label="Platform Cut (20%)" value={fmtUsd(estPlatform)} />
        <StatCard label="Casino GGR"        value={fmtUsd(ca.ggrUsdc / 1e6)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Volume vs Fees</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gFee" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} formatter={(v) => fmtUsd(Number(v ?? 0))} />
            <Legend />
            <Area type="monotone" dataKey="vol"  stroke="#7C3AED" fill="url(#gVol)" strokeWidth={1.5} name="Volume" />
            <Area type="monotone" dataKey="fees" stroke="#10B981" fill="url(#gFee)" strokeWidth={1.5} name="Fees" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Fee Split</p>
        <div className="space-y-2">
          {Object.entries(FEE_SPLIT).map(([key, pct]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-xs text-zinc-400 capitalize">{key}</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-2">
                <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${pct * 100}%` }} />
              </div>
              <span className="text-xs text-zinc-300 w-10 text-right">{(pct * 100).toFixed(0)}%</span>
              <span className="text-xs text-zinc-500 w-16 text-right">{fmtUsd(estFees * pct)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
