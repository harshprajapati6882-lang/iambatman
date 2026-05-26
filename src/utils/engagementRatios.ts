// ============================================================
// 🔥 ENGAGEMENT RATIO SETTINGS
// Stored in localStorage. Used by patterns.ts at plan-generation time.
// All values are "per 10,000 views" so they are human-readable.
// ============================================================

export interface EngagementRatios {
  // How many likes per 10,000 views
  likesPer10k: number;
  // How many shares per 10,000 views
  sharesPer10k: number;
  // How many saves per 10,000 views
  savesPer10k: number;
  // How many reposts per 10,000 views
  repostsPer10k: number;
  // How many comments per 10,000 views
  commentsPer10k: number;
}

// ── DEFAULT ratios (matches the existing hardcoded logic in patterns.ts) ──────
// These are derived from the current code's defaults at ~50k–750k views range:
//   likes  ≈ 9.5% of views  → 950 per 10k
//   shares ≈ 12% of likes   → ~114 per 10k
//   saves  ≈ 1.5% of likes  → ~14  per 10k
//   reposts≈ 2.5% of likes  → ~24  per 10k
//   comments≈ 0.15% of views→ ~15  per 10k
export const DEFAULT_ENGAGEMENT_RATIOS: EngagementRatios = {
  likesPer10k: 950,
  sharesPer10k: 114,
  savesPer10k: 14,
  repostsPer10k: 24,
  commentsPer10k: 15,
};

const STORAGE_KEY = "dev-smm-engagement-ratios";
const PRESETS_KEY = "dev-smm-engagement-presets";

// ── Read active ratios from localStorage (falls back to defaults) ─────────────
export function getEngagementRatios(): EngagementRatios {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ENGAGEMENT_RATIOS };
    const parsed = JSON.parse(raw) as Partial<EngagementRatios>;
    return {
      likesPer10k: Number.isFinite(parsed.likesPer10k) && parsed.likesPer10k! >= 0 ? parsed.likesPer10k! : DEFAULT_ENGAGEMENT_RATIOS.likesPer10k,
      sharesPer10k: Number.isFinite(parsed.sharesPer10k) && parsed.sharesPer10k! >= 0 ? parsed.sharesPer10k! : DEFAULT_ENGAGEMENT_RATIOS.sharesPer10k,
      savesPer10k: Number.isFinite(parsed.savesPer10k) && parsed.savesPer10k! >= 0 ? parsed.savesPer10k! : DEFAULT_ENGAGEMENT_RATIOS.savesPer10k,
      repostsPer10k: Number.isFinite(parsed.repostsPer10k) && parsed.repostsPer10k! >= 0 ? parsed.repostsPer10k! : DEFAULT_ENGAGEMENT_RATIOS.repostsPer10k,
      commentsPer10k: Number.isFinite(parsed.commentsPer10k) && parsed.commentsPer10k! >= 0 ? parsed.commentsPer10k! : DEFAULT_ENGAGEMENT_RATIOS.commentsPer10k,
    };
  } catch {
    return { ...DEFAULT_ENGAGEMENT_RATIOS };
  }
}

// ── Save active ratios to localStorage ───────────────────────────────────────
export function saveEngagementRatios(ratios: EngagementRatios): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ratios));
}

// ── Reset to code defaults ────────────────────────────────────────────────────
export function resetEngagementRatios(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Are ratios currently customised? ─────────────────────────────────────────
export function isEngagementCustomised(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

// ── Named preset management ───────────────────────────────────────────────────
export interface EngagementPreset {
  id: string;
  name: string;
  savedAt: string;
  ratios: EngagementRatios;
}

export function getEngagementPresets(): EngagementPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? (JSON.parse(raw) as EngagementPreset[]) : [];
  } catch {
    return [];
  }
}

export function saveEngagementPreset(name: string, ratios: EngagementRatios): EngagementPreset {
  const presets = getEngagementPresets();
  const preset: EngagementPreset = {
    id: `preset-${Date.now()}`,
    name: name.trim() || `Preset ${presets.length + 1}`,
    savedAt: new Date().toISOString(),
    ratios,
  };
  localStorage.setItem(PRESETS_KEY, JSON.stringify([preset, ...presets]));
  return preset;
}

export function deleteEngagementPreset(id: string): void {
  const presets = getEngagementPresets().filter((p) => p.id !== id);
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function applyEngagementPreset(id: string): EngagementRatios | null {
  const preset = getEngagementPresets().find((p) => p.id === id);
  if (!preset) return null;
  saveEngagementRatios(preset.ratios);
  return preset.ratios;
}

// ── Helper: convert ratios to fractions for patterns.ts ──────────────────────
export function ratiosToFractions(ratios: EngagementRatios) {
  return {
    likesFraction: ratios.likesPer10k / 10000,
    sharesFraction: ratios.sharesPer10k / 10000,
    savesFraction: ratios.savesPer10k / 10000,
    repostsFraction: ratios.repostsPer10k / 10000,
    commentsFraction: ratios.commentsPer10k / 10000,
  };
}
