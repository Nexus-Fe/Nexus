"use client";

import type { ReactNode } from "react";
import { adminNavigation, sellerNavigation, staffNavigation } from "@/constants/navigation";
import { AuthShell, BuyerShell, PortalShell } from "@/components/layout/Shells";

export function AuthShellClient({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}

export function BuyerShellClient({ children }: { children: ReactNode }) {
  return <BuyerShell>{children}</BuyerShell>;
}

export function SellerShellClient({ children }: { children: ReactNode }) {
  return <PortalShell role="Người bán" subtitle="Kênh người bán" items={sellerNavigation}>{children}</PortalShell>;
}

export function StaffShellClient({ children }: { children: ReactNode }) {
  return <PortalShell role="Nhân viên" subtitle="Vận hành sàn" items={staffNavigation}>{children}</PortalShell>;
}

export function AdminShellClient({ children }: { children: ReactNode }) {
  return <PortalShell role="Quản trị viên" subtitle="Quản trị hệ thống" items={adminNavigation}>{children}</PortalShell>;
}
