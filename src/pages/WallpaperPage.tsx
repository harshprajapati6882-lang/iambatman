import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DEFAULT_WALLPAPER,
  getWallpaper,
  saveWallpaper,
  resetWallpaper,
  buildBackgroundStyle,
  type WallpaperConfig,
  type WallpaperType,
} from "../utils/wallpaper";

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">{children}</p>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

// ── Wallpaper type tab ────────────────────────────────────────────────────────
const TYPE_TABS: { key: WallpaperType; label: string; icon: string }[] = [
  { key: "color",        label: "Solid Color", icon: "🎨" },
  { key: "gradient",     label: "Gradient",    icon: "🌈" },
  { key: "image-url",    label: "Image URL",   icon: "🔗" },
  { key: "image-upload", label: "Upload",      icon: "📁" },
];

// ── Live mini-preview ─────────────────────────────────────────────────────────
function MiniPreview({ cfg }: { cfg: WallpaperConfig }) {
  const style = buildBackgroundStyle(cfg);
  return (
    <div
      className="relative h-36 w-full overflow-hidden rounded-xl border border-yellow-500/20"
      style={style}
    >
      {/* Fake sidebar */}
      <div
        className="absolute left-0 top-0 h-full w-16"
        style={{
          background: cfg.sidebarBlur
            ? "rgba(0,0,0,0.45)"
            : "rgba(10,10,10,0.9)",
          backdropFilter: cfg.sidebarBlur ? "blur(12px)" : "none",
          borderRight: "1px solid rgba(234,179,8,0.15)",
        }}
      >
        <div className="flex flex-col items-center gap-2 pt-3">
          <div className="h-4 w-8 rounded-sm bg-yellow-500/30" />
          <div className="h-2 w-6 rounded-sm bg-gray-700" />
          <div className="h-2 w-6 rounded-sm bg-gray-700" />
          <div className="h-2 w-7 rounded-sm bg-yellow-500/20" />
        </div>
      </div>
      {/* Fake content */}
      <div
        className="absolute right-0 top-0 h-full"
        style={{
          left: "64px",
          background: cfg.contentBlur
            ? "rgba(0,0,0,0.35)"
            : "transparent",
          backdropFilter: cfg.contentBlur ? "blur(8px)" : "none",
        }}
      >
        <div className="flex flex-col gap-2 p-3">
          <div className="h-3 w-24 rounded-sm bg-yellow-500/20" />
          <div className="h-2 w-32 rounded-sm bg-gray-700/50" />
          <div className="h-2 w-20 rounded-sm bg-gray-700/50" />
          <div className="mt-1 flex gap-2">
            <div className="h-8 w-16 rounded bg-gray-800/60 border border-yellow-500/20" />
            <div className="h-8 w-16 rounded bg-gray-800/60 border border-gray-700/40" />
          </div>
        </div>
      </div>
      <p className="absolute bottom-1.5 right-2 text-[9px] text-white/40">Live Preview</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface WallpaperPageProps {
  onWallpaperChange: (cfg: WallpaperConfig) => void;
}

export function WallpaperPage({ onWallpaperChange }: WallpaperPageProps) {
  const [cfg, setCfg] = useState<WallpaperConfig>(() => getWallpaper());
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [urlInput, setUrlInput] = useState(cfg.type === "image-url" ? cfg.imageUrl : "");
  const fileRef = useRef<HTMLInputElement>(null);

  const update = useCallback((patch: Partial<WallpaperConfig>) => {
    setCfg((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyAndSave = () => {
    saveWallpaper(cfg);
    onWallpaperChange(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (!window.confirm("Reset wallpaper back to the default black background?")) return;
    resetWallpaper();
    const def = { ...DEFAULT_WALLPAPER };
    setCfg(def);
    setUrlInput("");
    onWallpaperChange(def);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // File upload → base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (JPG, PNG, WebP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      update({ type: "image-upload", imageUrl: b64 });
    };
    reader.readAsDataURL(file);
  };

  // Preset wallpapers
  const PRESETS: { label: string; emoji: string; cfg: Partial<WallpaperConfig> }[] = [
    { label: "Pure Black",    emoji: "⬛", cfg: { type: "color",    color: "#000000" } },
    { label: "Deep Navy",     emoji: "🌊", cfg: { type: "color",    color: "#020817" } },
    { label: "Dark Purple",   emoji: "🟣", cfg: { type: "color",    color: "#0d0a1e" } },
    { label: "Gotham Night",  emoji: "🦇", cfg: { type: "gradient", gradientFrom: "#000000", gradientTo: "#1a1200", gradientAngle: 135 } },
    { label: "Deep Space",    emoji: "🌌", cfg: { type: "gradient", gradientFrom: "#000010", gradientTo: "#0a001a", gradientAngle: 160 } },
    { label: "Red Mist",      emoji: "🔴", cfg: { type: "gradient", gradientFrom: "#0a0000", gradientTo: "#200000", gradientAngle: 120 } },
    { label: "Matrix Green",  emoji: "💚", cfg: { type: "gradient", gradientFrom: "#000000", gradientTo: "#001a00", gradientAngle: 180 } },
    { label: "Steel Blue",    emoji: "🔵", cfg: { type: "gradient", gradientFrom: "#000810", gradientTo: "#001828", gradientAngle: 145 } },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">🖼️</span>
        <div>
          <h1 className="text-xl font-bold text-white">Wallpaper</h1>
          <p className="text-xs text-gray-500">Customize the background of your entire dashboard.</p>
        </div>
      </div>

      {/* Live preview */}
      <MiniPreview cfg={cfg} />

      {/* Type tabs */}
      <div className="grid grid-cols-4 gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => update({ type: tab.key })}
            className={`rounded-xl border py-2.5 text-xs font-medium transition ${
              cfg.type === tab.key
                ? "border-yellow-500/50 bg-yellow-500/15 text-yellow-300"
                : "border-gray-700 bg-gray-900 text-gray-500 hover:border-gray-600 hover:text-gray-300"
            }`}
          >
            <span className="block text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Solid Color ── */}
      {cfg.type === "color" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <Row>
            <Label>Background Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={cfg.color}
                onChange={(e) => update({ color: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded-lg border border-gray-700 bg-black p-1"
              />
              <input
                type="text"
                value={cfg.color}
                onChange={(e) => update({ color: e.target.value })}
                placeholder="#000000"
                className="flex-1 rounded-lg border border-gray-700 bg-black px-3 py-2 font-mono text-sm text-white outline-none focus:border-yellow-500/50"
              />
            </div>
          </Row>
        </motion.div>
      )}

      {/* ── Gradient ── */}
      {cfg.type === "gradient" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <Row>
              <Label>From Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={cfg.gradientFrom} onChange={(e) => update({ gradientFrom: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-gray-700 bg-black p-1" />
                <input type="text" value={cfg.gradientFrom} onChange={(e) => update({ gradientFrom: e.target.value })} className="flex-1 rounded-lg border border-gray-700 bg-black px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-yellow-500/50" />
              </div>
            </Row>
            <Row>
              <Label>To Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={cfg.gradientTo} onChange={(e) => update({ gradientTo: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-gray-700 bg-black p-1" />
                <input type="text" value={cfg.gradientTo} onChange={(e) => update({ gradientTo: e.target.value })} className="flex-1 rounded-lg border border-gray-700 bg-black px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-yellow-500/50" />
              </div>
            </Row>
          </div>
          <Row>
            <div className="flex items-center justify-between">
              <Label>Angle</Label>
              <span className="text-xs text-yellow-400 font-mono">{cfg.gradientAngle}°</span>
            </div>
            <input
              type="range" min={0} max={360} step={1}
              value={cfg.gradientAngle}
              onChange={(e) => update({ gradientAngle: Number(e.target.value) })}
              className="w-full cursor-pointer"
              style={{ background: `linear-gradient(to right, #eab308 0%, #eab308 ${(cfg.gradientAngle/360)*100}%, #374151 ${(cfg.gradientAngle/360)*100}%, #374151 100%)` }}
            />
          </Row>
        </motion.div>
      )}

      {/* ── Image URL ── */}
      {cfg.type === "image-url" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <Row>
            <Label>Image URL</Label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/your-wallpaper.jpg"
                className="flex-1 rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/50 placeholder-gray-600"
              />
              <button
                type="button"
                onClick={() => update({ imageUrl: urlInput })}
                className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300 hover:bg-yellow-500/20"
              >
                Load
              </button>
            </div>
            <p className="text-[10px] text-gray-600">Paste any direct image link. Make sure it's publicly accessible.</p>
          </Row>
        </motion.div>
      )}

      {/* ── Upload ── */}
      {cfg.type === "image-upload" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <Row>
            <Label>Upload Image</Label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-gray-700 bg-gray-950 py-8 text-center text-sm text-gray-500 transition hover:border-yellow-500/40 hover:text-yellow-300"
            >
              <span className="block text-3xl mb-2">📁</span>
              Click to choose an image<br />
              <span className="text-xs text-gray-600">JPG, PNG, WebP, GIF — max 5 MB</span>
            </button>
            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
            {cfg.imageUrl && cfg.imageUrl.startsWith("data:") && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <img src={cfg.imageUrl} alt="thumb" className="h-10 w-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-300">✅ Image loaded</p>
                  <p className="text-[10px] text-gray-600 truncate">Size: {Math.round(cfg.imageUrl.length / 1024)} KB (base64)</p>
                </div>
                <button type="button" onClick={() => update({ imageUrl: "" })} className="text-xs text-gray-500 hover:text-red-400">✕</button>
              </div>
            )}
          </Row>
        </motion.div>
      )}

      {/* ── Image display options (for both image types) ── */}
      {(cfg.type === "image-url" || cfg.type === "image-upload") && cfg.imageUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <Row>
              <Label>Image Fit</Label>
              <select
                value={cfg.imageSize}
                onChange={(e) => update({ imageSize: e.target.value as WallpaperConfig["imageSize"] })}
                className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/50"
              >
                <option value="cover">Cover (fill, crop)</option>
                <option value="contain">Contain (full image)</option>
                <option value="repeat">Tile / Repeat</option>
                <option value="auto">Auto</option>
              </select>
            </Row>
            <Row>
              <Label>Position</Label>
              <select
                value={cfg.imagePosition}
                onChange={(e) => update({ imagePosition: e.target.value as WallpaperConfig["imagePosition"] })}
                className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/50"
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </Row>
          </div>

          {/* Overlay opacity */}
          <Row>
            <div className="flex items-center justify-between">
              <Label>Dark Overlay</Label>
              <span className="text-xs text-yellow-400 font-mono">{cfg.overlayOpacity}%</span>
            </div>
            <input
              type="range" min={0} max={90} step={5}
              value={cfg.overlayOpacity}
              onChange={(e) => update({ overlayOpacity: Number(e.target.value) })}
              className="w-full cursor-pointer"
              style={{ background: `linear-gradient(to right, #eab308 0%, #eab308 ${(cfg.overlayOpacity/90)*100}%, #374151 ${(cfg.overlayOpacity/90)*100}%, #374151 100%)` }}
            />
            <p className="text-[10px] text-gray-600">Darken the image to keep text readable.</p>
          </Row>
        </motion.div>
      )}

      {/* ── Sidebar & content glass options ── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
        <Label>Glass / Blur Effects</Label>
        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-700 bg-black px-4 py-3 transition hover:border-gray-600">
          <div>
            <p className="text-sm text-white">Sidebar glass blur</p>
            <p className="text-[11px] text-gray-500">Frosted-glass effect on the left sidebar</p>
          </div>
          <div
            onClick={() => update({ sidebarBlur: !cfg.sidebarBlur })}
            className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${cfg.sidebarBlur ? "bg-yellow-500" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${cfg.sidebarBlur ? "left-5" : "left-0.5"}`} />
          </div>
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-700 bg-black px-4 py-3 transition hover:border-gray-600">
          <div>
            <p className="text-sm text-white">Content area glass blur</p>
            <p className="text-[11px] text-gray-500">Frosted-glass overlay on the main content area</p>
          </div>
          <div
            onClick={() => update({ contentBlur: !cfg.contentBlur })}
            className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${cfg.contentBlur ? "bg-yellow-500" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${cfg.contentBlur ? "left-5" : "left-0.5"}`} />
          </div>
        </label>
      </div>

      {/* ── Quick presets ── */}
      <div className="space-y-2">
        <Label>Quick Presets</Label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Pure Black",   emoji: "⬛", cfg: { type: "color",    color: "#000000" } },
            { label: "Deep Navy",    emoji: "🌊", cfg: { type: "color",    color: "#020817" } },
            { label: "Dark Purple",  emoji: "🟣", cfg: { type: "color",    color: "#0d0a1e" } },
            { label: "Gotham Night", emoji: "🦇", cfg: { type: "gradient", gradientFrom: "#000000", gradientTo: "#1a1200", gradientAngle: 135 } },
            { label: "Deep Space",   emoji: "🌌", cfg: { type: "gradient", gradientFrom: "#000010", gradientTo: "#0a001a", gradientAngle: 160 } },
            { label: "Red Mist",     emoji: "🔴", cfg: { type: "gradient", gradientFrom: "#0a0000", gradientTo: "#200000", gradientAngle: 120 } },
            { label: "Matrix Green", emoji: "💚", cfg: { type: "gradient", gradientFrom: "#000000", gradientTo: "#001a00", gradientAngle: 180 } },
            { label: "Steel Blue",   emoji: "🔵", cfg: { type: "gradient", gradientFrom: "#000810", gradientTo: "#001828", gradientAngle: 145 } },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => update(preset.cfg as Partial<WallpaperConfig>)}
              className="rounded-xl border border-gray-700 bg-gray-900 px-2 py-3 text-center text-xs text-gray-400 transition hover:border-yellow-500/30 hover:text-yellow-300"
            >
              <span className="block text-xl mb-1">{preset.emoji}</span>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={applyAndSave}
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/20 px-6 py-2.5 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500/30"
        >
          {saved ? "✅ Applied!" : "🖼️ Apply Wallpaper"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-400 transition hover:bg-gray-700 hover:text-white"
        >
          🔄 Reset to Default
        </button>
      </div>
    </div>
  );
}
