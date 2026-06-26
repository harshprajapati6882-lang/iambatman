import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { GrowthGraph } from "../components/GrowthGraph";
import { DrawableGraph } from "../components/DrawableGraph";
import { PatternGenerator } from "../components/PatternGenerator";
import type {
  ApiPanel,
  Bundle,
  CreatedOrder,
  DeliveryOption,
  OrderConfig,
  PatternPlan,
  QuickPatternPreset,
  EngagementRule,
} from "../types/order";
import { createSmmOrder } from "../utils/api";
import { COMMENT_PACKS, pickComments } from "../data/commentPacks";
import { createPatternPlan } from "../utils/patterns";
import { getUsdToInrRate } from "./BundlesPage";
import { BACKEND_URL } from "../config";

interface NewOrderPageProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  orders: CreatedOrder[];
  prefillOrder?: CreatedOrder | null;
  onCreateOrder: (order: CreatedOrder) => void;
  onNavigateToOrders: (notice?: string) => void;
}

function createOrderId() {
  return `ORD-${Date.now().toString().slice(-6)}`;
}

/**
 * Distribute likes at cumulative-view milestones.
 * Each milestone = i * viewsPerLike. The first run whose cumulative views >= milestone
 * gets 1 like. If no run reaches a milestone, that like is simply dropped.
 */
function distributeMilestoneLikes(
  runs: any[],
  totalLikes: number,
  viewsPerLike: number
): any[] {
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
      // like dropped — milestone beyond final run
    }
  }

  let cum = 0;
  return runs.map((r, i) => {
    const likes = likesArray[i];
    cum += likes;
    return { ...r, likes, cumulativeLikes: cum };
  });
}

function recomputeCumulativeLikes(runs: any[]): any[] {
  let cum = 0;
  return runs.map((r) => {
    cum += r.likes || 0;
    return { ...r, cumulativeLikes: cum };
  });
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  if (value < 1) return value.toFixed(3);
  if (value < 100) return value.toFixed(2);
  return value.toFixed(0);
}
export function NewOrderPage({ apis, bundles, orders, prefillOrder, onCreateOrder, onNavigateToOrders }: NewOrderPageProps) {
  const prefillApiId = prefillOrder ? apis.find((api) => api.name === prefillOrder.selectedAPI)?.id ?? "" : "";
  const prefillBundleId = prefillOrder
    ? bundles.find((bundle) => bundle.name === prefillOrder.selectedBundle && bundle.apiId === prefillApiId)?.id ?? ""
    : "";
  const prefillRuns = prefillOrder?.runs || [];
  const prefillPlan: PatternPlan | null = prefillOrder
    ? {
        patternId: Number(prefillOrder.id.replace(/\D/g, "")) || Date.now() % 1000,
        patternName: prefillOrder.patternName,
        patternType: prefillOrder.patternType,
        totalRuns: prefillRuns.length,
        approximateIntervalMin:
          prefillRuns.length > 1
            ? Math.max(
                1,
                Math.round(
                  prefillRuns
                    .slice(1)
                    .reduce((acc, run, index) => {
                      const prev = prefillRuns[index];
                      return acc + (run.at.getTime() - prev.at.getTime()) / 60000;
                    }, 0) / (prefillRuns.length - 1)
                )
              )
            : 0,
        finishTime: prefillRuns[prefillRuns.length - 1]?.at ?? new Date(),
        estimatedDurationHours:
          prefillRuns.length > 1
            ? Math.round(
                ((prefillRuns[prefillRuns.length - 1]?.at.getTime() ?? Date.now()) -
                  (prefillRuns[0]?.at.getTime() ?? Date.now())) /
                  3600000
              )
            : 0,
        risk: "Safe",
        runs: prefillRuns,
      }
    : null;

    const [orderName, setOrderName] = useState(prefillOrder?.name && !prefillOrder.name.startsWith("Order #") ? prefillOrder.name : "");
  const [postUrl, setPostUrl] = useState(
    prefillOrder?.batchLinks && prefillOrder.batchLinks.length > 1 ? "" : (prefillOrder?.link ?? "")
  );
  const [bulkLinks, setBulkLinks] = useState(
    prefillOrder?.batchLinks && prefillOrder.batchLinks.length > 1
      ? prefillOrder.batchLinks.join("\n")
      : ""
  );
  const [totalViews, setTotalViews] = useState(prefillOrder?.totalViews ?? 50000);
  const [selectedApiId, setSelectedApiId] = useState(prefillApiId);
  const [selectedBundleId, setSelectedBundleId] = useState(prefillBundleId);
  const [startDelayHours, setStartDelayHours] = useState(prefillOrder?.startDelayHours ?? 0);
  const [includeLikes, setIncludeLikes] = useState(prefillOrder ? (prefillOrder.engagement.likes ?? 0) > 0 : true);
  const [includeShares, setIncludeShares] = useState(prefillOrder ? (prefillOrder.engagement.shares ?? 0) > 0 : true);
  const [includeSaves, setIncludeSaves] = useState((prefillOrder?.engagement.saves ?? 0) > 0);
  const [customComments, setCustomComments] = useState("");
  const [includeComments, setIncludeComments] = useState(prefillOrder ? (prefillOrder.engagement.comments ?? 0) > 0 : true);
  const [variancePercent, setVariancePercent] = useState(40);
  const [peakHoursBoost, setPeakHoursBoost] = useState(false);
  const [quickPreset, setQuickPreset] = useState<QuickPatternPreset | null>(null);
  const [customHours, setCustomHours] = useState(72);
  const [delivery, setDelivery] = useState<DeliveryOption>({ mode: "auto", hours: 72, label: "Auto" });
  const [seed, setSeed] = useState(0);
  // 🔥 FIX #7: audience timezone for the hour-of-day engagement curve.
  // Defaults to the browser's current zone so existing behaviour is preserved.
  const [audienceTimezone, setAudienceTimezone] = useState<string>(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }
    catch { return ""; }
  });

  // 🔥 NEW: view-bracket engagement rules. Persisted to localStorage so the
  // user doesn't have to re-enter them on every order. Toggled by a single
  // master switch — when OFF, every value is ignored and the automatic plan
  // logic runs as before.
  const ENGAGEMENT_RULES_LS_KEY = "dev-smm-engagement-rules-v1";
  const ENGAGEMENT_RULES_ON_LS_KEY = "dev-smm-engagement-rules-on-v1";

  const makeBlankRule = (i: number, viewsMin = 100, viewsMax = 200): EngagementRule => ({
    id: `rule-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    viewsMin,
    viewsMax,
    likes:    { enabled: true,  min: 10, max: 15 },
    shares:   { enabled: true,  min: 10, max: 12 },
    saves:    { enabled: false, min: 10, max: 12 },
    comments: { enabled: false, min: 10, max: 12 },
    reposts:  { enabled: false, min: 10, max: 12 },
  });

  const [engagementRulesEnabled, setEngagementRulesEnabledRaw] = useState<boolean>(() => {
    try { return localStorage.getItem(ENGAGEMENT_RULES_ON_LS_KEY) === "1"; }
    catch { return false; }
  });
  const setEngagementRulesEnabled = (v: boolean) => {
    setEngagementRulesEnabledRaw(v);
    setSeed((s) => s + 1);
    try { localStorage.setItem(ENGAGEMENT_RULES_ON_LS_KEY, v ? "1" : "0"); } catch {}
  };

  const [engagementRules, setEngagementRulesRaw] = useState<EngagementRule[]>(() => {
    try {
      const raw = localStorage.getItem(ENGAGEMENT_RULES_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as EngagementRule[];
      }
    } catch {}
    // Sensible starter rules matching the user's example.
    return [
      makeBlankRule(0, 100, 200),
      { ...makeBlankRule(1, 201, 300),
        likes: { enabled: true, min: 15, max: 20 },
        shares: { enabled: true, min: 12, max: 15 } },
      { ...makeBlankRule(2, 301, 500),
        likes: { enabled: true, min: 20, max: 30 },
        shares: { enabled: true, min: 15, max: 20 } },
    ];
  });
  const setEngagementRules = (next: EngagementRule[] | ((prev: EngagementRule[]) => EngagementRule[])) => {
    setEngagementRulesRaw((prev) => {
      const updated = typeof next === "function" ? next(prev) : next;
      try { localStorage.setItem(ENGAGEMENT_RULES_LS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setSeed((s) => s + 1);
  };
  const [rulesPanelOpen, setRulesPanelOpen] = useState<boolean>(false);

  // 🔥 NEW: Sub-Likes toggle.
  // When ON, likes runs with qty <= threshold are split into many tiny sub-runs
  // and routed to the bundle's `likesPremium` service.
  const SUBLIKES_ON_KEY = "dev-smm-sublikes-on-v1";
  const SUBLIKES_THRESHOLD_KEY = "dev-smm-sublikes-threshold-v1";
  const [subLikesEnabled, setSubLikesEnabledRaw] = useState<boolean>(() => {
    try { return localStorage.getItem(SUBLIKES_ON_KEY) === "1"; } catch { return false; }
  });
  const setSubLikesEnabled = (v: boolean) => {
    setSubLikesEnabledRaw(v);
    setSeed((s) => s + 1);
    try { localStorage.setItem(SUBLIKES_ON_KEY, v ? "1" : "0"); } catch {}
  };
  const [subLikesThreshold, setSubLikesThresholdRaw] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(SUBLIKES_THRESHOLD_KEY);
      const n = raw ? parseInt(raw, 10) : 20;
      return Number.isFinite(n) && n >= 1 ? n : 20;
    } catch { return 20; }
  });
  const setSubLikesThreshold = (v: number) => {
    setSubLikesThresholdRaw(v);
    setSeed((s) => s + 1);
    try { localStorage.setItem(SUBLIKES_THRESHOLD_KEY, String(v)); } catch {}
  };
  const [useClonedPlan, setUseClonedPlan] = useState(Boolean(prefillPlan));
  const [clonedPlan, setClonedPlan] = useState<PatternPlan | null>(prefillPlan);
  const [expandedRuns, setExpandedRuns] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [deployCountdown, setDeployCountdown] = useState<number | null>(null);
  const [deployReady, setDeployReady] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

   // 🔥 NEW: Minimum views per run state
  const [minViewsPerRun, setMinViewsPerRun] = useState(100);

    // 🔥 NEW: Manual run count
  const [manualRunCount, setManualRunCount] = useState<number>(0);

    // 🔥 NEW: Drawable graph mode
  const [showDrawableGraph, setShowDrawableGraph] = useState(false);

   // 🔥 NEW: Custom drawn views (only views shape, engagement added by pattern engine)
  const [customDrawnViews, setCustomDrawnViews] = useState<number[] | null>(null);
  const [useCustomDrawnViews, setUseCustomDrawnViews] = useState(false);

  // 🔥 NEW: Lock views — freeze current views distribution
  const [lockedViews, setLockedViews] = useState<number[] | null>(null);
  const [isViewsLocked, setIsViewsLocked] = useState(false);

  // 🔥 NEW: Shares ratio
  const [sharesRatio, setSharesRatio] = useState<"equal" | "half" | "third" | "custom">("half");
  const [sharesCustomCount, setSharesCustomCount] = useState<number>(100);
  const [sharesAfterHalfLikes, setSharesAfterHalfLikes] = useState(false);
  const [sharesBoostPercent, setSharesBoostPercent] = useState<number>(0);

    // 🔥 NEW: Saves ratio
  const [savesRatio, setSavesRatio] = useState<"equal" | "half" | "third" | "custom">("third");
  const [savesCustomCount, setSavesCustomCount] = useState<number>(50);

    // 🔥 NEW: Likes distribution mode
  const [likesDistribution, setLikesDistribution] = useState<"bracket" | "even-spread">("even-spread");

    // 🔥 NEW: Likes boost percentage (0 = default, 50 = +50%, 100 = +100% = double)
  const [likesBoostPercent, setLikesBoostPercent] = useState<number>(0);

  // 🔥 NEW: Reposts
  const [includeReposts, setIncludeReposts] = useState(false);
  const [repostsRatio, setRepostsRatio] = useState<"equal" | "half" | "third" | "custom">("half");
  const [repostsCustomCount, setRepostsCustomCount] = useState<number>(50);

  // 🔥 NEW: Fetch min views setting from backend on mount
  useEffect(() => {
    const fetchMinViews = async () => {
      try {
        // 🔥 FIX #5: use shared config
    const backendUrl = BACKEND_URL;
        const response = await fetch(`${backendUrl}/api/settings/min-views`);
        if (response.ok) {
          const data = await response.json();
          if (data.minViewsPerRun) {
            setMinViewsPerRun(data.minViewsPerRun);
          }
        }
      } catch (error) {
        console.warn("Could not fetch min views setting, using default 100");
      }
    };
    fetchMinViews();
  }, []);

   // 🔥 UPDATED: Config now includes minViewsPerRun
  const selectedApi = apis.find(a => a.id === selectedApiId);
const selectedBundle = bundles.find(b => b.id === selectedBundleId);

const commentsService = selectedApi?.services.find(
  s => s.id === selectedBundle?.serviceIds.comments
);

// 🔥 Extract the ACTUAL service minimum from the selected bundle's views service
// This ensures no run goes below what the SMM panel requires
const getActualServiceMin = () => {
  if (!selectedBundle || !selectedApi) return null;
  // Check if views use a different API via serviceApis
  const viewsApiId = selectedBundle.serviceApis?.views || selectedBundle.apiId || selectedApiId;
  const viewsApi = apis.find(a => a.id === viewsApiId);
  const viewsServiceId = selectedBundle.serviceIds.views;
  const viewsService = viewsApi?.services.find(s => s.id === viewsServiceId);
  return viewsService?.min || null;
};

const actualServiceMin = getActualServiceMin();
// 🔥 Use the HIGHER of: actual service minimum vs user's slider setting
const effectiveMinViews = Math.max(
  minViewsPerRun,
  actualServiceMin || 0
);
  
     const config: OrderConfig = useMemo(
    () => ({
      postUrl,
      totalViews,
      startDelayHours,
      includeLikes,
      includeShares,
      includeSaves,
      includeComments,
      includeReposts,
      repostsRatio,
      repostsCustomCount,
      variancePercent,
      peakHoursBoost,
      quickPreset,
            delivery:
        delivery.mode === "custom"
          ? { ...delivery, hours: customHours, label: "Custom" }
          : delivery,
      minViewsPerRun: effectiveMinViews,
      manualRunCount: manualRunCount > 0 ? manualRunCount : undefined,
      sharesRatio,
      sharesAfterHalfLikes,
      sharesBoostPercent: sharesBoostPercent !== 0 ? sharesBoostPercent : undefined,
      savesRatio,
      sharesCustomCount,
      savesCustomCount,
            customDrawnViews: isViewsLocked ? lockedViews : (useCustomDrawnViews ? customDrawnViews : undefined),
      likesDistribution,
      likesBoostPercent: likesBoostPercent !== 0 ? likesBoostPercent : undefined,
      // 🔥 likes mode settings
      likesMode,
      manualTotalLikes,
      viewsPerLike,
      minLikesOne,
      // 🔥 FIX #6: pass the regen seed so the previewed plan == submitted plan
      seed,
      // 🔥 FIX #7: audience tz for the hour-of-day engagement curve
      audienceTimezone: audienceTimezone || undefined,
      // 🔥 NEW: view-bracket engagement rules (only applied when the toggle is ON)
      engagementRulesEnabled,
      engagementRules: engagementRulesEnabled ? engagementRules : undefined,
      // 🔥 NEW: sub-likes drip mode
      subLikesEnabled,
      subLikesThreshold,
    }),
    [
      postUrl,
      totalViews,
      startDelayHours,
      includeLikes,
      includeShares,
      includeSaves,
      includeComments,
      includeReposts,
      repostsRatio,
      repostsCustomCount,
      variancePercent,
      peakHoursBoost,
      quickPreset,
      delivery,
      customHours,
      minViewsPerRun,
      manualRunCount,
      sharesRatio,
      sharesAfterHalfLikes,
      sharesBoostPercent,
      savesRatio,
      sharesCustomCount,
      savesCustomCount,
            customDrawnViews,
      useCustomDrawnViews,
      lockedViews,
      isViewsLocked,
      likesDistribution,
      likesBoostPercent,
      likesMode,
      manualTotalLikes,
      viewsPerLike,
      minLikesOne,
      seed,
      audienceTimezone,
      engagementRulesEnabled,
      engagementRules,
      subLikesEnabled,
      subLikesThreshold,
    ]
  );

  const generatedPlan = useMemo(() => {
    try {
      const nextPlan = createPatternPlan(config);
      let runs = nextPlan?.runs || [];

      // 🔥 Apply manual likes mode (milestone-based, same as ApprovalPage)
      if (includeLikes && likesMode === "manual" && runs.length > 0) {
        runs = distributeMilestoneLikes(runs, manualTotalLikes, viewsPerLike);
      }

      // 🔥 Apply min-likes-per-run clamp: when ON, every run gets at least 1 like
      if (includeLikes && minLikesOne && likesMode === "auto" && runs.length > 0) {
        runs = runs.map((r) => ({ ...r, likes: Math.max(1, r.likes || 0) }));
        runs = recomputeCumulativeLikes(runs);
      }

      return { ...nextPlan, runs };
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
  }, [config, seed, includeLikes, likesMode, manualTotalLikes, viewsPerLike, minLikesOne]);

    const plan = useMemo(() => {
    const basePlan = useClonedPlan && clonedPlan
      ? { ...clonedPlan, runs: clonedPlan.runs || [] }
      : generatedPlan;

    return basePlan;
  }, [useClonedPlan, clonedPlan, generatedPlan]);

  const safePlan = useMemo(() => ({ ...plan, runs: plan?.runs || [] }), [plan]);

    const bundleOptions = useMemo(() => {
    // 🔥 Show all bundles — with multi-API support, bundles are no longer tied to one API
    return bundles;
  }, [bundles]);

  function isValidUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

    const handleApplyPreset = (preset: QuickPatternPreset) => {
    setUseClonedPlan(false);
    if (!isViewsLocked) {
      setUseCustomDrawnViews(false);
      setCustomDrawnViews(null);
    }
    setQuickPreset(preset);
    if (preset === "viral-boost") {
      setVariancePercent(48);
      setDelivery({ mode: "preset", label: "2d", hours: 48 });
    }
    if (preset === "fast-start") {
      setVariancePercent(34);
      setDelivery({ mode: "preset", label: "1d", hours: 24 });
    }
    if (preset === "trending-push") {
      setVariancePercent(42);
      setDelivery({ mode: "preset", label: "3d", hours: 72 });
    }
    if (preset === "slow-burn") {
      setVariancePercent(24);
      setDelivery({ mode: "preset", label: "4d", hours: 96 });
    }
    setSeed((current) => current + 1);
    setExpandedRuns(true);
  };
  const handleDeployClick = () => {
    // If already in countdown, do nothing (wait for confirm button)
    if (deployCountdown !== null) return;

    // Start 15 second countdown
    setDeployCountdown(15);
    setDeployReady(false);

    let remaining = 15;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setDeployCountdown(remaining);

      // After 3 seconds, allow early deploy
      if (remaining <= 12) {
        setDeployReady(true);
      }

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
    setCreateError("");
    setCreateSuccess("");
  };
      const handleGenerate = () => {
    setUseClonedPlan(false);
    if (!isViewsLocked) {
      setUseCustomDrawnViews(false);
      setCustomDrawnViews(null);
    }
    setSeed((current) => current + 1);
    setExpandedRuns(true);
  };

  // 🔥 NEW: Handle min views change - regenerate pattern when changed
  const handleMinViewsChange = (value: number) => {
    const newValue = Math.max(1, Math.floor(value));
    setMinViewsPerRun(newValue);
    setUseClonedPlan(false);
    setSeed((current) => current + 1); // 🔥 Force regenerate pattern

    // Also update backend
    // 🔥 FIX #5: use shared config
    const backendUrl = BACKEND_URL;
    fetch(`${backendUrl}/api/settings/min-views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minViewsPerRun: newValue }),
    }).catch(() => console.warn("Could not update min views setting on backend"));
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

  // 🔥 Calculate estimated runs and views per run for display
  const estimatedRunCount = safePlan.runs.length;
  const averageViewsPerRun = estimatedRunCount > 0 ? Math.round(totalViews / estimatedRunCount) : 0;
  const totalPlannedLikes = safePlan.runs.reduce((sum, run) => sum + (run.likes || 0), 0);
  const totalPlannedShares = safePlan.runs.reduce((sum, run) => sum + (run.shares || 0), 0);
  const totalPlannedComments = safePlan.runs.reduce((sum, run) => sum + (run.comments || 0), 0);
  const totalPlannedEngagement = totalPlannedLikes + totalPlannedShares + totalPlannedComments;

  return (
    <div className="mx-auto max-w-7xl space-y-2 px-3 py-3">
      {/* Compact Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="overflow-hidden rounded-2xl border border-yellow-500/25 bg-gradient-to-r from-black via-gray-950 to-yellow-950/20 p-4 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-xl shadow-inner shadow-yellow-500/10">⚡</div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-yellow-300">New Mission</h2>
                <p className="text-[11px] text-gray-500">Build viral-style delivery patterns with precise run control.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              {[
                { label: "Views", value: totalViews.toLocaleString(), icon: "👁️", color: "text-yellow-300" },
                { label: "Runs", value: estimatedRunCount.toString(), icon: "🧩", color: "text-blue-300" },
                { label: "Duration", value: `${safePlan.estimatedDurationHours}h`, icon: "⏱️", color: "text-emerald-300" },
                { label: "Engage", value: totalPlannedEngagement.toLocaleString(), icon: "❤️", color: "text-pink-300" },
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
                <p className="text-[10px] text-gray-500">Target, quantity, API panel, and service bundle.</p>
              </div>
              <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${selectedBundleId ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                {selectedBundleId ? "Bundle Ready" : "Bundle Needed"}
              </span>
            </div>
            
            {/* Order Name & URL */}
            <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-gray-800 bg-black/35 p-3">
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-medium">Order Name</label>
                <input
                  type="text"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  placeholder="Mission name..."
                  className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-medium">Total Views</label>
                                <input
                  type="number"
                  value={totalViews}
                  onChange={(e) => {
                    setUseClonedPlan(false);
                    const raw = e.target.value;
                    if (raw === "" || raw === undefined) {
                      setTotalViews(0);
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    const safeValue = Number.isFinite(parsed) ? parsed : 0;
                    setTotalViews(Math.max(0, safeValue));
                  }}
                  min={0}
                  className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Post URL */}
            <div className="mb-2">
              <label className="text-[10px] text-gray-300 mb-1 block font-medium">Post URL</label>
              <input
                type="text"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://instagram.com/reel/..."
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
              />
            </div>

            {/* Bulk Links */}
            <div className="mb-2">
              <label className="text-[10px] text-gray-300 mb-1 block font-medium">Bulk Links (one per line)</label>
              <textarea
                value={bulkLinks}
                onChange={(e) => setBulkLinks(e.target.value)}
                placeholder="Paste multiple URLs..."
                rows={2}
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none resize-none"
              />
            </div>

            {/* API & Bundle Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-medium">API Panel</label>
                <select
                  value={selectedApiId}
                  onChange={(e) => {
                    setSelectedApiId(e.target.value);
                    setSelectedBundleId("");
                  }}
                  className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
                >
                  <option value="">Select API</option>
                  {apis.map((api) => (
                    <option key={api.id} value={api.id}>{api.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-medium">Bundle</label>
                <select
                  value={selectedBundleId}
                  onChange={(e) => setSelectedBundleId(e.target.value)}
                  className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
                >
                  <option value="">Select Bundle</option>
                  {bundleOptions.map((bundle) => (
                    <option key={bundle.id} value={bundle.id}>{bundle.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 🔥 NEW: Minimum Views Per Run Settings Block */}
          <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-950/25 via-gray-950 to-black p-4 shadow-lg shadow-black/25">
            <div className="mb-3 flex items-center justify-between border-b border-blue-500/10 pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-300 tracking-wide"><span>⚙️</span> Global Run Settings</h3>
                <p className="text-[10px] text-gray-500">Control run density and exact run count.</p>
              </div>
              <span className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-300">
                Avg {averageViewsPerRun.toLocaleString()}/run
              </span>
            </div>
            
            <div className="space-y-3">
              {/* Min Views Input */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-[10px] text-gray-400">Minimum Views Per Run</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minViewsPerRun}
                    onChange={(e) => handleMinViewsChange(Number(e.target.value))}
                    min={1}
                    max={10000}
                    className="w-20 rounded-lg border border-blue-500/30 bg-black px-2 py-1 text-xs text-white text-center focus:border-blue-500/50 focus:outline-none"
                  />
                  <span className="text-[9px] text-gray-500">views/run</span>
                </div>
              </div>

              {/* Quick presets for min views */}
              <div className="flex gap-1 flex-wrap">
                {[100, 200, 300, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleMinViewsChange(preset)}
                    className={`rounded-md px-2 py-0.5 text-[9px] font-medium transition ${
                      minViewsPerRun === preset
                        ? "border border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border border-blue-500/20 bg-black text-gray-500 hover:text-blue-300"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Live calculation display */}
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-2 py-2">
                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-gray-300 font-medium">Estimated Runs:</span>
                  <span className="text-blue-300 font-semibold">{estimatedRunCount}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                                    <span className="text-gray-300 font-medium">Avg Views/Run:</span>
                  <span className="text-blue-300 font-semibold">{averageViewsPerRun.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-1">
                                   <span className="text-gray-300 font-medium">Max Possible Runs:</span>
                  <span className="text-gray-500">{Math.floor(totalViews / effectiveMinViews)}</span>
                </div>
              </div>

                            {/* 🔥 NEW: Manual Run Count */}
              <div className="border-t border-blue-500/20 pt-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="text-[10px] text-gray-400">
                    Manual Run Count
                    <span className="ml-1 text-[9px] text-blue-400/60">(0 = auto)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={manualRunCount}
                      onChange={(e) => {
                        const val = Math.max(0, Math.floor(Number(e.target.value)));
                        setManualRunCount(val);
                        setUseClonedPlan(false);
                        setSeed(prev => prev + 1);
                      }}
                      min={0}
                      max={500}
                      className="w-20 rounded-lg border border-blue-500/30 bg-black px-2 py-1 text-xs text-white text-center focus:border-blue-500/50 focus:outline-none"
                    />
                    <span className="text-[9px] text-gray-500">runs</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[0, 20, 30, 40, 50, 60].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setManualRunCount(preset);
                        setUseClonedPlan(false);
                        setSeed(prev => prev + 1);
                      }}
                      className={`rounded-md px-2 py-0.5 text-[9px] font-medium transition ${
                        manualRunCount === preset
                          ? "border border-blue-500 bg-blue-500/20 text-blue-300"
                          : "border border-blue-500/20 bg-black text-gray-500 hover:text-blue-300"
                      }`}
                    >
                      {preset === 0 ? "Auto" : preset}
                    </button>
                  ))}
                </div>
                                {manualRunCount > 0 && (
                  <p className="mt-1 text-[9px] text-emerald-400/80">
                    ⚡ Manual mode active: Graph will curve while maintaining exact run count
                  </p>
                )}
              </div>

              <p className="text-[9px] text-blue-300/60 leading-relaxed">
                ℹ️ Higher minimum = fewer runs with more views each. Lower minimum = more runs with fewer views each.
              </p>
            </div>
          </div>

                             {/* 🔥 Draw Your Own Graph toggle + Lock Views button */}
          <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-950 to-black p-3 shadow-lg shadow-black/20">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-300">🎛 Pattern Tools</h3>
              <span className="text-[9px] text-gray-600">custom curve / lock views</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowDrawableGraph(!showDrawableGraph)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                showDrawableGraph
                  ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-300"
                  : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
              }`}
            >
              ✏️ {showDrawableGraph ? "Hide Custom Curve" : "Draw Custom Curve"}
            </button>

            {/* 🔥 Lock/Unlock Views button */}
            <button
              type="button"
              onClick={() => {
                if (isViewsLocked) {
                  // Unlock
                  setIsViewsLocked(false);
                  setLockedViews(null);
                } else {
                  // Lock current views
                  const currentViews = safePlan.runs.map(r => r.views);
                  if (currentViews.length > 0 && currentViews.some(v => v > 0)) {
                    setLockedViews(currentViews);
                    setIsViewsLocked(true);
                  }
                }
              }}
              disabled={safePlan.runs.length === 0}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                isViewsLocked
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "border-gray-600 bg-black text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30"
              }`}
            >
              {isViewsLocked ? "🔒 Views Locked" : "🔓 Lock Views"}
            </button>

            {isViewsLocked && (
              <span className="text-[9px] text-emerald-400">
                ✓ Views frozen — only engagement will change
              </span>
            )}

            {showDrawableGraph && !isViewsLocked && (
              <span className="text-[9px] text-gray-500">Drag handles to shape your delivery curve</span>
            )}
            </div>
          </div>
          
                    {/* Drawable Graph */}
          {showDrawableGraph && (
            <DrawableGraph
              totalViews={totalViews}
              runCount={safePlan.runs.length > 0 ? safePlan.runs.length : 30}
              minViewsPerRun={minViewsPerRun}
              onApply={(customViews) => {
                // 🔥 Store only the views shape — engagement will be added by the plan useMemo
                const now = new Date();
                const durationMin = (delivery.mode === "custom" ? customHours : delivery.hours) * 60;
                const startDelayMs = startDelayHours * 60 * 60_000;
                const intervalMs = (durationMin * 60_000) / Math.max(1, customViews.length - 1);

                // 🔥 Save custom views into config so createPatternPlan can use them
                setCustomDrawnViews(customViews);
                setUseCustomDrawnViews(true);
                setUseClonedPlan(false); // 🔥 Don't use cloned plan — let pattern engine add engagement
                setSeed(prev => prev + 1); // 🔥 Force regenerate with custom views
                setExpandedRuns(true);
                setShowDrawableGraph(false);
              }}
            />
          )}

          {/* Growth Graph - Compact */}
                              <GrowthGraph 
            plan={safePlan}
            selectedPreset={quickPreset}
            variancePercent={variancePercent}
            delivery={delivery}
            includeLikes={includeLikes}
            includeShares={includeShares}
            includeSaves={includeSaves}
            includeComments={includeComments}
            peakHoursBoost={peakHoursBoost}
            onApplyPreset={handleApplyPreset}
            onGenerate={handleGenerate}
                        onApplyFavourite={(config) => {
              // 🔥 Apply saved config settings
              if (config.delivery) {
                setDelivery(config.delivery);
                if (config.delivery.mode === "custom") {
                  setCustomHours(config.delivery.hours);
                }
              }

              if (typeof config.variancePercent === "number") {
                setVariancePercent(config.variancePercent);
              }

              setQuickPreset(config.quickPreset || null);
              setIncludeLikes(config.includeLikes ?? false);
              setIncludeShares(config.includeShares ?? false);
              setIncludeSaves(config.includeSaves ?? false);
              setIncludeComments(config.includeComments ?? false);
              setPeakHoursBoost(config.peakHoursBoost ?? false);

              // 🔥 Reconstruct exact same graph shape scaled to current totalViews
              if (config.runProportions && config.runProportions.length > 0) {
                const now = new Date();
                const currentViews = totalViews;

                // Calculate new totals scaled from saved proportions
                const savedLikesTotal = config.includeLikes
                  ? Math.max(10, Math.floor(currentViews * (config.savedTotalViews > 0 ? 0.025 : 0)))
                  : 0;
                const savedSharesTotal = config.includeShares
                  ? Math.max(20, Math.floor(currentViews * 0.015))
                  : 0;
                const savedSavesTotal = config.includeSaves
                  ? Math.max(10, Math.floor(currentViews * 0.0075))
                  : 0;
                const savedCommentsTotal = config.includeComments
                  ? Math.max(5, Math.floor(currentViews * 0.0002))
                  : 0;

                // 🔥 Rebuild runs using saved proportions scaled to current views
                let cumulativeViews = 0;
                let cumulativeLikes = 0;
                let cumulativeShares = 0;
                let cumulativeSaves = 0;
                let cumulativeComments = 0;

                const scaledRuns = config.runProportions.map((proportion, index) => {
                  const views = Math.max(1, Math.round(proportion.viewsFraction * currentViews));
                  const likes = Math.round(proportion.likesFraction * savedLikesTotal);
                  const shares = Math.round(proportion.sharesFraction * savedSharesTotal);
                  const saves = Math.round(proportion.savesFraction * savedSavesTotal);
                  const comments = Math.round(proportion.commentsFraction * savedCommentsTotal);

                  cumulativeViews += views;
                  cumulativeLikes += likes;
                  cumulativeShares += shares;
                  cumulativeSaves += saves;
                  cumulativeComments += comments;

                  const runTime = new Date(now.getTime() + proportion.minutesFromStart * 60_000);

                  return {
                    run: index + 1,
                    at: runTime,
                    minutesFromStart: proportion.minutesFromStart,
                    views,
                    likes,
                    shares,
                    saves,
                    comments,
                    cumulativeViews,
                    cumulativeLikes,
                    cumulativeShares,
                    cumulativeSaves,
                    cumulativeComments,
                  };
                });

                // 🔥 Build the restored plan
                const restoredPlan = {
                  patternId: Date.now() % 1000,
                  patternName: config.patternName,
                  patternType: config.patternType,
                  totalRuns: scaledRuns.length,
                  approximateIntervalMin: config.approximateIntervalMin || 0,
                  finishTime: scaledRuns[scaledRuns.length - 1]?.at ?? now,
                  estimatedDurationHours: config.estimatedDurationHours,
                  risk: config.risk,
                  runs: scaledRuns,
                };

                setClonedPlan(restoredPlan);
                setUseClonedPlan(true);
              } else {
                // Fallback: just regenerate with settings
                setUseClonedPlan(false);
                setSeed((current) => current + 1);
              }

              setExpandedRuns(true);
            }}
          />
        </div>

        {/* RIGHT COLUMN - Schedule Preview + Advanced Controls */}
        <div className="space-y-2">
          
          {/* Detection Risk - Inline */}
                    <div className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 via-black to-black px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎯</span>
              <span className="text-xs font-bold text-yellow-300">Risk:</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-yellow-400/50 bg-yellow-500/20 px-3 py-1 text-xs font-bold text-yellow-200 shadow-sm shadow-yellow-500/10">
                ⏱ {safePlan.estimatedDurationHours}h
              </span>
              <span className="rounded-md border border-gray-600 bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-200">
                {estimatedRunCount} runs
              </span>
              <span className={`rounded-md border px-2.5 py-1 text-xs font-bold shadow-sm ${
                safePlan.risk === "Safe"
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 shadow-emerald-500/10"
                  : safePlan.risk === "Medium"
                    ? "border-yellow-400/50 bg-yellow-500/20 text-yellow-300 shadow-yellow-500/10"
                    : "border-red-400/50 bg-red-500/20 text-red-300 shadow-red-500/10"
              }`}>
                {safePlan.risk}
              </span>
            </div>
          </div>

          {/* Schedule Preview */}
          <PatternGenerator
            plan={safePlan}
            expandedRuns={expandedRuns}
            onToggleRuns={() => setExpandedRuns((prev) => !prev)}
          />

          {/* Advanced Controls - Below Schedule Preview */}
          <div className="rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 shadow-lg shadow-black/30">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-yellow-500/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-yellow-300 tracking-wide">⚙️ Advanced Controls</h3>
                <p className="text-[10px] text-gray-500">Timing, delivery shape, and engagement configuration in one place.</p>
              </div>
              <span className="rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-300">
                {safePlan.totalRuns} runs
              </span>
            </div>
            
            {/* Row 1: Start Delay & Variance */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-semibold uppercase tracking-wide">Start Delay</label>
                <input
                  type="number"
                  value={startDelayHours}
                                    onChange={(e) => {
                    setUseClonedPlan(false);
                    const safeValue = Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0;
                    setStartDelayHours(Math.max(0, Math.min(168, safeValue)));
                  }}
                  min={0}
                  max={168}
                  step="0.1"
                  className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-300 mb-1 block font-semibold uppercase tracking-wide">Variance: {variancePercent}%</label>
                <input
                  type="range"
                  value={variancePercent}
                  onChange={(e) => {
                    setUseClonedPlan(false);
                    setVariancePercent(Number(e.target.value));
                  }}
                  min={0}
                  max={50}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
              </div>
            </div>

            {/* Row 2: Delivery Speed */}
            <div className="mb-3 rounded-xl border border-gray-800 bg-black/35 p-3">
              <label className="text-[10px] text-gray-300 mb-2 block font-semibold uppercase tracking-wide">Delivery Speed</label>
              <div className="flex gap-1 flex-wrap">
                {deliveryOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setUseClonedPlan(false);
                      setDelivery(option);
                    }}
                    className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                      delivery.label === option.label
                        ? "border border-yellow-500 bg-yellow-500/20 text-yellow-300"
                        : "border border-yellow-500/30 bg-gray-950 text-gray-400 hover:text-yellow-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {delivery.mode === "custom" && (
                <input
                  type="number"
                                    min={1}
                  max={672}
                  value={customHours}
                  onChange={(e) => {
                    setUseClonedPlan(false);
                    const safeHours = Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 1;
                    const clampedHours = Math.max(1, Math.min(672, safeHours));
                    setCustomHours(clampedHours);
                    setDelivery({ mode: "custom", label: "Custom", hours: clampedHours });
                  }}
                  
                  placeholder="Hours"
                  className="mt-1 w-20 rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
                />
              )}
            </div>

            {/* Engagement Controls - clearer grouped UI */}
            <div className="mt-3 rounded-xl border border-yellow-500/20 bg-black/40 p-3 shadow-inner shadow-yellow-500/5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-yellow-300">Engagement Stack</h4>
                  <p className="text-[9px] text-gray-500">Toggle services and tune ratios without hunting through one long row.</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* 🔥 FIX #7: audience-timezone picker */}
                  <select
                    value={audienceTimezone}
                    onChange={(e) => { setAudienceTimezone(e.target.value); setSeed((s) => s + 1); }}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-[10px] text-gray-300 focus:border-orange-500/40 focus:outline-none"
                    title="Audience timezone — controls the hour-of-day engagement curve."
                  >
                    <option value="">🌐 Browser TZ</option>
                    <option value="America/New_York">🇺🇸 New York</option>
                    <option value="America/Los_Angeles">🇺🇸 Los Angeles</option>
                    <option value="America/Chicago">🇺🇸 Chicago</option>
                    <option value="Europe/London">🇬🇧 London</option>
                    <option value="Europe/Berlin">🇩🇪 Berlin</option>
                    <option value="Europe/Paris">🇫🇷 Paris</option>
                    <option value="Asia/Kolkata">🇮🇳 India</option>
                    <option value="Asia/Dubai">🇦🇪 Dubai</option>
                    <option value="Asia/Singapore">🇸🇬 Singapore</option>
                    <option value="Asia/Tokyo">🇯🇵 Tokyo</option>
                    <option value="Asia/Shanghai">🇨🇳 Shanghai</option>
                    <option value="Australia/Sydney">🇦🇺 Sydney</option>
                    <option value="America/Sao_Paulo">🇧🇷 São Paulo</option>
                    <option value="UTC">🕒 UTC</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => { setPeakHoursBoost(!peakHoursBoost); }}
                    className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${
                      peakHoursBoost
                        ? "border-orange-400/60 bg-orange-500/20 text-orange-300 shadow-sm shadow-orange-500/10"
                        : "border-gray-700 bg-gray-950 text-gray-500 hover:border-orange-500/40 hover:text-orange-300"
                    }`}
                  >
                    🔥 Peak Hours {peakHoursBoost ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5 md:grid-cols-2">
                {/* Likes */}
                <div className={`rounded-xl border p-2.5 transition ${includeLikes ? "border-pink-500/40 bg-pink-500/10" : "border-gray-800 bg-gray-950/80"}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setIncludeLikes(!includeLikes)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        includeLikes
                          ? "border-pink-400/70 bg-pink-500/20 text-pink-200"
                          : "border-gray-700 bg-black text-gray-500 hover:text-pink-300"
                      }`}
                    >
                      ❤️ Likes {includeLikes ? "ON" : "OFF"}
                    </button>
                    <span className="rounded-md border border-pink-500/20 bg-black/50 px-2 py-0.5 text-[10px] text-pink-300">
                      ≈ {safePlan.runs.reduce((s, r) => s + r.likes, 0)}
                    </span>
                  </div>

                  {includeLikes && (
                    <div className="space-y-2">
                      {/* Mode toggle */}
                      <div className="flex rounded-lg border border-pink-500/20 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { setLikesMode("auto"); setSeed(prev => prev + 1); }}
                          className={`flex-1 px-2 py-1 text-[11px] font-semibold transition ${
                            likesMode === "auto"
                              ? "bg-pink-500/20 text-pink-200"
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          🎲 Auto
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLikesMode("manual"); setSeed(prev => prev + 1); }}
                          className={`flex-1 border-l border-pink-500/20 px-2 py-1 text-[11px] font-semibold transition ${
                            likesMode === "manual"
                              ? "bg-pink-500/20 text-pink-200"
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          ✏️ Manual
                        </button>
                      </div>

                      {likesMode === "auto" ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setLikesDistribution(prev => prev === "bracket" ? "even-spread" : "bracket");
                                setSeed(prev => prev + 1);
                              }}
                              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                                likesDistribution === "even-spread"
                                  ? "border-pink-400/70 bg-pink-500/20 text-pink-200"
                                  : "border-pink-500/30 bg-black text-pink-400/70"
                              }`}
                              title={likesDistribution === "bracket" ? "Likes at view milestones" : "Likes spread proportionally"}
                            >
                              {likesDistribution === "bracket" ? "📍 Milestone" : "🌊 Spread"}
                            </button>
                            <select
                              value={likesBoostPercent}
                              onChange={(e) => {
                                const currentViews = safePlan.runs.map(r => r.views);
                                if (currentViews.length > 0 && currentViews.some(v => v > 0)) {
                                  setLockedViews(currentViews);
                                  setIsViewsLocked(true);
                                }
                                setLikesBoostPercent(Number(e.target.value));
                              }}
                              className="rounded-lg border border-pink-500/30 bg-black px-2 py-1 text-[10px] font-semibold text-pink-200 focus:border-pink-500/60 focus:outline-none"
                            >
                              <option value={-75}>-75%</option>
                              <option value={-50}>-50%</option>
                              <option value={-25}>-25%</option>
                              <option value={0}>Default</option>
                              <option value={25}>+25%</option>
                              <option value={50}>+50%</option>
                              <option value={75}>+75%</option>
                              <option value={100}>+100%</option>
                              <option value={150}>+150%</option>
                              <option value={200}>+200%</option>
                              <option value={300}>+300%</option>
                              <option value={500}>+500%</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={minLikesOne}
                              onChange={(e) => { setMinLikesOne(e.target.checked); setSeed(prev => prev + 1); }}
                              className="accent-pink-500 h-3.5 w-3.5"
                            />
                            <span className="text-[11px] text-pink-300">Min 1 like per run (default min is 10)</span>
                          </label>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[10px] text-gray-400">
                              Total Likes
                              <input
                                type="number"
                                min={0}
                                value={manualTotalLikes}
                                onChange={(e) => {
                                  setManualTotalLikes(Math.max(0, parseInt(e.target.value || "0", 10) || 0));
                                  setSeed(prev => prev + 1);
                                }}
                                className="mt-1 w-full rounded-lg border border-pink-500/30 bg-black px-2 py-1 text-[11px] text-white focus:border-pink-500/60 focus:outline-none"
                              />
                            </label>
                            <label className="text-[10px] text-gray-400">
                              1 Like Every ~ Views
                              <input
                                type="number"
                                min={1}
                                step={50}
                                value={viewsPerLike}
                                onChange={(e) => {
                                  setViewsPerLike(Math.max(1, parseInt(e.target.value || "1", 10) || 1));
                                  setSeed(prev => prev + 1);
                                }}
                                className="mt-1 w-full rounded-lg border border-pink-500/30 bg-black px-2 py-1 text-[11px] text-white focus:border-pink-500/60 focus:outline-none"
                              />
                            </label>
                          </div>
                          <p className="text-[10px] text-gray-500">
                            Likes fire at milestones:{" "}
                            <b className="text-pink-400">
                              {Array.from({ length: Math.min(manualTotalLikes, 8) }, (_, i) =>
                                ((i + 1) * viewsPerLike).toLocaleString()
                              ).join(", ")}
                              {manualTotalLikes > 8 ? `, …` : ""}
                            </b>
                            . The first run crossing each gets 1 like. Other runs get 0.
                          </p>
                          <p className="text-[10px] text-pink-400/80">
                            {(() => {
                              const placed = safePlan.runs.reduce((s, r) => s + (r.likes || 0), 0);
                              const runCount = safePlan.runs.filter((r) => (r.likes || 0) > 0).length;
                              const dropped = manualTotalLikes - placed;
                              return (
                                <>
                                  <b>{runCount}</b> runs will carry likes.{" "}
                                  <b>{placed}</b> of <b>{manualTotalLikes}</b> placed.
                                  {dropped > 0 && (
                                    <span className="text-amber-400/80">{" "}<b>{dropped}</b> dropped (views didn’t reach).</span>
                                  )}
                                </>
                              );
                            })()}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Shares */}
                <div className={`rounded-xl border p-2.5 transition ${includeShares ? "border-blue-500/40 bg-blue-500/10" : "border-gray-800 bg-gray-950/80"}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => { setIncludeShares(!includeShares); }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        includeShares
                          ? "border-blue-400/70 bg-blue-500/20 text-blue-200"
                          : "border-gray-700 bg-black text-gray-500 hover:text-blue-300"
                      }`}
                    >
                      🔄 Shares {includeShares ? "ON" : "OFF"}
                    </button>
                    <span className="rounded-md border border-blue-500/20 bg-black/50 px-2 py-0.5 text-[10px] text-blue-300">
                      ≈ {safePlan.runs.reduce((s, r) => s + r.shares, 0)}
                    </span>
                  </div>

                  {includeShares && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {(["equal", "half", "third", "custom"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setSharesRatio(option);
                              setUseClonedPlan(false);
                              setSeed(prev => prev + 1);
                            }}
                            className={`rounded-md px-2 py-1 text-[9px] font-semibold transition ${
                              sharesRatio === option
                                ? "border border-blue-400 bg-blue-500/20 text-blue-200"
                                : "border border-blue-500/20 bg-black text-gray-500 hover:text-blue-300"
                            }`}
                          >
                            {option === "equal" ? "Viral" : option === "half" ? "Normal" : option === "third" ? "Tiny" : "Custom #"}
                          </button>
                        ))}
                        {sharesRatio === "custom" && (
                          <input
                            type="number"
                            value={sharesCustomCount}
                            onChange={(e) => {
                              setSharesCustomCount(Math.max(10, Number(e.target.value)));
                              setUseClonedPlan(false);
                              setSeed(prev => prev + 1);
                            }}
                            min={10}
                            className="w-20 rounded-md border border-blue-500/30 bg-black px-2 py-1 text-[10px] text-white focus:outline-none"
                          />
                        )}
                      </div>
                      <select
                        value={sharesBoostPercent}
                        onChange={(e) => {
                          setSharesBoostPercent(Number(e.target.value));
                          setUseClonedPlan(false);
                          setSeed(prev => prev + 1);
                        }}
                        className="w-full rounded-lg border border-blue-500/30 bg-black px-2 py-1.5 text-[10px] font-semibold text-blue-200 focus:border-blue-500/60 focus:outline-none"
                        title="Increase or reduce total shares"
                      >
                        <option value={-75}>Shares Very Low -75%</option>
                        <option value={-50}>Shares Low -50%</option>
                        <option value={-25}>Shares Soft -25%</option>
                        <option value={0}>Shares Default</option>
                        <option value={25}>Shares +25%</option>
                        <option value={50}>Shares +50%</option>
                        <option value={75}>Shares +75%</option>
                        <option value={100}>Shares +100%</option>
                        <option value={150}>Shares +150%</option>
                        <option value={200}>Shares +200%</option>
                        <option value={300}>Shares +300%</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setSharesAfterHalfLikes(prev => !prev);
                          setUseClonedPlan(false);
                          setSeed(prev => prev + 1);
                        }}
                        className={`w-full rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${
                          sharesAfterHalfLikes
                            ? "border-orange-400/70 bg-orange-500/20 text-orange-200"
                            : "border-gray-700 bg-black text-gray-500 hover:text-orange-300"
                        }`}
                        title="When enabled, shares start after roughly half of likes. Useful for short orders."
                      >
                        ⏱ After ½ Likes: {sharesAfterHalfLikes ? "ON" : "OFF"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Saves */}
                <div className={`rounded-xl border p-2.5 transition ${includeSaves ? "border-purple-500/40 bg-purple-500/10" : "border-gray-800 bg-gray-950/80"}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => { setIncludeSaves(!includeSaves); }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        includeSaves
                          ? "border-purple-400/70 bg-purple-500/20 text-purple-200"
                          : "border-gray-700 bg-black text-gray-500 hover:text-purple-300"
                      }`}
                    >
                      💾 Saves {includeSaves ? "ON" : "OFF"}
                    </button>
                    <span className="rounded-md border border-purple-500/20 bg-black/50 px-2 py-0.5 text-[10px] text-purple-300">
                      ≈ {safePlan.runs.reduce((s, r) => s + r.saves, 0)}
                    </span>
                  </div>
                  {includeSaves && (
                    <div className="flex flex-wrap gap-1.5">
                      {(["equal", "half", "third", "custom"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSavesRatio(option);
                            setUseClonedPlan(false);
                            setSeed(prev => prev + 1);
                          }}
                          className={`rounded-md px-2 py-1 text-[9px] font-semibold transition ${
                            savesRatio === option
                              ? "border border-purple-400 bg-purple-500/20 text-purple-200"
                              : "border border-purple-500/20 bg-black text-gray-500 hover:text-purple-300"
                          }`}
                        >
                          {option === "equal" ? "Viral" : option === "half" ? "Normal" : option === "third" ? "Tiny" : "Custom #"}
                        </button>
                      ))}
                      {savesRatio === "custom" && (
                        <input
                          type="number"
                          value={savesCustomCount}
                          onChange={(e) => {
                            setSavesCustomCount(Math.max(10, Number(e.target.value)));
                            setUseClonedPlan(false);
                            setSeed(prev => prev + 1);
                          }}
                          min={10}
                          className="w-20 rounded-md border border-purple-500/30 bg-black px-2 py-1 text-[10px] text-white focus:outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className={`rounded-xl border p-2.5 transition ${includeComments ? "border-pink-500/40 bg-pink-500/10" : "border-gray-800 bg-gray-950/80"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => { setIncludeComments(!includeComments); }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        includeComments
                          ? "border-pink-400/70 bg-pink-500/20 text-pink-200"
                          : "border-gray-700 bg-black text-gray-500 hover:text-pink-300"
                      }`}
                    >
                      💬 Comments {includeComments ? "ON" : "OFF"}
                    </button>
                    <span className="rounded-md border border-pink-500/20 bg-black/50 px-2 py-0.5 text-[10px] text-pink-300">
                      ≈ {safePlan.runs.reduce((s, r) => s + r.comments, 0)}
                    </span>
                  </div>
                  <p className="mt-2 text-[9px] text-gray-500">Uses the comment box below. More unique comments = safer delivery.</p>
                </div>

                {/* Reposts */}
                <div className={`rounded-xl border p-2.5 transition md:col-span-2 ${includeReposts ? "border-cyan-500/40 bg-cyan-500/10" : "border-gray-800 bg-gray-950/80"}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => { setIncludeReposts(!includeReposts); }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        includeReposts
                          ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-200"
                          : "border-gray-700 bg-black text-gray-500 hover:text-cyan-300"
                      }`}
                    >
                      🔁 Reposts {includeReposts ? "ON" : "OFF"}
                    </button>
                    <span className="rounded-md border border-cyan-500/20 bg-black/50 px-2 py-0.5 text-[10px] text-cyan-300">
                      ≈ {safePlan.runs.reduce((s, r) => s + (r.reposts || 0), 0)}
                    </span>
                  </div>
                  {includeReposts && (
                    <div className="flex flex-wrap gap-1.5">
                      {(["equal", "half", "third", "custom"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setRepostsRatio(option);
                            setSeed(prev => prev + 1);
                          }}
                          className={`rounded-md px-2 py-1 text-[9px] font-semibold transition ${
                            repostsRatio === option
                              ? "border border-cyan-400 bg-cyan-500/20 text-cyan-200"
                              : "border border-cyan-500/20 bg-black text-gray-500 hover:text-cyan-300"
                          }`}
                        >
                          {option === "equal" ? "Viral" : option === "half" ? "Normal" : option === "third" ? "Tiny" : "Custom #"}
                        </button>
                      ))}
                      {repostsRatio === "custom" && (
                        <input
                          type="number"
                          value={repostsCustomCount}
                          onChange={(e) => {
                            setRepostsCustomCount(Math.max(10, Number(e.target.value)));
                            setSeed(prev => prev + 1);
                          }}
                          min={10}
                          className="w-20 rounded-md border border-cyan-500/30 bg-black px-2 py-1 text-[10px] text-white focus:outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
<div className="mt-2 rounded-xl border border-yellow-500/20 bg-gradient-to-br from-gray-950 to-black p-3">
  <div className="mb-2 flex items-center justify-between gap-2">
    <label className="text-[10px] text-gray-300 font-semibold uppercase tracking-wide">
      💬 Custom Comments
    </label>
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-gray-600">one per line</span>
      {/* 🔥 FIX #16: load a niche comment pack into the textarea */}
      <select
        value=""
        onChange={(e) => {
          const packId = e.target.value;
          if (!packId) return;
          // Default to 25 comments — user can edit/trim afterwards.
          const lines = pickComments(packId, 25, seed || Date.now());
          // Append or replace? If textarea is empty, replace; else append.
          setCustomComments((prev) =>
            (prev.trim() ? prev.trim() + "\n" : "") + lines.join("\n")
          );
          // Force the <select> to reset so the same option can be re-picked
          e.currentTarget.selectedIndex = 0;
        }}
        className="rounded-md border border-yellow-500/30 bg-black px-1.5 py-1 text-[10px] text-yellow-300 focus:outline-none"
        title="Load a niche-appropriate comment pack into the textarea."
      >
        <option value="">📦 Load pack…</option>
        {COMMENT_PACKS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.emoji} {p.label}
          </option>
        ))}
      </select>
    </div>
  </div>
  <textarea
    value={customComments}
    onChange={(e) => setCustomComments(e.target.value)}
    rows={3}
    placeholder={"Nice post!\n🔥🔥\nAmazing"}
    className="w-full rounded-lg border border-yellow-500/30 bg-black px-3 py-2 text-xs text-white placeholder-gray-700 outline-none focus:border-yellow-500/60"
  />
</div>

{/* 🔥 NEW: View-bracket engagement rules.
    Off by default. When ON, every run whose `views` falls inside a defined
    bracket gets its enabled-service counts forced into the range. Saved to
    localStorage so the user doesn't have to re-enter them. */}
<div className={`mt-2 rounded-xl border p-3 transition ${
  engagementRulesEnabled
    ? "border-cyan-500/40 bg-cyan-500/5"
    : "border-gray-800 bg-gray-950/80"
}`}>
  <div className="flex items-center justify-between gap-2">
    <button
      type="button"
      onClick={() => setRulesPanelOpen((v) => !v)}
      className="flex items-center gap-2 text-left"
    >
      <span className={`text-[11px] font-bold uppercase tracking-wider ${
        engagementRulesEnabled ? "text-cyan-300" : "text-gray-400"
      }`}>
        🎯 View-Range Engagement Rules
      </span>
      <span className="text-[10px] text-gray-500">
        {rulesPanelOpen ? "▲ collapse" : "▼ expand"}
      </span>
      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
        engagementRulesEnabled
          ? "bg-cyan-500/30 text-cyan-200"
          : "bg-gray-800 text-gray-500"
      }`}>
        {engagementRulesEnabled ? "ON" : "OFF"}
      </span>
    </button>
    <label className="flex cursor-pointer items-center gap-1.5 select-none">
      <span className="text-[10px] text-gray-400">Apply</span>
      <input
        type="checkbox"
        checked={engagementRulesEnabled}
        onChange={(e) => setEngagementRulesEnabled(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer accent-cyan-500"
      />
    </label>
  </div>

  {!rulesPanelOpen && (
    <p className="mt-1 text-[9px] text-gray-500">
      Force each run into a specific likes/shares range based on its view count.
      e.g. <span className="text-gray-400">runs with 100-200 views get 10-15 likes &amp; 10-12 shares</span>.
      Settings are saved automatically.
    </p>
  )}

  {rulesPanelOpen && (
    <div className="mt-3 space-y-2">
      <p className="text-[9px] leading-relaxed text-gray-500">
        Each row defines a view-count bracket. A run's per-service count is
        clamped into the [min, max] range <strong>only for services with the
        green check</strong>. Runs whose views fall outside every bracket use
        the normal automatic logic. Settings persist across orders.
      </p>

      {/* Rule rows */}
      <div className="space-y-1.5">
        {engagementRules.map((rule, idx) => (
          <div key={rule.id} className="rounded-lg border border-gray-800 bg-black/40 p-2">
            {/* Views range */}
            <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-gray-400">Views</span>
              <input
                type="number"
                min={1}
                value={rule.viewsMin}
                onChange={(e) => {
                  const v = Math.max(1, parseInt(e.target.value || "0", 10) || 0);
                  setEngagementRules((prev) => prev.map((r, i) =>
                    i === idx ? { ...r, viewsMin: v } : r
                  ));
                }}
                className="w-16 rounded-md border border-gray-700 bg-gray-950 px-1.5 py-0.5 text-[10px] text-white focus:border-cyan-500/60 focus:outline-none"
              />
              <span className="text-[10px] text-gray-500">to</span>
              <input
                type="number"
                min={1}
                value={rule.viewsMax}
                onChange={(e) => {
                  const v = Math.max(1, parseInt(e.target.value || "0", 10) || 0);
                  setEngagementRules((prev) => prev.map((r, i) =>
                    i === idx ? { ...r, viewsMax: v } : r
                  ));
                }}
                className="w-16 rounded-md border border-gray-700 bg-gray-950 px-1.5 py-0.5 text-[10px] text-white focus:border-cyan-500/60 focus:outline-none"
              />
              <span className="ml-auto flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEngagementRules((prev) => {
                      const last = prev[prev.length - 1];
                      const copy = { ...rule, id: `rule-${Date.now()}-${Math.random().toString(36).slice(2,6)}` };
                      // Place after the source row
                      const next = [...prev];
                      next.splice(idx + 1, 0, copy);
                      void last;
                      return next;
                    });
                  }}
                  className="rounded border border-gray-700 px-1.5 py-0.5 text-[9px] text-gray-400 hover:border-cyan-500/60 hover:text-cyan-300"
                  title="Duplicate this rule"
                >📋</button>
                <button
                  type="button"
                  onClick={() => {
                    setEngagementRules((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  className="rounded border border-gray-700 px-1.5 py-0.5 text-[9px] text-gray-400 hover:border-red-500/60 hover:text-red-300"
                  title="Delete this rule"
                >🗑</button>
              </span>
            </div>

            {/* Service rows */}
            <div className="grid gap-1 text-[10px]">
              {(["likes","shares","saves","comments","reposts"] as const).map((svc) => {
                const range = rule[svc];
                const emoji = { likes: "❤️", shares: "🔄", saves: "🔖", comments: "💬", reposts: "📣" }[svc];
                return (
                  <div key={svc} className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${
                    range.enabled ? "bg-cyan-500/10" : "bg-gray-900/50"
                  }`}>
                    <label className="flex w-16 cursor-pointer items-center gap-1">
                      <input
                        type="checkbox"
                        checked={range.enabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setEngagementRules((prev) => prev.map((r, i) =>
                            i === idx ? { ...r, [svc]: { ...r[svc], enabled } } : r
                          ));
                        }}
                        className="h-3 w-3 cursor-pointer accent-cyan-500"
                      />
                      <span className={range.enabled ? "text-white" : "text-gray-600"}>{emoji} {svc.slice(0, 4)}</span>
                    </label>
                    <input
                      type="number"
                      min={10}
                      disabled={!range.enabled}
                      value={range.min}
                      onChange={(e) => {
                        const v = Math.max(10, parseInt(e.target.value || "10", 10) || 10);
                        setEngagementRules((prev) => prev.map((r, i) =>
                          i === idx ? { ...r, [svc]: { ...r[svc], min: v } } : r
                        ));
                      }}
                      className="w-14 rounded border border-gray-700 bg-gray-950 px-1.5 py-0.5 text-white disabled:opacity-30 focus:border-cyan-500/60 focus:outline-none"
                    />
                    <span className="text-gray-600">-</span>
                    <input
                      type="number"
                      min={10}
                      disabled={!range.enabled}
                      value={range.max}
                      onChange={(e) => {
                        const v = Math.max(range.min, parseInt(e.target.value || "10", 10) || 10);
                        setEngagementRules((prev) => prev.map((r, i) =>
                          i === idx ? { ...r, [svc]: { ...r[svc], max: v } } : r
                        ));
                      }}
                      className="w-14 rounded border border-gray-700 bg-gray-950 px-1.5 py-0.5 text-white disabled:opacity-30 focus:border-cyan-500/60 focus:outline-none"
                    />
                    <span className={`ml-auto text-[9px] ${range.enabled ? "text-cyan-400" : "text-gray-700"}`}>
                      {range.enabled ? "force" : "auto"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add row + reset */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            setEngagementRules((prev) => {
              const last = prev[prev.length - 1];
              const nextMin = last ? Math.max(last.viewsMax + 1, 100) : 100;
              const nextMax = nextMin + 100;
              return [...prev, {
                ...{
                  id: `rule-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                  viewsMin: nextMin, viewsMax: nextMax,
                  likes:    { enabled: true,  min: 10, max: 15 },
                  shares:   { enabled: true,  min: 10, max: 12 },
                  saves:    { enabled: false, min: 10, max: 12 },
                  comments: { enabled: false, min: 10, max: 12 },
                  reposts:  { enabled: false, min: 10, max: 12 },
                }
              }];
            });
          }}
          className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/20"
        >
          + Add view-range rule
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("Reset all view-range rules to the default 3-bracket setup?")) return;
            setEngagementRules([
              { id: `rule-${Date.now()}-a`, viewsMin: 100, viewsMax: 200,
                likes: { enabled: true, min: 10, max: 15 },
                shares: { enabled: true, min: 10, max: 12 },
                saves: { enabled: false, min: 10, max: 12 },
                comments: { enabled: false, min: 10, max: 12 },
                reposts: { enabled: false, min: 10, max: 12 } },
              { id: `rule-${Date.now()}-b`, viewsMin: 201, viewsMax: 300,
                likes: { enabled: true, min: 15, max: 20 },
                shares: { enabled: true, min: 12, max: 15 },
                saves: { enabled: false, min: 10, max: 12 },
                comments: { enabled: false, min: 10, max: 12 },
                reposts: { enabled: false, min: 10, max: 12 } },
              { id: `rule-${Date.now()}-c`, viewsMin: 301, viewsMax: 500,
                likes: { enabled: true, min: 20, max: 30 },
                shares: { enabled: true, min: 15, max: 20 },
                saves: { enabled: false, min: 10, max: 12 },
                comments: { enabled: false, min: 10, max: 12 },
                reposts: { enabled: false, min: 10, max: 12 } },
            ]);
          }}
          className="rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-[10px] text-gray-400 hover:border-red-500/40 hover:text-red-300"
        >
          ↺ Reset to defaults
        </button>
      </div>

      {/* Coverage hint */}
      <p className="text-[9px] text-gray-600 pt-1">
        💡 Tip: runs whose views fall outside every bracket above use the normal
        automatic engagement logic. Rules also work in concert with the boost
        sliders &amp; ratio toggles above.
      </p>
    </div>
  )}
</div>

{/* 🔥 NEW: Sub-Likes toggle.
    Single-button panel. ON = likes runs with qty <= threshold get split
    into 5-10 sub-runs of 1-3 likes each, spaced 4-5 min apart, routed to
    the bundle's `likesPremium` service. */}
<div className={`mt-2 rounded-xl border p-3 transition ${
  subLikesEnabled ? "border-emerald-500/40 bg-emerald-500/5" : "border-gray-800 bg-gray-950/80"
}`}>
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <span className={`text-[11px] font-bold uppercase tracking-wider ${
        subLikesEnabled ? "text-emerald-300" : "text-gray-400"
      }`}>
        🪶 Sub-Likes Drip Mode
      </span>
      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
        subLikesEnabled ? "bg-emerald-500/30 text-emerald-200" : "bg-gray-800 text-gray-500"
      }`}>
        {subLikesEnabled ? "ON" : "OFF"}
      </span>
    </div>
    <button
      type="button"
      onClick={() => setSubLikesEnabled(!subLikesEnabled)}
      className={`rounded-md border px-3 py-1 text-[10px] font-semibold transition ${
        subLikesEnabled
          ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
          : "border-gray-700 bg-gray-900 text-gray-400 hover:border-emerald-500/40 hover:text-emerald-300"
      }`}
    >
      {subLikesEnabled ? "Turn OFF" : "Turn ON"}
    </button>
  </div>
  <p className="mt-1 text-[9px] text-gray-500">
    When ON: likes runs with ≤ {subLikesThreshold} likes are split into 5-10 tiny
    drips (1-3 likes each, 4-5 min apart) and sent through the bundle's
    <strong className="text-emerald-300"> Likes (min=1)</strong> service.
    Larger likes runs use the normal Likes service. <br/>
    {subLikesEnabled && !selectedBundleId && (
      <span className="text-amber-300">⚠ Pick a bundle first.</span>
    )}
    {subLikesEnabled && selectedBundleId && (() => {
      const b = bundles.find(x => x.id === selectedBundleId);
      const hasPremium = b && b.serviceIds.likesPremium;
      if (!hasPremium) {
        return <span className="text-red-400">⚠ Selected bundle has no "Likes (min=1)" service. Add one in the Bundles page first.</span>;
      }
      return <span className="text-emerald-300">✓ Bundle has a Likes (min=1) service. Sub-likes will be routed to it.</span>;
    })()}
  </p>
  {subLikesEnabled && (
    <div className="mt-2 flex items-center gap-2 text-[10px]">
      <span className="text-gray-400">Threshold</span>
      <input
        type="range"
        min={5}
        max={50}
        step={1}
        value={subLikesThreshold}
        onChange={(e) => setSubLikesThreshold(Math.max(5, parseInt(e.target.value, 10) || 20))}
        className="flex-1 accent-emerald-500"
      />
      <span className="w-28 text-right">runs ≤ <strong className="text-emerald-300">{subLikesThreshold}</strong> likes</span>
    </div>
  )}
</div>

          {/* Price Calculator - Compact Horizontal */}
          {selectedBundleId && safePlan.runs.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-black p-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-yellow-400">💰</span>
                
                {/* Price Items */}
                <div className="flex items-center gap-1 flex-wrap flex-1">
                                    {(() => {
                    const selectedBundle = bundles.find(b => b.id === selectedBundleId);
                    if (!selectedBundle) return null;

                                       // 🔥 Per-service API lookup — respects multi-API bundles
                    const getServiceForType = (type: 'views' | 'likes' | 'shares' | 'saves' | 'comments') => {
                      const overrideApiId = selectedBundle.serviceApis?.[type];
                      const apiId = overrideApiId || selectedBundle.apiId || selectedApiId;
                      const api = apis.find(a => a.id === apiId);
                      const serviceId = selectedBundle.serviceIds[type];
                      return { service: api?.services.find(s => s.id === serviceId) || null, api };
                    };

                                       // 🔥 Currency conversion: yoyomedia.in charges in USD, everything else in INR
                    const USD_TO_INR = getUsdToInrRate();
                    const getRateInINR = (serviceInfo: ReturnType<typeof getServiceForType>) => {
                      const rawRate = parseFloat(serviceInfo.service?.rate || "0");
                      const apiUrl = serviceInfo.api?.url || "";
                      const isUSD = apiUrl.toLowerCase().includes("yoyomedia");
                      return isUSD ? rawRate * USD_TO_INR : rawRate;
                    };

                    const viewsInfo = getServiceForType('views');
                    const likesInfo = getServiceForType('likes');
                    const sharesInfo = getServiceForType('shares');
                    const savesInfo = getServiceForType('saves');
                    const commentsInfo = getServiceForType('comments');

                    const totalViewsQty = safePlan.runs.reduce((sum, run) => sum + (run.views || 0), 0);
                    const totalLikesQty = safePlan.runs.reduce((sum, run) => sum + (run.likes || 0), 0);
                    const totalSharesQty = safePlan.runs.reduce((sum, run) => sum + (run.shares || 0), 0);
                    const totalSavesQty = safePlan.runs.reduce((sum, run) => sum + (run.saves || 0), 0);
                    const totalCommentsQty = safePlan.runs.reduce((sum, run) => sum + (run.comments || 0), 0);

                    const viewsRate = getRateInINR(viewsInfo);
                    const likesRate = getRateInINR(likesInfo);
                    const sharesRate = getRateInINR(sharesInfo);
                    const savesRate = getRateInINR(savesInfo);
                    const commentsRate = getRateInINR(commentsInfo);

                    const viewsPrice = (totalViewsQty / 1000) * viewsRate;
                    const likesPrice = includeLikes ? (totalLikesQty / 1000) * likesRate : 0;
                    const sharesPrice = includeShares ? (totalSharesQty / 1000) * sharesRate : 0;
                    const savesPrice = includeSaves ? (totalSavesQty / 1000) * savesRate : 0;
                    const commentsPrice = includeComments ? (totalCommentsQty / 1000) * commentsRate : 0;

                    return (
                      <>
                        <span className="text-[10px] text-gray-400">👁️{(totalViewsQty/1000).toFixed(0)}k=₹{formatPrice(viewsPrice)}</span>
                        {includeLikes && totalLikesQty > 0 && (
                          <span className="text-[10px] text-gray-400">❤️{(totalLikesQty/1000).toFixed(1)}k=₹{formatPrice(likesPrice)}</span>
                        )}
                        {includeShares && totalSharesQty > 0 && (
                          <span className="text-[10px] text-gray-400">🔄{(totalSharesQty/1000).toFixed(1)}k=₹{formatPrice(sharesPrice)}</span>
                        )}
                        {includeSaves && totalSavesQty > 0 && (
                          <span className="text-[10px] text-gray-400">💾{(totalSavesQty/1000).toFixed(1)}k=₹{formatPrice(savesPrice)}</span>                        )}
                        {includeComments && totalCommentsQty > 0 && (
                          <span className="text-[10px] text-gray-400">
                            💬{(totalCommentsQty/1000).toFixed(1)}k=₹{formatPrice(commentsPrice)}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                
                {/* Total */}
                                <div className="rounded-md border border-yellow-400/60 bg-yellow-500/20 px-3 py-1.5 shadow-sm shadow-yellow-500/10">
                  <span className="text-sm font-bold text-yellow-200">
                                        ₹{(() => {
                      const selectedBundle = bundles.find(b => b.id === selectedBundleId);
                      if (!selectedBundle) return "0";

                                           // 🔥 Per-service API lookup — respects multi-API bundles
                      const getServiceForType = (type: 'views' | 'likes' | 'shares' | 'saves' | 'comments') => {
                        const overrideApiId = selectedBundle.serviceApis?.[type];
                        const apiId = overrideApiId || selectedBundle.apiId || selectedApiId;
                        const api = apis.find(a => a.id === apiId);
                        const serviceId = selectedBundle.serviceIds[type];
                        return { service: api?.services.find(s => s.id === serviceId) || null, api };
                      };

                                           // 🔥 Currency conversion: yoyomedia.in charges in USD, everything else in INR
                      const USD_TO_INR = getUsdToInrRate();
                      const getRateInINR = (serviceInfo: ReturnType<typeof getServiceForType>) => {
                        const rawRate = parseFloat(serviceInfo.service?.rate || "0");
                        const apiUrl = serviceInfo.api?.url || "";
                        const isUSD = apiUrl.toLowerCase().includes("yoyomedia");
                        return isUSD ? rawRate * USD_TO_INR : rawRate;
                      };

                      const viewsInfo = getServiceForType('views');
                      const likesInfo = getServiceForType('likes');
                      const sharesInfo = getServiceForType('shares');
                      const savesInfo = getServiceForType('saves');
                      const commentsInfo = getServiceForType('comments');

                      const totalViewsQty = safePlan.runs.reduce((sum, run) => sum + (run.views || 0), 0);
                      const totalLikesQty = safePlan.runs.reduce((sum, run) => sum + (run.likes || 0), 0);
                      const totalSharesQty = safePlan.runs.reduce((sum, run) => sum + (run.shares || 0), 0);
                      const totalSavesQty = safePlan.runs.reduce((sum, run) => sum + (run.saves || 0), 0);
                      const totalCommentsQty = safePlan.runs.reduce((sum, run) => sum + (run.comments || 0), 0);

                      const viewsPrice = (totalViewsQty / 1000) * getRateInINR(viewsInfo);
                      const likesPrice = includeLikes ? (totalLikesQty / 1000) * getRateInINR(likesInfo) : 0;
                      const sharesPrice = includeShares ? (totalSharesQty / 1000) * getRateInINR(sharesInfo) : 0;
                      const savesPrice = includeSaves ? (totalSavesQty / 1000) * getRateInINR(savesInfo) : 0;
                      const commentsPrice = includeComments ? (totalCommentsQty / 1000) * getRateInINR(commentsInfo) : 0;

                      return formatPrice(viewsPrice + likesPrice + sharesPrice + savesPrice + commentsPrice);
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

            {/* Deploy Button - Full Width Bottom */}
      <div className="rounded-lg border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black px-3 py-2 space-y-2">

        {/* Countdown bar — shown only during countdown */}
        {deployCountdown !== null && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-yellow-400 font-medium">
                ⏳ Deploying in {deployCountdown}s...
                {deployReady && (
                  <span className="ml-2 text-emerald-400">✓ You can deploy now</span>
                )}
              </span>
              <button
                type="button"
                onClick={handleCancelDeploy}
                className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/20 transition"
              >
                🚫 Cancel Deploy
              </button>
            </div>
            {/* Progress bar — drains from full to empty */}
            <div className="h-1 w-full rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear bg-yellow-500"
                style={{ width: `${(deployCountdown / 15) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {createError && <span className="text-[10px] text-red-400">❌ {createError}</span>}
            {createSuccess && <span className="text-[10px] text-emerald-400">✅ {createSuccess}</span>}
                       {!createError && !createSuccess && deployCountdown === null && (
              <span className="text-[10px] text-gray-300 font-medium">
                Ready to deploy • {estimatedRunCount} runs • ~{averageViewsPerRun} views/run
              </span>
            )}
            {deployCountdown !== null && !deployReady && (
              <span className="text-[10px] text-gray-500">
                Check details one more time before it deploys...
              </span>
            )}
            {deployCountdown !== null && deployReady && (
              <span className="text-[10px] text-yellow-400">
                Click Deploy Now to send immediately
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Main deploy button — changes based on state */}
            {deployCountdown === null ? (
              // Initial state: click to start countdown
              <button
                type="button"
                disabled={isCreatingOrder}
                onClick={handleDeployClick}
                className="whitespace-nowrap rounded-lg border border-yellow-500/50 bg-yellow-500/20 px-4 py-1.5 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingOrder ? "Deploying..." : "🦇 Deploy"}
              </button>
            ) : (
              // Countdown active: show Deploy Now button (enabled after 3 sec)
              <button
                type="button"
                disabled={!deployReady || isCreatingOrder}
                onClick={async () => {
                  // Stop countdown
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  setDeployCountdown(null);
                  setDeployReady(false);

                  // Run the actual deploy logic
                  setCreateError("");
                  setCreateSuccess("");
                  if (!selectedBundleId) {
                    setCreateError("Select a bundle before creating a mission.");
                    return;
                  }
                  const bulkTargets = bulkLinks
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean);
                  const singleTarget = postUrl.trim();
                  const targets = bulkTargets.length > 0 ? bulkTargets : singleTarget ? [singleTarget] : [];
                  if (!targets.length) {
                    setCreateError("Add a post URL or paste multiple links.");
                    return;
                  }
                  const invalidTarget = targets.find((target) => !isValidUrl(target));
                  if (invalidTarget) {
                    setCreateError(`Invalid URL: ${invalidTarget.slice(0, 30)}...`);
                    return;
                  }
                  const selectedApi = apis.find((api) => api.id === selectedApiId) ?? null;
                  if (!selectedApi) { setCreateError("Select an API."); return; }
                  if (!selectedApi.url.trim()) { setCreateError("API URL is required."); return; }
                  if (!isValidUrl(selectedApi.url.trim())) { setCreateError("API URL must be valid."); return; }
                  if (!selectedApi.key.trim()) { setCreateError("API key is required."); return; }
                  const selectedBundle = bundles.find((bundle) => bundle.id === selectedBundleId);
                  if (!selectedBundle) { setCreateError("Select a valid bundle."); return; }
                  const viewsServiceId = selectedBundle.serviceIds.views.trim();
                  if (!viewsServiceId) { setCreateError("Bundle has no Views service."); return; }
                  const likesServiceId = selectedBundle.serviceIds.likes.trim();
                  const sharesServiceId = selectedBundle.serviceIds.shares.trim();
                  const savesServiceId = selectedBundle.serviceIds.saves.trim();
                  if (includeLikes && !likesServiceId) { setCreateError("Bundle has no Likes service."); return; }
                  if (includeShares && !sharesServiceId) { setCreateError("Bundle has no Shares service."); return; }
                  if (includeSaves && !savesServiceId) { setCreateError("Bundle has no Saves service."); return; }
                  const commentsServiceId = selectedBundle.serviceIds.comments?.trim();
                  if (includeComments && !commentsServiceId) { setCreateError("Bundle has no Comments service."); return; }
                  const quantity = (safePlan?.runs || []).reduce((acc, run) => acc + run.views, 0);
                  if (!Number.isFinite(quantity) || quantity <= 0) { setCreateError("Quantity must be > 0."); return; }
                  if (quantity < effectiveMinViews) { setCreateError(`Views must be at least ${effectiveMinViews}.`); return; }
                  const totalLikes = (safePlan?.runs || []).reduce((acc, run) => acc + run.likes, 0);
                  const totalShares = (safePlan?.runs || []).reduce((acc, run) => acc + run.shares, 0);
                  const totalSaves = (safePlan?.runs || []).reduce((acc, run) => acc + run.saves, 0);
                                   const totalCommentsQty = (safePlan?.runs || []).reduce((acc, run) => acc + (run.comments || 0), 0);
                  const totalRepostsQty = (safePlan?.runs || []).reduce((acc, run) => acc + (run.reposts || 0), 0);
                  const minTotalLikes = minLikesOne ? 1 : 10;
                  if (includeLikes && likesMode === "auto" && totalLikes < minTotalLikes) { setCreateError(`Likes must be at least ${minTotalLikes}.`); return; }
                  if (includeShares && totalShares < 10) { setCreateError("Shares must be at least 10."); return; }
                  if (includeSaves && totalSaves < 10) { setCreateError("Saves must be at least 10."); return; }
                  if (includeComments && totalCommentsQty <= 0) { setCreateError("Comments must be greater than 0."); return; }
                  if (quantity > 100000) { const proceed = window.confirm("Large mission. Continue?"); if (!proceed) return; }
                  // 🔥 Rotating views service IDs
                  const viewsServiceIds = selectedBundle.serviceIds.viewsServiceIds?.filter(Boolean) || [selectedBundle.serviceIds.views];
                  const viewRuns = (safePlan?.runs || []).map((run, i) => ({
                    time: run.at.toISOString(),
                    quantity: Math.max(Math.floor(run.views), effectiveMinViews),
                    serviceIdOverride: viewsServiceIds[i % viewsServiceIds.length],
                  }));
                  if (!viewRuns.length || viewRuns.some((run) => !run.time || !Number.isFinite(run.quantity) || run.quantity <= 0)) { setCreateError("Invalid run schedule. Regenerate."); return; }
                  // 🔥 NEW: build likes payload — for runs with `likesSubRuns`,
                  // emit ONE entry PER sub-run (each with the premium service override).
                  // For runs without sub-runs, emit a single entry as before.
                  const premiumApiId = selectedBundle.serviceApis?.likesPremium || selectedBundle.apiId;
                  const premiumApi = apis.find((a) => a.id === premiumApiId);
                  const premiumServiceId = selectedBundle.serviceIds.likesPremium || "";
                  const premiumService = premiumApi?.services.find((s) => s.id === premiumServiceId);
                  const subLikesReady = Boolean(subLikesEnabled && premiumApi && premiumService);

                  const likesRuns: Array<{
                    time: string;
                    quantity: number;
                    serviceIdOverride?: string;
                    apiUrlOverride?: string;
                    apiKeyOverride?: string;
                    serviceMinOverride?: number;
                  }> = [];
                  for (const r of (safePlan?.runs || [])) {
                    const parentQty = Math.max(0, Math.floor(r.likes));
                    if (subLikesReady && Array.isArray(r.likesSubRuns) && r.likesSubRuns.length >= 2) {
                      for (const sub of r.likesSubRuns) {
                        likesRuns.push({
                          time: sub.at.toISOString(),
                          quantity: Math.max(1, Math.floor(sub.quantity)),
                          serviceIdOverride: premiumService!.id,
                          apiUrlOverride: premiumApi!.url,
                          apiKeyOverride: premiumApi!.key,
                          serviceMinOverride: premiumService!.min || 1,
                        });
                      }
                    } else {
                      likesRuns.push({ time: r.at.toISOString(), quantity: parentQty });
                    }
                  }
                  const sharesRuns = (safePlan?.runs || []).map((run) => ({ time: run.at.toISOString(), quantity: Math.max(0, Math.floor(run.shares)) }));
                  const savesRuns = (safePlan?.runs || []).map((run) => ({ time: run.at.toISOString(), quantity: Math.max(0, Math.floor(run.saves)) }));
                  const commentList = customComments.split("\n").map(c => c.trim()).filter(Boolean);
                  const commentsRuns = (safePlan?.runs || []).map((run) => {
                    const required = Math.floor(run.comments || 0);
                    if (required <= 0) return { time: run.at.toISOString(), comments: "" };
                    let finalComments: string[] = [];
                    if (commentList.length === 0) { finalComments = Array.from({ length: required }, () => "Nice post"); }
                    else if (commentList.length >= required) { finalComments = commentList.slice(0, required); }
                    else { while (finalComments.length < required) { finalComments.push(commentList[finalComments.length % commentList.length]); } }
                    return { time: run.at.toISOString(), comments: finalComments.join("\n") };
                  });
                  const filteredCommentsRuns = commentsRuns.filter(run => run.comments && run.comments.length > 0);
                              // 🔥 Resolve per-service API credentials
            const getServiceApi = (serviceType: 'views' | 'likes' | 'shares' | 'saves' | 'comments') => {
              const overrideApiId = selectedBundle?.serviceApis?.[serviceType];
              if (overrideApiId && overrideApiId !== selectedApiId) {
                const overrideApi = apis.find(a => a.id === overrideApiId);
                if (overrideApi) return { apiUrl: overrideApi.url, apiKey: overrideApi.key };
              }
              return { apiUrl: selectedApi.url, apiKey: selectedApi.key };
            };

                                   // 🔥 Extract service minimums from bundle services
            const getServiceMin = (type: 'views' | 'likes' | 'shares' | 'saves' | 'comments' | 'reposts') => {
              const overrideApiId = selectedBundle?.serviceApis?.[type];
              const apiId = overrideApiId || selectedBundle?.apiId || selectedApiId;
              const api = apis.find(a => a.id === apiId);
              const serviceId = selectedBundle?.serviceIds[type];
              const service = api?.services.find(s => s.id === serviceId);
              return service?.min || null;
            };

            const servicesPayload: {
              views: { serviceId: string; runs: Array<{ time: string; quantity: number }>; apiUrl?: string; apiKey?: string; serviceMin?: number };
              likes?: { serviceId: string; runs: Array<{ time: string; quantity: number; serviceIdOverride?: string; apiUrlOverride?: string; apiKeyOverride?: string; serviceMinOverride?: number }>; apiUrl?: string; apiKey?: string; serviceMin?: number };
              shares?: { serviceId: string; runs: Array<{ time: string; quantity: number }>; apiUrl?: string; apiKey?: string; serviceMin?: number };
              saves?: { serviceId: string; runs: Array<{ time: string; quantity: number }>; apiUrl?: string; apiKey?: string; serviceMin?: number };
              comments?: { serviceId: string; runs: Array<{ time: string; comments: string }>; apiUrl?: string; apiKey?: string; serviceMin?: number };
              reposts?: { serviceId: string; runs: Array<{ time: string; quantity: number }>; apiUrl?: string; apiKey?: string; serviceMin?: number };
            } = {
              views: { serviceId: viewsServiceId, runs: viewRuns, ...getServiceApi('views'), serviceMin: getServiceMin('views') },
            };
                       const repostsServiceId = selectedBundle.serviceIds.reposts?.trim();
            const repostsRuns = (safePlan?.runs || []).map((run) => ({ time: run.at.toISOString(), quantity: Math.max(0, Math.floor(run.reposts || 0)) }));

                        if (includeLikes) servicesPayload.likes = { serviceId: likesServiceId, runs: likesRuns, ...getServiceApi('likes'), serviceMin: getServiceMin('likes') };
            if (includeShares) servicesPayload.shares = { serviceId: sharesServiceId, runs: sharesRuns, ...getServiceApi('shares'), serviceMin: getServiceMin('shares') };
            if (includeSaves) servicesPayload.saves = { serviceId: savesServiceId, runs: savesRuns, ...getServiceApi('saves'), serviceMin: getServiceMin('saves') };
            if (includeReposts && repostsServiceId) servicesPayload.reposts = { serviceId: repostsServiceId, runs: repostsRuns, ...getServiceApi('reposts'), serviceMin: getServiceMin('reposts') };
                        if (includeComments && filteredCommentsRuns.length > 0) {
              servicesPayload.comments = {
                serviceId: commentsServiceId!,
                runs: filteredCommentsRuns,
                ...getServiceApi('comments'),
                serviceMin: getServiceMin('comments'),
              };
            }
                  setIsCreatingOrder(true);
                  setCreateSuccess(`Processing ${targets.length} missions...`);
                  const batchId = targets.length > 1 ? `batch-${Date.now()}` : undefined;
                  try {
                    const activeLinks = new Set(orders.filter((order) => { const now = Date.now(); const runs = order.runs || []; if (!runs.length) return false; const allRunsCompleted = runs.every((run) => new Date(run.at).getTime() <= now); return !allRunsCompleted && order.status !== "cancelled"; }).map((order) => order.link.replace(/\/+$/, "").toLowerCase()));
                    const createdLinks = new Set<string>();
                    let successCount = 0;
                    let failedCount = 0;
                    let lastError = "";
                    for (let index = 0; index < targets.length; index += 1) {
                      const trimmedUrl = targets[index];
                      const normalizedTarget = trimmedUrl.replace(/\/+$/, "").toLowerCase();
                      if (activeLinks.has(normalizedTarget) || createdLinks.has(normalizedTarget)) { failedCount += 1; lastError = "Duplicate link."; continue; }
                      try {
                        const result = await createSmmOrder({ name: orderName.trim() || undefined, apiUrl: selectedApi.url, apiKey: selectedApi.key, link: trimmedUrl, services: servicesPayload });
                                               const order: CreatedOrder = { id: createOrderId(), name: orderName.trim() || `Mission #${createOrderId()}`, batchId, batchIndex: index + 1, batchTotal: targets.length, batchLinks: targets.length > 1 ? targets : undefined, schedulerOrderId: result.schedulerOrderId, smmOrderId: result.orderId ?? "Scheduled", link: trimmedUrl, totalViews: quantity, startDelayHours, patternType: safePlan.patternType, patternName: safePlan.patternName, runs: safePlan?.runs || [], engagement: { likes: totalLikes, shares: totalShares, saves: totalSaves, comments: totalCommentsQty, reposts: totalRepostsQty }, serviceId: viewsServiceId, selectedAPI: selectedApi.name, selectedBundle: selectedBundle.name, status: result.status === "completed" ? "completed" : "running", completedRuns: typeof result.completedRuns === "number" ? result.completedRuns : 0, runStatuses: (safePlan?.runs || []).map(() => "pending"), createdAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString() };
                        onCreateOrder(order);
                        createdLinks.add(normalizedTarget);
                        successCount += 1;
                      } catch (error) {
                        const message = error instanceof Error ? error.message : "Failed";
                        const failedOrder: CreatedOrder = { id: createOrderId(), name: orderName.trim() || `Mission #${createOrderId()}`, batchId, batchIndex: index + 1, batchTotal: targets.length, smmOrderId: "N/A", link: trimmedUrl, totalViews: quantity, startDelayHours, patternType: safePlan.patternType, patternName: safePlan.patternName, runs: safePlan?.runs || [], engagement: { likes: totalLikes, shares: totalShares, saves: totalSaves, comments: totalCommentsQty }, serviceId: viewsServiceId, selectedAPI: selectedApi.name, selectedBundle: selectedBundle.name, status: "failed", completedRuns: 0, runStatuses: (safePlan?.runs || []).map((_, i) => (i === 0 ? "cancelled" : "pending")), runErrors: (safePlan?.runs || []).map((_, i) => (i === 0 ? message : "")), errorMessage: message, createdAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString() };
                        onCreateOrder(failedOrder);
                        failedCount += 1;
                        lastError = message;
                      }
                    }
                    if (failedCount > 0 && successCount === 0) { setCreateError(lastError || "Failed."); setCreateSuccess(""); return; }
                    const successLabel = targets.length > 1 ? `Done: ${successCount}/${targets.length}` : "Mission Deployed ✅";
                    setCreateSuccess(successLabel);
                    if (failedCount > 0) setCreateError(`${failedCount} failed`);
                    onNavigateToOrders(successLabel);
                  } finally {
                    setIsCreatingOrder(false);
                  }
                }}
                className={`whitespace-nowrap rounded-lg border px-4 py-1.5 text-xs font-semibold transition ${
                  deployReady && !isCreatingOrder
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 animate-pulse"
                    : "border-gray-600 bg-gray-800/50 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isCreatingOrder ? "Deploying..." : deployReady ? "🦇 Deploy Now!" : `⏳ Wait ${deployCountdown}s...`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
