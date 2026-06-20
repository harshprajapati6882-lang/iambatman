import { useState, useMemo } from "react";
import type { ApiPanel } from "../types/order";

export interface ApprovalBundle {
  id: string;
  name: string;
  apiId: string;
  viewsServiceId: string;
  likesServiceId: string;
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
  const [viewsId, setViewsId] = useState("");
  const [likesId, setLikesId] = useState("");

  const selectedApi = apis.find((a) => a.id === apiId);
  const services = selectedApi?.services ?? [];

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setApiId("");
    setViewsId("");
    setLikesId("");
  };

  const startEdit = (bundle: ApprovalBundle) => {
    setEditingId(bundle.id);
    setName(bundle.name);
    setApiId(bundle.apiId);
    setViewsId(bundle.viewsServiceId);
    setLikesId(bundle.likesServiceId);
  };

  const handleSave = () => {
    if (!name.trim() || !apiId || !viewsId.trim() || !likesId.trim()) return;
    const next: ApprovalBundle = {
      id: editingId ?? `ab-${Date.now()}`,
      name: name.trim(),
      apiId,
      viewsServiceId: viewsId.trim(),
      likesServiceId: likesId.trim(),
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

  return (
    <div className="space-y-3">
      {/* Form */}
      <div className="rounded-lg border border-emerald-500/20 bg-gray-900/50 p-3">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
          {editingId ? "Edit Approval Bundle" : "New Approval Bundle"}
        </h4>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Bundle Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fast Views + Likes"
              className="w-full rounded-lg border border-emerald-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-0.5 block text-[10px] uppercase text-gray-500">API Panel</label>
            <select
              value={apiId}
              onChange={(e) => { setApiId(e.target.value); setViewsId(""); setLikesId(""); }}
              className="w-full rounded-lg border border-emerald-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="">Select API...</option>
              {apis.map((api) => (
                <option key={api.id} value={api.id}>
                  {api.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Views Service ID</label>
            <select
              value={viewsId}
              onChange={(e) => setViewsId(e.target.value)}
              disabled={!apiId}
              className="w-full rounded-lg border border-emerald-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 focus:outline-none disabled:opacity-40"
            >
              <option value="">Select service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-0.5 block text-[10px] uppercase text-gray-500">Likes Service ID</label>
            <select
              value={likesId}
              onChange={(e) => setLikesId(e.target.value)}
              disabled={!apiId}
              className="w-full rounded-lg border border-emerald-500/30 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-emerald-500/50 focus:outline-none disabled:opacity-40"
            >
              <option value="">Select service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim() || !apiId || !viewsId.trim() || !likesId.trim()}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            {editingId ? "💾 Update" : "➕ Create"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-md border border-gray-600 bg-black px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {bundles.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4 text-center text-xs text-gray-500">
          No approval bundles yet. Create one above.
        </div>
      ) : (
        <div className="space-y-2">
          {bundles.map((bundle) => {
            const api = apis.find((a) => a.id === bundle.apiId);
            return (
              <div
                key={bundle.id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2"
              >
                <div>
                  <div className="text-xs font-bold text-white">{bundle.name}</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">
                    API: {api?.name ?? "Unknown"} &middot; Views: {bundle.viewsServiceId} &middot; Likes: {bundle.likesServiceId}
                  </div>
                </div>
                <div className="flex gap-1">
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
