import type { PatternPlan, RunStep } from "../types/order";

export interface ApprovalRatioConfig {
  totalViews: number;
  runCount: number;
  deliveryHours: number;
  startDelayHours: number;
  likesPer1000: number;
  sharesPer1000: number;
  savesPer1000: number;
  commentsPer1000: number;
  repostsPer1000: number;
  includeLikes: boolean;
  includeShares: boolean;
  includeSaves: boolean;
  includeComments: boolean;
  includeReposts: boolean;
}

function distributeViews(totalViews: number, runCount: number): number[] {
  if (runCount <= 0) return [];
  if (runCount === 1) return [totalViews];

  const weights: number[] = [];
  let weightSum = 0;
  for (let i = 0; i < runCount; i++) {
    const x = (i + 0.5) / runCount;
    const w = Math.sin(Math.PI * x) + 0.3;
    weights.push(w);
    weightSum += w;
  }

  const raw = weights.map((w) => Math.round((w / weightSum) * totalViews));
  const currentTotal = raw.reduce((a, b) => a + b, 0);
  const drift = totalViews - currentTotal;
  if (drift !== 0) {
    const maxIdx = raw.indexOf(Math.max(...raw));
    raw[maxIdx] += drift;
  }

  const minRun = 1;
  let adjusted = raw.map((v) => Math.max(v, minRun));
  const adjTotal = adjusted.reduce((a, b) => a + b, 0);
  const adjDrift = totalViews - adjTotal;
  if (adjDrift !== 0) {
    const maxIdx = adjusted.indexOf(Math.max(...adjusted));
    adjusted[maxIdx] += adjDrift;
  }

  return adjusted;
}

function clampMin(val: number, min: number): number {
  return Math.max(min, val);
}

export function generateApprovalPlan(config: ApprovalRatioConfig): PatternPlan {
  const {
    totalViews, runCount, deliveryHours, startDelayHours,
    likesPer1000, sharesPer1000, savesPer1000, commentsPer1000, repostsPer1000,
    includeLikes, includeShares, includeSaves, includeComments, includeReposts,
  } = config;

  const viewsDistribution = distributeViews(totalViews, runCount);
  const now = Date.now();
  const startMs = now + startDelayHours * 3600_000;
  const totalDurationMs = deliveryHours * 3600_000;

  const runs: RunStep[] = [];
  let cumulativeViews = 0, cumulativeLikes = 0, cumulativeShares = 0, cumulativeSaves = 0, cumulativeComments = 0, cumulativeReposts = 0;

  for (let i = 0; i < runCount; i++) {
    const runViews = viewsDistribution[i];
    const fraction = totalDurationMs > 0 ? i / Math.max(1, runCount - 1) : 0;
    const at = new Date(startMs + fraction * totalDurationMs);
    const minutesFromStart = Math.round((at.getTime() - startMs) / 60000);

    const rawLikes = includeLikes ? Math.round((runViews * likesPer1000) / 1000) : 0;
    const rawShares = includeShares ? Math.round((runViews * sharesPer1000) / 1000) : 0;
    const rawSaves = includeSaves ? Math.round((runViews * savesPer1000) / 1000) : 0;
    const rawComments = includeComments ? Math.round((runViews * commentsPer1000) / 1000) : 0;
    const rawReposts = includeReposts ? Math.round((runViews * repostsPer1000) / 1000) : 0;

    const likes = includeLikes ? clampMin(rawLikes, 1) : 0;
    const shares = includeShares ? clampMin(rawShares, 1) : 0;
    const saves = includeSaves ? clampMin(rawSaves, 1) : 0;
    const comments = includeComments ? clampMin(rawComments, 1) : 0;
    const reposts = includeReposts ? clampMin(rawReposts, 1) : 0;

    cumulativeViews += runViews;
    cumulativeLikes += likes;
    cumulativeShares += shares;
    cumulativeSaves += saves;
    cumulativeComments += comments;
    cumulativeReposts += reposts;

    runs.push({ run: i + 1, at, minutesFromStart, views: runViews, likes, shares, saves, comments, reposts, cumulativeViews, cumulativeLikes, cumulativeShares, cumulativeSaves, cumulativeComments, cumulativeReposts });
  }

  return {
    patternId: Date.now() % 100000,
    patternName: "approval-ratio",
    patternType: "manual",
    totalRuns: runCount,
    approximateIntervalMin: runCount > 1 ? Math.round((totalDurationMs / (runCount - 1)) / 60000) : 0,
    finishTime: runs[runs.length - 1]?.at ?? new Date(startMs + totalDurationMs),
    estimatedDurationHours: deliveryHours,
    risk: "Safe",
    runs,
  };
}

export function formatApprovalPayload(
  plan: PatternPlan,
  apiUrl: string,
  apiKey: string,
  link: string,
  serviceIds: { views: string; likes: string; shares: string; saves: string; comments: string; reposts: string; },
  includes: { likes: boolean; shares: boolean; saves: boolean; comments: boolean; reposts: boolean; }
) {
  const services: Record<string, { serviceId: string; runs: Array<{ time: string; quantity: number }> }> = {};

  services.views = { serviceId: serviceIds.views, runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.views })) };
  if (includes.likes && serviceIds.likes) services.likes = { serviceId: serviceIds.likes, runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.likes })) };
  if (includes.shares && serviceIds.shares) services.shares = { serviceId: serviceIds.shares, runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.shares })) };
  if (includes.saves && serviceIds.saves) services.saves = { serviceId: serviceIds.saves, runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.saves })) };
  if (includes.comments && serviceIds.comments) services.comments = { serviceId: serviceIds.comments, runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.comments })) };
  if (includes.reposts && serviceIds.reposts) services.reposts = { serviceId: serviceIds.reposts, runs: plan.runs.map((r) => ({ time: r.at.toISOString(), quantity: r.reposts })) };

  return { apiUrl, apiKey, link, services };
}
