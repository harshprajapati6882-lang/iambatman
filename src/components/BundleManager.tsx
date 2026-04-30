import { useMemo, useState } from "react";
import type { ApiPanel, ApiService, Bundle } from "../types/order";

interface BundleManagerProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  onAddBundle: (bundle: {
    name: string;
    apiId: string;
    views: string;
    likes: string;
    shares: string;
    saves: string;
    comments: string;
    serviceApis: {
      views: string;
      likes: string;
      shares: string;
      saves: string;
      comments: string;
    };
  }) => void;
  onUpdateBundle: (
    id: string,
    bundle: {
      name: string;
      apiId: string;
      views: string;
      likes: string;
      shares: string;
      saves: string;
      comments: string;
      serviceApis: {
        views: string;
        likes: string;
        shares: string;
        saves: string;
        comments: string;
      };
    }
  ) => void;
  onDeleteBundle: (id: string) => void;
}

function getApiServices(apis: ApiPanel[], apiId: string): ApiService[] {
  return apis.find((api) => api.id === apiId)?.services ?? [];
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  disabled,
}: {
  options: ApiService[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(query) ||
        opt.id.toLowerCase().includes(query)
    );
  }, [options, search]);

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <div className="relative">
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-left text-sm text-gray-100 transition-all hover:border-yellow-500/50 focus:border-yellow-500/50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {selectedOption ? (
          <span className="flex items-center justify-between">
            <span className="truncate">{selectedOption.name}</span>
            <span className="ml-2 text-xs text-yellow-500">#{selectedOption.id}</span>
          </span>
        ) : (
          <span className="text-gray-600">{placeholder}</span>
        )}
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setIsOpen(false); setSearch(""); }} />
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-yellow-500/30 bg-black shadow-lg shadow-yellow-500/10">
            <div className="border-b border-yellow-500/20 p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search services..."
                className="w-full rounded-lg border border-yellow-500/30 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-500/50"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-600">No services found</div>
              )}
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { onChange(option.id); setIsOpen(false); setSearch(""); }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-yellow-500/10 ${value === option.id ? "bg-yellow-500/20 text-yellow-300" : "text-gray-300"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{option.name}</span>
                    <span className="ml-2 text-xs text-yellow-600">#{option.id}</span>
                  </div>
                </button>
              ))}
            </div>
            {filteredOptions.length > 0 && (
              <div className="border-t border-yellow-500/20 px-3 py-1.5 text-xs text-gray-600">
                {filteredOptions.length} found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// 🔥 Per-service row: API selector + service selector
function ServiceRow({
  emoji,
  label,
  apis,
  selectedApiId,
  selectedServiceId,
  defaultApiId,
  onApiChange,
  onServiceChange,
}: {
  emoji: string;
  label: string;
  apis: ApiPanel[];
  selectedApiId: string;
  selectedServiceId: string;
  defaultApiId: string;
  onApiChange: (apiId: string) => void;
  onServiceChange: (serviceId: string) => void;
}) {
  const effectiveApiId = selectedApiId || defaultApiId;
  const services = getApiServices(apis, effectiveApiId);

  return (
    <div className="rounded-xl border border-yellow-500/15 bg-black/40 p-3">
      <p className="text-[10px] font-semibold text-yellow-500/70 uppercase tracking-wider mb-2">
        {emoji} {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* API selector for this service */}
        <div>
          <label className="mb-1 block text-[10px] text-gray-600">API Panel</label>
          <select
            value={selectedApiId || defaultApiId}
            onChange={(e) => {
              onApiChange(e.target.value);
              onServiceChange(""); // reset service when API changes
            }}
            className="w-full rounded-lg border border-yellow-500/20 bg-gray-950 px-2 py-1.5 text-xs text-gray-200"
          >
            {apis.map((api) => (
              <option key={api.id} value={api.id}>{api.name}</option>
            ))}
          </select>
        </div>

        {/* Service selector */}
        <SearchableSelect
          options={services}
          value={selectedServiceId}
          onChange={onServiceChange}
          placeholder="Select service..."
          label="Service ID"
          disabled={!effectiveApiId || services.length === 0}
        />
      </div>
    </div>
  );
}

export function BundleManager({ apis, bundles, onAddBundle, onUpdateBundle, onDeleteBundle }: BundleManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [defaultApiId, setDefaultApiId] = useState("");

  // Per-service state: { apiId, serviceId }
  const [viewsApi, setViewsApi] = useState("");
  const [viewsService, setViewsService] = useState("");
  const [likesApi, setLikesApi] = useState("");
  const [likesService, setLikesService] = useState("");
  const [sharesApi, setSharesApi] = useState("");
  const [sharesService, setSharesService] = useState("");
  const [savesApi, setSavesApi] = useState("");
  const [savesService, setSavesService] = useState("");
  const [commentsApi, setCommentsApi] = useState("");
  const [commentsService, setCommentsService] = useState("");

  const resetForm = () => {
    setName("");
    setDefaultApiId("");
    setViewsApi(""); setViewsService("");
    setLikesApi(""); setLikesService("");
    setSharesApi(""); setSharesService("");
    setSavesApi(""); setSavesService("");
    setCommentsApi(""); setCommentsService("");
    setEditingBundleId(null);
    setShowForm(false);
  };

  const handleDefaultApiChange = (newApiId: string) => {
    setDefaultApiId(newApiId);
    // Reset all services when default API changes, but keep their API overrides
    setViewsService("");
    setLikesService("");
    setSharesService("");
    setSavesService("");
    setCommentsService("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !defaultApiId) return;
    if (!viewsService || !likesService || !sharesService || !savesService || !commentsService) return;

    const payload = {
      name: name.trim(),
      apiId: defaultApiId,
      views: viewsService,
      likes: likesService,
      shares: sharesService,
      saves: savesService,
      comments: commentsService,
      serviceApis: {
        views: viewsApi || defaultApiId,
        likes: likesApi || defaultApiId,
        shares: sharesApi || defaultApiId,
        saves: savesApi || defaultApiId,
        comments: commentsApi || defaultApiId,
      },
    };

    if (editingBundleId) {
      onUpdateBundle(editingBundleId, payload);
    } else {
      onAddBundle(payload);
    }
    resetForm();
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📁</span>
          <h2 className="text-2xl font-bold tracking-tight text-yellow-400">Arsenal Bundles</h2>
        </div>
        <button
          type="button"
          onClick={() => { if (showForm) { resetForm(); return; } setShowForm(true); }}
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-300 transition hover:bg-yellow-500/20"
        >
          {showForm ? "Close" : "➕ Create Bundle"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-gray-900 to-black p-5 space-y-4">
          {/* Bundle name */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Bundle Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Instagram Growth Package"
              className="w-full rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-500/50"
            />
          </div>

          {/* Default API */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Default API Panel</label>
            <select
              value={defaultApiId}
              onChange={(e) => handleDefaultApiChange(e.target.value)}
              className="w-full rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100"
            >
              <option value="">Select Default API Panel</option>
              {apis.map((api) => (
                <option key={api.id} value={api.id}>{api.name} ({api.services.length} services)</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-600">Each service below will use this API by default. You can override per service.</p>
          </div>

          {defaultApiId && (
            <>
              <p className="text-xs uppercase tracking-wide text-yellow-500/60 flex items-center gap-2">
                <span>🎯</span> Service Configuration — Pick API + Service for each
              </p>

              <ServiceRow
                emoji="👁️" label="Views"
                apis={apis} defaultApiId={defaultApiId}
                selectedApiId={viewsApi} selectedServiceId={viewsService}
                onApiChange={setViewsApi} onServiceChange={setViewsService}
              />
              <ServiceRow
                emoji="❤️" label="Likes"
                apis={apis} defaultApiId={defaultApiId}
                selectedApiId={likesApi} selectedServiceId={likesService}
                onApiChange={setLikesApi} onServiceChange={setLikesService}
              />
              <ServiceRow
                emoji="🔄" label="Shares"
                apis={apis} defaultApiId={defaultApiId}
                selectedApiId={sharesApi} selectedServiceId={sharesService}
                onApiChange={setSharesApi} onServiceChange={setSharesService}
              />
              <ServiceRow
                emoji="💾" label="Saves"
                apis={apis} defaultApiId={defaultApiId}
                selectedApiId={savesApi} selectedServiceId={savesService}
                onApiChange={setSavesApi} onServiceChange={setSavesService}
              />
              <ServiceRow
                emoji="💬" label="Comments"
                apis={apis} defaultApiId={defaultApiId}
                selectedApiId={commentsApi} selectedServiceId={commentsService}
                onApiChange={setCommentsApi} onServiceChange={setCommentsService}
              />
            </>
          )}

          <button
            type="submit"
            disabled={!defaultApiId || !viewsService || !likesService || !sharesService || !savesService || !commentsService}
            className="w-full rounded-lg border border-yellow-500/50 bg-yellow-500/20 px-3 py-2.5 text-sm font-medium text-yellow-300 transition hover:bg-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingBundleId ? "Update Bundle" : "Save Bundle"}
          </button>

          {editingBundleId && (
            <button type="button" onClick={resetForm} className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-700">
              Cancel Edit
            </button>
          )}
        </form>
      )}

      {/* Bundle Cards */}
      <div className="space-y-3">
        {bundles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-yellow-500/30 bg-black p-8 text-center">
            <span className="text-4xl">📁</span>
            <p className="mt-2 text-sm text-gray-500">No bundles created yet</p>
          </div>
        )}

        {bundles.map((bundle) => {
          const getApiName = (apiId: string) => apis.find(a => a.id === apiId)?.name ?? "Unknown";
          const defaultApiName = getApiName(bundle.apiId);

          const serviceRows = [
            { emoji: "👁️", label: "Views", serviceId: bundle.serviceIds.views, apiId: bundle.serviceApis?.views || bundle.apiId },
            { emoji: "❤️", label: "Likes", serviceId: bundle.serviceIds.likes, apiId: bundle.serviceApis?.likes || bundle.apiId },
            { emoji: "🔄", label: "Shares", serviceId: bundle.serviceIds.shares, apiId: bundle.serviceApis?.shares || bundle.apiId },
            { emoji: "💾", label: "Saves", serviceId: bundle.serviceIds.saves, apiId: bundle.serviceApis?.saves || bundle.apiId },
            { emoji: "💬", label: "Comments", serviceId: bundle.serviceIds.comments, apiId: bundle.serviceApis?.comments || bundle.apiId },
          ];

          return (
            <article key={bundle.id} className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-yellow-400">{bundle.name}</h3>
                <span className="text-[10px] text-gray-600">Default: {defaultApiName}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {serviceRows.map(({ emoji, label, serviceId, apiId }) => {
                  const isOverridden = apiId !== bundle.apiId;
                  const apiName = getApiName(apiId);
                  return (
                    <div key={label} className={`rounded-lg border px-3 py-2 ${isOverridden ? "border-blue-500/30 bg-blue-500/5" : "border-yellow-500/20 bg-yellow-500/5"}`}>
                      <p className="text-xs text-gray-600">{emoji} {label}</p>
                      <p className="mt-0.5 text-xs font-mono text-yellow-400">{serviceId}</p>
                      {isOverridden && (
                        <p className="mt-0.5 text-[9px] text-blue-400">via {apiName}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBundleId(bundle.id);
                    setName(bundle.name);
                    setDefaultApiId(bundle.apiId);
                    setViewsApi(bundle.serviceApis?.views || bundle.apiId);
                    setViewsService(bundle.serviceIds.views);
                    setLikesApi(bundle.serviceApis?.likes || bundle.apiId);
                    setLikesService(bundle.serviceIds.likes);
                    setSharesApi(bundle.serviceApis?.shares || bundle.apiId);
                    setSharesService(bundle.serviceIds.shares);
                    setSavesApi(bundle.serviceApis?.saves || bundle.apiId);
                    setSavesService(bundle.serviceIds.saves);
                    setCommentsApi(bundle.serviceApis?.comments || bundle.apiId);
                    setCommentsService(bundle.serviceIds.comments || "");
                    setShowForm(true);
                  }}
                  className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1.5 text-xs text-yellow-300 transition hover:bg-yellow-500/20"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm("Delete this bundle?")) return;
                    onDeleteBundle(bundle.id);
                    if (editingBundleId === bundle.id) resetForm();
                  }}
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20"
                >
                  🗑 Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
