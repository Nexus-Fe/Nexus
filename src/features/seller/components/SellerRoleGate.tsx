"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/auth/SessionProvider";
import { getSellerApplicationStatus } from "../services/seller.api";
import type { SellerApplicationStatus } from "../types/seller.types";
import { ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/Primitives";

export interface SellerRoleGateProps {
  children: ReactNode;
  redirectToOnboarding?: boolean;
}

export function SellerRoleGate({
  children,
  redirectToOnboarding = true,
}: SellerRoleGateProps) {
  const router = useRouter();
  const { user, ready } = useSession();

  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [deniedReason, setDeniedReason] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifySellerAccess() {
      if (!ready) return;

      // 1. Kiểm tra đăng nhập
      if (!user) {
        if (isMounted) {
          setIsCheckingStatus(false);
          setIsApproved(false);
          setDeniedReason("Vui lòng đăng nhập để truy cập trang quản trị Người Bán.");
        }
        return;
      }

      // 2. Kiểm tra nhanh role trong session nếu có
      const roles = user.roles ?? (user.role ? [user.role] : []);
      const hasSellerRole = roles.some((r) => r.toLowerCase() === "seller");

      if (hasSellerRole) {
        if (isMounted) {
          setIsApproved(true);
          setIsCheckingStatus(false);
        }
        return;
      }

      // 3. Nếu chưa có role trong token, kiểm tra trực tiếp trạng thái hồ sơ qua API
      try {
        const appStatus: SellerApplicationStatus | null = await getSellerApplicationStatus();
        if (isMounted) {
          if (appStatus?.status === "APPROVED") {
            setIsApproved(true);
          } else if (appStatus?.status === "PENDING_APPROVAL") {
            setIsApproved(false);
            setDeniedReason("Hồ sơ mở Shop của bạn đang chờ Ban Quản Trị phê duyệt.");
            if (redirectToOnboarding) router.replace("/seller/onboarding");
          } else if (appStatus?.status === "REJECTED") {
            setIsApproved(false);
            setDeniedReason(
              `Hồ sơ mở Shop bị từ chối: ${appStatus.rejectionReason || "Không rõ lý do"}`
            );
            if (redirectToOnboarding) router.replace("/seller/onboarding");
          } else {
            setIsApproved(false);
            setDeniedReason("Bạn chưa đăng ký mở Shop trên Nexus.");
            if (redirectToOnboarding) router.replace("/seller/onboarding");
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setIsApproved(false);
          if (err instanceof ApiError && err.status === 403) {
            setDeniedReason("Tài khoản của bạn không có quyền truy cập khu vực này.");
          } else {
            setDeniedReason("Chưa thể xác minh trạng thái Người Bán. Vui lòng đăng ký mở shop.");
          }
          if (redirectToOnboarding) {
            router.replace("/seller/onboarding");
          }
        }
      } finally {
        if (isMounted) setIsCheckingStatus(false);
      }
    }

    verifySellerAccess();

    return () => {
      isMounted = false;
    };
  }, [user, ready, redirectToOnboarding, router]);

  // Loading state
  if (!ready || isCheckingStatus) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <span className="spinner" style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--sky)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Đang xác thực quyền Người Bán (Seller)...</p>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!user) {
    return (
      <div style={{ maxWidth: 460, margin: "60px auto", padding: "0 16px" }}>
        <Card className="card-pad" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Yêu cầu đăng nhập</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
            Vui lòng đăng nhập bằng tài khoản Người Bán để truy cập trang này.
          </p>
          <Link href="/login" className="button button-primary">
            Đăng nhập ngay
          </Link>
        </Card>
      </div>
    );
  }

  // Không có quyền (Chưa Approved)
  if (!isApproved) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px" }}>
        <Card className="card-pad" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Không có quyền truy cập</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
            {deniedReason || "Trang này chỉ dành cho tài khoản Người Bán đã được phê duyệt."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <Link href="/seller/onboarding" className="button button-primary">
              Đi đến Đăng ký mở Shop
            </Link>
            <Link href="/" className="button button-secondary">
              Về trang chủ
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
