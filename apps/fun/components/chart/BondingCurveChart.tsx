"use client";

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

interface Props {
  currentMcapUsd: number;
  solPrice?: number;
}

function buildCurve() {
  const points = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const supplyPct = (i / steps) * 100;
    // Meteora DLMM approximation: price grows exponentially with supply sold
    const price = 0.000005 * Math.exp((supplyPct / 100) * 3);
    const mcap = price * 1_000_000_000;
    points.push({ supplyPct: +supplyPct.toFixed(1), priceUsd: +price.toFixed(8), mcapUsd: +mcap.toFixed(0) });
  }
  return points;
}

interface TooltipEntry { payload: { supplyPct: number; priceUsd: number; mcapUsd: number } }
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-black/90 border border-white/10 px-3 py-2 text-xs space-y-0.5">
      <p className="text-white/50">Supply sold: <span className="text-white">{d.supplyPct}%</span></p>
      <p className="text-white/50">Price: <span className="text-purple-300">${d.priceUsd}</span></p>
      <p className="text-white/50">MCap: <span className="text-white">${d.mcapUsd.toLocaleString()}</span></p>
    </div>
  );
};

export function BondingCurveChart({ currentMcapUsd }: Props) {
  const data = buildCurve();
  const currentPoint = data.reduce((prev, cur) =>
    Math.abs(cur.mcapUsd - currentMcapUsd) < Math.abs(prev.mcapUsd - currentMcapUsd) ? cur : prev
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>Bonding curve</span>
        <span className="text-white/60">Grad @ ${GRADUATION_TARGET_USD.toLocaleString()}</span>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="supplyPct"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              interval={11}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            {/* Graduation line */}
            <ReferenceLine
              x={currentPoint.supplyPct}
              stroke="rgba(168,85,247,0.6)"
              strokeDasharray="3 3"
              label={{ value: "NOW", position: "top", fill: "#a855f7", fontSize: 9 }}
            />
            <ReferenceLine
              x={100}
              stroke="rgba(74,222,128,0.5)"
              strokeDasharray="3 3"
              label={{ value: "GRAD", position: "top", fill: "#4ade80", fontSize: 9 }}
            />
            <Area
              type="monotone"
              dataKey="priceUsd"
              stroke="#a855f7"
              strokeWidth={2}
              fill="url(#curveGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 1 }}
            />
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
