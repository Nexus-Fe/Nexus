"use client";

import React from "react";
import { SellerRoleGate } from "@/features/seller/components/SellerRoleGate";
import { InventoryManager } from "@/features/seller/components/Inventory";

export default function SellerInventoryPage() {
  return (
    <SellerRoleGate>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px", display: "grid", gap: 24 }}>
        <InventoryManager />
      </div>
    </SellerRoleGate>
  );
}
