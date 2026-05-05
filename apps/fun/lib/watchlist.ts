"use client";

// Local-first watchlist. Stored in localStorage under a single key as a
// stringified array of mint addresses. Components subscribe via the
// `watchlistChanged` window event so multiple cards stay in sync without a
// global state store.
//
// Cap at 100 entries — anyone with more than that should be using a
// different surface (filters, search) anyway, and unbounded growth makes
// localStorage feel slow.

const KEY = "rb_watchlist";
const MAX = 100;
const EVENT = "rb_watchlist:changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // Quota exceeded or storage disabled — degrade silently. The user just
    // won't see their selection persist.
  }
}

export function getWatchlist(): string[] {
  return read();
}

export function isWatched(mint: string): boolean {
  return read().includes(mint);
}

export function toggleWatch(mint: string): boolean {
  const list = read();
  const idx = list.indexOf(mint);
  if (idx >= 0) {
    list.splice(idx, 1);
    write(list);
    return false;
  }
  list.unshift(mint);
  write(list);
  return true;
}

export function subscribeWatchlist(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // Custom event fires for in-tab changes; storage event covers cross-tab.
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", (e) => { if (e.key === KEY) cb(); });
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler as EventListener);
  };
}
