export type StaffUser = {
  id: string;
  email: string | null;
  name: string | null;
  isSuperAdmin: boolean;
  memberships: Array<{ branchId: string; role: string }>;
};

export function readStaff(): StaffUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("silakebap.staff");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffUser;
  } catch {
    return null;
  }
}

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("silakebap.accessToken");
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
