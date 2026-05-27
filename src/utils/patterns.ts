import type { OrderConfig, PatternPlan, PatternType, QuickPatternPreset, RunStep } from "../types/order";

const PATTERN_TYPES: PatternType[] = [
  "smooth-s-curve",
  "rocket-launch",
  "sunset-fade",
  "viral-spike",
  "micro-burst",
  "heartbeat",
  "sawtooth",
  "fibonacci-spiral",
];

interface OrganicPatternProfile {
  key: string;
  name: string;
  baseType: PatternType;
  runMultiplier: number;
  durationMultiplier: number;
  earlyBand: [number, number];
  midBand: [number, number];
  lateBand: [number, number];
  midSpikeChance: number;
  spikeBand: [number, number];
  dipChance: number;
  dipBand: [number, number];
  waveAmplitude: number;
}

interface OrganicPatternVariant {
  earlyBand: [number, number];
  midBand: [number, number];
  lateBand: [number, number];
  midSpikeChance: number;
  spikeBand: [number, number];
  dipChance: number;
  dipBand: [number, number];
  waveAmplitude: number;
  waveFrequency: number;
  timingShift: number;
}

const BASE_ORGANIC_PATTERN_LIBRARY: OrganicPatternProfile[] = [
  {
    key: "slow-growth",
    name: "slow-growth",
    baseType: "smooth-s-curve",
    runMultiplier: 1.12,
    durationMultiplier: 1.16,
    earlyBand: [0.74, 0.92],
    midBand: [1.0, 1.14],
    lateBand: [0.84, 1.03],
    midSpikeChance: 0.08,
    spikeBand: [1.1, 1.22],
    dipChance: 0.06,
    dipBand: [0.84, 0.94],
    waveAmplitude: 0.02,
  },
  {
    key: "viral-spike",
    name: "viral-spike",
    baseType: "viral-spike",
    runMultiplier: 0.9,
    durationMultiplier: 0.92,
    earlyBand: [0.76, 0.96],
    midBand: [1.06, 1.34],
    lateBand: [0.82, 1.02],
    midSpikeChance: 0.26,
    spikeBand: [1.22, 1.56],
    dipChance: 0.08,
    dipBand: [0.78, 0.92],
    waveAmplitude: 0.035,
  },
  {
    key: "delayed-explosion",
    name: "delayed-explosion",
    baseType: "sunset-fade",
    runMultiplier: 0.96,
    durationMultiplier: 1.02,
    earlyBand: [0.7, 0.88],
    midBand: [0.94, 1.18],
    lateBand: [1.06, 1.3],
    midSpikeChance: 0.15,
    spikeBand: [1.14, 1.34],
    dipChance: 0.06,
    dipBand: [0.82, 0.94],
    waveAmplitude: 0.03,
  },
  {
    key: "wave-pattern",
    name: "wave-pattern",
    baseType: "heartbeat",
    runMultiplier: 1.02,
    durationMultiplier: 1,
    earlyBand: [0.82, 1.02],
    midBand: [0.96, 1.24],
    lateBand: [0.82, 1.06],
    midSpikeChance: 0.12,
    spikeBand: [1.1, 1.3],
    dipChance: 0.1,
    dipBand: [0.76, 0.92],
    waveAmplitude: 0.06,
  },
  {
    key: "plateau-growth",
    name: "plateau-growth",
    baseType: "sawtooth",
    runMultiplier: 1.08,
    durationMultiplier: 1.1,
    earlyBand: [0.86, 1.02],
    midBand: [0.94, 1.12],
    lateBand: [0.86, 1.04],
    midSpikeChance: 0.06,
    spikeBand: [1.08, 1.18],
    dipChance: 0.05,
    dipBand: [0.86, 0.95],
    waveAmplitude: 0.018,
  },
  {
    key: "drop-recovery",
    name: "sudden-drop-recovery",
    baseType: "heartbeat",
    runMultiplier: 1,
    durationMultiplier: 1,
    earlyBand: [0.88, 1.1],
    midBand: [0.82, 1.3],
    lateBand: [0.88, 1.18],
    midSpikeChance: 0.1,
    spikeBand: [1.12, 1.24],
    dipChance: 0.16,
    dipBand: [0.68, 0.88],
    waveAmplitude: 0.052,
  },
  {
    key: "exponential-growth",
    name: "exponential-growth",
    baseType: "fibonacci-spiral",
    runMultiplier: 0.88,
    durationMultiplier: 0.95,
    earlyBand: [0.72, 0.88],
    midBand: [1.0, 1.22],
    lateBand: [1.06, 1.34],
    midSpikeChance: 0.14,
    spikeBand: [1.14, 1.3],
    dipChance: 0.05,
    dipBand: [0.84, 0.94],
    waveAmplitude: 0.022,
  },
  {
    key: "organic-spread",
    name: "random-organic-spread",
    baseType: "micro-burst",
    runMultiplier: 1,
    durationMultiplier: 1,
    earlyBand: [0.78, 1.02],
    midBand: [0.96, 1.3],
    lateBand: [0.82, 1.06],
    midSpikeChance: 0.18,
    spikeBand: [1.12, 1.36],
    dipChance: 0.12,
    dipBand: [0.74, 0.92],
    waveAmplitude: 0.05,
  },
  {
    key: "multi-spike-viral",
    name: "multi-spike-viral",
    baseType: "viral-spike",
    runMultiplier: 0.92,
    durationMultiplier: 0.9,
    earlyBand: [0.76, 0.98],
    midBand: [1.08, 1.42],
    lateBand: [0.8, 1],
    midSpikeChance: 0.3,
    spikeBand: [1.24, 1.64],
    dipChance: 0.08,
    dipBand: [0.78, 0.9],
    waveAmplitude: 0.034,
  },
  {
    key: "gradual-decay",
    name: "gradual-decay",
    baseType: "rocket-launch",
    runMultiplier: 1.04,
    durationMultiplier: 1.08,
    earlyBand: [0.98, 1.22],
    midBand: [0.92, 1.12],
    lateBand: [0.74, 0.96],
    midSpikeChance: 0.08,
    spikeBand: [1.06, 1.22],
    dipChance: 0.12,
    dipBand: [0.72, 0.9],
    waveAmplitude: 0.02,
  },
  {
    key: "weekend-burst",
    name: "weekend-burst",
    baseType: "micro-burst",
    runMultiplier: 0.95,
    durationMultiplier: 0.84,
    earlyBand: [0.84, 1.02],
    midBand: [1.04, 1.32],
    lateBand: [0.86, 1.08],
    midSpikeChance: 0.2,
    spikeBand: [1.2, 1.45],
    dipChance: 0.08,
    dipBand: [0.8, 0.93],
    waveAmplitude: 0.042,
  },
  {
    key: "late-night-wave",
    name: "late-night-wave",
    baseType: "heartbeat",
    runMultiplier: 1.06,
    durationMultiplier: 1.18,
    earlyBand: [0.78, 0.95],
    midBand: [0.94, 1.18],
    lateBand: [0.96, 1.24],
    midSpikeChance: 0.1,
    spikeBand: [1.1, 1.24],
    dipChance: 0.1,
    dipBand: [0.76, 0.92],
    waveAmplitude: 0.058,
  },
  {
    key: "morning-ramp",
    name: "morning-ramp",
    baseType: "smooth-s-curve",
    runMultiplier: 1,
    durationMultiplier: 0.9,
    earlyBand: [0.74, 0.9],
    midBand: [1.02, 1.26],
    lateBand: [0.9, 1.08],
    midSpikeChance: 0.12,
    spikeBand: [1.14, 1.34],
    dipChance: 0.07,
    dipBand: [0.8, 0.94],
    waveAmplitude: 0.03,
  },
  {
    key: "lunch-hour-surge",
    name: "lunch-hour-surge",
    baseType: "viral-spike",
    runMultiplier: 0.96,
    durationMultiplier: 0.88,
    earlyBand: [0.8, 0.98],
    midBand: [1.08, 1.36],
    lateBand: [0.84, 1.04],
    midSpikeChance: 0.24,
    spikeBand: [1.2, 1.52],
    dipChance: 0.08,
    dipBand: [0.78, 0.9],
    waveAmplitude: 0.034,
  },
  {
    key: "double-plateau",
    name: "double-plateau",
    baseType: "sawtooth",
    runMultiplier: 1.1,
    durationMultiplier: 1.14,
    earlyBand: [0.86, 1.04],
    midBand: [0.92, 1.12],
    lateBand: [0.88, 1.04],
    midSpikeChance: 0.05,
    spikeBand: [1.06, 1.18],
    dipChance: 0.05,
    dipBand: [0.86, 0.94],
    waveAmplitude: 0.016,
  },
  {
    key: "staggered-spike",
    name: "staggered-spike",
    baseType: "micro-burst",
    runMultiplier: 0.94,
    durationMultiplier: 0.92,
    earlyBand: [0.8, 0.98],
    midBand: [1.04, 1.32],
    lateBand: [0.84, 1],
    midSpikeChance: 0.22,
    spikeBand: [1.18, 1.48],
    dipChance: 0.08,
    dipBand: [0.78, 0.9],
    waveAmplitude: 0.038,
  },
  {
    key: "quiet-then-boom",
    name: "quiet-then-boom",
    baseType: "sunset-fade",
    runMultiplier: 0.9,
    durationMultiplier: 1,
    earlyBand: [0.66, 0.84],
    midBand: [0.94, 1.16],
    lateBand: [1.12, 1.38],
    midSpikeChance: 0.2,
    spikeBand: [1.18, 1.44],
    dipChance: 0.06,
    dipBand: [0.82, 0.92],
    waveAmplitude: 0.028,
  },
  {
    key: "echo-wave",
    name: "echo-wave",
    baseType: "heartbeat",
    runMultiplier: 1.03,
    durationMultiplier: 1.06,
    earlyBand: [0.84, 1.04],
    midBand: [0.96, 1.2],
    lateBand: [0.86, 1.1],
    midSpikeChance: 0.12,
    spikeBand: [1.1, 1.26],
    dipChance: 0.1,
    dipBand: [0.74, 0.9],
    waveAmplitude: 0.062,
  },
  {
    key: "arc-rise",
    name: "arc-rise",
    baseType: "fibonacci-spiral",
    runMultiplier: 0.96,
    durationMultiplier: 0.96,
    earlyBand: [0.76, 0.92],
    midBand: [0.98, 1.18],
    lateBand: [1.02, 1.28],
    midSpikeChance: 0.12,
    spikeBand: [1.12, 1.3],
    dipChance: 0.06,
    dipBand: [0.82, 0.92],
    waveAmplitude: 0.024,
  },
    {
    key: "momentum-shift",
    name: "momentum-shift",
    baseType: "rocket-launch",
    runMultiplier: 0.98,
    durationMultiplier: 0.94,
    earlyBand: [0.9, 1.18],
    midBand: [0.92, 1.16],
    lateBand: [0.8, 1.02],
    midSpikeChance: 0.14,
    spikeBand: [1.12, 1.34],
    dipChance: 0.09,
    dipBand: [0.76, 0.9],
    waveAmplitude: 0.026,
  },

  // 🔥 NEW: More unique S-curve profiles for slow burn
  {
    key: "deep-s-curve",
    name: "deep-s-curve",
    baseType: "smooth-s-curve",
    runMultiplier: 1.22,
    durationMultiplier: 1.34,
    earlyBand: [0.62, 0.82],
    midBand: [1.08, 1.28],
    lateBand: [0.82, 1.02],
    midSpikeChance: 0.05,
    spikeBand: [1.06, 1.18],
    dipChance: 0.03,
    dipBand: [0.88, 0.96],
    waveAmplitude: 0.018,
  },
  {
    key: "lazy-rise-s",
    name: "lazy-rise-s",
    baseType: "smooth-s-curve",
    runMultiplier: 1.28,
    durationMultiplier: 1.42,
    earlyBand: [0.58, 0.78],
    midBand: [1.04, 1.22],
    lateBand: [0.84, 1.04],
    midSpikeChance: 0.04,
    spikeBand: [1.04, 1.14],
    dipChance: 0.03,
    dipBand: [0.9, 0.97],
    waveAmplitude: 0.016,
  },
  {
    key: "sigmoid-drift",
    name: "sigmoid-drift",
    baseType: "smooth-s-curve",
    runMultiplier: 1.18,
    durationMultiplier: 1.3,
    earlyBand: [0.66, 0.84],
    midBand: [1.1, 1.3],
    lateBand: [0.86, 1.04],
    midSpikeChance: 0.06,
    spikeBand: [1.08, 1.2],
    dipChance: 0.04,
    dipBand: [0.87, 0.95],
    waveAmplitude: 0.02,
  },
  {
    key: "wide-swell-s",
    name: "wide-swell-s",
    baseType: "smooth-s-curve",
    runMultiplier: 1.3,
    durationMultiplier: 1.5,
    earlyBand: [0.64, 0.82],
    midBand: [1.12, 1.32],
    lateBand: [0.8, 1.0],
    midSpikeChance: 0.05,
    spikeBand: [1.06, 1.16],
    dipChance: 0.04,
    dipBand: [0.88, 0.95],
    waveAmplitude: 0.017,
  },
];

const EXTRA_PATTERN_COUNT = 100;
const EXTRA_PATTERN_PREFIXES = [
  "aurora", "ember", "pulse", "ripple", "glide",
  "nova", "drift", "cascade", "surge", "orbit",
];
const EXTRA_PATTERN_SUFFIXES = [
  "arc", "lift", "trail", "burst", "echo",
  "crest", "flow", "flare", "wave", "rise",
];

function createGeneratedPattern(template: OrganicPatternProfile, index: number): OrganicPatternProfile {
  const seed = index + 1;
  const seeded = (offset: number) => {
    const value = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const between = (min: number, max: number, offset: number) => min + seeded(offset) * (max - min);
  const tweak = (index % 13) / 100;
  const jitter = ((index * 7) % 9) / 100;
  const key = `${EXTRA_PATTERN_PREFIXES[Math.floor(index / EXTRA_PATTERN_SUFFIXES.length)]}-${EXTRA_PATTERN_SUFFIXES[index % EXTRA_PATTERN_SUFFIXES.length]}-${index + 1}`;

  return {
    key,
    name: key,
    baseType: template.baseType,
    runMultiplier: clampValue(template.runMultiplier + tweak - 0.06, 0.78, 1.28),
    durationMultiplier: clampValue(template.durationMultiplier + jitter - 0.04, 0.78, 1.3),
    earlyBand: [
      clampValue(template.earlyBand[0] + between(-0.06, 0.06, 1), 0.58, 1.12),
      clampValue(template.earlyBand[1] + between(-0.06, 0.08, 2), 0.66, 1.24),
    ],
    midBand: [
      clampValue(template.midBand[0] + between(-0.06, 0.08, 3), 0.72, 1.28),
      clampValue(template.midBand[1] + between(-0.05, 0.12, 4), 0.9, 1.54),
    ],
    lateBand: [
      clampValue(template.lateBand[0] + between(-0.06, 0.08, 5), 0.68, 1.2),
      clampValue(template.lateBand[1] + between(-0.04, 0.1, 6), 0.84, 1.42),
    ],
    midSpikeChance: clampValue(template.midSpikeChance + between(-0.05, 0.09, 7), 0.03, 0.42),
    spikeBand: [
      clampValue(template.spikeBand[0] + between(-0.08, 0.1, 8), 1.02, 1.5),
      clampValue(template.spikeBand[1] + between(-0.06, 0.16, 9), 1.12, 1.78),
    ],
    dipChance: clampValue(template.dipChance + between(-0.04, 0.08, 10), 0.02, 0.26),
    dipBand: [
      clampValue(template.dipBand[0] + between(-0.07, 0.05, 11), 0.62, 0.96),
      clampValue(template.dipBand[1] + between(-0.06, 0.06, 12), 0.74, 0.98),
    ],
    waveAmplitude: clampValue(template.waveAmplitude + between(-0.018, 0.03, 13), 0.012, 0.11),
  };
}

const GENERATED_ORGANIC_PATTERNS: OrganicPatternProfile[] = Array.from({ length: EXTRA_PATTERN_COUNT }, (_, index) => {
  const template = BASE_ORGANIC_PATTERN_LIBRARY[index % BASE_ORGANIC_PATTERN_LIBRARY.length];
  return createGeneratedPattern(template, index);
});

const ORGANIC_PATTERN_LIBRARY: OrganicPatternProfile[] = [
  ...BASE_ORGANIC_PATTERN_LIBRARY,
  ...GENERATED_ORGANIC_PATTERNS,
];

let lastPatternKey: string | null = null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// 🔥 FIX #6: Seeded RNG.
//   Old code used Math.random() inline, so every regen of the plan rolled
//   different numbers — the preview the user saw was NOT the plan that
//   eventually got submitted. Now we use a deterministic mulberry32
//   generator that is reseeded at the top of createPatternPlan() based on
//   `config.seed`. Same config + same seed ⇒ identical plan, every time.
//
//   Callers that omit `config.seed` get the original behaviour (Math.random)
//   so nothing in the codebase has to change at once.
let __rngSource: () => number = Math.random;
function setRngSeed(seed: number | undefined): void {
  if (seed === undefined || seed === null || !Number.isFinite(seed)) {
    __rngSource = Math.random;
    return;
  }
  // mulberry32 — small, fast, good-enough distribution for this purpose
  let a = (seed >>> 0) || 1;
  __rngSource = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = (min: number, max: number) => __rngSource() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(random(min, max + 1));

function pickRandomPatternType(): PatternType {
  return PATTERN_TYPES[randomInt(0, PATTERN_TYPES.length - 1)];
}

interface PresetProfile {
  patternType?: PatternType;
  runMultiplier: number;
  durationMultiplier: number;
  varianceMultiplier: number;
  targetAverageViews: number;
}

function resolvePresetProfile(preset: QuickPatternPreset | null): PresetProfile {
  if (preset === "viral-boost") {
    return { patternType: "viral-spike", runMultiplier: 0.8, durationMultiplier: 0.7, varianceMultiplier: 1.3, targetAverageViews: 220 };
  }
  if (preset === "fast-start") {
    return { patternType: "rocket-launch", runMultiplier: 0.75, durationMultiplier: 0.65, varianceMultiplier: 1.05, targetAverageViews: 230 };
  }
  if (preset === "trending-push") {
    return { patternType: "viral-spike", runMultiplier: 0.9, durationMultiplier: 0.95, varianceMultiplier: 1.15, targetAverageViews: 195 };
  }
    if (preset === "slow-burn") {
    return {
      patternType: "smooth-s-curve",
      runMultiplier: 1.32,
      durationMultiplier: 1.48,
      varianceMultiplier: 0.55,
      targetAverageViews: 130,
    };
  }
  return { runMultiplier: 1, durationMultiplier: 1, varianceMultiplier: 1, targetAverageViews: 180 };
}

function withBandNoise(band: [number, number], amount = 0.08): [number, number] {
  const min = Math.max(0.45, band[0] + random(-amount, amount));
  const max = Math.max(min + 0.02, band[1] + random(-amount, amount));
  return [min, max];
}

function createPatternVariant(profile: OrganicPatternProfile): OrganicPatternVariant {
  return {
    earlyBand: withBandNoise(profile.earlyBand),
    midBand: withBandNoise(profile.midBand),
    lateBand: withBandNoise(profile.lateBand),
    midSpikeChance: clamp(profile.midSpikeChance + random(-0.04, 0.08), 0.02, 0.45),
    spikeBand: withBandNoise(profile.spikeBand, 0.12),
    dipChance: clamp(profile.dipChance + random(-0.04, 0.06), 0.01, 0.28),
    dipBand: withBandNoise(profile.dipBand, 0.1),
    waveAmplitude: clamp(profile.waveAmplitude + random(-0.02, 0.03), 0.01, 0.11),
    waveFrequency: random(1.4, 3.8),
    timingShift: random(-0.15, 0.15),
  };
}

function pickPatternProfile(presetType: PatternType | undefined): OrganicPatternProfile {
  const pool = presetType
    ? ORGANIC_PATTERN_LIBRARY.filter((profile) => profile.baseType === presetType)
    : ORGANIC_PATTERN_LIBRARY;

  const candidates = pool.length > 0 ? pool : ORGANIC_PATTERN_LIBRARY;
  let picked = candidates[randomInt(0, candidates.length - 1)];

  if (candidates.length > 1 && lastPatternKey === picked.key) {
    const alternatives = candidates.filter((profile) => profile.key !== lastPatternKey);
    picked = alternatives[randomInt(0, alternatives.length - 1)];
  }

  lastPatternKey = picked.key;
  return picked;
}

function resolveDurationHours(config: OrderConfig): number {
  if (config.delivery.mode === "custom" || config.delivery.mode === "preset") return config.delivery.hours;
  // Viral clipping campaigns can be made in 1–4 days too.
  // Auto stays short for small/medium orders and stretches only for very large pushes.
  const automatic = 18 + Math.sqrt(Math.max(800, config.totalViews)) / 8;
  return clamp(automatic, 24, 168);
}

function pickWeightedIndex(weights: number[]): number {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) return randomInt(0, Math.max(0, weights.length - 1));
  const threshold = random(0, sum);
  let cursor = 0;
  for (let index = 0; index < weights.length; index += 1) {
    cursor += weights[index];
    if (threshold <= cursor) return index;
  }
  return Math.max(0, weights.length - 1);
}

function resolveRunCount(totalViews: number, desiredRuns: number, averageTarget: number, minViewsPerRun: number): number {
  if (totalViews <= 0) return 1;
  if (totalViews < minViewsPerRun) return 1;

  const maxRunsByMinimum = Math.max(1, Math.floor(totalViews / minViewsPerRun));
  // 🔥 Allow up to 200 runs max in auto mode
  let runCount = clamp(desiredRuns, 1, Math.min(200, maxRunsByMinimum));

  while (runCount > 1 && totalViews / runCount < minViewsPerRun * 1.3) {
    runCount -= 1;
  }

  // 🔥 Relaxed average bound — allow more runs for high view counts
  const safeDivisor = Math.max(minViewsPerRun, Math.floor(averageTarget * 0.7), 1);
  const averageBound = Math.max(1, Math.floor(totalViews / safeDivisor));
  runCount = Math.min(runCount, Math.max(1, Math.min(200, averageBound)));

  return Math.max(1, runCount);
}
interface CurveContext {
  spikes: Array<{ center: number; width: number; height: number }>;
  burstAnchors: number[];
  phase: number;
  stepCount: number;
  wobble: number;
}

function createCurveContext(type: PatternType): CurveContext {
  const spikeCount = type === "viral-spike" ? randomInt(2, 4) : 0;
  const spikes = Array.from({ length: spikeCount }, () => ({
    center: random(0.25, 0.85),
    width: random(0.03, 0.09),
    height: random(0.08, 0.2),
  }));

  return {
    spikes,
    burstAnchors: [random(0.15, 0.25), random(0.4, 0.55), random(0.7, 0.88)],
    phase: random(0, Math.PI * 2),
    stepCount: randomInt(8, 14),
    wobble: random(0.006, 0.018),
    macroType: randomInt(1, 4),
  };
}

function curveValue(type: PatternType, t: number, context: CurveContext): number {
  const macro = (context as any).macroType || 1;
  let value = 0;

  if (type === "smooth-s-curve") {
    value = 1 / (1 + Math.exp(-10 * (t - 0.5)));
  } else if (type === "rocket-launch") {
    const k = 5.2;
    value = (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
  } else if (type === "sunset-fade") {
    const k = 4.1;
    value = (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
  } else if (type === "viral-spike") {
    const base = 1 / (1 + Math.exp(-8 * (t - 0.48)));
    const spikeLift = context.spikes.reduce(
      (acc, spike) => acc + Math.exp(-Math.pow((t - spike.center) / spike.width, 2)) * spike.height,
      0
    );
    value = base + spikeLift;
  } else if (type === "heartbeat") {
    const base = Math.pow(t, 1.08);
    const pulse = Math.sin((t * 9.5 + 0.15) * Math.PI + context.phase) * 0.055 * (1 - t * 0.3);
    const microPulse = Math.sin((t * 19 + 0.2) * Math.PI + context.phase * 0.5) * 0.02;
    value = base + pulse + microPulse;
  } else if (type === "sawtooth") {
    const step = Math.floor(t * context.stepCount) / context.stepCount;
    const remainder = (t * context.stepCount) % 1;
    value = step * 0.86 + remainder * 0.14;
  } else if (type === "micro-burst") {
    const [a, b, c] = context.burstAnchors;
    const jump1 = t >= a ? 0.12 : 0;
    const jump2 = t >= b ? 0.16 : 0;
    const jump3 = t >= c ? 0.2 : 0;
    const drift = t * 0.58;
    const micro = Math.sin(t * 18 * Math.PI + context.phase) * 0.015;
    value = drift + jump1 + jump2 + jump3 + micro;
  } else {
    const phi = 1.618;
    value = Math.pow(t, phi) + Math.pow(t, 2.6) * 0.18;
  }

  if (macro === 1) value += Math.exp(-Math.pow((t - 0.6) / 0.15, 2)) * 0.25;
  if (macro === 2) value += Math.exp(-t * 4) * 0.2;
  if (macro === 3 && t > 0.5) value += Math.pow((t - 0.5) * 2, 2) * 0.4;
  if (macro === 4) value += Math.sin(t * Math.PI * 3) * 0.08;

  return value;
}

function normalizeMonotone(values: number[]): number[] {
  const series = [...values];
  for (let index = 1; index < series.length; index += 1) {
    series[index] = Math.max(series[index], series[index - 1] + 0.0001);
  }
  const first = series[0];
  const last = series[series.length - 1];
  const span = Math.max(0.0001, last - first);
  return series.map((value) => (value - first) / span);
}

function allocateRounded(values: number[], total: number): number[] {
  if (values.length === 0) return [];
  const floors = values.map((value) => Math.floor(value));
  let remainder = total - floors.reduce((acc, value) => acc + value, 0);
  const order = values
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    floors[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  return floors;
}

function redistributeForMinimum(runs: number[], minimum: number): number[] {
  if (runs.length <= 1) return [...runs];
  const result = [...runs];
  const total = result.reduce((a, b) => a + b, 0);
  if (total <= 0) return result;
  if (total < minimum) return [total];

  for (let index = 0; index < result.length; index += 1) {
    if (result[index] >= minimum) continue;
    let deficit = minimum - result[index];
    let safetyCounter = 0;
    while (deficit > 0 && safetyCounter < result.length * 2) {
      safetyCounter++;
      let donor = -1;
      let donorExcess = 0;
      for (let candidate = 0; candidate < result.length; candidate += 1) {
        if (candidate === index) continue;
        const excess = result[candidate] - minimum;
        if (excess > donorExcess) {
          donorExcess = excess;
          donor = candidate;
        }
      }
      if (donor < 0 || donorExcess <= 0) break;
      const transfer = Math.min(deficit, donorExcess);
      result[index] += transfer;
      result[donor] -= transfer;
      deficit -= transfer;
    }
  }

  let mergeIterations = 0;
  const maxMergeIterations = result.length * 2;
  for (let index = 0; index < result.length && mergeIterations < maxMergeIterations; index += 1) {
    mergeIterations++;
    if (result[index] >= minimum || result.length === 1) continue;
    if (index === result.length - 1) {
      result[index - 1] += result[index];
      result.splice(index, 1);
    } else {
      result[index + 1] += result[index];
      result.splice(index, 1);
      index -= 1;
    }
  }

  return result;
}

function distributeWithMinimum(weights: number[], total: number, minimum: number): number[] {
  if (total <= 0) return [0];
  if (total < minimum) return [total];
  if (weights.length === 0) return [total];

  const count = clamp(weights.length, 1, Math.max(1, Math.floor(total / minimum)));
  if (count <= 0) return [total];

  const localWeights = weights.slice(0, count).map((weight) => Math.max(0.01, weight));
  const weightSum = localWeights.reduce((acc, value) => acc + value, 0);

  if (weightSum <= 0) {
    const perRun = Math.floor(total / count);
    const result = Array.from({ length: count }, () => perRun);
    result[0] += total - perRun * count;
    return result;
  }

  const baseline = count * minimum;
  const remainder = Math.max(0, total - baseline);
  const rawExtras = localWeights.map((weight) => (weight / weightSum) * remainder);
  const extras = allocateRounded(rawExtras, remainder);
  return extras.map((extra) => extra + minimum);
}

function nudgeConsecutiveDuplicates(values: number[], minimum: number): number[] {
  if (values.length < 2) return values;
  const result = [...values];

  for (let index = 1; index < result.length; index += 1) {
    if (result[index] !== result[index - 1]) continue;
    const canRaiseCurrent = index < result.length - 1 || result[index - 1] > minimum;
    if (canRaiseCurrent) {
      result[index] += 1;
      let donated = false;
      if (index < result.length - 1 && result[index + 1] > minimum) {
        result[index + 1] -= 1;
        donated = true;
      } else {
        for (let donor = result.length - 1; donor >= 0; donor -= 1) {
          if (donor !== index && result[donor] > minimum) {
            result[donor] -= 1;
            donated = true;
            break;
          }
        }
      }
      if (!donated) result[index] -= 1;
    }
  }

  return result;
}

function generateViewRunsFromCurve(
  patternType: PatternType,
  totalViews: number,
  runCount: number,
  variancePercent: number,
  preset: QuickPatternPreset | null,
  variant: OrganicPatternVariant,
  minViewsPerRun: number
): number[] {
  if (totalViews <= 0) return [0];
  if (runCount <= 0) return [totalViews];
  if (runCount === 1) return [totalViews];

    // 🔥 Use exact requested run count — effectiveMinViews already adjusted by caller
  const safeRunCount = runCount;

  const context = createCurveContext(patternType);
  const varianceFactor = clamp(variancePercent, 10, 50) / 100;
  const presetVarianceBoost = preset === "viral-boost" ? 1.2 : preset === "slow-burn" ? 0.8 : 1;
  const noiseAmplitude = clamp(0.01 + varianceFactor * 0.02 * presetVarianceBoost, 0.01, 0.03);

  const cumulativeRaw = Array.from({ length: safeRunCount + 1 }, (_, index) => {
    const t = index / safeRunCount;
    const base = curveValue(patternType, t, context);
    const wiggle = 1 + random(-noiseAmplitude, noiseAmplitude) + Math.sin((index + 1) * 0.8 + context.phase) * context.wobble;
    return base * wiggle;
  });

  const cumulative = normalizeMonotone(cumulativeRaw);
  const rampRuns = Math.max(3, Math.min(5, Math.floor(safeRunCount * 0.2)));

  const incrementsRaw = Array.from({ length: safeRunCount }, (_, index) => {
    const phase = index / Math.max(1, safeRunCount - 1);
    const delta = Math.max(0.00001, cumulative[index + 1] - cumulative[index]);
    const shapeVariance = random(1 - varianceFactor * 0.55, 1 + varianceFactor * 0.7);
    const wave = 1 + Math.sin((phase + variant.timingShift) * Math.PI * variant.waveFrequency) * variant.waveAmplitude;
    let phaseFactor = 1;

                   if (phase < 0.2) {
      phaseFactor = random(variant.earlyBand[0], variant.earlyBand[1]);
    } else if (phase <= 0.8) {
      phaseFactor = random(variant.midBand[0], variant.midBand[1]);
      const spikeChance = phase > 0.32 && phase < 0.72
        ? variant.midSpikeChance + varianceFactor * 0.08
        : variant.midSpikeChance * 0.4;
      if (__rngSource() < spikeChance) {
        phaseFactor *= random(variant.spikeBand[0], variant.spikeBand[1]);
      }
    } else {
      phaseFactor = random(variant.lateBand[0], variant.lateBand[1]);
    }

    if (preset === "slow-burn") {
      if (phase < 0.18) {
        phaseFactor *= random(0.62, 0.82);
      } else if (phase < 0.38) {
        phaseFactor *= random(0.82, 0.96);
      } else if (phase < 0.68) {
        phaseFactor *= random(1.14, 1.34);
      } else if (phase < 0.86) {
        phaseFactor *= random(0.92, 1.08);
      } else {
        phaseFactor *= random(0.78, 0.94);
      }
    }

    if (__rngSource() < variant.dipChance) {
      phaseFactor *= random(variant.dipBand[0], variant.dipBand[1]);
    }

    if (__rngSource() < variant.dipChance) {
      phaseFactor *= random(variant.dipBand[0], variant.dipBand[1]);
    }

    if (index < rampRuns) {
      const ease = (index + 1) / rampRuns;
      const easeIn = Math.pow(ease, 1.8);
      phaseFactor *= 0.52 + easeIn * 0.44;
    }

    if (index >= safeRunCount - rampRuns) {
      phaseFactor *= random(0.82, 0.98);
    }

    return delta * shapeVariance * phaseFactor * wave;
  });

  const incrementSum = incrementsRaw.reduce((acc, value) => acc + value, 0);

    if (incrementSum <= 0) {
    // 🔥 FIX: Even if curve fails, use a simple organic fallback
    // instead of equal distribution — apply sine wave variation
    const base = Math.floor(totalViews / safeRunCount);
    const result = Array.from({ length: safeRunCount }, (_, i) => {
      const phase = i / Math.max(1, safeRunCount - 1);
      const wave = Math.sin(phase * Math.PI * 2.5 + 0.3) * 0.3 + 1;
      return Math.max(1, Math.round(base * wave));
    });
    // Correct total
    let diff = totalViews - result.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (diff !== 0 && idx < result.length * 10) {
      if (diff > 0) { result[idx % result.length]++; diff--; }
      else if (result[idx % result.length] > 1) { result[idx % result.length]--; diff++; }
      idx++;
    }
    return result;
  }

  const scaled = incrementsRaw.map((value) => (value / incrementSum) * totalViews);
  const rounded = allocateRounded(scaled, totalViews);
  const phasedWeights = rounded.map((value, index) => {
    const phase = index / Math.max(1, rounded.length - 1);
    if (phase < 0.2) return value * random(0.78, 0.9);
    if (phase <= 0.8) {
      const boosted = value * random(1.06, 1.24);
      return __rngSource() < 0.14 ? boosted * random(1.12, 1.42) : boosted;
    }
    return value * random(0.86, 1.02);
  });

    const phasedRuns = distributeWithMinimum(phasedWeights, totalViews, minViewsPerRun);
  // 🔥 FIX: Only redistribute for minimum if minViewsPerRun is small
  // When effectiveMinViews = floor(totalViews/manualRunCount) is large,
  // redistributeForMinimum flattens the curve — skip it in that case
  const avgViewsPerRun = totalViews / safeRunCount;
  const minimumSafe = minViewsPerRun > avgViewsPerRun * 0.6
    ? phasedRuns  // skip redistribution — would flatten curve
    : redistributeForMinimum(phasedRuns, minViewsPerRun);
  const finalRuns = nudgeConsecutiveDuplicates(minimumSafe, minViewsPerRun);
     // 🔥 Inject organic micro-bursts: ~15% of runs get 20-80 views instead of the minimum
  // BUT never go below the effective minimum (service minimum from SMM panel)
  // Real traffic has natural variation — some runs are tiny, some are large
  if (finalRuns.length >= 10) {
    const microFloor = Math.max(20, minViewsPerRun); // Never go below 20 or the effective minimum
    const microCeiling = Math.max(microFloor + 30, minViewsPerRun + 10); // Micro runs are at most slightly above minimum
    // Only create micro-bursts if there's meaningful headroom above the minimum
    const hasHeadroom = finalRuns.some(v => v > microCeiling + 20);
    if (hasHeadroom) {
      const MICRO_BURST_RATIO = 0.15;
      const burstCount = Math.max(1, Math.floor(finalRuns.length * MICRO_BURST_RATIO));
      const burstIndices = new Set<number>();
      while (burstIndices.size < burstCount) {
        const candidate = randomInt(2, finalRuns.length - 3);
        // Only target runs that have enough to give away
        if (!burstIndices.has(candidate) && finalRuns[candidate] > microCeiling + 10) {
          burstIndices.add(candidate);
        }
      }
      let redistributedViews = 0;
      for (const idx of burstIndices) {
        const microAmount = randomInt(microFloor, Math.min(microCeiling, finalRuns[idx] - 1));
        redistributedViews += finalRuns[idx] - microAmount;
        finalRuns[idx] = microAmount;
      }
      if (redistributedViews > 0) {
        const normalRuns = finalRuns.filter((_, i) => !burstIndices.has(i));
        const perRunAdd = Math.floor(redistributedViews / normalRuns.length);
        let leftover = redistributedViews - perRunAdd * normalRuns.length;
        for (let i = 0; i < finalRuns.length; i++) {
          if (burstIndices.has(i)) continue;
          finalRuns[i] += perRunAdd;
          if (leftover > 0) { finalRuns[i]++; leftover--; }
        }
      }
    }
  }

  if (finalRuns.length > 1 && finalRuns.every((value) => value === finalRuns[0])) {
    finalRuns[0] += 1;
    let adjusted = false;
    for (let donor = finalRuns.length - 1; donor >= 1; donor -= 1) {
      if (finalRuns[donor] > minViewsPerRun) {
        finalRuns[donor] -= 1;
        adjusted = true;
        break;
      }
    }
    if (!adjusted) finalRuns[0] -= 1;
  }

  // 🔥 FIX #11: audience-saturation envelope.
  // Real posts plateau — most views land in the first 24-48 h, then a long
  // flat tail. We weight each run by (1 - e^(-k*t)) where t ∈ [0,1] over the
  // campaign, then renormalize so the sum still equals totalViews and the
  // per-run minimum is still respected. The earlier runs get a small bump,
  // the very latest runs get gently trimmed.
  if (finalRuns.length >= 4) {
    const SATURATION_K = 3.2; // ~80% of weight reached by ~50% of campaign
    const envelope = finalRuns.map((_, i) => {
      const t = i / Math.max(1, finalRuns.length - 1);
      return 1 - Math.exp(-SATURATION_K * t);
    });
    const envSum = envelope.reduce((a, b) => a + b, 0);
    if (envSum > 0) {
      // Combine 60% envelope + 40% original curve so we don't erase the
      // chosen pattern's character (S-curve, viral spike, etc.)
      const ENVELOPE_BLEND = 0.6;
      const originalSum = finalRuns.reduce((a, b) => a + b, 0);
      if (originalSum > 0) {
        const reshaped = finalRuns.map((value, i) => {
          const envWeight = envelope[i] / envSum;
          const origWeight = value / originalSum;
          const mixed = envWeight * ENVELOPE_BLEND + origWeight * (1 - ENVELOPE_BLEND);
          return Math.max(minViewsPerRun, Math.round(mixed * originalSum));
        });
        // Fix rounding drift so total = totalViews exactly
        let diff = originalSum - reshaped.reduce((a, b) => a + b, 0);
        let i = 0;
        while (diff !== 0 && i < reshaped.length * 20) {
          const idx = i % reshaped.length;
          if (diff > 0) { reshaped[idx]++; diff--; }
          else if (reshaped[idx] > minViewsPerRun) { reshaped[idx]--; diff++; }
          i++;
        }
        for (let k = 0; k < reshaped.length; k++) finalRuns[k] = reshaped[k];
      }
    }
  }

  return finalRuns;
}


// 🔥 Viral clipping templates inspired by real creator analytics screenshots.
// These are cumulative-curve templates: slow starts, plateaus, sudden algorithm pushes,
// late explosions, and long tails. They are used for delivery planning, while the
// graph component renders them with screenshot-style visual scaling.
type ClipCurveStyle =
  | "long-s-curve"
  | "two-step-spike"
  | "late-explosion"
  | "steady-organic"
  | "early-surge-tail"
  | "instant-spike-tail";

function sigmoid01(t: number, center: number, steepness: number): number {
  return 1 / (1 + Math.exp(-steepness * (t - center)));
}

function clipCurveValue(style: ClipCurveStyle, t: number): number {
  const linear = t;
  if (style === "long-s-curve") {
    return 0.06 * linear + 0.82 * sigmoid01(t, 0.48, 8.5) + 0.12 * sigmoid01(t, 0.82, 5.5);
  }
  if (style === "two-step-spike") {
    return 0.05 * linear + 0.34 * sigmoid01(t, 0.27, 24) + 0.51 * sigmoid01(t, 0.78, 30) + 0.10 * sigmoid01(t, 0.93, 18);
  }
  if (style === "late-explosion") {
    return 0.08 * linear + 0.16 * sigmoid01(t, 0.48, 9) + 0.56 * sigmoid01(t, 0.69, 22) + 0.20 * sigmoid01(t, 0.94, 38);
  }
  if (style === "early-surge-tail") {
    return 0.05 * linear + 0.55 * sigmoid01(t, 0.20, 28) + 0.23 * sigmoid01(t, 0.53, 10) + 0.17 * sigmoid01(t, 0.87, 15);
  }
  if (style === "instant-spike-tail") {
    return 0.08 * linear + 0.70 * sigmoid01(t, 0.12, 34) + 0.12 * sigmoid01(t, 0.36, 7) + 0.10 * sigmoid01(t, 0.88, 12);
  }
  return 0.16 * linear + 0.72 * sigmoid01(t, 0.42, 7) + 0.12 * sigmoid01(t, 0.76, 6);
}

function pickClipCurveStyle(preset: QuickPatternPreset | null, totalViews: number, durationHours: number): ClipCurveStyle {
  if (totalViews < 50000) {
    if (preset === "viral-boost") return __rngSource() < 0.55 ? "early-surge-tail" : "steady-organic";
    if (preset === "fast-start") return __rngSource() < 0.65 ? "early-surge-tail" : "steady-organic";
    if (preset === "slow-burn") return __rngSource() < 0.65 ? "long-s-curve" : "steady-organic";
    if (preset === "trending-push") return __rngSource() < 0.55 ? "steady-organic" : "long-s-curve";
    return ["steady-organic", "long-s-curve", "early-surge-tail"][randomInt(0, 2)] as ClipCurveStyle;
  }

  if (preset === "viral-boost") return __rngSource() < 0.55 ? "instant-spike-tail" : "two-step-spike";
  if (preset === "fast-start") return __rngSource() < 0.65 ? "early-surge-tail" : "instant-spike-tail";
  if (preset === "slow-burn") return __rngSource() < 0.55 ? "long-s-curve" : "late-explosion";
  if (preset === "trending-push") return __rngSource() < 0.5 ? "two-step-spike" : "late-explosion";

  if (durationHours >= 336) return ["long-s-curve", "late-explosion", "two-step-spike"][randomInt(0, 2)] as ClipCurveStyle;
  if (totalViews >= 750000) return ["two-step-spike", "late-explosion", "early-surge-tail", "long-s-curve"][randomInt(0, 3)] as ClipCurveStyle;
  return ["steady-organic", "early-surge-tail", "late-explosion", "two-step-spike"][randomInt(0, 3)] as ClipCurveStyle;
}

function generateClipStyleViewRuns(
  totalViews: number,
  runCount: number,
  variancePercent: number,
  preset: QuickPatternPreset | null,
  minViewsPerRun: number,
  durationHours: number
): { runs: number[]; style: ClipCurveStyle } {
  if (totalViews <= 0) return { runs: [0], style: "steady-organic" };
  if (runCount <= 1) return { runs: [totalViews], style: "steady-organic" };

  const style = pickClipCurveStyle(preset, totalViews, durationHours);
  const safeCount = Math.max(1, runCount);
  const variance = clamp(variancePercent, 0, 50) / 100;
  const phase = random(0, Math.PI * 2);

  const rawCumulative = Array.from({ length: safeCount + 1 }, (_, index) => {
    const t = index / safeCount;
    const wobble = Math.sin(t * Math.PI * random(2.2, 4.8) + phase) * (0.003 + variance * 0.01);
    return clipCurveValue(style, clamp(t + random(-0.002, 0.002), 0, 1)) + wobble;
  });

  const cumulative = normalizeMonotone(rawCumulative);
  let weights = Array.from({ length: safeCount }, (_, index) => {
    const t = index / Math.max(1, safeCount - 1);
    const delta = Math.max(0.000001, cumulative[index + 1] - cumulative[index]);
    let organicNoise = random(1 - variance * 0.55, 1 + variance * 0.85);

    // Make plateaus truly calm and spikes sharper.
    if (style === "two-step-spike" && ((t > 0.38 && t < 0.65) || t < 0.12)) organicNoise *= random(0.45, 0.82);
    if (style === "late-explosion" && t < 0.46) organicNoise *= random(0.38, 0.78);
    if (style === "instant-spike-tail" && t > 0.34 && t < 0.82) organicNoise *= random(0.42, 0.72);
    if (style === "early-surge-tail" && t > 0.36 && t < 0.72) organicNoise *= random(0.56, 0.9);

    // Occasional mini algorithm pushes inside high-velocity zones.
    const hotZone =
      (style === "two-step-spike" && ((t > 0.18 && t < 0.32) || (t > 0.72 && t < 0.84))) ||
      (style === "late-explosion" && t > 0.62 && t < 0.78) ||
      (style === "early-surge-tail" && (t < 0.25 || t > 0.82)) ||
      (style === "instant-spike-tail" && t < 0.2) ||
      (style === "long-s-curve" && t > 0.34 && t < 0.68);

    if (hotZone && totalViews >= 50000 && __rngSource() < 0.18 + variance * 0.18) organicNoise *= random(1.18, 1.72);

    return delta * organicNoise;
  });

  // First few runs should usually warm up rather than blast at full strength,
  // except the instant-spike template.
  if (style !== "instant-spike-tail") {
    const warmup = Math.min(5, Math.max(2, Math.floor(safeCount * 0.04)));
    for (let i = 0; i < warmup; i += 1) {
      weights[i] *= random(0.45, 0.82) * ((i + 1) / warmup);
    }
  }

  const minFloor = Math.max(1, Math.min(minViewsPerRun, Math.floor(totalViews / safeCount)));
  let runs = distributeWithMinimum(weights, totalViews, minFloor);
  runs = nudgeConsecutiveDuplicates(runs, minFloor);

  // If minimums compressed the shape too much, give the biggest spike a little more height.
  if (runs.length >= 8) {
    const maxIndex = runs.indexOf(Math.max(...runs));
    const donors = runs
      .map((value, index) => ({ value, index }))
      .filter((item) => item.index !== maxIndex && item.value > minFloor)
      .sort((a, b) => a.value - b.value);
    let boost = Math.floor(totalViews * random(0.008, 0.022));
    for (const donor of donors) {
      if (boost <= 0) break;
      const take = Math.min(boost, Math.floor((donor.value - minFloor) * 0.35));
      if (take <= 0) continue;
      runs[donor.index] -= take;
      runs[maxIndex] += take;
      boost -= take;
    }
  }

  return { runs, style };
}

function intervalPatternFactor(type: PatternType, t: number): number {
  if (type === "smooth-s-curve") return 1.06 - Math.exp(-Math.pow((t - 0.5) / 0.2, 2)) * 0.34;
  if (type === "rocket-launch") return 0.58 + t * 1.02;
  if (type === "sunset-fade") return 1.2 - t * 0.52;
  if (type === "viral-spike") return 1.14 - Math.exp(-Math.pow((t - 0.56) / 0.14, 2)) * 0.5;
  if (type === "micro-burst") return Math.sin(t * 22) > 0.25 ? 0.64 : 1.52;
  if (type === "heartbeat") return Math.sin(t * 16) > 0.2 ? 0.76 : 1.26;
  if (type === "sawtooth") return ((t * 10) % 1) < 0.2 ? 0.66 : 1.24;
  return 1.16 - t * 0.46;
}

function intervalPresetFactor(preset: QuickPatternPreset | null, t: number): number {
  if (preset === "viral-boost") return 1.2 - Math.exp(-Math.pow((t - 0.58) / 0.2, 2)) * 0.45;
  if (preset === "fast-start") return 0.65 + t * 0.9;
  if (preset === "trending-push") return 1.1 - Math.exp(-Math.pow((t - 0.58) / 0.22, 2)) * 0.3;
  if (preset === "slow-burn") return 1.2 + t * 0.25;
  return 1;
}

interface EngagementProfile {
  densityMin: number;
  densityMax: number;
  perRunMin: number;
  perRunMax: number;
}

type EngagementKind = "likes" | "shares" | "saves";

function resolveEngagementProfile(kind: EngagementKind): EngagementProfile {
  if (kind === "likes") return { densityMin: 0.2, densityMax: 0.35, perRunMin: 10, perRunMax: 20 };
  return { densityMin: 0.1, densityMax: 0.2, perRunMin: 10, perRunMax: 18 };
}

// 🔥 FIX #7: 24-hour engagement curve replacing the old binary 18-23 boost.
// Indexed 0..23 (hour of day in audience timezone). Real audience activity
// is bimodal: morning commute peak + post-work peak, dead 2-6 AM.
// Values centred around 1.0 (1.0 = "average hour"), so multiplying by this
// curve preserves total volume.
const HOURLY_ENGAGEMENT_CURVE = [
  0.40, 0.30, 0.25, 0.25, 0.30, 0.45, // 0-5  AM (asleep)
  0.70, 1.00, 1.15, 1.10, 1.00, 0.95, // 6-11 AM (wake, commute, morning)
  1.00, 0.95, 0.90, 0.95, 1.05, 1.20, // 12-5 PM (lunch dip, recovery)
  1.35, 1.40, 1.30, 1.15, 0.90, 0.60, // 6-11 PM (peak, fade)
];

// 🔥 FIX #7: module-level current-audience-tz, set at the top of
// createPatternPlan(). Avoids plumbing tz through 4 helper functions.
let __currentAudienceTz: string | undefined = undefined;

// Hour-of-day (0-23) for a Date, optionally in a specific IANA timezone.
// Used to look up HOURLY_ENGAGEMENT_CURVE consistently regardless of where
// the server runs. Falls back to browser-local hour if tz is invalid/missing.
function hourInAudienceTz(date: Date, tz?: string): number {
  if (!tz) return date.getHours();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: tz,
    }).formatToParts(date);
    const h = parts.find((p) => p.type === "hour");
    const parsed = h ? parseInt(h.value, 10) : NaN;
    return Number.isFinite(parsed) ? (parsed === 24 ? 0 : parsed) : date.getHours();
  } catch {
    return date.getHours();
  }
}

function buildEngagementWeights(runs: { views: number; at: Date }[], peakHoursBoost: boolean): number[] {
  const maxViews = Math.max(1, ...runs.map((run) => run.views));
  return runs.map((run, index) => {
    const previous = index > 0 ? runs[index - 1].views : run.views;
    const next = index < runs.length - 1 ? runs[index + 1].views : run.views;
    const increase = Math.max(0, run.views - previous) / maxViews;
    const localSpike = Math.max(0, run.views - (previous + next) / 2) / maxViews;
    const t = index / Math.max(1, runs.length - 1);
    const phaseBoost = t > 0.3 && t < 0.75 ? 1.15 : 1;

    // 🔥 FIX #7: hour-of-day boost from the 24-curve, not a binary 1.35 flag.
    // When peakHoursBoost is OFF we still apply the curve but flattened
    // toward 1.0 (multiplier of 0.4) so the schedule is calmer.
    // NOTE: this function does not know the timezone — caller passes pre-set
    // dates. See `hourInAudienceTz` for the timezone-aware version used in
    // createPatternPlan.
    const hour = hourInAudienceTz(run.at, __currentAudienceTz);
    const curve = HOURLY_ENGAGEMENT_CURVE[hour] ?? 1;
    const hourBoost = peakHoursBoost
      ? curve                                  // full curve when ON
      : 1 + (curve - 1) * 0.4;                 // damped curve when OFF

    return Math.max(
      0.01,
      (0.5 + (run.views / maxViews) * 0.65 + increase * 1.1 + localSpike * 1.2) *
        phaseBoost *
        hourBoost,
    );
  });
}

function applyNoise(value: number, min: number, max: number): number {
  return clamp(value + randomInt(-2, 2), min, max);
}

function selectEngagementRuns(length: number, count: number, weights: number[]): number[] {
  if (count <= 0 || length === 0) return [];

  const selected = new Set<number>();
  const minGap = Math.max(1, Math.floor(length / Math.max(6, count * 2.5)));
  const anchors = [0.15, 0.5, 0.82];

  for (const anchor of anchors) {
    if (selected.size >= count) break;
    const center = Math.round((length - 1) * anchor);
    const start = Math.max(0, center - Math.max(2, Math.floor(length * 0.08)));
    const end = Math.min(length - 1, center + Math.max(2, Math.floor(length * 0.08)));
    const candidates = Array.from({ length: end - start + 1 }, (_, offset) => start + offset).filter((index) => {
      for (const taken of selected) {
        if (Math.abs(taken - index) <= minGap) return false;
      }
      return true;
    });
    if (candidates.length === 0) continue;
    const candidateWeights = candidates.map((index) => Math.max(0.01, weights[index] * random(0.9, 1.12)));
    selected.add(candidates[pickWeightedIndex(candidateWeights)]);
  }

  while (selected.size < count) {
    const candidates = Array.from({ length }, (_, index) => index).filter((index) => {
      for (const taken of selected) {
        if (Math.abs(taken - index) <= minGap && __rngSource() < 0.8) return false;
      }
      return true;
    });
    if (candidates.length === 0) break;
    const candidateWeights = candidates.map((index) => Math.max(0.01, weights[index] * random(0.9, 1.15)));
    selected.add(candidates[pickWeightedIndex(candidateWeights)]);
  }

  const result = Array.from(selected).sort((a, b) => a - b);
  const maxGap = Math.max(5, Math.ceil(length / Math.max(2, count)) + 1);
  let cursor = 0;
  while (cursor < result.length - 1 && result.length < count) {
    const gap = result[cursor + 1] - result[cursor];
    if (gap > maxGap) {
      const mid = Math.floor((result[cursor] + result[cursor + 1]) / 2);
      result.splice(cursor + 1, 0, mid);
    }
    cursor += 1;
  }

  return result.slice(0, count);
}

function phaseRangeForKind(kind: EngagementKind, t: number): { min: number; max: number } {
  if (kind === "likes") {
    if (t < 0.33) return { min: 10, max: 14 };
    if (t < 0.72) return { min: 14, max: 20 };
    return { min: 12, max: 18 };
  }
  if (t < 0.33) return { min: 10, max: 13 };
  if (t < 0.72) return { min: 12, max: 18 };
  return { min: 11, max: 16 };
}

function pickEngagementValue(kind: EngagementKind, t: number, lastValue: number | null): number {
  const profile = resolveEngagementProfile(kind);
  const range = phaseRangeForKind(kind, t);
  const min = clamp(range.min, profile.perRunMin, profile.perRunMax);
  const max = clamp(range.max, profile.perRunMin, profile.perRunMax);
  let value = applyNoise(randomInt(min, max), profile.perRunMin, profile.perRunMax);

  if (lastValue !== null && value === lastValue) {
    value = clamp(value + (__rngSource() < 0.5 ? -1 : 1), profile.perRunMin, profile.perRunMax);
  }

  return value;
}

function distributeEngagement(
  runs: { views: number; at: Date }[],
  targetTotal: number,
  peakHoursBoost: boolean,
  kind: EngagementKind
): number[] {
  const result = Array.from({ length: runs.length }, () => 0);
  if (targetTotal < 10 || runs.length === 0) return result;

  const profile = resolveEngagementProfile(kind);
  const minCount = Math.max(1, Math.round(runs.length * profile.densityMin));
  const maxCount = Math.max(minCount, Math.round(runs.length * profile.densityMax));
  const preferredCount = clamp(randomInt(minCount, maxCount), 1, runs.length);
  const requiredCount = Math.ceil(targetTotal / Math.max(profile.perRunMin + 3, profile.perRunMax - 1));
  const selectedCount = clamp(Math.max(preferredCount, Math.min(maxCount, requiredCount)), 1, runs.length);

  const weights = buildEngagementWeights(runs, peakHoursBoost);
  const selected = selectEngagementRuns(runs.length, selectedCount, weights);
  const effectiveCount = Math.max(1, selected.length);

  const feasibleMin = effectiveCount * profile.perRunMin;
  const feasibleMax = effectiveCount * profile.perRunMax;
  const naturalMid = Math.round(effectiveCount * ((profile.perRunMin + profile.perRunMax) / 2));
  const target =
    targetTotal > feasibleMax
      ? randomInt(Math.max(feasibleMin, naturalMid - effectiveCount), Math.max(feasibleMin, naturalMid + Math.floor(effectiveCount * 0.8)))
      : clamp(targetTotal, feasibleMin, feasibleMax);

  let runningTotal = 0;
  let lastAssigned: number | null = null;
  let secondLastAssigned: number | null = null;

  for (const index of selected) {
    const t = index / Math.max(1, runs.length - 1);
    let value = pickEngagementValue(kind, t, lastAssigned);
    if (secondLastAssigned !== null && value === secondLastAssigned) {
      value = clamp(value + (__rngSource() < 0.5 ? -1 : 1), profile.perRunMin, profile.perRunMax);
    }

    const spikeBias = weights[index] / Math.max(0.01, Math.max(...weights));
    if (__rngSource() < spikeBias * 0.45) value = Math.min(profile.perRunMax, value + randomInt(1, 2));

    result[index] = value;
    runningTotal += value;
    secondLastAssigned = lastAssigned;
    lastAssigned = value;
  }

  let delta = target - runningTotal;
  const adjustable = selected.map((index) => ({ index, weight: Math.max(0.01, weights[index]) }));
  while (delta !== 0 && adjustable.length > 0) {
    const chosen = adjustable[pickWeightedIndex(adjustable.map((slot) => slot.weight))].index;
    if (delta > 0 && result[chosen] < profile.perRunMax) {
      result[chosen] += 1;
      delta -= 1;
    } else if (delta < 0 && result[chosen] > profile.perRunMin) {
      result[chosen] -= 1;
      delta += 1;
    } else {
      const next = adjustable.find((slot) => (delta > 0 ? result[slot.index] < profile.perRunMax : result[slot.index] > profile.perRunMin));
      if (!next) break;
    }
  }

  return result;
}

function detectRisk(viewsPerHour: number, variancePercent: number, hours: number): "Safe" | "Medium" | "Risk" {
  const speedScore = clamp(viewsPerHour / 15000, 0, 1.2);
  const varianceScore = clamp(variancePercent / 50, 0, 1);
  const shortWindowPenalty = hours <= 12 ? 0.25 : hours <= 24 ? 0.12 : 0;
  const score = speedScore * 0.75 + varianceScore * 0.45 + shortWindowPenalty;
  if (score >= 1) return "Risk";
  if (score >= 0.62) return "Medium";
  return "Safe";
}

export function createPatternPlan(config: OrderConfig): PatternPlan {
  // 🔥 FIX #6: deterministic regen — same (config, seed) ⇒ same plan
  setRngSeed(config.seed);
  // When the caller pins a seed they expect reproducibility, so clear the
  // module-level "don't repeat last pattern" memory.
  if (config.seed !== undefined && config.seed !== null) {
    lastPatternKey = null;
  }
  // 🔥 FIX #7: timezone used by the hour-of-day engagement curve
  __currentAudienceTz = config.audienceTimezone;

  const minViewsPerRun = config.minViewsPerRun || 100;
  const now = new Date();

  if (!Number.isFinite(config.totalViews) || config.totalViews <= 0) {
    return {
      patternId: randomInt(100, 999),
      patternName: "empty",
      patternType: "smooth-s-curve",
      totalRuns: 0,
      approximateIntervalMin: 0,
      finishTime: now,
      estimatedDurationHours: 0,
      risk: "Safe",
      runs: [],
    };
  }

  if (config.totalViews < minViewsPerRun) {
    const singleRun: RunStep = {
      run: 1,
      at: new Date(now.getTime() + (config.startDelayHours || 0) * 3600000),
      minutesFromStart: (config.startDelayHours || 0) * 60,
      views: config.totalViews,
      likes: 0,
      shares: 0,
      saves: 0,
      comments: 0,
      cumulativeViews: config.totalViews,
      cumulativeLikes: 0,
      cumulativeShares: 0,
      cumulativeSaves: 0,
      cumulativeComments: 0,
    };
    return {
      patternId: randomInt(100, 999),
      patternName: "minimal",
      patternType: "smooth-s-curve",
      totalRuns: 1,
      approximateIntervalMin: 0,
      finishTime: singleRun.at,
      estimatedDurationHours: config.startDelayHours || 0,
      risk: "Safe",
      runs: [singleRun],
    };
  }

  const presetProfile = resolvePresetProfile(config.quickPreset);
  const selectedPatternProfile = pickPatternProfile(presetProfile.patternType);
  const patternType = presetProfile.patternType ?? selectedPatternProfile.baseType ?? pickRandomPatternType();
  let patternName = selectedPatternProfile.name;
  const variant = createPatternVariant(selectedPatternProfile);
  const patternId = randomInt(100, 999);
  const requestedViews = Math.max(0, Math.floor(config.totalViews));
  const variance = clamp(config.variancePercent * presetProfile.varianceMultiplier, 10, 50);

        const totalRuns = (() => {
    // 🔥 If custom drawn views provided, use that length
    if (config.customDrawnViews && config.customDrawnViews.length > 0) {
      return config.customDrawnViews.length;
    }
    if (config.manualRunCount && config.manualRunCount > 0) {
      return Math.max(1, Math.min(config.manualRunCount, 500));
    }
    const maxPossibleRuns = Math.max(1, Math.floor(requestedViews / minViewsPerRun));
       const baseRequestedRuns = Math.round(randomInt(80, 140) * presetProfile.runMultiplier * selectedPatternProfile.runMultiplier);
    const requestedRuns = Math.min(baseRequestedRuns, maxPossibleRuns);
    return requestedViews >= minViewsPerRun
      ? resolveRunCount(requestedViews, requestedRuns, presetProfile.targetAverageViews, minViewsPerRun)
      : 1;
  })();

    // 🔥 FIX: To draw a curve, the minimum floor MUST be lower than the average!
  // If we set the floor to the average (e.g. 5000/30 = 166), it becomes a flat line.
  // So we use the global minViewsPerRun (e.g. 100), UNLESS the math forces us lower.
  const avgViewsPerRun = Math.floor(requestedViews / totalRuns);
  const effectiveMinViews = (config.manualRunCount && config.manualRunCount > 0)
    ? Math.min(minViewsPerRun, Math.max(1, avgViewsPerRun))
    : minViewsPerRun;

  const durationHours = clamp(
    resolveDurationHours(config) * presetProfile.durationMultiplier * selectedPatternProfile.durationMultiplier,
    2,
    672
  );
  const durationMin = durationHours * 60;
  const startDelayMin = clamp(config.startDelayHours || 0, 0, 168) * 60;

    // 🔥 Calculate baseInterval BEFORE peak boost so it can be used inside
  const baseInterval = durationMin / Math.max(1, totalRuns - 1);

        // 🔥 Use custom drawn views if provided, otherwise generate from curve
  let viewRuns: number[];

  if (config.customDrawnViews && config.customDrawnViews.length > 0) {
    // 🔥 Custom drawn curve — use exact views shape from user drawing
    viewRuns = [...config.customDrawnViews];

    // Ensure total matches
    const drawnTotal = viewRuns.reduce((a, b) => a + b, 0);
    if (drawnTotal !== requestedViews) {
      const ratio = requestedViews / Math.max(1, drawnTotal);
      viewRuns = viewRuns.map(v => Math.max(effectiveMinViews, Math.round(v * ratio)));
      // Correct any rounding difference
      let diff = requestedViews - viewRuns.reduce((a, b) => a + b, 0);
      let idx = 0;
      while (diff !== 0 && idx < viewRuns.length * 10) {
        if (diff > 0) { viewRuns[idx % viewRuns.length]++; diff--; }
        else if (viewRuns[idx % viewRuns.length] > effectiveMinViews) { viewRuns[idx % viewRuns.length]--; diff++; }
        idx++;
      }
    }
  } else {
    // Screenshot-style viral clipping distribution: algorithm spikes, plateaus, late pushes.
    const clipPlan = generateClipStyleViewRuns(
      requestedViews,
      totalRuns,
      variance,
      config.quickPreset,
      effectiveMinViews,
      durationHours
    );
    viewRuns = clipPlan.runs;
    // Re-label the generated pattern so saved configs clearly show the viral template used.
    // The PatternType stays compatible with the existing app; patternName carries the detail.
    patternName = clipPlan.style;
  }
        if (config.peakHoursBoost && viewRuns.length > 1 && requestedViews >= effectiveMinViews && !config.customDrawnViews) {
    const initialWeights = viewRuns.map((views) => Math.max(0.01, views));

    // 🔥 Calculate actual run times first (same logic as provisionalRuns below)
    const tempElapsed = startDelayMin;
    const runTimes: Date[] = [];
    let tempElapsedMs = tempElapsed * 60_000;
    for (let i = 0; i < viewRuns.length; i++) {
      runTimes.push(new Date(now.getTime() + tempElapsedMs));
      if (i < viewRuns.length - 1) {
        const t = (i + 1) / Math.max(1, viewRuns.length - 1);
        const jitter = random(0.78, 1.24);
        const intervalMs = Math.max(
          1,
          (baseInterval * jitter * intervalPresetFactor(config.quickPreset, t) * intervalPatternFactor(patternType, t)) * 60_000
        );
        tempElapsedMs += intervalMs;
      }
    }

    const boostedWeights = initialWeights.map((weight, index) => {
      const runTime = runTimes[index];

      // 🔥 Convert run time to USA Eastern Time hour
      // EST = UTC - 5, EDT = UTC - 4 (daylight saving March-November)
      const utcHour = runTime.getUTCHours();
      const month = runTime.getUTCMonth() + 1; // 1-12
      const isDST = month >= 3 && month <= 11; // approximate DST period
      const estOffset = isDST ? -4 : -5;
      const estHour = ((utcHour + estOffset) + 24) % 24;

      // 🔥 USA Peak Evening: 6 PM to 11 PM EST (18 to 23)
      const inPeakWindow = estHour >= 18 && estHour <= 23;

      // 🔥 Also boost lunch time (12 PM to 2 PM EST) — secondary peak
      const inLunchPeak = estHour >= 12 && estHour <= 14;

      const isPeak = inPeakWindow || inLunchPeak;

      const boostChance = inPeakWindow ? 0.80 : inLunchPeak ? 0.55 : 0.15;
      const boost = __rngSource() < boostChance
        ? random(1.14, inPeakWindow ? 1.52 : 1.25)
        : random(0.92, 1.05);

      return weight * boost;
    });

        viewRuns = distributeWithMinimum(boostedWeights, requestedViews, effectiveMinViews);
  }

    // =========================================================
  // 🔥 FIRST 3 RUNS VIEWS CAP
  // If total views < 5000 AND minViewsPerRun is default (100),
  // cap first 3 runs to 100-150 views each.
  // If user changed minViewsPerRun to 200, 300, etc → skip this rule.
  // =========================================================
        if (!config.manualRunCount && !config.customDrawnViews && requestedViews < 5000 && effectiveMinViews <= 100 && viewRuns.length >= 4) {
    let totalStolen = 0;

    for (let i = 0; i < Math.min(3, viewRuns.length); i++) {
      if (viewRuns[i] > 150) {
        const excess = viewRuns[i] - randomInt(100, 150);
        totalStolen += excess;
        viewRuns[i] -= excess;
      } else if (viewRuns[i] < 100) {
        // If somehow below 100, bring up to 100
        const deficit = 100 - viewRuns[i];
        viewRuns[i] = 100;
        totalStolen -= deficit; // we need to take from others
      }
    }

    // Redistribute stolen views to remaining runs (index 3+)
    if (totalStolen > 0) {
      const laterRuns = viewRuns.length - 3;
      const perRun = Math.floor(totalStolen / laterRuns);
      let leftover = totalStolen - perRun * laterRuns;

      for (let i = 3; i < viewRuns.length; i++) {
        viewRuns[i] += perRun;
        if (leftover > 0) {
          viewRuns[i]++;
          leftover--;
        }
      }
    } else if (totalStolen < 0) {
      // Need to take from later runs to cover deficit
      let needed = Math.abs(totalStolen);
      for (let i = viewRuns.length - 1; i >= 3 && needed > 0; i--) {
                const canTake = viewRuns[i] - effectiveMinViews;
        if (canTake > 0) {
          const take = Math.min(needed, canTake);
          viewRuns[i] -= take;
          needed -= take;
        }
      }
    }
  }

      // 🔥 Minimum gap between Run 1 and Run 2:
  // Likes on Run 2 fire 3-7 min after Run 2 scheduled time.
  // We want actual likes fire time = at least 40 min after Run 1 views.
  // So Run 2 scheduled time must be at least (40 - 7) = 33 min after Run 1.
  // Using 33 min as minimum to guarantee likes fire >= 40 min after Run 1 views.
  const MIN_FIRST_INTERVAL_MIN = 33;

  let elapsed = startDelayMin;
  const provisionalRuns = viewRuns.map((views, index) => {
    if (index > 0) {
      const t = index / Math.max(1, viewRuns.length - 1);
      const jitter = random(0.78, 1.24);
      const naturalInterval = Math.max(
        1,
        baseInterval * jitter * intervalPresetFactor(config.quickPreset, t) * intervalPatternFactor(patternType, t)
      );
      // 🔥 For the first interval only, enforce minimum 33 min
      const intervalToUse = index === 1
        ? Math.max(MIN_FIRST_INTERVAL_MIN, naturalInterval)
        : naturalInterval;
      elapsed += intervalToUse;
    }
    return { at: new Date(now.getTime() + elapsed * 60_000), views };
  });

  // 🔥 COLD-START DEAD ZONE
  //
  // Real platforms (TikTok/IG/YT) put new posts through an "algorithm test"
  // period of ~30-90 min where only a small seed audience sees them. Posts
  // that come in HOT (huge view spike at minute 1) get flagged as suspicious.
  //
  // We cap runs whose scheduled time falls in the cold zone at
  // `[effectiveMinViews, effectiveMinViews * 1.5]`, then redistribute the
  // excess views proportionally across the remaining runs. Totals are
  // preserved exactly. Provider minimum (effectiveMinViews) is respected —
  // we NEVER drop a run below it.
  //
  // Skipped when:
  //   - the campaign is too short (≤ 4 runs) — every run matters
  //   - user supplied a custom drawn curve (their intent overrides ours)
  //   - the entire campaign finishes within the cold zone (provider min wins)
  if (
    !config.customDrawnViews &&
    provisionalRuns.length >= 4 &&
    durationHours >= 0.75 // skip for ultra-short campaigns (< 45 min)
  ) {
    // Pick a cold-zone length deterministically (mulberry32 honors seed).
    // Range: 30-90 min, weighted toward 45-60.
    const coldZoneMinutes = Math.round(30 + random(0, 1) * 60);
    const firstRunMs = provisionalRuns[0].at.getTime();
    const coldCutoffMs = firstRunMs + coldZoneMinutes * 60_000;

    // Indexes of runs inside the cold window — but never more than the
    // first 25% of runs (otherwise short campaigns get gutted).
    const maxColdIdx = Math.max(0, Math.floor(provisionalRuns.length * 0.25) - 1);
    const coldIdxs: number[] = [];
    for (let i = 0; i < provisionalRuns.length; i++) {
      if (i > maxColdIdx) break;
      if (provisionalRuns[i].at.getTime() <= coldCutoffMs) {
        coldIdxs.push(i);
      }
    }

    // Need at least one run AFTER the cold zone to absorb the redistribution.
    const hasReceivers = coldIdxs.length > 0 && coldIdxs.length < provisionalRuns.length;
    if (hasReceivers) {
      const coldCap = Math.max(
        effectiveMinViews,
        Math.round(effectiveMinViews * 1.5),
      );
      let stolen = 0;
      for (const i of coldIdxs) {
        const before = provisionalRuns[i].views;
        // Target: random value in [effectiveMinViews, coldCap], never below floor.
        const target = Math.max(
          effectiveMinViews,
          Math.min(coldCap, effectiveMinViews + randomInt(0, Math.max(0, coldCap - effectiveMinViews))),
        );
        if (before > target) {
          stolen += before - target;
          provisionalRuns[i] = { ...provisionalRuns[i], views: target };
        }
        // If before <= target, leave alone (already small enough).
      }

      // Redistribute `stolen` across non-cold runs proportionally to their
      // current views (bigger runs absorb more — keeps the curve shape).
      if (stolen > 0) {
        const receiverIdxs: number[] = [];
        for (let i = 0; i < provisionalRuns.length; i++) {
          if (!coldIdxs.includes(i)) receiverIdxs.push(i);
        }
        const receiverSum = receiverIdxs.reduce((s, i) => s + provisionalRuns[i].views, 0);
        if (receiverSum > 0) {
          let allocated = 0;
          for (let k = 0; k < receiverIdxs.length; k++) {
            const i = receiverIdxs[k];
            const share = k === receiverIdxs.length - 1
              ? stolen - allocated // last receiver absorbs rounding drift
              : Math.round((provisionalRuns[i].views / receiverSum) * stolen);
            allocated += share;
            provisionalRuns[i] = { ...provisionalRuns[i], views: provisionalRuns[i].views + share };
          }
        }
      }
    }
  }

  const totalViews = provisionalRuns.reduce((acc, run) => acc + run.views, 0);

  // 🔥 Realistic first-hours behavior from your screenshots:
  // first 3–5 hours have very low/negligible engagement. Views can start,
  // but likes/shares/comments wait until the post has some traction.
  const engagementWarmupMin = randomInt(180, 300);
  const firstRunMs = provisionalRuns[0]?.at.getTime() ?? now.getTime();
  const warmupIndexRaw = provisionalRuns.findIndex((run, index) =>
    index > 0 && run.at.getTime() - firstRunMs >= engagementWarmupMin * 60_000
  );
  const minEngagementIndex = warmupIndexRaw >= 0
    ? warmupIndexRaw
    : Math.min(Math.max(1, Math.floor(provisionalRuns.length * 0.22)), Math.max(1, provisionalRuns.length - 2));
  const afterEngagementWarmup = (index: number) => index >= minEngagementIndex;

  // 🔥 Screenshot-style viral engagement ratios.
  // Reference analytics showed likes around 7%–17% of views, shares much smaller,
  // and comments as a tiny but visible line. The old logic was ~0.7% likes.
  const likesRatio = (() => {
    if (!config.includeLikes) return 0;
    // Deterministic ratios: changing the likes percentage should scale the existing plan,
    // not regenerate a new random base like count first.
    if (config.quickPreset === "viral-boost") return 0.155;
    if (config.quickPreset === "fast-start") return 0.12;
    if (config.quickPreset === "slow-burn") return 0.09;
    if (config.quickPreset === "trending-push") return 0.135;
    if (totalViews >= 750000) return 0.125;
    return totalViews < 50000 ? 0.058 : 0.095;
  })();
  const baseLikesTotal = config.includeLikes ? Math.max(10, Math.floor(totalViews * likesRatio)) : 0;
  const likesBoostMultiplier = Math.max(0.15, 1 + ((config.likesBoostPercent || 0) / 100));
  let likesTotal = config.includeLikes
    ? Math.max(10, Math.floor(baseLikesTotal * likesBoostMultiplier))
    : 0;

  // Below 50k views, keep likes runs realistic: 10–25 likes per API run.
  if (config.includeLikes && totalViews < 50000 && provisionalRuns.length > 2) {
    const maxLikeRunsAvailable = Math.max(1, provisionalRuns.length - 3);
    likesTotal = Math.min(likesTotal, maxLikeRunsAvailable * 25);
  }

  const sharesTotal = (() => {
    if (!config.includeShares) return 0;
    const ratio = config.sharesRatio || "half";
    // 🔥 FIX: Boost slider must visibly scale shares.
    // Old clamp Math.max(0.15, …) was fine, but the BASE multipliers were so tiny
    // that even +300% produced a barely-visible bump (often clamped to the
    // Math.max(10, …) floor). We raise the base multipliers AND keep the boost
    // slider as a multiplicative scale so the dropdown changes are obvious.
    const shareBoostMultiplier = Math.max(0.1, 1 + ((config.sharesBoostPercent || 0) / 100));
    if (ratio === "custom") {
      return Math.max(10, Math.round((config.sharesCustomCount || 0) * shareBoostMultiplier));
    }
    // UI labels are repurposed for viral clipping:
    //   equal = viral share push (high), half = normal, third = low.
    // Bumped from {equal:0.06, half:0.025, third:0.01} so the boost slider has room
    // to move and the per-run shares clear the 10-share minimum easily.
    const multiplier = ratio === "equal" ? 0.22 : ratio === "third" ? 0.05 : 0.12;
    const raw = likesTotal * multiplier * shareBoostMultiplier;
    return Math.max(10, Math.round(raw));
  })();

  const savesTotal = (() => {
    if (!config.includeSaves) return 0;
    const ratio = config.savesRatio || "third";
    if (ratio === "custom") return Math.max(10, config.savesCustomCount || 0);
    const multiplier = ratio === "equal" ? random(0.05, 0.09) : ratio === "half" ? random(0.018, 0.04) : random(0.008, 0.022);
    return Math.max(10, Math.floor(likesTotal * multiplier));
  })();

  const repostsTotal = (() => {
    if (!config.includeReposts) return 0;
    const ratio = config.repostsRatio || "half";
    if (ratio === "custom") return Math.max(10, config.repostsCustomCount || 0);
    const multiplier = ratio === "equal" ? random(0.04, 0.08) : ratio === "third" ? random(0.006, 0.018) : random(0.015, 0.035);
    return Math.max(10, Math.floor(likesTotal * multiplier));
  })();

  let commentsTotal = 0;
  if (config.includeComments) {
    // 🔥 FIX: Comments were frozen because the old clamp(..., 30, 1200) was
    // hard-capping the result at 1200 (so anything above ~10 M views looked
    // identical) and lifting tiny orders up to 30 (so anything below ~300 k
    // views also looked identical). The result: changing the views slider
    // produced no visible change in the comments column.
    //
    // New formula:
    //   • Use deterministic ratios that scale by view tier (no random — so
    //     the same views always gives a predictable, growing comment count).
    //   • Floor only at the provider's true minimum (10).
    //   • Cap is much higher (50 000) and is just a safety rail — for
    //     anything realistic, the value scales linearly with views.
    const commentRatio =
      totalViews >= 10000000 ? 0.00018 :   // 10 M+    → ~1 800 per 10 M
      totalViews >= 1000000  ? 0.00022 :   // 1 M-10 M → ~220 per 1 M
      totalViews >= 100000   ? 0.00028 :   // 100 k-1M → ~28 per 100 k
      totalViews >= 10000    ? 0.00035 :   // 10 k-100k → ~3-35
                               0.00050;    // < 10 k   → small but visible
    const rawCommentsTotal = Math.floor(totalViews * commentRatio);
    // Provider minimum is 10 comments/run, so keep total aligned to 10s.
    // Use 50 000 as a soft safety cap — far above anything users will hit
    // in practice but prevents a typo'd 10 B-view order from exploding.
    const aligned = Math.ceil(Math.max(10, rawCommentsTotal) / 10) * 10;
    commentsTotal = Math.min(50000, aligned);
  }

       // =========================================================
  // 🔥 LIKES DISTRIBUTION
  // Two modes:
  //   "bracket" (default) — place likes at view milestones (1500, 2500...)
  //   "even-spread" — distribute likes across many runs proportional to views
  // =========================================================
  const likesRuns = (() => {
    const result = Array.from({ length: provisionalRuns.length }, () => 0);
    if (!config.includeLikes || likesTotal <= 0 || provisionalRuns.length <= 1) return result;

    const MIN_LIKES_PER_RUN = 10;

    // Build cumulative views per provisional run
    let cumViews = 0;
    const cumulativeViewsPerRun = provisionalRuns.map(r => {
      cumViews += r.views;
      return cumViews;
    });
    const totalViewsAll = cumulativeViewsPerRun[cumulativeViewsPerRun.length - 1] || 1;

    if (config.likesDistribution === "even-spread") {
      // =========================================================
      // 🔥 EVEN-SPREAD MODE
      // - Skip run 0 (no likes on first run)
      // - Select as many runs as likes can cover (each min 10)
      // - Distribute likes proportional to each run's views
      // - Add randomness so values aren't flat
      // =========================================================
      const maxPossibleLikeRuns = Math.floor(likesTotal / MIN_LIKES_PER_RUN);
      if (maxPossibleLikeRuns <= 0) return result;


            // All runs except first run and last 2 runs are candidates
      const candidateIndexes = Array.from(
        { length: provisionalRuns.length },
        (_, i) => i
      ).filter(i => i >= 1 && i < provisionalRuns.length - 2);

      // How many runs to give likes — spread as widely as possible
      const targetLikeRuns = totalViews < 50000
        ? Math.min(candidateIndexes.length, Math.max(1, Math.ceil(likesTotal / 22)))
        : Math.min(maxPossibleLikeRuns, candidateIndexes.length);

      // Space them evenly across the candidate range
      const selectedIndexes: number[] = [];
      if (targetLikeRuns >= candidateIndexes.length) {
        // All candidates get likes
        selectedIndexes.push(...candidateIndexes);
      } else {
        // Pick evenly spaced
        for (let i = 0; i < targetLikeRuns; i++) {
          const pos = Math.round((i / (targetLikeRuns - 1)) * (candidateIndexes.length - 1));
          const idx = candidateIndexes[pos];
          if (!selectedIndexes.includes(idx)) {
            selectedIndexes.push(idx);
          }
        }
      }

      selectedIndexes.sort((a, b) => a - b);

            if (selectedIndexes.length === 0) return result;

      // Trim if can't cover all
      while (selectedIndexes.length > 1 && likesTotal < selectedIndexes.length * MIN_LIKES_PER_RUN) {
        selectedIndexes.pop();
      }

      // 🔥 Calculate views-proportional weights for selected runs
      const selectedViews = selectedIndexes.map(idx => provisionalRuns[idx].views);
      const viewsSum = selectedViews.reduce((a, b) => a + b, 0);
      const maxViewsInSelected = Math.max(...selectedViews, 1);

          // 🔥 Distribute likes proportional to each run's views
      // High-view runs get MORE likes, low-view runs get FEWER
      // The ratio follows: likesForThisRun = (thisRunViews / avgViews) × avgLikesPerRun
      // This means: run with 2× avg views → gets 2× avg likes
      // No fixed max — scales naturally
      const avgViewsForSelected = viewsSum / Math.max(1, selectedIndexes.length);
      const avgLikesPerSelected = likesTotal / Math.max(1, selectedIndexes.length);

      const rawLikes = selectedIndexes.map((idx) => {
        const runViews = provisionalRuns[idx].views;
        // How much bigger/smaller is this run vs average?
        const viewsRatio = runViews / Math.max(1, avgViewsForSelected);
        // Scale likes by that ratio
        const base = Math.round(avgLikesPerSelected * viewsRatio);
        // Keep deterministic so changing likes percentage does not refresh the whole likes count first.
        const noise = 0;
        const maxLikesPerRun = totalViews < 50000 ? 25 : Number.POSITIVE_INFINITY;
        return Math.min(maxLikesPerRun, Math.max(MIN_LIKES_PER_RUN, base + noise));
      });

      // Scale to fit exact total
      const rawSum = rawLikes.reduce((a, b) => a + b, 0);
      const maxLikesPerRun = totalViews < 50000 ? 25 : Number.POSITIVE_INFINITY;
      const scaledLikes = rawLikes.map(v => Math.min(maxLikesPerRun, Math.max(MIN_LIKES_PER_RUN, Math.round((v / Math.max(1, rawSum)) * likesTotal))));

      // Correct total after rounding
      let diff = likesTotal - scaledLikes.reduce((a, b) => a + b, 0);
      let corrIdx = 0;
      while (diff !== 0 && corrIdx < scaledLikes.length * 10) {
        const target = corrIdx % scaledLikes.length;
        if (diff > 0 && scaledLikes[target] < maxLikesPerRun) {
          scaledLikes[target]++;
          diff--;
        } else if (scaledLikes[target] > MIN_LIKES_PER_RUN) {
          scaledLikes[target]--;
          diff++;
        }
        corrIdx++;
      }
      // 🔥 Final nudge: ensure no two consecutive same value (bounds-safe)
      for (let i = 1; i < scaledLikes.length - 1; i++) {
        if (scaledLikes[i] === scaledLikes[i - 1]) {
          if (scaledLikes[i + 1] > MIN_LIKES_PER_RUN) {
            scaledLikes[i] += 1;
            scaledLikes[i + 1] -= 1;
          } else if (scaledLikes[i] > MIN_LIKES_PER_RUN) {
            scaledLikes[i] -= 1;
            scaledLikes[i + 1] += 1;
          }
        }
      }

      // Assign to result
      selectedIndexes.forEach((runIdx, i) => {
        result[runIdx] = scaledLikes[i];
      });

      return result;
    }
        // =========================================================
    // 🔥 BRACKET MODE (default)
    // - Run index 1: ALWAYS first likes
    // - After that: closest to midpoint of each 1000-view bracket
    // - Likes scale with run's views (no fixed max)
    // =========================================================
    const selectedIndexes: number[] = [];
    if (provisionalRuns.length >= 2) {
      selectedIndexes.push(1);
    }

    const bracketSize = 1000;
    const maxBrackets = Math.floor(totalViewsAll / bracketSize);

    for (let bracketIndex = 1; bracketIndex <= maxBrackets; bracketIndex++) {
      const midpoint = bracketIndex * bracketSize + bracketSize / 2;
      if (midpoint > totalViewsAll) break;

      let bestRunIndex = -1;
      let bestDiff = Infinity;

      for (let i = 2; i < provisionalRuns.length - 2; i++) {
        const diff = Math.abs(cumulativeViewsPerRun[i] - midpoint);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestRunIndex = i;
        }
      }

      if (
        bestRunIndex !== -1 &&
        !selectedIndexes.includes(bestRunIndex) &&
        !selectedIndexes.some(s => Math.abs(s - bestRunIndex) < 2)
      ) {
        selectedIndexes.push(bestRunIndex);
      }
    }

    selectedIndexes.sort((a, b) => a - b);

    while (
      selectedIndexes.length > 1 &&
      likesTotal < selectedIndexes.length * MIN_LIKES_PER_RUN
    ) {
      selectedIndexes.pop();
    }

    if (selectedIndexes.length === 0 || likesTotal < MIN_LIKES_PER_RUN) return result;

    // 🔥 Distribute likes proportional to each selected run's views
    const selectedViews = selectedIndexes.map(idx => provisionalRuns[idx].views);
    const bracketViewsSum = selectedViews.reduce((a, b) => a + b, 0);

    const rawBracketLikes = selectedIndexes.map((idx) => {
      const runViews = provisionalRuns[idx].views;
      const proportion = bracketViewsSum > 0 ? (runViews / bracketViewsSum) : (1 / selectedIndexes.length);
      const base = Math.round(proportion * likesTotal);
      const noise = 0;
      const maxLikesPerRun = totalViews < 50000 ? 25 : Number.POSITIVE_INFINITY;
      return Math.min(maxLikesPerRun, Math.max(MIN_LIKES_PER_RUN, base + noise));
    });

    // Scale to exact total
    const bracketRawSum = rawBracketLikes.reduce((a, b) => a + b, 0);
    const bracketMaxLikesPerRun = totalViews < 50000 ? 25 : Number.POSITIVE_INFINITY;
    const bracketScaled = rawBracketLikes.map(v => Math.min(bracketMaxLikesPerRun, Math.max(MIN_LIKES_PER_RUN, Math.round((v / Math.max(1, bracketRawSum)) * likesTotal))));

    // Correct rounding
    let bracketDiff = likesTotal - bracketScaled.reduce((a, b) => a + b, 0);
    let bracketIdx = 0;
    while (bracketDiff !== 0 && bracketIdx < bracketScaled.length * 10) {
      const target = bracketIdx % bracketScaled.length;
      if (bracketDiff > 0 && bracketScaled[target] < bracketMaxLikesPerRun) {
        bracketScaled[target]++;
        bracketDiff--;
      } else if (bracketScaled[target] > MIN_LIKES_PER_RUN) {
        bracketScaled[target]--;
        bracketDiff++;
      }
      bracketIdx++;
    }

    // 🔥 Nudge consecutive duplicates
    for (let i = 1; i < bracketScaled.length - 1; i++) {
      if (bracketScaled[i] === bracketScaled[i - 1]) {
        if (bracketScaled[i] < bracketMaxLikesPerRun && bracketScaled[i + 1] > MIN_LIKES_PER_RUN) {
          bracketScaled[i] += 1;
          bracketScaled[i + 1] -= 1;
        } else if (bracketScaled[i] > MIN_LIKES_PER_RUN) {
          bracketScaled[i] -= 1;
          bracketScaled[i + 1] += 1;
        }
      }
    }

    // Assign
    selectedIndexes.forEach((runIdx, i) => {
      result[runIdx] = bracketScaled[i];
    });

    return result;
  })();
  
   // =========================================================
  // 🔥 SHARES DISTRIBUTION
  // Rule: After every 2 like-runs, place 1 share-run
  // Then if more shares remain, add extra share-runs evenly spaced
  // Distribute shares proportional to views (not flat)
  // =========================================================
  const sharesRuns = (() => {
    const result = Array.from({ length: provisionalRuns.length }, () => 0);
    if (!config.includeShares || sharesTotal <= 0 || provisionalRuns.length <= 1) return result;

    const minPerRun = 10;
    const likeRunIndexes = likesRuns
      .map((val, idx) => (val > 0 ? idx : -1))
      .filter(idx => idx !== -1);

    // Shares should NOT appear before likes have real traction.
    // Start shares after roughly half of the like-runs / like volume has happened.
    let halfLikesIndex = Math.max(minEngagementIndex, Math.floor(provisionalRuns.length * 0.55));
    if (likeRunIndexes.length > 0) {
      const halfByRun = likeRunIndexes[Math.floor(likeRunIndexes.length * 0.5)] ?? likeRunIndexes[0];
      let cumulativeLikeSeen = 0;
      const halfLikeTotal = likesTotal * 0.5;
      let halfByVolume = halfByRun;
      for (let i = 0; i < likesRuns.length; i += 1) {
        cumulativeLikeSeen += likesRuns[i] || 0;
        if (cumulativeLikeSeen >= halfLikeTotal) {
          halfByVolume = i;
          break;
        }
      }
      halfLikesIndex = Math.max(minEngagementIndex, halfByRun, halfByVolume);
    }

    const normalShareStartIndex = Math.max(
      minEngagementIndex,
      (likeRunIndexes[1] ?? likeRunIndexes[0] ?? minEngagementIndex) + 1
    );
    const shareStartIndex = config.sharesAfterHalfLikes ? halfLikesIndex : normalShareStartIndex;

    const maxShareRuns = Math.max(1, Math.floor(sharesTotal / minPerRun));
    const candidates = Array.from({ length: provisionalRuns.length }, (_, i) => i)
      .filter(i => i >= shareStartIndex && i < provisionalRuns.length - 1 && afterEngagementWarmup(i));

    if (candidates.length === 0 || sharesTotal < minPerRun) return result;

    const selectedCount = Math.min(maxShareRuns, candidates.length);
    const selectedIndexes: number[] = [];

    // Evenly distribute share runs over the second half of the campaign.
    // This prevents two share runs from sitting close together and makes the orange line smoother.
    if (selectedCount === 1) {
      const target = Math.round(candidates.length * 0.58);
      selectedIndexes.push(candidates[Math.min(candidates.length - 1, Math.max(0, target))]);
    } else {
      const minGap = Math.max(1, Math.floor(candidates.length / (selectedCount + 1)));
      for (let i = 0; i < selectedCount; i += 1) {
        const pos = Math.round(((i + 1) / (selectedCount + 1)) * (candidates.length - 1));
        let picked = candidates[pos];
        // Nudge forward if too close to previous selected share run.
        while (
          selectedIndexes.length > 0 &&
          picked - selectedIndexes[selectedIndexes.length - 1] < minGap &&
          candidates.includes(picked + 1)
        ) {
          picked += 1;
        }
        if (!selectedIndexes.includes(picked)) selectedIndexes.push(picked);
      }
    }

    selectedIndexes.sort((a, b) => a - b);

    const selectedViews = selectedIndexes.map(idx => provisionalRuns[idx].views);
    const viewsSum = selectedViews.reduce((a, b) => a + b, 0);
    const rawShares = selectedIndexes.map((idx) => {
      const proportion = viewsSum > 0 ? (provisionalRuns[idx].views / viewsSum) : (1 / selectedIndexes.length);
      return Math.max(minPerRun, Math.round(proportion * sharesTotal));
    });

    const rawSum = rawShares.reduce((a, b) => a + b, 0);
    const scaled = rawShares.map(v => Math.max(minPerRun, Math.round((v / Math.max(1, rawSum)) * sharesTotal)));

    let diff = sharesTotal - scaled.reduce((a, b) => a + b, 0);
    let corrIdx = 0;
    while (diff !== 0 && corrIdx < scaled.length * 20) {
      const target = corrIdx % scaled.length;
      if (diff > 0) { scaled[target]++; diff--; }
      else if (scaled[target] > minPerRun) { scaled[target]--; diff++; }
      corrIdx++;
    }

    selectedIndexes.forEach((runIdx, i) => {
      result[runIdx] = scaled[i];
    });

    return result;
  })();
    // =========================================================
  // 🔥 SAVES DISTRIBUTION
  // Step 1: Place 1 save 1-3 runs AFTER each share-run
  // Step 2: If savesTotal needs MORE runs, add extras evenly spaced
  // Distribute saves proportional to views (not flat)
  // =========================================================
  const savesRuns = (() => {
    const result = Array.from({ length: provisionalRuns.length }, () => 0);
    if (!config.includeSaves || savesTotal <= 0 || provisionalRuns.length <= 1) return result;

    const minPerRun = 10;

    const shareRunIndexes = sharesRuns
      .map((val, idx) => (val > 0 ? idx : -1))
      .filter(idx => idx !== -1);

    const selectedIndexes: number[] = [];

    // Step 1: After each share-run, place 1 save 1-3 runs later
    for (const shareIdx of shareRunIndexes) {
      const offsets = [1, 2, 3];
      for (const offset of offsets) {
        const saveIndex = shareIdx + offset;
               if (
          saveIndex < provisionalRuns.length - 1 &&
          saveIndex > 0 &&
          afterEngagementWarmup(saveIndex) &&
          !selectedIndexes.includes(saveIndex)
        ) {
          selectedIndexes.push(saveIndex);
          break;
        }
      }
    }

    // Step 2: If savesTotal needs MORE runs than we have, add extras
    const maxSaveRuns = Math.floor(savesTotal / minPerRun);
    if (selectedIndexes.length < maxSaveRuns) {
      // Find all available slots
            const availableSlots = Array.from(
        { length: provisionalRuns.length },
        (_, i) => i
      ).filter(i =>
        i >= Math.max(1, minEngagementIndex) &&
        i < provisionalRuns.length - 1 &&
        !selectedIndexes.includes(i)
      );

      // Pick evenly spaced from available
      const needed = maxSaveRuns - selectedIndexes.length;
      if (needed > 0 && availableSlots.length > 0) {
        const step = Math.max(1, Math.floor(availableSlots.length / needed));
        for (let j = 0; j < availableSlots.length && selectedIndexes.length < maxSaveRuns; j += step) {
          selectedIndexes.push(availableSlots[j]);
        }
      }
    }

    // Fallback: if still empty, place every 5 runs from index 5
    if (selectedIndexes.length === 0) {
           for (let i = 5; i < provisionalRuns.length - 2; i += 5) {
        if (sharesRuns[i] === 0) {
          selectedIndexes.push(i);
        }
        if (selectedIndexes.length >= maxSaveRuns) break;
      }
    }

    selectedIndexes.sort((a, b) => a - b);

    // Trim if can't cover minimums
    while (selectedIndexes.length > 1 && savesTotal < selectedIndexes.length * minPerRun) {
      selectedIndexes.pop();
    }

    if (selectedIndexes.length === 0 || savesTotal < minPerRun) return result;

    // 🔥 Distribute proportional to views (not flat)
    const selectedViews = selectedIndexes.map(idx => provisionalRuns[idx].views);
    const viewsSum = selectedViews.reduce((a, b) => a + b, 0);

    const rawSaves = selectedIndexes.map((idx) => {
      const proportion = viewsSum > 0 ? (provisionalRuns[idx].views / viewsSum) : (1 / selectedIndexes.length);
      const base = Math.round(proportion * savesTotal);
      const noise = randomInt(-1, 1);
      return Math.max(minPerRun, base + noise);
    });

    // Scale to exact total
    const rawSum = rawSaves.reduce((a, b) => a + b, 0);
    const scaled = rawSaves.map(v => Math.max(minPerRun, Math.round((v / Math.max(1, rawSum)) * savesTotal)));

    // Correct rounding
    let diff = savesTotal - scaled.reduce((a, b) => a + b, 0);
    let corrIdx = 0;
    while (diff !== 0 && corrIdx < scaled.length * 10) {
      const target = corrIdx % scaled.length;
      if (diff > 0) { scaled[target]++; diff--; }
      else if (scaled[target] > minPerRun) { scaled[target]--; diff++; }
      corrIdx++;
    }

    // Nudge consecutive duplicates
    for (let i = 1; i < scaled.length - 1; i++) {
      if (scaled[i] === scaled[i - 1]) {
        if (scaled[i + 1] > minPerRun) {
          scaled[i] += 1;
          scaled[i + 1] -= 1;
        } else if (scaled[i] > minPerRun) {
          scaled[i] -= 1;
          scaled[i + 1] += 1;
        }
      }
    }

    // Assign
    selectedIndexes.forEach((runIdx, i) => {
      result[runIdx] = scaled[i];
    });

    return result;
  })();

   // =========================================================
  // 🔥 REPOSTS DISTRIBUTION
  // Same logic as shares — strategic placement
  // After every 3rd like-run, place 1 repost-run
  // No overlap with shares or saves
  // Min 10 per repost-run
  // =========================================================
  const repostsRuns = (() => {
    const result = Array.from({ length: provisionalRuns.length }, () => 0);
    if (!config.includeReposts || repostsTotal <= 0 || provisionalRuns.length <= 4) return result;

    const minPerRun = 10;

    const likeRunIndexes = likesRuns
      .map((val, idx) => (val > 0 ? idx : -1))
      .filter(idx => idx !== -1);

    const selectedIndexes: number[] = [];

    // After every 3rd like-run, place 1 repost
    for (let i = 2; i < likeRunIndexes.length; i += 3) {
      const afterLikeIndex = likeRunIndexes[i];
      for (const offset of [1, 2, 3, 4]) {
        const repostIndex = afterLikeIndex + offset;
        if (
          repostIndex < provisionalRuns.length - 2 &&
          repostIndex > 0 &&
          !selectedIndexes.includes(repostIndex) &&
          sharesRuns[repostIndex] === 0 &&
          savesRuns[repostIndex] === 0
        ) {
          selectedIndexes.push(repostIndex);
          break;
        }
      }
    }

    // Add extras if needed
    const maxRepostRuns = Math.floor(repostsTotal / minPerRun);
    if (selectedIndexes.length < maxRepostRuns) {
      const availableSlots = Array.from(
        { length: provisionalRuns.length },
        (_, i) => i
      ).filter(i =>
        i >= 3 &&
        i < provisionalRuns.length - 2 &&
        sharesRuns[i] === 0 &&
        savesRuns[i] === 0 &&
        !selectedIndexes.includes(i)
      );

      const needed = maxRepostRuns - selectedIndexes.length;
      if (needed > 0 && availableSlots.length > 0) {
        const step = Math.max(1, Math.floor(availableSlots.length / needed));
        for (let j = 0; j < availableSlots.length && selectedIndexes.length < maxRepostRuns; j += step) {
          selectedIndexes.push(availableSlots[j]);
        }
      }
    }

    // Fallback
    if (selectedIndexes.length === 0) {
      for (let i = 6; i < provisionalRuns.length - 2; i += 6) {
        if (sharesRuns[i] === 0 && savesRuns[i] === 0) {
          selectedIndexes.push(i);
        }
        if (selectedIndexes.length >= maxRepostRuns) break;
      }
    }

    selectedIndexes.sort((a, b) => a - b);

    while (selectedIndexes.length > 1 && repostsTotal < selectedIndexes.length * minPerRun) {
      selectedIndexes.pop();
    }

    if (selectedIndexes.length === 0 || repostsTotal < minPerRun) return result;

    // Distribute proportional to views
    const selectedViews = selectedIndexes.map(idx => provisionalRuns[idx].views);
    const viewsSum = selectedViews.reduce((a, b) => a + b, 0);

    const rawReposts = selectedIndexes.map((idx) => {
      const proportion = viewsSum > 0 ? (provisionalRuns[idx].views / viewsSum) : (1 / selectedIndexes.length);
      const base = Math.round(proportion * repostsTotal);
      return Math.max(minPerRun, base + randomInt(-1, 1));
    });

    const rawSum = rawReposts.reduce((a, b) => a + b, 0);
    const scaled = rawReposts.map(v => Math.max(minPerRun, Math.round((v / Math.max(1, rawSum)) * repostsTotal)));

    let diff = repostsTotal - scaled.reduce((a, b) => a + b, 0);
    let corrIdx = 0;
    while (diff !== 0 && corrIdx < scaled.length * 10) {
      const target = corrIdx % scaled.length;
      if (diff > 0) { scaled[target]++; diff--; }
      else if (scaled[target] > minPerRun) { scaled[target]--; diff++; }
      corrIdx++;
    }

    selectedIndexes.forEach((runIdx, i) => {
      result[runIdx] = scaled[i];
    });

    return result;
  })();

  // =========================================================
  // 🔥 COMMENTS DISTRIBUTION
  // Rules:
  // - Skip first 3 runs
  // - Skip last 2 runs
  // - Never land on same run as likes, shares, or saves
  // - Minimum 10 per comment-run (service minimum)
  // - Spread across cumulative views milestones
  // - Comments proportional to views at that point
  // =========================================================
  const commentsRuns = (() => {
    const result = Array.from({ length: provisionalRuns.length }, () => 0);
    if (!config.includeComments || commentsTotal <= 0) return result;

    const MIN_COMMENTS_PER_RUN = 10;
    const MAX_COMMENTS_PER_RUN = 15;

    // Build cumulative views
    let cumViews = 0;
    const cumulativeViewsPerRun = provisionalRuns.map(r => {
      cumViews += r.views;
      return cumViews;
    });
    const totalViewsAll = cumulativeViewsPerRun[cumulativeViewsPerRun.length - 1] || 1;

    // 🔥 Available: skip first 3, skip last 2, skip runs with likes/shares/saves
        const availableIndexes = Array.from(
      { length: provisionalRuns.length },
      (_, i) => i
    ).filter(i =>
      i >= Math.max(1, minEngagementIndex) &&
      i < provisionalRuns.length - 1 &&
      likesRuns[i] === 0 &&
      sharesRuns[i] === 0 &&
      savesRuns[i] === 0 &&
      repostsRuns[i] === 0
    );

    // Fallback: if filtering removed everything, allow any run except first 3 and last 2
    const candidateIndexes = availableIndexes.length > 0
      ? availableIndexes
      : Array.from(
          { length: provisionalRuns.length },
          (_, i) => i
        ).filter(i => i >= Math.max(1, minEngagementIndex) && i < provisionalRuns.length - 1);
    
    if (candidateIndexes.length === 0) return result;

    // 🔥 How many comment-runs can we have?
    const maxCommentRuns = Math.floor(commentsTotal / MIN_COMMENTS_PER_RUN);
    if (maxCommentRuns <= 0) return result;

    // 🔥 Place comments at cumulative views milestones
    // Spread evenly across the cumulative views range
    const targetCommentRuns = Math.min(maxCommentRuns, candidateIndexes.length);
    const selectedIndexes: number[] = [];

    if (targetCommentRuns >= candidateIndexes.length) {
      // All candidates get comments
      selectedIndexes.push(...candidateIndexes);
    } else {
      // Place at cumulative views milestones
      const milestoneStep = totalViewsAll / (targetCommentRuns + 1);

      for (let m = 1; m <= targetCommentRuns; m++) {
        const targetCumViews = milestoneStep * m;

        // Find candidate closest to this cumulative views target
        let bestIdx = -1;
        let bestDiff = Infinity;

        for (const candIdx of candidateIndexes) {
          if (selectedIndexes.includes(candIdx)) continue;
          // Don't pick too close to already selected
          if (selectedIndexes.some(s => Math.abs(s - candIdx) < 2)) continue;

          const diff = Math.abs(cumulativeViewsPerRun[candIdx] - targetCumViews);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = candIdx;
          }
        }

        if (bestIdx !== -1) {
          selectedIndexes.push(bestIdx);
        }
      }
    }

    selectedIndexes.sort((a, b) => a - b);

    // Trim if can't cover minimums
    while (selectedIndexes.length > 1 && commentsTotal < selectedIndexes.length * MIN_COMMENTS_PER_RUN) {
      selectedIndexes.pop();
    }

    if (selectedIndexes.length === 0 || commentsTotal < MIN_COMMENTS_PER_RUN) return result;

    // 🔥 Distribute comments proportional to cumulative views at each selected run
    // Runs later in the order (more cumulative views) get slightly more comments
    const selectedCumViews = selectedIndexes.map(idx => cumulativeViewsPerRun[idx]);
    const cumViewsSum = selectedCumViews.reduce((a, b) => a + b, 0);

        const rawComments = selectedIndexes.map((idx) => {
      const cumV = cumulativeViewsPerRun[idx];
      const proportion = cumViewsSum > 0 ? (cumV / cumViewsSum) : (1 / selectedIndexes.length);
      const base = Math.round(proportion * commentsTotal);
      const noise = randomInt(-1, 1);
      return clamp(base + noise, MIN_COMMENTS_PER_RUN, MAX_COMMENTS_PER_RUN);
    });

    // Scale to exact total
    const rawSum = rawComments.reduce((a, b) => a + b, 0);
    const scaled = rawComments.map(v => clamp(
      Math.round((v / Math.max(1, rawSum)) * commentsTotal),
      MIN_COMMENTS_PER_RUN,
      MAX_COMMENTS_PER_RUN
    ));

    // Correct rounding — respect both min and max
    let diff = commentsTotal - scaled.reduce((a, b) => a + b, 0);
    let corrIdx = 0;
    while (diff !== 0 && corrIdx < scaled.length * 10) {
      const target = corrIdx % scaled.length;
      if (diff > 0 && scaled[target] < MAX_COMMENTS_PER_RUN) {
        scaled[target]++;
        diff--;
      } else if (diff < 0 && scaled[target] > MIN_COMMENTS_PER_RUN) {
        scaled[target]--;
        diff++;
      }
      corrIdx++;
    }

    // Nudge consecutive duplicates — respect max
    for (let i = 1; i < scaled.length - 1; i++) {
      if (scaled[i] === scaled[i - 1]) {
        if (scaled[i] < MAX_COMMENTS_PER_RUN && scaled[i + 1] > MIN_COMMENTS_PER_RUN) {
          scaled[i] += 1;
          scaled[i + 1] -= 1;
        } else if (scaled[i] > MIN_COMMENTS_PER_RUN && scaled[i + 1] < MAX_COMMENTS_PER_RUN) {
          scaled[i] -= 1;
          scaled[i + 1] += 1;
        }
      }
    }
    // Assign
    selectedIndexes.forEach((runIdx, i) => {
      result[runIdx] = scaled[i];
    });

    return result;
  })();

  // =========================================================
  // 🔥 USER-DEFINED VIEW-BRACKET RULES
  // When `engagementRulesEnabled` is on, each user-defined bracket clamps
  // the per-run engagement value for runs whose `views` fall in [viewsMin,
  // viewsMax]. Only services with `enabled === true` are affected; everything
  // else falls back to the automatic distribution.
  //
  // The clamping changes per-run values, so the array TOTAL shifts. We then
  // redistribute the diff across runs that AREN'T governed by any rule,
  // keeping the global ratio shape and never going below 10 (provider min).
  // =========================================================
  function applyEngagementRules(
    arr: number[],
    service: "likes" | "shares" | "saves" | "comments" | "reposts",
  ): void {
    if (!config.engagementRulesEnabled || !config.engagementRules || config.engagementRules.length === 0) return;
    if (arr.length !== provisionalRuns.length) return;

    const MIN_PROVIDER = 10;

    // Map run-index -> matching rule range for this service (or null).
    // If multiple rules match, the FIRST defined wins (user controls order).
    const ruleByIndex: Array<{ min: number; max: number } | null> = provisionalRuns.map((run) => {
      const views = run.views;
      for (const rule of config.engagementRules!) {
        if (views < rule.viewsMin || views > rule.viewsMax) continue;
        const range = rule[service];
        if (!range || !range.enabled) continue;
        const lo = Math.max(MIN_PROVIDER, Math.floor(range.min));
        const hi = Math.max(lo, Math.floor(range.max));
        return { min: lo, max: hi };
      }
      return null;
    });

    // Snapshot ORIGINAL totals so the bucket of "ruled" runs keeps roughly
    // the same volume share as before — we rebalance ONLY within unruled runs.
    const originalTotal = arr.reduce((a, b) => a + b, 0);

    // Phase 1: clamp ruled runs to their bracket range. We pick a value in
    // the [min, max] band proportional to where the original sat, so high
    // runs stay high and low runs stay low within the band.
    const arrMax = Math.max(1, ...arr);
    let diff = 0; // positive = we ADDED units (others must give back)
                  // negative = we REMOVED units (others should absorb)
    for (let i = 0; i < arr.length; i++) {
      const rule = ruleByIndex[i];
      if (!rule) continue;
      const original = arr[i];
      // Relative position [0..1] of this run's engagement within the array.
      const rel = arrMax > 0 ? Math.min(1, Math.max(0, original / arrMax)) : 0;
      // Use the seeded RNG for a tiny jitter so two adjacent ruled runs
      // with identical views don't produce identical engagement values.
      const noise = (random(0, 1) - 0.5) * 0.15; // ±7.5%
      const t = Math.min(1, Math.max(0, rel + noise));
      const target = Math.round(rule.min + t * (rule.max - rule.min));
      diff += target - original;
      arr[i] = target;
    }

    if (diff === 0) return;

    // Phase 2: rebalance against the UNRULED runs only. We never push any
    // run below MIN_PROVIDER, and we don't touch ruled runs.
    const unruled: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (ruleByIndex[i] === null && arr[i] > 0) unruled.push(i);
    }
    if (unruled.length === 0) return;

    if (diff > 0) {
      // We added `diff` units to ruled runs — subtract proportionally from unruled.
      const totalUnruled = unruled.reduce((s, i) => s + arr[i], 0);
      if (totalUnruled <= 0) return;
      let remaining = diff;
      // Sort biggest first so big runs absorb the brunt
      const sorted = [...unruled].sort((a, b) => arr[b] - arr[a]);
      for (const i of sorted) {
        if (remaining <= 0) break;
        const canTake = Math.max(0, arr[i] - MIN_PROVIDER);
        if (canTake === 0) continue;
        const share = Math.min(canTake, Math.ceil((arr[i] / totalUnruled) * diff));
        const actual = Math.min(share, remaining);
        arr[i] -= actual;
        remaining -= actual;
      }
      // If we still couldn't absorb everything (rare — all unruled at floor),
      // accept the drift. The total will be slightly above what was asked,
      // but never wildly off.
    } else {
      // We removed |diff| units from ruled runs — add them to unruled.
      let remaining = -diff;
      const sorted = [...unruled].sort((a, b) => arr[a] - arr[b]); // smallest first
      while (remaining > 0) {
        let progress = false;
        for (const i of sorted) {
          if (remaining <= 0) break;
          arr[i] += 1;
          remaining -= 1;
          progress = true;
        }
        if (!progress) break;
      }
    }

    // Small safety: never let a ruled value violate the [10, ...) provider floor
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < MIN_PROVIDER && arr[i] !== 0) arr[i] = MIN_PROVIDER;
    }

    // Debug: log final delta from original (should be ≈ 0 in normal cases)
    const finalTotal = arr.reduce((a, b) => a + b, 0);
    if (Math.abs(finalTotal - originalTotal) > Math.max(20, originalTotal * 0.05)) {
      // Drift > 5% or > 20 units — surface in console for awareness.
      // eslint-disable-next-line no-console
      console.debug(
        `[engagementRules:${service}] total drift ${finalTotal - originalTotal} ` +
        `(orig ${originalTotal} → new ${finalTotal})`,
      );
    }
  }

  // Build per-service sets of "ruled" run indexes so the jitter pass below
  // never disturbs values the user explicitly pinned.
  const ruledIdxs: Record<"likes" | "shares" | "saves" | "comments" | "reposts", Set<number>> = {
    likes: new Set(), shares: new Set(), saves: new Set(), comments: new Set(), reposts: new Set(),
  };
  function collectRuledIdxs(service: "likes" | "shares" | "saves" | "comments" | "reposts"): void {
    if (!config.engagementRulesEnabled || !config.engagementRules) return;
    for (let i = 0; i < provisionalRuns.length; i++) {
      const v = provisionalRuns[i].views;
      for (const r of config.engagementRules) {
        if (v >= r.viewsMin && v <= r.viewsMax && r[service] && r[service].enabled) {
          ruledIdxs[service].add(i);
          break;
        }
      }
    }
  }
  collectRuledIdxs("likes");
  collectRuledIdxs("shares");
  collectRuledIdxs("saves");
  collectRuledIdxs("comments");
  collectRuledIdxs("reposts");

  applyEngagementRules(likesRuns, "likes");
  applyEngagementRules(sharesRuns, "shares");
  applyEngagementRules(savesRuns, "saves");
  applyEngagementRules(commentsRuns, "comments");
  applyEngagementRules(repostsRuns, "reposts");

  // =========================================================
  // 🔥 ENGAGEMENT-MINIMUM JITTER PASS
  // Real users don't react in flat rows of "10, 10, 10, 10".
  // For each engagement array, find runs that are AT the floor and have a
  // neighbour with headroom — swap 1-3 units between them so the visible
  // numbers become e.g. [10, 12, 11, 10, 13, 11] while the total is preserved
  // exactly. The 10-floor (provider minimum) is never violated.
  // =========================================================
  function jitterFloorRuns(arr: number[], minPerRun: number, skipSet?: Set<number>): void {
    if (arr.length < 3) return;
    const floorIdxs: number[] = [];
    const donorIdxs: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (skipSet && skipSet.has(i)) continue;
      if (arr[i] === minPerRun) floorIdxs.push(i);
      else if (arr[i] >= minPerRun + 4) donorIdxs.push(i);
    }
    if (floorIdxs.length === 0 || donorIdxs.length === 0) return;

    // Jitter at most ~40% of floor runs; pick deterministically via the
    // seeded RNG so the same plan always jitters the same way.
    const targetCount = Math.max(1, Math.floor(floorIdxs.length * 0.4));
    let jittered = 0;
    let donorPtr = 0;

    for (const fIdx of floorIdxs) {
      if (jittered >= targetCount) break;
      // Find a donor that still has > minPerRun + 2 left.
      let chosen = -1;
      for (let attempts = 0; attempts < donorIdxs.length; attempts++) {
        const dIdx = donorIdxs[(donorPtr + attempts) % donorIdxs.length];
        if (arr[dIdx] >= minPerRun + 4) {
          chosen = dIdx;
          donorPtr = (donorPtr + attempts + 1) % donorIdxs.length;
          break;
        }
      }
      if (chosen === -1) break;
      // Move 1-4 units to fIdx. Random in [1, min(4, donor - (min+2))].
      const maxGive = Math.min(4, arr[chosen] - (minPerRun + 2));
      if (maxGive < 1) continue;
      const give = 1 + Math.floor(random(0, 1) * maxGive); // 1..maxGive
      arr[fIdx] += give;
      arr[chosen] -= give;
      jittered++;
    }
  }

  // Apply jitter to every engagement array. Floor is 10 for engagement
  // services (matches every block above's `minPerRun = 10`).
  jitterFloorRuns(likesRuns, 10, ruledIdxs.likes);
  jitterFloorRuns(sharesRuns, 10, ruledIdxs.shares);
  jitterFloorRuns(savesRuns, 10, ruledIdxs.saves);
  jitterFloorRuns(commentsRuns, 10, ruledIdxs.comments);
  jitterFloorRuns(repostsRuns, 10, ruledIdxs.reposts);

  // =========================================================
  // 🔥 BUILD FINAL RUNS
  // =========================================================
   let cumulativeViews = 0;
  let cumulativeLikes = 0;
  let cumulativeShares = 0;
  let cumulativeSaves = 0;
  let cumulativeComments = 0;
  let cumulativeReposts = 0;

  const runs: RunStep[] = provisionalRuns.map((run, index) => {
    cumulativeViews += run.views;
    cumulativeLikes += likesRuns[index];
    cumulativeShares += sharesRuns[index];
    cumulativeSaves += savesRuns[index];
    cumulativeComments += commentsRuns[index];
    cumulativeReposts += repostsRuns[index];

    return {
      run: index + 1,
      at: run.at,
      minutesFromStart: Math.round((run.at.getTime() - now.getTime()) / 60_000),
      views: run.views,
      likes: likesRuns[index],
      shares: sharesRuns[index],
      saves: savesRuns[index],
      comments: commentsRuns[index],
      reposts: repostsRuns[index],
      cumulativeViews,
      cumulativeLikes,
      cumulativeShares,
      cumulativeSaves,
      cumulativeComments,
      cumulativeReposts,
    };
  });

  const viewsPerHour = totalViews / Math.max(1, durationHours);

  return {
    patternId,
    patternName,
    patternType,
    totalRuns: runs.length,
    approximateIntervalMin: Math.round(durationMin / Math.max(1, runs.length)),
    finishTime: runs[runs.length - 1]?.at ?? now,
    estimatedDurationHours: Number((durationHours + startDelayMin / 60).toFixed(1)),
    risk: detectRisk(viewsPerHour, variance, durationHours),
    runs,
  };
}
