import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PatternGenerator } from "../components/PatternGenerator";
import type {
  ApiPanel,
  CreatedOrder,
  DeliveryOption,
  OrderConfig,
  PatternPlan,
  QuickPatternPreset,
  RunStep,
} from "../types/order";
import { createSmmOrder } from "../utils/api";
import { createPatternPlan } from "../utils/patterns";
import type { ApprovalBundle } from "../components/ApprovalBundleManager";
import { getUsdToInrRate } from "./BundlesPage";

interface ApprovalPageProps {
  apis: ApiPanel[];
  approvalBundles: ApprovalBundle[];
  onCreateOrder: (order: CreatedOrder) => void;
  onNavigateToOrders: (notice?: string) => void;
}

function createOrderId() {
  return `ORD-${Date.now().toString().slice(-6)}`;
}

function isValidUrl(value: string) {
  try {
    const p = new URL(value);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch {
    return false;
  }
}

/** Persisted variance key for Approval page */
const VARIANCE_LS_KEY = "dev-smm-approval-variance-v1";
const SAFE_DEFAULT_VARIANCE = 25;

function loadPersistedVariance(): number {
  try {
    const raw = localStorage.getItem(VARIANCE_LS_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0 && n <= 60) return n;
    }
  } catch {}
  return SAFE_DEFAULT_VARIANCE;
}

function savePersistedVariance(v: number) {
  try {
    localStorage.setItem(VARIANCE_LS_KEY, String(v));
  } catch {}
}

/**
 * Milestone-based like distribution.
 * Creates milestones at i * viewsPerLike (i=1,2,3... up to totalLikes).
 * For each milestone, the FIRST run whose cumulative views >= milestone
 * gets 1 like. If no run reaches a milestone, that like is simply dropped.
 * Runs that don't cross any milestone get 0 likes.
 */
function distributeMilestoneLikes(
  runs: RunStep[],
  totalLikes: number,
  viewsPerLike: number
): RunStep[] {
  const n = runs.length;
  if (n === 0) return runs;

  const likesArray = new Array(n).fill(0);

  for (let i = 1; i <= totalLikes; i++) {
    const milestone = i * viewsPerLike;

    let assigned = false;
    for (let j = 0; j < n; j++) {
      const cumViews = runs[j].cumulativeViews || 0;
      if (cumViews >= milestone) {
        likesArray[j]++;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      // nothing — like simply doesn't get placed
    }
  }

  let cum = 0;
  return runs.map((r, i) => {
    const likes = likesArray[i];
    cum += likes;
    return { ...r, likes, cumulativeLikes: cum };
  });
}

export function ApprovalPage({
  apis,
  approvalBundles,
  onCreateOrder,
  onNavigateToOrders,
}: ApprovalPageProps) {
  // --- basic fields ---
  const [orderName, setOrderName] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [bulkLinks, setBulkLinks] = useState("");
  const [totalViews, setTotalViews] = useState(2000); // 🔥 default: 2000
  const [selectedBundleId, setSelectedBundleId] = useState("");

  // --- pattern controls ---
  const [startDelayHours, setStartDelayHours] = useState(0);
  // 🔥 variance persisted to localStorage so it survives refresh
  const [variancePercent, setVariancePercentRaw] = useState(() => loadPersistedVariance());
  const setVariancePercent = (v: number) => {
    setVariancePercentRaw(v);
    savePersistedVariance(v);
  };
  const [quickPreset, setQuickPreset] =
    useState<QuickPatternPreset | null>(null);
  const [customHours, setCustomHours] = useState(72);
  const [delivery, setDelivery] = useState<DeliveryOption>({
    mode: "auto",
    hours: 72,
    label: "Auto",
  });
  const [seed, setSeed] = useState(0);

  // --- likes (always manual now) ---
  const [includeLikes, setIncludeLikes] = useState(true);
  const [manualTotalLikes, setManualTotalLikes] = useState(8);
  const [viewsPerLike, setViewsPerLike] = useState(200);

  // --- ui ---
  const [expandedRuns, setExpandedRuns] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const selectedBundle = approvalBundles.find((b) => b.id === selectedBundleId);
  const selectedApi = apis.find((a) => a.id === selectedBundle?.apiId);

  // service minimums – Approval enforces min 100 views/run
  const viewsService = selectedApi?.services.find(
    (s) => s.id === selectedBundle?.viewsServiceId
  );
  const likesService = selectedApi?.services.find(
    (s) => s.id === selectedBundle?.likesServiceId
  );
  const effectiveMinViews = Math.max(100, viewsService?.min || 0);
  const effectiveMinLikes = Math.max(1, likesService?.min || 1);

  const config: OrderConfig = useMemo(
    () => ({
      postUrl,
      totalViews,
      startDelayHours,
      includeLikes,
      includeShares: false,
      includeSaves: false,
      includeComments: false,
      includeReposts: false,
      variancePercent,
      peakHoursBoost: false,
      quickPreset,
      delivery:
        delivery.mode === "custom"
          ? { ...delivery, hours: customHours, label: "Custom" }
          : delivery,
      minViewsPerRun: effectiveMinViews,
      seed,
    }),
    [
      postUrl,
      totalViews,
      startDelayHours,
      includeLikes,
      variancePercent,
      quickPreset,
      delivery,
      customHours,
      effectiveMinViews,
      seed,
    ]
  );

  const plan: PatternPlan = useMemo(() => {
    try {
      const p = createPatternPlan(config);
      if (includeLikes && p.runs?.length) {
        // 🔥 always manual milestone-based likes
        const runs = distributeMilestoneLikes(p.runs, manualTotalLikes, viewsPerLike);
        return { ...p, runs };
      }
      return p;
    } catch (e) {
      console.error(e);
      return {
        patternId: 0,
        patternName: "fallback",
        patternType: "smooth-s-curve",
        totalRuns: 0,
        approximateIntervalMin: 0,
        finishTime: new Date(),
        estimatedDurationHours: 0,
        risk: "Safe",
        runs: [],
      };
    }
  }, [config, includeLikes, manualTotalLikes, viewsPerLike]);

  const runs = plan.runs || [];
  const runCount = runs.length;
  const totalLikes = runs.reduce((s, r) => s + (r.likes || 0), 0);
  const avgViews = runCount ? Math.round(totalViews / runCount) : 0;
  const avgLikes = runCount && includeLikes ? Math.round(totalLikes / runCount) : 0;

  // How many runs actually got at least 1 like?
  const likedRunsCount = useMemo(
    () => runs.filter((r) => (r.likes || 0) > 0).length,
    [runs]
  );

  // How many likes got placed vs dropped?
  const droppedLikes = manualTotalLikes - totalLikes;

  // price
  const priceInfo = useMemo(() => {
    if (!selectedApi || !viewsService) return null;
    const USD_TO_INR = getUsdToInrRate();
    const isUsd = (selectedApi.url || "").toLowerCase().includes("yoyomedia");
    const conv = isUsd ? USD_TO_INR : 1;
    const viewsRate = parseFloat(viewsService.rate || "0") * conv;
    const likesRate = likesService
      ? parseFloat(likesService.rate || "0") * conv
      : 0;
    const viewsCost = (totalViews / 1000) * viewsRate;
    const likesCost = includeLikes ? (totalLikes / 1000) * likesRate : 0;
    return { total: viewsCost + likesCost, viewsCost, likesCost };
  }, [selectedApi, viewsService, likesService, totalViews, totalLikes, includeLikes]);

  // graph data
  const graphData = useMemo(
    () =>
      runs.map((r) => ({
        time: r.at.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        views: r.cumulativeViews,
        likes: r.cumulativeLikes * 10, // scale for visibility
        vRaw: r.cumulativeViews,
        lRaw: r.cumulativeLikes,
      })),
    [runs]
  );

  const deliveryOptions: DeliveryOption[] = [
    { mode: "preset", label: "1d", hours: 24 },
    { mode: "preset", label: "2d", hours: 48 },
    { mode: "auto", label: "Auto", hours: 72 },
    { mode: "preset", label: "3d", hours: 72 },
    { mode: "preset", label: "7d", hours: 168 },
  ];

  const applyPreset = (preset: QuickPatternPreset) => {
    setQuickPreset(preset);
    if (preset === "fast-start") {
      setVariancePercent(34);
      setDelivery({ mode: "preset", label: "1d", hours: 24 });
    } else if (preset === "viral-boost") {
      setVariancePercent(48);
      setDelivery({ mode: "preset", label: "2d", hours: 48 });
    } else if (preset === "trending-push") {
      setVariancePercent(42);
      setDelivery({ mode: "preset", label: "3d", hours: 72 });
    } else if (preset === "slow-burn") {
      setVariancePercent(24);
      setDelivery({ mode: "preset", label: "7d", hours: 168 });
    }
    setSeed((s) => s + 1);
    setExpandedRuns(true);
  };

  const handleDeploy = async () => {
    setCreateError("");
    setCreateSuccess("");

    const bulkTargets = bulkLinks
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const singleTarget = postUrl.trim();
    const targets = bulkTargets.length
      ? bulkTargets
      : singleTarget
      ? [singleTarget]
      : [];

    if (!targets.length) {
      setCreateError("Add a post URL or bulk links.");
      return;
    }
    const bad = targets.find((u) => !isValidUrl(u));
    if (bad) {
      setCreateError(`Invalid URL: ${bad.slice(0, 40)}…`);
      return;
    }
    if (!selectedApi) {
      setCreateError("Select an Approval Bundle.");
      return;
    }
    if (!selectedBundle) {
      setCreateError("Select an Approval Bundle.");
      return;
    }
    if (!selectedBundle.viewsServiceId) {
      setCreateError("Bundle is missing a Views service.");
      return;
    }
    if (includeLikes && !selectedBundle.likesServiceId) {
      setCreateError("Bundle is missing a Likes service.");
      return;
    }
    if (!runs.length) {
      setCreateError("No runs generated. Check your inputs.");
      return;
    }
    if (totalViews > 100000) {
      if (!window.confirm(`Deploy ${totalViews.toLocaleString()} views across ${targets.length} link(s)?`))
        return;
    }

    setIsCreatingOrder(true);
    const batchId = targets.length > 1 ? `approval-${Date.now()}` : undefined;
    let successCount = 0;
    let failedCount = 0;
    let lastError = "";

    try {
      for (let i = 0; i < targets.length; i++) {
        const link = targets[i];
        try {
          const viewsRuns = runs.map((r) => ({
            time: r.at.toISOString(),
            quantity: Math.max(Math.floor(r.views), effectiveMinViews),
          }));

          // Only send likes runs that actually have likes > 0
          const likesRuns = runs
            .filter((r) => Math.floor(r.likes) > 0)
            .map((r) => ({
              time: r.at.toISOString(),
              quantity: Math.floor(r.likes),
            }));

          const services: any = {
            views: {
              serviceId: selectedBundle.viewsServiceId,
              runs: viewsRuns,
              apiUrl: selectedApi.url,
              apiKey: selectedApi.key,
              serviceMin: viewsService?.min || effectiveMinViews,
            },
          };
          if (includeLikes && selectedBundle.likesServiceId && likesRuns.length > 0) {
            services.likes = {
              serviceId: selectedBundle.likesServiceId,
              runs: likesRuns,
              apiUrl: selectedApi.url,
              apiKey: selectedApi.key,
              serviceMin: likesService?.min || effectiveMinLikes,
            };
          }

          const result = await createSmmOrder({
            apiUrl: selectedApi.url,
            apiKey: selectedApi.key,
            link,
            services,
          });

          const created: CreatedOrder = {
            id: createOrderId(),
            name:
              orderName.trim() ||
              `Approval #${createOrderId().slice(-6)}`,
            batchId,
            batchIndex: i + 1,
            batchTotal: targets.length,
            batchLinks: targets.length > 1 ? targets : undefined,
            schedulerOrderId: result.schedulerOrderId,
            smmOrderId: result.orderId ?? "Scheduled",
            link,
            totalViews,
            startDelayHours,
            patternType: plan.patternType,
            patternName: plan.patternName,
            runs: runs.map((r) => ({
              ...r,
              shares: 0,
              saves: 0,
              comments: 0,
              reposts: 0,
              cumulativeShares: 0,
              cumulativeSaves: 0,
              cumulativeComments: 0,
              cumulativeReposts: 0,
            })),
            engagement: {
              likes: totalLikes,
              shares: 0,
              saves: 0,
              comments: 0,
              reposts: 0,
            },
            serviceId: selectedBundle.viewsServiceId,
            selectedAPI: selectedApi.name,
            selectedBundle: selectedBundle.name,
            status: "running",
            completedRuns: 0,
            runStatuses: runs.map(() => "pending"),
            createdAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
          };
          onCreateOrder(created);
          successCount++;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          failedCount++;
        }
      }

      if (successCount === 0) {
        setCreateError(lastError || "Deploy failed.");
        return;
      }
      const msg =
        targets.length > 1
          ? `Approval: ${successCount}/${targets.length} deployed`
          : "Approval mission deployed ✅";
      setCreateSuccess(
        failedCount ? `${msg} (${failedCount} failed)` : msg
      );
      setTimeout(() => onNavigateToOrders(msg), 700);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 py-4">
      {/* Header */}
      <div className="rounded-2xl border border-yellow-500/25 bg-gradient-to-r from-black via-gray-950 to-yellow-950/15 px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <div>
              <h2 className="text-lg font-black text-yellow-300 tracking-tight">
                Approval Mission
              </h2>
              <p className="text-[11px] text-gray-500">
                Views + Likes only · milestone-based likes
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-center">
            {[
              ["Views", totalViews.toLocaleString(), "text-yellow-300"],
              ["Runs", String(runCount), "text-sky-300"],
              ["Likes", includeLikes ? totalLikes.toLocaleString() : "0", "text-pink-300"],
              priceInfo
                ? ["Cost", `₹${priceInfo.total.toFixed(0)}`, "text-emerald-300"]
                : null,
            ]
              .filter(Boolean)
              .map(([label, val, color]) => (
                <div
                  key={label as string}
                  className="min-w-[68px] rounded-lg border border-white/8 bg-white/[0.035] px-2.5 py-1.5"
                >
                  <div className="text-[9px] uppercase tracking-wider text-gray-500">
                    {label}
                  </div>
                  <div className={`text-sm font-bold ${color}`}>{val}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="rounded-2xl border border-yellow-500/20 bg-gray-950 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-300 mb-3">
          📋 Order Details
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="block text-[11px] text-gray-400">
            Order Name
            <input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder="Mission name…"
              className="mt-1 w-full rounded-lg border border-yellow-500/25 bg-black px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
            />
          </label>
          <label className="block text-[11px] text-gray-400">
            Total Views
            <input
              type="number"
              value={totalViews}
              min={100}
              onChange={(e) =>
                setTotalViews(Math.max(0, parseInt(e.target.value || "0", 10) || 0))
              }
              className="mt-1 w-full rounded-lg border border-yellow-500/25 bg-black px-2.5 py-1.5 text-sm text-white focus:border-yellow-500/50 focus:outline-none"
            />
          </label>
          <label className="block text-[11px] text-gray-400 sm:col-span-2">
            Post URL
            <input
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://instagram.com/reel/…"
              className="mt-1 w-full rounded-lg border border-yellow-500/25 bg-black px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
            />
          </label>
          <label className="block text-[11px] text-gray-400 sm:col-span-2">
            Bulk Links <span className="text-gray-600">(one per line, optional)</span>
            <textarea
              value={bulkLinks}
              onChange={(e) => setBulkLinks(e.target.value)}
              placeholder="Paste multiple Instagram URLs…"
              rows={2}
              className="mt-1 w-full rounded-lg border border-yellow-500/25 bg-black px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none resize-none"
            />
          </label>
          <label className="block text-[11px] text-gray-400 sm:col-span-2">
            Approval Bundle
            <select
              value={selectedBundleId}
              onChange={(e) => setSelectedBundleId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-yellow-500/25 bg-black px-2.5 py-1.5 text-sm text-white focus:border-yellow-500/50 focus:outline-none"
            >
              <option value="">Select a bundle…</option>
              {approvalBundles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {approvalBundles.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-400">
                No approval bundles yet — create one in the Bundles page.
              </p>
            )}
          </label>
        </div>
      </div>

      {/* Pattern */}
      <div className="rounded-2xl border border-yellow-500/20 bg-gray-950 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-300">
            ⚡ Pattern
          </h3>
          <button
            onClick={() => {
              setSeed((s) => s + 1);
              setExpandedRuns(true);
            }}
            className="rounded-md border border-yellow-500/25 bg-yellow-500/8 px-2 py-1 text-[11px] text-yellow-300 hover:bg-yellow-500/15"
          >
            🔄 Regenerate
          </button>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
          {[
            ["fast-start", "Fast Start", "24h"],
            ["viral-boost", "Viral Boost", "48h"],
            ["trending-push", "Trending", "72h"],
            ["slow-burn", "Slow Burn", "7d"],
          ].map(([key, label, sub]) => (
            <button
              key={key}
              onClick={() => applyPreset(key as QuickPatternPreset)}
              className={`rounded-lg border px-2.5 py-2 text-left transition ${
                quickPreset === key
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
                  : "border-gray-800 bg-black/40 text-gray-400 hover:border-gray-700 hover:text-gray-200"
              }`}
            >
              <div className="text-xs font-semibold">{label}</div>
              <div className="text-[10px] text-gray-500">{sub}</div>
            </button>
          ))}
        </div>

        {/* Delivery chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {deliveryOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setDelivery(opt)}
              className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                delivery.label === opt.label
                  ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30"
                  : "bg-black border border-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() =>
              setDelivery({ mode: "custom", label: "Custom", hours: customHours })
            }
            className={`rounded-md px-2.5 py-1 text-[11px] ${
              delivery.mode === "custom"
                ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30"
                : "bg-black border border-gray-800 text-gray-400"
            }`}
          >
            Custom
          </button>
          {delivery.mode === "custom" && (
            <input
              type="number"
              min={1}
              value={customHours}
              onChange={(e) => {
                const h = Math.max(1, parseInt(e.target.value || "1", 10));
                setCustomHours(h);
                setDelivery({ mode: "custom", label: "Custom", hours: h });
              }}
              className="w-16 rounded-md border border-yellow-500/25 bg-black px-2 py-1 text-[11px] text-white text-center focus:outline-none"
            />
          )}
        </div>

        {/* Variance + start delay */}
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <label className="text-gray-400">
            Variance:{" "}
            <span className="text-yellow-300 font-semibold">
              {variancePercent}%
            </span>
            <span className="block text-[9px] text-gray-500 mt-0.5">
              {variancePercent <= 15
                ? "Very safe — barely noticeable fluctuation"
                : variancePercent <= 25
                ? "Safe — natural organic look"
                : variancePercent <= 35
                ? "Medium — slight spikes for realism"
                : variancePercent <= 45
                ? "Aggressive — visible spikes"
                : "High risk — very irregular pattern"}
            </span>
            <input
              type="range"
              min={0}
              max={60}
              value={variancePercent}
              onChange={(e) => setVariancePercent(Number(e.target.value))}
              className="w-full accent-yellow-500 mt-1"
            />
            <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
              <span>0%</span>
              <span className="text-yellow-500/70">Safe: 15–25%</span>
              <span>60%</span>
            </div>
          </label>
          <label className="text-gray-400">
            Start Delay (hours)
            <input
              type="number"
              min={0}
              max={168}
              value={startDelayHours}
              onChange={(e) =>
                setStartDelayHours(
                  Math.max(0, Math.min(168, Number(e.target.value) || 0))
                )
              }
              className="mt-1 w-full rounded-md border border-yellow-500/25 bg-black px-2 py-1 text-sm text-white focus:outline-none"
            />
          </label>
        </div>
      </div>

      {/* Likes */}
      <div className="rounded-2xl border border-pink-500/20 bg-gray-950 p-4">
        <div className="flex items-center justify-between mb-2.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLikes}
              onChange={(e) => setIncludeLikes(e.target.checked)}
              className="accent-pink-500 h-4 w-4"
            />
            <span className="text-xs font-bold text-pink-300">
              ❤️ Likes {includeLikes ? "ON" : "OFF"}
            </span>
          </label>
          {includeLikes && (
            <span className="text-[11px] text-pink-400">
              ≈ {totalLikes.toLocaleString()} placed · {likedRunsCount} runs
              {droppedLikes > 0 && (
                <span className="text-amber-400"> · {droppedLikes} dropped</span>
              )}
            </span>
          )}
        </div>

        {includeLikes && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] text-gray-400">
                Total Likes
                <input
                  type="number"
                  min={0}
                  value={manualTotalLikes}
                  onChange={(e) =>
                    setManualTotalLikes(
                      Math.max(0, parseInt(e.target.value || "0", 10) || 0)
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-pink-500/25 bg-black px-2.5 py-1.5 text-sm text-white focus:border-pink-500/50 focus:outline-none"
                />
              </label>
              <label className="block text-[11px] text-gray-400">
                1 Like Every ~ Views
                <input
                  type="number"
                  min={1}
                  step={50}
                  value={viewsPerLike}
                  onChange={(e) =>
                    setViewsPerLike(
                      Math.max(1, parseInt(e.target.value || "1", 10) || 1)
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-pink-500/25 bg-black px-2.5 py-1.5 text-sm text-white focus:border-pink-500/50 focus:outline-none"
                />
              </label>
            </div>

            <p className="text-[10px] text-gray-500">
              Milestones:{" "}
              <b className="text-pink-400">
                {Array.from({ length: Math.min(manualTotalLikes, 10) }, (_, i) =>
                  ((i + 1) * viewsPerLike).toLocaleString()
                ).join(", ")}
                {manualTotalLikes > 10 ? `, …` : ""}
              </b>
              . The first run crossing each milestone gets 1 like. Other runs get 0.
            </p>

            {likedRunsCount > 0 && (
              <p className="text-[10px] text-pink-400/80">
                <b>{likedRunsCount}</b> runs will carry likes.{" "}
                <b>{totalLikes}</b> of <b>{manualTotalLikes}</b> likes placed.
                {droppedLikes > 0 && (
                  <span className="text-amber-400/80">
                    {" "}
                    <b>{droppedLikes}</b> likes dropped (views didn’t reach the last milestones).
                  </span>
                )}
              </p>
            )}

            {likedRunsCount === 0 && manualTotalLikes > 0 && (
              <p className="text-[10px] text-red-400">
                ❌ No runs can reach the first milestone. Lower “1 Like Every” or increase total views.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Graph */}
      <div className="rounded-2xl border border-yellow-500/20 bg-gray-950 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-300">
            📈 Delivery Curve
          </h3>
          <span className="text-[11px] text-gray-500">
            {runCount} runs · {plan.estimatedDurationHours}h · avg{" "}
            {avgViews.toLocaleString()}/run
            {includeLikes && (
              <span className="text-pink-400/80"> · {likedRunsCount} liked runs</span>
            )}
          </span>
        </div>
        <div className="h-[180px] rounded-xl bg-black/60 border border-gray-800 px-1 py-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={graphData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
              <XAxis
                dataKey="time"
                stroke="#555"
                tick={{ fill: "#888", fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={36}
              />
              <YAxis
                stroke="#555"
                tick={{ fill: "#888", fontSize: 10 }}
                width={38}
                tickFormatter={(v) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  background: "#0b0b0e",
                  border: "1px solid #3a2a00",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(value: any, name: any, props: any) => {
                  if (name === "likes") return [props.payload.lRaw, "Likes"];
                  return [props.payload.vRaw, "Views"];
                }}
                labelFormatter={(l) => `⏱ ${l}`}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#facc15"
                strokeWidth={2}
                dot={false}
                name="views"
              />
              {includeLikes && (
                <Line
                  type="monotone"
                  dataKey="likes"
                  stroke="#f472b6"
                  strokeWidth={1.8}
                  dot={false}
                  name="likes"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1.5 text-[10px] text-gray-600">
          Likes shown ×10 for visibility. Tooltip shows real counts.
        </p>

        <div className="mt-3">
          <PatternGenerator
            plan={plan}
            expandedRuns={expandedRuns}
            onToggleRuns={() => setExpandedRuns((v) => !v)}
          />
        </div>
      </div>

      {/* Deploy bar */}
      <div className="rounded-2xl border border-yellow-500/25 bg-gray-950 px-4 py-3">
        {createError && (
          <div className="mb-2 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2 text-xs text-red-300">
            ❌ {createError}
          </div>
        )}
        {createSuccess && (
          <div className="mb-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-xs text-emerald-300">
            ✅ {createSuccess}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] text-gray-400">
            {runCount} runs · {plan.estimatedDurationHours}h · ~
            {avgViews.toLocaleString()} views/run
            {includeLikes && (
              <span className="text-pink-400"> · {likedRunsCount} liked runs</span>
            )}
            {priceInfo && (
              <span className="text-emerald-400">
                {" "}
                · ₹{priceInfo.total.toFixed(0)}
              </span>
            )}
          </div>
          <button
            onClick={handleDeploy}
            disabled={
              isCreatingOrder ||
              !selectedBundle ||
              !runs.length ||
              !(postUrl.trim() || bulkLinks.trim())
            }
            className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isCreatingOrder ? "⏳ Deploying…" : "🚀 Deploy Approval Mission"}
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-600 pb-2">
        Approval bundles are managed in <b className="text-gray-400">Bundles → Approval Bundles</b>
      </p>
    </div>
  );
}
