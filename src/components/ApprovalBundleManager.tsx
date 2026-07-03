import { useState } from "react";
import type { ApiPanel, ApiService } from "../types/order";

export interface ApprovalBundle {
  id: string;
  name: string;
  apiId: string;
  viewsServiceId: string;
  viewsServiceIds?: string[]; // up to 3 rotating views service IDs
  likesServiceId: string;
  likesServiceIds?: string[]; // up to 3 rotating likes service IDs
  serviceApis?: {
    views?: string;
    viewsServiceApis?: string[];
    likes?: string;
    likesServiceApis?: string[];
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

export function ApprovalBundleManager({ apis, bundles, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [apiId, setApiId] = useState("");
  const [viewsApiIds, setViewsApiIds] = useState<string[]>(["", "", ""]);
  const [likesApiIds, setLikesApiIds] = useState<string[]>(["", "", ""]);
  const [viewsServiceIds, setViewsServiceIds] = useState<string[]>(["", "", ""]);
  const [likesServiceIds, setLikesServiceIds] = useState<string[]>(["", "", ""]);
  const [viewsSearch, setViewsSearch] = useState("");
  const [likesSearch, setLikesSearch] = useState("");

  const selectedApi = apis.find((a) => a.id === apiId);
  const filterServices = (services: ApiService[], query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((service) =>
      service.id.toLowerCase().includes(q) ||
      service.name.toLowerCase().includes(q) ||
      String(service.min ?? "").includes(q) ||
      String(service.max ?? "").includes(q)
    );
  };
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setApiId("");
    setViewsApiIds(["", "", ""]);
    setLikesApiIds(["", "", ""]);
    setViewsServiceIds(["", "", ""]);
    setLikesServiceIds(["", "", ""]);
    setViewsSearch("");
    setLikesSearch("");
  };

  const startEdit = (bundle: ApprovalBundle) => {
    setEditingId(bundle.id);
    setName(bundle.name);
    setApiId(bundle.apiId);
    const savedViewApis = bundle.serviceApis?.viewsServiceApis || [];
    setViewsApiIds([
      savedViewApis[0] || bundle.serviceApis?.views || bundle.apiId,
      savedViewApis[1] || bundle.serviceApis?.views || bundle.apiId,
      savedViewApis[2] || bundle.serviceApis?.views || bundle.apiId,
    ]);
    const savedLikeApis = bundle.serviceApis?.likesServiceApis || [];
    setLikesApiIds([
      savedLikeApis[0] || bundle.serviceApis?.likes || bundle.apiId,
      savedLikeApis[1] || bundle.serviceApis?.likes || bundle.apiId,
      savedLikeApis[2] || bundle.serviceApis?.likes || bundle.apiId,
    ]);
    setViewsServiceIds([
      bundle.viewsServiceIds?.[0] ?? bundle.viewsServiceId ?? "",
      bundle.viewsServiceIds?.[1] ?? "",
      bundle.viewsServiceIds?.[2] ?? "",
    ]);
    setLikesServiceIds([
      bundle.likesServiceIds?.[0] ?? bundle.likesServiceId ?? "",
      bundle.likesServiceIds?.[1] ?? "",
      bundle.likesServiceIds?.[2] ?? "",
    ]);
    setViewsSearch("");
    setLikesSearch("");
  };

  const handleSave = () => {
    if (!name.trim() || !apiId) return;

    // Collect non-empty rotating IDs (dedup, preserve order)
    const rotIds = viewsServiceIds.map((s) => s.trim()).filter(Boolean);
    const likeRotIds = likesServiceIds.map((s) => s.trim()).filter(Boolean);
    const firstViewsId = rotIds[0] || "";
    const firstLikesId = likeRotIds[0] || "";
    if (!firstViewsId || !firstLikesId) return;

    const next: ApprovalBundle = {
      id: editingId ?? `ab-${Date.now()}`,
      name: name.trim(),
      apiId,
      viewsServiceId: firstViewsId,
      viewsServiceIds: rotIds.length > 1 ? rotIds : undefined,
      likesServiceId: firstLikesId,
      likesServiceIds: likeRotIds.length > 1 ? likeRotIds : undefined,
      serviceApis: {
        views: viewsApiIds[0] || apiId,
        viewsServiceApis: viewsServiceIds.map((sid, idx) => sid ? (viewsApiIds[idx] || apiId) : ""),
        likes: likesApiIds[0] || apiId,
        likesServiceApis: likesServiceIds.map((sid, idx) => sid ? (likesApiIds[idx] || apiId) : ""),
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
  const activeLikesRotatingCount = likesServiceIds.filter(Boolean).length;

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
                setViewsApiIds(["", "", ""]);
                setLikesApiIds(["", "", ""]);
                setViewsServiceIds(["", "", ""]);
                setLikesServiceIds(["", "", ""]);
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
              👁️ Views (up to 3 rotating services, any API panel)
            </p>
            <input
              value={viewsSearch}
              onChange={(e) => setViewsSearch(e.target.value)}
              placeholder="Search views service by ID, name, min or max..."
              disabled={!apiId}
              className="mb-2 w-full rounded-lg border border-yellow-500/20 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none disabled:opacity-40"
            />
            <div className="space-y-2">
              {[0, 1, 2].map((i) => {
                const rowApiId = viewsApiIds[i] || apiId;
                const rowApi = apis.find((a) => a.id === rowApiId);
                const rowServices = filterServices(rowApi?.services ?? [], viewsSearch);
                return (
                  <div key={i} className="grid grid-cols-[1fr_1.5fr] gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-gray-600">API #{i + 1}</label>
                      <select
                        value={rowApiId}
                        onChange={(e) => {
                          const nextApis = [...viewsApiIds];
                          nextApis[i] = e.target.value;
                          setViewsApiIds(nextApis);
                          const nextServices = [...viewsServiceIds];
                          nextServices[i] = "";
                          setViewsServiceIds(nextServices);
                        }}
                        disabled={!apiId}
                        className="w-full rounded-lg border border-yellow-500/20 bg-gray-950 px-2 py-1.5 text-xs text-gray-200 disabled:opacity-40"
                      >
                        {apis.map((api) => <option key={api.id} value={api.id}>{api.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-gray-600">Service #{i + 1}</label>
                      <select
                        value={viewsServiceIds[i]}
                        onChange={(e) => {
                          const next = [...viewsServiceIds];
                          next[i] = e.target.value;
                          setViewsServiceIds(next);
                        }}
                        disabled={!apiId}
                        className="w-full rounded-lg border border-yellow-500/20 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-yellow-500/50 focus:outline-none disabled:opacity-40"
                      >
                        <option value="">{i === 0 ? "Select primary service…" : "Add rotating service (optional)…"}</option>
                        {rowServices.map((svc) => (
                          <option key={svc.id} value={svc.id}>{svc.id} — {svc.name} {svc.min ? `(min ${svc.min})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            {activeRotatingCount > 1 && (
              <p className="mt-1.5 text-[10px] text-yellow-400/80">
                🔄 Rotating: {activeRotatingCount} services can use different API panels
              </p>
            )}
          </div>

          {/* Likes Section */}
          <div className="sm:col-span-2 rounded-xl border border-pink-500/15 bg-black/40 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-pink-500/70">
              ❤️ Likes (up to 3 rotating services, any API panel)
            </p>
            <input
              value={likesSearch}
              onChange={(e) => setLikesSearch(e.target.value)}
              placeholder="Search likes service by ID, name, min or max..."
              disabled={!apiId}
              className="mb-2 w-full rounded-lg border border-pink-500/20 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-pink-500/50 focus:outline-none disabled:opacity-40"
            />
            <div className="space-y-2">
              {[0, 1, 2].map((i) => {
                const rowApiId = likesApiIds[i] || apiId;
                const rowApi = apis.find((a) => a.id === rowApiId);
                const rowServices = filterServices(rowApi?.services ?? [], likesSearch);
                return (
                  <div key={i} className="grid grid-cols-[1fr_1.5fr] gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-gray-600">API #{i + 1}</label>
                      <select
                        value={rowApiId}
                        onChange={(e) => {
                          const nextApis = [...likesApiIds];
                          nextApis[i] = e.target.value;
                          setLikesApiIds(nextApis);
                          const nextServices = [...likesServiceIds];
                          nextServices[i] = "";
                          setLikesServiceIds(nextServices);
                        }}
                        disabled={!apiId}
                        className="w-full rounded-lg border border-pink-500/20 bg-gray-950 px-2 py-1.5 text-xs text-gray-200 disabled:opacity-40"
                      >
                        {apis.map((api) => <option key={api.id} value={api.id}>{api.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-gray-600">Service #{i + 1}</label>
                      <select
                        value={likesServiceIds[i]}
                        onChange={(e) => {
                          const next = [...likesServiceIds];
                          next[i] = e.target.value;
                          setLikesServiceIds(next);
                        }}
                        disabled={!apiId}
                        className="w-full rounded-lg border border-pink-500/20 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-pink-500/50 focus:outline-none disabled:opacity-40"
                      >
                        <option value="">{i === 0 ? "Select primary service…" : "Add rotating service (optional)…"}</option>
                        {rowServices.map((svc) => (
                          <option key={svc.id} value={svc.id}>{svc.id} — {svc.name} {svc.min ? `(min ${svc.min})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            {activeLikesRotatingCount > 1 && (
              <p className="mt-1.5 text-[10px] text-pink-400/80">
                🔄 Rotating: {activeLikesRotatingCount} likes services can use different API panels
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim() || !apiId || !viewsServiceIds[0] || !likesServiceIds[0]}
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
            const viewsApi = apis.find((a) => a.id === (bundle.serviceApis?.viewsServiceApis?.[0] || bundle.serviceApis?.views || bundle.apiId));
            const likesApi = apis.find((a) => a.id === (bundle.serviceApis?.likesServiceApis?.[0] || bundle.serviceApis?.likes || bundle.apiId));
            const rotCount = bundle.viewsServiceIds?.length ?? 1;
            const likesRotCount = bundle.likesServiceIds?.length ?? 1;
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
                      ❤️ Likes:{" "}
                      {likesRotCount > 1
                        ? `${likesRotCount} rotating`
                        : bundle.likesServiceId}
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
