"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "./SessionProvider";

function normalizeRole(role: string): string {
  const normalized = role.toLocaleLowerCase("en-US").replace(/^role_/, "");
  if (normalized === "staff" || normalized === "supportstaff") return "supportstaff";
  if (normalized === "admin" || normalized === "administrator") return "admin";
  return normalized;
}

export function RoleGate({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { user, ready, restoreError, refreshUser } = useSession();
  const router = useRouter();

  const userRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
  const roles = userRoles;
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

  if (!ready) {
    return <main className="route-loading" role="status" aria-live="polite">Đang kiểm tra phiên đăng nhập…</main>;
  }
  if (!user) {
    if (restoreError) {
      return <main className="access-state" role="alert"><h1>Chưa khôi phục được phiên</h1><p>{restoreError}</p><button type="button" className="button button-primary" onClick={() => void refreshUser()}>Thử lại</button></main>;
    }
    return (
      <main className="access-state">
        <h1>Đăng nhập để tiếp tục</h1>
        <p>Khu vực này yêu cầu tài khoản Nexus có quyền phù hợp.</p>
        <Link className="button button-primary" href="/login">Đăng nhập</Link>
      </main>
    );
  }

  if (!hasAccess) {
    const destination = isAdmin ? ROUTES.admin.overview : isStaff ? ROUTES.staff.auctions : ROUTES.home;
    const destinationLabel = isAdmin ? "Về trang quản trị" : isStaff ? "Về trang vận hành" : "Về trang chủ";

    return (
      <main className="access-state" role="alert">
        <h1>Bạn không có quyền mở trang này</h1>
        <p>
          {isAdmin || isStaff
            ? "Tài khoản quản trị/vận hành chỉ thao tác trong phân hệ chuyên biệt. Đang chuyển hướng…"
            : "Đăng nhập bằng tài khoản có vai trò phù hợp hoặc quay lại trang chủ."}
        </p>
        <Link className="button button-secondary" href={destination}>{destinationLabel}</Link>
      </main>
    );
  }
  return children;
}
