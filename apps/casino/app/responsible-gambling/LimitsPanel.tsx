"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pause, AlertTriangle } from "lucide-react";
import {
  getLimits, setLimits, selfExclude, clearSelfExclusion, getDailyTotals,
  type RGLimits,
} from "@/lib/responsibleGambling";

const DEPOSIT_PRESETS = [50, 100, 250, 500, 1000];
const LOSS_PRESETS    = [25, 50, 100, 250];
const EXCLUDE_OPTIONS = [
  { hours: 24,    label: "24 hours" },
  { hours: 168,   label: "1 week"   },
  { hours: 720,   label: "1 month"  },
];

function fmtUsdc(n: number | null): string {
  if (n == null) return "No limit";
  return `$${n.toFixed(2)}`;
}

export function LimitsPanel() {
  const [limits, setLimitsLocal] = useState<RGLimits>({
    dailyDepositLimitUsdc: null, dailyLossLimitUsdc: null, selfExcludeUntil: null,
  });
  const [depositInput, setDepositInput] = useState("");
  const [lossInput,    setLossInput]    = useState("");
  const [daily, setDaily] = useState({ deposited: 0, lost: 0 });
  const [confirmExclude, setConfirmExclude] = useState<number | null>(null);

  useEffect(() => {
    setLimitsLocal(getLimits());
    const t = getDailyTotals();
    setDaily({ deposited: t.deposited, lost: t.lost });
  }, []);

  function applyDepositLimit(amount: number | null) {
    const next = { ...limits, dailyDepositLimitUsdc: amount };
    setLimits(next); setLimitsLocal(next);
  }
  function applyLossLimit(amount: number | null) {
    const next = { ...limits, dailyLossLimitUsdc: amount };
    setLimits(next); setLimitsLocal(next);
  }
  function activateSelfExclude(hours: number) {
    selfExclude(hours);
    setLimitsLocal(getLimits());
    setConfirmExclude(null);
  }
  function liftSelfExclude() {
    clearSelfExclusion();
    setLimitsLocal(getLimits());
  }

  const isExcluded = limits.selfExcludeUntil && limits.selfExcludeUntil > Date.now();

  return (
    <div className="space-y-4 mb-10">
      {isExcluded && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3"
        >
          <Pause size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-orbitron text-[12px] font-bold text-yellow-300 tracking-wider">SELF-EXCLUSION ACTIVE</p>
            <p className="text-xs text-yellow-200/80 mt-1 font-rajdhani">
              No deposits or spins until {new Date(limits.selfExcludeUntil!).toLocaleString()}.
            </p>
            <button onClick={liftSelfExclude} className="text-[11px] mt-2 text-yellow-300/60 hover:text-yellow-300 underline font-orbitron">
              END EARLY
            </button>
          </div>
        </motion.div>
      )}

      {/* Today's totals */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
        <p className="font-orbitron text-[10px] font-bold text-white/50 tracking-widest">TODAY (UTC)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-white/40 font-orbitron">Deposited</p>
            <p className="font-orbitron text-base text-white">${daily.deposited.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/40 font-orbitron">Net Lost</p>
            <p className="font-orbitron text-base text-white">${daily.lost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Deposit limit */}
      <LimitRow
        title="DAILY DEPOSIT LIMIT"
        current={fmtUsdc(limits.dailyDepositLimitUsdc)}
        presets={DEPOSIT_PRESETS}
        selected={limits.dailyDepositLimitUsdc}
        onSelect={applyDepositLimit}
        customInput={depositInput}
        setCustomInput={setDepositInput}
      />

      {/* Loss limit */}
      <LimitRow
        title="DAILY LOSS LIMIT"
        current={fmtUsdc(limits.dailyLossLimitUsdc)}
        presets={LOSS_PRESETS}
        selected={limits.dailyLossLimitUsdc}
        onSelect={applyLossLimit}
        customInput={lossInput}
        setCustomInput={setLossInput}
      />

      {/* Self-exclusion */}
      {!isExcluded && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-orange-400" />
            <p className="font-orbitron text-[11px] font-bold text-white/70 tracking-widest">SELF-EXCLUSION</p>
          </div>
          <p className="text-xs text-white/50 font-rajdhani leading-relaxed">
            Block all deposits and spins on this device for the chosen window.
            You can lift it early — but the cooldown is most useful when you don't.
          </p>
          <div className="flex flex-wrap gap-2">
            {EXCLUDE_OPTIONS.map(({ hours, label }) => (
              <button
                key={hours}
                onClick={() => setConfirmExclude(hours)}
                className="rounded-lg px-3 py-2 bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 text-[11px] font-orbitron"
              >
                Pause for {label}
              </button>
            ))}
          </div>
          {confirmExclude && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 flex items-center justify-between gap-3"
            >
              <p className="text-xs text-red-200 font-rajdhani">
                Confirm: pause for {EXCLUDE_OPTIONS.find((o) => o.hours === confirmExclude)?.label}?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmExclude(null)} className="text-[11px] text-white/50 font-orbitron">CANCEL</button>
                <button onClick={() => activateSelfExclude(confirmExclude)} className="rounded-md px-3 py-1.5 bg-red-500 text-white text-[11px] font-orbitron">CONFIRM</button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function LimitRow({
  title, current, presets, selected, onSelect, customInput, setCustomInput,
}: {
  title: string; current: string; presets: number[]; selected: number | null;
  onSelect: (n: number | null) => void;
  customInput: string; setCustomInput: (s: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-orbitron text-[11px] font-bold text-white/70 tracking-widest">{title}</p>
        <p className="text-xs text-white/50 font-rajdhani">Current: {current}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((amt) => (
          <button
            key={amt}
            onClick={() => onSelect(amt)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-orbitron transition-all ${
              selected === amt
                ? "bg-white/20 text-white"
                : "bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            ${amt}
          </button>
        ))}
        <button
          onClick={() => onSelect(null)}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-orbitron transition-all ${
            selected == null
              ? "bg-white/20 text-white"
              : "bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.08]"
          }`}
        >
          None
        </button>
        <div className="flex gap-2 items-center">
          <input
            type="number" min={1} value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Custom"
            className="w-24 rounded-lg bg-white/[0.04] border border-white/8 px-3 py-1.5 text-[11px] text-white"
          />
          <button
            onClick={() => { const n = parseFloat(customInput); if (n > 0) onSelect(n); }}
            className="rounded-lg px-3 py-1.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-orbitron hover:bg-emerald-500/30"
          >
            SET
          </button>
        </div>
      </div>
    </div>
  );
}
