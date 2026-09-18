/**
 * Server SSR: direct API.
 * Browser (phone/PC via LAN or public tunnel): same-origin `/api` (Next rewrite).
 */
export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window === "undefined") {
    return process.env.API_ORIGIN ?? "http://127.0.0.1:4000";
  }
  return "";
}

/** @deprecated Prefer getApiUrl() so client uses same-origin proxy */
export const apiUrl = getApiUrl();
