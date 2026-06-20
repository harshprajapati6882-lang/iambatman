import { useState, useEffect } from "react";
import { BundleManager } from "../components/BundleManager";
import { ApprovalBundleManager, type ApprovalBundle } from "../components/ApprovalBundleManager";
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
  approvalBundles: ApprovalBundle[];
  onApprovalBundlesChange: (bundles: ApprovalBundle[]) => void;
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

export function BundlesPage({ apis, bundles, onAddBundle, onUpdateBundle, onDeleteBundle, approvalBundles, onApprovalBundlesChange }: BundlesPageProps) {
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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-yellow-500/20 bg-gray-950/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-lg">📁</span>
          <h2 className="text-sm font-bold tracking-wide text-yellow-400 uppercase">Bundles</h2>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 space-y-6">
        {/* 🔥 Approval Bundles Section */}
        <div className="rounded-lg border border-emerald-500/20 bg-gray-900/50 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            🛡️ Approval Bundles (Views + Likes Only)
          </h3>
          <p className="mb-3 text-[10px] text-gray-500">
            Create lightweight bundles for the Approval page. These only need a Views service and a Likes service.
          </p>
          <ApprovalBundleManager
            apis={apis}
            bundles={approvalBundles}
            onChange={onApprovalBundlesChange}
          />
        </div>

        {/* Normal Bundles Section */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-400">
            📦 Standard Bundles (Full Multi-Service)
          </h3>
          <BundleManager
            apis={apis}
            bundles={bundles}
            onAddBundle={onAddBundle}
            onUpdateBundle={onUpdateBundle}
            onDeleteBundle={onDeleteBundle}
          />
        </div>

        {/* 🔥 Currency Settings */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💱</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Currency Settings</h3>
          </div>
          <p className="mb-3 text-[10px] text-gray-500">
            USD panels (like yoyomedia.in) get their rates multiplied by this value to show in INR.
            Change this whenever the exchange rate moves.
          </p>

          {showRateEditor ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">1 USD =</span>
              <input
                type="number"
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveRate(); if (e.key === "Escape") { setShowRateEditor(false); setEditRate(String(usdRate)); } }}
                className="w-20 rounded-lg border border-emerald-500/40 bg-black px-2 py-1 text-xs text-emerald-300 text-center focus:outline-none focus:border-emerald-400"
                autoFocus
              />
              <span className="text-xs text-gray-400">INR</span>
              <button onClick={handleSaveRate} className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-bold text-black hover:bg-emerald-400">✓</button>
              <button onClick={() => { setShowRateEditor(false); setEditRate(String(usdRate)); }} className="text-[10px] text-gray-500 hover:text-gray-300">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">1 USD = ₹{usdRate}</span>
              <button onClick={() => setShowRateEditor(true)} className="rounded-md border border-gray-600 bg-black px-2 py-1 text-[10px] text-gray-400 hover:text-white">✏️ Edit</button>
              {usdRate !== USD_RATE_DEFAULT && (
                <button onClick={handleResetRate} className="text-[10px] text-gray-500 hover:text-gray-300">↩ Reset to {USD_RATE_DEFAULT}</button>
              )}
            </div>
          )}

          <p className="mt-2 text-[10px] text-gray-600">
            ⚠️ After changing this rate, switch to New Order page and back to see updated costs. This setting is saved in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
