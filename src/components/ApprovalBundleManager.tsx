import { useState } from "react";
import type { ApiPanel, ApiService } from "../types/order";

export interface ApprovalBundle {
  id: string;
  name: string;
  apiId: string;
  viewsServiceId: string;
  viewsServiceIds?: string[]; // 🔥 NEW: up to 3 rotating views service IDs
  likesServiceId: string;
  serviceApis?: {
    views?: string;
    likes?: string;
  };
}

interface Props {
  apis: ApiPanel[];
  bundles: ApprovalBundle[];
  onChange: (bundles: ApprovalBundle[]) => void;
}

const LS_KEY = "dev-smm-approval-bundles";

export function loadApprovalBundles(): ApprovalBundle[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveApprovalBundles(bundles: ApprovalBundle[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(bundles));
  } catch {}
}

function getApiServices(apis: ApiPanel[], apiId: string): ApiService[] {
  return apis.find((api) => api.id === apiId)?.services ?? [];
}

export function ApprovalBundleManager({ apis, bundles, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [apiId, setApiId] = useState("");
  const [viewsApiId, setViewsApiId] = useState("");
  const [likesApiId, setLikesApiId] = useState("");
  const [viewsServiceIds, setViewsServiceIds] = useState<string[]>(["", "", ""]);
  const [likesServiceId, setLikesServiceId] = useState("");

  const selectedApi = apis.find((a) => a.id === apiId);
  const selectedViewsApi = apis.find((a) => a.id === (viewsApiId || apiId));
  const selectedLikesApi = apis.find((a) => a.id === (likesApiId || apiId));
  const viewsServices = selectedViewsApi?.services ?? [];
  const likesServices = selectedLikesApi?.services ?? [];

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setApiId("");
    setViewsApiId("");
    setLikesApiId("");
    setViewsServiceIds(["", "", ""]);
    setLikesServiceId("");
  };

  const startEdit = (bundle: ApprovalBundle) => {
    setEditingId(bundle.id);
    setName(bundle.name);
    setApiId(bundle.apiId);
    setViewsApiId(bundle.serviceApis?.views ?? "");
    setLikesApiId(bundle.serviceApis?.likes ?? "");
    setViewsServiceIds([
      bundle.viewsServiceIds?.[0] ?? bundle.viewsServiceId ?? "",
      bundle.viewsServiceIds?.[1] ?? "",
      bundle.viewsServiceIds?.[2] ?? "",
    ]);
    setLikesServiceId(bundle.likesServiceId);
  };

  const handleSave = () => {
    if (!name.trim() || !apiId || !likesServiceId.trim()) return;

    // Collect non-empty rotating views IDs (dedup, preserve order)
    const rotIds = viewsServiceIds.map((s) => s.trim()).filter(Boolean);
    const firstViewsId = rotIds[0] || "";
    if (!firstViewsId) return;

    const next: ApprovalBundle = {
      id: editingId ?? `ab-${Date.now()}`,
      name: name.trim(),
      apiId,
      viewsServiceId: firstViewsId,
      viewsServiceIds: rotIds.length > 1 ? rotIds : undefined,
      likesServiceId: likesServiceId.trim(),
      serviceApis: {
        views: viewsApiId || undefined,
        likes: likesApiId || undefined,
      },
    };

    const updated = editingId
      ? bundles.map((b) => (b.id === editingId ? next : b))
      : [...bundles, next];
    onChange(updated);
    saveApprovalBundles(updated);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this approval bundle?")) return;
    const updated = bundles.filter((b) => b.id !== id);
    onChange(updated);
    saveApprovalBundles(updated);
    if (editingId === id) resetForm();
  };

  const activeRotatingCount = viewsServiceIds.filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gray-950 p-4">
        <h4 className="mb-3 text-sm font-bold text-emerald-300">
          {editingId ? "Edit Approval Bundle" : "New Approval Bundle"}
        </h4>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="block text-[11px] text-gray-400 sm:col-span-2">
            Bundle Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fast Views + Likes"
              className="mt-1 w-full rounded-lg border border-emerald-500/30 bg-black px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </label>

          <label className="block text-[11px] text-gray-400 sm:col-span-2">
            Default API Panel
            <select
              value={apiId}
              onChange={(e) => {
                setApiId(e.target.value);
                setViewsApiId("");
                setLikesApiId("");
                setViewsServiceIds(["", "", ""]);
                setLikesServiceId("");
              }}
              className="mt-1 w-full rounded-lg border border-emerald-500/30 bg-black px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="">Select API...</option>
              {apis.map((api) => (
                <option key={api.id} value={api.id}>
                  {api.name}
                </option>
              ))}
            </select>
          </label>

          {/* Views Section */}
          <div className="sm:col-span-2 rounded-xl border border-yellow-500/15 bg-black/40 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70">
              👁️ Views (up to 3 rotating services)
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="mb-1 block text-[10px] text-gray-600">API Panel</label>
                <select
                  value={viewsApiId || apiId}
                  onChange={(e) => {
                    setViewsApiId(e.target.value === apiId ? "" : e.target.value);
                    setViewsServiceIds(["", "", ""]);
                  }}
                  disabled={!apiId}
                  className="w-full rounded-lg border border-yellow-500/20 bg-gray-950 px-2 py-1.5 text-xs text-gray-200 disabled:opacity-40"
                >
                  {apis.map((api) => (
                    <option key={api.id} value={api.id}>
                      {api.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-4">#{i + 1}</span>
                  <select
                    value={viewsServiceIds[i]}
                    onChange={(e) => {
                      const next = [...viewsServiceIds];
                      next[i] = e.target.value;
                      setViewsServiceIds(next);
                    }}
                    disabled={!apiId}
                    className="flex-1 rounded-lg border border-yellow-500/20 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none disabled:opacity-40"
                  >
                    <option value="">{i === 0 ? "Select primary service…" : "Add rotating service (optional)…"}</option>
                    {viewsServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {activeRotatingCount > 1 && (
              <p className="mt-1.5 text-[10px] text-yellow-400/80">
                🔄 Rotating: {activeRotatingCount} services will cycle run-by-run
              </p>
            )}
          </div>

          {/* Likes Section */}
          <div className="sm:col-span-2 rounded-xl border border-pink-500/15 bg-black/40 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-pink-500/70">
              ❤️ Likes
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] text-gray-600">API Panel</label>
                <select
                  value={likesApiId || apiId}
                  onChange={(e) => {
                    setLikesApiId(e.target.value === apiId ? "" : e.target.value);
                    setLikesServiceId("");
                  }}
                  disabled={!apiId}
                  className="w-full rounded-lg border border-pink-500/20 bg-gray-950 px-2 py-1.5 text-xs text-gray-200 disabled:opacity-40"
                >
                  {apis.map((api) => (
                    <option key={api.id} value={api.id}>
                      {api.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-gray-600">Likes Service</label>
                <select
                  value={likesServiceId}
                  onChange={(e) => setLikesServiceId(e.target.value)}
                  disabled={!apiId}
                  className="w-full rounded-lg border border-pink-500/20 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-pink-500/50 focus:outline-none disabled:opacity-40"
                >
                  <option value="">Select service...</option>
                  {likesServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim() || !apiId || !viewsServiceIds[0] || !likesServiceId}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            {editingId ? "💾 Update" : "➕ Create"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-lg border border-gray-700 bg-black px-3 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {bundles.length === 0 ? (
        <p className="text-center text-xs text-gray-600">
          No approval bundles yet. Create one above.
        </p>
      ) : (
        <div className="grid gap-2">
          {bundles.map((bundle) => {
            const api = apis.find((a) => a.id === bundle.apiId);
            const viewsApi = apis.find((a) => a.id === (bundle.serviceApis?.views || bundle.apiId));
            const likesApi = apis.find((a) => a.id === (bundle.serviceApis?.likes || bundle.apiId));
            const rotCount = bundle.viewsServiceIds?.length ?? 1;
            return (
              <div
                key={bundle.id}
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-200">
                    {bundle.name}
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500">
                    API: {api?.name ?? "Unknown"}
                    {viewsApi && viewsApi.id !== bundle.apiId && (
                      <span className="text-yellow-400/70"> · Views via {viewsApi.name}</span>
                    )}
                    {likesApi && likesApi.id !== bundle.apiId && (
                      <span className="text-pink-400/70"> · Likes via {likesApi.name}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded border border-yellow-500/20 bg-yellow-500/5 px-1.5 py-0.5 text-yellow-400">
                      👁️ Views:{" "}
                      {rotCount > 1
                        ? `${rotCount} rotating`
                        : bundle.viewsServiceId}
                    </span>
                    <span className="rounded border border-pink-500/20 bg-pink-500/5 px-1.5 py-0.5 text-pink-400">
                      ❤️ Likes: {bundle.likesServiceId}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => startEdit(bundle)}
                    className="rounded-md border border-gray-700 bg-black px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(bundle.id)}
                    className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
