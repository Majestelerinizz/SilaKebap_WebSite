export type StaffUser = {
  id: string;
  email: string | null;
  name: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{ branchId: string; role: string }>;
};

const ACCESS_KEY = "silakebap.accessToken";
const REFRESH_KEY = "silakebap.refreshToken";
const STAFF_KEY = "silakebap.staff";

export function readStaff(): StaffUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffUser;
  } catch {
    return null;
  }
}

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function readRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function saveSession(
  accessToken: string,
  refreshToken: string,
  user: StaffUser,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(STAFF_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(STAFF_KEY);
}

/** Clears session and sends user to login. */
export function logout(): void {
  clearSession();
}

export function authHeaders(): HeadersInit {
  const token = readToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export function defaultBranchId(staff: StaffUser | null): string {
  if (!staff) return "";
  return staff.memberships[0]?.branchId ?? "";
}

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessTokenOnce(): Promise<boolean> {
  const refresh = readRefreshToken();
  if (!refresh) return false;

  const res = await fetch(`${apiUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) return false;

  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  return true;
}

/** On 401, refresh access token once and retry the request. */
export async function ensureApiAuth(
  request: () => Promise<Response>,
): Promise<Response> {
  let res = await request();
  if (res.status !== 401) return res;

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessTokenOnce().finally(() => {
      refreshInFlight = null;
    });
  }
  const refreshed = await refreshInFlight;
  if (!refreshed) return res;

  return request();
}
