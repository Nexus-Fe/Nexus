import type { ReactNode } from "react";
import { StaffShellClient } from "@/components/client/ClientShells";
import { RoleGate } from "@/components/auth/RoleGate";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["Staff", "Admin"]}><StaffShellClient>{children}</StaffShellClient></RoleGate>;
}
