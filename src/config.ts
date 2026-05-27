/**
 * 🔥 FIX #5: single source of truth for the backend URL.
 *
 * Old: each file did
 *   (import.meta.env.VITE_BACKEND_URL as string)?.trim()
 *     || "https://backend-new-6tzb.onrender.com";
 *
 * Problems:
 *   • If you ever move the backend, you have to grep 5 files.
 *   • The hardcoded fallback hides a missing env var — production silently
 *     hits the wrong server.
 *
 * Now: one constant, one validation, used everywhere.
 *
 * Set `VITE_BACKEND_URL` in your Vercel project env (Production, Preview,
 * Development). For local dev, copy `.env.example` → `.env.local`.
 */

const rawUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();

if (!rawUrl) {
  // Fail loudly so a misconfigured deploy is obvious instead of hitting the
  // wrong backend silently.
  // eslint-disable-next-line no-console
  console.error(
    "[config] VITE_BACKEND_URL is not set. Set it in Vercel env vars " +
      "(or .env.local for local dev). Falling back to the hosted Render URL.",
  );
}

export const BACKEND_URL = (
  rawUrl || "https://backend-new-6tzb.onrender.com"
).replace(/\/$/, "");
