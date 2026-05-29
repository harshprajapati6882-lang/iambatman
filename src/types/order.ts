export type PatternType =
  | "smooth-s-curve"
  | "rocket-launch"
  | "sunset-fade"
  | "viral-spike"
  | "micro-burst"
  | "heartbeat"
  | "sawtooth"
  | "fibonacci-spiral"
  | "manual";

export type QuickPatternPreset = "viral-boost" | "fast-start" | "trending-push" | "slow-burn";

export interface DeliveryOption {
  mode: "auto" | "preset" | "custom";
  hours: number;
  label: string;
}

export interface OrderConfig {
  postUrl: string;
  totalViews: number;
  startDelayHours: number;
  includeLikes: boolean;
  includeShares: boolean;
  includeSaves: boolean;
   includeComments: boolean;
  includeReposts: boolean;
  repostsRatio?: "equal" | "half" | "third" | "custom";
  repostsCustomCount?: number;
  variancePercent: number;
  peakHoursBoost: boolean;
  quickPreset: QuickPatternPreset | null;
  delivery: DeliveryOption;
    minViewsPerRun: number; // 🔥 NEW: Dynamic minimum views per run
  manualRunCount?: number;
  sharesRatio?: "equal" | "half" | "third" | "custom";
  savesRatio?: "equal" | "half" | "third" | "custom";
  sharesCustomCount?: number;
    savesCustomCount?: number;
  customDrawnViews?: number[] | null;
  likesDistribution?: "bracket" | "even-spread";
  likesBoostPercent?: number;
  sharesAfterHalfLikes?: boolean;
  sharesBoostPercent?: number;
  // 🔥 FIX #6: deterministic plan regeneration. Same seed + config ⇒ same plan.
  seed?: number;
  // 🔥 FIX #7: audience timezone (IANA, e.g. "America/New_York"). When set,
  // the hour-of-day engagement curve is computed in the audience's local time,
  // not the server's tz. When unset, falls back to the browser's local tz.
  audienceTimezone?: string;
  // 🔥 NEW: user-defined view-bracket engagement rules.
  // When `engagementRulesEnabled` is true, every run whose `views` falls inside
  // a defined bracket has its likes/shares/etc clamped to the bracket's range
  // (only for services the bracket explicitly enables). Runs OUTSIDE every
  // defined bracket fall back to the normal automatic logic.
  engagementRulesEnabled?: boolean;
  engagementRules?: EngagementRule[];

  // 🔥 NEW: Sub-Likes mode. When ON, runs with likes <= subLikesThreshold
  // are split into many tiny sub-runs spread across the gap to the next run.
  // Each sub-run is sent to the bundle's `likesPremium` service (min=1).
  subLikesEnabled?: boolean;
  subLikesThreshold?: number;  // default 20
}

export type EngagementRuleService = "likes" | "shares" | "saves" | "comments" | "reposts";

export interface EngagementRange {
  enabled: boolean;
  min: number;
  max: number;
}

export interface EngagementRule {
  id: string;          // stable id for React keys
  viewsMin: number;    // inclusive
  viewsMax: number;    // inclusive
  // One range per service. If `enabled` is false the service falls back to
  // the automatic distribution for runs in this bracket.
  likes: EngagementRange;
  shares: EngagementRange;
  saves: EngagementRange;
  comments: EngagementRange;
  reposts: EngagementRange;
}

export interface RunStep {
  run: number;
  at: Date;
  minutesFromStart: number;
  views: number;
  likes: number;
  shares: number;
  saves: number;
   comments: number;
  reposts: number;
  cumulativeViews: number;
  cumulativeLikes: number;
  cumulativeShares: number;
  cumulativeSaves: number;
  cumulativeComments: number;
  cumulativeReposts: number;
  // 🔥 NEW: when Sub-Likes mode is ON and this run's likes <= threshold,
  // the parent likes amount is split into several smaller sub-runs spread
  // across the gap to the next run. Each sub-run becomes its own provider
  // call to the bundle's `likesPremium` service.
  likesSubRuns?: LikesSubRun[];
}

export interface LikesSubRun {
  at: Date;        // when the sub-run fires (after the parent run's `at`)
  quantity: number; // 1-3 likes typically
}

export interface PatternPlan {
  patternId: number;
  patternName: string;
  patternType: PatternType;
  totalRuns: number;
  approximateIntervalMin: number;
  finishTime: Date;
  estimatedDurationHours: number;
  risk: "Safe" | "Medium" | "Risk";
  runs: RunStep[];
}

export type OrderStatus = "running" | "paused" | "cancelled" | "completed" | "processing" | "failed";

export type RunStatus = "pending" | "completed" | "cancelled" | "retrying";

export interface ApiService {
  id: string;
  name: string;
  type: string;
  rate: string;
  min: number;
  max: number;
}

export interface ApiPanel {
  id: string;
  name: string;
  url: string;
  key: string;
  status: "Active" | "Inactive";
  services: ApiService[];
  lastFetchAt?: string;
  lastFetchError?: string;
}

export interface BundleService {
  apiId: string;
  serviceId: string;
}

export interface Bundle {
  id: string;
  apiId: string; // kept for backward compat (primary/default api)
  name: string;
    serviceIds: {
    views: string;
    likes: string;
    shares: string;
    saves: string;
    comments: string;
    reposts: string;
    // 🔥 NEW: dedicated min=1 likes service for the "Sub-Likes" feature.
    // Optional so existing bundles in localStorage keep working unchanged.
    likesPremium?: string;
  };
  // 🔥 NEW: Per-service API override
  serviceApis?: {
    views?: string;
    likes?: string;
    shares?: string;
    saves?: string;
    comments?: string;
    reposts?: string;
    likesPremium?: string;
  };
}

export interface BackendRunInfo {
  id: string;
  label: string;
  quantity: number;
  time: string;
  status: string;
  done: boolean;
  cancelled: boolean;
  error: string | null;
  lastError: string | null;
  retryCount: number;
  retryReason: string | null;
  originalTime: string;
  currentTime: string;
  executedAt: string | null;
  smmOrderId: string | null;
}

export interface CreatedOrder {
  id: string;
  name: string;
  batchId?: string;
  batchIndex?: number;
  batchTotal?: number;
  schedulerOrderId?: string;
  smmOrderId: string;
  link: string;
  totalViews: number;
  startDelayHours: number;
  patternType: PatternType;
  patternName: string;
  runs: RunStep[];
    engagement: {
    likes: number;
    shares: number;
    saves: number;
    comments: number;
    reposts: number;
  };
  serviceId: string;
  selectedAPI: string | null;
  selectedBundle: string;
  status: OrderStatus;
  completedRuns: number;
  runStatuses: RunStatus[];
  runErrors?: string[];
  runRetries?: number[];
  runOriginalTimes?: string[];
  runCurrentTimes?: string[];
  runReasons?: string[];
    runActualExecutedTimes?: string[];
  batchLinks?: string[];
  errorMessage?: string;
  createdAt: string;
  lastUpdatedAt?: string;
}
