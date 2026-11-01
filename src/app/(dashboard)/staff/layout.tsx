import { Suspense, type ReactNode } from "react";
import { StaffShellClient } from "@/components/client/ClientShells";
import { StaffAdminDemoGate } from "@/components/auth/RoleGate";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main className="route-loading" role="status">Đang kiểm tra phiên đăng nhập…</main>}><StaffAdminDemoGate allowedRoles={["Staff", "Admin"]}><StaffShellClient>{children}</StaffShellClient></StaffAdminDemoGate></Suspense>;
}
