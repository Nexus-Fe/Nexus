"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/constants/routes";
import { NexusBrandHeader } from "@/components/ui/NexusLogo";

interface AuthSplitLayoutProps {
  children: ReactNode;
  closeHref?: string;
  badgeText?: string;
  wide?: boolean;
}

export function AuthSplitLayout({
  children,
  closeHref = ROUTES.home,
  badgeText = "NEXUS • Sàn thương mại điện tử & Đấu giá trực tuyến",
  wide = false,
}: AuthSplitLayoutProps) {
  const closeLabel = closeHref === ROUTES.home ? "Đóng và quay lại trang chủ" : "Quay lại";

  return (
    <div className="auth-split-container">
      {/* Nút Đóng [X] Toàn Cục Cố Định Ở Góc Trên Phải Màn Hình */}
      <Link
        href={closeHref}
        className="auth-close-btn"
        aria-label={closeLabel}
        title={closeLabel}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </Link>

      {/* =========================================================================
          CỘT TRÁI (45% DESKTOP ONLY) - SÀN THƯƠNG MẠI TRỌNG YẾU & ĐẤU GIÁ
          ========================================================================= */}
      <aside className="auth-split-left" aria-label="Giới thiệu NEXUS">
        {/* Top: Logo Thương Hiệu với Biểu tượng Búa Đấu Giá */}
        <div className="auth-split-left-header">
          <Link
            href={ROUTES.home}
            className="auth-left-brand"
            aria-label="NEXUS Trang chủ"
            title="Quay lại trang chủ"
          >
            <NexusBrandHeader light height={34} />
          </Link>
        </div>

        {/* Hero Intro: Thông Điệp Trọng Tâm Thương Mại & Đấu Giá */}
        <div className="auth-hero-intro">
          <div className="auth-hero-pill">
            <span className="auth-pill-dot" />
            <span>SÀN THƯƠNG MẠI ĐIỆN TỬ</span>
          </div>

          <h1 className="auth-hero-heading">
            Mua bán an tâm.<br />
            <span className="auth-hero-highlight">Đấu giá minh bạch.</span>
          </h1>

          <p className="auth-hero-sub">
            Nền tảng mua sắm trực tuyến và đấu giá với cơ chế bảo vệ giao dịch công bằng cho người mua và người bán.
          </p>
        </div>

        {/* Trust & Benefit Badges */}
        <div className="auth-trust-badges">
          {/* Điểm 1: Mua sắm tiện lợi */}
          <div className="auth-trust-badge-item">
            <div className="auth-trust-badge-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div className="auth-trust-badge-content">
              <strong>Mua sắm tiện lợi</strong>
              <span>Đặt mua trực tiếp dễ dàng từ các gian hàng uy tín</span>
            </div>
          </div>

          {/* Điểm 2: Đấu giá trực tiếp */}
          <div className="auth-trust-badge-item">
            <div className="auth-trust-badge-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="auth-trust-badge-content">
              <strong>Đấu giá trực tiếp</strong>
              <span>Tham gia săn sản phẩm giá trị với từng bước giá công khai</span>
            </div>
          </div>

          {/* Điểm 3: Bảo đảm quyền lợi */}
          <div className="auth-trust-badge-item">
            <div className="auth-trust-badge-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="auth-trust-badge-content">
              <strong>Bảo đảm quyền lợi</strong>
              <span>Người bán chỉ nhận tiền khi người mua đã nhận đúng hàng</span>
            </div>
          </div>
        </div>

        {/* Bottom: Trạng Thái Hệ Thống */}
        <div className="auth-split-left-footer">
          <div className="auth-system-status">
            <span className="auth-status-pulse">
              <span className="auth-status-dot-ping" />
              <span className="auth-status-dot" />
            </span>
            <span className="auth-status-label">{badgeText}</span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          CỘT PHẢI (55% DESKTOP / 100% MOBILE) - FORM CHÍNH TOÀN DIỆN
          ========================================================================= */}
      <section className="auth-split-right">
        <div className={`auth-split-body ${wide ? "auth-split-body-wide" : ""}`}>
          <div className="auth-form-brand">
            <Link
              href={ROUTES.home}
              aria-label="NEXUS Trang chủ"
              title="Quay lại trang chủ"
              style={{ display: "inline-flex", textDecoration: "none" }}
            >
              <NexusBrandHeader height={30} />
            </Link>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
