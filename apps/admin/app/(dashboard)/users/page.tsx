"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { fetchKPIs, fetchChart, fmtNum } from "@/lib/api";
import StatCard from "@/components/StatCard";

type ChartRow = { hour: string; new_wallets: number; trade_count: number };

export default function UsersPage() {
  const [days, setDays]     = useState(30);
  const [kpis, setKpis]     = useState<Record<string, unknown> | null>(null);
  const [chart, setChart]   = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchKPIs(days), fetchChart("launchpad", days)])
      .then(([k, c]) => { setKpis(k); setChart(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>;
  if (!kpis) return null;

  const chartData = chart.map((r) => ({
    hour:    new Date(r.hour).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    trades:  Number(r.trade_count ?? 0),
    wallets: Number(r.new_wallets ?? 0),
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
        <StatCard label="Total Trades" value={fmtNum((kpis.launchpad as Record<string, number>).tradeCount)} />
        <StatCard label="Casino Spins" value={fmtNum((kpis.casino as Record<string, number>).spins)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Daily Trade Activity</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="hour" tick={{ fill: "#71717a", fontSize: 10 }} />
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
            <p className="text-zinc-200">
              <span className="font-semibold">{fmtNum((kpis.launchpad as Record<string, number>).tokensLaunched)}</span> tokens launched,{" "}
              <span className="font-semibold">{fmtNum((kpis.launchpad as Record<string, number>).tokensGraduated)}</span> graduated
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              {(((kpis.launchpad as Record<string, number>).tokensGraduated /
                ((kpis.launchpad as Record<string, number>).tokensLaunched || 1)) * 100).toFixed(1)}% graduation rate
            </p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1">Casino</p>
            <p className="text-zinc-200">
              <span className="font-semibold">{fmtNum((kpis.casino as Record<string, number>).spins)}</span> spins in {days}d
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              Avg {fmtNum((kpis.casino as Record<string, number>).spins / days)} spins / day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
