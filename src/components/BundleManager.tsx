import { useMemo, useState } from "react";
import type { ApiPanel, ApiService, Bundle } from "../types/order";

interface BundleManagerProps {
  apis: ApiPanel[];
  bundles: Bundle[];
  onAddBundle: (bundle: {
    name: string;
    apiId: string;
    views: string;
    viewsServiceIds: string[];
    likes: string;
    shares: string;
    saves: string;
    comments: string;
    reposts: string;
    likesPremium: string;
    serviceApis: {
      views: string;
      likes: string;
      shares: string;
      saves: string;
      comments: string;
      reposts: string;
      likesPremium: string;
    };
  }) => void;
  onUpdateBundle: (
    id: string,
    bundle: {
      name: string;
      apiId: string;
      views: string;
      viewsServiceIds: string[];
      likes: string;
      shares: string;
      saves: string;
      comments: string;
      reposts: string;
      likesPremium: string;
      serviceApis: {
        views: string;
        likes: string;
        shares: string;
        saves: string;
        comments: string;
        reposts: string;
        likesPremium: string;
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
        <div>
          <label className="mb-1 block text-[10px] text-gray-600">API Panel</label>
          <select
            value={selectedApiId || defaultApiId}
            onChange={(e) => {
              onApiChange(e.target.value);
              onServiceChange("");
            }}
            className="w-full rounded-lg border border-yellow-500/20 bg-gray-950 px-2 py-1.5 text-xs text-gray-200"
          >
            {apis.map((api) => (
              <option key={api.id} value={api.id}>{api.name}</option>
            ))}
          </select>
        </div>
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

  const [viewsApi, setViewsApi] = useState("");
  const [viewsService, setViewsService] = useState("");
  const [viewsRotServices, setViewsRotServices] = useState<string[]>(["", ""]);
  const [likesApi, setLikesApi] = useState("");
  const [likesService, setLikesService] = useState("");
  const [sharesApi, setSharesApi] = useState("");
  const [sharesService, setSharesService] = useState("");
  const [savesApi, setSavesApi] = useState("");
  const [savesService, setSavesService] = useState("");
  const [commentsApi, setCommentsApi] = useState("");
  const [commentsService, setCommentsService] = useState("");
  const [repostsApi, setRepostsApi] = useState("");
  const [repostsService, setRepostsService] = useState("");
  const [likesPremiumApi, setLikesPremiumApi] = useState("");
  const [likesPremiumService, setLikesPremiumService] = useState("");

  const resetForm = () => {
    setName("");
    setDefaultApiId("");
    setViewsApi(""); setViewsService(""); setViewsRotServices(["", ""]);
    setLikesApi(""); setLikesService("");
    setSharesApi(""); setSharesService("");
    setSavesApi(""); setSavesService("");
    setCommentsApi(""); setCommentsService("");
    setRepostsApi(""); setRepostsService("");
    setLikesPremiumApi(""); setLikesPremiumService("");
    setEditingBundleId(null);
    setShowForm(false);
  };

  const handleDefaultApiChange = (newApiId: string) => {
    setDefaultApiId(newApiId);
    setViewsService(""); setViewsRotServices(["", ""]);
    setLikesService("");
    setSharesService("");
    setSavesService("");
    setCommentsService("");
    setRepostsService("");
    setLikesPremiumService("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !defaultApiId) return;
    if (!viewsService || !likesService || !sharesService || !savesService || !commentsService) return;

    const rotIds = viewsRotServices.map((s) => s.trim()).filter(Boolean);
    const payload = {
      name: name.trim(),
      apiId: defaultApiId,
      views: viewsService,
      viewsServiceIds: rotIds.length > 0 ? rotIds : [],
      likes: likesService,
      shares: sharesService,
      saves: savesService,
      comments: commentsService,
      reposts: repostsService,
      likesPremium: likesPremiumService,
      serviceApis: {
        views: viewsApi || defaultApiId,
        likes: likesApi || defaultApiId,
        shares: sharesApi || defaultApiId,
        saves: savesApi || defaultApiId,
        comments: commentsApi || defaultApiId,
        reposts: repostsApi || defaultApiId,
        likesPremium: likesPremiumApi || defaultApiId,
      },
    };

    if (editingBundleId) {
      onUpdateBundle(editingBundleId, payload);
    } else {
      onAddBundle(payload);
    }
    resetForm();
  };

  const viewsEffectiveApiId = viewsApi || defaultApiId;
  const viewsServices = getApiServices(apis, viewsEffectiveApiId);

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
          <div>
            <label className="mb-1 block text-xs text-gray-500">Bundle Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Instagram Growth Package"
              className="w-full rounded-xl border border-yellow-500/30 bg-black px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-500/50"
            />
          </div>

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
                emoji="👁️" label="Views (Primary)"
                apis={apis} defaultApiId={defaultApiId}
                selectedApiId={viewsApi} selectedServiceId={viewsService}
                onApiChange={setViewsApi} onServiceChange={setViewsService}
              />

              {/* 🔥 NEW: Rotating Views Services */}
              <div className="rounded-xl border border-yellow-500/15 bg-black/40 p-3">
                <p className="text-[10px] font-semibold text-yellow-500/70 uppercase tracking-wider mb-2">
                  🔄 Additional Views Services (Rotation)
                </p>
                <p className="text-[10px] text-gray-500 mb-2">
                  Optional: add up to 2 more views services. All use the same API as primary views. Runs will rotate through all selected views services round-robin.
                </p>
                {[0, 1].map((i) => (
                  <div key={i} className="mb-2">
                    <SearchableSelect
                      options={viewsServices}
                      value={viewsRotServices[i]}
                      onChange={(val) => {
                        const next = [...viewsRotServices];
                        next[i] = val;
                        setViewsRotServices(next);
                      }}
                      placeholder={`Select views service #${i + 2}...`}
                      label={`Service #${i + 2}`}
                      disabled={!viewsEffectiveApiId}
                    />
                  </div>
                ))}
              </div>

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
              <ServiceRow
                emoji="🔁" label="Reposts"
                apis={apis} defaultApiId={defaultApiId}
                selectedApiId={repostsApi} selectedServiceId={repostsService}
                onApiChange={setRepostsApi} onServiceChange={setRepostsService}
              />

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  <span>🪶 Likes (min=1) — for Sub-Likes feature</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-normal text-emerald-200">OPTIONAL</span>
                </p>
                <p className="mb-2 text-[10px] text-gray-500">
                  Pick a service with <strong>min=1</strong>. Only used when you turn ON the "Sub-Likes" toggle on the New Order page.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] text-gray-600">API Panel</label>
                    <select
                      value={likesPremiumApi || defaultApiId}
                      onChange={(e) => {
                        setLikesPremiumApi(e.target.value === defaultApiId ? "" : e.target.value);
                        setLikesPremiumService("");
                      }}
                      className="w-full rounded-lg border border-emerald-500/20 bg-gray-950 px-2 py-1.5 text-xs text-gray-200"
                    >
                      {apis.map((api) => (
                        <option key={api.id} value={api.id}>{api.name}</option>
                      ))}
                    </select>
                  </div>
                  <SearchableSelect
                    options={getApiServices(apis, likesPremiumApi || defaultApiId)}
                    value={likesPremiumService}
                    onChange={setLikesPremiumService}
                    placeholder="Pick min=1 service..."
                    label="Service ID"
                    disabled={!(likesPremiumApi || defaultApiId)}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={!defaultApiId || !viewsService || !likesService || !sharesService || !savesService || !commentsService || !repostsService}
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
          const viewsRotCount = bundle.serviceIds.viewsServiceIds?.length ?? 0;

          const serviceRows: Array<{ emoji: string; label: string; serviceId: string | undefined; apiId: string; isPremium?: boolean }> = [
            { emoji: "👁️", label: viewsRotCount > 1 ? `Views (${viewsRotCount} rotating)` : "Views", serviceId: bundle.serviceIds.views, apiId: bundle.serviceApis?.views || bundle.apiId },
            { emoji: "❤️", label: "Likes", serviceId: bundle.serviceIds.likes, apiId: bundle.serviceApis?.likes || bundle.apiId },
            { emoji: "🔄", label: "Shares", serviceId: bundle.serviceIds.shares, apiId: bundle.serviceApis?.shares || bundle.apiId },
            { emoji: "💾", label: "Saves", serviceId: bundle.serviceIds.saves, apiId: bundle.serviceApis?.saves || bundle.apiId },
            { emoji: "💬", label: "Comments", serviceId: bundle.serviceIds.comments, apiId: bundle.serviceApis?.comments || bundle.apiId },
            { emoji: "🔁", label: "Reposts", serviceId: bundle.serviceIds.reposts, apiId: bundle.serviceApis?.reposts || bundle.apiId },
          ];
          if (bundle.serviceIds.likesPremium) {
            serviceRows.push({
              emoji: "🪶",
              label: "Likes min=1",
              serviceId: bundle.serviceIds.likesPremium,
              apiId: bundle.serviceApis?.likesPremium || bundle.apiId,
              isPremium: true,
            });
          }

          return (
            <article key={bundle.id} className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-yellow-400">{bundle.name}</h3>
                <span className="text-[10px] text-gray-600">Default: {defaultApiName}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {serviceRows.map(({ emoji, label, serviceId, apiId, isPremium }) => {
                  const isOverridden = apiId !== bundle.apiId;
                  const apiName = getApiName(apiId);
                  const borderClass = isPremium
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : isOverridden
                      ? "border-blue-500/30 bg-blue-500/5"
                      : "border-yellow-500/20 bg-yellow-500/5";
                  const idColor = isPremium ? "text-emerald-300" : "text-yellow-400";
                  return (
                    <div key={label} className={`rounded-lg border px-3 py-2 ${borderClass}`}>
                      <p className="text-xs text-gray-600">{emoji} {label}</p>
                      <p className={`mt-0.5 text-xs font-mono ${idColor}`}>{serviceId}</p>
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
                    const savedViewRotation = bundle.serviceIds.viewsServiceIds || [];
                    setViewsRotServices([
                      savedViewRotation[1] || "",
                      savedViewRotation[2] || "",
                    ]);
                    setLikesApi(bundle.serviceApis?.likes || bundle.apiId);
                    setLikesService(bundle.serviceIds.likes);
                    setSharesApi(bundle.serviceApis?.shares || bundle.apiId);
                    setSharesService(bundle.serviceIds.shares);
                    setSavesApi(bundle.serviceApis?.saves || bundle.apiId);
                    setSavesService(bundle.serviceIds.saves);
                    setCommentsApi(bundle.serviceApis?.comments || bundle.apiId);
                    setCommentsService(bundle.serviceIds.comments || "");
                    setRepostsApi(bundle.serviceApis?.reposts || bundle.apiId);
                    setRepostsService(bundle.serviceIds.reposts || "");
                    setLikesPremiumApi(bundle.serviceApis?.likesPremium || bundle.apiId);
                    setLikesPremiumService(bundle.serviceIds.likesPremium || "");
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
