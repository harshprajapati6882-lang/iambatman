import { useState, useEffect } from "react";
import { BundleManager } from "../components/BundleManager";
import type { ApiPanel, Bundle } from "../types/order";

interface BundlesPageProps {
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

// 🔥 Shared USD→INR rate — stored in localStorage, used across all pages
const USD_RATE_KEY = "dev-smm-usd-to-inr";
const USD_RATE_DEFAULT = 85;

export function getUsdToInrRate(): number {
  try {
    const raw = localStorage.getItem(USD_RATE_KEY);
    const parsed = raw ? parseFloat(raw) : USD_RATE_DEFAULT;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : USD_RATE_DEFAULT;
  } catch {
    return USD_RATE_DEFAULT;
  }
}

export function setUsdToInrRate(rate: number): void {
  localStorage.setItem(USD_RATE_KEY, String(rate));
}

export function BundlesPage({ apis, bundles, onAddBundle, onUpdateBundle, onDeleteBundle }: BundlesPageProps) {
  const [usdRate, setUsdRate] = useState(() => getUsdToInrRate());
  const [editRate, setEditRate] = useState(String(usdRate));
  const [showRateEditor, setShowRateEditor] = useState(false);

  useEffect(() => {
    setUsdToInrRate(usdRate);
  }, [usdRate]);

  const handleSaveRate = () => {
    const parsed = parseFloat(editRate);
    if (Number.isFinite(parsed) && parsed > 0) {
      setUsdRate(parsed);
      setEditRate(String(parsed));
      setShowRateEditor(false);
    }
  };

  const handleResetRate = () => {
    setUsdRate(USD_RATE_DEFAULT);
    setEditRate(String(USD_RATE_DEFAULT));
    setShowRateEditor(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 py-7">
      {/* 🔥 Currency Settings */}
      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-black p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💱</span>
            <div>
              <h3 className="text-sm font-semibold text-emerald-400">Currency Settings</h3>
              <p className="text-[10px] text-gray-500">
                USD panels (like yoyomedia.in) get their rates multiplied by this value to show in INR.
                Change this whenever the exchange rate moves.
              </p>
            </div>
          </div>
          {showRateEditor ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">1 USD =</span>
              <input
                type="number"
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveRate(); if (e.key === "Escape") { setShowRateEditor(false); setEditRate(String(usdRate)); } }}
                className="w-20 rounded-lg border border-emerald-500/40 bg-black px-2 py-1 text-xs text-emerald-300 text-center focus:outline-none focus:border-emerald-400"
                autoFocus
              />
              <span className="text-[10px] text-gray-500">INR</span>
              <button type="button" onClick={handleSaveRate} className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/30">✓</button>
              <button type="button" onClick={() => { setShowRateEditor(false); setEditRate(String(usdRate)); }} className="text-[10px] text-gray-500 hover:text-gray-300">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">1 USD = ₹{usdRate}</span>
              <button type="button" onClick={() => setShowRateEditor(true)} className="rounded-md border border-gray-600 bg-black px-2 py-1 text-[10px] text-gray-400 hover:text-white">✏️ Edit</button>
              {usdRate !== USD_RATE_DEFAULT && (
                <button type="button" onClick={handleResetRate} className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] text-orange-400 hover:bg-orange-500/20">↩ Reset to {USD_RATE_DEFAULT}</button>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-[9px] text-gray-600">
          ⚠️ After changing this rate, switch to New Order page and back to see updated costs. This setting is saved in your browser.
        </p>
      </div>

      <BundleManager
        apis={apis}
        bundles={bundles}
        onAddBundle={onAddBundle}
        onUpdateBundle={onUpdateBundle}
        onDeleteBundle={onDeleteBundle}
      />
    </div>
  );
}
