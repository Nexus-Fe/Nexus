"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/components/auth/SessionProvider";
import { OnboardingForm, OnboardingStatus } from "@/features/seller/components/Onboarding";
import { getSellerApplicationStatus } from "@/features/seller/services/seller.api";
import type { SellerApplicationStatus } from "@/features/seller/types/seller.types";
import { Card, PageHeading } from "@/components/ui/Primitives";

export default function SellerOnboardingPage() {
  const { user, ready } = useSession();

  const [isFetchingStatus, setIsFetchingStatus] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState<SellerApplicationStatus | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Kiểm tra hồ sơ hiện tại của tài khoản
  useEffect(() => {
    let active = true;
    if (!ready || !user) return;

    void (async () => {
      try {
        const statusData = await getSellerApplicationStatus();
        if (!active) return;
        setApplicationStatus(statusData);

        if (!statusData || !statusData.status) {
          setShowForm(true);
        } else {
          setShowForm(false);
        }
      } catch {
        if (!active) return;
        setApplicationStatus(null);
        setShowForm(true);
      } finally {
        if (active) setIsFetchingStatus(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [ready, user]);

  const isLoading = !ready || (Boolean(user) && isFetchingStatus);

  // Loading phiên đăng nhập
  if (!ready || isLoading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <span className="spinner" style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--sky)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Đang tải hồ sơ mở shop...</p>
      </div>
    );
  }

  // Yêu cầu đăng nhập tài khoản Buyer trước khi đăng ký
  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 16px" }}>
        <Card className="card-pad" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛍️ &rarr; 🏪</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Đăng ký trở thành Người Bán</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
            Vui lòng đăng nhập vào tài khoản của bạn để bắt đầu đăng ký mở gian hàng trên Nexus.
          </p>
          <Link href="/login" className="button button-primary" style={{ minWidth: 160 }}>
            Đăng nhập để đăng ký
          </Link>
        </Card>
      </div>
    );
  }

  // ĐÃ LÀ SELLER ĐƯỢC DUYỆT
  if (applicationStatus?.status === "APPROVED") {
    return (
      <div style={{ maxWidth: 540, margin: "60px auto", padding: "0 16px" }}>
        <Card className="card-pad" style={{ textAlign: "center", border: "1px solid #a7f3d0" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Bạn đã là Người Bán trên Nexus!</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Tài khoản của bạn đã được kiểm duyệt thành công và kích hoạt quyền kinh doanh. Hãy bắt đầu đăng bán sản phẩm và quản lý tồn kho ngay bây giờ.
          </p>
          <Link href="/seller/products" className="button button-primary">
            Vào Quản lý Sản phẩm &rarr;
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 16px", display: "grid", gap: 24 }}>
      {/* Tiêu đề trang chuẩn Nexus */}
      <PageHeading
        title="Đăng Ký Mở Shop (Seller Onboarding)"
        description="Mở rộng cơ hội kinh doanh cùng hàng triệu khách hàng tiềm năng trên hệ sinh thái thương mại điện tử Nexus."
      />

      {/* Hiển thị Trạng thái hoặc Form đăng ký */}
      {showForm ? (
        <div style={{ display: "grid", gap: 16 }}>
          {applicationStatus?.status === "REJECTED" && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="button button-secondary button-small"
              >
                &larr; Xem lại lý do từ chối
              </button>
            </div>
          )}

          <OnboardingForm
            onSuccess={(result) => {
              setApplicationStatus(result);
              setShowForm(false);
            }}
          />
        </div>
      ) : (
        <OnboardingStatus
          initialStatus={applicationStatus}
          onReapply={() => setShowForm(true)}
        />
      )}
    </div>
  );
}
