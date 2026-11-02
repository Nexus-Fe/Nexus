"use client";

import React from "react";
import { SellerRoleGate } from "@/features/seller/components/SellerRoleGate";
import { SellerProfileForm } from "@/features/seller/components/Profile";
import { PageHeading } from "@/components/ui/Primitives";

export default function SellerProfilePage() {
  return (
    <SellerRoleGate>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 16px", display: "grid", gap: 24 }}>
        <PageHeading
          title="Quản Lý Hồ Sơ Cửa Hàng"
          description="Thiết lập các thông tin cơ bản, hotline hỗ trợ và địa chỉ lấy hàng của shop."
        />

        <SellerProfileForm />
      </div>
    </SellerRoleGate>
  );
}
