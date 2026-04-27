import { useEffect, useState, useMemo } from "react";
import {
  fetchNotifications,
  markNotificationsRead,
  clearAllNotifications,
  type NotificationItem,
} from "../utils/api";

interface NotificationsPageProps {
  onUnreadCountChange?: (count: number) => void;
  onNavigateToOrders?: () => void;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: "🔴",
    bg: "border-red-500/20 bg-red-500/5",
    title: "text-red-400",
    badge: "bg-red-500/20 text-red-300",
    dot: "bg-red-400",
  },
  warning: {
    icon: "🟡",
    bg: "border-yellow-500/20 bg-yellow-500/5",
    title: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
    dot: "bg-yellow-400",
  },
  info: {
    icon: "🔵",
    bg: "border-blue-500/20 bg-blue-500/5",
    title: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
    dot: "bg-blue-400",
  },
};

const TYPE_ICONS: Record<string, string> = {
  run_failed: "❌",
  run_error: "💥",
  run_stuck: "⏳",
  run_stuck_queued: "📥",
  order_partial_failure: "⚠️",
  server_restart: "🔄",
  duplicate_blocked: "🔗",
  scheduler_skipped: "⏭️",
  run_waiting: "⏸️",
  run_skipped: "⏭️",
  provider_auto_cancelled: "🛠️",
  run_overlap_info: "ℹ️",
  run_retrying: "🔁",
};

type FilterType = "all" | "critical" | "warning" | "info";

// Cache for order info
const orderInfoCache = new Map<string, { name: string; link: string }>();

async function fetchOrderInfo(schedulerOrderId: string): Promise<{ name: string; link: string }> {
  if (orderInfoCache.has(schedulerOrderId)) {
    return orderInfoCache.get(schedulerOrderId)!;
  }
  try {
    const BACKEND_BASE_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim() || "https://backend-new-6tzb.onrender.com";
    const response = await fetch(`${BACKEND_BASE_URL}/api/order/status/${schedulerOrderId}`);
    if (response.ok) {
      const data = await response.json();
      const info = {
        name: data.name || schedulerOrderId.slice(0, 20),
        link: data.link || "",
      };
      orderInfoCache.set(schedulerOrderId, info);
      return info;
    }
  } catch {}
  return { name: schedulerOrderId.slice(0, 20), link: "" };
}

// Group notifications by schedulerOrderId
function groupNotifications(notifications: NotificationItem[]) {
  const groups = new Map<string, NotificationItem[]>();
  const noOrder: NotificationItem[] = [];

  notifications.forEach((n) => {
    if (n.schedulerOrderId) {
      if (!groups.has(n.schedulerOrderId)) {
        groups.set(n.schedulerOrderId, []);
      }
      groups.get(n.schedulerOrderId)!.push(n);
    } else {
      noOrder.push(n);
    }
  });

  return { groups, noOrder };
}

export function NotificationsPage({ onUnreadCountChange, onNavigateToOrders }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orderInfos, setOrderInfos] = useState<Record<string, { name: string; link: string }>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loadNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchNotifications(200);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      onUnreadCountChange?.(data.unreadCount);

      const uniqueIds = [...new Set(
        data.notifications
          .filter(n => n.schedulerOrderId)
          .map(n => n.schedulerOrderId!)
      )];

      const infoMap: Record<string, { name: string; link: string }> = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          infoMap[id] = await fetchOrderInfo(id);
        })
      );
      setOrderInfos(infoMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredNotifications = useMemo(() => {
    const visible = notifications.filter((n) => n.type !== "order_cancelled");
    if (filter === "all") return visible;
    return visible.filter((n) => n.severity === filter);
  }, [notifications, filter]);

  const { groups, noOrder } = useMemo(() => groupNotifications(filteredNotifications), [filteredNotifications]);

  const stats = useMemo(() => ({
    critical: notifications.filter((n) => n.severity === "critical").length,
    warning: notifications.filter((n) => n.severity === "warning").length,
    info: notifications.filter((n) => n.severity === "info").length,
  }), [notifications]);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleMarkGroupRead = async (notifIds: string[]) => {
    try {
      await Promise.all(notifIds.map(id => markNotificationsRead(id)));
      setNotifications((prev) =>
        prev.map((n) => notifIds.includes(n._id) ? { ...n, read: true } : n)
      );
      const readCount = notifIds.length;
      setUnreadCount((prev) => Math.max(0, prev - readCount));
      onUnreadCountChange?.(Math.max(0, unreadCount - readCount));
    } catch (err) {
      console.error("Failed to mark group as read:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      onUnreadCountChange?.(0);
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear:", err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString();
  };

  const getWorstSeverity = (notifs: NotificationItem[]): "critical" | "warning" | "info" => {
    if (notifs.some(n => n.severity === "critical")) return "critical";
    if (notifs.some(n => n.severity === "warning")) return "warning";
    return "info";
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Single compact notification row
  const NotifRow = ({ notif }: { notif: NotificationItem }) => {
    const config = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
    const typeIcon = TYPE_ICONS[notif.type] || "📋";
    return (
      <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[10px] ${config.bg} ${!notif.read ? "ring-1 ring-yellow-500/20" : "opacity-60"}`}>
        <span className="flex-shrink-0 mt-0.5">{typeIcon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`font-semibold ${config.title}`}>{notif.title}</span>
            {notif.label && <span className="rounded bg-gray-800 px-1 py-0.5 text-[9px] text-gray-500">{notif.label}</span>}
            {notif.smmOrderId && <span className="text-gray-600">#{notif.smmOrderId}</span>}
            {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />}
          </div>
          <p className="text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
        </div>
        <span className="text-gray-700 flex-shrink-0">{formatTime(notif.createdAt)}</span>
      </div>
    );
  };

  // Order group card
  const OrderGroup = ({ schedulerOrderId, notifs }: { schedulerOrderId: string; notifs: NotificationItem[] }) => {
    const info = orderInfos[schedulerOrderId];
    const severity = getWorstSeverity(notifs);
    const config = SEVERITY_CONFIG[severity];
    const unreadInGroup = notifs.filter(n => !n.read).length;
    const isExpanded = expandedGroups.has(schedulerOrderId);
    const sortedNotifs = [...notifs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestTime = formatTime(sortedNotifs[0].createdAt);

    return (
      <div className={`rounded-lg border ${config.bg} overflow-hidden`}>
        {/* Group Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition"
          onClick={() => toggleGroup(schedulerOrderId)}
        >
          <span className="text-sm flex-shrink-0">{config.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold ${config.title} truncate`}>
                {info?.name || schedulerOrderId.slice(0, 25)}
              </span>
              {unreadInGroup > 0 && (
                <span className="rounded-full bg-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
                  {unreadInGroup} new
                </span>
              )}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${config.badge}`}>
                {notifs.length} alerts
              </span>
            </div>
            {info?.link && (
              <p className="text-[9px] text-gray-600 truncate mt-0.5">{info.link}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] text-gray-600">{latestTime}</span>
            {/* Go to order button */}
            {onNavigateToOrders && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToOrders();
                }}
                title="Go to Orders page"
                className="rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[9px] text-yellow-400 hover:bg-yellow-500/20 transition"
              >
                📦 Orders
              </button>
            )}
            {unreadInGroup > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkGroupRead(notifs.filter(n => !n.read).map(n => n._id));
                }}
                className="rounded border border-gray-700 bg-black px-2 py-0.5 text-[9px] text-gray-400 hover:text-white transition"
              >
                ✓
              </button>
            )}
            <span className="text-gray-600 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Expanded notifications */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
            {sortedNotifs.map(n => <NotifRow key={n._id} notif={n} />)}
          </div>
        )}
      </div>
    );
  };

  // System/no-order notification
  const SystemNotifRow = ({ notif }: { notif: NotificationItem }) => {
    const config = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
    const typeIcon = TYPE_ICONS[notif.type] || "📋";
    return (
      <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[10px] ${config.bg} ${!notif.read ? "ring-1 ring-yellow-500/20" : "opacity-60"}`}>
        <span className="flex-shrink-0 mt-0.5">{typeIcon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`font-semibold ${config.title}`}>{notif.title}</span>
            <span className={`rounded-full px-1 py-0.5 text-[8px] ${config.badge}`}>{notif.severity}</span>
            {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />}
          </div>
          <p className="text-gray-500 mt-0.5">{notif.message}</p>
        </div>
        <span className="text-gray-700 flex-shrink-0">{formatTime(notif.createdAt)}</span>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔔</span>
          <h2 className="text-lg font-bold tracking-tight text-yellow-400">Alerts</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-xs font-bold text-red-300">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button type="button" onClick={handleMarkAllRead}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 transition">
              ✓ All read
            </button>
          )}
          <button type="button" onClick={loadNotifications}
            className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-xs text-yellow-300 hover:bg-yellow-500/20 transition">
            🔄
          </button>
        </div>
      </div>

      {/* Filter tabs — compact */}
      <div className="flex gap-2">
        {[
          { key: "all" as FilterType, label: "All", count: notifications.filter(n => n.type !== "order_cancelled").length, color: "text-white" },
          { key: "critical" as FilterType, label: "🔴", count: stats.critical, color: "text-red-400" },
          { key: "warning" as FilterType, label: "🟡", count: stats.warning, color: "text-yellow-400" },
          { key: "info" as FilterType, label: "🔵", count: stats.info, color: "text-blue-400" },
        ].map((item) => (
          <button key={item.key} type="button" onClick={() => setFilter(item.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition flex items-center gap-1 ${
              filter === item.key
                ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                : "border-gray-800 bg-black text-gray-500 hover:border-yellow-500/30"
            }`}>
            <span className={item.color}>{item.label}</span>
            <span className="text-gray-600">{item.count}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const allGroupIds = Array.from(groups.keys());
            if (expandedGroups.size === allGroupIds.length) {
              setExpandedGroups(new Set());
            } else {
              setExpandedGroups(new Set(allGroupIds));
            }
          }}
          className="ml-auto rounded-lg border border-gray-800 bg-black px-3 py-1.5 text-xs text-gray-500 hover:text-yellow-400 transition"
        >
          {expandedGroups.size > 0 ? "▲ Collapse all" : "▼ Expand all"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">❌ {error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-500 border-t-transparent" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-yellow-500/30 bg-black py-12">
          <span className="text-3xl">✅</span>
          <p className="mt-3 text-sm font-medium text-yellow-400">All clear!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Order-grouped notifications */}
          {Array.from(groups.entries())
            .sort((a, b) => {
              // Sort by: unread first, then by worst severity, then by latest notif time
              const aUnread = a[1].some(n => !n.read);
              const bUnread = b[1].some(n => !n.read);
              if (aUnread !== bUnread) return aUnread ? -1 : 1;
              const severityOrder = { critical: 0, warning: 1, info: 2 };
              const aSev = severityOrder[getWorstSeverity(a[1])];
              const bSev = severityOrder[getWorstSeverity(b[1])];
              if (aSev !== bSev) return aSev - bSev;
              const aTime = Math.max(...a[1].map(n => new Date(n.createdAt).getTime()));
              const bTime = Math.max(...b[1].map(n => new Date(n.createdAt).getTime()));
              return bTime - aTime;
            })
            .map(([id, notifs]) => (
              <OrderGroup key={id} schedulerOrderId={id} notifs={notifs} />
            ))}

          {/* System notifications with no order */}
          {noOrder.length > 0 && (
            <div className="space-y-1.5">
              {noOrder.length > 1 && (
                <p className="text-[10px] text-gray-600 px-1">🖥️ System events</p>
              )}
              {noOrder
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(n => <SystemNotifRow key={n._id} notif={n} />)}
            </div>
          )}
        </div>
      )}

      {/* Clear section */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2">
          <p className="text-[10px] text-orange-400/70">🧹 Clear all notifications permanently</p>
          {!showClearConfirm ? (
            <button type="button" onClick={() => setShowClearConfirm(true)}
              className="rounded border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-[10px] text-orange-200 hover:bg-orange-500/20 transition">
              Clear All
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleClearAll}
                className="rounded border border-red-500 bg-red-500/30 px-2 py-1 text-[10px] text-red-100 hover:bg-red-500/50 transition">
                ✓ Confirm
              </button>
              <button type="button" onClick={() => setShowClearConfirm(false)}
                className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-[10px] text-gray-300 transition">
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
