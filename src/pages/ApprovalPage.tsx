import { useMemo, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { ApiPanel, CreatedOrder } from "../types/order";
import { createSmmOrder } from "../utils/api";
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
  const [totalViews, setTotalViews] = useState(50000);
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [runCount, setRunCount] = useState(10);
  const [deliveryHours, setDeliveryHours] = useState(24);
  const [startDelayHours, setStartDelayHours] = useState(0);
  const [likesPer1000, setLikesPer1000] = useState(50);
  const [includeLikes, setIncludeLikes] = useState(true);

  const [createError, setCreateError] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [deployCountdown, setDeployCountdown] = useState<number | null>(null);
  const [deployReady, setDeployReady] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [expandedRuns, setExpandedRuns] = useState(false);

  const selectedBundle = approvalBundles.find((b) => b.id === selectedBundleId);
  const selectedApi = apis.find((a) => a.id === selectedBundle?.apiId);

  // ── Validation ──
  const MIN_VIEWS_PER_RUN = 100;
  const viewsPerRun = Math.floor(totalViews / Math.max(1, runCount));
  const isViewsValid = viewsPerRun >= MIN_VIEWS_PER_RUN;
  const isLikesValid = !includeLikes || (selectedBundle?.likesServiceId ? true : false);

  const plan = useMemo(() => {
    if (!isViewsValid || !selectedBundle || !selectedApi) return null;

    const now = Date.now();
    const startMs = now + startDelayHours * 3600_000;
    const totalDurationMs = deliveryHours * 3600_000;
    const runs = [];

    let cumulativeViews = 0;
    let cumulativeLikes = 0;

    for (let i = 0; i < runCount; i++) {
      const baseViews = Math.floor(totalViews / runCount);
      const remainder = totalViews % runCount;
      const runViews = i < remainder ? baseViews + 1 : baseViews;

      const fraction = runCount > 1 ? i / (runCount - 1) : 0;
      const at = new Date(startMs + fraction * totalDurationMs);
      const minutesFromStart = Math.round((at.getTime() - startMs) / 60000);

      const rawLikes = includeLikes ? Math.round((runViews * likesPer1000) / 1000) : 0;
      const likes = includeLikes ? Math.max(1, rawLikes) : 0;

      cumulativeViews += runViews;
      cumulativeLikes += likes;

      runs.push({
        run: i + 1,
        at,
        minutesFromStart,
        views: runViews,
        likes,
        shares: 0,
        saves: 0,
        comments: 0,
        reposts: 0,
        cumulativeViews,
        cumulativeLikes,
        cumulativeShares: 0,
        cumulativeSaves: 0,
        cumulativeComments: 0,
        cumulativeReposts: 0,
      });
    }

    return {
      patternId: Date.now() % 100000,
      patternName: "approval-simple",
      patternType: "manual" as const,
      totalRuns: runCount,
      approximateIntervalMin: runCount > 1 ? Math.round((totalDurationMs / (runCount - 1)) / 60000) : 0,
      finishTime: runs[runs.length - 1]?.at ?? new Date(startMs + totalDurationMs),
      estimatedDurationHours: deliveryHours,
      risk: "Safe" as const,
      runs,
    };
  }, [totalViews, runCount, deliveryHours, startDelayHours, includeLikes, likesPer1000, isViewsValid, selectedBundle, selectedApi]);

  const totalLikes = plan?.runs.reduce((s, r) => s + r.likes, 0) ?? 0;

  const handleDeployClick = () => {
    if (deployCountdown !== null) return;
    setCreateError("");
    setDeployCountdown(15);
    setDeployReady(false);
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

  const handleConfirmDeploy = useCallback(async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setDeployCountdown(null);
    setDeployReady(false);
    setCreateError("");

    if (!postUrl.trim() || !selectedBundle || !selectedApi) {
      setCreateError("Please fill URL and select an Approval Bundle.");
      return;
    }
    if (!plan) {
      setCreateError("Plan is invalid. Check your inputs.");
      return;
    }

    setIsCreatingOrder(true);

    try {
      const services: Record<string, { serviceId: string; runs: Array<{ time: string; quantity: number }> }> = {};

      services.views = {
        serviceId: selectedBundle.viewsServiceId,
        runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.views })),
      };

      if (includeLikes && selectedBundle.likesServiceId) {
        services.likes = {
          serviceId: selectedBundle.likesServiceId,
          runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.likes })),
        };
      }

      const result = await createSmmOrder({
        apiUrl: selectedApi.url,
        apiKey: selectedApi.key,
        link: postUrl.trim(),
        services,
        name: orderName.trim() || `Approval ${createOrderId()}`,
      });

      const newOrder: CreatedOrder = {
        id: createOrderId(),
        name: orderName.trim() || `Approval ${createOrderId()}`,
        link: postUrl.trim(),
        totalViews,
        startDelayHours,
        patternType: "manual",
        patternName: "approval-simple",
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
        runStatuses: plan.runs.map(() => "pending"),
        createdAt: new Date().toISOString(),
        schedulerOrderId: result.schedulerOrderId,
      };

      onCreateOrder(newOrder);
      setTimeout(() => onNavigateToOrders("Approval order deployed."), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCreateError(msg);
    } finally {
      setIsCreatingOrder(false);
    }
  }, [plan, postUrl, selectedBundle, selectedApi, orderName, totalViews, startDelayHours, includeLikes, totalLikes, onCreateOrder, onNavigateToOrders]);

  const isValidUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const canDeploy =
    isValidUrl(postUrl) &&
    selectedBundle !== undefined &&
    isViewsValid &&
    (!includeLikes || selectedBundle.likesServiceId);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-yellow-500/20 bg-gray-950/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h2 className="text-sm font-bold tracking-wide text-yellow-400 uppercase">Approval Mission</h2>
        </div>
        <p className="mt-0.5 text-[10px] text-gray-500">Simple views + likes. Min 100 views per run. Min 1 like per run.</p>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-4">
        {/* Quick Stats */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: "Views", value: totalViews.toLocaleString(), icon: "👁️", color: "text-yellow-300" },
            { label: "Runs", value: String(plan?.totalRuns ?? 0), icon: "🧩", color: "text-blue-300" },
            { label: "Likes", value: totalLikes.toLocaleString(), icon: "❤️", color: "text-pink-300" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">{item.label} {item.icon}</div>
              <div className={`mt-0.5 text-sm font-bold ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Inputs */}
        <div className="rounded-lg border border-yellow-500/20 bg-gray-900/50 p-3 space-y-3">
          {/* Row 1: URL + Name */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Post URL</label>
              <input
                type="text"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://instagram.com/reel/..."
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Mission Name</label>
              <input
                type="text"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                placeholder="Optional name..."
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Total Views + Runs */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Total Views</label>
              <input
                type="number"
                value={totalViews}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setTotalViews(Number.isFinite(v) && v >= 0 ? v : 0);
                }}
                min={0}
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
              />
              {!isViewsValid && totalViews > 0 && runCount > 0 && (
                <div className="mt-1 text-[10px] text-red-400">
                  ⚠️ Need at least {MIN_VIEWS_PER_RUN * runCount} views for {runCount} runs (min 100/run)
                </div>
              )}
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Number of Runs</label>
              <input
                type="number"
                value={runCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setRunCount(Number.isFinite(v) ? Math.max(1, Math.min(200, v)) : 1);
                }}
                min={1}
                max={200}
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Duration + Delay */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Duration (hours)</label>
              <input
                type="number"
                value={deliveryHours}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setDeliveryHours(Number.isFinite(v) ? Math.max(1, v) : 1);
                }}
                min={1}
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Start Delay (hours)</label>
              <input
                type="number"
                value={startDelayHours}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setStartDelayHours(Number.isFinite(v) ? Math.max(0, v) : 0);
                }}
                min={0}
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Approval Bundle */}
          <div>
            <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Approval Bundle</label>
            <select
              value={selectedBundleId}
              onChange={(e) => setSelectedBundleId(e.target.value)}
              className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none"
            >
              <option value="">Select bundle...</option>
              {approvalBundles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {approvalBundles.length === 0 && (
              <div className="mt-1 text-[10px] text-gray-500">
                Go to Bundles page and create an Approval Bundle first.
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 pt-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-yellow-400">🎯 Likes Ratio</h3>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeLikes}
                onChange={(e) => setIncludeLikes(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-yellow-500"
              />
              <span className="text-xs text-white">Include Likes</span>
            </div>

            {includeLikes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">Likes per 1000 views:</span>
                  <input
                    type="number"
                    value={likesPer1000}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setLikesPer1000(Number.isFinite(v) && v >= 0 ? v : 0);
                    }}
                    min={0}
                    className="w-24 rounded-md border border-pink-500/30 bg-gray-950 px-2 py-1 text-xs text-white text-right focus:border-pink-500/50 focus:outline-none"
                  />
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-pink-500 transition-all"
                        style={{ width: `${Math.min(100, (likesPer1000 / 200) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-[10px] text-pink-300">
                  Total likes: {totalLikes.toLocaleString()} (min 1 per run)
                </div>
              </motion.div>
            )}
          </div>

          {/* Error */}
          {createError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              ❌ {createError}
            </div>
          )}

          {/* Deploy */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[10px] text-gray-500">
              {deployCountdown !== null ? (
                <span className="text-yellow-400">⏳ Confirm in {deployCountdown}s...</span>
              ) : isCreatingOrder ? (
                <span className="text-yellow-400">Deploying...</span>
              ) : plan ? (
                <span>{plan.totalRuns} runs &middot; {plan.estimatedDurationHours}h &middot; {viewsPerRun} views/run</span>
              ) : (
                <span className="text-red-400">Invalid plan</span>
              )}
            </div>

            <div className="flex gap-2">
              {deployCountdown !== null && (
                <button
                  onClick={handleCancelDeploy}
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
                >
                  Cancel
                </button>
              )}
              {deployCountdown !== null ? (
                <button
                  onClick={handleConfirmDeploy}
                  disabled={!deployReady || isCreatingOrder}
                  className="rounded-md bg-yellow-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-yellow-400 disabled:opacity-40"
                >
                  {isCreatingOrder ? "..." : "CONFIRM"}
                </button>
              ) : (
                <button
                  onClick={handleDeployClick}
                  disabled={!canDeploy || isCreatingOrder}
                  className="rounded-md bg-yellow-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-yellow-400 disabled:opacity-40"
                >
                  {isCreatingOrder ? "Deploying..." : "🚀 DEPLOY"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <button
            onClick={() => setExpandedRuns((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
          >
            <span>📜 Mission Preview</span>
            <span>{expandedRuns ? "▲" : "▼"}</span>
          </button>

          {expandedRuns && plan && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-500">
                    <th className="pb-1 pr-2">#</th>
                    <th className="pb-1 pr-2">Time</th>
                    <th className="pb-1 pr-2 text-right">Views</th>
                    {includeLikes && <th className="pb-1 pr-2 text-right text-pink-400">Likes</th>}
                  </tr>
                </thead>
                <tbody>
                  {plan.runs.map((run) => (
                    <tr key={run.run} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-1 pr-2 text-gray-500">{run.run}</td>
                      <td className="py-1 pr-2 text-gray-400">
                        {run.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-1 pr-2 text-right text-yellow-300">{run.views.toLocaleString()}</td>
                      {includeLikes && <td className="py-1 pr-2 text-right text-pink-300">{run.likes.toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!expandedRuns && plan && (
            <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
              <span>{plan.totalRuns} runs</span>
              <span>{viewsPerRun} views/run (min 100)</span>
              <span>{totalLikes} total likes (min 1/run)</span>
              <span>Finish: {plan.finishTime.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
