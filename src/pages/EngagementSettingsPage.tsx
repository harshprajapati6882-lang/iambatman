import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DEFAULT_ENGAGEMENT_RATIOS,
  getEngagementRatios,
  saveEngagementRatios,
  resetEngagementRatios,
  isEngagementCustomised,
  getEngagementPresets,
  saveEngagementPreset,
  deleteEngagementPreset,
  applyEngagementPreset,
  type EngagementRatios,
  type EngagementPreset,
} from "../utils/engagementRatios";

// ── Tiny numeric input ────────────────────────────────────────────────────────
function RatioInput({
  label,
  emoji,
  value,
  onChange,
  description,
  min = 0,
  max = 10000,
  step = 1,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
  description: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      onChange(Math.round(parsed * 10) / 10);
    } else {
      setRaw(String(value)); // revert bad input
    }
  };

  const pct = ((value / 10000) * 100).toFixed(3);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition hover:border-yellow-500/30">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-[11px] text-gray-500">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-600">{pct}% of views</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(v);
            setRaw(String(v));
          }}
          className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #eab308 0%, #eab308 ${(value / max) * 100}%, #374151 ${(value / max) * 100}%, #374151 100%)`,
          }}
        />
        {/* Number box */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-20 rounded-lg border border-gray-700 bg-black px-2 py-1.5 text-center text-sm font-mono text-yellow-300 outline-none focus:border-yellow-500/60"
          />
          <span className="text-xs text-gray-500">/ 10k</span>
        </div>
      </div>
    </div>
  );
}

// ── Preview card: shows what an order at N views would produce ─────────────────
function LivePreview({ ratios, views }: { ratios: EngagementRatios; views: number }) {
  const scale = views / 10000;
  const items = [
    { emoji: "❤️", label: "Likes", value: Math.round(ratios.likesPer10k * scale) },
    { emoji: "🔄", label: "Shares", value: Math.round(ratios.sharesPer10k * scale) },
    { emoji: "💾", label: "Saves", value: Math.round(ratios.savesPer10k * scale) },
    { emoji: "🔁", label: "Reposts", value: Math.round(ratios.repostsPer10k * scale) },
    { emoji: "💬", label: "Comments", value: Math.round(ratios.commentsPer10k * scale) },
  ];
  return (
    <div className="rounded-xl border border-yellow-500/20 bg-black p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        📊 Live Preview — {views.toLocaleString()} views
      </p>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-800 bg-gray-900 p-2 text-center">
            <p className="text-lg">{item.emoji}</p>
            <p className="text-sm font-bold text-white">{item.value.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function EngagementSettingsPage() {
  const [ratios, setRatios] = useState<EngagementRatios>(() => getEngagementRatios());
  const [presets, setPresets] = useState<EngagementPreset[]>(() => getEngagementPresets());
  const [customised, setCustomised] = useState(() => isEngagementCustomised());
  const [saved, setSaved] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [previewViews, setPreviewViews] = useState(50000);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Flash "Saved!" for 2 seconds
  const flashSaved = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleChange = (key: keyof EngagementRatios, value: number) => {
    setRatios((prev) => ({ ...prev, [key]: value }));
    setActivePresetId(null); // any manual change deactivates the preset badge
  };

  const handleSaveActive = () => {
    saveEngagementRatios(ratios);
    setCustomised(true);
    flashSaved();
  };

  const handleReset = () => {
    if (!window.confirm("Reset all ratios back to the built-in defaults?")) return;
    resetEngagementRatios();
    setRatios({ ...DEFAULT_ENGAGEMENT_RATIOS });
    setCustomised(false);
    setActivePresetId(null);
    flashSaved();
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const preset = saveEngagementPreset(presetName, ratios);
    setPresets(getEngagementPresets());
    setPresetName("");
    setShowPresetInput(false);
    setActivePresetId(preset.id);
    // Also apply immediately
    saveEngagementRatios(ratios);
    setCustomised(true);
    flashSaved();
  };

  const handleApplyPreset = (preset: EngagementPreset) => {
    const applied = applyEngagementPreset(preset.id);
    if (applied) {
      setRatios(applied);
      setCustomised(true);
      setActivePresetId(preset.id);
      flashSaved();
    }
  };

  const handleDeletePreset = (id: string) => {
    deleteEngagementPreset(id);
    setPresets(getEngagementPresets());
    if (activePresetId === id) setActivePresetId(null);
    setDeleteConfirmId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📐</span>
          <div>
            <h1 className="text-xl font-bold text-white">Engagement Ratios</h1>
            <p className="text-xs text-gray-500">
              Set how many likes, shares, saves, reposts & comments you want per 10,000 views.
              <br />These ratios are applied automatically every time you create a new order.
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          {customised ? (
            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-300">
              ✏️ Custom ratios active
            </span>
          ) : (
            <span className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs text-gray-500">
              📌 Using built-in defaults
            </span>
          )}
          {activePresetId && (
            <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
              🎛️ {presets.find((p) => p.id === activePresetId)?.name}
            </span>
          )}
        </div>
      </div>

      {/* ── Ratio sliders ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <RatioInput
          emoji="❤️"
          label="Likes"
          value={ratios.likesPer10k}
          onChange={(v) => handleChange("likesPer10k", v)}
          description="Likes per 10,000 views"
          min={0}
          max={3000}
          step={1}
        />
        <RatioInput
          emoji="🔄"
          label="Shares"
          value={ratios.sharesPer10k}
          onChange={(v) => handleChange("sharesPer10k", v)}
          description="Shares per 10,000 views"
          min={0}
          max={2000}
          step={1}
        />
        <RatioInput
          emoji="💾"
          label="Saves"
          value={ratios.savesPer10k}
          onChange={(v) => handleChange("savesPer10k", v)}
          description="Saves per 10,000 views"
          min={0}
          max={2000}
          step={1}
        />
        <RatioInput
          emoji="🔁"
          label="Reposts"
          value={ratios.repostsPer10k}
          onChange={(v) => handleChange("repostsPer10k", v)}
          description="Reposts per 10,000 views"
          min={0}
          max={2000}
          step={1}
        />
        <RatioInput
          emoji="💬"
          label="Comments"
          value={ratios.commentsPer10k}
          onChange={(v) => handleChange("commentsPer10k", v)}
          description="Comments per 10,000 views"
          min={0}
          max={500}
          step={0.5}
        />
      </div>

      {/* ── Live preview ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Preview order size:</p>
          <div className="flex items-center gap-2">
            {[10000, 50000, 100000, 500000, 1000000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPreviewViews(v)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
                  previewViews === v
                    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                    : "bg-gray-800 text-gray-500 border border-gray-700 hover:text-gray-300"
                }`}
              >
                {v >= 1000000 ? `${v / 1000000}M` : v >= 1000 ? `${v / 1000}K` : v}
              </button>
            ))}
          </div>
        </div>
        <LivePreview ratios={ratios} views={previewViews} />
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Apply / Save active */}
        <button
          type="button"
          onClick={handleSaveActive}
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/20 px-5 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-500/30"
        >
          {saved ? "✅ Saved!" : "💾 Apply & Save"}
        </button>

        {/* Save as named preset */}
        <button
          type="button"
          onClick={() => setShowPresetInput((p) => !p)}
          className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/20"
        >
          🎛️ Save as Preset
        </button>

        {/* Reset to defaults */}
        <button
          type="button"
          onClick={handleReset}
          className="ml-auto rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
        >
          🔄 Reset to Defaults
        </button>
      </div>

      {/* ── Preset name input (shown when Save as Preset is clicked) ─────── */}
      <AnimatePresence>
        {showPresetInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              <span className="text-sm text-blue-300">Preset name:</span>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                placeholder='e.g. "Instagram Viral", "Low Engagement", …'
                autoFocus
                className="flex-1 rounded-lg border border-blue-500/30 bg-black px-3 py-1.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="rounded-lg border border-blue-500/40 bg-blue-500/20 px-3 py-1.5 text-sm text-blue-300 transition hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setShowPresetInput(false); setPresetName(""); }}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-400 transition hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Saved presets list ────────────────────────────────────────────── */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">🗂️ Saved Presets</p>
          <div className="space-y-2">
            {presets.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition ${
                    isActive
                      ? "border-blue-500/40 bg-blue-500/5"
                      : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                  }`}
                >
                  {/* Preset info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{preset.name}</p>
                      {isActive && (
                        <span className="rounded-full border border-blue-500/40 bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600">{formatDate(preset.savedAt)}</p>
                    {/* Mini stats */}
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                      <span>❤️ {preset.ratios.likesPer10k}/10k</span>
                      <span>🔄 {preset.ratios.sharesPer10k}/10k</span>
                      <span>💾 {preset.ratios.savesPer10k}/10k</span>
                      <span>🔁 {preset.ratios.repostsPer10k}/10k</span>
                      <span>💬 {preset.ratios.commentsPer10k}/10k</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      disabled={isActive}
                      className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-300 transition hover:bg-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isActive ? "✅ Applied" : "⚡ Apply"}
                    </button>

                    {deleteConfirmId === preset.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(preset.id)}
                          className="rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/30"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(preset.id)}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-500 transition hover:border-red-500/30 hover:text-red-400"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Defaults reference card ────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">📌 Built-in Defaults (for reference)</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
          <span>❤️ Likes: {DEFAULT_ENGAGEMENT_RATIOS.likesPer10k} / 10k views ({((DEFAULT_ENGAGEMENT_RATIOS.likesPer10k / 10000) * 100).toFixed(1)}%)</span>
          <span>🔄 Shares: {DEFAULT_ENGAGEMENT_RATIOS.sharesPer10k} / 10k views ({((DEFAULT_ENGAGEMENT_RATIOS.sharesPer10k / 10000) * 100).toFixed(2)}%)</span>
          <span>💾 Saves: {DEFAULT_ENGAGEMENT_RATIOS.savesPer10k} / 10k views ({((DEFAULT_ENGAGEMENT_RATIOS.savesPer10k / 10000) * 100).toFixed(2)}%)</span>
          <span>🔁 Reposts: {DEFAULT_ENGAGEMENT_RATIOS.repostsPer10k} / 10k views ({((DEFAULT_ENGAGEMENT_RATIOS.repostsPer10k / 10000) * 100).toFixed(2)}%)</span>
          <span>💬 Comments: {DEFAULT_ENGAGEMENT_RATIOS.commentsPer10k} / 10k views ({((DEFAULT_ENGAGEMENT_RATIOS.commentsPer10k / 10000) * 100).toFixed(2)}%)</span>
        </div>
      </div>

      {/* ── Info note ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4 text-xs text-yellow-200/60">
        <p className="font-semibold text-yellow-300/80 mb-1">⚠️ How this works</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>These ratios apply to every <strong>new order</strong> you create — existing orders are not affected.</li>
          <li>Click <strong>Apply & Save</strong> to make the current sliders active.</li>
          <li>Click <strong>Save as Preset</strong> to name and store a configuration for future use.</li>
          <li>Click <strong>Reset to Defaults</strong> to go back to the built-in code defaults.</li>
          <li>The Quick Presets on the New Order page (Viral Boost, Fast Start, etc.) will still override Likes if selected.</li>
        </ul>
      </div>
    </div>
  );
}
