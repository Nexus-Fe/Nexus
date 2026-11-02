"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { ApiError } from "@/lib/api/client";
import { getSellerApplicationStatus } from "../../services/seller.api";
import type { SellerApplicationStatus } from "../../types/seller.types";
import { Card, Badge } from "@/components/ui/Primitives";

export interface OnboardingStatusProps {
  initialStatus?: SellerApplicationStatus | null;
  onReapply?: () => void;
  className?: string;
}

export function OnboardingStatus({
  initialStatus,
  onReapply,
  className = "",
}: OnboardingStatusProps) {
  const [statusData, setStatusData] = useState<SellerApplicationStatus | null>(initialStatus ?? null);
  const [isFetching, setIsFetching] = useState(!initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsFetching(true);
    setErrorMessage(null);
    setIsForbidden(false);
    setIsEmpty(false);

    try {
      const data = await getSellerApplicationStatus();
      if (!data || !data.status) {
        setIsEmpty(true);
        setStatusData(null);
      } else {
        setStatusData(data);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setIsForbidden(true);
        } else if (err.status === 404) {
          setIsEmpty(true);
        } else {
          setErrorMessage(err.message || "Không thể tải thông tin trạng thái hồ sơ.");
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Đã có lỗi xảy ra trong quá trình kiểm tra hồ sơ.");
      }
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (initialStatus) return;
    let active = true;

    void (async () => {
      try {
        const data = await getSellerApplicationStatus();
        if (!active) return;
        if (!data || !data.status) {
          setIsEmpty(true);
          setStatusData(null);
        } else {
          setStatusData(data);
        }
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof ApiError) {
          if (err.status === 403) setIsForbidden(true);
          else if (err.status === 404) setIsEmpty(true);
          else setErrorMessage(err.message || "Không thể tải thông tin trạng thái hồ sơ.");
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Đã có lỗi xảy ra trong quá trình kiểm tra hồ sơ.");
        }
      } finally {
        if (active) setIsFetching(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [initialStatus]);

  // 1. TRẠNG THÁI LOADING
  if (isFetching) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <span className="spinner" style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--sky)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Đang kiểm tra trạng thái hồ sơ mở shop...</p>
      </Card>
    );
  }

  // 2. TRẠNG THÁI KHÔNG CÓ QUYỀN TRUY CẬP (FORBIDDEN 403)
  if (isForbidden) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Không có quyền truy cập</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
          Tài khoản hiện tại của bạn không đủ quyền hạn để xem trạng thái mở shop. Vui lòng đăng nhập bằng tài khoản Buyer hợp lệ.
        </p>
        <Link href={ROUTES.auth.login} className="button button-primary">
          Đăng nhập lại
        </Link>
      </Card>
    );
  }

  // 3. TRẠNG THÁI LỖI (ERROR)
  if (errorMessage) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
        <h3 style={{ fontSize: 17, marginBottom: 8, color: "#991b1b" }}>Lỗi kiểm tra hồ sơ</h3>
        <p style={{ color: "#991b1b", fontSize: 13, marginBottom: 18 }}>{errorMessage}</p>
        <button type="button" onClick={fetchStatus} className="button button-secondary">
          Thử lại
        </button>
      </Card>
    );
  }

  // 4. TRẠNG THÁI RỖNG (EMPTY - CHƯA NỘP HỒ SƠ)
  if (isEmpty || !statusData) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Chưa có hồ sơ đăng ký</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
          Bạn chưa nộp hồ sơ đăng ký mở shop trên hệ thống Nexus. Hãy điền thông tin để bắt đầu kinh doanh.
        </p>
        {onReapply && (
          <button type="button" onClick={onReapply} className="button button-primary">
            Đăng ký mở Shop ngay
          </button>
        )}
      </Card>
    );
  }

  // 5. TRẠNG THÁI THÀNH CÔNG (SUCCESS) - PHÂN NHÁNH 3 TRẠNG THÁI HỒ SƠ
  const { status, rejectionReason, appliedAt, registrationId } = statusData;

  // 5A. CHỜ DUYỆT (PENDING / PENDING_APPROVAL)
  if (status === "PENDING_APPROVAL") {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 680, margin: "0 auto", border: "1px solid #fde68a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #fef3c7", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>⏳</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Hồ sơ đang chờ duyệt</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Staff sẽ kiểm tra và phản hồi trong vòng 24 - 48 giờ làm việc
              </p>
            </div>
          </div>
          <Badge tone="amber">Chờ duyệt</Badge>
        </div>

        <div style={{ background: "#fffbeb", padding: 16, borderRadius: 10, margin: "20px 0", display: "grid", gap: 8, fontSize: 13 }}>
          {registrationId && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#92400e" }}>Mã hồ sơ:</span>
              <strong style={{ fontFamily: "monospace" }}>{registrationId}</strong>
            </div>
          )}
          {appliedAt && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#92400e" }}>Thời gian gửi:</span>
              <span>{new Date(appliedAt).toLocaleString("vi-VN")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#92400e" }}>Tình trạng:</span>
            <strong style={{ color: "#b45309" }}>Đang trong hàng đợi kiểm duyệt</strong>
          </div>
        </div>

        <div className="action-row">
          <button type="button" onClick={fetchStatus} className="button button-secondary">
            Làm mới trạng thái
          </button>
        </div>
      </Card>
    );
  }

  // 5B. ĐÃ DUYỆT (APPROVED)
  if (status === "APPROVED") {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 680, margin: "0 auto", border: "1px solid #a7f3d0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #d1fae5", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Hồ sơ đã được phê duyệt!</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Chào mừng bạn chính thức trở thành Người Bán hàng trên Nexus
              </p>
            </div>
          </div>
          <Badge tone="green">Đã duyệt</Badge>
        </div>

        <p style={{ margin: "20px 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          Cửa hàng của bạn đã sẵn sàng hoạt động. Bạn có thể truy cập ngay vào Kênh Người Bán để thiết lập sản phẩm, quản lý kho và xử lý đơn hàng.
        </p>

        <div className="action-row">
          <Link href={ROUTES.seller.products} className="button button-primary">
            Vào Kênh Người Bán &rarr;
          </Link>
        </div>
      </Card>
    );
  }

  // 5C. TỪ CHỐI (REJECTED)
  if (status === "REJECTED") {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 680, margin: "0 auto", border: "1px solid #fecdd3" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #ffe4e6", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>❌</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#9f1239" }}>Hồ sơ bị từ chối phê duyệt</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Vui lòng xem chi tiết lý do từ chối bên dưới để chỉnh sửa và gửi lại
              </p>
            </div>
          </div>
          <Badge tone="red">Từ chối</Badge>
        </div>

        {/* BẮT BUỘC HIỂN THỊ LÝ DO TỪ CHỐI */}
        <div style={{ background: "#fff1f2", padding: 16, borderRadius: 10, margin: "20px 0", border: "1px solid #fecdd3" }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#be123c", textTransform: "uppercase" }}>
            Lý do từ chối từ Ban Quản Trị:
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#881337", fontWeight: 500 }}>
            {rejectionReason || "Hồ sơ chưa đạt tiêu chuẩn xác thực thông tin pháp lý hoặc địa chỉ kho hàng không hợp lệ."}
          </p>
        </div>

        <div className="action-row" style={{ justifyContent: "space-between" }}>
          <button type="button" onClick={fetchStatus} className="button button-secondary">
            Làm mới
          </button>
          {onReapply && (
            <button type="button" onClick={onReapply} className="button button-primary">
              Chỉnh sửa & Nộp lại hồ sơ
            </button>
          )}
        </div>
      </Card>
    );
  }

  return null;
}
