import { ROUTES } from "@/constants/routes";

export const CANONICAL_ROLES = ["admin", "staff", "seller", "buyer"] as const;
export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

export type UserRoleLike = {
  roles?: readonly string[] | string[] | null;
  role?: string | null;
};

/**
 * Type guard to check if a string is a CanonicalRole.
 */
export function isCanonicalRole(role: string): role is CanonicalRole {
  return (CANONICAL_ROLES as readonly string[]).includes(role);
}

/**
 * Normalizes any role string representation to a canonical role name:
 * - "admin" (from "ROLE_ADMIN", "ADMIN", "Administrator", etc.)
 * - "staff" (from "ROLE_STAFF", "STAFF", "SupportStaff", "ROLE_SUPPORTSTAFF", etc.)
 * - "seller" (from "ROLE_SELLER", "SELLER", etc.)
 * - "buyer" (from "ROLE_BUYER", "BUYER", "Customer", "ROLE_CUSTOMER", etc.)
 */
export function normalizeRole(role: string): string {
  if (!role || typeof role !== "string") return "";
  const clean = role.trim().toLocaleLowerCase("en-US").replace(/^role[-_]/, "");
  if (clean === "administrator" || clean === "admin") return "admin";
  if (clean === "supportstaff" || clean === "support_staff" || clean === "support-staff" || clean === "staff") return "staff";
  if (clean === "seller") return "seller";
  if (clean === "customer" || clean === "buyer") return "buyer";
  return clean;
}

/**
 * Extracts and normalizes all canonical roles from a user object or list of roles.
 */
export function getUserRoles(user: UserRoleLike | null | undefined): CanonicalRole[] {
  if (!user) return [];
  const rawRoles = user.roles && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []);
  const normalized = new Set<CanonicalRole>();
  for (const r of rawRoles) {
    if (typeof r === "string" && r.trim()) {
      const norm = normalizeRole(r);
      if (isCanonicalRole(norm)) {
        normalized.add(norm);
      }
    }
  }
  return Array.from(normalized);
}

/**
 * Checks whether user has any of the specified roles.
 * Accepts readonly arrays and string arrays for maximal TS compatibility.
 */
export function hasAnyRole(
  user: UserRoleLike | null | undefined,
  allowedRoles: readonly string[]
): boolean {
  if (!user) return false;
  const rawRoles = user.roles && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []);
  const normalizedUserRoles = new Set(
    rawRoles
      .filter((r): r is string => typeof r === "string" && Boolean(r.trim()))
      .map((r) => normalizeRole(r))
  );
  const normalizedAllowed = new Set(allowedRoles.map((r) => normalizeRole(r)));
  for (const r of normalizedUserRoles) {
    if (normalizedAllowed.has(r)) return true;
  }
  return false;
}

/**
 * Returns the default landing URL for a given user based on role hierarchy:
 * Admin > Staff > Seller > Buyer
 */
export function getRoleLandingPath(user: UserRoleLike | null | undefined): string {
  const roles = getUserRoles(user);
  if (roles.includes("admin")) return ROUTES.admin.overview;
  if (roles.includes("staff")) return ROUTES.staff.auctions;
  if (roles.includes("seller")) return ROUTES.seller.products;
  if (roles.includes("buyer")) return ROUTES.home;
  return ROUTES.home;
}

/**
 * Validates and sanitizes a redirect target to prevent open redirects and auth loops.
 */
export function sanitizeRedirectPath(target: string | null | undefined): string | null {
  if (!target || typeof target !== "string") return null;
  const trimmed = target.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }
  // Prevent redirect loops back to auth pages
  if (
    trimmed === ROUTES.auth.login ||
    trimmed === ROUTES.auth.register ||
    trimmed.startsWith("/login?") ||
    trimmed.startsWith("/register?")
  ) {
    return null;
  }
  return trimmed;
}
