"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SellerRegistrationForm, SellerApplicationStatus } from "../../types/seller.types";
import { submitSellerApplication } from "../../services/seller.api";
import { ApiError } from "@/lib/api/client";
import { Card, Badge } from "@/components/ui/Primitives";
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
    <div className={`w-full ${className}`}>
      {submitError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <strong>{submitError}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="text-red-700 hover:text-red-900 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {isSuccess && (
        <div
          role="status"
          className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2"
        >
          <Icon name="check" size={18} />
          <span>Hồ sơ mở shop đã được gửi thành công và đang chuyển sang trạng thái chờ phê duyệt!</span>
        </div>
      )}

      {/* GỘP TOÀN BỘ VÀO 1 CARD DUY NHẤT VÀ MỞ RỘNG FULL WIDTH */}
      <Card className="card-pad w-full">
        {/* Header của Form */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Hồ Sơ Đăng Ký Mở Gian Hàng</h2>
            <p className="text-xs text-slate-500 mt-1">
              Vui lòng hoàn tất thông tin cá nhân người đại diện và thông tin shop để gửi duyệt mở shop.
            </p>
          </div>
          <Badge tone="sky">Onboarding</Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* GRID LAYOUT 2 CỘT TỐI ƯU KHÔNG GIAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TIÊU ĐỀ PHỤ: PHẦN 1 */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Thông tin cá nhân người đại diện
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nexus dùng thông tin này để xác thực danh tính chủ shop và đối soát pháp lý.
              </p>
            </div>

            {/* HÀNG 1: Họ và tên (Cột 1) | Email (Cột 2) */}
            <div className="field-wrap">
              <label htmlFor="fullName" className="text-xs font-semibold text-slate-700">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                disabled={isSubmitting}
                placeholder="Nguyễn Văn A"
                className="field w-full"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div className="field-wrap">
              <label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email liên hệ <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                disabled={isSubmitting}
                placeholder="seller@example.com"
                className="field w-full"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* HÀNG 2: Số điện thoại (Cột 1) | Số CCCD (Cột 2) */}
            <div className="field-wrap">
              <label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                disabled={isSubmitting}
                placeholder="0912345678"
                className="field w-full"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div className="field-wrap">
              <label htmlFor="citizenId" className="text-xs font-semibold text-slate-700">
                Số CCCD / CMND (12 chữ số) <span className="text-red-500">*</span>
              </label>
              <input
                id="citizenId"
                type="text"
                maxLength={12}
                disabled={isSubmitting}
                placeholder="001099000123"
                autoComplete="off"
                className="field w-full font-mono"
                {...register("citizenId")}
              />
              {errors.citizenId && (
                <p className="text-xs text-red-500 mt-1">{errors.citizenId.message}</p>
              )}
            </div>

            {/* ĐƯỜNG KẺ NGĂN CÁCH (DIVIDER) & TIÊU ĐỀ PHỤ: PHẦN 2 */}
            <div className="col-span-1 md:col-span-2 border-t border-slate-200 pt-6 mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                2. Thông tin Shop & Kho lấy hàng
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tên shop hiển thị công khai trên sàn và địa chỉ để đơn vị vận chuyển đến lấy hàng.
              </p>
            </div>

            {/* HÀNG 3: Tên Shop (Cột 1) | Hotline hỗ trợ Shop (Cột 2) */}
            <div className="field-wrap">
              <label htmlFor="shopName" className="text-xs font-semibold text-slate-700">
                Tên Shop <span className="text-red-500">*</span>
              </label>
              <input
                id="shopName"
                type="text"
                disabled={isSubmitting}
                placeholder="Nexus Official Store"
                className="field w-full"
                {...register("shopName")}
              />
              {errors.shopName && (
                <p className="text-xs text-red-500 mt-1">{errors.shopName.message}</p>
              )}
            </div>

            <div className="field-wrap">
              <label htmlFor="hotline" className="text-xs font-semibold text-slate-700">
                Hotline hỗ trợ Shop <span className="text-red-500">*</span>
              </label>
              <input
                id="hotline"
                type="tel"
                disabled={isSubmitting}
                placeholder="02873001234"
                className="field w-full"
                {...register("hotline")}
              />
              {errors.hotline && (
                <p className="text-xs text-red-500 mt-1">{errors.hotline.message}</p>
              )}
            </div>

            {/* HÀNG 4: Địa chỉ lấy hàng / Kho chi tiết (FULL WIDTH COL-SPAN-2) */}
            <div className="field-wrap col-span-1 md:col-span-2">
              <label htmlFor="warehouseAddress" className="text-xs font-semibold text-slate-700">
                Địa chỉ lấy hàng / Kho chi tiết <span className="text-red-500">*</span>
              </label>
              <textarea
                id="warehouseAddress"
                rows={3}
                disabled={isSubmitting}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                className="textarea-field w-full"
                {...register("warehouseAddress")}
              />
              {errors.warehouseAddress && (
                <p className="text-xs text-red-500 mt-1">{errors.warehouseAddress.message}</p>
              )}
            </div>
          </div>

          {/* HÀNG NÚT BẤM (ACTION ROW) */}
          <div className="action-row pt-6 mt-6 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`button button-primary ${isSubmitting ? "button-disabled" : ""}`}
              style={{ minWidth: 200, minHeight: 44 }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                  Đang gửi hồ sơ...
                </span>
              ) : (
                "Gửi hồ sơ đăng ký"
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
