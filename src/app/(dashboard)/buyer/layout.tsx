import type { ReactNode } from "react";
import { BuyerShellClient } from "@/components/client/ClientShells";
import { RoleGate } from "@/components/auth/RoleGate";

export default function BuyerLayout({ children }: { children: ReactNode }) {
  return <RoleGate allowedRoles={["Buyer", "Customer", "Seller", "Staff", "Admin"]}><BuyerShellClient>{children}</BuyerShellClient></RoleGate>;
}
