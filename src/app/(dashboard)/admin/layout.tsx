import { Suspense, type ReactNode } from "react";
import { AdminShellClient } from "@/components/client/ClientShells";
import { StaffAdminDemoGate } from "@/components/auth/RoleGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main className="route-loading" role="status">Đang kiểm tra phiên đăng nhập…</main>}><StaffAdminDemoGate allowedRoles={["Admin"]}><AdminShellClient>{children}</AdminShellClient></StaffAdminDemoGate></Suspense>;
}
