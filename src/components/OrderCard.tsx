import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CreatedOrder, OrderStatus } from "../types/order";
import { RunTable } from "./RunTable";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface OrderCardProps {
  order: CreatedOrder;
  onControl: (order: CreatedOrder, action: "pause" | "resume" | "cancel") => void;
  onClone: (order: CreatedOrder) => void;
  controlBusy: boolean;
}

const statusColor: Record<OrderStatus, string> = {
  running: "text-yellow-300",
  paused: "text-amber-300",
  cancelled: "text-red-300",
  completed: "text-emerald-300",
  processing: "text-yellow-300",
  failed: "text-red-300",
};

export function OrderCard({ order, onControl, onClone, controlBusy }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const safeRuns = order?.runs || [];
  const safeRunStatuses = order?.runStatuses || [];
  const safeRunErrors = order?.runErrors || [];
  const finishTime = safeRuns[safeRuns.length - 1]?.at;

  // 🔥 FIX: Only use actual backend status, not time-based
    const { totalRuns, completedRuns, progressPercent } = useMemo(() => {
    const nextTotalRuns = Math.max(1, safeRuns.length);

    // 🔥 FIX: ONLY use runStatuses as source of truth
    const completedFromStatuses = safeRunStatuses.filter(
      (status) => status === "completed"
    ).length;

    // If order status is "completed" from backend, trust it
    const nextCompletedRuns = order.status === "completed"
      ? nextTotalRuns
      : Math.min(nextTotalRuns, completedFromStatuses);

    const nextProgressPercent = Math.round((nextCompletedRuns / nextTotalRuns) * 100);
    return {
      totalRuns: nextTotalRuns,
      completedRuns: nextCompletedRuns,
      progressPercent: nextProgressPercent,
    };
  }, [safeRuns, safeRunStatuses, order.status]);

  // 🔥 FIX: effectiveStatus no longer uses nowMs (time-based)
  const effectiveStatus = useMemo(() => {
    if (order.status === "processing") return "running";
    if (order.status === "completed") return "completed";
    if (order.status === "cancelled") return "cancelled";
    if (order.status === "failed") return "failed";
    if (order.status === "paused") return "paused";
    return order.status;
  }, [order.status]);

  // 🔥 Chart uses plannedData only (cumulative per run)
  const plannedData = useMemo(() => {
    const runs = order.runs || [];
    return runs.map((run) => ({
      time: run.at,
      views: run.cumulativeViews || 0,
      likes: (run.cumulativeLikes || 0) * 10,
      shares: (run.cumulativeShares || 0) * 10,
      saves: (run.cumulativeSaves || 0) * 10,
      comments: (run.cumulativeComments || 0) * 10,
    }));
  }, [order.runs]);

  const shortLink =
    order.link.length > 56
      ? `${order.link.slice(0, 36)}...${order.link.slice(-14)}`
      : order.link;

  const handleControl = async (action: "pause" | "resume" | "cancel") => {
    try {
      if (action === "cancel") {
        const confirmCancel = window.confirm(
          "Are you sure you want to cancel this mission?"
        );
        if (!confirmCancel) return;
      }
      onControl(order, action);
    } catch (err) {
      console.error("Control action failed", err);
      alert("Action failed. Please try again.");
    }
  };

  return (
    <article className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-600">Mission ID</p>
          <h3 className="text-lg font-semibold text-yellow-400">{order.id}</h3>
          <p className="text-sm text-yellow-300">{order.name || `Mission #${order.id}`}</p>
          <p
            className="max-w-xl truncate text-sm text-gray-500"
            title={order.link || "No link provided"}
          >
            {shortLink || "No link provided"}
          </p>
          {order.schedulerOrderId && (
            <p className="text-xs text-gray-600 font-mono">
              Scheduler: {order.schedulerOrderId}
            </p>
          )}
        </div>
        <div className="space-y-2 text-right">
          <p className="text-sm text-gray-500">
            Panel ID:{" "}
            <span className="font-semibold text-yellow-300">{order.smmOrderId}</span>
          </p>
          <p className="text-sm text-gray-500">
            Service:{" "}
            <span className="font-semibold text-gray-300">{order.serviceId}</span>
          </p>
          <p className="text-sm text-gray-500">
            Quantity:{" "}
            <span className="font-semibold text-gray-300">{order.totalViews}</span>
          </p>
          <p className="text-sm text-gray-500">
            Status:{" "}
            <span className={`font-semibold ${statusColor[effectiveStatus]}`}>
              {effectiveStatus}
            </span>
          </p>
          {order.errorMessage && (
            <p className="text-xs text-red-400">Error: {order.errorMessage}</p>
          )}
          {finishTime && (
            <p className="text-xs text-gray-600">
              ETA: {finishTime.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-gray-600">
            Updated:{" "}
            {new Date(order.lastUpdatedAt || order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {completedRuns} / {totalRuns} runs completed
        </p>

        {/* Chart */}
        <div className="mt-4 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plannedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111" opacity={0.3} />
              <XAxis
                dataKey="time"
                stroke="#666"
                tickFormatter={(time) => {
                  const d = new Date(time);
                  return (
                    d.getHours() +
                    ":" +
                    String(d.getMinutes()).padStart(2, "0")
                  );
                }}
              />
              <YAxis stroke="#666" />
              <Tooltip
                formatter={(value, name) => {
                  if (String(name).startsWith("planned")) return null;
                  return [value, name];
                }}
              />
              {/* Planned faded lines */}
              <Line type="monotone" dataKey="views" stroke="#3b82f6" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-views" />
              <Line type="monotone" dataKey="likes" stroke="#ec4899" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-likes" />
              <Line type="monotone" dataKey="shares" stroke="#22c55e" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-shares" />
              <Line type="monotone" dataKey="saves" stroke="#eab308" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-saves" />
              <Line type="monotone" dataKey="comments" stroke="#a855f7" opacity={0.1} dot={false} strokeDasharray="5 5" name="planned-comments" />
              {/* Solid lines */}
              <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="shares" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="saves" stroke="#eab308" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="comments" stroke="#a855f7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={controlBusy || effectiveStatus !== "running"}
          onClick={() => handleControl("pause")}
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pause
        </button>
        <button
          type="button"
          disabled={controlBusy || effectiveStatus !== "paused"}
          onClick={() => handleControl("resume")}
          className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Resume
        </button>
        <button
          type="button"
          disabled={
            controlBusy ||
            effectiveStatus === "cancelled" ||
            effectiveStatus === "completed"
          }
          onClick={() => handleControl("cancel")}
          className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onClone(order)}
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-300 transition hover:bg-yellow-500/20"
        >
          Clone
        </button>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="ml-auto text-sm text-yellow-400 hover:text-yellow-300"
        >
          {expanded ? "Hide Runs" : "View Runs"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <RunTable
              runs={safeRuns}
              runStatuses={safeRunStatuses}
              runErrors={safeRunErrors}
              runRetries={order.runRetries || []}
              runOriginalTimes={order.runOriginalTimes || []}
              runCurrentTimes={order.runCurrentTimes || []}
              runReasons={order.runReasons || []}
              mode="logs"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
