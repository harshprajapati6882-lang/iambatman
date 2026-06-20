import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { APIsPage } from "./pages/APIsPage";
import { BundlesPage } from "./pages/BundlesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewOrderPage } from "./pages/NewOrderPage";
import { OrdersPage } from "./pages/OrdersPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { EngagementComparisonPage } from "./pages/EngagementComparisonPage";
import { ApprovalPage } from "./pages/ApprovalPage";
import { loadApprovalBundles } from "./components/ApprovalBundleManager";
import { fetchNotifications } from "./utils/api";
import type { ApiPanel, Bundle, CreatedOrder, RunStatus } from "./types/order";
import { fetchServices, updateOrderControl, fetchOrderRuns } from "./utils/api";
import { cn } from "./utils/cn";

type NavKey = "dashboard" | "new-order" | "orders" | "notifications" | "apis" | "bundles" | "comparison" | "approval";

const NAV_ITEMS: { key: NavKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "new-order", label: "New Order", icon: "⚡" },
  { key: "approval", label: "Approval", icon: "🛡️" },
  { key: "orders", label: "Orders", icon: "📦" },
  { key: "notifications", label: "Alerts", icon: "🔔" },
  { key: "apis", label: "APIs", icon: "🔗" },
  { key: "bundles", label: "Bundles", icon: "📁" },
  { key: "comparison", label: "Comparison", icon: "📈" },
];

const BATMAN_QUOTES = [
  "It's not who I am underneath, but what I do that defines me.",
  "The night is darkest just before the dawn.",
  "I'm whatever Gotham needs me to be.",
  "A hero can be anyone.",
  "Why do we fall? So we can learn to pick ourselves up.",
  "It's not about what I want. It's about what's fair.",
  "Criminals are a superstitious, cowardly lot.",
  "I wear a mask. And that mask is not to hide who I am, but to create what I am.",
  "The training is nothing! The will is everything!",
  "Sometimes the truth isn't good enough. Sometimes people deserve more.",
  "I won't kill you, but I don't have to save you.",
  "You either die a hero or live long enough to see yourself become the villain.",
  "Endure. You can be the outcast. You can be the one they all turn against.",
  "People need dramatic examples to shake them out of apathy.",
  "Everything's impossible until somebody does it.",
  "I am vengeance. I am the night. I am Batman.",
  "The world only makes sense if you force it to.",
  "It's not about deserve. It's about what you believe.",
  "You don't get heaven or hell. Do you know the only reward you get for being Batman? You get to be Batman.",
  "I have one power. I never give up.",
  "If you make yourself more than just a man, you become something else entirely.",
  "Legends don't burn down villages.",
  "You're much stronger than you think you are. Trust me.",
  "A vigilante is just a man lost in the scramble for his own gratification.",
  "I'm not going to kill you. I want you to tell all your friends about me.",
  "All men have limits. They learn what they are and learn not to exceed them. I ignore mine.",
  "Sometimes it's only madness that makes us what we are.",
  "It's not who you are underneath, it's what you do that defines you.",
  "The world doesn't make sense until you force it to.",
  "Success is stumbling from failure to failure with no loss of enthusiasm.",
];

function getRandomQuote() {
  return BATMAN_QUOTES[Math.floor(Math.random() * BATMAN_QUOTES.length)];
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function hydrateOrderDates(orders: CreatedOrder[]): CreatedOrder[] {
  return (orders || []).map((order) => {
    const safeRuns = Array.isArray(order?.runs)
      ? order.runs.map((run, index) => ({
          run: Number.isFinite(run?.run) ? run.run : index + 1,
          at: run?.at ? new Date(run.at) : new Date(),
          minutesFromStart: Number.isFinite(run?.minutesFromStart) ? run.minutesFromStart : 0,

          views: Number.isFinite(run?.views) ? run.views : 0,
          likes: Number.isFinite(run?.likes) ? run.likes : 0,
          shares: Number.isFinite(run?.shares) ? run.shares : 0,
          saves: Number.isFinite(run?.saves) ? run.saves : 0,
          comments: Number.isFinite(run?.comments) ? run.comments : 0,
          reposts: Number.isFinite(run?.reposts) ? run.reposts : 0,

          cumulativeViews: Number.isFinite(run?.cumulativeViews) ? run.cumulativeViews : 0,
          cumulativeLikes: Number.isFinite(run?.cumulativeLikes) ? run.cumulativeLikes : 0,
          cumulativeShares: Number.isFinite(run?.cumulativeShares) ? run.cumulativeShares : 0,
          cumulativeSaves: Number.isFinite(run?.cumulativeSaves) ? run.cumulativeSaves : 0,
          cumulativeComments: Number.isFinite(run?.cumulativeComments) ? run.cumulativeComments : 0,
          cumulativeReposts: Number.isFinite(run?.cumulativeReposts) ? run.cumulativeReposts : 0,
        }))
      : [];

    const safeRunStatuses: RunStatus[] = Array.isArray(order?.runStatuses)
      ? safeRuns.map((_, index) => {
          const next = order.runStatuses[index];
          return next === "completed" || next === "cancelled" || next === "retrying" ? next : "pending";
        })
      : safeRuns.map(() => "pending");
    const safeRunErrors = Array.isArray(order?.runErrors)
      ? safeRuns.map((_, index) => order.runErrors?.[index] ?? "")
      : safeRuns.map(() => "");

    return {
      ...order,
      name: order?.name || `Order #${order?.id ?? Date.now()}`,
      smmOrderId: order?.smmOrderId ?? "N/A",
      serviceId: order?.serviceId ?? "N/A",
      status:
        order?.status === "failed" ||
        order?.status === "paused" ||
        order?.status === "cancelled" ||
        order?.status === "completed" ||
        order?.status === "running" ||
        order?.status === "processing" ||
        order?.status === "pending"
          ? order.status
          : "running",
      completedRuns: Number.isFinite(order?.completedRuns) ? order.completedRuns : 0,
      runStatuses: safeRunStatuses,
      runErrors: safeRunErrors,
      runRetries: order?.runRetries || [],
      runOriginalTimes: order?.runOriginalTimes || [],
      runCurrentTimes: order?.runCurrentTimes || [],
      runReasons: order?.runReasons || [],
      runActualExecutedTimes: order?.runActualExecutedTimes || [],
      lastUpdatedAt: order?.lastUpdatedAt ?? order?.createdAt ?? new Date().toISOString(),
      runs: safeRuns,
    };
  });
}

function hydrateApis(apis: ApiPanel[]): ApiPanel[] {
  return apis.map((api) => ({
    ...api,
    services: Array.isArray(api.services) ? api.services : [],
    lastFetchError: api.lastFetchError,
    lastFetchAt: api.lastFetchAt,
  }));
}

function hydrateBundles(bundles: Bundle[]): Bundle[] {
  return bundles.map((bundle) => ({
    ...bundle,
    apiId: bundle.apiId ?? "",
  }));
}

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    const saved = localStorage.getItem("dev-smm-active-page");
    if (saved === "dashboard" || saved === "new-order" || saved === "orders" || saved === "notifications" || saved === "apis" || saved === "bundles" || saved === "comparison" || saved === "approval") {
      return saved;
    }
    return "new-order";
  });

  const [ordersNotice, setOrdersNotice] = useState("");
  const [orders, setOrders] = useState(() => hydrateOrderDates(readStorage("dev-smm-orders", [])));
  const [apis, setApis] = useState(() => hydrateApis(readStorage("dev-smm-apis", [])));
  const [bundles, setBundles] = useState(() => hydrateBundles(readStorage("dev-smm-bundles", [])));
  const [approvalBundles, setApprovalBundles] = useState(() => loadApprovalBundles());
  const [cloneSourceOrder, setCloneSourceOrder] = useState<CreatedOrder | null>(null);
  const [fetchingApiId, setFetchingApiId] = useState<string | null>(null);
  const [controllingOrderId, setControllingOrderId] = useState<string | null>(null);

  const [batmanQuote] = useState(() => getRandomQuote());
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  // Track if sync is in progress to prevent render loops
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  // Fetch notification count on mount and periodically
  useEffect(() => {
    const loadCount = async () => {
      try {
        const data = await fetchNotifications(1);
        setNotifUnreadCount(data.unreadCount);
      } catch {}
    };
    loadCount();
    const interval = setInterval(loadCount, 120000); // every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const navigateToPage = useCallback((page: NavKey) => {
    setActivePage(page);
    localStorage.setItem("dev-smm-active-page", page);
  }, []);

  const persistOrders = useCallback((next: CreatedOrder[] | ((prev: CreatedOrder[]) => CreatedOrder[])) => {
    if (typeof next === 'function') {
      setOrders((prev) => {
        const updated = next(prev);
        localStorage.setItem("dev-smm-orders", JSON.stringify(updated));
        return updated;
      });
    } else {
      setOrders(next);
      localStorage.setItem("dev-smm-orders", JSON.stringify(next));
    }
  }, []);

  const persistApis = useCallback((next: ApiPanel[]) => {
    setApis(next);
    localStorage.setItem("dev-smm-apis", JSON.stringify(next));
  }, []);

  const persistBundles = useCallback((next: Bundle[]) => {
    setBundles(next);
    localStorage.setItem("dev-smm-bundles", JSON.stringify(next));
  }, []);

  // Smarter sync that prevents render loops
  const syncOrdersWithBackend = useCallback(async () => {
    if (isSyncingRef.current) {
      console.log('[Sync] Already syncing, skipping...');
      return;
    }

    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    if (timeSinceLastSync < 10000) {
      console.log('[Sync] Too soon since last sync, skipping...');
      return;
    }

    isSyncingRef.current = true;
    lastSyncTimeRef.current = now;

    try {
      const currentOrders = hydrateOrderDates(readStorage("dev-smm-orders", []));

      // Only sync orders that are actually active
      // NEVER re-sync completed, cancelled, or failed orders
      const activeOrders = currentOrders.filter(
        order => order.schedulerOrderId &&
          order.status !== "completed" &&
          order.status !== "cancelled" &&
          order.status !== "failed" &&
          (order.status === "running" || order.status === "processing" || order.status === "paused" || order.status === "pending")
      );

      if (activeOrders.length === 0) {
        console.log('[Sync] No active orders to sync');
        return;
      }

      console.log(`[Sync] Syncing ${activeOrders.length} active orders...`);

      const updates: Array<{ orderId: string; data: Partial<CreatedOrder> }> = [];

      for (const order of activeOrders) {
        try {
          const result = await fetchOrderRuns(order.schedulerOrderId!);

          const runStatuses: RunStatus[] = [];
          const runErrors: string[] = [];
          const runRetries: number[] = [];
          const runOriginalTimes: string[] = [];
          const runCurrentTimes: string[] = [];
          const runReasons: string[] = [];

          result.runs.forEach((backendRun) => {
            const backendStatus = backendRun.status || "pending";

            let frontendStatus: RunStatus;
            if (backendStatus === "cancelled") {
              frontendStatus = "cancelled";
            } else if (backendStatus === "completed") {
              frontendStatus = "completed";
            } else if (backendStatus === "failed") {
              frontendStatus = "cancelled";
            } else if (backendStatus === "processing" || backendStatus === "queued") {
              frontendStatus = "pending";
            } else {
              frontendStatus = "pending";
            }

            runStatuses.push(frontendStatus);
            runErrors.push(backendRun.error || backendRun.lastError || "");
            runRetries.push(backendRun.retryCount || 0);
            runOriginalTimes.push(backendRun.originalTime || backendRun.time || "");
            runCurrentTimes.push(backendRun.currentTime || backendRun.time || "");
            runReasons.push(backendRun.retryReason || "");
          });

          // Backend returns runs for ALL service types (views, likes, shares, saves, comments)
          // But frontend runs array only has ONE entry per time slot
          // We need to match backend runs to frontend runs by grouping by time
          const frontendRunCount = order.runs?.length || 0;

          // Group backend runs by VIEWS time slots
          // With staggered execution, likes/shares/saves have different times than views
          // So we first collect all VIEWS times as anchors, then assign other services to nearest anchor

          // Step 1: Collect all VIEWS run times as anchor slots
          const viewsRuns = result.runs.filter(r => (r.label || "").toUpperCase() === "VIEWS");
          const otherRuns = result.runs.filter(r => (r.label || "").toUpperCase() !== "VIEWS");

          // Create slots from VIEWS runs
          const timeSlotMap = new Map<string, { statuses: string[]; errors: string[] }>();

          viewsRuns.forEach((vr) => {
            const timeKey = vr.time ? new Date(vr.time).toISOString().slice(0, 16) : "unknown";
            if (!timeSlotMap.has(timeKey)) {
              timeSlotMap.set(timeKey, { statuses: [], errors: [] });
            }
            const slot = timeSlotMap.get(timeKey)!;
            slot.statuses.push(vr.status || "pending");
            if (vr.error || vr.lastError) {
              slot.errors.push(vr.error || vr.lastError || "");
            }
          });

          // Step 2: For each non-VIEWS run, find the nearest VIEWS slot and attach to it
          const slotKeys = Array.from(timeSlotMap.keys()).sort();

          otherRuns.forEach((run) => {
            const runTime = run.time ? new Date(run.time).getTime() : 0;

            // Find nearest VIEWS slot (within 20 minutes before the run time)
            let bestKey = slotKeys.length > 0 ? slotKeys[0] : "unknown";
            let bestDiff = Infinity;

            for (const key of slotKeys) {
              const slotTime = new Date(key).getTime();
              const diff = runTime - slotTime;
              // The run should be AFTER the views slot (stagger adds delay)
              // Accept runs within 0-20 minutes after views
              if (diff >= 0 && diff < 20 * 60 * 1000 && diff < bestDiff) {
                bestDiff = diff;
                bestKey = key;
              }
            }

            // If no good match found, use the closest slot overall
            if (bestDiff === Infinity) {
              for (const key of slotKeys) {
                const slotTime = new Date(key).getTime();
                const diff = Math.abs(runTime - slotTime);
                if (diff < bestDiff) {
                  bestDiff = diff;
                  bestKey = key;
                }
              }
            }

            if (!timeSlotMap.has(bestKey)) {
              timeSlotMap.set(bestKey, { statuses: [], errors: [] });
            }

            const slot = timeSlotMap.get(bestKey)!;
            slot.statuses.push(run.status || "pending");
            if (run.error || run.lastError) {
              slot.errors.push(run.error || run.lastError || "");
            }
          });
          // Build per-time-slot status (a slot is "completed" only if ALL its services are completed)
          const slotStatuses: RunStatus[] = [];
          const slotErrors: string[] = [];

          // Sort time slots chronologically
          const sortedSlots = Array.from(timeSlotMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

          sortedSlots.forEach(([, slot]) => {
            const allCompleted = slot.statuses.every(s => s === "completed");
            const anyFailed = slot.statuses.some(s => s === "failed");
            const anyCancelled = slot.statuses.some(s => s === "cancelled");

            let slotStatus: RunStatus;
            if (allCompleted) {
              slotStatus = "completed";
            } else if (anyCancelled) {
              slotStatus = "cancelled";
            } else if (anyFailed) {
              slotStatus = "cancelled";
            } else {
              slotStatus = "pending";
            }

            slotStatuses.push(slotStatus);
            slotErrors.push(slot.errors.length > 0 ? slot.errors[0] : "");
          });

          // Trim to match frontend run count (in case of mismatch)
          const trimmedStatuses = slotStatuses.slice(0, frontendRunCount);
          const trimmedErrors = slotErrors.slice(0, frontendRunCount);

          // Pad if fewer slots than frontend runs
          while (trimmedStatuses.length < frontendRunCount) {
            trimmedStatuses.push("pending");
            trimmedErrors.push("");
          }

          const trimmedRetries = runRetries.slice(0, frontendRunCount);
          const trimmedOriginalTimes = runOriginalTimes.slice(0, frontendRunCount);
          const trimmedCurrentTimes = runCurrentTimes.slice(0, frontendRunCount);
          const trimmedReasons = runReasons.slice(0, frontendRunCount);

          while (trimmedRetries.length < frontendRunCount) trimmedRetries.push(0);
          while (trimmedOriginalTimes.length < frontendRunCount) trimmedOriginalTimes.push("");
          while (trimmedCurrentTimes.length < frontendRunCount) trimmedCurrentTimes.push("");
          while (trimmedReasons.length < frontendRunCount) trimmedReasons.push("");

          // Build actualExecutedTimes per time slot (from VIEWS runs)
          const trimmedActualExecutedTimes: string[] = sortedSlots.map(([key]) => {
            const viewsRun = viewsRuns.find(vr => {
              const timeKey = vr.time ? new Date(vr.time).toISOString().slice(0, 16) : "unknown";
              return timeKey === key;
            });
            return (viewsRun as any)?.actualExecutedAt || "";
          }).slice(0, frontendRunCount);

          while (trimmedActualExecutedTimes.length < frontendRunCount) trimmedActualExecutedTimes.push("");

          const slotCompletedCount = trimmedStatuses.filter(s => s === "completed").length;

          // Determine order status from trimmed slot statuses
          let orderStatus: CreatedOrder["status"] = order.status;

          if (trimmedStatuses.length > 0) {
            const allCompleted = trimmedStatuses.every(s => s === "completed");
            const allCancelled = trimmedStatuses.every(s => s === "cancelled");

            if (allCompleted) {
              orderStatus = "completed";
            } else if (allCancelled) {
              orderStatus = "cancelled";
            } else if (order.status !== "completed" && order.status !== "cancelled" && order.status !== "failed") {
              orderStatus = "running";
            }
          }

          updates.push({
            orderId: order.id,
            data: {
              runRetries: trimmedRetries,
              runOriginalTimes: trimmedOriginalTimes,
              runCurrentTimes: trimmedCurrentTimes,
              runReasons: trimmedReasons,
              runStatuses: trimmedStatuses,
              runErrors: trimmedErrors,
              runActualExecutedTimes: trimmedActualExecutedTimes,
              completedRuns: slotCompletedCount,
              status: orderStatus,
              lastUpdatedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error(`[Sync] Failed to sync order ${order.id}:`, error);
        }
      }

      if (updates.length > 0) {
        persistOrders((prev) =>
          prev.map((order) => {
            const update = updates.find((u) => u.orderId === order.id);
            return update ? { ...order, ...update.data } : order;
          })
        );
        console.log(`[Sync] ✅ Updated ${updates.length} orders`);
      }
    } catch (error) {
      console.error('[Sync] Error:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [persistOrders]);

  // Auto-sync every 5 MINUTES (300 seconds) - Only when on Orders page
  useEffect(() => {
    // Only sync when on orders or dashboard page
    if (activePage !== 'orders' && activePage !== 'dashboard') {
      console.log('[Sync] Not on orders/dashboard page, skipping sync setup');
      return;
    }

    console.log('[Sync] Setting up 5-minute auto-sync...');

    // Initial sync after 10 seconds
    const initialSync = setTimeout(() => {
      syncOrdersWithBackend();
    }, 10000);

    // Then sync every 5 minutes
    const interval = setInterval(() => {
      syncOrdersWithBackend();
    }, 300000); // 5 MINUTES (300,000 milliseconds)

    return () => {
      clearTimeout(initialSync);
      clearInterval(interval);
    };
  }, [activePage, syncOrdersWithBackend]); // Only re-setup when page changes

  const content = useMemo(() => {
    if (activePage === "approval") {
      return (
        <ApprovalPage
          apis={apis}
          approvalBundles={approvalBundles}
          onCreateOrder={(order) => {
            persistOrders((prev) => [order, ...prev]);
          }}
          onNavigateToOrders={(notice) => {
            if (notice) setOrdersNotice(notice);
            navigateToPage("orders");
          }}
        />
      );
    }
    if (activePage === "new-order") {
      return (
        <NewOrderPage
          apis={apis}
          bundles={bundles}
          orders={orders}
          prefillOrder={cloneSourceOrder}
          onCreateOrder={(order) => {
            persistOrders((prev) => [order, ...prev]);
          }}
          onNavigateToOrders={(notice) => {
            if (notice) setOrdersNotice(notice);
            navigateToPage("orders");
          }}
        />
      );
    }
    if (activePage === "dashboard") {
      return (
        <DashboardPage
          orders={orders}
          onDeleteOrder={(orderId) => {
            persistOrders((prev) => prev.filter((order) => order.id !== orderId));
          }}
        />
      );
    }
    if (activePage === "orders") {
      return (
        <OrdersPage
          orders={orders}
          notice={ordersNotice}
          controllingOrderId={controllingOrderId}
          apis={apis}
          bundles={bundles}
          onCloneOrder={(order) => {
            setCloneSourceOrder(order);
            navigateToPage("new-order");
          }}
          onControlOrder={async (order, action) => {
            const applyLocalUpdate = (nextStatus: CreatedOrder["status"]) => {
              persistOrders((prev) =>
                prev.map((item) => {
                  if (item.id !== order.id) return item;
                  if (nextStatus === "cancelled") {
                    const nextRunStatuses = item.runStatuses.map((status) => (status === "pending" || status === "retrying" ? "cancelled" : status));
                    const completedRuns = nextRunStatuses.filter((status) => status === "completed").length;
                    return {
                      ...item,
                      status: nextStatus,
                      runStatuses: nextRunStatuses,
                      completedRuns,
                      lastUpdatedAt: new Date().toISOString(),
                    };
                  }
                  return {
                    ...item,
                    status: nextStatus,
                    lastUpdatedAt: new Date().toISOString(),
                  };
                })
              );
            };

            setControllingOrderId(order.id);
            try {
              if (order.schedulerOrderId) {
                const result = await updateOrderControl({
                  schedulerOrderId: order.schedulerOrderId,
                  action,
                });
                const nextStatus =
                  result.status || (action === "pause" ? "paused" : action === "resume" ? "running" : "cancelled");
                persistOrders((prev) =>
                  prev.map((item) => {
                    if (item.id !== order.id) return item;
                    return {
                      ...item,
                      status: nextStatus,
                      completedRuns: typeof result.completedRuns === "number" ? result.completedRuns : item.completedRuns,
                      runStatuses: result.runStatuses ?? item.runStatuses,
                      lastUpdatedAt: new Date().toISOString(),
                    };
                  })
                );
                // Sync immediately after control action
                setTimeout(() => syncOrdersWithBackend(), 2000);
              } else {
                applyLocalUpdate(action === "pause" ? "paused" : action === "resume" ? "running" : "cancelled");
              }
            } catch {
              applyLocalUpdate(action === "pause" ? "paused" : action === "resume" ? "running" : "cancelled");
            } finally {
              setControllingOrderId(null);
            }
          }}
          onDismissNotice={() => setOrdersNotice("")}
        />
      );
    }

    if (activePage === "notifications") {
      return (
        <NotificationsPage
          onUnreadCountChange={(count) => setNotifUnreadCount(count)}
          onNavigateToOrders={() => navigateToPage("orders")}
        />
      );
    }
    if (activePage === "comparison") {
      return <EngagementComparisonPage orders={orders} />;
    }
    if (activePage === "apis") {
      return (
        <APIsPage
          apis={apis}
          onAddApi={(api) => {
            const next: ApiPanel[] = [
              ...apis,
              {
                id: `api-${Date.now()}`,
                name: api.name,
                url: api.url,
                key: api.key,
                status: "Active",
                services: [],
              },
            ];
            persistApis(next);
          }}
          onEditApi={(id, api) => {
            const next: ApiPanel[] = apis.map((item) =>
              item.id === id
                ? { ...item, name: api.name, url: api.url, key: api.key }
                : item
            );
            persistApis(next);
          }}
          onDeleteApi={(id) => {
            const next = apis.filter((api) => api.id !== id);
            persistApis(next);
          }}
          onToggleStatus={(id) => {
            const next: ApiPanel[] = apis.map((api) =>
              api.id === id ? { ...api, status: api.status === "Active" ? "Inactive" : "Active" } : api
            );
            persistApis(next);
          }}
          onFetchServices={async (id) => {
            const targetApi = apis.find((api) => api.id === id);
            if (!targetApi) return;

            setFetchingApiId(id);
            try {
              const services = await fetchServices(targetApi.url, targetApi.key);
              const next = apis.map((api) =>
                api.id === id
                  ? {
                      ...api,
                      services,
                      lastFetchAt: new Date().toISOString(),
                      lastFetchError: undefined,
                    }
                  : api
              );
              persistApis(next);
            } catch (error) {
              const message = error instanceof Error ? error.message : "Failed to fetch services";
              const next = apis.map((api) =>
                api.id === id
                  ? {
                      ...api,
                      lastFetchError: message,
                    }
                  : api
              );
              persistApis(next);
            } finally {
              setFetchingApiId(null);
            }
          }}
          fetchingApiId={fetchingApiId}
        />
      );
    }
    return (
      <BundlesPage
        apis={apis}
        bundles={bundles}
        onAddBundle={(bundle) => {
          const next: Bundle[] = [
            ...bundles,
            {
              id: `bundle-${Date.now()}`,
              apiId: bundle.apiId,
              name: bundle.name,
              serviceIds: {
                views: bundle.views,
                likes: bundle.likes,
                shares: bundle.shares,
                saves: bundle.saves,
                comments: bundle.comments,
                reposts: bundle.reposts,
                likesPremium: bundle.likesPremium || undefined,
              },
              serviceApis: bundle.serviceApis,
            },
          ];
          persistBundles(next);
        }}
        onUpdateBundle={(id, bundle) => {
          const next: Bundle[] = bundles.map((item) =>
            item.id === id
              ? {
                  ...item,
                  apiId: bundle.apiId,
                  name: bundle.name,
                  serviceIds: {
                    views: bundle.views,
                    likes: bundle.likes,
                    shares: bundle.shares,
                    saves: bundle.saves,
                    comments: bundle.comments,
                    reposts: bundle.reposts,
                    likesPremium: bundle.likesPremium || undefined,
                  },
                  serviceApis: bundle.serviceApis,
                }
              : item
          );
          persistBundles(next);
        }}
        onDeleteBundle={(id) => {
          const next = bundles.filter((bundle) => bundle.id !== id);
          persistBundles(next);
        }}
        approvalBundles={approvalBundles}
        onApprovalBundlesChange={setApprovalBundles}
      />
    );
  }, [activePage, apis, bundles, approvalBundles, orders, fetchingApiId, controllingOrderId, ordersNotice, cloneSourceOrder, navigateToPage, persistOrders, persistApis, persistBundles, syncOrdersWithBackend]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r border-gray-800 bg-gray-950 md:flex">
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
          <span className="text-xl">🦇</span>
          <h1 className="text-sm font-bold tracking-wider text-yellow-400 uppercase">I AM BATMAN</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.key;
              const isAlert = item.key === "notifications" && notifUnreadCount > 0;
              return (
                <button
                  key={item.key}
                  onClick={() => navigateToPage(item.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition",
                    isActive
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                  )}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                  {isAlert && (
                    <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {notifUnreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-gray-800 px-3 py-3">
            <p className="text-[10px] italic leading-relaxed text-gray-600">
              "{batmanQuote}"
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/95 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🦇</span>
            <span className="text-xs font-bold tracking-wider text-yellow-400 uppercase">I AM BATMAN</span>
          </div>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => navigateToPage(item.key)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition",
                  activePage === item.key
                    ? "bg-yellow-500/10 text-yellow-400"
                    : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                )}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64">
        {content}
      </div>
    </div>
  );
}
