"use client";

import { staffAdminDemoEnabled } from "@/lib/demo/staff-admin-demo";

export function StaffAdminDemoNotice() {
  if (!staffAdminDemoEnabled) return null;
  return <p className="notice" role="status">Demo FE local — dữ liệu mẫu chỉ lưu trong phiên trình duyệt, không gửi tới backend.</p>;
}
