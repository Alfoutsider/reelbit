'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScenarioPreset {
  label: string;
  desc: string;
  tokens: number;
  vol: number;
  fee: number;
  dau: number;
  wager: number;
  edge: number;
}

interface RevenueResult {
  fun: number;
  casino: number;
  total: number;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: Record<string, ScenarioPreset> = {
  bear: {
    label: 'Pessimistic',
    desc: 'Launch phase (0–3 months) — low awareness, bear market conditions',
    tokens: 30, vol: 3000, fee: 1, dau: 50, wager: 100, edge: 4,
  },
  base: {
    label: 'Realistic',
    desc: 'Growth phase (3–12 months) — solid traction, neutral market',
    tokens: 200, vol: 15000, fee: 1, dau: 500, wager: 400, edge: 4,
  },
  bull: {
    label: 'Optimistic',
    desc: 'Viral growth (12+ months) — bull market, strong brand recognition',
    tokens: 800, vol: 50000, fee: 1, dau: 2500, wager: 800, edge: 4,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcRevenue(s: {
  tokens: number; vol: number; fee: number;
  dau: number; wager: number; edge: number;
}): RevenueResult {
  const fun    = Math.round(s.tokens * s.vol * (s.fee / 100));
  const casino = Math.round(s.dau * s.wager * (s.edge / 100));
  return { fun, casino, total: fun + casino };
}

function fmt(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return '$' + Math.round(v / 1_000) + 'K';
  return '$' + Math.round(v);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, delay = 0 }: { label: string; value: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="stat-box"
    >
      <p className="label">{label}</p>
      <p className="value font-orbitron gold-text">{value}</p>
    </motion.div>
  );
}

function SliderRow({
  label, id, min, max, step, value, display, onChange, accentColor,
}: {
  label: string; id: string; min: number; max: number; step: number;
  value: number; display: string; onChange: (v: number) => void; accentColor: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-baseline mb-1.5">
        <label htmlFor={id} className="text-[12px] font-rajdhani font-semibold text-white/50">{label}</label>
        <span className="font-orbitron text-[12px] font-bold" style={{ color: accentColor }}>{display}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/[0.06]">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
          style={{ width: `${pct}%`, background: accentColor, opacity: 0.7 }}
        />
        <input
          id={id}
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="calc-slider"
          style={{ '--thumb-color': accentColor } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

function ComparisonBar({ rev, maxTotal }: { rev: RevenueResult; maxTotal: number }) {
  const funPct = maxTotal > 0 ? (rev.fun    / maxTotal) * 100 : 0;
  const casPct = maxTotal > 0 ? (rev.casino / maxTotal) * 100 : 0;
  return (
    <div className="flex h-5 rounded-md overflow-hidden gap-[2px]">
      <motion.div
        animate={{ width: `${funPct}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="h-full rounded-l-md min-w-[4px]"
        style={{ background: 'var(--gold)', opacity: 0.75 }}
      />
      <motion.div
        animate={{ width: `${casPct}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="h-full rounded-r-md min-w-[4px]"
        style={{ background: '#06b6d4', opacity: 0.75 }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReelBitCalculator() {
  const [active, setActive] = useState('base');
  const [tokens, setTokens] = useState(PRESETS.base.tokens);
  const [vol,    setVol]    = useState(PRESETS.base.vol);
  const [fee,    setFee]    = useState(PRESETS.base.fee);
  const [dau,    setDau]    = useState(PRESETS.base.dau);
  const [wager,  setWager]  = useState(PRESETS.base.wager);
  const [edge,   setEdge]   = useState(PRESETS.base.edge);

  const loadPreset = useCallback((key: string) => {
    const p = PRESETS[key];
    setActive(key);
    setTokens(p.tokens); setVol(p.vol); setFee(p.fee);
    setDau(p.dau); setWager(p.wager); setEdge(p.edge);
  }, []);

  const current = calcRevenue({ tokens, vol, fee, dau, wager, edge });
  const funPct  = current.total > 0 ? Math.round((current.fun / current.total) * 100) : 0;

  const scenarioRevs = {
    bear: calcRevenue(PRESETS.bear),
    base: calcRevenue(PRESETS.base),
    bull: calcRevenue(PRESETS.bull),
  };
  const maxTotal = Math.max(...Object.values(scenarioRevs).map((r) => r.total));

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 relative">

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed top-24 right-0 w-72 h-72 rounded-full bg-purple-600/8 blur-[90px]" />
      <div className="pointer-events-none fixed bottom-32 left-0 w-56 h-56 rounded-full bg-[#d4a017]/6 blur-[80px]" />

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-1.5 badge badge-gold mb-4">
          <Calculator size={9} />
          REVENUE CALCULATOR
        </div>
        <h1 className="font-orbitron text-2xl sm:text-3xl font-black gold-text mb-3">
          Revenue Potential
        </h1>
        <p className="text-white/35 font-rajdhani text-[15px] max-w-md mx-auto">
          Adjust the assumptions below to model ReelBit's daily earnings across both platforms.
        </p>
      </div>

      {/* Scenario tabs */}
      <div className="flex gap-2 mb-2">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => loadPreset(key)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-orbitron text-[10px] font-bold tracking-wider border transition-all duration-200 ${
              active === key
                ? 'bg-[#d4a017]/10 border-[#d4a017]/40 text-[#f5c842] shadow-[0_0_20px_rgba(212,160,23,0.12)]'
                : 'bg-white/[0.025] border-white/[0.06] text-white/25 hover:border-white/15 hover:text-white/45'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-white/25 font-rajdhani mb-7 min-h-[1.4em] text-center">
        {PRESETS[active]?.desc}
      </p>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

        {/* reelbit.fun */}
        <div className="card-slot p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#d4a017' }} />
            <span className="font-orbitron text-[10px] font-bold tracking-widest uppercase" style={{ color: '#d4a017', opacity: 0.8 }}>
              reelbit.fun
            </span>
          </div>
          <SliderRow id="tokens" label="Tokens launched / day"
            min={5} max={2000} step={5} value={tokens}
            display={tokens.toLocaleString()} onChange={setTokens} accentColor="#d4a017" />
          <SliderRow id="vol" label="Avg volume / token"
            min={500} max={100000} step={500} value={vol}
            display={'$' + vol.toLocaleString()} onChange={setVol} accentColor="#d4a017" />
          <SliderRow id="fee" label="Trading fee %"
            min={0.5} max={3} step={0.1} value={fee}
            display={fee.toFixed(1) + '%'} onChange={setFee} accentColor="#d4a017" />
        </div>

        {/* reelbit.casino */}
        <div className="card-slot p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#06b6d4' }} />
            <span className="font-orbitron text-[10px] font-bold tracking-widest uppercase" style={{ color: '#06b6d4', opacity: 0.8 }}>
              reelbit.casino
            </span>
          </div>
          <SliderRow id="dau" label="Daily active players"
            min={10} max={5000} step={10} value={dau}
            display={dau.toLocaleString()} onChange={setDau} accentColor="#06b6d4" />
          <SliderRow id="wager" label="Avg session wager"
            min={50} max={2000} step={50} value={wager}
            display={'$' + wager.toLocaleString()} onChange={setWager} accentColor="#06b6d4" />
          <SliderRow id="edge" label="House edge %"
            min={2} max={8} step={0.5} value={edge}
            display={edge.toFixed(1) + '%'} onChange={setEdge} accentColor="#06b6d4" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        <MetricCard label="DAILY"   value={fmt(current.total)}       delay={0}    />
        <MetricCard label="MONTHLY" value={fmt(current.total * 30)}  delay={0.05} />
        <MetricCard label="ANNUAL"  value={fmt(current.total * 365)} delay={0.1}  />
        <MetricCard label="FUN / CASINO SPLIT" value={`${funPct}% / ${100 - funPct}%`} delay={0.15} />
      </div>

      {/* Comparison chart */}
      <div className="card-slot p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-white/30" />
            <span className="font-orbitron text-[10px] font-bold tracking-widest text-white/30 uppercase">
              Daily revenue — all scenarios
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-rajdhani text-white/35">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#d4a017' }} />
              reelbit.fun
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-rajdhani text-white/35">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#06b6d4' }} />
              reelbit.casino
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {Object.entries(scenarioRevs).map(([key, rev]) => (
            <div key={key}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="font-rajdhani text-[13px] font-semibold text-white/40">{PRESETS[key].label}</span>
                <span className="font-orbitron text-[13px] font-bold text-white/70">{fmt(rev.total)}</span>
              </div>
              <ComparisonBar rev={rev} maxTotal={maxTotal} />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
