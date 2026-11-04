"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { getStoredRoles } from "@/lib/api/client";
import { staffAdminDemoEnabled } from "@/lib/demo/staff-admin-demo";
import { ROUTES } from "@/constants/routes";
import { useSession } from "./SessionProvider";

function normalizeRole(role: string): string {
  const normalized = role.toLocaleLowerCase("en-US").replace(/^role_/, "");
  if (normalized === "staff" || normalized === "supportstaff") return "supportstaff";
  if (normalized === "admin" || normalized === "administrator") return "admin";
  return normalized;
}

export function RoleGate({ allowedRoles, children, demoAccess = false }: { allowedRoles: readonly string[]; children: ReactNode; demoAccess?: boolean }) {
  const { user, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const userRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
  const roles = userRoles.length > 0 ? userRoles : (typeof window !== "undefined" ? getStoredRoles() : []);
  const hasAccess = roles.some((role) => allowedRoles.some((allowed) => normalizeRole(role) === normalizeRole(allowed)));
  const isAdmin = roles.some((r) => normalizeRole(r) === "admin");
  const isStaff = roles.some((r) => normalizeRole(r) === "supportstaff");

  useEffect(() => {
    if (!ready || !user || hasAccess) return;
    if (isAdmin) {
      router.replace(ROUTES.admin.overview);
    } else if (isStaff) {
      router.replace(ROUTES.staff.auctions);
    }
  }, [ready, user, hasAccess, isAdmin, isStaff, router]);

  if (demoAccess && staffAdminDemoEnabled) return children;
  if (!ready) {
    return <main className="route-loading" role="status" aria-live="polite">Đang kiểm tra phiên đăng nhập…</main>;
  }
  if (!user) {
    const loginHref = pathname ? `${ROUTES.auth.login}?redirect=${encodeURIComponent(pathname)}` : ROUTES.auth.login;
    return (
      <main className="access-state">
        <h1>Đăng nhập để tiếp tục</h1>
        <p>Khu vực này yêu cầu tài khoản Nexus có quyền phù hợp.</p>
        <Link className="button button-primary" href={loginHref}>Đăng nhập</Link>
      </main>
    );
  }

  if (!hasAccess) {
    const loginHref = pathname ? `${ROUTES.auth.login}?redirect=${encodeURIComponent(pathname)}` : ROUTES.auth.login;
    const accountInfo = user.email || user.username || "hiện tại";
    return (
      <main className="access-state" role="alert">
        <h1>Bạn không có quyền mở trang này</h1>
        <p>Tài khoản {accountInfo} không có vai trò phù hợp để truy cập khu vực này. Đăng nhập bằng tài khoản khác hoặc quay lại trang chủ.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem" }}>
          <Link className="button button-primary" href={loginHref}>Đăng nhập tài khoản khác</Link>
          <Link className="button button-secondary" href={ROUTES.home}>Về trang chủ</Link>
        </div>
      </main>
    );
  }
  return children;
}

export function StaffAdminDemoGate({ allowedRoles, children }: { allowedRoles: readonly string[]; children: ReactNode }) {
  const pathname = usePathname();
  const demoRoute = pathname === "/admin/categories" || pathname === "/admin/users" || pathname === "/staff/sellers" || /^\/staff\/sellers\/[^/]+$/.test(pathname);
  return <RoleGate allowedRoles={allowedRoles} demoAccess={demoRoute}>{children}</RoleGate>;
}
