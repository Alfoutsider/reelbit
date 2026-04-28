"use client";

import { useEffect, useRef, useState } from "react";

// Re-exported so the slot page can keep its existing import
export interface PricePoint {
  ts:          number; // epoch ms
  priceUsd:    number;
  mcapUsd:     number;
  realSolSim:  number;
  progressPct: number;
}

interface Props {
  chartData:       PricePoint[];
  currentMcapUsd:  number;
  currentPriceUsd: number;
}

type Timeframe = "30s" | "1m" | "5m" | "15m";

const TIMEFRAMES: { label: Timeframe; ms: number }[] = [
  { label: "30s", ms: 30_000  },
  { label: "1m",  ms: 60_000  },
  { label: "5m",  ms: 300_000 },
  { label: "15m", ms: 900_000 },
];

interface Candle {
  time:   number; // UTCTimestamp (seconds)
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number; // SOL delta
}

function buildCandles(points: PricePoint[], bucketMs: number): Candle[] {
  if (points.length === 0) return [];
  const map = new Map<number, PricePoint[]>();
  for (const p of points) {
    const key = Math.floor(p.ts / bucketMs) * bucketMs;
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, pts]) => {
      const prices = pts.map((p) => p.priceUsd);
      const open   = prices[0];
      const close  = prices[prices.length - 1];
      const high   = Math.max(...prices);
      const low    = Math.min(...prices);
      const vol    = Math.max(0, pts[pts.length - 1].realSolSim - pts[0].realSolSim);
      return { time: Math.floor(ts / 1000), open, high, low, close, volume: vol };
    });
}

function fmtPrice(p: number): string {
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 0.01)   return `$${p.toFixed(6)}`;
  if (p < 1)      return `$${p.toFixed(4)}`;
  return `$${p.toFixed(2)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRef = any;

export function BondingCurveChart({ chartData, currentMcapUsd, currentPriceUsd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<AnyRef>(null);
  const candleRef    = useRef<AnyRef>(null);
  const volumeRef    = useRef<AnyRef>(null);
  const [tf, setTf]  = useState<Timeframe>("1m");

  const hasData   = chartData.length >= 2;
  const lastPrice = chartData[chartData.length - 1]?.priceUsd ?? currentPriceUsd;
  const pctChange = hasData
    ? ((lastPrice - chartData[0].priceUsd) / chartData[0].priceUsd) * 100
    : 0;
  const isUp = pctChange >= 0;

  // Create chart once on mount via dynamic import (avoids SSR issues)
  useEffect(() => {
    if (!containerRef.current) return;
    let removed = false;

    import("lightweight-charts").then(({ createChart, ColorType, CrosshairMode }) => {
      if (removed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        autoSize: true,
        height:   240,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor:  "rgba(255,255,255,0.28)",
          fontSize:   11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          mode:     CrosshairMode.Normal,
          vertLine: { color: "rgba(212,160,23,0.55)", labelBackgroundColor: "#130d28" },
          horzLine: { color: "rgba(212,160,23,0.55)", labelBackgroundColor: "#130d28" },
        },
        rightPriceScale: {
          borderColor:  "rgba(255,255,255,0.06)",
          scaleMargins: { top: 0.08, bottom: 0.24 },
        },
        timeScale: {
          borderColor:    "rgba(255,255,255,0.06)",
          timeVisible:    true,
          secondsVisible: true,
          fixLeftEdge:    true,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale:  { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor:         "#22c55e",
        downColor:       "#ef4444",
        borderUpColor:   "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor:     "#4ade80",
        wickDownColor:   "#f87171",
      });

      const volumeSeries = chart.addHistogramSeries({
        priceFormat:  { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
        visible:      false,
      });

      chartRef.current  = chart;
      candleRef.current = candleSeries;
      volumeRef.current = volumeSeries;
    });

    return () => {
      removed = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current  = null;
        candleRef.current = null;
        volumeRef.current = null;
      }
    };
  }, []);

  // Feed / refresh data whenever chartData or timeframe changes
  useEffect(() => {
    const chart  = chartRef.current;
    const candle = candleRef.current;
    const volume = volumeRef.current;
    if (!chart || !candle || !volume || chartData.length < 2) return;

    const bucketMs = TIMEFRAMES.find((t) => t.label === tf)!.ms;
    const candles  = buildCandles(chartData, bucketMs);
    if (candles.length === 0) return;

    candle.setData(candles);
    volume.setData(
      candles.map((c: Candle) => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)",
      }))
    );
    chart.timeScale().fitContent();
  }, [chartData, tf]);

  return (
    <div className="space-y-2">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-orbitron text-[9px] font-bold text-white/40 tracking-widest">PRICE</span>
          <span className="font-mono text-sm font-bold text-white">{fmtPrice(currentPriceUsd)}</span>
          {hasData && (
            <span className={`text-[11px] font-rajdhani font-semibold ${isUp ? "text-green-400" : "text-red-400"}`}>
              {isUp ? "▲" : "▼"} {Math.abs(pctChange).toFixed(2)}%
            </span>
          )}
          <span className="text-[10px] text-white/25 font-rajdhani">
            MCap ${currentMcapUsd >= 1_000 ? `${(currentMcapUsd / 1_000).toFixed(1)}K` : currentMcapUsd.toFixed(0)}
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
                  ? "text-[#f5c842] border"
                  : "text-white/25 hover:text-white/50"
              }`}
              style={
                tf === label
                  ? { borderColor: "rgba(212,160,23,0.4)", background: "rgba(212,160,23,0.08)" }
                  : {}
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container — always mounted so the LWC instance can attach */}
      <div className="relative h-60 w-full rounded-xl overflow-hidden">
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/[0.015] border border-white/[0.06] rounded-xl z-10 pointer-events-none">
            <div className="w-6 h-6 border-2 border-[#d4a017]/30 border-t-[#d4a017]/70 rounded-full animate-spin" />
            <p className="text-[11px] font-rajdhani text-white/25">Awaiting first trade…</p>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Footer */}
      <div className="flex justify-between text-[10px] text-white/20 font-rajdhani">
        <span>$5K start</span>
        <span className="text-green-400/50">$100K graduation → casino live</span>
      </div>
    </div>
  );
}
