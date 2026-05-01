import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface DrawableGraphProps {
  totalViews: number;
  runCount: number;
  minViewsPerRun: number;
  onApply: (viewsPerRun: number[]) => void;
}

// Catmull-Rom spline interpolation for smooth curves
function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function smoothPoints(controlPoints: number[], outputCount: number): number[] {
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
    const idx = Math.floor(t);
    const frac = t - idx;

    const p0 = controlPoints[Math.max(0, idx - 1)];
    const p1 = controlPoints[idx];
    const p2 = controlPoints[Math.min(n - 1, idx + 1)];
    const p3 = controlPoints[Math.min(n - 1, idx + 2)];

    result.push(catmullRom(p0, p1, p2, p3, frac));
  }

  return result;
}

export function DrawableGraph({
  totalViews,
  runCount,
  minViewsPerRun,
  onApply,
}: DrawableGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Control points (8-12 draggable handles)
  const numHandles = Math.min(12, Math.max(6, Math.floor(runCount / 4)));

  const [handles, setHandles] = useState<number[]>(() => {
    // Default S-curve shape
    return Array.from({ length: numHandles }, (_, i) => {
      const t = i / (numHandles - 1);
      const sCurve = 1 / (1 + Math.exp(-8 * (t - 0.5)));
      return sCurve;
    });
  });

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCustomized, setHasCustomized] = useState(false);

  // Calculate actual views from handles
  const viewsPerRun = useMemo(() => {
    // Interpolate handles to runCount points using Catmull-Rom
    const smoothed = smoothPoints(handles, runCount);

    // Normalize: ensure all positive, scale to totalViews
    const minVal = Math.min(...smoothed);
    const shifted = smoothed.map((v) => Math.max(0.01, v - minVal + 0.01));
    const sum = shifted.reduce((a, b) => a + b, 0);

    // Scale to totalViews
    const scaled = shifted.map((v) => Math.round((v / sum) * totalViews));

    // Enforce minimum
    const enforced = scaled.map((v) => Math.max(minViewsPerRun, v));

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
  }, [handles, runCount, totalViews, minViewsPerRun]);

  // Stats
  const maxViews = Math.max(...viewsPerRun);
  const minViews = Math.min(...viewsPerRun);
  const avgViews = Math.round(totalViews / runCount);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    const padL = 45;
    const padR = 15;
    const padT = 15;
    const padB = 30;
    const gW = W - padL - padR;
    const gH = H - padT - padB;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (gH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + gW, y);
      ctx.stroke();
    }

    // Y-axis labels
    const maxY = Math.max(...viewsPerRun, 1) * 1.15;
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxY / 4) * (4 - i));
      const y = padT + (gH / 4) * i;
      ctx.fillText(String(val), padL - 6, y + 3);
    }

    // X-axis labels
    ctx.textAlign = "center";
    const labelStep = Math.max(1, Math.floor(runCount / 8));
    for (let i = 0; i < runCount; i += labelStep) {
      const x = padL + (i / (runCount - 1)) * gW;
      ctx.fillText(`#${i + 1}`, x, H - 8);
    }

    // Draw interpolated curve (smooth line through all runs)
    const toX = (i: number) => padL + (i / (runCount - 1)) * gW;
    const toY = (v: number) => padT + gH - (v / maxY) * gH;

    // Fill area under curve
    ctx.beginPath();
    ctx.moveTo(toX(0), padT + gH);
    for (let i = 0; i < runCount; i++) {
      ctx.lineTo(toX(i), toY(viewsPerRun[i]));
    }
    ctx.lineTo(toX(runCount - 1), padT + gH);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padT, 0, padT + gH);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.15)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.02)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw curve line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(viewsPerRun[0]));
    for (let i = 1; i < runCount; i++) {
      const prev = { x: toX(i - 1), y: toY(viewsPerRun[i - 1]) };
      const curr = { x: toX(i), y: toY(viewsPerRun[i]) };
      const cpx = (prev.x + curr.x) / 2;
      ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
    }
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw minimum line
    ctx.beginPath();
    ctx.moveTo(padL, toY(minViewsPerRun));
    ctx.lineTo(padL + gW, toY(minViewsPerRun));
    ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Min label
    ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`min: ${minViewsPerRun}`, padL + 4, toY(minViewsPerRun) - 4);

    // Draw draggable handles
    for (let i = 0; i < numHandles; i++) {
      const runIdx = Math.round((i / (numHandles - 1)) * (runCount - 1));
      const x = toX(runIdx);
      const y = toY(viewsPerRun[runIdx]);

      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle =
        draggingIndex === i
          ? "rgba(234, 179, 8, 0.3)"
          : "rgba(59, 130, 246, 0.2)";
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle =
        draggingIndex === i ? "#eab308" : "#3b82f6";
      ctx.fill();

      // White center
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  }, [viewsPerRun, handles, draggingIndex, runCount, numHandles, minViewsPerRun]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  // Mouse/touch handlers
  const getHandleIndex = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const padL = 45;
      const padR = 15;
      const padT = 15;
      const padB = 30;
      const gW = rect.width - padL - padR;
      const gH = rect.height - padT - padB;
      const maxY = Math.max(...viewsPerRun, 1) * 1.15;

      for (let i = 0; i < numHandles; i++) {
        const runIdx = Math.round((i / (numHandles - 1)) * (runCount - 1));
        const hx = padL + (runIdx / (runCount - 1)) * gW;
        const hy = padT + gH - (viewsPerRun[runIdx] / maxY) * gH;
        const dist = Math.sqrt((mx - hx) ** 2 + (my - hy) ** 2);
        if (dist < 16) return i;
      }
      return null;
    },
    [viewsPerRun, numHandles, runCount]
  );

  const updateHandle = useCallback(
    (index: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const padT = 15;
      const padB = 30;
      const gH = rect.height - padT - padB;
      const my = clientY - rect.top;

      // Convert y position to 0-1 value (0 = bottom, 1 = top)
      const raw = 1 - (my - padT) / gH;
      const clamped = Math.max(0.02, Math.min(0.98, raw));

      setHandles((prev) => {
        const next = [...prev];
        next[index] = clamped;
        return next;
      });
      setHasCustomized(true);
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const idx = getHandleIndex(e.clientX, e.clientY);
      if (idx !== null) {
        setDraggingIndex(idx);
        setIsDrawing(true);
        e.preventDefault();
      }
    },
    [getHandleIndex]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || draggingIndex === null) return;
      updateHandle(draggingIndex, e.clientY);
      e.preventDefault();
    },
    [isDrawing, draggingIndex, updateHandle]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
    setIsDrawing(false);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const idx = getHandleIndex(touch.clientX, touch.clientY);
      if (idx !== null) {
        setDraggingIndex(idx);
        setIsDrawing(true);
        e.preventDefault();
      }
    },
    [getHandleIndex]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDrawing || draggingIndex === null) return;
      const touch = e.touches[0];
      updateHandle(draggingIndex, touch.clientY);
      e.preventDefault();
    },
    [isDrawing, draggingIndex, updateHandle]
  );

  const handleTouchEnd = useCallback(() => {
    setDraggingIndex(null);
    setIsDrawing(false);
  }, []);

  // Preset curves
  const applyPresetCurve = (type: string) => {
    setHandles(
      Array.from({ length: numHandles }, (_, i) => {
        const t = i / (numHandles - 1);
        if (type === "s-curve") return 1 / (1 + Math.exp(-8 * (t - 0.5)));
        if (type === "ramp-up") return Math.pow(t, 1.8);
        if (type === "ramp-down") return Math.pow(1 - t, 1.8);
        if (type === "bell") return Math.exp(-Math.pow((t - 0.5) / 0.2, 2));
        if (type === "flat") return 0.5;
        if (type === "wave") return 0.5 + 0.35 * Math.sin(t * Math.PI * 3);
        return 0.5;
      })
    );
    setHasCustomized(true);
  };

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">✏️</span>
          <h3 className="text-xs font-bold text-yellow-300">Draw Your Curve</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-gray-500">Drag handles to shape</span>
        </div>
      </div>

      {/* Preset shape buttons */}
      <div className="flex flex-wrap gap-1 mb-3">
        {[
          { key: "s-curve", label: "〰️ S-Curve" },
          { key: "ramp-up", label: "📈 Ramp Up" },
          { key: "ramp-down", label: "📉 Ramp Down" },
          { key: "bell", label: "🔔 Bell" },
          { key: "wave", label: "🌊 Wave" },
          { key: "flat", label: "━ Flat" },
        ].map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPresetCurve(p.key)}
            className="rounded-md border border-yellow-500/20 bg-black px-2 py-0.5 text-[9px] text-gray-400 hover:text-yellow-300 hover:border-yellow-500/40 transition"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg border border-gray-800 bg-black overflow-hidden"
        style={{ height: 220, cursor: draggingIndex !== null ? "grabbing" : "grab" }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-3 text-[10px]">
          <span className="text-gray-500">
            Min: <span className="text-blue-400">{minViews}</span>
          </span>
          <span className="text-gray-500">
            Max: <span className="text-blue-400">{maxViews}</span>
          </span>
          <span className="text-gray-500">
            Avg: <span className="text-blue-400">{avgViews}</span>
          </span>
          <span className="text-gray-500">
            Runs: <span className="text-yellow-400">{runCount}</span>
          </span>
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
        🎨 Drag the blue handles to shape your delivery curve. Likes, shares & saves will distribute automatically.
        Minimum {minViewsPerRun} views/run enforced.
      </p>
    </div>
  );
}
