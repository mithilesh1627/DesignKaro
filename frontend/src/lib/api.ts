/**
 * Centralized API base URL resolver for DesignKaro.
 * In development & production, uses NEXT_PUBLIC_BACKEND_URL if provided.
 * When accessed in browser without an explicit external host, returns "" (relative path)
 * so Next.js rewrites in next.config.mjs cleanly proxy /api/v1/... requests to the backend.
 */

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    // Relative path for browser clients leveraging Next.js rewrites
    return "";
  }
  return "http://127.0.0.1:8000";
};

export const API_BASE = getApiBaseUrl();
