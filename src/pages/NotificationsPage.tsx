import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  fetchNotifications,
  markNotificationsRead,
  clearAllNotifications,
  type NotificationItem,
} from "../utils/api";

interface NotificationsPageProps {
  onUnreadCountChange?: (count: number) => void;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: "🔴",
    bg: "border-red-500/30 bg-red-500/5",
    title: "text-red-400",
    badge: "bg-red-500/20 text-red-300",
  },
  warning: {
    icon: "🟡",
    bg: "border-yellow-500/30 bg-yellow-500/5",
    title: "text-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  info: {
    icon: "🔵",
    bg: "border-blue-500/30 bg-blue-500/5",
    title: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
  },
};

const TYPE_ICONS: Record<string, string> = {
  run_failed: "❌",
  run_error: "💥",
  run_stuck: "⏳",
  run_stuck_queued: "📥",
  order_cancelled: "🚫",
  order_partial_failure: "⚠️",
  server_restart: "🔄",
  duplicate_blocked: "🔗",
  scheduler_skipped: "⏭️",
};

type FilterType = "all" | "critical" | "warning" | "info";

export function NotificationsPage({ onUnreadCountChange }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchNotifications(100);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      onUnreadCountChange?.(data.unreadCount);
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
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.severity === filter);
  }, [notifications, filter]);

  const stats = useMemo(() => ({
    critical: notifications.filter((n) => n.severity === "critical").length,
    warning: notifications.filter((n) => n.severity === "warning").length,
    info: notifications.filter((n) => n.severity === "info").length,
    unread: unreadCount,
  }), [notifications, unreadCount]);

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

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
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

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <h2 className="text-2xl font-bold tracking-tight text-yellow-400">Notifications</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-xs font-bold text-red-300">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">Errors, warnings, and system events</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              ✓ Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={loadNotifications}
            className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-300 hover:bg-yellow-500/20 transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "all" as FilterType, label: "All", count: notifications.length, color: "text-white" },
          { key: "critical" as FilterType, label: "Critical", count: stats.critical, color: "text-red-400" },
          { key: "warning" as FilterType, label: "Warning", count: stats.warning, color: "text-yellow-400" },
          { key: "info" as FilterType, label: "Info", count: stats.info, color: "text-blue-400" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-lg border px-3 py-2 text-center transition ${
              filter === item.key
                ? "border-yellow-500/50 bg-yellow-500/10"
                : "border-gray-800 bg-black hover:border-yellow-500/30"
            }`}
          >
            <p className={`text-xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-[10px] text-gray-500">{item.label}</p>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-400">❌ {error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-yellow-500/30 bg-black py-16">
          <span className="text-4xl">✅</span>
          <p className="mt-4 text-sm font-medium text-yellow-400">All clear!</p>
          <p className="mt-1 text-xs text-gray-600">No notifications to show</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notif, index) => {
            const config = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
            const typeIcon = TYPE_ICONS[notif.type] || "📋";

            return (
              <motion.div
                key={notif._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-xl border p-4 transition ${config.bg} ${
                  !notif.read ? "ring-1 ring-yellow-500/30" : "opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">{typeIcon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-semibold ${config.title}`}>{notif.title}</h4>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${config.badge}`}>
                          {notif.severity}
                        </span>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-400 leading-relaxed">{notif.message}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-600">
                        <span>{formatTime(notif.createdAt)}</span>
                        {notif.schedulerOrderId && (
                          <span className="font-mono">{notif.schedulerOrderId.slice(0, 20)}...</span>
                        )}
                        {notif.label && <span>{notif.label}</span>}
                        {notif.smmOrderId && <span>#{notif.smmOrderId}</span>}
                      </div>
                    </div>
                  </div>
                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkOneRead(notif._id)}
                      className="flex-shrink-0 rounded-md border border-gray-700 bg-black px-2 py-1 text-[10px] text-gray-400 hover:text-white transition"
                    >
                      ✓ Read
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-orange-300">🧹 Clear Notifications</h3>
              <p className="text-[10px] text-orange-400/60 mt-0.5">Delete all notifications permanently</p>
            </div>
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="rounded-lg border border-orange-500/50 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-200 hover:bg-orange-500/20 transition"
              >
                🗑️ Clear All
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-lg border border-red-500 bg-red-500/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-500/50 transition"
                >
                  ✓ Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition"
                >
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
