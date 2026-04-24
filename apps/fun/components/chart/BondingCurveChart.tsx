"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { GRADUATION_TARGET_USD } from "@/lib/constants";

export interface PricePoint {
  ts: number;
  priceUsd: number;
  mcapUsd: number;
  realSolLamports: number;
  progressPct: number;
}

interface Props {
  chartData: PricePoint[];
  currentMcapUsd: number;
  currentPriceUsd: number;
}

type Timeframe = "15m" | "1h" | "4h" | "ALL";

const TIMEFRAMES: { label: Timeframe; ms: number }[] = [
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "1h",  ms: 60 * 60 * 1000 },
  { label: "4h",  ms: 4 * 60 * 60 * 1000 },
  { label: "ALL", ms: Infinity },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatPrice(p: number): string {
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 0.01)   return `$${p.toFixed(6)}`;
  if (p < 1)      return `$${p.toFixed(4)}`;
  return `$${p.toFixed(2)}`;
}

interface TooltipEntry {
  payload: PricePoint;
}
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-black/90 border border-white/10 px-3 py-2 text-xs space-y-1">
      <p className="text-white/40">{new Date(d.ts).toLocaleTimeString()}</p>
      <p className="text-white/50">Price: <span className="text-purple-300 font-mono">{formatPrice(d.priceUsd)}</span></p>
      <p className="text-white/50">MCap: <span className="text-white font-mono">${d.mcapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>
      <p className="text-white/50">Curve: <span className="text-white">{d.progressPct}%</span></p>
    </div>
  );
};

// Static supply-curve fallback when no history exists yet
function buildStaticCurve() {
  const points = [];
  for (let i = 0; i <= 60; i++) {
    const supplyPct = (i / 60) * 100;
    const price = 0.000005 * Math.exp((supplyPct / 100) * 3);
    points.push({ supplyPct: +supplyPct.toFixed(1), priceUsd: +price.toFixed(8), mcapUsd: +(price * 1_000_000_000).toFixed(0), ts: 0, realSolLamports: 0, progressPct: supplyPct });
  }
  return points;
}

export function BondingCurveChart({ chartData, currentMcapUsd, currentPriceUsd }: Props) {
  const [tf, setTf] = useState<Timeframe>("ALL");

  const hasHistory = chartData.length >= 2;

  const filtered = useMemo(() => {
    if (!hasHistory) return chartData;
    const tfMs = TIMEFRAMES.find((t) => t.label === tf)!.ms;
    if (tfMs === Infinity) return chartData;
    const cutoff = Date.now() - tfMs;
    const sliced = chartData.filter((p) => p.ts >= cutoff);
    return sliced.length >= 2 ? sliced : chartData.slice(-2);
  }, [chartData, tf, hasHistory]);

  const isUp = useMemo(() => {
    if (filtered.length < 2) return true;
    return filtered[filtered.length - 1].priceUsd >= filtered[0].priceUsd;
  }, [filtered]);

  const color      = isUp ? "#4ade80" : "#f87171";
  const gradientId = isUp ? "chartGradGreen" : "chartGradRed";

  if (!hasHistory) {
    // Fallback: static supply curve
    const staticData = buildStaticCurve();
    const currentPoint = staticData.reduce((prev, cur) =>
      Math.abs(cur.mcapUsd - currentMcapUsd) < Math.abs(prev.mcapUsd - currentMcapUsd) ? cur : prev
    );
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Bonding curve</span>
          <span className="text-white/25 text-[10px]">Awaiting trade data…</span>
        </div>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={staticData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="curveGradStatic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis dataKey="supplyPct" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} interval={11} />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={currentPoint.supplyPct} stroke="rgba(168,85,247,0.6)" strokeDasharray="3 3"
                label={{ value: "NOW", position: "top", fill: "#a855f7", fontSize: 9 }} />
              <ReferenceLine x={100} stroke="rgba(74,222,128,0.5)" strokeDasharray="3 3"
                label={{ value: "GRAD", position: "top", fill: "#4ade80", fontSize: 9 }} />
              <Area type="monotone" dataKey="priceUsd" stroke="#a855f7" strokeWidth={2}
                fill="url(#curveGradStatic)" dot={false}
                activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 1 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/30">$5k start</span>
          <span className="text-green-400/80">$100k graduation → casino live</span>
        </div>
      </div>
    );
  }

  // Live time-series chart
  const lastPrice = filtered[filtered.length - 1]?.priceUsd ?? currentPriceUsd;
  const pctChange = filtered.length >= 2
    ? ((lastPrice - filtered[0].priceUsd) / filtered[0].priceUsd) * 100
    : 0;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-bold text-white">{formatPrice(lastPrice)}</span>
          <span className={`text-[11px] font-rajdhani font-semibold ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? "▲" : "▼"} {Math.abs(pctChange).toFixed(1)}%
          </span>
        </div>
        {/* Timeframe selector */}
        <div className="flex gap-1">
          {TIMEFRAMES.map(({ label }) => (
            <button
              key={label}
              onClick={() => setTf(label)}
              className={`px-2 py-0.5 rounded text-[10px] font-orbitron font-bold transition-colors ${
                tf === label
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "text-white/25 hover:text-white/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="ts"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatTime}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            {/* Graduation MCap reference */}
            {filtered.some((p) => p.mcapUsd >= GRADUATION_TARGET_USD * 0.9) && (
              <ReferenceLine
                y={GRADUATION_TARGET_USD / 1_000_000_000}
                stroke="rgba(74,222,128,0.4)"
                strokeDasharray="3 3"
                label={{ value: "GRAD", position: "right", fill: "#4ade80", fontSize: 9 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="priceUsd"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: "#fff", strokeWidth: 1 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-[11px] text-white/25 font-rajdhani">
        <span>MCap ${(currentMcapUsd / 1000).toFixed(1)}K</span>
        <span className="text-green-400/60">$100K graduation → casino live</span>
      </div>
    </div>
  );
}
