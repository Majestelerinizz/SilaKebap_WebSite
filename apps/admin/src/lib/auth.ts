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

const BRANCH_KEY = "silakebap.selectedBranchId";

export function readSelectedBranchId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(BRANCH_KEY) ?? "";
}

export function writeSelectedBranchId(branchId: string): void {
  if (typeof window === "undefined" || !branchId) return;
  localStorage.setItem(BRANCH_KEY, branchId);
}

/**
 * Mutfak / kurye / admin için aktif şube.
 * SUPER_ADMIN membership’siz olabilir → katalogdan ilk şubeyi alır.
 * Kayıtlı ID seed sonrası geçersizse temizleyip yeniden seçer.
 */
export async function resolveActiveBranchId(): Promise<string> {
  const staff = readStaff();

  async function firstCatalogBranch(): Promise<string> {
    try {
      const res = await fetch(`${apiUrl}/api/catalog/branches`, {
        headers: authHeaders(),
      });
      if (!res.ok) return "";
      const data = (await res.json()) as {
        branches?: Array<{ id: string }>;
      };
      return data.branches?.[0]?.id ?? "";
    } catch {
      return "";
    }
  }

  async function branchExists(id: string): Promise<boolean> {
    try {
      const res = await fetch(
        `${apiUrl}/api/catalog/branches/${encodeURIComponent(id)}`,
        { headers: authHeaders() },
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  const saved = readSelectedBranchId();
  if (saved) {
    if (await branchExists(saved)) return saved;
    localStorage.removeItem(BRANCH_KEY);
  }

  const fromMembership = defaultBranchId(staff);
  if (fromMembership && (await branchExists(fromMembership))) {
    writeSelectedBranchId(fromMembership);
    return fromMembership;
  }

  if (!staff?.isSuperAdmin && !fromMembership) return "";

  const first = await firstCatalogBranch();
  if (first) writeSelectedBranchId(first);
  return first;
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

/** Auth + otomatik refresh ile fetch (admin sayfaları için). */
export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return ensureApiAuth(() =>
    fetch(input, {
      ...init,
      headers: {
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
    }),
  );
}
