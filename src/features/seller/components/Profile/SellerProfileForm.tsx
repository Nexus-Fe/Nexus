"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import { getSellerProfile, updateSellerProfile } from "../../services/seller.api";
import type { SellerProfile, UpdateSellerProfileDTO } from "../../types/seller.types";
import { Card } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";

export const sellerProfileSchema = z.object({
  shopName: z
    .string()
    .trim()
    .min(3, "Tên shop tối thiểu 3 ký tự")
    .max(50, "Tên shop tối đa 50 ký tự"),
  hotline: z
    .string()
    .trim()
    .regex(/^(0)(2|3|5|7|8|9)[0-9]{8,9}$/, "Hotline không đúng định dạng số điện thoại Việt Nam"),
  pickupAddress: z
    .string()
    .trim()
    .min(10, "Địa chỉ lấy hàng / kho phải chi tiết (tối thiểu 10 ký tự)"),
  description: z
    .string()
    .trim()
    .max(500, "Mô tả shop tối đa 500 ký tự")
    .optional()
    .or(z.literal("")),
});

export type SellerProfileFormValues = z.infer<typeof sellerProfileSchema>;

export interface SellerProfileFormProps {
  onProfileUpdated?: (profile: SellerProfile) => void;
  className?: string;
}

export function SellerProfileForm({
  onProfileUpdated,
  className = "",
}: SellerProfileFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<SellerProfile | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SellerProfileFormValues>({
    resolver: zodResolver(sellerProfileSchema),
    defaultValues: {
      shopName: "",
      hotline: "",
      pickupAddress: "",
      description: "",
    },
    mode: "onBlur",
  });

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);
    setIsEmpty(false);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    try {
      const data = await getSellerProfile();
      if (!data || !data.shopName) {
        setIsEmpty(true);
        setCurrentProfile(null);
      } else {
        setCurrentProfile(data);
        reset({
          shopName: data.shopName ?? "",
          hotline: data.hotline ?? "",
          pickupAddress: data.pickupAddress ?? "",
          description: data.description ?? "",
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setIsForbidden(true);
        } else if (err.status === 404) {
          setIsEmpty(true);
        } else {
          setErrorMessage(err.message || "Không thể tải thông tin hồ sơ shop.");
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Đã xảy ra lỗi không xác định khi kết nối với máy chủ.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getSellerProfile();
        if (!active) return;
        if (!data || !data.shopName) {
          setIsEmpty(true);
          setCurrentProfile(null);
        } else {
          setCurrentProfile(data);
          reset({
            shopName: data.shopName ?? "",
            hotline: data.hotline ?? "",
            pickupAddress: data.pickupAddress ?? "",
            description: data.description ?? "",
          });
        }
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof ApiError) {
          if (err.status === 403) setIsForbidden(true);
          else if (err.status === 404) setIsEmpty(true);
          else setErrorMessage(err.message || "Không thể tải thông tin hồ sơ shop.");
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Đã xảy ra lỗi không xác định.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reset]);

  const onSave = async (values: SellerProfileFormValues) => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    try {
      const payload: UpdateSellerProfileDTO = {
        shopName: values.shopName,
        hotline: values.hotline,
        pickupAddress: values.pickupAddress,
        description: values.description || undefined,
      };

      const updated = await updateSellerProfile(payload);
      const mergedProfile: SellerProfile = {
        ...currentProfile,
        ...updated,
        shopName: updated.shopName || values.shopName,
        hotline: updated.hotline || values.hotline,
        pickupAddress: updated.pickupAddress || values.pickupAddress,
        description: updated.description ?? values.description,
      };

      setCurrentProfile(mergedProfile);
      reset({
        shopName: mergedProfile.shopName,
        hotline: mergedProfile.hotline,
        pickupAddress: mergedProfile.pickupAddress,
        description: mergedProfile.description ?? "",
      });

      setSaveSuccessMessage("Thông tin hồ sơ Shop đã được lưu thành công!");
      onProfileUpdated?.(mergedProfile);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSaveErrorMessage(err.message || "Không thể cập nhật hồ sơ shop.");
      } else if (err instanceof Error) {
        setSaveErrorMessage(err.message);
      } else {
        setSaveErrorMessage("Cập nhật thất bại. Vui lòng thử lại sau.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 1. TRẠNG THÁI LOADING SKELETON
  if (isLoading) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ height: 24, width: "35%", background: "var(--line)", borderRadius: 6 }} />
          <div style={{ height: 16, width: "55%", background: "#f1f5f9", borderRadius: 6 }} />
          <div style={{ display: "grid", gap: 16, marginTop: 10 }}>
            <div style={{ height: 42, background: "#f8fafc", borderRadius: 8, border: "1px solid var(--line)" }} />
            <div style={{ height: 42, background: "#f8fafc", borderRadius: 8, border: "1px solid var(--line)" }} />
            <div style={{ height: 106, background: "#f8fafc", borderRadius: 8, border: "1px solid var(--line)" }} />
          </div>
        </div>
      </Card>
    );
  }

  // 2. FORBIDDEN (403)
  if (isForbidden) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Không có quyền truy cập</h3>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Bạn cần đăng nhập tài khoản Seller được ủy quyền để quản lý hồ sơ cửa hàng này.
        </p>
      </Card>
    );
  }

  // 3. ERROR
  if (errorMessage) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
        <h3 style={{ fontSize: 17, marginBottom: 8, color: "#991b1b" }}>Không thể tải hồ sơ Shop</h3>
        <p style={{ color: "#991b1b", fontSize: 13, marginBottom: 18 }}>{errorMessage}</p>
        <button type="button" onClick={fetchProfile} className="button button-secondary">
          Thử lại
        </button>
      </Card>
    );
  }

  // 4. EMPTY
  if (isEmpty || !currentProfile) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🏪</div>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Chưa có thông tin Shop</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
          Hệ thống không tìm thấy dữ liệu hồ sơ shop cho tài khoản của bạn.
        </p>
        <button type="button" onClick={fetchProfile} className="button button-secondary">
          Tải lại trang
        </button>
      </Card>
    );
  }

  // 5. SUCCESS FORM
  return (
    <div className={`space-y-6 ${className}`} style={{ maxWidth: 860, margin: "0 auto" }}>
      {saveSuccessMessage && (
        <div
          role="status"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="check" size={16} />
            <strong>{saveSuccessMessage}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage(null)}
            style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div
          role="alert"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span>
            <strong>{saveErrorMessage}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSaveErrorMessage(null)}
            style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSave)} noValidate style={{ display: "grid", gap: 24 }}>
        <Card className="card-pad">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Thông Tin Gian Hàng</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Thông tin này sẽ được hiển thị công khai cho người mua hàng trên sàn Nexus.
              </p>
            </div>
            {currentProfile.shopId && (
              <span style={{ fontSize: 11, fontFamily: "monospace", background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, color: "var(--muted)" }}>
                ID: {currentProfile.shopId}
              </span>
            )}
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            {/* Tên Shop */}
            <div className="field-wrap">
              <label htmlFor="shopName">
                Tên Shop <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="shopName"
                type="text"
                disabled={isSaving}
                placeholder="VD: Nexus Official Store"
                className="field"
                {...register("shopName")}
              />
              {errors.shopName && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.shopName.message}
                </p>
              )}
            </div>

            {/* Hotline */}
            <div className="field-wrap">
              <label htmlFor="hotline">
                Hotline liên hệ / CSKH <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="hotline"
                type="tel"
                disabled={isSaving}
                placeholder="VD: 02873001234 hoặc 0912345678"
                className="field"
                {...register("hotline")}
              />
              {errors.hotline && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.hotline.message}
                </p>
              )}
            </div>

            {/* Địa chỉ lấy hàng / Kho */}
            <div className="field-wrap">
              <label htmlFor="pickupAddress">
                Địa chỉ lấy hàng / Kho <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                id="pickupAddress"
                rows={3}
                disabled={isSaving}
                placeholder="Nhập địa chỉ cụ thể để đơn vị vận chuyển đến lấy kiện hàng"
                className="textarea-field"
                {...register("pickupAddress")}
              />
              {errors.pickupAddress && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.pickupAddress.message}
                </p>
              )}
              <small style={{ color: "var(--muted)", fontSize: 11 }}>
                Lưu ý: Thay đổi địa chỉ kho có thể ảnh hưởng đến cước phí vận chuyển tính cho người mua.
              </small>
            </div>

            {/* Mô tả */}
            <div className="field-wrap">
              <label htmlFor="description">Mô tả giới thiệu Shop (Tùy chọn)</label>
              <textarea
                id="description"
                rows={3}
                disabled={isSaving}
                placeholder="Giới thiệu điểm mạnh, phương châm kinh doanh hoặc thông điệp gửi tới khách hàng..."
                className="textarea-field"
                {...register("description")}
              />
              {errors.description && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Read-only stats */}
            {(currentProfile.ratingAvg !== undefined || currentProfile.totalProducts !== undefined) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, paddingTop: 16, borderTop: "1px solid var(--line)", fontSize: 12 }}>
                {currentProfile.ratingAvg !== undefined && (
                  <div>
                    <span style={{ color: "var(--muted)" }}>Đánh giá trung bình:</span>{" "}
                    <strong style={{ color: "#d97706" }}>⭐ {currentProfile.ratingAvg} / 5</strong>
                  </div>
                )}
                {currentProfile.totalProducts !== undefined && (
                  <div>
                    <span style={{ color: "var(--muted)" }}>Tổng sản phẩm:</span>{" "}
                    <strong>{currentProfile.totalProducts}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Nút lưu */}
        <div className="action-row">
          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className={`button button-primary ${isSaving || !isDirty ? "button-disabled" : ""}`}
            style={{ minWidth: 150, minHeight: 44 }}
          >
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
