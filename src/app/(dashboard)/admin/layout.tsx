export const instant = false;
import { Suspense, type ReactNode } from "react";
import { AdminShellClient } from "@/components/client/ClientShells";
import { RoleGate } from "@/components/auth/RoleGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main className="route-loading" role="status">Đang kiểm tra phiên đăng nhập…</main>}><RoleGate allowedRoles={["Admin"]}><AdminShellClient>{children}</AdminShellClient></RoleGate></Suspense>;
}
