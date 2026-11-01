import type { ReactNode } from "react";
import { SellerShellClient } from "@/components/client/ClientShells";
import { RoleGate } from "@/components/auth/RoleGate";

export default function SellerLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["Seller"]}><SellerShellClient>{children}</SellerShellClient></RoleGate>;
}
