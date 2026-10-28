import type { ReactNode } from "react";
import { AdminShellClient } from "@/components/client/ClientShells";
import { RoleGate } from "@/components/auth/RoleGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["Admin"]}><AdminShellClient>{children}</AdminShellClient></RoleGate>;
}
