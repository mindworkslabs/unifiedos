"use client";
/**
 * Synthesised terminal sounds (no game audio is shipped). Recipe after
 * AlrikOlson/robco-terminal: short sine+noise ticks, a mains hum, pass/fail tones.
 */

const KEY = "uos_sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let hum: { stop: () => void } | null = null;
let lastTick = 0;

export function soundEnabled() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  if (!on) stopHum();
  else startHum();
}

function audio() {
  if (!soundEnabled() || typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(freq: number, ms: number, vol: number, type: OscillatorType = "sine", noise = 0.35) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  g.connect(master);
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.01);
  if (noise > 0) {
    const len = Math.ceil((ac.sampleRate * ms) / 1000);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const ng = ac.createGain();
    ng.gain.value = vol * noise;
    src.connect(ng).connect(master);
    src.start(t);
  }
}

const TICKS: [number, number][] = [
  [1450, 6],
  [1260, 7],
  [2050, 4.5],
  [1560, 6.5],
];

/** Character tick while text types out (throttled). */
export function tick() {
  const now = performance.now();
  if (now - lastTick < 38) return;
  lastTick = now;
  const [f, ms] = TICKS[Math.floor(Math.random() * TICKS.length)];
  blip(f, ms, 0.05);
}

/** Keypress / cursor move. */
export function key() {
  const [f, ms] = TICKS[Math.floor(Math.random() * TICKS.length)];
  blip(f * 0.8, ms + 4, 0.12, "square", 0.6);
}

export function enter() {
  blip(520, 40, 0.14, "square", 0.8);
  setTimeout(() => blip(260, 50, 0.08, "square", 0.5), 25);
}

export function good() {
  blip(880, 90, 0.12, "square", 0);
  setTimeout(() => blip(1320, 160, 0.12, "square", 0), 100);
}

export function bad() {
  blip(180, 220, 0.16, "sawtooth", 0.2);
}

export function startHum() {
  const ac = audio();
  if (!ac || !master || hum) return;
  const g = ac.createGain();
  g.gain.value = 0.035;
  g.connect(master);
  const oscs = [
    [60, 0.38],
    [120, 0.16],
    [180, 0.1],
    [15700, 0.012],
  ].map(([f, v]) => {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.frequency.value = f;
    og.gain.value = v;
    o.connect(og).connect(g);
    o.start();
    return o;
  });
  hum = {
    stop: () => {
      oscs.forEach((o) => o.stop());
      g.disconnect();
    },
  };
}

export function stopHum() {
  hum?.stop();
  hum = null;
}
