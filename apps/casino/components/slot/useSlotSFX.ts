"use client";

// Synthesized slot machine SFX — WebAudio only, no audio files needed.
// All sounds are generated in real-time from oscillators, noise, and filters.

import { useRef, useCallback } from "react";

function getCtx(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ref.current) {
    try { ref.current = new AudioContext(); } catch { return null; }
  }
  if (ref.current.state === "suspended") {
    ref.current.resume().catch(() => {});
  }
  return ref.current;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  vol = 0.25,
  freqEnd?: number,
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), startTime + duration);
  }
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playNoise(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  filterFreq: number,
  Q = 2,
  vol = 0.2,
) {
  const len  = Math.ceil(ctx.sampleRate * duration);
  const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const src    = ctx.createBufferSource();
  src.buffer   = buf;
  const filter = ctx.createBiquadFilter();
  filter.type  = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value         = Q;
  const gain  = ctx.createGain();
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(startTime);
  src.stop(startTime + duration + 0.02);
}

export type WinTierSfx = "small" | "big" | "mega" | "super" | "sensational";

export function useSlotSFX() {
  const ctxRef = useRef<AudioContext | null>(null);

  // Mechanical reel spin-up whirr
  const playSpin = useCallback(() => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    const t = ctx.currentTime;
    // Descending frequency sweep — reel acceleration feel
    playTone(ctx, 320, "sawtooth", t,       0.18, 0.08, 80);
    playTone(ctx, 180, "sawtooth", t + 0.05, 0.18, 0.06, 60);
    playNoise(ctx, t, 0.25, 600, 1.5, 0.12);
  }, []);

  // Metallic thud when each reel stops — pitch drops for later reels (suspense)
  const playReelStop = useCallback((reelIdx: number) => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    const t     = ctx.currentTime;
    const pitch = 260 - reelIdx * 22; // progressively deeper
    playNoise(ctx, t,        0.06, pitch * 2, 4, 0.35);
    playTone(ctx,  pitch,    "sine", t,        0.18, 0.12);
    playTone(ctx,  pitch * 2,"sine", t,        0.08, 0.06); // overtone
  }, []);

  // 3-note ascending ding for small wins
  const playSmallWin = useCallback(() => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784].forEach((f, i) => {
      playTone(ctx, f, "sine", t + i * 0.09, 0.25, 0.22);
    });
  }, []);

  // 5-note fanfare for big wins
  const playBigWin = useCallback(() => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    const t = ctx.currentTime;
    [392, 494, 587, 740, 784].forEach((f, i) => {
      playTone(ctx, f,     "triangle", t + i * 0.11, 0.38, 0.28);
      playTone(ctx, f * 2, "sine",     t + i * 0.11, 0.22, 0.06);
    });
    playNoise(ctx, t, 0.6, 400, 1, 0.06);
  }, []);

  // 7-note triumphant fanfare for mega+ wins
  const playMegaWin = useCallback(() => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    const t = ctx.currentTime;
    [330, 415, 494, 587, 698, 784, 988].forEach((f, i) => {
      playTone(ctx, f,         "triangle", t + i * 0.1,  0.45, 0.28);
      playTone(ctx, f * 1.498, "sine",     t + i * 0.1,  0.3,  0.08); // perfect fifth
      playTone(ctx, f * 2,     "sine",     t + i * 0.1,  0.2,  0.04);
    });
    // Sustained chord at end
    [392, 494, 587].forEach((f) => {
      playTone(ctx, f, "sine", t + 0.75, 0.8, 0.12);
    });
    playNoise(ctx, t, 0.9, 300, 0.8, 0.08);
  }, []);

  // Coin ping for shower effects
  const playCoinPing = useCallback(() => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    const t = ctx.currentTime;
    const freq = 900 + Math.random() * 400;
    playTone(ctx, freq, "sine", t, 0.12, 0.08);
  }, []);

  // Free spins fanfare
  const playFreeSpins = useCallback(() => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    const t = ctx.currentTime;
    // Upward swirl
    [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => {
      playTone(ctx, f,     "triangle", t + i * 0.08, 0.4,  0.25);
      playTone(ctx, f * 2, "sine",     t + i * 0.08, 0.25, 0.06);
    });
    // Final hold
    [523, 659, 784].forEach((f) => playTone(ctx, f, "sine", t + 0.65, 1.0, 0.15));
    playNoise(ctx, t + 0.5, 0.8, 2000, 3, 0.06);
  }, []);

  const playWin = useCallback((tier: WinTierSfx) => {
    if (tier === "small")       return playSmallWin();
    if (tier === "big")         return playBigWin();
    if (tier === "mega")        return playMegaWin();
    if (tier === "super")       return playMegaWin(); // same base, visual differs
    if (tier === "sensational") return playMegaWin(); // max visual, same audio
  }, [playSmallWin, playBigWin, playMegaWin]);

  return { playSpin, playReelStop, playWin, playCoinPing, playFreeSpins };
}
