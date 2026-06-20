import { useMemo, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { GrowthGraph } from "../components/GrowthGraph";
import { DrawableGraph } from "../components/DrawableGraph";
import { PatternGenerator } from "../components/PatternGenerator";
import type { ApiPanel, CreatedOrder, DeliveryOption, OrderConfig, PatternPlan, QuickPatternPreset } from "../types/order";
import { createSmmOrder } from "../utils/api";
import { createPatternPlan } from "../utils/patterns";
import type { ApprovalBundle } from "../components/ApprovalBundleManager";

interface ApprovalPageProps {
  apis: ApiPanel[];
  approvalBundles: ApprovalBundle[];
  onCreateOrder: (order: CreatedOrder) => void;
  onNavigateToOrders: (notice?: string) => void;
}

function createOrderId() {
  return `ORD-${Date.now().toString().slice(-6)}`;
}

export function ApprovalPage({ apis, approvalBundles, onCreateOrder, onNavigateToOrders }: ApprovalPageProps) {
  const [orderName, setOrderName] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [bulkLinks, setBulkLinks] = useState("");
  const [totalViews, setTotalViews] = useState(50000);
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [startDelayHours, setStartDelayHours] = useState(0);
  const [includeLikes, setIncludeLikes] = useState(true);
  const [variancePercent, setVariancePercent] = useState(40);
  const [peakHoursBoost, setPeakHoursBoost] = useState(false);
  const [quickPreset, setQuickPreset] = useState<QuickPatternPreset | null>(null);
  const [customHours, setCustomHours] = useState(72);
  const [delivery, setDelivery] = useState<DeliveryOption>({ mode: "auto", hours: 72, label: "Auto" });
  const [seed, setSeed] = useState(0);
  const [audienceTimezone, setAudienceTimezone] = useState<string>(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }
    catch { return ""; }
  });
  const [likesDistribution, setLikesDistribution] = useState<"bracket" | "even-spread">("even-spread");
  const [likesBoostPercent, setLikesBoostPercent] = useState<number>(0);
  const [showDrawableGraph, setShowDrawableGraph] = useState(false);
  const [customDrawnViews, setCustomDrawnViews] = useState<number[] | null>(null);
  const [useCustomDrawnViews, setUseCustomDrawnViews] = useState(false);
  const [lockedViews, setLockedViews] = useState<number[] | null>(null);
  const [isViewsLocked, setIsViewsLocked] = useState(false);
  const [useClonedPlan, setUseClonedPlan] = useState(false);
  const [clonedPlan, setClonedPlan] = useState<PatternPlan | null>(null);
  const [expandedRuns, setExpandedRuns] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [deployCountdown, setDeployCountdown] = useState<number | null>(null);
  const [deployReady, setDeployReady] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedBundle = approvalBundles.find((b) => b.id === selectedBundleId);
  const selectedApi = apis.find((a) => a.id === selectedBundle?.apiId);

  // 🔥 FIXED: minViewsPerRun is always 100 for Approval page
  const MIN_VIEWS_PER_RUN = 100;
  // Also respect actual panel minimum if higher than 100
  const actualServiceMin = (() => {
    if (!selectedBundle || !selectedApi) return null;
    const viewsService = selectedApi.services.find((s) => s.id === selectedBundle.viewsServiceId);
    return viewsService?.min || null;
  })();
  const effectiveMinViews = Math.max(MIN_VIEWS_PER_RUN, actualServiceMin || 0);

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
      peakHoursBoost,
      quickPreset,
      delivery: delivery.mode === "custom" ? { ...delivery, hours: customHours, label: "Custom" } : delivery,
      minViewsPerRun: effectiveMinViews,
      customDrawnViews: isViewsLocked ? lockedViews : (useCustomDrawnViews ? customDrawnViews : undefined),
      likesDistribution,
      likesBoostPercent: likesBoostPercent !== 0 ? likesBoostPercent : undefined,
      seed,
      audienceTimezone: audienceTimezone || undefined,
    }),
    [
      postUrl,
      totalViews,
      startDelayHours,
      includeLikes,
      variancePercent,
      peakHoursBoost,
      quickPreset,
      delivery,
      customHours,
      effectiveMinViews,
      isViewsLocked,
      lockedViews,
      useCustomDrawnViews,
      customDrawnViews,
      likesDistribution,
      likesBoostPercent,
      seed,
      audienceTimezone,
    ]
  );

  const generatedPlan = useMemo(() => {
    try {
      const nextPlan = createPatternPlan(config);
      // 🔥 Enforce minimum likes = 1 per run when likes are enabled
      if (includeLikes && nextPlan?.runs) {
        let cumulativeLikes = 0;
        const patchedRuns = nextPlan.runs.map((run) => {
          const clampedLikes = Math.max(1, run.likes || 0);
          cumulativeLikes += clampedLikes;
          return { ...run, likes: clampedLikes, cumulativeLikes };
        });
        return { ...nextPlan, runs: patchedRuns };
      }
      return nextPlan;
    } catch (error) {
      console.error("Pattern plan generation failed", error);
      const now = new Date();
      return {
        patternId: 0,
        patternName: "fallback",
        patternType: "smooth-s-curve" as const,
        totalRuns: 0,
        approximateIntervalMin: 0,
        finishTime: now,
        estimatedDurationHours: 0,
        risk: "Safe" as const,
        runs: [],
      };
    }
  }, [config, seed, includeLikes]);

  const plan = useMemo(() => {
    const basePlan = useClonedPlan && clonedPlan ? { ...clonedPlan, runs: clonedPlan.runs || [] } : generatedPlan;
    return basePlan;
  }, [useClonedPlan, clonedPlan, generatedPlan]);

  const safePlan = useMemo(() => ({ ...plan, runs: plan?.runs || [] }), [plan]);

  const estimatedRunCount = safePlan.runs.length;
  const averageViewsPerRun = estimatedRunCount > 0 ? Math.round(totalViews / estimatedRunCount) : 0;
  const totalPlannedLikes = safePlan.runs.reduce((s, r) => s + (r.likes || 0), 0);

  const handleApplyPreset = (preset: QuickPatternPreset) => {
    setUseClonedPlan(false);
    if (!isViewsLocked) { setUseCustomDrawnViews(false); setCustomDrawnViews(null); }
    setQuickPreset(preset);
    if (preset === "viral-boost") { setVariancePercent(48); setDelivery({ mode: "preset", label: "2d", hours: 48 }); }
    if (preset === "fast-start") { setVariancePercent(34); setDelivery({ mode: "preset", label: "1d", hours: 24 }); }
    if (preset === "trending-push") { setVariancePercent(42); setDelivery({ mode: "preset", label: "3d", hours: 72 }); }
    if (preset === "slow-burn") { setVariancePercent(24); setDelivery({ mode: "preset", label: "4d", hours: 96 }); }
    setSeed((s) => s + 1);
    setExpandedRuns(true);
  };

  const handleDeployClick = () => {
    if (deployCountdown !== null) return;
    setDeployCountdown(15);
    setDeployReady(false);
    setCreateError("");
    setCreateSuccess("");
    let remaining = 15;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setDeployCountdown(remaining);
      if (remaining <= 12) setDeployReady(true);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setDeployCountdown(null);
        setDeployReady(false);
      }
    }, 1000);
  };

  const handleCancelDeploy = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setDeployCountdown(null);
    setDeployReady(false);
  };

  const handleGenerate = () => {
    setUseClonedPlan(false);
    if (!isViewsLocked) { setUseCustomDrawnViews(false); setCustomDrawnViews(null); }
    setSeed((s) => s + 1);
    setExpandedRuns(true);
  };

  const isValidUrl = (value: string) => {
    try { const parsed = new URL(value); return parsed.protocol === "http:" || parsed.protocol === "https:"; }
    catch { return false; }
  };

  const deliveryOptions: DeliveryOption[] = [
    { mode: "preset", label: "1d", hours: 24 },
    { mode: "preset", label: "2d", hours: 48 },
    { mode: "auto", label: "Auto", hours: 72 },
    { mode: "preset", label: "3d", hours: 72 },
    { mode: "preset", label: "4d", hours: 96 },
    { mode: "preset", label: "7d", hours: 168 },
    { mode: "preset", label: "14d", hours: 336 },
    { mode: "custom", label: "Custom", hours: customHours },
  ];

  const handleConfirmDeploy = useCallback(async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setDeployCountdown(null);
    setDeployReady(false);
    setCreateError("");
    setCreateSuccess("");

    if (!postUrl.trim() || !selectedApi || !selectedBundle) { setCreateError("Please fill URL and select an Approval Bundle."); return; }
    if (!isValidUrl(postUrl.trim())) { setCreateError("Please enter a valid URL."); return; }
    if (!plan || plan.runs.length === 0) { setCreateError("Plan generation failed. Check your inputs."); return; }

    // Bulk links
    const links = bulkLinks.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const targetLinks = links.length > 0 ? links : [postUrl.trim()];

    setIsCreatingOrder(true);

    try {
      const servicesPayload: Record<string, { serviceId: string; runs: Array<{ time: string; quantity: number }> }> = {};

      for (const link of targetLinks) {
        const services: Record<string, { serviceId: string; runs: Array<{ time: string; quantity: number }> }> = {};
        services.views = { serviceId: selectedBundle.viewsServiceId, runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.views })) };
        if (includeLikes && selectedBundle.likesServiceId) {
          services.likes = { serviceId: selectedBundle.likesServiceId, runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.likes })) };
        }

        const result = await createSmmOrder({
          apiUrl: selectedApi.url,
          apiKey: selectedApi.key,
          link,
          services,
          name: orderName.trim() || `Approval ${createOrderId()}`,
        });

        const newOrder: CreatedOrder = {
          id: createOrderId(),
          name: orderName.trim() || `Approval ${createOrderId()}`,
          link,
          totalViews,
          startDelayHours,
          patternType: plan.patternType || "manual",
          patternName: plan.patternName || "approval-simple",
          runs: plan.runs.map((r) => ({
            run: r.run,
            at: r.at,
            minutesFromStart: r.minutesFromStart,
            views: r.views,
            likes: r.likes,
            shares: 0,
            saves: 0,
            comments: 0,
            reposts: 0,
            cumulativeViews: r.cumulativeViews,
            cumulativeLikes: r.cumulativeLikes,
            cumulativeShares: 0,
            cumulativeSaves: 0,
            cumulativeComments: 0,
            cumulativeReposts: 0,
          })),
          engagement: { likes: totalPlannedLikes, shares: 0, saves: 0, comments: 0, reposts: 0 },
          serviceId: selectedBundle.viewsServiceId,
          selectedAPI: selectedApi.name,
          selectedBundle: selectedBundle.name,
          status: "running",
          completedRuns: 0,
          runStatuses: plan.runs.map(() => "pending"),
          createdAt: new Date().toISOString(),
          schedulerOrderId: result.schedulerOrderId,
        };
        onCreateOrder(newOrder);
      }

      setCreateSuccess(`${targetLinks.length} order(s) deployed successfully!`);
      setTimeout(() => onNavigateToOrders("New approval order deployed."), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCreateError(msg);
    } finally {
      setIsCreatingOrder(false);
    }
  }, [plan, postUrl, selectedApi, selectedBundle, orderName, totalViews, startDelayHours, includeLikes, totalPlannedLikes, onCreateOrder, onNavigateToOrders, bulkLinks]);

  return (
    <div className="mx-auto max-w-7xl space-y-2 px-3 py-3">
      {/* Compact Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="overflow-hidden rounded-2xl border border-yellow-500/25 bg-gradient-to-r from-black via-gray-950 to-yellow-950/20 p-4 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-xl shadow-inner shadow-yellow-500/10">🛡️</div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-yellow-300">Approval Mission</h2>
                <p className="text-[11px] text-gray-500">Views + Likes only. Min 100 views/run. Min 1 like/run.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:min-w-[400px]">
              {[
                { label: "Views", value: totalViews.toLocaleString(), icon: "👁️", color: "text-yellow-300" },
                { label: "Runs", value: estimatedRunCount.toString(), icon: "🧩", color: "text-blue-300" },
                { label: "Likes", value: totalPlannedLikes.toLocaleString(), icon: "❤️", color: "text-pink-300" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 shadow-inner shadow-white/5">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-gray-500">
                    <span>{item.label}</span><span>{item.icon}</span>
                  </div>
                  <div className={`mt-0.5 text-sm font-black ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Grid - Two Columns */}
      <div className="grid gap-3 xl:grid-cols-2">
        {/* LEFT COLUMN - Basic Order Info */}
        <div className="space-y-2">
          <div className="rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 shadow-lg shadow-black/30">
            <div className="mb-3 flex items-center justify-between border-b border-yellow-500/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-yellow-300 tracking-wide">📋 Order Details</h3>
                <p className="text-[10px] text-gray-500">Target, quantity, and service bundle.</p>
              </div>
              <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${selectedBundleId ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                {selectedBundleId ? "Bundle Ready" : "Bundle Needed"}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-gray-800 bg-black/35 p-3">
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-medium">Order Name</label>
                <input type="text" value={orderName} onChange={(e) => setOrderName(e.target.value)} placeholder="Mission name..." className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-medium">Total Views</label>
                <input type="number" value={totalViews} onChange={(e) => { setUseClonedPlan(false); const raw = e.target.value; if (raw === "" || raw === undefined) { setTotalViews(0); return; } const parsed = parseInt(raw, 10); const safeValue = Number.isFinite(parsed) ? parsed : 0; setTotalViews(Math.max(0, safeValue)); }} min={0} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none" />
              </div>
            </div>

            <div className="mb-2">
              <label className="text-[10px] text-gray-300 mb-1 block font-medium">Post URL</label>
              <input type="text" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://instagram.com/reel/..." className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none" />
            </div>

            <div className="mb-2">
              <label className="text-[10px] text-gray-300 mb-1 block font-medium">Bulk Links (one per line)</label>
              <textarea value={bulkLinks} onChange={(e) => setBulkLinks(e.target.value)} placeholder="Paste multiple URLs..." rows={2} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none resize-none" />
            </div>

            <div>
              <label className="text-[10px] text-gray-300 mb-1 block font-medium">Approval Bundle</label>
              <select value={selectedBundleId} onChange={(e) => { setSelectedBundleId(e.target.value); setUseClonedPlan(false); }} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none">
                <option value="">Select Bundle</option>
                {approvalBundles.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {approvalBundles.length === 0 && <p className="mt-1 text-[10px] text-red-400">Go to Bundles page and create an Approval Bundle first.</p>}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 shadow-lg shadow-black/30">
            <div className="mb-3 flex items-center justify-between border-b border-yellow-500/10 pb-3">
              <h3 className="text-sm font-bold text-yellow-300 tracking-wide">⚡ Quick Presets</h3>
              <span className="rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-300">{quickPreset || "Custom"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { key: "fast-start" as QuickPatternPreset, label: "Fast Start", desc: "24h burst", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
                { key: "viral-boost" as QuickPatternPreset, label: "Viral Boost", desc: "48h peak", color: "border-pink-500/30 bg-pink-500/10 text-pink-300" },
                { key: "trending-push" as QuickPatternPreset, label: "Trending", desc: "72h ramp", color: "border-blue-500/30 bg-blue-500/10 text-blue-300" },
                { key: "slow-burn" as QuickPatternPreset, label: "Slow Burn", desc: "96h organic", color: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
              ].map((p) => (
                <button key={p.key} onClick={() => handleApplyPreset(p.key)} className={`rounded-xl border px-3 py-2 text-left transition hover:scale-[1.02] ${quickPreset === p.key ? p.color : "border-gray-800 bg-black/30 text-gray-400 hover:border-gray-700"}`}>
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] text-gray-500">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 shadow-lg shadow-black/30">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-yellow-500/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-yellow-300 tracking-wide">⚙️ Advanced Controls</h3>
                <p className="text-[10px] text-gray-500">Timing, delivery shape, and likes configuration.</p>
              </div>
              <span className="rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-300">{safePlan.totalRuns} runs</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-semibold uppercase tracking-wide">Start Delay</label>
                <input type="number" value={startDelayHours} onChange={(e) => { setUseClonedPlan(false); const safeValue = Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0; setStartDelayHours(Math.max(0, Math.min(168, safeValue))); }} min={0} max={168} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-semibold uppercase tracking-wide">Variance</label>
                <input type="range" value={variancePercent} onChange={(e) => { setUseClonedPlan(false); setVariancePercent(Number(e.target.value)); }} min={0} max={100} className="w-full accent-yellow-500" />
                <div className="text-right text-[10px] text-yellow-400">{variancePercent}%</div>
              </div>
            </div>

            <div className="mb-2">
              <label className="text-[10px] text-gray-300 mb-1 block font-semibold uppercase tracking-wide">Delivery Speed</label>
              <div className="flex flex-wrap gap-1">
                {deliveryOptions.map((opt) => (
                  <button key={opt.label} onClick={() => { setUseClonedPlan(false); setDelivery(opt); if (opt.mode === "custom") setCustomHours(opt.hours); }} className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${delivery.label === opt.label ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" : "border-gray-800 bg-black text-gray-500 hover:text-gray-300"}`}>
                    {opt.label}
                  </button>
                ))}
                {delivery.mode === "custom" && (
                  <input type="number" value={customHours} onChange={(e) => { setUseClonedPlan(false); const v = Number(e.target.value); setCustomHours(Number.isFinite(v) && v >= 1 ? v : 1); setDelivery({ mode: "custom", label: "Custom", hours: Number.isFinite(v) && v >= 1 ? v : 1 }); }} min={1} className="w-16 rounded-md border border-yellow-500/30 bg-gray-950 px-2 py-1 text-[10px] text-white text-center focus:outline-none" />
                )}
              </div>
            </div>

            <div className="mb-2">
              <label className="text-[10px] text-gray-300 mb-1 block font-semibold uppercase tracking-wide">Audience Timezone</label>
              <input type="text" value={audienceTimezone} onChange={(e) => { setUseClonedPlan(false); setAudienceTimezone(e.target.value); }} placeholder="e.g. Asia/Kolkata" className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none" />
            </div>

            <div className="mb-2 flex items-center gap-2">
              <input type="checkbox" checked={peakHoursBoost} onChange={(e) => { setUseClonedPlan(false); setPeakHoursBoost(e.target.checked); }} className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-yellow-500" />
              <span className="text-xs text-gray-300">Peak Hours Boost</span>
            </div>

            <div className="mb-2">
              <button onClick={() => setShowDrawableGraph(!showDrawableGraph)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${showDrawableGraph ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" : "border-gray-700 bg-black text-gray-400 hover:text-gray-300"}`}>
                ✏️ {showDrawableGraph ? "Hide Custom Curve" : "Draw Custom Curve"}
              </button>
            </div>

            {showDrawableGraph && !isViewsLocked && (
              <div className="mb-2 rounded-xl border border-gray-800 bg-black/50 p-2">
                <DrawableGraph totalViews={totalViews} onDrawComplete={(arr) => { setCustomDrawnViews(arr); setUseCustomDrawnViews(true); }} onClear={() => { setCustomDrawnViews(null); setUseCustomDrawnViews(false); }} />
              </div>
            )}

            {showDrawableGraph && (
              <div className="mb-2 flex gap-2">
                <button onClick={() => { setIsViewsLocked(!isViewsLocked); if (!isViewsLocked) setLockedViews(customDrawnViews); }} className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${isViewsLocked ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" : "border-gray-700 bg-black text-gray-400"}`}>
                  {isViewsLocked ? "🔓 Unlock Views" : "🔒 Lock Views"}
                </button>
              </div>
            )}

            {/* Likes Controls */}
            <div className="rounded-xl border border-pink-500/25 bg-gradient-to-br from-pink-950/20 via-gray-950 to-black p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={includeLikes} onChange={(e) => { setIncludeLikes(e.target.checked); setUseClonedPlan(false); }} className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-pink-500" />
                  <span className="text-xs font-bold text-pink-300">❤️ Likes</span>
                </div>
                {includeLikes && <span className="text-[10px] text-pink-400">Total: {totalPlannedLikes.toLocaleString()}</span>}
              </div>

              {includeLikes && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Distribution</label>
                    <div className="flex gap-1">
                      {(["even-spread", "bracket"] as const).map((mode) => (
                        <button key={mode} onClick={() => { setLikesDistribution(mode); setUseClonedPlan(false); }} className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${likesDistribution === mode ? "border-pink-500/30 bg-pink-500/10 text-pink-300" : "border-gray-700 bg-black text-gray-500"}`}>
                          {mode === "even-spread" ? "Even Spread" : "Bracket"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">Likes Boost: {likesBoostPercent}%</label>
                    <input type="range" value={likesBoostPercent} onChange={(e) => { setLikesBoostPercent(Number(e.target.value)); setUseClonedPlan(false); }} min={0} max={200} className="w-full accent-pink-500" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error / Success */}
          {createError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              ❌ {createError}
            </div>
          )}
          {createSuccess && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              ✅ {createSuccess}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Pattern Visualizer & Deploy */}
        <div className="space-y-2">
          <div className="rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 shadow-lg shadow-black/30">
            <div className="mb-3 flex items-center justify-between border-b border-yellow-500/10 pb-3">
              <h3 className="text-sm font-bold text-yellow-300 tracking-wide">📈 Growth Pattern</h3>
              <div className="flex gap-1">
                <button onClick={handleGenerate} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-300 transition hover:bg-yellow-500/20">🔄 Regenerate</button>
              </div>
            </div>
            <div className="h-48 rounded-xl border border-gray-800 bg-black/50 p-2">
              <GrowthGraph
                plan={safePlan}
                selectedPreset={quickPreset}
                variancePercent={variancePercent}
                delivery={delivery}
                includeLikes={includeLikes}
                includeShares={false}
                includeSaves={false}
                includeComments={false}
                peakHoursBoost={peakHoursBoost}
                onApplyPreset={handleApplyPreset}
                onGenerate={handleGenerate}
                onApplyFavourite={(config) => {
                  if (config.delivery) {
                    setDelivery(config.delivery);
                    if (config.delivery.mode === "custom") setCustomHours(config.delivery.hours);
                  }
                  if (typeof config.variancePercent === "number") setVariancePercent(config.variancePercent);
                  if (typeof config.peakHoursBoost === "boolean") setPeakHoursBoost(config.peakHoursBoost);
                  if (config.likesDistribution) setLikesDistribution(config.likesDistribution);
                  if (typeof config.likesBoostPercent === "number") setLikesBoostPercent(config.likesBoostPercent || 0);
                  setSeed((s) => s + 1);
                }}
                onDrawnViewsChange={(arr) => { setCustomDrawnViews(arr); setUseCustomDrawnViews(true); }}
                isLocked={isViewsLocked}
                onToggleLock={() => { setIsViewsLocked(!isViewsLocked); if (!isViewsLocked) setLockedViews(customDrawnViews); }}
                showDrawableGraph={showDrawableGraph}
                onToggleDrawableGraph={() => setShowDrawableGraph(!showDrawableGraph)}
              />
            </div>

            <PatternGenerator
              plan={safePlan}
              expandedRuns={expandedRuns}
              onToggleRuns={() => setExpandedRuns((prev) => !prev)}
            />

            {/* Deploy */}
            <div className="mt-3 rounded-xl border border-yellow-500/25 bg-gradient-to-r from-yellow-950/20 via-black to-yellow-950/20 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-500">
                  {deployCountdown !== null ? (
                    <span className="text-yellow-400 animate-pulse">⏳ Confirm in {deployCountdown}s...</span>
                  ) : isCreatingOrder ? (
                    <span className="text-yellow-400">Deploying...</span>
                  ) : (
                    <span>{safePlan.totalRuns} runs &middot; {safePlan.estimatedDurationHours}h &middot; Avg {averageViewsPerRun} views/run</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {deployCountdown !== null && (
                    <button onClick={handleCancelDeploy} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-semibold text-red-300 transition hover:bg-red-500/20">
                      Cancel
                    </button>
                  )}
                  {deployCountdown !== null ? (
                    <button onClick={handleConfirmDeploy} disabled={!deployReady || isCreatingOrder} className="rounded-lg bg-yellow-500 px-4 py-1.5 text-xs font-bold text-black transition hover:bg-yellow-400 disabled:opacity-40">
                      {isCreatingOrder ? "..." : "CONFIRM DEPLOY"}
                    </button>
                  ) : (
                    <button onClick={handleDeployClick} disabled={!isValidUrl(postUrl) || !selectedApi || !selectedBundle || isCreatingOrder} className="rounded-lg bg-yellow-500 px-4 py-1.5 text-xs font-bold text-black transition hover:bg-yellow-400 disabled:opacity-40">
                      {isCreatingOrder ? "⏳ Deploying..." : "🚀 DEPLOY MISSION"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
