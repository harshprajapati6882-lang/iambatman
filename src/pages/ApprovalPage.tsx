import { useMemo, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { ApiPanel, Bundle, CreatedOrder } from "../types/order";
import { createSmmOrder } from "../utils/api";
import { generateApprovalPlan, formatApprovalPayload } from "../utils/approval";

interface ApprovalPageProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  onCreateOrder: (order: CreatedOrder) => void;
  onNavigateToOrders: (notice?: string) => void;
}

function createOrderId() {
  return `ORD-${Date.now().toString().slice(-6)}`;
}

export function ApprovalPage({ apis, bundles, onCreateOrder, onNavigateToOrders }: ApprovalPageProps) {
  const [orderName, setOrderName] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [totalViews, setTotalViews] = useState(50000);
  const [selectedApiId, setSelectedApiId] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [runCount, setRunCount] = useState(10);
  const [deliveryHours, setDeliveryHours] = useState(24);
  const [startDelayHours, setStartDelayHours] = useState(0);

  const [includeLikes, setIncludeLikes] = useState(true);
  const [likesPer1000, setLikesPer1000] = useState(50);
  const [includeShares, setIncludeShares] = useState(true);
  const [sharesPer1000, setSharesPer1000] = useState(10);
  const [includeSaves, setIncludeSaves] = useState(false);
  const [savesPer1000, setSavesPer1000] = useState(5);
  const [includeComments, setIncludeComments] = useState(false);
  const [commentsPer1000, setCommentsPer1000] = useState(3);
  const [includeReposts, setIncludeReposts] = useState(false);
  const [repostsPer1000, setRepostsPer1000] = useState(2);

  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [deployCountdown, setDeployCountdown] = useState<number | null>(null);
  const [deployReady, setDeployReady] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [expandedRuns, setExpandedRuns] = useState(false);

  const selectedApi = apis.find((a) => a.id === selectedApiId);
  const selectedBundle = bundles.find((b) => b.id === selectedBundleId);

  const config = useMemo(
    () => ({
      totalViews,
      runCount: Math.max(1, Math.min(200, runCount)),
      deliveryHours: Math.max(1, deliveryHours),
      startDelayHours: Math.max(0, startDelayHours),
      likesPer1000, sharesPer1000, savesPer1000, commentsPer1000, repostsPer1000,
      includeLikes, includeShares, includeSaves, includeComments, includeReposts,
    }),
    [totalViews, runCount, deliveryHours, startDelayHours, likesPer1000, sharesPer1000, savesPer1000, commentsPer1000, repostsPer1000, includeLikes, includeShares, includeSaves, includeComments, includeReposts]
  );

  const plan = useMemo(() => {
    try { return generateApprovalPlan(config); } catch (e) { return null; }
  }, [config]);

  const safePlan = plan ?? {
    patternId: 0, patternName: "approval-ratio", patternType: "manual" as const,
    totalRuns: 0, approximateIntervalMin: 0, finishTime: new Date(),
    estimatedDurationHours: 0, risk: "Safe" as const, runs: [],
  };

  const estimatedTotalLikes = safePlan.runs.reduce((s, r) => s + r.likes, 0);
  const estimatedTotalShares = safePlan.runs.reduce((s, r) => s + r.shares, 0);
  const estimatedTotalSaves = safePlan.runs.reduce((s, r) => s + r.saves, 0);
  const estimatedTotalComments = safePlan.runs.reduce((s, r) => s + r.comments, 0);
  const estimatedTotalReposts = safePlan.runs.reduce((s, r) => s + r.reposts, 0);
  const totalPlannedEngagement = estimatedTotalLikes + estimatedTotalShares + estimatedTotalSaves + estimatedTotalComments + estimatedTotalReposts;

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

  const handleConfirmDeploy = useCallback(async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setDeployCountdown(null);
    setDeployReady(false);
    setCreateError("");
    setCreateSuccess("");
    if (!postUrl.trim() || !selectedApi || !selectedBundle) { setCreateError("Please fill URL, API and Bundle."); return; }
    if (!plan || plan.runs.length === 0) { setCreateError("Plan generation failed."); return; }
    setIsCreatingOrder(true);
    try {
      const serviceIds = selectedBundle.serviceIds;
      const payload = formatApprovalPayload(plan, selectedApi.url, selectedApi.key, postUrl.trim(), {
        views: serviceIds.views, likes: serviceIds.likes, shares: serviceIds.shares, saves: serviceIds.saves, comments: serviceIds.comments, reposts: serviceIds.reposts,
      }, { likes: includeLikes, shares: includeShares, saves: includeSaves, comments: includeComments, reposts: includeReposts });
      const result = await createSmmOrder({ apiUrl: payload.apiUrl, apiKey: payload.apiKey, link: payload.link, services: payload.services, name: orderName.trim() || `Approval ${createOrderId()}` });
      const newOrder: CreatedOrder = {
        id: createOrderId(), name: orderName.trim() || `Approval ${createOrderId()}`, link: postUrl.trim(), totalViews,
        startDelayHours, patternType: "manual", patternName: "approval-ratio",
        runs: plan.runs.map((r) => ({ run: r.run, at: r.at, minutesFromStart: r.minutesFromStart, views: r.views, likes: r.likes, shares: r.shares, saves: r.saves, comments: r.comments, reposts: r.reposts, cumulativeViews: r.cumulativeViews, cumulativeLikes: r.cumulativeLikes, cumulativeShares: r.cumulativeShares, cumulativeSaves: r.cumulativeSaves, cumulativeComments: r.cumulativeComments, cumulativeReposts: r.cumulativeReposts })),
        engagement: { likes: estimatedTotalLikes, shares: estimatedTotalShares, saves: estimatedTotalSaves, comments: estimatedTotalComments, reposts: estimatedTotalReposts },
        serviceId: serviceIds.views, selectedAPI: selectedApi.name, selectedBundle: selectedBundle.name, status: "running", completedRuns: 0, runStatuses: plan.runs.map(() => "pending"), createdAt: new Date().toISOString(), schedulerOrderId: result.schedulerOrderId,
      };
      onCreateOrder(newOrder);
      setCreateSuccess("Order deployed successfully!");
      setTimeout(() => onNavigateToOrders("New approval order deployed."), 800);
    } catch (err: unknown) { const msg = err instanceof Error ? err.message : String(err); setCreateError(msg); } finally { setIsCreatingOrder(false); }
  }, [plan, postUrl, selectedApi, selectedBundle, orderName, totalViews, startDelayHours, includeLikes, includeShares, includeSaves, includeComments, includeReposts, estimatedTotalLikes, estimatedTotalShares, estimatedTotalSaves, estimatedTotalComments, estimatedTotalReposts, onCreateOrder, onNavigateToOrders]);

  const isValidUrl = (value: string) => { try { const parsed = new URL(value); return parsed.protocol === "http:" || parsed.protocol === "https:"; } catch { return false; } };

  const ratioBlocks = [
    { label: "Likes", emoji: "❤️", enabled: includeLikes, setEnabled: setIncludeLikes, value: likesPer1000, setValue: setLikesPer1000, color: "text-pink-300", border: "border-pink-500/30", bg: "bg-pink-500/5", total: estimatedTotalLikes },
    { label: "Shares", emoji: "🔄", enabled: includeShares, setEnabled: setIncludeShares, value: sharesPer1000, setValue: setSharesPer1000, color: "text-blue-300", border: "border-blue-500/30", bg: "bg-blue-500/5", total: estimatedTotalShares },
    { label: "Saves", emoji: "💾", enabled: includeSaves, setEnabled: setIncludeSaves, value: savesPer1000, setValue: setSavesPer1000, color: "text-purple-300", border: "border-purple-500/30", bg: "bg-purple-500/5", total: estimatedTotalSaves },
    { label: "Comments", emoji: "💬", enabled: includeComments, setEnabled: setIncludeComments, value: commentsPer1000, setValue: setCommentsPer1000, color: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/5", total: estimatedTotalComments },
    { label: "Reposts", emoji: "🔁", enabled: includeReposts, setEnabled: setIncludeReposts, value: repostsPer1000, setValue: setRepostsPer1000, color: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/5", total: estimatedTotalReposts },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-yellow-500/20 bg-gray-950/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h2 className="text-sm font-bold tracking-wide text-yellow-400 uppercase">Approval Mission</h2>
        </div>
        <p className="mt-0.5 text-[10px] text-gray-500">Set exact engagement ratios per 1000 views. No automatic guesses.</p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Views", value: totalViews.toLocaleString(), icon: "👁️", color: "text-yellow-300" },
            { label: "Runs", value: String(safePlan.totalRuns), icon: "🧩", color: "text-blue-300" },
            { label: "Duration", value: `${safePlan.estimatedDurationHours}h`, icon: "⏱️", color: "text-emerald-300" },
            { label: "Likes", value: estimatedTotalLikes.toLocaleString(), icon: "❤️", color: "text-pink-300" },
            { label: "Shares", value: estimatedTotalShares.toLocaleString(), icon: "🔄", color: "text-blue-300" },
            { label: "Engage", value: totalPlannedEngagement.toLocaleString(), icon: "⚡", color: "text-purple-300" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">{item.label} {item.icon}</div>
              <div className={`mt-0.5 text-sm font-bold ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-lg border border-yellow-500/20 bg-gray-900/50 p-3">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-400"><span>📋</span> Order Details</h3>

              <div className="mb-2">
                <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Mission Name</label>
                <input type="text" value={orderName} onChange={(e) => setOrderName(e.target.value)} placeholder="e.g. Campaign Alpha" className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none" />
              </div>

              <div className="mb-2">
                <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Target URL</label>
                <input type="text" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://instagram.com/reel/..." className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none" />
              </div>

              <div className="mb-2">
                <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Total Views</label>
                <input type="number" value={totalViews} onChange={(e) => { const v = parseInt(e.target.value, 10); setTotalViews(Number.isFinite(v) && v >= 0 ? v : 0); }} min={0} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none" />
              </div>

              <div className="mb-2">
                <label className="mb-0.5 block text-[10px] uppercase text-gray-500">API Panel</label>
                <select value={selectedApiId} onChange={(e) => { setSelectedApiId(e.target.value); setSelectedBundleId(""); }} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none">
                  <option value="">Select API...</option>
                  {apis.map((api) => <option key={api.id} value={api.id}>{api.name} ({api.status})</option>)}
                </select>
              </div>

              <div className="mb-2">
                <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Service Bundle</label>
                <select value={selectedBundleId} onChange={(e) => setSelectedBundleId(e.target.value)} disabled={!selectedApiId} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none disabled:opacity-40">
                  <option value="">Select Bundle...</option>
                  {bundles.filter((b) => !selectedApiId || b.apiId === selectedApiId || b.serviceApis?.views === selectedApiId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="mb-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Runs</label>
                  <input type="number" value={runCount} onChange={(e) => { const v = parseInt(e.target.value, 10); setRunCount(Number.isFinite(v) ? Math.max(1, Math.min(200, v)) : 1); }} min={1} max={200} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Duration (h)</label>
                  <input type="number" value={deliveryHours} onChange={(e) => { const v = parseInt(e.target.value, 10); setDeliveryHours(Number.isFinite(v) ? Math.max(1, v) : 1); }} min={1} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Start Delay (h)</label>
                <input type="number" value={startDelayHours} onChange={(e) => { const v = parseInt(e.target.value, 10); setStartDelayHours(Number.isFinite(v) ? Math.max(0, v) : 0); }} min={0} className="w-full rounded-lg border border-yellow-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none" />
              </div>
            </div>

            {createError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">❌ {createError}</div>}
            {createSuccess && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">✅ {createSuccess}</div>}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-yellow-500/20 bg-gray-900/50 p-3">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-400"><span>🎯</span> Engagement Ratios (per 1000 Views)</h3>
              <div className="space-y-2">
                {ratioBlocks.map((block) => (
                  <motion.div key={block.label} layout className={`rounded-lg border ${block.border} ${block.bg} p-2 transition-opacity ${block.enabled ? "opacity-100" : "opacity-50"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={block.enabled} onChange={(e) => block.setEnabled(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500/40" />
                        <span className={`text-xs font-bold ${block.color}`}>{block.emoji} {block.label}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">Total: <span className={block.color}>{block.total.toLocaleString()}</span></div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">Qty / 1000 views:</span>
                      <input type="number" value={block.value} onChange={(e) => { const v = parseInt(e.target.value, 10); block.setValue(Number.isFinite(v) && v >= 0 ? v : 0); }} disabled={!block.enabled} min={0} className="w-20 rounded-md border border-gray-700 bg-gray-950 px-1.5 py-0.5 text-right text-xs text-white focus:border-yellow-500/50 focus:outline-none disabled:opacity-30" />
                      <div className="flex-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                          <div className={`h-full rounded-full transition-all ${block.label === "Likes" ? "bg-pink-500" : block.label === "Shares" ? "bg-blue-500" : block.label === "Saves" ? "bg-purple-500" : block.label === "Comments" ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, (block.value / 200) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-yellow-500/20 bg-gray-900/50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-500">
                  {deployCountdown !== null ? <span className="text-yellow-400">⏳ Confirm in {deployCountdown}s...</span> : isCreatingOrder ? <span className="text-yellow-400">⏳ Deploying...</span> : <span>{safePlan.totalRuns} runs &middot; {safePlan.estimatedDurationHours}h</span>}
                </div>
                <div className="flex gap-2">
                  {deployCountdown !== null && <button onClick={handleCancelDeploy} className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20">Cancel</button>}
                  {deployCountdown !== null ? (
                    <button onClick={handleConfirmDeploy} disabled={!deployReady || isCreatingOrder} className="rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-yellow-400 disabled:opacity-40 disabled:hover:bg-yellow-500">{isCreatingOrder ? "..." : "CONFIRM DEPLOY"}</button>
                  ) : (
                    <button onClick={handleDeployClick} disabled={!isValidUrl(postUrl) || !selectedApi || !selectedBundle || isCreatingOrder} className="rounded-md bg-yellow-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-yellow-400 disabled:opacity-40 disabled:hover:bg-yellow-500">{isCreatingOrder ? "⏳ Deploying..." : "🚀 DEPLOY MISSION"}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
          <button onClick={() => setExpandedRuns((v) => !v)} className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white">
            <span>📜 Mission Preview</span><span>{expandedRuns ? "▲" : "▼"}</span>
          </button>
          {expandedRuns && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-500">
                    <th className="pb-1 pr-2">#</th><th className="pb-1 pr-2">Time</th><th className="pb-1 pr-2 text-right">Views</th>
                    {includeLikes && <th className="pb-1 pr-2 text-right text-pink-400">Likes</th>}
                    {includeShares && <th className="pb-1 pr-2 text-right text-blue-400">Shares</th>}
                    {includeSaves && <th className="pb-1 pr-2 text-right text-purple-400">Saves</th>}
                    {includeComments && <th className="pb-1 pr-2 text-right text-emerald-400">Comments</th>}
                    {includeReposts && <th className="pb-1 pr-2 text-right text-amber-400">Reposts</th>}
                  </tr>
                </thead>
                <tbody>
                  {safePlan.runs.map((run) => (
                    <tr key={run.run} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-1 pr-2 text-gray-500">{run.run}</td>
                      <td className="py-1 pr-2 text-gray-400">{run.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-1 pr-2 text-right text-yellow-300">{run.views.toLocaleString()}</td>
                      {includeLikes && <td className="py-1 pr-2 text-right text-pink-300">{run.likes.toLocaleString()}</td>}
                      {includeShares && <td className="py-1 pr-2 text-right text-blue-300">{run.shares.toLocaleString()}</td>}
                      {includeSaves && <td className="py-1 pr-2 text-right text-purple-300">{run.saves.toLocaleString()}</td>}
                      {includeComments && <td className="py-1 pr-2 text-right text-emerald-300">{run.comments.toLocaleString()}</td>}
                      {includeReposts && <td className="py-1 pr-2 text-right text-amber-300">{run.reposts.toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!expandedRuns && (
            <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
              <span>Runs: {safePlan.totalRuns}</span>
              <span>Views/run avg: {safePlan.totalRuns > 0 ? Math.round(totalViews / safePlan.totalRuns) : 0}</span>
              <span>Finish: {safePlan.finishTime.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
