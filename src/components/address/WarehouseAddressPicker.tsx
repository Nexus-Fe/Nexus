"use client";

import { useEffect, useRef, useState } from "react";
import { lookupAddressByCodes, useAddressSearch, useClickOutside } from "@/hooks/useAddressSearch";
import type { AddressItem, WarehouseAddressCodes } from "@/types/address";

export interface WarehouseAddressPickerProps {
  provinceId: string;
  districtId: string;
  wardCode: string;
  streetAddress?: string;
  onChange: (codes: WarehouseAddressCodes) => void;
  errors?: Partial<Record<"provinceId" | "districtId" | "wardCode" | "streetAddress", string>>;
  idPrefix?: string;
  showStreetAddress?: boolean;
  registerFormInputs?: boolean;
}

export function WarehouseAddressPicker({
  provinceId,
  districtId,
  wardCode,
  streetAddress = "",
  onChange,
  errors = {},
  idPrefix = "warehouse-address",
  showStreetAddress = true,
  registerFormInputs = false,
}: WarehouseAddressPickerProps) {
  const {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    error,
    loadDataIfNeeded,
    clearSearch,
    handleKeyDown,
  } = useAddressSearch(10);

  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Đóng dropdown khi click ra ngoài component bằng hook dùng chung
  useClickOutside(containerRef, () => setIsOpen(false));

  // Tự động nhận diện và hiển thị địa chỉ kho hiện tại nếu đã có mã từ trước
  useEffect(() => {
    if (wardCode && provinceId && !selectedLabel) {
      void lookupAddressByCodes(provinceId, wardCode).then((found) => {
        if (found) {
          setSelectedLabel(found.fullName);
        }
      });
    }
  }, [provinceId, wardCode, selectedLabel]);

  // Xử lý khi người dùng chọn một mục từ gợi ý
  const handleSelect = (item: AddressItem) => {
    setSelectedLabel(item.fullName);
    clearSearch();
    onChange({
      provinceId: String(item.provinceId),
      districtId: String(item.districtId),
      wardCode: item.wardCode,
      streetAddress,
    });
  };

  const handleManualCodeChange = (
    field: "provinceId" | "districtId" | "wardCode" | "streetAddress",
    val: string,
  ) => {
    setSelectedLabel(""); // Khi sửa tay, xóa nhãn tự động
    onChange({
      provinceId: field === "provinceId" ? val : provinceId,
      districtId: field === "districtId" ? val : districtId,
      wardCode: field === "wardCode" ? val : wardCode,
      streetAddress: field === "streetAddress" ? val : streetAddress,
    });
  };

  return (
    <div className="warehouse-address-picker" ref={containerRef}>
      {/* Ô tìm kiếm thông minh phía trên */}
      <div className="field-wrap" style={{ position: "relative", marginBottom: "1rem" }}>
        <label htmlFor={`${idPrefix}-search`} style={{ fontWeight: 600 }}>
          Tìm nhanh phường/xã{" "}
          <span style={{ fontSize: "0.85em", fontWeight: "normal", color: "var(--muted, #64748b)" }}>
            (Gõ tên: Bến Nghé, Dịch Vọng Hậu, Hải Châu... hệ thống sẽ tự điền 3 mã GHN)
          </span>
        </label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input
            id={`${idPrefix}-search`}
            ref={searchInputRef}
            className="field"
            type="text"
            autoComplete="off"
            value={query}
            placeholder="Gõ tên phường/xã để tìm kiếm tự động..."
            onFocus={() => {
              void loadDataIfNeeded();
              if (query.trim() && results.length > 0) setIsOpen(true);
            }}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleSelect)}
            aria-autocomplete="list"
            aria-controls={`${idPrefix}-results`}
            aria-expanded={isOpen}
            aria-activedescendant={selectedIndex >= 0 ? `${idPrefix}-item-${selectedIndex}` : undefined}
            style={{ paddingRight: query ? "2.5rem" : "1rem" }}
          />
          {query && (
            <button
              type="button"
              className="button button-light"
              style={{
                position: "absolute",
                right: "6px",
                padding: "2px 8px",
                fontSize: "12px",
                height: "auto",
                minHeight: "26px",
              }}
              onClick={clearSearch}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown gợi ý */}
        {isOpen && (
          <div
            id={`${idPrefix}-results`}
            role="listbox"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: "var(--surface, #ffffff)",
              border: "1px solid var(--border, #cbd5e1)",
              borderRadius: "8px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              maxHeight: "320px",
              overflowY: "auto",
              marginTop: "4px",
            }}
          >
            {isLoading && (
              <div style={{ padding: "12px 16px", color: "var(--muted, #64748b)", fontSize: "14px" }}>
                ⏳ Đang tải dữ liệu địa chỉ GHN...
              </div>
            )}

            {error && (
              <div style={{ padding: "12px 16px", color: "var(--danger, #ef4444)", fontSize: "14px" }}>
                ⚠️ {error}
              </div>
            )}

            {!isLoading && !error && results.length === 0 && query.trim() && (
              <div style={{ padding: "12px 16px", color: "var(--muted, #64748b)", fontSize: "14px" }}>
                Không tìm thấy phường/xã phù hợp với &ldquo;<strong>{query}</strong>&rdquo;. Bạn có thể tự nhập mã thủ công bên dưới.
              </div>
            )}

            {!isLoading &&
              results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.provinceId}-${item.districtId}-${item.wardCode}`}
                    id={`${idPrefix}-item-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "var(--hover-bg, #f1f5f9)" : "transparent",
                      borderBottom: idx < results.length - 1 ? "1px solid var(--border-light, #f1f5f9)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelect(item)}
                  >
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground, #0f172a)" }}>
                      {item.wardName}, {item.provinceName}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
                      Khu vực: {item.districtName} · Mã Tỉnh: <strong>{item.provinceId}</strong> · Mã Quận: <strong>{item.districtId}</strong> · Mã Phường: <strong>{item.wardCode}</strong>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Thông báo nhãn đã chọn */}
        {selectedLabel && (
          <div
            style={{
              marginTop: "6px",
              padding: "6px 12px",
              backgroundColor: "var(--badge-green-bg, #ecfdf5)",
              color: "var(--badge-green-text, #047857)",
              borderRadius: "6px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              ✓ <strong>Đã chọn:</strong> {selectedLabel}
            </span>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: "12px",
                textDecoration: "underline",
                padding: "0 4px",
              }}
              onClick={() => {
                setSelectedLabel("");
                searchInputRef.current?.focus();
              }}
            >
              Chọn lại
            </button>
          </div>
        )}
      </div>

      {/* 4 ô mã và địa chỉ chi tiết (Vẫn cho phép người dùng sửa tay thủ công) */}
      <div className="form-grid seller-ghn-grid">
        <label className="field-wrap" htmlFor={`${idPrefix}-provinceId`}>
          Mã tỉnh GHN *
          <input
            id={`${idPrefix}-provinceId`}
            name={registerFormInputs ? "provinceId" : undefined}
            className="field"
            type="number"
            min={1}
            required
            value={provinceId}
            aria-invalid={Boolean(errors.provinceId)}
            aria-describedby={errors.provinceId ? `${idPrefix}-provinceId-error` : undefined}
            onChange={(e) => handleManualCodeChange("provinceId", e.target.value)}
            placeholder="202"
          />
          {errors.provinceId && (
            <small id={`${idPrefix}-provinceId-error`} className="field-error" role="alert">
              {errors.provinceId}
            </small>
          )}
        </label>

        <label className="field-wrap" htmlFor={`${idPrefix}-districtId`}>
          Mã quận/huyện GHN *
          <input
            id={`${idPrefix}-districtId`}
            name={registerFormInputs ? "districtId" : undefined}
            className="field"
            type="number"
            min={1}
            required
            value={districtId}
            aria-invalid={Boolean(errors.districtId)}
            aria-describedby={errors.districtId ? `${idPrefix}-districtId-error` : undefined}
            onChange={(e) => handleManualCodeChange("districtId", e.target.value)}
            placeholder="1442"
          />
          {errors.districtId && (
            <small id={`${idPrefix}-districtId-error`} className="field-error" role="alert">
              {errors.districtId}
            </small>
          )}
        </label>

        <label className="field-wrap" htmlFor={`${idPrefix}-wardCode`}>
          Mã phường/xã GHN *
          <input
            id={`${idPrefix}-wardCode`}
            name={registerFormInputs ? "wardCode" : undefined}
            className="field"
            required
            value={wardCode}
            aria-invalid={Boolean(errors.wardCode)}
            aria-describedby={errors.wardCode ? `${idPrefix}-wardCode-error` : undefined}
            onChange={(e) => handleManualCodeChange("wardCode", e.target.value)}
            placeholder="20101"
          />
          {errors.wardCode && (
            <small id={`${idPrefix}-wardCode-error`} className="field-error" role="alert">
              {errors.wardCode}
            </small>
          )}
        </label>

        {showStreetAddress && (
          <label className="field-wrap" htmlFor={`${idPrefix}-streetAddress`}>
            Địa chỉ cụ thể *
            <input
              id={`${idPrefix}-streetAddress`}
              name={registerFormInputs ? "streetAddress" : undefined}
              className="field"
              required
              minLength={5}
              value={streetAddress}
              aria-invalid={Boolean(errors.streetAddress)}
              aria-describedby={errors.streetAddress ? `${idPrefix}-streetAddress-error` : undefined}
              onChange={(e) => handleManualCodeChange("streetAddress", e.target.value)}
              placeholder="Số nhà, tên đường"
            />
            {errors.streetAddress && (
              <small id={`${idPrefix}-streetAddress-error`} className="field-error" role="alert">
                {errors.streetAddress}
              </small>
            )}
          </label>
        )}
      </div>
    </div>
  );
}
