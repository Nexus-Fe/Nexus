"use client";

import { useState } from "react";
import { Card, SectionHeading } from "@/components/ui/Primitives";
import { WarehouseAddressPicker } from "@/components/address/WarehouseAddressPicker";

export type ShopRegistrationFields = {
  identityCardNumber: string;
  shopName: string;
  businessEmail: string;
  hotline: string;
  provinceId: string;
  districtId: string;
  wardCode: string;
  streetAddress: string;
};

export const emptyShopRegistrationFields: ShopRegistrationFields = {
  identityCardNumber: "",
  shopName: "",
  businessEmail: "",
  hotline: "",
  provinceId: "202",
  districtId: "1442",
  wardCode: "20101",
  streetAddress: "",
};

export type ShopRegistrationErrors = Partial<Record<keyof ShopRegistrationFields, string>>;

export function validateShopRegistrationFields(value: ShopRegistrationFields): ShopRegistrationErrors {
  const errors: ShopRegistrationErrors = {};
  const identityCardNumber = value.identityCardNumber.trim();
  const shopName = value.shopName.trim();
  const businessEmail = value.businessEmail.trim();
  const hotline = value.hotline.trim();
  const provinceId = Number(value.provinceId);
  const districtId = Number(value.districtId);
  const wardCode = value.wardCode.trim();
  const streetAddress = value.streetAddress.trim();

  if (!/^(\d{9}|\d{12})$/.test(identityCardNumber)) errors.identityCardNumber = "CCCD/CMND cần có 9 hoặc 12 chữ số.";
  if (shopName.length < 3 || shopName.length > 100) errors.shopName = "Tên shop cần từ 3 đến 100 ký tự.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(businessEmail)) errors.businessEmail = "Nhập email doanh nghiệp hợp lệ để nhận OTP.";
  if (!/^[0-9+() -]{9,15}$/.test(hotline)) errors.hotline = "Hotline cần từ 9 đến 15 ký tự số.";
  if (!Number.isInteger(provinceId) || provinceId <= 0 || provinceId > 9999) errors.provinceId = "Mã tỉnh GHN chưa hợp lệ.";
  if (!Number.isInteger(districtId) || districtId <= 0 || districtId > 99999) errors.districtId = "Mã quận/huyện GHN chưa hợp lệ.";
  if (!/^[A-Za-z0-9]{4,10}$/.test(wardCode) || wardCode === "00000") errors.wardCode = "Mã phường/xã GHN chưa hợp lệ.";
  if (streetAddress.length < 5) errors.streetAddress = "Địa chỉ kho cần ít nhất 5 ký tự.";

  return errors;
}

export function ShopRegistrationForm({
  value,
  onChange,
  errors = {},
  idPrefix = "shop-registration",
}: {
  value: ShopRegistrationFields;
  onChange: (value: ShopRegistrationFields) => void;
  errors?: ShopRegistrationErrors;
  idPrefix?: string;
}) {
  const [showIdentityCard, setShowIdentityCard] = useState(false);
  const update = (key: keyof ShopRegistrationFields, fieldValue: string) => onChange({ ...value, [key]: fieldValue });
  const fieldId = (name: keyof ShopRegistrationFields) => `${idPrefix}-${name}`;

  return (
    <div className="seller-registration-fields">
      <Card className="card-pad">
        <SectionHeading title="Thông tin định danh" hint="CCCD/CMND dùng để thẩm định hồ sơ và không hiển thị sau khi nộp." />
        <label className="field-wrap" htmlFor={fieldId("identityCardNumber")}>Số CCCD / CMND *</label>
        <div className="seller-identity-input">
          <input
            id={fieldId("identityCardNumber")}
            className="field"
            type={showIdentityCard ? "text" : "password"}
            inputMode="numeric"
            autoComplete="off"
            required
            minLength={9}
            maxLength={12}
            value={value.identityCardNumber}
            aria-invalid={Boolean(errors.identityCardNumber)}
            aria-describedby={errors.identityCardNumber ? `${fieldId("identityCardNumber")}-error` : undefined}
            onChange={(event) => update("identityCardNumber", event.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="Nhập 9 hoặc 12 chữ số"
          />
          <button
            type="button"
            className="button button-secondary"
            aria-pressed={showIdentityCard}
            onClick={() => setShowIdentityCard((visible) => !visible)}
          >
            {showIdentityCard ? "Ẩn số" : "Hiện số"}
          </button>
        </div>
        {errors.identityCardNumber && (
          <small id={`${fieldId("identityCardNumber")}-error`} className="field-error" role="alert">
            {errors.identityCardNumber}
          </small>
        )}
      </Card>

      <Card className="card-pad">
        <SectionHeading title="Thông tin gian hàng" hint="Email doanh nghiệp bắt buộc để nhận mã xác thực hồ sơ." />
        <div className="form-grid">
          <label className="field-wrap" htmlFor={fieldId("shopName")}>
            Tên shop *
            <input
              id={fieldId("shopName")}
              className="field"
              required
              minLength={3}
              maxLength={100}
              value={value.shopName}
              aria-invalid={Boolean(errors.shopName)}
              aria-describedby={errors.shopName ? `${fieldId("shopName")}-error` : undefined}
              onChange={(event) => update("shopName", event.target.value)}
              placeholder="Ví dụ: Nexus Official"
            />
            {errors.shopName && (
              <small id={`${fieldId("shopName")}-error`} className="field-error" role="alert">
                {errors.shopName}
              </small>
            )}
          </label>
          <label className="field-wrap" htmlFor={fieldId("hotline")}>
            Hotline shop *
            <input
              id={fieldId("hotline")}
              className="field"
              type="tel"
              required
              value={value.hotline}
              aria-invalid={Boolean(errors.hotline)}
              aria-describedby={errors.hotline ? `${fieldId("hotline")}-error` : undefined}
              onChange={(event) => update("hotline", event.target.value)}
              placeholder="0901234567"
            />
            {errors.hotline && (
              <small id={`${fieldId("hotline")}-error`} className="field-error" role="alert">
                {errors.hotline}
              </small>
            )}
          </label>
        </div>
        <div className="field-wrap seller-shop-email">
          <label htmlFor={fieldId("businessEmail")}>
            Email doanh nghiệp * <span>(nhận OTP mở shop)</span>
          </label>
          <input
            id={fieldId("businessEmail")}
            className="field"
            type="email"
            autoComplete="email"
            required
            value={value.businessEmail}
            aria-invalid={Boolean(errors.businessEmail)}
            aria-describedby={errors.businessEmail ? `${fieldId("businessEmail")}-error` : undefined}
            onChange={(event) => update("businessEmail", event.target.value)}
            placeholder="shop-contact@example.com"
          />
        </div>
        {errors.businessEmail && (
          <small id={`${fieldId("businessEmail")}-error`} className="field-error" role="alert">
            {errors.businessEmail}
          </small>
        )}
      </Card>

      <Card className="card-pad">
        <SectionHeading
          title="Địa chỉ kho lấy hàng"
          hint="Tìm nhanh phường/xã hoặc nhập mã địa chỉ theo danh mục GHN để dùng khi tiếp nhận đơn."
        />
        <WarehouseAddressPicker
          idPrefix={idPrefix}
          provinceId={value.provinceId}
          districtId={value.districtId}
          wardCode={value.wardCode}
          streetAddress={value.streetAddress}
          errors={errors}
          onChange={(codes) => {
            onChange({
              ...value,
              provinceId: codes.provinceId,
              districtId: codes.districtId,
              wardCode: codes.wardCode,
              streetAddress: codes.streetAddress ?? value.streetAddress,
            });
          }}
        />
      </Card>
    </div>
  );
}

export function ShopRegistrationReview({ value }: { value: ShopRegistrationFields }) {
  const maskedIdentity = value.identityCardNumber ? `••••••••${value.identityCardNumber.slice(-4)}` : "Chưa nhập";
  return (
    <Card className="card-pad seller-registration-review">
      <SectionHeading title="Thông tin shop đã nhập" hint="Thông tin sẽ được chuyển sang trang mở shop sau khi đăng nhập. Hồ sơ chưa được gửi." />
      <div className="info-row"><span>CCCD/CMND</span><strong>{maskedIdentity}</strong></div>
      <div className="info-row"><span>Tên shop</span><strong>{value.shopName || "—"}</strong></div>
      <div className="info-row"><span>Email doanh nghiệp</span><strong>{value.businessEmail || "—"}</strong></div>
      <div className="info-row"><span>Hotline</span><strong>{value.hotline || "—"}</strong></div>
      <div className="info-row"><span>Kho GHN</span><strong>{value.streetAddress || "—"} · {value.provinceId}/{value.districtId}/{value.wardCode}</strong></div>
    </Card>
  );
}
