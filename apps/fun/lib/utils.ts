import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4) + " SOL";
}

export function formatUsd(sol: number, solPrice: number): string {
  return "$" + (sol * solPrice).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function shortenAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export function graduationProgress(currentMcap: number): number {
  const TARGET = 100_000; // $100k
  return Math.min((currentMcap / TARGET) * 100, 100);
}
