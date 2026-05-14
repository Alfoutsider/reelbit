"use client";

import { useState, useEffect } from "react";

// Jackpot seed grows ~$0.08–0.22 every 900ms across all open sessions.
// On mainnet this will come from the on-chain jackpot pool.
const SEED = 47_231.84;

export function useJackpot() {
  const [value, setValue] = useState(SEED);
  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => v + Math.random() * 0.14 + 0.04);
    }, 900);
    return () => clearInterval(id);
  }, []);
  return value;
}

export function fmtJackpot(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
