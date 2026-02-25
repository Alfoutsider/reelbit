/**
 * AnimationManager — Premium animation state: easing, particles, screen shake, ring bursts.
 */

// Easing: easeOutExpo — smooth deceleration
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Easing: easeOutBack — overshoot bounce-back feel
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Easing: easeInOutQuad
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Easing: easeOutElastic — springy settle
export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type?: "spark" | "ring" | "trail";
  rotation?: number;
  rotationSpeed?: number;
}

export function createWinParticles(cx: number, cy: number, count: number, color: string): Particle[] {
  const particles: Particle[] = [];
  // Burst sparks
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 3 + Math.random() * 5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0, maxLife: 50 + Math.random() * 35,
      size: 2 + Math.random() * 4,
      color, alpha: 1,
      type: "spark",
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
    });
  }
  // Ring burst
  particles.push({
    x: cx, y: cy,
    vx: 0, vy: 0,
    life: 0, maxLife: 30,
    size: 4, color, alpha: 0.8,
    type: "ring",
  });
  // Trailing embers
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 0, maxLife: 60 + Math.random() * 40,
      size: 1 + Math.random() * 2,
      color, alpha: 0.7,
      type: "trail",
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.type === "ring" ? p.x : p.x + p.vx,
      y: p.type === "ring" ? p.y : p.y + p.vy,
      vx: p.type === "trail" ? p.vx * 0.97 : p.vx,
      vy: p.type === "trail" ? p.vy + 0.02 : p.vy + 0.08,
      life: p.life + 1,
      size: p.type === "ring" ? p.size + 2.5 : p.size * (p.type === "trail" ? 0.98 : 1),
      alpha: p.type === "ring"
        ? Math.max(0, 0.8 * (1 - p.life / p.maxLife))
        : Math.max(0, 1 - p.life / p.maxLife),
      rotation: (p.rotation ?? 0) + (p.rotationSpeed ?? 0),
    }))
    .filter((p) => p.life < p.maxLife);
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  const hexAlpha = Math.floor(p.alpha * 255).toString(16).padStart(2, "0");

  if (p.type === "ring") {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.strokeStyle = p.color + hexAlpha;
    ctx.lineWidth = Math.max(0.5, 3 - p.life * 0.15);
    ctx.stroke();
  } else if (p.type === "trail") {
    // Glowing dot with trail
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    grad.addColorStop(0, p.color + hexAlpha);
    grad.addColorStop(1, p.color + "00");
    ctx.fillStyle = grad;
    ctx.fillRect(p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
  } else {
    // Spark — diamond shape
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation ?? 0);
    ctx.beginPath();
    const s = p.size;
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.5, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.5, 0);
    ctx.closePath();
    ctx.fillStyle = p.color + hexAlpha;
    ctx.fill();
    // Inner glow
    ctx.fillStyle = "#FFFFFF" + Math.floor(p.alpha * 180).toString(16).padStart(2, "0");
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface AmbientParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  phase: number;
}

export function createAmbientParticles(width: number, height: number, count: number): AmbientParticle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 0.5 + Math.random() * 2.5,
    speed: 0.05 + Math.random() * 0.35,
    alpha: 0.08 + Math.random() * 0.25,
    phase: Math.random() * Math.PI * 2,
  }));
}

/** Draw ambient particle with soft glow halo */
export function drawAmbientParticle(ctx: CanvasRenderingContext2D, p: AmbientParticle, time: number) {
  const flicker = 0.7 + Math.sin(time * 0.03 + p.phase * 3) * 0.3;
  const glowSize = p.size * 4;
  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
  grad.addColorStop(0, `rgba(160, 140, 255, ${p.alpha * flicker})`);
  grad.addColorStop(0.4, `rgba(130, 100, 255, ${p.alpha * flicker * 0.4})`);
  grad.addColorStop(1, "rgba(130, 100, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(p.x - glowSize, p.y - glowSize, glowSize * 2, glowSize * 2);
  // Core bright point
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(220, 210, 255, ${p.alpha * flicker * 1.2})`;
  ctx.fill();
}

export function updateAmbientParticles(
  particles: AmbientParticle[], time: number, height: number
): AmbientParticle[] {
  return particles.map((p) => ({
    ...p,
    y: (p.y - p.speed + height) % height,
    alpha: 0.1 + Math.sin(time * 0.02 + p.phase) * 0.15,
  }));
}

/** Screen shake state */
export interface ShakeState {
  active: boolean;
  intensity: number;
  duration: number;
  elapsed: number;
}

export function getShakeOffset(shake: ShakeState): { x: number; y: number } {
  if (!shake.active || shake.elapsed >= shake.duration) return { x: 0, y: 0 };
  const progress = shake.elapsed / shake.duration;
  // Decay with a slight oscillation for premium feel
  const decay = Math.pow(1 - progress, 2);
  const osc = Math.sin(progress * Math.PI * 6);
  const intensity = shake.intensity * decay;
  return {
    x: osc * intensity * (Math.random() > 0.5 ? 1 : -1) * 0.7,
    y: (Math.random() - 0.5) * 2 * intensity,
  };
}

/** Draw anticipation effects on a reel area */
export function drawAnticipationEffect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  time: number
) {
  ctx.save();

  // Deep background glow — radiating from center
  const cx = x + w / 2, cy = y + h / 2;
  const pulse = 0.5 + Math.sin(time * 0.18) * 0.5;
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.7);
  outerGlow.addColorStop(0, `rgba(0, 255, 136, ${0.15 + pulse * 0.12})`);
  outerGlow.addColorStop(0.6, `rgba(0, 255, 100, ${0.06 + pulse * 0.04})`);
  outerGlow.addColorStop(1, "rgba(0, 255, 136, 0)");
  ctx.fillStyle = outerGlow;
  ctx.fillRect(x - 20, y - 20, w + 40, h + 40);

  // Inner gradient fill
  const glowAlpha = 0.18 + Math.sin(time * 0.2) * 0.12;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, `rgba(0, 255, 136, ${glowAlpha * 0.2})`);
  grad.addColorStop(0.5, `rgba(0, 255, 136, ${glowAlpha})`);
  grad.addColorStop(1, `rgba(0, 255, 136, ${glowAlpha * 0.2})`);
  ctx.fillStyle = grad;
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fill();

  // Double scanning line
  for (const speed of [3, -4.5]) {
    const scanY = y + (((time * speed) % h) + h) % h;
    const scanGrad = ctx.createLinearGradient(x, scanY - 15, x, scanY + 15);
    scanGrad.addColorStop(0, "rgba(0,255,136,0)");
    scanGrad.addColorStop(0.5, `rgba(0,255,136,${0.15 + pulse * 0.1})`);
    scanGrad.addColorStop(1, "rgba(0,255,136,0)");
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, 8);
    ctx.clip();
    ctx.fillStyle = scanGrad;
    ctx.fillRect(x, scanY - 15, w, 30);
    ctx.restore();
  }

  // Pulsing edge glow — double stroke
  const borderAlpha = 0.35 + Math.sin(time * 0.25) * 0.25;
  ctx.shadowColor = "#00FF88";
  ctx.shadowBlur = 18 + pulse * 10;
  ctx.strokeStyle = `rgba(0, 255, 136, ${borderAlpha})`;
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.stroke();
  ctx.shadowBlur = 6;
  ctx.strokeStyle = `rgba(0, 255, 200, ${borderAlpha * 0.5})`;
  ctx.lineWidth = 1;
  roundRectPath(ctx, x - 2, y - 2, w + 4, h + 4, 10);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}

/** Draw win symbol highlight with pulsing glow and bloom */
export function drawWinHighlight(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, flashProgress: number
) {
  ctx.save();
  const pulse = Math.sin(flashProgress * Math.PI * 5) * 0.5 + 0.5;
  const alpha = pulse * 0.4;
  const hexAlpha = Math.floor(alpha * 255).toString(16).padStart(2, "0");

  // Outer bloom
  ctx.shadowColor = color;
  ctx.shadowBlur = 20 + pulse * 15;
  const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.8);
  grad.addColorStop(0, color + hexAlpha);
  grad.addColorStop(0.6, color + Math.floor(alpha * 120).toString(16).padStart(2, "0"));
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(x - 10, y - 10, w + 20, h + 20);

  // Inner bright fill
  ctx.fillStyle = color + Math.floor(alpha * 0.5 * 255).toString(16).padStart(2, "0");
  roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 4);
  ctx.fill();

  // Border glow — double layer
  ctx.strokeStyle = color + Math.floor((0.4 + pulse * 0.4) * 255).toString(16).padStart(2, "0");
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 4);
  ctx.stroke();
  ctx.strokeStyle = "#FFFFFF" + Math.floor(pulse * 80).toString(16).padStart(2, "0");
  ctx.lineWidth = 1;
  roundRectPath(ctx, x + 4, y + 4, w - 8, h - 8, 3);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
