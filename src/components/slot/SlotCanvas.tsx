/**
 * SlotCanvas — Premium Canvas-rendered 5-reel slot machine.
 * Renders reels, animations, particles, and effects at 60fps.
 */
import { useRef, useEffect } from "react";
import {
  SYMBOLS, NUM_REELS, NUM_ROWS, PAYLINES,
  generateGrid, evaluateWins, shouldAnticipate,
  weightedRandomSymbol,
  type SymbolDef, type WinResult,
} from "./SlotEngine";
import {
  easeOutExpo, easeOutBack,
  createWinParticles, updateParticles, drawParticle,
  createAmbientParticles, updateAmbientParticles,
  getShakeOffset, drawAnticipationEffect, drawWinHighlight,
  type Particle, type AmbientParticle, type ShakeState,
} from "./AnimationManager";
import { getSymbolCanvas } from "./SymbolRenderer";

// Layout
const REEL_PADDING = 6;
const SYMBOL_SIZE = 90;
const SYMBOL_RENDER_SIZE = 128;
const GAP = 4;
const CELL_H = SYMBOL_SIZE + GAP;
const REEL_W = SYMBOL_SIZE + REEL_PADDING * 2;
const REEL_GAP = 4;
const VISIBLE_H = NUM_ROWS * CELL_H - GAP;
const FRAME_PAD = 16;
const HEADER_H = 50;
const FOOTER_H = 0;

const CANVAS_W = NUM_REELS * REEL_W + (NUM_REELS - 1) * REEL_GAP + FRAME_PAD * 2;
const CANVAS_H = VISIBLE_H + FRAME_PAD * 2 + HEADER_H + FOOTER_H;

// Spin config
const BASE_SPIN_DURATION = 1200;
const REEL_DELAY = 150;
const EXTRA_SYMBOLS = 20;
const ANTICIPATION_EXTRA_DELAY = 1000;
const BOUNCE_DURATION = 24;

interface SlotCanvasProps {
  bet: number;
  balance: number;
  onBalanceChange: (delta: number) => void;
  onWin: (amount: number, isJackpot: boolean) => void;
  spinning: boolean;
  onSpinStart: () => void;
  onSpinEnd: () => void;
}

export default function SlotCanvas({
  bet, balance, onBalanceChange, onWin,
  spinning, onSpinStart, onSpinEnd,
}: SlotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const dprRef = useRef(1);

  const gridRef = useRef<SymbolDef[][]>(generateGrid());
  const targetGridRef = useRef<SymbolDef[][]>(generateGrid());
  const reelStartTimeRef = useRef<number[]>(Array(NUM_REELS).fill(0));
  const reelStoppedRef = useRef<boolean[]>(Array(NUM_REELS).fill(true));
  const spinActiveRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const ambientRef = useRef<AmbientParticle[]>([]);
  const shakeRef = useRef<ShakeState>({ active: false, intensity: 0, duration: 0, elapsed: 0 });
  const winResultsRef = useRef<WinResult[]>([]);
  const winFlashRef = useRef(0);
  const bounceRef = useRef<Map<string, number>>(new Map());
  const lightSweepRef = useRef(0);
  const anticipateRef = useRef(false);
  const reelStripsRef = useRef<SymbolDef[][]>(Array(NUM_REELS).fill([]));
  const timeRef = useRef(0);
  // Track reel-stop bounce (overshoot then settle)
  const reelBounceRef = useRef<number[]>(Array(NUM_REELS).fill(-1)); // -1 = inactive

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ambientRef.current = createAmbientParticles(CANVAS_W, CANVAS_H, 40);
  }, []);

  // Spin trigger
  useEffect(() => {
    if (!spinning || spinActiveRef.current) return;

    const target = generateGrid();
    targetGridRef.current = target;
    spinActiveRef.current = true;
    anticipateRef.current = false;
    winResultsRef.current = [];
    winFlashRef.current = 0;
    bounceRef.current.clear();
    reelBounceRef.current = Array(NUM_REELS).fill(-1);

    for (let r = 0; r < NUM_REELS; r++) {
      const strip: SymbolDef[] = [];
      for (let i = 0; i < EXTRA_SYMBOLS; i++) {
        strip.push(weightedRandomSymbol());
      }
      strip.push(...target[r]);
      reelStripsRef.current[r] = strip;
      reelStoppedRef.current[r] = false;
      reelStartTimeRef.current[r] = performance.now() + r * REEL_DELAY;
    }
  }, [spinning]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = dprRef.current;

    const render = (now: number) => {
      timeRef.current++;
      ctx.save();
      ctx.scale(dpr, dpr);

      // Shake
      const shake = shakeRef.current;
      if (shake.active) {
        shake.elapsed++;
        if (shake.elapsed >= shake.duration) shake.active = false;
      }
      const shakeOff = getShakeOffset(shake);
      ctx.translate(shakeOff.x, shakeOff.y);

      // Clear
      ctx.clearRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, "#0d0a1a");
      bgGrad.addColorStop(1, "#06040e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Ambient particles
      ambientRef.current = updateAmbientParticles(ambientRef.current, timeRef.current, CANVAS_H);
      for (const p of ambientRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 130, 255, ${p.alpha})`;
        ctx.fill();
      }

      // Light sweep
      lightSweepRef.current = (lightSweepRef.current + 0.004) % 1;
      const sweepX = lightSweepRef.current * (CANVAS_W + 200) - 100;
      const sweepGrad = ctx.createLinearGradient(sweepX - 80, 0, sweepX + 80, 0);
      sweepGrad.addColorStop(0, "rgba(255,255,255,0)");
      sweepGrad.addColorStop(0.5, "rgba(255,255,255,0.04)");
      sweepGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Frame border glow
      const frameGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
      frameGrad.addColorStop(0, "rgba(153,69,255,0.3)");
      frameGrad.addColorStop(0.5, "rgba(255,215,0,0.2)");
      frameGrad.addColorStop(1, "rgba(153,69,255,0.3)");
      ctx.strokeStyle = frameGrad;
      ctx.lineWidth = 2;
      roundRect(ctx, 1, 1, CANVAS_W - 2, CANVAS_H - 2, 16);
      ctx.stroke();

      // Draw reels
      const reelAreaY = HEADER_H + FRAME_PAD;
      for (let r = 0; r < NUM_REELS; r++) {
        const rx = FRAME_PAD + r * (REEL_W + REEL_GAP);

        // Reel background
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.stroke();

        // Clip
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, rx, reelAreaY, REEL_W, VISIBLE_H, 8);
        ctx.clip();

        if (!reelStoppedRef.current[r] && spinActiveRef.current) {
          const startTime = reelStartTimeRef.current[r];
          let duration = BASE_SPIN_DURATION + r * REEL_DELAY;
          if (r === NUM_REELS - 1 && anticipateRef.current) {
            duration += ANTICIPATION_EXTRA_DELAY;
          }

          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Use easeOutBack for overshoot feel on the last 30%
          const eased = progress < 0.7
            ? easeOutExpo(progress / 0.7) * 0.85
            : 0.85 + easeOutBack((progress - 0.7) / 0.3) * 0.15;

          const strip = reelStripsRef.current[r];
          const totalHeight = strip.length * CELL_H;
          const offset = Math.min(eased, 1.0) * (totalHeight - VISIBLE_H);

          // Motion blur — stronger during fast phase, fades smoothly
          if (progress > 0.02 && progress < 0.65) {
            const blurAmount = Math.sin((progress / 0.65) * Math.PI) * 3;
            ctx.filter = `blur(${blurAmount}px)`;
          }

          for (let i = 0; i < strip.length; i++) {
            const sy = i * CELL_H - offset;
            if (sy > -CELL_H && sy < VISIBLE_H + CELL_H) {
              const symCanvas = getSymbolCanvas(strip[i], SYMBOL_RENDER_SIZE);
              ctx.drawImage(
                symCanvas,
                rx + REEL_PADDING,
                reelAreaY + sy + (CELL_H - SYMBOL_SIZE) / 2,
                SYMBOL_SIZE, SYMBOL_SIZE
              );
            }
          }
          ctx.filter = "none";

          if (progress >= 1) {
            reelStoppedRef.current[r] = true;
            reelBounceRef.current[r] = 0; // start bounce animation
            gridRef.current[r] = targetGridRef.current[r];

            if (r === 3) {
              anticipateRef.current = shouldAnticipate(targetGridRef.current, 4);
            }

            if (reelStoppedRef.current.every(Boolean)) {
              spinActiveRef.current = false;
              const wins = evaluateWins(targetGridRef.current, bet);
              winResultsRef.current = wins;
              const totalWin = wins.reduce((s, w) => s + w.payout, 0);

              if (totalWin > 0) {
                winFlashRef.current = 90; // longer flash for premium feel

                for (const w of wins) {
                  for (let wr = 0; wr < w.count; wr++) {
                    const px = FRAME_PAD + wr * (REEL_W + REEL_GAP) + REEL_W / 2;
                    const py = reelAreaY + w.positions[wr] * CELL_H + CELL_H / 2;
                    particlesRef.current.push(
                      ...createWinParticles(px, py, 16, w.symbol.color)
                    );
                    bounceRef.current.set(`${wr}_${w.positions[wr]}`, 0);
                  }
                }

                if (totalWin >= bet * 10) {
                  shakeRef.current = { active: true, intensity: 8, duration: 30, elapsed: 0 };
                } else if (totalWin >= bet * 3) {
                  shakeRef.current = { active: true, intensity: 3, duration: 15, elapsed: 0 };
                }

                onWin(totalWin, totalWin >= bet * 20);
              }
              onSpinEnd();
            }
          }
        } else {
          // Static reel — draw with bounce and win highlights
          const currentGrid = gridRef.current[r];
          
          // Reel-stop bounce offset (whole reel bounces on stop)
          let reelBounceOff = 0;
          if (reelBounceRef.current[r] >= 0) {
            const bp = reelBounceRef.current[r];
            reelBounceRef.current[r]++;
            if (bp < BOUNCE_DURATION) {
              const t = bp / BOUNCE_DURATION;
              // Damped oscillation
              reelBounceOff = Math.sin(t * Math.PI * 3) * (1 - t) * 6;
            } else {
              reelBounceRef.current[r] = -1;
            }
          }

          for (let row = 0; row < NUM_ROWS; row++) {
            const sy = row * CELL_H;
            const sym = currentGrid[row];
            const bounceKey = `${r}_${row}`;
            let symbolBounce = 0;

            // Win symbol bounce — elastic
            if (bounceRef.current.has(bounceKey)) {
              const bp = bounceRef.current.get(bounceKey)!;
              bounceRef.current.set(bounceKey, bp + 1);
              if (bp < 30) {
                const t = bp / 30;
                symbolBounce = Math.sin(t * Math.PI * 2.5) * (1 - t) * -12;
              } else {
                bounceRef.current.delete(bounceKey);
              }
            }

            // Win highlight
            const isWinning = winResultsRef.current.some(
              (w) => w.positions[r] === row && r < w.count
            );
            if (isWinning && winFlashRef.current > 0) {
              const winSym = winResultsRef.current.find(
                (w) => w.positions[r] === row && r < w.count
              );
              drawWinHighlight(
                ctx, rx, reelAreaY + sy, REEL_W, CELL_H - GAP,
                winSym?.symbol.color ?? "#FFD700",
                winFlashRef.current / 90
              );
            }

            const symCanvas = getSymbolCanvas(sym, SYMBOL_RENDER_SIZE);
            // Win symbols scale up slightly
            const scale = isWinning && winFlashRef.current > 0
              ? 1 + Math.sin((winFlashRef.current / 90) * Math.PI * 3) * 0.06
              : 1;
            const drawSize = SYMBOL_SIZE * scale;
            const drawOffset = (SYMBOL_SIZE - drawSize) / 2;

            ctx.drawImage(
              symCanvas,
              rx + REEL_PADDING + drawOffset,
              reelAreaY + sy + (CELL_H - SYMBOL_SIZE) / 2 + symbolBounce + reelBounceOff + drawOffset,
              drawSize, drawSize
            );
          }
        }

        ctx.restore();

        // Top/bottom reel fade masks
        const fadeH = 18;
        const topFade = ctx.createLinearGradient(0, reelAreaY, 0, reelAreaY + fadeH);
        topFade.addColorStop(0, "#0d0a1a");
        topFade.addColorStop(1, "rgba(13,10,26,0)");
        ctx.fillStyle = topFade;
        ctx.fillRect(rx, reelAreaY, REEL_W, fadeH);

        const botFade = ctx.createLinearGradient(0, reelAreaY + VISIBLE_H - fadeH, 0, reelAreaY + VISIBLE_H);
        botFade.addColorStop(0, "rgba(13,10,26,0)");
        botFade.addColorStop(1, "#0d0a1a");
        ctx.fillStyle = botFade;
        ctx.fillRect(rx, reelAreaY + VISIBLE_H - fadeH, REEL_W, fadeH);
      }

      // Win payline indicators
      if (winFlashRef.current > 0) {
        winFlashRef.current--;
        for (const w of winResultsRef.current) {
          // Animated dash offset
          const dashOffset = timeRef.current * 2;
          ctx.strokeStyle = w.symbol.color + "90";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = dashOffset;
          ctx.beginPath();
          for (let wr = 0; wr < w.count; wr++) {
            const px = FRAME_PAD + wr * (REEL_W + REEL_GAP) + REEL_W / 2;
            const py = reelAreaY + w.positions[wr] * CELL_H + CELL_H / 2;
            if (wr === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          // Glow line
          ctx.strokeStyle = w.symbol.color + "30";
          ctx.lineWidth = 6;
          ctx.setLineDash([]);
          ctx.beginPath();
          for (let wr = 0; wr < w.count; wr++) {
            const px = FRAME_PAD + wr * (REEL_W + REEL_GAP) + REEL_W / 2;
            const py = reelAreaY + w.positions[wr] * CELL_H + CELL_H / 2;
            if (wr === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Particles — premium rendering
      particlesRef.current = updateParticles(particlesRef.current);
      for (const p of particlesRef.current) {
        drawParticle(ctx, p);
      }

      // Center payline marker
      const lineY = reelAreaY + 1 * CELL_H + CELL_H / 2;
      ctx.strokeStyle = "rgba(255,215,0,0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(FRAME_PAD - 4, lineY);
      ctx.lineTo(CANVAS_W - FRAME_PAD + 4, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Payline arrows
      for (const side of [-1, 1]) {
        const ax = side === -1 ? FRAME_PAD - 8 : CANVAS_W - FRAME_PAD + 8;
        ctx.fillStyle = "rgba(255,215,0,0.25)";
        ctx.beginPath();
        ctx.moveTo(ax, lineY - 5);
        ctx.lineTo(ax + side * 6, lineY);
        ctx.lineTo(ax, lineY + 5);
        ctx.closePath();
        ctx.fill();
      }

      // Anticipation effect on last reel
      if (anticipateRef.current && !reelStoppedRef.current[NUM_REELS - 1]) {
        const lastReelX = FRAME_PAD + (NUM_REELS - 1) * (REEL_W + REEL_GAP);
        drawAnticipationEffect(ctx, lastReelX, reelAreaY, REEL_W, VISIBLE_H, timeRef.current);
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [bet, onWin, onSpinEnd, spinning]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        maxWidth: "100%",
        borderRadius: 16,
      }}
    />
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
