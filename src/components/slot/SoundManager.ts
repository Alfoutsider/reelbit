/**
 * SoundManager — Procedural Web Audio API sounds for Dragon's Inferno slot.
 * No external audio files needed.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

// Ambient state
let ambientGain: GainNode | null = null;
let ambientOscs: OscillatorNode[] = [];
let ambientNoiseSource: AudioBufferSourceNode | null = null;
let ambientPlaying = false;
let ambientVolume = 0.5; // 0-1 user control

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

export function setMuted(m: boolean) {
  muted = m;
  if (masterGain) masterGain.gain.value = m ? 0 : 0.35;
  if (ambientGain) {
    ambientGain.gain.setTargetAtTime(m ? 0 : ambientVolume * 0.12, getCtx().currentTime, 0.3);
  }
}

export function isMuted(): boolean {
  return muted;
}

// ── AMBIENT SOUNDTRACK ──

/** Start the ambient volcanic drone loop */
export function startAmbient() {
  if (ambientPlaying) return;
  const ctx = getCtx();
  ambientPlaying = true;

  // Ambient gain node (separate from master for independent volume)
  ambientGain = ctx.createGain();
  ambientGain.gain.value = 0;
  ambientGain.connect(ctx.destination);
  // Fade in
  ambientGain.gain.setTargetAtTime(muted ? 0 : ambientVolume * 0.12, ctx.currentTime, 1.0);

  // Deep drone — root note with subtle movement
  const drone1 = ctx.createOscillator();
  drone1.type = "sine";
  drone1.frequency.value = 55; // A1 — deep bass
  const drone1Gain = ctx.createGain();
  drone1Gain.gain.value = 0.35;
  drone1.connect(drone1Gain);
  drone1Gain.connect(ambientGain);
  drone1.start();
  ambientOscs.push(drone1);

  // Second drone — perfect fifth
  const drone2 = ctx.createOscillator();
  drone2.type = "sine";
  drone2.frequency.value = 82.4; // E2
  const drone2Gain = ctx.createGain();
  drone2Gain.gain.value = 0.2;
  drone2.connect(drone2Gain);
  drone2Gain.connect(ambientGain);
  drone2.start();
  ambientOscs.push(drone2);

  // Warm pad — triangle wave with slow LFO modulation
  const pad = ctx.createOscillator();
  pad.type = "triangle";
  pad.frequency.value = 110; // A2
  const padGain = ctx.createGain();
  padGain.gain.value = 0.08;
  // LFO for pad tremolo
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.15; // Very slow
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.04;
  lfo.connect(lfoGain);
  lfoGain.connect(padGain.gain);
  lfo.start();
  pad.connect(padGain);
  padGain.connect(ambientGain);
  pad.start();
  ambientOscs.push(pad, lfo);

  // Eerie high harmonic
  const harmonic = ctx.createOscillator();
  harmonic.type = "sine";
  harmonic.frequency.value = 330; // E4
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.02;
  // Slow pitch wobble
  const wobble = ctx.createOscillator();
  wobble.type = "sine";
  wobble.frequency.value = 0.08;
  const wobbleGain = ctx.createGain();
  wobbleGain.gain.value = 3;
  wobble.connect(wobbleGain);
  wobbleGain.connect(harmonic.frequency);
  wobble.start();
  harmonic.connect(harmGain);
  harmGain.connect(ambientGain);
  harmonic.start();
  ambientOscs.push(harmonic, wobble);

  // Dark minor third — haunting flavor
  const minor = ctx.createOscillator();
  minor.type = "sine";
  minor.frequency.value = 130.8; // C3 (minor third of A)
  const minorGain = ctx.createGain();
  minorGain.gain.value = 0.03;
  // Slow fade in/out via LFO
  const minorLfo = ctx.createOscillator();
  minorLfo.type = "sine";
  minorLfo.frequency.value = 0.05;
  const minorLfoGain = ctx.createGain();
  minorLfoGain.gain.value = 0.02;
  minorLfo.connect(minorLfoGain);
  minorLfoGain.connect(minorGain.gain);
  minorLfo.start();
  minor.connect(minorGain);
  minorGain.connect(ambientGain);
  minor.start();
  ambientOscs.push(minor, minorLfo);

  // Filtered noise — volcanic rumble
  const noiseLen = 4;
  const bufferSize = ctx.sampleRate * noiseLen;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 200;
  lpf.Q.value = 1;
  
  // Slow filter sweep for movement
  const filterLfo = ctx.createOscillator();
  filterLfo.type = "sine";
  filterLfo.frequency.value = 0.07;
  const filterLfoGain = ctx.createGain();
  filterLfoGain.gain.value = 80;
  filterLfo.connect(filterLfoGain);
  filterLfoGain.connect(lpf.frequency);
  filterLfo.start();
  ambientOscs.push(filterLfo);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.15;
  noise.connect(lpf);
  lpf.connect(noiseGain);
  noiseGain.connect(ambientGain);
  noise.start();
  ambientNoiseSource = noise;
}

/** Stop the ambient soundtrack with fade out */
export function stopAmbient() {
  if (!ambientPlaying || !ambientGain) return;
  const ctx = getCtx();
  ambientGain.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
  
  // Clean up after fade
  setTimeout(() => {
    ambientOscs.forEach(o => { try { o.stop(); } catch {} });
    ambientOscs = [];
    if (ambientNoiseSource) { try { ambientNoiseSource.stop(); } catch {} }
    ambientNoiseSource = null;
    ambientGain = null;
    ambientPlaying = false;
  }, 3000);
}

/** Set ambient volume 0-1 */
export function setAmbientVolume(vol: number) {
  ambientVolume = Math.max(0, Math.min(1, vol));
  if (ambientGain && !muted) {
    ambientGain.gain.setTargetAtTime(ambientVolume * 0.12, getCtx().currentTime, 0.1);
  }
}

export function getAmbientVolume(): number {
  return ambientVolume;
}

export function isAmbientPlaying(): boolean {
  return ambientPlaying;
}

/** Quick oscillator helper */
function playTone(
  freq: number, duration: number, type: OscillatorType = "sine",
  gainVal = 0.3, rampDown = true, detune = 0
) {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.value = gainVal;
  if (rampDown) {
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/** Noise burst for percussive sounds */
function playNoise(duration: number, gainVal = 0.1, highpass = 2000) {
  if (muted) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = highpass;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainVal, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  
  source.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  source.start();
}

// ── SOUND EFFECTS ──

/** Spin lever pull — whoosh + mechanical click */
export function playSpin() {
  if (muted) return;
  // Descending whoosh
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
  
  // Mechanical click
  playNoise(0.04, 0.15, 3000);
  playTone(220, 0.06, "square", 0.06);
}

/** Individual reel stop — thud + click */
export function playReelStop(reelIndex: number) {
  if (muted) return;
  const pitch = 180 + reelIndex * 30;
  playTone(pitch, 0.08, "sine", 0.12);
  playNoise(0.03, 0.08, 4000);
  // Subtle resonance
  playTone(pitch * 1.5, 0.12, "triangle", 0.04);
}

/** Last reel stop — more dramatic thud */
export function playLastReelStop() {
  if (muted) return;
  playTone(120, 0.15, "sine", 0.2);
  playTone(180, 0.12, "triangle", 0.1);
  playNoise(0.06, 0.12, 2000);
}

/** Small win jingle */
export function playWin() {
  if (muted) return;
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.3, "sine", 0.15);
      playTone(freq * 2, 0.2, "triangle", 0.05);
    }, i * 80);
  });
}

/** Big win fanfare */
export function playBigWin() {
  if (muted) return;
  const fanfare = [523, 659, 784, 1047, 784, 1047];
  fanfare.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.4, "sine", 0.18);
      playTone(freq * 0.5, 0.5, "triangle", 0.08);
      playTone(freq * 1.5, 0.25, "sine", 0.06);
    }, i * 120);
  });
  // Sparkle noise
  setTimeout(() => playNoise(0.3, 0.04, 6000), 600);
}

/** Super/Mega win — epic rising fanfare */
export function playSuperWin() {
  if (muted) return;
  const epic = [261, 329, 392, 523, 659, 784, 1047, 1318];
  epic.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.5, "sine", 0.15);
      playTone(freq * 0.5, 0.6, "triangle", 0.08);
      playTone(freq * 2, 0.3, "sine", 0.04, true, Math.random() * 10);
    }, i * 100);
  });
  setTimeout(() => {
    playNoise(0.5, 0.06, 5000);
    playTone(1568, 1.0, "sine", 0.1);
  }, 800);
}

/** Tumble/cascade — symbols falling */
export function playTumble() {
  if (muted) return;
  // Descending crystalline cascade
  const cascade = [880, 784, 698, 587, 523];
  cascade.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.15, "sine", 0.08);
    }, i * 40);
  });
  playNoise(0.15, 0.03, 5000);
}

/** Symbols being removed (dissolve) */
export function playSymbolRemove() {
  if (muted) return;
  playTone(1200, 0.1, "sine", 0.06);
  playTone(900, 0.15, "triangle", 0.04);
  playNoise(0.08, 0.05, 6000);
}

/** Anticipation — suspenseful rising tone */
export function playAnticipation() {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.0);
  gain.gain.setValueAtTime(0.0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.8);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 1.1);
  
  // Tremolo
  const trem = ctx.createOscillator();
  const tremGain = ctx.createGain();
  trem.type = "triangle";
  trem.frequency.setValueAtTime(250, ctx.currentTime);
  trem.frequency.linearRampToValueAtTime(700, ctx.currentTime + 1.0);
  tremGain.gain.setValueAtTime(0.0, ctx.currentTime);
  tremGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.8);
  tremGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
  trem.connect(tremGain);
  tremGain.connect(getMaster());
  trem.start();
  trem.stop(ctx.currentTime + 1.1);
}

/** Free spins trigger — dramatic reveal */
export function playFreeSpinsTrigger() {
  if (muted) return;
  // Rising power chord
  const chord = [196, 247, 294, 392, 494, 587, 784];
  chord.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.8, "sine", 0.12);
      playTone(freq * 1.5, 0.6, "triangle", 0.05);
    }, i * 80);
  });
  // Impact
  setTimeout(() => {
    playTone(98, 0.8, "sine", 0.2);
    playNoise(0.2, 0.1, 1000);
  }, 560);
  // Sparkle shower
  setTimeout(() => {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => playTone(2000 + Math.random() * 2000, 0.2, "sine", 0.03), i * 60);
    }
  }, 700);
}

/** Button hover / click */
export function playClick() {
  if (muted) return;
  playTone(800, 0.04, "sine", 0.08);
  playNoise(0.02, 0.04, 5000);
}

/** Coin count / balance change tick */
export function playCoinTick() {
  if (muted) return;
  playTone(1400 + Math.random() * 400, 0.05, "sine", 0.06);
}

/** Scatter land — dramatic single scatter hit */
export function playScatterLand() {
  if (muted) return;
  playTone(440, 0.3, "sine", 0.15);
  playTone(880, 0.25, "triangle", 0.08);
  playTone(660, 0.35, "sine", 0.1);
  playNoise(0.1, 0.06, 3000);
}

/** Buy feature activation */
export function playBuyFeature() {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
  
  setTimeout(() => playTone(784, 0.3, "sine", 0.12), 200);
  setTimeout(() => playTone(1047, 0.4, "sine", 0.1), 350);
}
