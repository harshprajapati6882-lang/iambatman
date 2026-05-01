import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DrawableGraphProps {
  totalViews: number;
  runCount: number;
  minViewsPerRun: number;
  onApply: (viewsPerRun: number[]) => void;
}

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
  const minVal = Math.min(...raw);
  const shifted = raw.map(v => Math.max(0.01, v - minVal + 0.01));
  const sum = shifted.reduce((a, b) => a + b, 0);
  const scaled = shifted.map(v => Math.round((v / sum) * totalViews));
  const enforced = scaled.map(v => Math.max(minViewsPerRun, v));
  let diff = totalViews - enforced.reduce((a, b) => a + b, 0);
  let idx = 0;
  while (diff !== 0 && idx < enforced.length * 10) {
    if (diff > 0) { enforced[idx % enforced.length]++; diff--; }
    else if (enforced[idx % enforced.length] > minViewsPerRun) { enforced[idx % enforced.length]--; diff++; }
    idx++;
  }
  return enforced;
}

const SteppedTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const filtered = payload.filter((e: any) => !String(e.name || "").startsWith("planned-"));
  if (filtered.length === 0) return null;
  return (
    <div style={{
      background: "#000",
      border: "1px solid #eab308",
      borderRadius: "0.75rem",
      color: "#d1d5db",
      fontSize: "12px",
      padding: "8px 12px",
    }}>
      <p style={{ marginBottom: 4, color: "#9ca3af" }}>{label}</p>
      {filtered.map((e: any) => (
        <p key={e.name} style={{ color: e.color, margin: "2px 0" }}>
          {e.name}: {Math.round(e.value)}
        </p>
      ))}
    </div>
  );
};

export function DrawableGraph({ totalViews, runCount, minViewsPerRun, onApply }: DrawableGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const numHandles = Math.min(12, Math.max(6, Math.floor(runCount / 4)));

  const [handles, setHandles] = useState<number[]>(() =>
    Array.from({ length: numHandles }, (_, i) => {
      const t = i / (numHandles - 1);
      return 1 / (1 + Math.exp(-8 * (t - 0.5)));
    })
  );

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hasCustomized, setHasCustomized] = useState(false);

  const handleRunIndexes = useMemo(() =>
    Array.from({ length: numHandles }, (_, i) =>
      Math.round((i / (numHandles - 1)) * (runCount - 1))
    ), [numHandles, runCount]
  );

  const viewsPerRun = useMemo(() => {
    const interpolated = smoothInterpolate(handles, runCount);
    return enforceMinAndTotal(interpolated, totalViews, minViewsPerRun);
  }, [handles, runCount, totalViews, minViewsPerRun]);

  const chartData = useMemo(() => {
    let cumViews = 0;
    return viewsPerRun.map((views, i) => {
      cumViews += views;
      return { time: `#${i + 1}`, views: cumViews, perRun: views, index: i };
    });
  }, [viewsPerRun]);

  // 🔥 SVG overlay handles — these are the big draggable circles
  const [chartArea, setChartArea] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Measure chart area after render
  const measureChart = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    // Recharts renders the plot area inside .recharts-cartesian-grid
    const grid = container.querySelector(".recharts-cartesian-grid");
    if (grid) {
      const rect = grid.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setChartArea({
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      });
    }
  }, []);

  useEffect(() => {
    measureChart();
    window.addEventListener("resize", measureChart);
    return () => window.removeEventListener("resize", measureChart);
  }, [measureChart, chartData]);

  // Delayed measure after chart animation
  useEffect(() => {
    const timer = setTimeout(measureChart, 100);
    return () => clearTimeout(timer);
  }, [chartData, measureChart]);

  // Compute handle positions in pixels
  const maxCumViews = chartData.length > 0 ? chartData[chartData.length - 1].views * 1.05 : 1;

  const handlePositions = useMemo(() => {
    if (chartArea.width === 0) return [];
    return handleRunIndexes.map((runIdx) => {
      const x = chartArea.left + (runIdx / (runCount - 1)) * chartArea.width;
      const cumV = chartData[runIdx]?.views || 0;
      const y = chartArea.top + chartArea.height - (cumV / maxCumViews) * chartArea.height;
      return { x, y, runIdx };
    });
  }, [chartArea, handleRunIndexes, chartData, runCount, maxCumViews]);

  // 🔥 Global mouse/touch handlers for smooth dragging
  const updateHandleFromY = useCallback((handleIdx: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const relY = clientY - containerRect.top;

    // Convert pixel Y to 0-1 value (0 = bottom of chart, 1 = top)
    const normalized = 1 - ((relY - chartArea.top) / chartArea.height);
    const clamped = Math.max(0.05, Math.min(0.95, normalized));

    setHandles(prev => {
      const next = [...prev];
      next[handleIdx] = clamped;
      return next;
    });
    setHasCustomized(true);
  }, [chartArea]);

  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMove = (e: MouseEvent) => {
      e.preventDefault();
      updateHandleFromY(draggingIndex, e.clientY);
    };
    const handleUp = () => setDraggingIndex(null);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      updateHandleFromY(draggingIndex, e.touches[0].clientY);
    };
    const handleTouchEnd = () => setDraggingIndex(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [draggingIndex, updateHandleFromY]);

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

  const minViews = Math.min(...viewsPerRun);
  const maxViews = Math.max(...viewsPerRun);
  const avgViews = Math.round(totalViews / runCount);

  const isHandlePoint = useCallback(
    (index: number) => handleRunIndexes.includes(index),
    [handleRunIndexes]
  );

  const renderDot = (props: any) => {
    const { cx, cy, index } = props;
    if (!isHandlePoint(index)) return <circle key={`d${index}`} cx={cx} cy={cy} r={0} />;
    return <circle key={`d${index}`} cx={cx} cy={cy} r={2} fill="#3b82f6" opacity={0.4} />;
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
          <span className="text-[9px] text-yellow-400 animate-pulse">
            🎯 Dragging handle #{draggingIndex + 1}
          </span>
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

      {/* Chart with overlay handles */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: 260 }}
      >
        {/* Recharts graph underneath */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 14, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#111" opacity={0.3} />
            <XAxis
              dataKey="time"
              stroke="#666"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              interval={Math.max(0, Math.floor(runCount / 10))}
            />
            <YAxis stroke="#666" tick={{ fill: "#9ca3af", fontSize: 10 }} width={50} />
            <Tooltip content={<SteppedTooltip />} />
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

        {/* 🔥 BIG draggable handle overlay — positioned on top of chart */}
        {handlePositions.map((pos, i) => (
          <div
            key={`handle-${i}`}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDraggingIndex(i);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setDraggingIndex(i);
            }}
            style={{
              position: "absolute",
              left: pos.x - 14,
              top: pos.y - 14,
              width: 28,
              height: 28,
              cursor: draggingIndex === i ? "grabbing" : "grab",
              zIndex: draggingIndex === i ? 20 : 10,
              touchAction: "none",
            }}
          >
            {/* Large invisible hit area */}
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
              }}
            />
            {/* Visible handle */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: draggingIndex === i ? 18 : 14,
                height: draggingIndex === i ? 18 : 14,
                borderRadius: "50%",
                backgroundColor: draggingIndex === i ? "#eab308" : "#3b82f6",
                border: `2px solid ${draggingIndex === i ? "#fbbf24" : "#60a5fa"}`,
                boxShadow: draggingIndex === i
                  ? "0 0 12px rgba(234,179,8,0.6), 0 0 24px rgba(234,179,8,0.3)"
                  : "0 0 8px rgba(59,130,246,0.4)",
                transition: draggingIndex === i ? "none" : "all 0.2s",
              }}
            />
            {/* Value label */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -18,
                transform: "translateX(-50%)",
                fontSize: 9,
                color: draggingIndex === i ? "#eab308" : "#60a5fa",
                whiteSpace: "nowrap",
                fontWeight: 600,
                opacity: draggingIndex === i ? 1 : 0,
                transition: "opacity 0.15s",
                pointerEvents: "none",
              }}
            >
              {viewsPerRun[pos.runIdx]}
            </div>
          </div>
        ))}
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
        🎨 Drag the big blue dots up/down to shape your curve. Line stays smooth automatically.
        Min {minViewsPerRun} views/run enforced.
      </p>
    </div>
  );
}
