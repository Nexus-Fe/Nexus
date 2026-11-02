"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SellerRegistrationForm, SellerApplicationStatus } from "../../types/seller.types";
import { submitSellerApplication } from "../../services/seller.api";
import { ApiError } from "@/lib/api/client";
import { Card, SectionHeading } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";

export const onboardingFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ và tên tối thiểu 2 ký tự")
    .max(100, "Họ và tên tối đa 100 ký tự"),
  email: z
    .string()
    .trim()
    .min(1, "Email không được để trống")
    .email("Định dạng email không hợp lệ"),
  phone: z
    .string()
    .trim()
    .regex(/^(0)(3|5|7|8|9)[0-9]{8}$/, "Số điện thoại không hợp lệ (10 số, đầu 03, 05, 07, 08, 09)"),
  citizenId: z
    .string()
    .trim()
    .regex(/^[0-9]{12}$/, "Số CCCD phải gồm đúng 12 chữ số"),
  shopName: z
    .string()
    .trim()
    .min(3, "Tên shop tối thiểu 3 ký tự")
    .max(50, "Tên shop tối đa 50 ký tự"),
  hotline: z
    .string()
    .trim()
    .regex(/^(0)(2|3|5|7|8|9)[0-9]{8,9}$/, "Hotline không hợp lệ (10-11 chữ số)"),
  warehouseAddress: z
    .string()
    .trim()
    .min(10, "Địa chỉ lấy hàng/kho phải tối thiểu 10 ký tự chi tiết"),
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export interface OnboardingFormProps {
  onSuccess?: (result: SellerApplicationStatus) => void;
  initialValues?: Partial<SellerRegistrationForm>;
  className?: string;
}

export function OnboardingForm({
  onSuccess,
  initialValues,
  className = "",
}: OnboardingFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      fullName: initialValues?.fullName ?? "",
      email: initialValues?.email ?? "",
      phone: initialValues?.phone ?? "",
      citizenId: initialValues?.citizenId ?? "",
      shopName: initialValues?.shopName ?? "",
      hotline: initialValues?.hotline ?? "",
      warehouseAddress: initialValues?.warehouseAddress ?? "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: OnboardingFormValues) => {
    setSubmitError(null);

    try {
      // Bảo mật: Không log values chứa CCCD ra console
      const result = await submitSellerApplication(values);
      setIsSuccess(true);
      reset();
      onSuccess?.(result);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setSubmitError("Hồ sơ đăng ký hoặc CCCD/Email này đã tồn tại trong hệ thống.");
        } else if (err.status === 403) {
          setSubmitError("Tài khoản của bạn không có quyền thực hiện đăng ký mở shop.");
        } else {
          setSubmitError(err.message || "Không thể gửi hồ sơ đăng ký. Vui lòng thử lại.");
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`} style={{ maxWidth: 860, margin: "0 auto" }}>
      {submitError && (
        <div
          role="alert"
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <strong>{submitError}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {isSuccess && (
        <div
          role="status"
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Icon name="check" size={18} />
          <span>Hồ sơ mở shop đã được gửi thành công và đang chuyển sang trạng thái chờ phê duyệt!</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "grid", gap: 24 }}>
        {/* PHẦN 1: THÔNG TIN CÁ NHÂN */}
        <Card className="card-pad">
          <SectionHeading
            title="1. Thông tin cá nhân người đại diện"
            hint="Nexus dùng thông tin này để xác thực danh tính chủ shop và đối soát pháp lý."
          />

          <div className="form-grid" style={{ marginTop: 20 }}>
            {/* Họ và tên */}
            <div className="field-wrap">
              <label htmlFor="fullName">
                Họ và tên <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="fullName"
                type="text"
                disabled={isSubmitting}
                placeholder="Nguyễn Văn A"
                className="field"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="field-wrap">
              <label htmlFor="email">
                Email liên hệ <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="email"
                type="email"
                disabled={isSubmitting}
                placeholder="seller@example.com"
                className="field"
                {...register("email")}
              />
              {errors.email && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Số điện thoại */}
            <div className="field-wrap">
              <label htmlFor="phone">
                Số điện thoại <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="phone"
                type="tel"
                disabled={isSubmitting}
                placeholder="0912345678"
                className="field"
                {...register("phone")}
              />
              {errors.phone && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* CCCD / CMND */}
            <div className="field-wrap">
              <label htmlFor="citizenId">
                Số CCCD / CMND (12 chữ số) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="citizenId"
                type="text"
                maxLength={12}
                disabled={isSubmitting}
                placeholder="001099000123"
                autoComplete="off"
                className="field"
                {...register("citizenId")}
              />
              {errors.citizenId && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.citizenId.message}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* PHẦN 2: THÔNG TIN SHOP */}
        <Card className="card-pad">
          <SectionHeading
            title="2. Thông tin Shop & Kho lấy hàng"
            hint="Tên shop hiển thị công khai trên sàn và địa chỉ để đơn vị vận chuyển đến lấy hàng."
          />

          <div className="form-grid" style={{ marginTop: 20 }}>
            {/* Tên Shop */}
            <div className="field-wrap">
              <label htmlFor="shopName">
                Tên Shop <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="shopName"
                type="text"
                disabled={isSubmitting}
                placeholder="Nexus Official Store"
                className="field"
                {...register("shopName")}
              />
              {errors.shopName && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.shopName.message}
                </p>
              )}
            </div>

            {/* Hotline Shop */}
            <div className="field-wrap">
              <label htmlFor="hotline">
                Hotline hỗ trợ Shop <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                id="hotline"
                type="tel"
                disabled={isSubmitting}
                placeholder="02873001234"
                className="field"
                {...register("hotline")}
              />
              {errors.hotline && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.hotline.message}
                </p>
              )}
            </div>

            {/* Địa chỉ lấy hàng / kho */}
            <div className="field-wrap" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="warehouseAddress">
                Địa chỉ lấy hàng / Kho chi tiết <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                id="warehouseAddress"
                rows={3}
                disabled={isSubmitting}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                className="textarea-field"
                {...register("warehouseAddress")}
              />
              {errors.warehouseAddress && (
                <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>
                  {errors.warehouseAddress.message}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Nút Submit có cơ chế chống gửi trùng */}
        <div className="action-row">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`button button-primary ${isSubmitting ? "button-disabled" : ""}`}
            style={{ minWidth: 180, minHeight: 44 }}
          >
            {isSubmitting ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className="spinner" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                Đang gửi hồ sơ...
              </span>
            ) : (
              "Gửi hồ sơ đăng ký"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
