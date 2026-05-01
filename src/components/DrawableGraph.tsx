import { useCallback, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DrawableGraphProps {
  totalViews: number;
  runCount: number;
  minViewsPerRun: number;
  onApply: (viewsPerRun: number[]) => void;
}

// Catmull-Rom spline for smooth interpolation
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function smoothInterpolate(controlPoints: number[], outputCount: number): number[] {
  if (controlPoints.length <= 1) return Array(outputCount).fill(controlPoints[0] || 0);
  if (controlPoints.length === 2) {
    return Array.from({ length: outputCount }, (_, i) => {
      const t = i / (outputCount - 1);
      return controlPoints[0] + (controlPoints[1] - controlPoints[0]) * t;
    });
  }

  const result: number[] = [];
  const n = controlPoints.length;

  for (let i = 0; i < outputCount; i++) {
    const t = (i / (outputCount - 1)) * (n - 1);
    const idx = Math.min(Math.floor(t), n - 2);
    const frac = t - idx;

    const p0 = controlPoints[Math.max(0, idx - 1)];
    const p1 = controlPoints[idx];
    const p2 = controlPoints[Math.min(n - 1, idx + 1)];
    const p3 = controlPoints[Math.min(n - 1, idx + 2)];

    result.push(catmullRom(p0, p1, p2, p3, frac));
  }

  return result;
}

function enforceMinAndTotal(raw: number[], totalViews: number, minViewsPerRun: number): number[] {
  // Normalize: shift so all positive
  const minVal = Math.min(...raw);
  const shifted = raw.map(v => Math.max(0.01, v - minVal + 0.01));
  const sum = shifted.reduce((a, b) => a + b, 0);

  // Scale to totalViews
  const scaled = shifted.map(v => Math.round((v / sum) * totalViews));

  // Enforce minimum
  const enforced = scaled.map(v => Math.max(minViewsPerRun, v));

  // Correct total
  let diff = totalViews - enforced.reduce((a, b) => a + b, 0);
  let idx = 0;
  while (diff !== 0 && idx < enforced.length * 10) {
    if (diff > 0) {
      enforced[idx % enforced.length]++;
      diff--;
    } else if (enforced[idx % enforced.length] > minViewsPerRun) {
      enforced[idx % enforced.length]--;
      diff++;
    }
    idx++;
  }

  return enforced;
}

const CustomDot = ({
  cx,
  cy,
  index,
  isHandle,
  isDragging,
}: {
  cx?: number;
  cy?: number;
  index?: number;
  isHandle: boolean;
  isDragging: boolean;
}) => {
  if (!isHandle || cx === undefined || cy === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isDragging ? 7 : 5}
      fill={isDragging ? "#eab308" : "#3b82f6"}
      stroke={isDragging ? "#fbbf24" : "#60a5fa"}
      strokeWidth={2}
      style={{ cursor: "grab", filter: isDragging ? "drop-shadow(0 0 6px rgba(234,179,8,0.5))" : "none" }}
    />
  );
};

const SteppedTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const filtered = payload.filter((entry: any) => !String(entry.name || "").startsWith("planned-"));
  if (filtered.length === 0) return null;

  return (
    <div style={{
      background: "#000000",
      border: "1px solid #eab308",
      borderRadius: "0.75rem",
      color: "#d1d5db",
      fontSize: "12px",
      padding: "8px 12px",
    }}>
      <p style={{ marginBottom: 4, color: "#9ca3af" }}>{label}</p>
      {filtered.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color, margin: "2px 0" }}>
          {entry.name}: {Math.round(entry.value)}
        </p>
      ))}
    </div>
  );
};

export function DrawableGraph({
  totalViews,
  runCount,
  minViewsPerRun,
  onApply,
}: DrawableGraphProps) {
  // Number of draggable control handles
  const numHandles = Math.min(12, Math.max(6, Math.floor(runCount / 4)));

  // Handle positions: 0-1 value (0=bottom, 1=top)
  const [handles, setHandles] = useState<number[]>(() => {
    return Array.from({ length: numHandles }, (_, i) => {
      const t = i / (numHandles - 1);
      return 1 / (1 + Math.exp(-8 * (t - 0.5))); // default S-curve
    });
  });

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hasCustomized, setHasCustomized] = useState(false);

  // Map each handle to which run index it controls
  const handleRunIndexes = useMemo(() => {
    return Array.from({ length: numHandles }, (_, i) =>
      Math.round((i / (numHandles - 1)) * (runCount - 1))
    );
  }, [numHandles, runCount]);

  // Compute views per run from handles
  const viewsPerRun = useMemo(() => {
    const interpolated = smoothInterpolate(handles, runCount);
    return enforceMinAndTotal(interpolated, totalViews, minViewsPerRun);
  }, [handles, runCount, totalViews, minViewsPerRun]);

  // Build chart data — same format as stepped graph
  const chartData = useMemo(() => {
    let cumViews = 0;
    return viewsPerRun.map((views, i) => {
      cumViews += views;
      return {
        time: `#${i + 1}`,
        views: cumViews,
        perRun: views,
        index: i,
      };
    });
  }, [viewsPerRun]);

  // Handle Y-axis max
  const maxCumViews = chartData.length > 0 ? chartData[chartData.length - 1].views : 1;

  // Find which handle is closest to a chart point
  const isHandlePoint = useCallback(
    (index: number) => handleRunIndexes.includes(index),
    [handleRunIndexes]
  );

  const getHandleIdx = useCallback(
    (runIndex: number) => handleRunIndexes.indexOf(runIndex),
    [handleRunIndexes]
  );

  // Drag handling on the chart area
  const handleChartMouseDown = useCallback(
    (data: any) => {
      if (!data || !data.activePayload || !data.activePayload[0]) return;
      const pointIndex = data.activePayload[0].payload.index;
      const handleIdx = getHandleIdx(pointIndex);
      if (handleIdx !== -1) {
        setDraggingIndex(handleIdx);
      }
    },
    [getHandleIdx]
  );

  const handleChartMouseMove = useCallback(
    (data: any) => {
      if (draggingIndex === null || !data || !data.chartY) return;

      // Convert chartY to 0-1 value
      // We need the chart's internal height — approximate from container
      const chartHeight = 220; // matches our container height
      const padT = 20;
      const padB = 40;
      const usableHeight = chartHeight - padT - padB;

      const rawY = data.chartY;
      const normalizedY = 1 - ((rawY - padT) / usableHeight);
      const clamped = Math.max(0.05, Math.min(0.95, normalizedY));

      setHandles(prev => {
        const next = [...prev];
        next[draggingIndex] = clamped;
        return next;
      });
      setHasCustomized(true);
    },
    [draggingIndex]
  );

  const handleChartMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  // Preset shapes
  const applyShape = (type: string) => {
    setHandles(
      Array.from({ length: numHandles }, (_, i) => {
        const t = i / (numHandles - 1);
        if (type === "s-curve") return 1 / (1 + Math.exp(-8 * (t - 0.5)));
        if (type === "ramp-up") return Math.pow(t, 1.8);
        if (type === "ramp-down") return Math.pow(1 - t, 1.8);
        if (type === "bell") return Math.exp(-Math.pow((t - 0.5) / 0.22, 2));
        if (type === "wave") return 0.5 + 0.35 * Math.sin(t * Math.PI * 3);
        if (type === "flat") return 0.5;
        return 0.5;
      })
    );
    setHasCustomized(true);
  };

  // Stats
  const minViews = Math.min(...viewsPerRun);
  const maxViews = Math.max(...viewsPerRun);
  const avgViews = Math.round(totalViews / runCount);

  // Custom dot renderer for the chart
  const renderDot = (props: any) => {
    const { cx, cy, index } = props;
    const isHandle = isHandlePoint(index);
    const handleIdx = getHandleIdx(index);
    const isDrag = handleIdx === draggingIndex;

    if (!isHandle) return <circle key={index} cx={cx} cy={cy} r={0} />;

    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={isDrag ? 8 : 5}
        fill={isDrag ? "#eab308" : "#3b82f6"}
        stroke={isDrag ? "#fbbf24" : "#60a5fa"}
        strokeWidth={2}
        style={{
          cursor: "grab",
          filter: isDrag ? "drop-shadow(0 0 8px rgba(234,179,8,0.6))" : "drop-shadow(0 0 3px rgba(59,130,246,0.3))",
          transition: isDrag ? "none" : "all 0.2s",
        }}
      />
    );
  };

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-gray-900 to-black p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">✏️</span>
          <h3 className="text-xs font-bold text-yellow-300">Draw Your Curve</h3>
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] text-blue-300">
            {numHandles} handles
          </span>
        </div>
        {draggingIndex !== null && (
          <span className="text-[9px] text-yellow-400 animate-pulse">🎯 Dragging handle #{draggingIndex + 1}</span>
        )}
      </div>

      {/* Shape presets */}
      <div className="flex flex-wrap gap-1 mb-3">
        {[
          { key: "s-curve", label: "〰️ S-Curve" },
          { key: "ramp-up", label: "📈 Ramp Up" },
          { key: "ramp-down", label: "📉 Ramp Down" },
          { key: "bell", label: "🔔 Bell" },
          { key: "wave", label: "🌊 Wave" },
          { key: "flat", label: "━ Flat" },
        ].map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyShape(p.key)}
            className="rounded-md border border-yellow-500/20 bg-black px-2 py-0.5 text-[9px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/40 transition"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart — same style as existing stepped graph */}
      <div
        style={{ height: 260, cursor: draggingIndex !== null ? "grabbing" : "default" }}
        onMouseUp={handleChartMouseUp}
        onMouseLeave={handleChartMouseUp}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 14, right: 20, left: 0, bottom: 4 }}
            onMouseDown={handleChartMouseDown}
            onMouseMove={handleChartMouseMove}
            onMouseUp={handleChartMouseUp}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#111" opacity={0.3} />
            <XAxis
              dataKey="time"
              stroke="#666"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              interval={Math.max(0, Math.floor(runCount / 10))}
            />
            <YAxis
              stroke="#666"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              width={50}
            />
            <Tooltip content={<SteppedTooltip />} />

            {/* Faded planned line */}
            <Line
              type="monotone"
              dataKey="views"
              stroke="#3b82f6"
              opacity={0.1}
              dot={false}
              strokeDasharray="5 5"
              name="planned-views"
              legendType="none"
              tooltipType="none"
            />

            {/* Main cumulative views line */}
            <Line
              type="monotone"
              dataKey="views"
              stroke="#3b82f6"
              strokeWidth={2.5}
              name="Cumulative Views"
              isAnimationActive={false}
              dot={renderDot}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-run bar visualization */}
      <div className="mt-3 rounded-lg border border-gray-800 bg-black/50 p-2">
        <p className="text-[9px] text-gray-500 mb-1.5">Views per run:</p>
        <div className="flex items-end gap-px" style={{ height: 40 }}>
          {viewsPerRun.map((v, i) => {
            const maxV = Math.max(...viewsPerRun);
            const pct = maxV > 0 ? (v / maxV) * 100 : 0;
            const isHandle = isHandlePoint(i);
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all duration-150"
                style={{
                  height: `${Math.max(4, pct)}%`,
                  backgroundColor: isHandle ? "rgba(234,179,8,0.5)" : "rgba(59,130,246,0.35)",
                  minWidth: 2,
                }}
                title={`Run #${i + 1}: ${v} views`}
              />
            );
          })}
        </div>
      </div>

      {/* Stats + Apply */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-3 text-[10px]">
          <span className="text-gray-500">Min: <span className="text-blue-400">{minViews}</span></span>
          <span className="text-gray-500">Max: <span className="text-blue-400">{maxViews}</span></span>
          <span className="text-gray-500">Avg: <span className="text-blue-400">{avgViews}</span></span>
          <span className="text-gray-500">Total: <span className="text-yellow-400">{totalViews.toLocaleString()}</span></span>
        </div>

        <button
          type="button"
          onClick={() => onApply(viewsPerRun)}
          disabled={!hasCustomized}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            hasCustomized
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              : "border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed"
          }`}
        >
          ✓ Apply Curve
        </button>
      </div>

      <p className="mt-2 text-[9px] text-gray-600">
        🎨 Drag the blue dots on the graph to reshape your delivery curve. The line stays smooth between handles.
        Min {minViewsPerRun} views/run enforced. Click Apply to use this curve.
      </p>
    </div>
  );
}
