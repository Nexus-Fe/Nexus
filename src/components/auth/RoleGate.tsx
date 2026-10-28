"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSession } from "./SessionProvider";

function normalizeRole(role: string): string {
  return role.toLocaleLowerCase("en-US");
}

export function RoleGate({ allowedRoles, children }: { allowedRoles: string[]; children: ReactNode }) {
  const { user, ready } = useSession();
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
