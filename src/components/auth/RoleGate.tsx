"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { staffAdminDemoEnabled } from "@/lib/demo/staff-admin-demo";
import { useSession } from "./SessionProvider";

function normalizeRole(role: string): string {
  const normalized = role.toLocaleLowerCase("en-US");
  return normalized === "staff" ? "supportstaff" : normalized;
}

export function RoleGate({ allowedRoles, children, demoAccess = false }: { allowedRoles: string[]; children: ReactNode; demoAccess?: boolean }) {
  const { user, ready } = useSession();
  if (demoAccess && staffAdminDemoEnabled) return children;
  if (!ready) {
    return <main className="route-loading" role="status" aria-live="polite">Đang kiểm tra phiên đăng nhập…</main>;
  }
  if (!user) {
    return (
      <main className="access-state">
        <h1>Đăng nhập để tiếp tục</h1>
        <p>Khu vực này yêu cầu tài khoản Nexus có quyền phù hợp.</p>
        <Link className="button button-primary" href="/login">Đăng nhập</Link>
      </main>
    );
  }
  const roles = user.roles ?? (user.role ? [user.role] : []);
  if (!roles.some((role) => allowedRoles.some((allowed) => normalizeRole(role) === normalizeRole(allowed)))) {
    return (
      <main className="access-state" role="alert">
        <h1>Bạn không có quyền mở trang này</h1>
        <p>Đăng nhập bằng tài khoản có vai trò phù hợp hoặc quay lại trang chủ.</p>
        <Link className="button button-secondary" href="/">Về trang chủ</Link>
      </main>
    );
  }
  return children;
}

export function StaffAdminDemoGate({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const pathname = usePathname();
  const demoRoute = pathname === "/admin/categories" || pathname === "/admin/users" || pathname === "/staff/sellers" || /^\/staff\/sellers\/[^/]+$/.test(pathname);
  return <RoleGate allowedRoles={allowedRoles} demoAccess={demoRoute}>{children}</RoleGate>;
}
