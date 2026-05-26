// ============================================================
// 🖼️ WALLPAPER / BACKGROUND SETTINGS
// Persisted in localStorage. Applied live to the whole site.
// ============================================================

export type WallpaperType = "color" | "gradient" | "image-url" | "image-upload";

export interface WallpaperConfig {
  type: WallpaperType;
  // solid color
  color: string;
  // gradient
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  // image (URL or base64 from upload)
  imageUrl: string;
  // image display
  imageSize: "cover" | "contain" | "repeat" | "auto";
  imagePosition: "center" | "top" | "bottom" | "left" | "right";
  // overlay
  overlayOpacity: number;   // 0–100 — dark overlay on top of image/gradient
  // sidebar
  sidebarBlur: boolean;     // glass-blur sidebar when wallpaper is active
  // content area
  contentBlur: boolean;
}

export const DEFAULT_WALLPAPER: WallpaperConfig = {
  type: "color",
  color: "#000000",
  gradientFrom: "#0a0a0a",
  gradientTo: "#1a1200",
  gradientAngle: 135,
  imageUrl: "",
  imageSize: "cover",
  imagePosition: "center",
  overlayOpacity: 40,
  sidebarBlur: true,
  contentBlur: false,
};

const STORAGE_KEY = "dev-smm-wallpaper";

export function getWallpaper(): WallpaperConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WALLPAPER };
    return { ...DEFAULT_WALLPAPER, ...(JSON.parse(raw) as Partial<WallpaperConfig>) };
  } catch {
    return { ...DEFAULT_WALLPAPER };
  }
}

export function saveWallpaper(config: WallpaperConfig): void {
  // Don't store huge base64 strings if url is empty
  const toStore = { ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

export function resetWallpaper(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Build the CSS background-image string from a config */
export function buildBackgroundStyle(cfg: WallpaperConfig): React.CSSProperties {
  if (cfg.type === "color") {
    return { background: cfg.color };
  }
  if (cfg.type === "gradient") {
    return {
      background: `linear-gradient(${cfg.gradientAngle}deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`,
    };
  }
  if ((cfg.type === "image-url" || cfg.type === "image-upload") && cfg.imageUrl) {
    const overlay = `rgba(0,0,0,${cfg.overlayOpacity / 100})`;
    return {
      backgroundImage: `linear-gradient(${overlay}, ${overlay}), url(${cfg.imageUrl})`,
      backgroundSize: cfg.imageSize,
      backgroundPosition: cfg.imagePosition,
      backgroundRepeat: cfg.imageSize === "repeat" ? "repeat" : "no-repeat",
      backgroundAttachment: "fixed",
    };
  }
  return { background: DEFAULT_WALLPAPER.color };
}
