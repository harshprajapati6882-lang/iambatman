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
  minViewsPerRun: number;
  manualRunCount?: number;
  sharesRatio?: "equal" | "half" | "third" | "custom";
  savesRatio?: "equal" | "half" | "third" | "custom";
  sharesCustomCount?: number;
  savesCustomCount?: number;
  customDrawnViews?: number[] | null;
  likesDistribution?: "bracket" | "even-spread";
  likesBoostPercent?: number;
  likesMode?: "manual-min1" | "manual-min10";
  manualTotalLikes?: number;
  viewsPerLike?: number;
  sharesAfterHalfLikes?: boolean;
  sharesBoostPercent?: number;
  seed?: number;
  audienceTimezone?: string;
  engagementRulesEnabled?: boolean;
  engagementRules?: EngagementRule[];
  subLikesEnabled?: boolean;
  subLikesThreshold?: number;
}

export type EngagementRuleService = "likes" | "shares" | "saves" | "comments" | "reposts";

export interface EngagementRange {
  enabled: boolean;
  min: number;
  max: number;
}

export interface EngagementRule {
  id: string;
  viewsMin: number;
  viewsMax: number;
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
  likesSubRuns?: LikesSubRun[];
}

export interface LikesSubRun {
  at: Date;
  quantity: number;
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
  apiId: string;
  name: string;
  serviceIds: {
    views: string;
    viewsServiceIds?: string[]; // 🔥 NEW: up to 3 rotating views service IDs
    likes: string;
    shares: string;
    saves: string;
    comments: string;
    reposts: string;
    likesPremium?: string;
  };
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
