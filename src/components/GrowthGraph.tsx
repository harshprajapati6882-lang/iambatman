import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PatternPlan, QuickPatternPreset } from "../types/order";

interface GrowthGraphProps {
  plan: PatternPlan;
  selectedPreset?: QuickPatternPreset | null;
  onApplyPreset?: (preset: QuickPatternPreset) => void;
  onGenerate?: () => void;
}

type GraphMode = "smooth" | "stepped";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

// 🔥 SMOOTH MODE: Interpolated cumulative graph (original)
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

  rows.push({
    label: "0m",
    views: 0,
    likes: 0,
    shares: 0,
    saves: 0,
    comments: 0,
  });

  for (let index = 0; index < safeRuns.length; index += 1) {
    const current = safeRuns[index];
    const previous = index === 0
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
    const segmentNoise = clamp(0.01 + (current.views / Math.max(1, safeRuns[0]?.views ?? 1)) * 0.004, 0.01, 0.03);

    const pointValue = (start: number, end: number, progress: number, wobbleScale: number, preserveMonotone: boolean) => {
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

// 🔥 STEPPED MODE: Per-run actual values with planned lines (like OrderCard)
function buildSteppedGraphData(plan: PatternPlan) {
  const safeRuns = plan?.runs || [];

  return safeRuns.map((run) => ({
    time: run.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    views: run.cumulativeViews || 0,
    likes: (run.cumulativeLikes || 0) * 10,
    shares: (run.cumulativeShares || 0) * 10,
    saves: (run.cumulativeSaves || 0) * 10,
    comments: (run.cumulativeComments || 0) * 10,
    rawViews: run.views || 0,
    rawLikes: run.likes || 0,
    rawShares: run.shares || 0,
    rawSaves: run.saves || 0,
    rawComments: run.comments || 0,
  }));
}

export function GrowthGraph({ plan, selectedPreset, onApplyPreset, onGenerate }: GrowthGraphProps) {
  const [graphMode, setGraphMode] = useState<GraphMode>("smooth");

  const safePlan = useMemo(
    () => ({ ...plan, runs: plan?.runs || [] }),
    [plan]
  );
  const smoothData = useMemo(() => buildSmoothGraphData(safePlan), [safePlan]);
  const steppedData = useMemo(() => buildSteppedGraphData(safePlan), [safePlan]);
  const curveType = lineTypeForPattern(safePlan.patternType);

  return (
    <section className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-5">
      {/* Header with Title, Graph Toggle, and Preset Buttons */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-yellow-400">📈 Growth Projection</h2>
          
          {/* 🔥 NEW: Graph Mode Toggle */}
          <div className="inline-flex rounded-lg border border-yellow-500/30 bg-black p-0.5">
            <button
              type="button"
              onClick={() => setGraphMode("smooth")}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                graphMode === "smooth"
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "text-gray-500 hover:text-yellow-400"
              }`}
              title="Smooth cumulative curve"
            >
              〰️ Smooth
            </button>
            <button
              type="button"
              onClick={() => setGraphMode("stepped")}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                graphMode === "stepped"
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "text-gray-500 hover:text-yellow-400"
              }`}
              title="Stepped per-run view (same as Orders page)"
            >
              📊 Stepped
            </button>
          </div>
        </div>
        
        {/* Preset Buttons + New Pattern */}
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

      {/* Chart */}
      <motion.div
        key={`${safePlan.patternId}-${safePlan.totalRuns}-${graphMode}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="h-80"
      >
        {graphMode === "smooth" ? (
          /* 🔥 SMOOTH MODE: Original interpolated cumulative graph */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smoothData} margin={{ top: 14, right: 20, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} minTickGap={26} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} width={52} />
              <Tooltip
                contentStyle={{
                  background: "#000000",
                  border: "1px solid #eab308",
                  borderRadius: "0.75rem",
                  color: "#d1d5db",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#d1d5db" }} />
              <Line type={curveType} dataKey="views" name="Views" stroke="#eab308" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={900} />
              <Line type={curveType} dataKey="likes" name="Likes" stroke="#a78bfa" strokeWidth={1.8} dot={false} isAnimationActive animationDuration={900} />
              <Line type={curveType} dataKey="shares" name="Shares" stroke="#f59e0b" strokeWidth={1.8} dot={false} isAnimationActive animationDuration={900} />
              <Line type={curveType} dataKey="saves" name="Saves" stroke="#34d399" strokeWidth={1.8} dot={false} isAnimationActive animationDuration={900} />
              <Line type={curveType} dataKey="comments" name="Comments" stroke="#f472b6" strokeWidth={1.8} dot={false} isAnimationActive animationDuration={900} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          /* 🔥 STEPPED MODE: Same style as OrderCard chart */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={steppedData} margin={{ top: 14, right: 20, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111" opacity={0.3} />
              <XAxis
                dataKey="time"
                stroke="#666"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
              />
              <YAxis stroke="#666" tick={{ fill: "#9ca3af", fontSize: 11 }} width={52} />
              <Tooltip
                contentStyle={{
                  background: "#000000",
                  border: "1px solid #eab308",
                  borderRadius: "0.75rem",
                  color: "#d1d5db",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#d1d5db" }} />
              {/* Planned (faded dashed lines) */}
              <Line type="monotone" dataKey="views" stroke="#3b82f6" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-views" legendType="none" />
              <Line type="monotone" dataKey="likes" stroke="#ec4899" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-likes" legendType="none" />
              <Line type="monotone" dataKey="shares" stroke="#22c55e" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-shares" legendType="none" />
              <Line type="monotone" dataKey="saves" stroke="#eab308" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-saves" legendType="none" />
              <Line type="monotone" dataKey="comments" stroke="#a855f7" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-comments" legendType="none" />
              {/* Actual solid lines */}
              <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} name="Views" isAnimationActive animationDuration={900} />
              <Line type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} dot={false} name="Likes" isAnimationActive animationDuration={900} />
              <Line type="monotone" dataKey="shares" stroke="#22c55e" strokeWidth={2} dot={false} name="Shares" isAnimationActive animationDuration={900} />
              <Line type="monotone" dataKey="saves" stroke="#eab308" strokeWidth={2} dot={false} name="Saves" isAnimationActive animationDuration={900} />
              <Line type="monotone" dataKey="comments" stroke="#a855f7" strokeWidth={2} dot={false} name="Comments" isAnimationActive animationDuration={900} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* 🔥 NEW: Graph mode description */}
      <div className="mt-2 text-center">
        <p className="text-[9px] text-gray-600">
          {graphMode === "smooth" 
            ? "〰️ Smooth: Interpolated cumulative growth curve" 
            : "📊 Stepped: Per-run cumulative view (same as Orders page)"
          }
        </p>
      </div>
    </section>
  );
}
