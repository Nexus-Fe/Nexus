"use client";

import { useState } from "react";
import { Card, SectionHeading } from "@/components/ui/Primitives";

export type ShopRegistrationFields = {
  identityCardNumber: string;
  shopName: string;
  description: string;
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
  description: "",
  businessEmail: "",
  hotline: "",
  provinceId: "202",
  districtId: "1442",
  wardCode: "20101",
  streetAddress: "",
};

export type ShopRegistrationErrors = Partial<Record<keyof ShopRegistrationFields, string>>;

const ghnPresets = [
  { label: "TP. Hồ Chí Minh — Quận 1 — Phường Bến Nghé", provinceId: "202", districtId: "1442", wardCode: "20101" },
  { label: "TP. Hồ Chí Minh — TP. Thủ Đức — Phường Hiệp Bình Chánh", provinceId: "202", districtId: "3695", wardCode: "90737" },
  { label: "Hà Nội — Quận Cầu Giấy — Phường Dịch Vọng Hậu", provinceId: "201", districtId: "1485", wardCode: "1A0601" },
  { label: "Đà Nẵng — Quận Hải Châu — Phường Thạch Thang", provinceId: "203", districtId: "1526", wardCode: "40101" },
];

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
  if (businessEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(businessEmail)) errors.businessEmail = "Email liên hệ shop chưa đúng định dạng.";
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

  return <div className="seller-registration-fields">
    <Card className="card-pad">
      <SectionHeading title="Thông tin định danh" hint="CCCD/CMND chỉ được giữ trong bộ nhớ của phiên đăng ký." />
      <label className="field-wrap" htmlFor={fieldId("identityCardNumber")}>Số CCCD / CMND *</label>
      <div className="seller-identity-input">
        <input id={fieldId("identityCardNumber")} className="field" type={showIdentityCard ? "text" : "password"} inputMode="numeric" autoComplete="off" required minLength={9} maxLength={12} value={value.identityCardNumber} aria-invalid={Boolean(errors.identityCardNumber)} aria-describedby={errors.identityCardNumber ? `${fieldId("identityCardNumber")}-error` : undefined} onChange={(event) => update("identityCardNumber", event.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="Nhập 9 hoặc 12 chữ số" />
        <button type="button" className="button button-secondary" aria-pressed={showIdentityCard} onClick={() => setShowIdentityCard((visible) => !visible)}>{showIdentityCard ? "Ẩn số" : "Hiện số"}</button>
      </div>
      {errors.identityCardNumber && <small id={`${fieldId("identityCardNumber")}-error`} className="field-error" role="alert">{errors.identityCardNumber}</small>}
    </Card>

    <Card className="card-pad">
      <SectionHeading title="Thông tin gian hàng" hint="Email liên hệ shop không bắt buộc và không nhận mã OTP." />
      <div className="form-grid">
        <label className="field-wrap" htmlFor={fieldId("shopName")}>Tên shop *
          <input id={fieldId("shopName")} className="field" required minLength={3} maxLength={100} value={value.shopName} aria-invalid={Boolean(errors.shopName)} aria-describedby={errors.shopName ? `${fieldId("shopName")}-error` : undefined} onChange={(event) => update("shopName", event.target.value)} placeholder="Ví dụ: Nexus Official" />
          {errors.shopName && <small id={`${fieldId("shopName")}-error`} className="field-error" role="alert">{errors.shopName}</small>}
        </label>
        <label className="field-wrap" htmlFor={fieldId("hotline")}>Hotline shop *
          <input id={fieldId("hotline")} className="field" type="tel" required value={value.hotline} aria-invalid={Boolean(errors.hotline)} aria-describedby={errors.hotline ? `${fieldId("hotline")}-error` : undefined} onChange={(event) => update("hotline", event.target.value)} placeholder="0901234567" />
          {errors.hotline && <small id={`${fieldId("hotline")}-error`} className="field-error" role="alert">{errors.hotline}</small>}
        </label>
      </div>
      <label className="field-wrap seller-shop-email" htmlFor={fieldId("businessEmail")}>Email liên hệ shop <span>(không bắt buộc, không nhận OTP)</span>
        <input id={fieldId("businessEmail")} className="field" type="email" autoComplete="email" value={value.businessEmail} aria-invalid={Boolean(errors.businessEmail)} aria-describedby={errors.businessEmail ? `${fieldId("businessEmail")}-error` : undefined} onChange={(event) => update("businessEmail", event.target.value)} placeholder="shop-contact@example.com" />
      </label>
      {errors.businessEmail && <small id={`${fieldId("businessEmail")}-error`} className="field-error" role="alert">{errors.businessEmail}</small>}
      <label className="field-wrap seller-shop-description" htmlFor={fieldId("description")}>Mô tả shop <span>(không bắt buộc)</span>
        <textarea id={fieldId("description")} className="textarea-field" maxLength={1000} value={value.description} onChange={(event) => update("description", event.target.value)} placeholder="Giới thiệu ngắn về sản phẩm và gian hàng của bạn." />
      </label>
    </Card>

    <Card className="card-pad">
      <SectionHeading title="Địa chỉ kho lấy hàng" hint="Nhập mã địa chỉ theo danh mục GHN để dùng khi hồ sơ được tiếp nhận." />
      <label className="field-wrap" htmlFor={`${idPrefix}-ghn-preset`}>Chọn nhanh khu vực mẫu GHN
        <select id={`${idPrefix}-ghn-preset`} className="select-field" defaultValue="" onChange={(event) => {
          if (!event.target.value) return;
          const preset = ghnPresets[Number(event.target.value)];
          if (preset) onChange({ ...value, provinceId: preset.provinceId, districtId: preset.districtId, wardCode: preset.wardCode });
        }}>
          <option value="">Chọn khu vực mẫu hoặc nhập mã thủ công</option>
          {ghnPresets.map((preset, index) => <option key={preset.label} value={index}>{preset.label}</option>)}
        </select>
      </label>
      <div className="form-grid seller-ghn-grid">
        <label className="field-wrap" htmlFor={fieldId("provinceId")}>Mã tỉnh GHN *
          <input id={fieldId("provinceId")} className="field" type="number" min={1} required value={value.provinceId} aria-invalid={Boolean(errors.provinceId)} aria-describedby={errors.provinceId ? `${fieldId("provinceId")}-error` : undefined} onChange={(event) => update("provinceId", event.target.value)} placeholder="202" />
          {errors.provinceId && <small id={`${fieldId("provinceId")}-error`} className="field-error" role="alert">{errors.provinceId}</small>}
        </label>
        <label className="field-wrap" htmlFor={fieldId("districtId")}>Mã quận/huyện GHN *
          <input id={fieldId("districtId")} className="field" type="number" min={1} required value={value.districtId} aria-invalid={Boolean(errors.districtId)} aria-describedby={errors.districtId ? `${fieldId("districtId")}-error` : undefined} onChange={(event) => update("districtId", event.target.value)} placeholder="1442" />
          {errors.districtId && <small id={`${fieldId("districtId")}-error`} className="field-error" role="alert">{errors.districtId}</small>}
        </label>
        <label className="field-wrap" htmlFor={fieldId("wardCode")}>Mã phường/xã GHN *
          <input id={fieldId("wardCode")} className="field" required value={value.wardCode} aria-invalid={Boolean(errors.wardCode)} aria-describedby={errors.wardCode ? `${fieldId("wardCode")}-error` : undefined} onChange={(event) => update("wardCode", event.target.value)} placeholder="20101" />
          {errors.wardCode && <small id={`${fieldId("wardCode")}-error`} className="field-error" role="alert">{errors.wardCode}</small>}
        </label>
        <label className="field-wrap" htmlFor={fieldId("streetAddress")}>Địa chỉ cụ thể *
          <input id={fieldId("streetAddress")} className="field" required minLength={5} value={value.streetAddress} aria-invalid={Boolean(errors.streetAddress)} aria-describedby={errors.streetAddress ? `${fieldId("streetAddress")}-error` : undefined} onChange={(event) => update("streetAddress", event.target.value)} placeholder="Số nhà, đường, phường/xã" />
          {errors.streetAddress && <small id={`${fieldId("streetAddress")}-error`} className="field-error" role="alert">{errors.streetAddress}</small>}
        </label>
      </div>
    </Card>
  </div>;
}

export function ShopRegistrationReview({ value }: { value: ShopRegistrationFields }) {
  const maskedIdentity = value.identityCardNumber ? `••••••••${value.identityCardNumber.slice(-4)}` : "Chưa nhập";
  return <Card className="card-pad seller-registration-review">
    <SectionHeading title="Thông tin shop đã nhập" hint="Thông tin sẽ được chuyển sang trang mở shop sau khi đăng nhập. Hồ sơ chưa được gửi." />
    <div className="info-row"><span>CCCD/CMND</span><strong>{maskedIdentity}</strong></div>
    <div className="info-row"><span>Tên shop</span><strong>{value.shopName || "—"}</strong></div>
    <div className="info-row"><span>Email liên hệ shop</span><strong>{value.businessEmail || "Không cung cấp · không nhận OTP"}</strong></div>
    <div className="info-row"><span>Hotline</span><strong>{value.hotline || "—"}</strong></div>
    <div className="info-row"><span>Mô tả</span><strong>{value.description || "Chưa cung cấp"}</strong></div>
    <div className="info-row"><span>Kho GHN</span><strong>{value.streetAddress || "—"} · {value.provinceId}/{value.districtId}/{value.wardCode}</strong></div>
  </Card>;
}
