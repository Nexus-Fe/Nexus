import type { BadgeTone } from "@/components/ui/Primitives";
import type { AdminUser } from "./admin-users.service";

export function userId(user: AdminUser): string {
  return user.userId ?? user.id ?? "";
}

export function userName(user: AdminUser): string {
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.email
  );
}

export function maskIdentifyNumber(raw?: string | null): string {
  if (!raw) return "—";
  const trimmed = raw.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••••••${trimmed.slice(-4)}`;
}

export function userStatusLabel(status?: string): string {
  const normalized = (status ?? "").toUpperCase().replace(/[\s_-]+/g, "");
  const labels: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    BANNED: "Đã cấm",
    PENDINGVERIFICATION: "Chờ xác thực",
    PENDINGACTIVATION: "Chờ xác thực",
    PENDING_ACTIVATION: "Chờ xác thực",
    PENDING: "Chờ xác thực",
    DELETED: "Đã xóa",
  };
  return labels[normalized] ?? status ?? "—";
}

export function userStatusTone(status?: string): BadgeTone {
  const s = (status ?? "").toUpperCase().replace(/[\s_-]+/g, "");
  if (s === "ACTIVE") return "green";
  if (s === "BANNED") return "red";
  if (s === "PENDINGVERIFICATION" || s === "PENDINGACTIVATION" || s === "PENDING") {
    return "amber";
  }
  if (s === "DELETED") return "slate";
  return "sky";
}

export function normalizeRoleCode(role: string): string {
  return role.toLowerCase().replace(/^role_/, "").replace(/[\s_-]+/g, "");
}

export function canonicalRoleCode(role: string): string {
  const norm = normalizeRoleCode(role);
  if (norm === "admin" || norm === "administrator") return "Admin";
  if (norm === "supportstaff" || norm === "staff") return "SupportStaff";
  if (norm === "seller") return "Seller";
  if (norm === "buyer" || norm === "customer") return "Buyer";
  return role;
}

export function roleTone(role: string): BadgeTone {
  const r = normalizeRoleCode(role);
  if (r.includes("admin")) return "indigo";
  if (r.includes("staff")) return "sky";
  if (r.includes("seller")) return "amber";
  return "slate";
}

export function getUserRoles(user: AdminUser): string[] {
  const raw: string[] = [];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    raw.push(...user.roles.map((r) => String(r)));
  } else if ((user as { role?: unknown }).role) {
    raw.push(String((user as { role?: unknown }).role));
  }
  if (raw.length === 0) return ["Buyer"];
  return Array.from(new Set(raw.map(canonicalRoleCode)));
}

export function getPrimaryRole(user: AdminUser): string {
  const canonical = getUserRoles(user);
  const precedence = ["Admin", "SupportStaff", "Seller", "Buyer"];
  for (const role of precedence) {
    if (canonical.includes(role)) return role;
  }
  return canonical[0] ?? "Buyer";
}
