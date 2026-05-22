import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart, 
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PatternPlan, QuickPatternPreset, DeliveryOption } from "../types/order";

// 🔥 Favourite = config settings, NOT raw runs
interface FavouriteConfig {
  id: string;
  savedAt: string;
  name: string;
  patternName: string;
  patternType: PatternPlan["patternType"];
  totalRuns: number;
  estimatedDurationHours: number;
  approximateIntervalMin: number;
  finishTime: string;
  risk: PatternPlan["risk"];
  quickPreset: QuickPatternPreset | null;
  variancePercent: number;
  delivery: DeliveryOption;
  includeLikes: boolean;
  includeShares: boolean;
  includeSaves: boolean;
  includeComments: boolean;
  peakHoursBoost: boolean;
  // 🔥 Save actual runs as proportions (0-1) of total views
  runProportions: Array<{
    minutesFromStart: number;
    viewsFraction: number;
    likesFraction: number;
    sharesFraction: number;
    savesFraction: number;
    commentsFraction: number;
  }>;
  savedTotalViews: number;
}

interface GrowthGraphProps {
  plan: PatternPlan;
  selectedPreset?: QuickPatternPreset | null;
  variancePercent?: number;
  delivery?: DeliveryOption;
  includeLikes?: boolean;
  includeShares?: boolean;
  includeSaves?: boolean;
  includeComments?: boolean;
  peakHoursBoost?: boolean;
  onApplyPreset?: (preset: QuickPatternPreset) => void;
  onGenerate?: () => void;
  onApplyFavourite?: (config: FavouriteConfig) => void;
}

// Removed smooth mode — stepped graph only

const FAVOURITES_KEY = "dev-smm-favourite-configs";

function readFavourites(): FavouriteConfig[] {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavouritesToStorage(favs: FavouriteConfig[]) {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favs));
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const presetButtons: Array<{ label: string; value: QuickPatternPreset }> = [
  { label: "🚀 Viral Boost", value: "viral-boost" },
  { label: "⚡ Fast Start", value: "fast-start" },
  { label: "🔥 Trending Push", value: "trending-push" },
  { label: "🌊 Slow Burn", value: "slow-burn" },
];

function lineTypeForPattern(patternType: PatternPlan["patternType"]) {
  if (patternType === "sawtooth") return "stepAfter";
  if (patternType === "viral-spike" || patternType === "micro-burst") return "linear";
  if (patternType === "heartbeat") return "natural";
  return "monotoneX";
}

function buildSmoothGraphData(plan: PatternPlan) {
  const safeRuns = plan?.runs || [];
  const rows: Array<{
    label: string;
    views: number;
    likes: number;
    shares: number;
    saves: number;
    comments: number;
  }> = [];

  rows.push({ label: "0m", views: 0, likes: 0, shares: 0, saves: 0, comments: 0 });

  for (let index = 0; index < safeRuns.length; index += 1) {
    const current = safeRuns[index];
    const previous =
      index === 0
        ? {
            minutesFromStart: 0,
            cumulativeViews: 0,
            cumulativeLikes: 0,
            cumulativeShares: 0,
            cumulativeSaves: 0,
            cumulativeComments: 0,
          }
        : safeRuns[index - 1];

    const dt = Math.max(1, current.minutesFromStart - previous.minutesFromStart);
    const phase = index / Math.max(1, safeRuns.length - 1);
    const segmentNoise = clamp(
      0.01 + (current.views / Math.max(1, safeRuns[0]?.views ?? 1)) * 0.004,
      0.01,
      0.03
    );

    const pointValue = (
      start: number,
      end: number,
      progress: number,
      wobbleScale: number,
      preserveMonotone: boolean
    ) => {
      const eased = Math.pow(progress, phase < 0.2 ? 1.8 : phase > 0.8 ? 0.88 : 1.05);
      const delta = end - start;
      const wobble = delta * segmentNoise * wobbleScale;
      const value = start + delta * eased + wobble;
      if (!preserveMonotone) return Math.max(0, value);
      return clamp(value, Math.min(start, end), Math.max(start, end));
    };

    const wave = Math.sin((index + 1) * 1.13 + phase * Math.PI * 1.7);
    const minuteA = previous.minutesFromStart + dt * 0.38;
    const minuteB = previous.minutesFromStart + dt * 0.76;

    rows.push({
      label: `${Math.round(minuteA)}m`,
      views: pointValue(previous.cumulativeViews, current.cumulativeViews, 0.38, wave * 0.7, true),
      likes: pointValue(previous.cumulativeLikes, current.cumulativeLikes, 0.38, wave * 0.8, false),
      shares: pointValue(previous.cumulativeShares, current.cumulativeShares, 0.38, wave * 0.75, false),
      saves: pointValue(previous.cumulativeSaves, current.cumulativeSaves, 0.38, wave * 0.85, false),
      comments: pointValue(previous.cumulativeComments, current.cumulativeComments, 0.38, wave * 0.9, false),
    });

    rows.push({
      label: `${Math.round(minuteB)}m`,
      views: pointValue(previous.cumulativeViews, current.cumulativeViews, 0.76, wave * -0.55, true),
      likes: pointValue(previous.cumulativeLikes, current.cumulativeLikes, 0.76, wave * -0.62, false),
      shares: pointValue(previous.cumulativeShares, current.cumulativeShares, 0.76, wave * -0.58, false),
      saves: pointValue(previous.cumulativeSaves, current.cumulativeSaves, 0.76, wave * -0.64, false),
      comments: pointValue(previous.cumulativeComments, current.cumulativeComments, 0.76, wave * -0.7, false),
    });

    rows.push({
      label: current.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      views: current.cumulativeViews,
      likes: current.cumulativeLikes,
      shares: current.cumulativeShares,
      saves: current.cumulativeSaves,
      comments: current.cumulativeComments,
    });
  }

  return rows;
}

type GraphVisualMode = "smooth" | "original";

function buildSteppedGraphData(plan: PatternPlan, visualMode: GraphVisualMode) {
  const safeRuns = plan?.runs || [];
  const final = safeRuns[safeRuns.length - 1];
  const totalViews = Math.max(1, final?.cumulativeViews || safeRuns.reduce((sum, r) => sum + (r.views || 0), 0));
  const totalLikes = Math.max(0, final?.cumulativeLikes || safeRuns.reduce((sum, r) => sum + (r.likes || 0), 0));
  const totalShares = Math.max(0, final?.cumulativeShares || safeRuns.reduce((sum, r) => sum + (r.shares || 0), 0));
  const totalSaves = Math.max(0, final?.cumulativeSaves || safeRuns.reduce((sum, r) => sum + (r.saves || 0), 0));
  const totalComments = Math.max(0, final?.cumulativeComments || safeRuns.reduce((sum, r) => sum + (r.comments || 0), 0));

  // Option 3: screenshot-style synthetic visual scale.
  // Actual totals remain real in stats/tooltip, but smaller metrics are lifted visually
  // so their curves resemble creator analytics screenshots.
  const visualHeight = {
    likes: totalViews * 0.56,
    shares: totalViews * 0.18,
    saves: totalViews * 0.11,
    comments: totalViews * 0.045,
  };

  const startMs = safeRuns[0]
    ? safeRuns[0].at.getTime() - Math.max(0, safeRuns[0].minutesFromStart || 0) * 60_000
    : Date.now();

  const isShortOrder = totalViews < 50000;
  const smoothProgress = (progress: number, start = 0, power = 1) => {
    const normalized = Math.min(1, Math.max(0, (progress - start) / Math.max(0.0001, 1 - start)));
    return Math.pow(normalized, power);
  };

  const rows = safeRuns.map((run) => {
    const viewProgress = Math.min(1, Math.max(0, (run.cumulativeViews || 0) / totalViews));
    // For short orders, the run table is limited by provider minimums, so plotting raw
    // engagement creates ugly stairs. Keep raw totals in tooltip/table, but render a
    // smooth Instagram-style visual curve on the graph.
    const shouldSmooth = visualMode === "smooth" && isShortOrder;
    const likesFraction = shouldSmooth
      ? smoothProgress(viewProgress, 0.035, 1.08)
      : totalLikes > 0 ? ((run.cumulativeLikes || 0) / totalLikes) : 0;
    const commentsFraction = shouldSmooth
      ? smoothProgress(viewProgress, 0.10, 1.18)
      : totalComments > 0 ? ((run.cumulativeComments || 0) / totalComments) : 0;
    const sharesFraction = shouldSmooth
      ? smoothProgress(viewProgress, 0.48, 1.35)
      : totalShares > 0 ? ((run.cumulativeShares || 0) / totalShares) : 0;
    const savesFraction = shouldSmooth
      ? smoothProgress(viewProgress, 0.38, 1.25)
      : totalSaves > 0 ? ((run.cumulativeSaves || 0) / totalSaves) : 0;

    return {
      minute: Math.max(0, Math.round((run.at.getTime() - startMs) / 60_000)),
      time: run.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      views: run.cumulativeViews || 0,
      likesVisual: totalLikes > 0 ? likesFraction * visualHeight.likes : 0,
      sharesVisual: totalShares > 0 ? sharesFraction * visualHeight.shares : 0,
      savesVisual: totalSaves > 0 ? savesFraction * visualHeight.saves : 0,
      commentsVisual: totalComments > 0 ? commentsFraction * visualHeight.comments : 0,
      viewsRaw: run.cumulativeViews || 0,
      likesRaw: run.cumulativeLikes || 0,
      sharesRaw: run.cumulativeShares || 0,
      savesRaw: run.cumulativeSaves || 0,
      commentsRaw: run.cumulativeComments || 0,
    };
  });

  // Include the configured start delay in the chart as a real flat zone.
  // If Start Delay = 5h, the X-axis now shows 0→5h before the first delivery.
  if (safeRuns.length > 0 && rows[0].minute > 0) {
    const zeroRow = {
      minute: 0,
      time: new Date(startMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      views: 0,
      likesVisual: 0,
      sharesVisual: 0,
      savesVisual: 0,
      commentsVisual: 0,
      viewsRaw: 0,
      likesRaw: 0,
      sharesRaw: 0,
      savesRaw: 0,
      commentsRaw: 0,
    };
    const delayEndRow = {
      ...zeroRow,
      minute: Math.max(0, rows[0].minute - 0.01),
      time: rows[0].time,
    };
    rows.unshift(delayEndRow);
    rows.unshift(zeroRow);
  }

  return rows;
}

function compactNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  return String(Math.round(value));
}

const SteppedTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const rawKeyFor = (dataKey: string) => {
    if (dataKey === "likesVisual") return "likesRaw";
    if (dataKey === "sharesVisual") return "sharesRaw";
    if (dataKey === "savesVisual") return "savesRaw";
    if (dataKey === "commentsVisual") return "commentsRaw";
    return "viewsRaw";
  };

  const filtered = payload.filter(
    (entry: any) => !String(entry.name || "").startsWith("planned-")
  );

  if (filtered.length === 0) return null;

  return (
    <div
      style={{
        background: "#fffaf3",
        border: "1px solid rgba(210, 180, 140, 0.55)",
        borderRadius: "0.75rem",
        color: "#27211b",
        fontSize: "12px",
        padding: "8px 12px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.16)",
      }}
    >
      <p style={{ marginBottom: 4, color: "#7c6f64" }}>{filtered[0]?.payload?.time || `${label}m`}</p>
      {filtered.map((entry: any) => {
        const raw = entry.payload?.[rawKeyFor(entry.dataKey)] ?? entry.value;
        return (
          <p key={entry.name} style={{ color: entry.color, margin: "2px 0" }}>
            {entry.name}: {compactNumber(Math.round(raw))}
          </p>
        );
      })}
    </div>
  );
};

export function GrowthGraph({
  plan,
  selectedPreset,
  variancePercent = 40,
  delivery = { mode: "auto", hours: 18, label: "Auto" },
  includeLikes = false,
  includeShares = false,
  includeSaves = false,
  includeComments = false,
  peakHoursBoost = false,
  onApplyPreset,
  onGenerate,
  onApplyFavourite,
}: GrowthGraphProps) {
    const graphMode = "stepped";
  const [favourites, setFavourites] = useState<FavouriteConfig[]>(() => readFavourites());
  const [showFavourites, setShowFavourites] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [favouriteName, setFavouriteName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [visualMode, setVisualMode] = useState<GraphVisualMode>("smooth");

  const safePlan = useMemo(
    () => ({ ...plan, runs: plan?.runs || [] }),
    [plan]
  );
  const steppedData = useMemo(() => buildSteppedGraphData(safePlan, visualMode), [safePlan, visualMode]);
  const graphTotals = useMemo(() => {
    const last = safePlan.runs[safePlan.runs.length - 1];
    return {
      views: last?.cumulativeViews || safePlan.runs.reduce((sum, run) => sum + (run.views || 0), 0),
      likes: last?.cumulativeLikes || safePlan.runs.reduce((sum, run) => sum + (run.likes || 0), 0),
      comments: last?.cumulativeComments || safePlan.runs.reduce((sum, run) => sum + (run.comments || 0), 0),
      shares: last?.cumulativeShares || safePlan.runs.reduce((sum, run) => sum + (run.shares || 0), 0),
      saves: last?.cumulativeSaves || safePlan.runs.reduce((sum, run) => sum + (run.saves || 0), 0),
    };
  }, [safePlan]);

    const handleSaveFavourite = () => {
    const name = favouriteName.trim() || `${safePlan.patternName} · ${safePlan.totalRuns} runs`;

    // 🔥 Calculate total quantities to derive fractions
    const savedTotalViews = safePlan.runs.reduce((sum, r) => sum + (r.views || 0), 0);
    const savedTotalLikes = safePlan.runs.reduce((sum, r) => sum + (r.likes || 0), 0);
    const savedTotalShares = safePlan.runs.reduce((sum, r) => sum + (r.shares || 0), 0);
    const savedTotalSaves = safePlan.runs.reduce((sum, r) => sum + (r.saves || 0), 0);
    const savedTotalComments = safePlan.runs.reduce((sum, r) => sum + (r.comments || 0), 0);

    // 🔥 Store each run as a fraction of total (so it scales to any view count)
    const runProportions = safePlan.runs.map((r) => ({
      minutesFromStart: r.minutesFromStart,
      viewsFraction: savedTotalViews > 0 ? (r.views || 0) / savedTotalViews : 0,
      likesFraction: savedTotalLikes > 0 ? (r.likes || 0) / savedTotalLikes : 0,
      sharesFraction: savedTotalShares > 0 ? (r.shares || 0) / savedTotalShares : 0,
      savesFraction: savedTotalSaves > 0 ? (r.saves || 0) / savedTotalSaves : 0,
      commentsFraction: savedTotalComments > 0 ? (r.comments || 0) / savedTotalComments : 0,
    }));

    const newFav: FavouriteConfig = {
      id: `fav-${Date.now()}`,
      savedAt: new Date().toISOString(),
      name,
      patternName: safePlan.patternName,
      patternType: safePlan.patternType,
      totalRuns: safePlan.totalRuns,
      estimatedDurationHours: safePlan.estimatedDurationHours,
      approximateIntervalMin: safePlan.approximateIntervalMin,
      finishTime: safePlan.finishTime instanceof Date ? safePlan.finishTime.toISOString() : new Date().toISOString(),
      risk: safePlan.risk,
      quickPreset: selectedPreset || null,
      variancePercent,
      delivery,
      includeLikes,
      includeShares,
      includeSaves,
      includeComments,
      peakHoursBoost,
      runProportions,
      savedTotalViews,
    };

    const updated = [newFav, ...favourites].slice(0, 10);
    setFavourites(updated);
    saveFavouritesToStorage(updated);
    setJustSaved(true);
    setShowNameInput(false);
    setFavouriteName("");
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleDeleteFavourite = (id: string) => {
    const updated = favourites.filter((f) => f.id !== id);
    setFavourites(updated);
    saveFavouritesToStorage(updated);
  };

  return (
    <section className="rounded-2xl border border-orange-200/70 bg-gradient-to-br from-[#fffaf3] via-[#f7f3ed] to-[#eee9e2] p-5 text-stone-900 shadow-xl shadow-black/10">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-stone-950">📈 Viral Analytics Projection</h2>

                    <div className="inline-flex rounded-lg border border-yellow-500/30 bg-black px-2 py-1 text-[10px] font-medium text-yellow-300">
📊 Screenshot-style Graph
          </div>

          <div className="inline-flex overflow-hidden rounded-lg border border-stone-300/70 bg-white/50 text-[10px] font-semibold shadow-sm">
            <button
              type="button"
              onClick={() => setVisualMode("smooth")}
              className={`px-2 py-1 transition ${visualMode === "smooth" ? "bg-stone-900 text-yellow-200" : "text-stone-500 hover:text-stone-900"}`}
              title="Smooth analytics-style graph for small orders"
            >
              Smooth
            </button>
            <button
              type="button"
              onClick={() => setVisualMode("original")}
              className={`px-2 py-1 transition ${visualMode === "original" ? "bg-stone-900 text-yellow-200" : "text-stone-500 hover:text-stone-900"}`}
              title="Original run-by-run graph"
            >
              Original
            </button>
          </div>

          {/* 🔥 Favourite controls — only in stepped mode */}
          {graphMode === "stepped" && (
            <div className="flex items-center gap-2">
              {showNameInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={favouriteName}
                    onChange={(e) => setFavouriteName(e.target.value)}
                    placeholder="Name this config..."
                    className="w-32 rounded-md border border-pink-500/30 bg-black px-2 py-0.5 text-[10px] text-white placeholder-gray-600 focus:border-pink-500/60 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveFavourite();
                      if (e.key === "Escape") {
                        setShowNameInput(false);
                        setFavouriteName("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveFavourite}
                    className="rounded-md border border-pink-500/40 bg-pink-500/20 px-2 py-0.5 text-[10px] text-pink-300 hover:bg-pink-500/30 transition"
                  >
                    ✓ Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNameInput(false);
                      setFavouriteName("");
                    }}
                    className="text-[10px] text-gray-500 hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNameInput(true)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition ${
                    justSaved
                      ? "border-pink-500/60 bg-pink-500/20 text-pink-300 cursor-default"
                      : "border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 hover:border-pink-500/60"
                  }`}
                >
                  {justSaved ? "❤️ Saved!" : "🤍 Save Config"}
                </button>
              )}

              {favourites.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowFavourites((prev) => !prev)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition ${
                    showFavourites
                      ? "border-pink-500/50 bg-pink-500/15 text-pink-300"
                      : "border-gray-700 text-gray-500 hover:text-pink-400"
                  }`}
                >
                  📋 {favourites.length} saved
                </button>
              )}
            </div>
          )}
        </div>

        {/* Preset Buttons */}
        {onApplyPreset && onGenerate && (
          <div className="flex flex-wrap items-center gap-2">
            {presetButtons.map((preset) => {
              const active = selectedPreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onApplyPreset(preset.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                    active
                      ? "border-yellow-500/70 bg-yellow-500/20 text-yellow-300"
                      : "border-gray-700 text-gray-500 hover:border-yellow-500/30 hover:text-yellow-400"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onGenerate}
              className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-300 transition hover:bg-yellow-500/20"
            >
              🔄 New Pattern
            </button>
          </div>
        )}
      </div>

      {/* 🔥 Favourites Panel */}
      {showFavourites && graphMode === "stepped" && favourites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 rounded-xl border border-pink-500/20 bg-pink-500/5 p-3"
        >
          <h3 className="text-[10px] font-semibold text-pink-400 mb-2 uppercase tracking-wider">
            ❤️ Saved Configs ({favourites.length}/10)
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {favourites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center justify-between rounded-lg border border-pink-500/20 bg-black/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-pink-300 truncate">
                    {fav.name}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[9px] text-gray-600">
                      {fav.delivery.label} · {fav.variancePercent}% var · {fav.risk}
                    </span>
                    {fav.quickPreset && (
                      <span className="rounded bg-yellow-500/20 px-1 py-0 text-[8px] text-yellow-400">
                        {fav.quickPreset}
                      </span>
                    )}
                    <span className="flex gap-0.5 text-[9px]">
                      {fav.includeLikes && <span title="Likes">❤️</span>}
                      {fav.includeShares && <span title="Shares">🔄</span>}
                      {fav.includeSaves && <span title="Saves">💾</span>}
                      {fav.includeComments && <span title="Comments">💬</span>}
                      {fav.peakHoursBoost && <span title="Peak Hours">🔥</span>}
                    </span>
                    <span className="text-[9px] text-gray-700">
                      {new Date(fav.savedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {onApplyFavourite && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyFavourite(fav);
                        setShowFavourites(false);
                      }}
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition"
                      title="Apply this config to current order"
                    >
                      ▶️ Use
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteFavourite(fav.id)}
                    className="text-[10px] text-gray-600 hover:text-red-400 transition"
                    title="Remove"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-600 mt-2">
            ℹ️ Configs are saved in your browser. Click ▶️ Use to apply settings to any view count. Max 10.
          </p>
        </motion.div>
      )}

      {/* Screenshot-style top metrics */}
      <div className="mb-3 grid grid-cols-4 overflow-hidden rounded-xl border border-orange-200/70 bg-white/35 text-center shadow-inner shadow-white/40">
        {[
          { label: "Views", value: graphTotals.views, color: "border-pink-300", text: "text-stone-950" },
          { label: "Likes", value: graphTotals.likes, color: "border-blue-300", text: "text-stone-950" },
          { label: "Comments", value: graphTotals.comments, color: "border-cyan-300", text: "text-stone-950" },
          { label: "Shares", value: graphTotals.shares, color: "border-orange-300", text: "text-stone-950" },
        ].map((item) => (
          <div key={item.label} className={`border-b-2 ${item.color} px-2 py-2`}>
            <div className="text-[10px] font-medium text-stone-500">{item.label}</div>
            <div className={`text-sm font-semibold ${item.text}`}>{compactNumber(item.value)}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        key={`${safePlan.patternId}-${safePlan.totalRuns}-${graphMode}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="h-80"
      >
                <ResponsiveContainer width="100%" height="100%">
          <LineChart data={steppedData} margin={{ top: 14, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8d0c5" opacity={0.45} />
            <XAxis dataKey="minute" type="number" domain={[0, "dataMax"]} allowDataOverflow={false} stroke="#9a8f84" tick={{ fill: "#8a7e72", fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 60)}h`} />
            <YAxis stroke="#9a8f84" tick={{ fill: "#8a7e72", fontSize: 11 }} width={52} tickFormatter={compactNumber} />
            <Tooltip content={<SteppedTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px", color: "#44382e" }} />
            <Line type="monotone" dataKey="views" stroke="#d86bd8" opacity={0.13} dot={false} strokeDasharray="5 5" name="planned-views" legendType="none" tooltipType="none" />
            <Line type="monotone" dataKey="likesVisual" stroke="#7188de" opacity={0.13} dot={false} strokeDasharray="5 5" name="planned-likes" legendType="none" tooltipType="none" />
            <Line type="monotone" dataKey="commentsVisual" stroke="#54d5de" opacity={0.13} dot={false} strokeDasharray="5 5" name="planned-comments" legendType="none" tooltipType="none" />
            <Line type="monotone" dataKey="sharesVisual" stroke="#e6a263" opacity={0.13} dot={false} strokeDasharray="5 5" name="planned-shares" legendType="none" tooltipType="none" />
            <Line type="monotone" dataKey="views" stroke="#d86bd8" strokeWidth={2.4} dot={false} name="Views" isAnimationActive animationDuration={900} />
            <Line type="monotone" dataKey="likesVisual" stroke="#7188de" strokeWidth={2.1} dot={false} name="Likes" isAnimationActive animationDuration={900} />
            <Line type="monotone" dataKey="commentsVisual" stroke="#54d5de" strokeWidth={2} dot={false} name="Comments" isAnimationActive animationDuration={900} />
            <Line type="monotone" dataKey="sharesVisual" stroke="#e6a263" strokeWidth={2} dot={false} name="Shares" isAnimationActive animationDuration={900} />
            {graphTotals.saves > 0 && <Line type="monotone" dataKey="savesVisual" stroke="#22c55e" strokeWidth={1.6} dot={false} name="Saves" isAnimationActive animationDuration={900} />}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="mt-2 flex items-center justify-between">
                <p className="text-[9px] text-gray-600">
📊 Visual scale matches creator analytics screenshots; tooltip/top stats show real planned totals.
        </p>        {graphMode === "stepped" && (
          <p className="text-[9px] text-pink-600">
            🤍 Save config to reuse with any view count
          </p>
        )}
      </div>
    </section>
  );
}
