import { useMemo, useState } from "react";
import type { CreatedOrder } from "../types/order";

interface Props {
  orders: CreatedOrder[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getDelivered(order: CreatedOrder) {
  const runs = order.runs || [];
  const statuses = order.runStatuses || [];
  let views = 0, likes = 0, shares = 0, saves = 0, comments = 0, reposts = 0;
  runs.forEach((r, i) => {
    if (statuses[i] === "completed") {
      views    += r.views    || 0;
      likes    += r.likes    || 0;
      shares   += r.shares   || 0;
      saves    += r.saves    || 0;
      comments += r.comments || 0;
      reposts  += r.reposts  || 0;
    }
  });
  return { views, likes, shares, saves, comments, reposts };
}

function per10k(count: number, views: number) {
  if (views <= 0) return 0;
  return (count / views) * 10000;
}

function pct(count: number, views: number) {
  if (views <= 0) return 0;
  return (count / views) * 100;
}

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function fmtPct(n: number) {
  return n.toFixed(2) + "%";
}

function shortLink(link: string) {
  try {
    const u = new URL(link);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `…/${parts[parts.length - 2]}/${parts[parts.length - 1].slice(0, 10)}`;
    return u.hostname;
  } catch {
    return link.slice(0, 28);
  }
}

// ── Delta badge ───────────────────────────────────────────────────────────────
function Delta({ expected, actual }: { expected: number; actual: number }) {
  if (expected === 0 && actual === 0) return <span className="text-gray-700 text-xs">—</span>;
  if (expected === 0) return <span className="text-xs text-gray-500">—</span>;
  const diff = actual - expected;
  const diffPct = (diff / expected) * 100;
  const isGood = diff >= 0;
  return (
    <span className={`text-xs font-semibold ${isGood ? "text-emerald-400" : "text-red-400"}`}>
      {isGood ? "▲" : "▼"} {Math.abs(diffPct).toFixed(0)}%
    </span>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function Bar({
  expected,
  actual,
  max,
  color,
}: {
  expected: number;
  actual: number;
  max: number;
  color: string;
}) {
  const expW = max > 0 ? Math.min(100, (expected / max) * 100) : 0;
  const actW = max > 0 ? Math.min(100, (actual   / max) * 100) : 0;
  return (
    <div className="relative h-2 w-full rounded-full bg-gray-800">
      {/* expected — thin dashed line */}
      <div
        className="absolute top-0 h-full rounded-full opacity-30"
        style={{ width: `${expW}%`, background: color }}
      />
      {/* actual — solid */}
      <div
        className="absolute top-0 h-full rounded-full"
        style={{ width: `${actW}%`, background: color }}
      />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Metric = "likes" | "shares" | "saves" | "comments" | "reposts";
type SortKey = "name" | "views" | "likes" | "shares" | "saves" | "comments" | "reposts" | "completion";

const METRICS: { key: Metric; label: string; emoji: string; color: string }[] = [
  { key: "likes",    label: "Likes",    emoji: "❤️",  color: "#f472b6" },
  { key: "shares",   label: "Shares",   emoji: "🔄",  color: "#60a5fa" },
  { key: "saves",    label: "Saves",    emoji: "💾",  color: "#a78bfa" },
  { key: "comments", label: "Comments", emoji: "💬",  color: "#34d399" },
  { key: "reposts",  label: "Reposts",  emoji: "🔁",  color: "#fbbf24" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export function EngagementComparisonPage({ orders }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "running" | "cancelled">("all");

  // Build per-order rows
  const rows = useMemo(() => {
    return orders
      .filter((o) => {
        if (statusFilter !== "all" && o.status !== statusFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            o.link.toLowerCase().includes(q) ||
            (o.name || "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map((order) => {
        const del = getDelivered(order);
        const planned = order.engagement || { likes: 0, shares: 0, saves: 0, comments: 0, reposts: 0 };
        const plannedViews = order.totalViews || 0;
        const deliveredViews = del.views;

        const completedRuns = (order.runStatuses || []).filter((s) => s === "completed").length;
        const totalRuns     = (order.runs || []).length;
        const completion    = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;

        return {
          order,
          plannedViews,
          deliveredViews,
          completion,
          planned: {
            likes:    planned.likes    || 0,
            shares:   planned.shares   || 0,
            saves:    planned.saves    || 0,
            comments: planned.comments || 0,
            reposts:  planned.reposts  || 0,
          },
          delivered: {
            likes:    del.likes,
            shares:   del.shares,
            saves:    del.saves,
            comments: del.comments,
            reposts:  del.reposts,
          },
        };
      });
  }, [orders, statusFilter, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let va = 0, vb = 0;
      if (sortKey === "name")       { va = 0; vb = 0; }
      if (sortKey === "views")      { va = a.deliveredViews; vb = b.deliveredViews; }
      if (sortKey === "completion") { va = a.completion;     vb = b.completion; }
      if (sortKey === "likes")      { va = a.delivered.likes;    vb = b.delivered.likes; }
      if (sortKey === "shares")     { va = a.delivered.shares;   vb = b.delivered.shares; }
      if (sortKey === "saves")      { va = a.delivered.saves;    vb = b.delivered.saves; }
      if (sortKey === "comments")   { va = a.delivered.comments; vb = b.delivered.comments; }
      if (sortKey === "reposts")    { va = a.delivered.reposts;  vb = b.delivered.reposts; }
      if (sortKey === "name") {
        const na = a.order.name || a.order.link;
        const nb = b.order.name || b.order.link;
        return sortDir === "asc" ? na.localeCompare(nb) : nb.localeCompare(na);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [rows, sortKey, sortDir]);

  // Aggregates for summary cards
  const agg = useMemo(() => {
    const totalPlannedViews    = rows.reduce((s, r) => s + r.plannedViews, 0);
    const totalDeliveredViews  = rows.reduce((s, r) => s + r.deliveredViews, 0);
    const totalPlanned   = { likes: 0, shares: 0, saves: 0, comments: 0, reposts: 0 };
    const totalDelivered = { likes: 0, shares: 0, saves: 0, comments: 0, reposts: 0 };
    rows.forEach((r) => {
      (Object.keys(totalPlanned) as Metric[]).forEach((k) => {
        totalPlanned[k]   += r.planned[k];
        totalDelivered[k] += r.delivered[k];
      });
    });
    return { totalPlannedViews, totalDeliveredViews, totalPlanned, totalDelivered };
  }, [rows]);

  // max delivered per metric (for bar scaling)
  const maxDelivered = useMemo(() => {
    const out: Record<Metric, number> = { likes: 0, shares: 0, saves: 0, comments: 0, reposts: 0 };
    rows.forEach((r) => {
      (Object.keys(out) as Metric[]).forEach((k) => {
        if (r.delivered[k] > out[k]) out[k] = r.delivered[k];
      });
    });
    return out;
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setsSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  // fix the closure issue — we need the local setter
  function setsSortDir(fn: (d: "asc" | "desc") => "asc" | "desc") {
    setSortDir((d) => fn(d));
  }

  const SortTh = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-yellow-400 transition"
      onClick={() => toggleSort(k)}
    >
      {label}
      {sortKey === k && (
        <span className="ml-1 text-yellow-400">{sortDir === "desc" ? "↓" : "↑"}</span>
      )}
    </th>
  );

  if (orders.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <span className="text-5xl opacity-30">📊</span>
        <p className="text-gray-500">No orders yet. Create an order to see engagement comparison.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-20">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-white">Engagement Comparison</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Expected (planned) vs. actually delivered — per order.
        </p>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Views */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-2 rounded-xl border border-yellow-500/20 bg-gray-900/60 p-4">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">👁️ Views</p>
          <p className="text-2xl font-bold text-yellow-400">{fmt(agg.totalDeliveredViews)}</p>
          <p className="text-xs text-gray-600 mt-0.5">of {fmt(agg.totalPlannedViews)} planned</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-yellow-500"
              style={{ width: `${agg.totalPlannedViews > 0 ? Math.min(100, (agg.totalDeliveredViews / agg.totalPlannedViews) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Per-metric summary */}
        {METRICS.map((m) => (
          <div key={m.key} className="rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">{m.emoji} {m.label}</p>
            <p className="text-lg font-bold text-white">{fmt(agg.totalDelivered[m.key])}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">of {fmt(agg.totalPlanned[m.key])}</p>
            <Delta expected={agg.totalPlanned[m.key]} actual={agg.totalDelivered[m.key]} />
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or link…"
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2 pl-9 pr-3 text-sm text-gray-200 outline-none placeholder-gray-600 focus:border-yellow-500/40"
          />
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-0.5">
          {(["all", "completed", "running", "cancelled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === s
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-600">{sorted.length} order{sorted.length !== 1 ? "s" : ""}</p>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 py-14 text-center text-sm text-gray-600">
          No orders match your filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-black">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-800 bg-gray-900/80">
                <tr>
                  <SortTh label="Order"      k="name" />
                  <SortTh label="Completion" k="completion" />
                  <SortTh label="Views"      k="views" />
                  <SortTh label="❤️ Likes"   k="likes" />
                  <SortTh label="🔄 Shares"  k="shares" />
                  <SortTh label="💾 Saves"   k="saves" />
                  <SortTh label="💬 Comments" k="comments" />
                  <SortTh label="🔁 Reposts" k="reposts" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {sorted.map(({ order, plannedViews, deliveredViews, completion, planned, delivered }) => {
                  const isComplete = order.status === "completed";
                  const isCancelled = order.status === "cancelled" || order.status === "failed";

                  return (
                    <tr
                      key={order.id}
                      className="transition hover:bg-gray-900/50"
                    >
                      {/* Order name + link */}
                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="truncate font-medium text-white text-xs">
                          {order.name || `Order #${order.id.slice(-6)}`}
                        </p>
                        <p className="truncate text-[10px] text-gray-600 font-mono mt-0.5">
                          {shortLink(order.link)}
                        </p>
                        <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                          isComplete  ? "bg-emerald-500/15 text-emerald-400" :
                          isCancelled ? "bg-red-500/15 text-red-400" :
                                        "bg-yellow-500/15 text-yellow-400"
                        }`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Completion */}
                      <td className="px-3 py-3 w-28">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-800">
                            <div
                              className="h-full rounded-full bg-yellow-500/70"
                              style={{ width: `${Math.min(100, completion)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right">{Math.round(completion)}%</span>
                        </div>
                      </td>

                      {/* Views */}
                      <td className="px-3 py-3 w-28">
                        <p className="font-semibold text-yellow-400">{fmt(deliveredViews)}</p>
                        <p className="text-[10px] text-gray-600">of {fmt(plannedViews)}</p>
                      </td>

                      {/* Per metric */}
                      {METRICS.map((m) => {
                        const exp = planned[m.key];
                        const act = delivered[m.key];
                        const expRate = per10k(exp, plannedViews);
                        const actRate = per10k(act, deliveredViews);
                        return (
                          <td key={m.key} className="px-3 py-3 w-36">
                            <div className="space-y-1">
                              {/* Numbers */}
                              <div className="flex items-baseline justify-between gap-1">
                                <span className="font-semibold text-white">{fmt(act)}</span>
                                <span className="text-[10px] text-gray-600">of {fmt(exp)}</span>
                              </div>
                              {/* Bar */}
                              <Bar
                                expected={exp}
                                actual={act}
                                max={Math.max(maxDelivered[m.key], 1)}
                                color={m.color}
                              />
                              {/* Per-10k rates */}
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-gray-600">
                                  {actRate.toFixed(0)}/10k
                                </span>
                                <Delta expected={expRate} actual={actRate} />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table footer with totals ── */}
          {sorted.length > 1 && (
            <div className="border-t border-gray-800 bg-gray-900/60 px-3 py-2">
              <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-500">
                <span className="font-semibold text-gray-400">Totals ({sorted.length} orders)</span>
                <span>👁️ {fmt(sorted.reduce((s, r) => s + r.deliveredViews, 0))} views delivered</span>
                {METRICS.map((m) => (
                  <span key={m.key}>
                    {m.emoji} {fmt(sorted.reduce((s, r) => s + r.delivered[m.key], 0))}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Per-metric engagement rate summary ──────────────────────────── */}
      {agg.totalDeliveredViews > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            📐 Overall Engagement Rates (delivered)
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-5">
            {METRICS.map((m) => {
              const rate = pct(agg.totalDelivered[m.key], agg.totalDeliveredViews);
              const expRate = pct(agg.totalPlanned[m.key], agg.totalPlannedViews);
              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{m.emoji} {m.label}</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: m.color }}>
                    {fmtPct(rate)}
                  </p>
                  <p className="text-[10px] text-gray-600">expected {fmtPct(expRate)}</p>
                  <Delta expected={expRate} actual={rate} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-8 rounded-full bg-gray-600 opacity-30" /> Expected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-8 rounded-full bg-gray-400" /> Delivered
        </span>
        <span className="text-emerald-400">▲ = over-delivered</span>
        <span className="text-red-400">▼ = under-delivered</span>
      </div>

    </div>
  );
}
