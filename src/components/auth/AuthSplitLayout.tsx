"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/constants/routes";
import { Brand } from "@/components/layout/Shells";

interface AuthSplitLayoutProps {
  children: ReactNode;
  backAction?: () => void;
  closeHref?: string;
  badgeText?: string;
  wide?: boolean;
}

export function AuthSplitLayout({
  children,
  backAction,
  closeHref = ROUTES.home,
  badgeText = "System Active   |   NEXUS v2.0",
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

      {/* Nút Quay Lại Cố Định (Khi Trong Form Nhiều Bước) */}
      {backAction && (
        <button
          type="button"
          className="auth-back-btn"
          onClick={backAction}
          aria-label="Quay lại bước trước"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Quay lại</span>
        </button>
      )}

      {/* =========================================================================
          CỘT TRÁI (45% DESKTOP ONLY) - BACKGROUND HERO PHOTO & SLOGAN TOÀN DIỆN
          ========================================================================= */}
      <aside className="auth-split-left" aria-hidden="true">
        {/* Background Hero Image with dark overlay */}
        <div className="auth-split-bg-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/auth_hero.png"
            alt="NEXUS Platform Hero"
            className="auth-split-hero-img"
            loading="eager"
          />
          <div className="auth-split-bg-overlay" />
        </div>

        {/* Ambient Glow Orbs & Subtle Grid */}
        <div className="auth-glow-orb auth-glow-orb-top" />
        <div className="auth-glow-orb auth-glow-orb-bottom" />
        <div className="auth-grid-overlay" />

        {/* Top: Logo Thương Hiệu */}
        <div className="auth-split-left-header">
          <Link href={ROUTES.home} className="auth-left-brand" tabIndex={-1} aria-label="NEXUS Trang chủ">
            <Brand light />
          </Link>
        </div>

        {/* Center: Hero Slogan & Giá Trị Cốt Lõi */}
        <div className="auth-split-hero">
          <div className="auth-hero-pill">
            <span className="auth-pill-dot" />
            <span>NỀN TẢNG BẢO CHỨNG THƯƠNG MẠI &amp; ĐẤU GIÁ</span>
          </div>

          <h1 className="auth-hero-heading">
            Intelligent flow,<br />
            <span className="auth-hero-highlight">secured.</span>
          </h1>

          <p className="auth-hero-sub">
            Hệ sinh thái đấu giá trực tuyến thời gian thực &amp; sàn thương mại điện tử bảo chứng an toàn tuyệt đối.
          </p>

          <div className="auth-hero-features">
            {/* Feature 1 */}
            <div className="auth-feature-card">
              <div className="auth-feature-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <strong>Đấu giá Realtime Mili-giây</strong>
                <span>Phòng đấu giá trực quan, khớp lệnh tức thì từng bước giá</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="auth-feature-card">
              <div className="auth-feature-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <strong>Ký quỹ Bảo chứng 100%</strong>
                <span>Tiền gửi bảo chứng an toàn, bảo vệ người mua và nhà bán</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="auth-feature-card">
              <div className="auth-feature-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="auth-feature-text">
                <strong>Kho Vận GHN Toàn Quốc</strong>
                <span>Tự động liên kết mạng lưới bưu cục giao nhận chuẩn hóa</span>
              </div>
            </div>
          </div>

          {/* Social Proof Stats */}
          <div className="auth-hero-stats">
            <div className="auth-stat-item">
              <strong>10.000+</strong>
              <span>Nhà bán uy tín</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat-item">
              <strong>100.000+</strong>
              <span>Phiên đấu giá</span>
            </div>
            <div className="auth-stat-divider" />
            <div className="auth-stat-item">
              <strong>99.9%</strong>
              <span>Hài lòng</span>
            </div>
          </div>
        </div>

        {/* Bottom: Trạng Thái Hệ Thống Nhấp Nháy (System Active) */}
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


        {/* Container Chứa Nội Dung Form Được Căn Giữa Hoàn Hảo */}
        <div className={`auth-split-body ${wide ? "auth-split-body-wide" : ""}`}>
          {children}
        </div>
      </section>
    </div>
  );
}
