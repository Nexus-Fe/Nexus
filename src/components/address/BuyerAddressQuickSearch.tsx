"use client";

import { useRef, useState } from "react";
import { useAddressSearch, useClickOutside } from "@/hooks/useAddressSearch";
import type { AddressItem } from "@/types/address";
import { matchAdministrativeLocation } from "@/utils/address-matching";

export interface BuyerAddressQuickSearchProps {
  onSelectWard: (provinceCode: string, wardCode: string) => void;
  idPrefix?: string;
}

export function BuyerAddressQuickSearch({
  onSelectWard,
  idPrefix = "buyer-checkout-address",
}: BuyerAddressQuickSearchProps) {
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

  const [selectedLabel, setSelectedLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Đóng dropdown khi click ra ngoài container dùng chung
  useClickOutside(containerRef, () => setIsOpen(false));

  const handleSelect = (item: AddressItem) => {
    setSelectedLabel(item.fullName);
    clearSearch();

    // Sử dụng domain utility matchAdministrativeLocation để tách bạch trách nhiệm
    const matched = matchAdministrativeLocation(item.provinceName, item.wardName);
    if (matched) {
      onSelectWard(matched.provinceCode, matched.wardCode);
    }
  };

  return (
    <div className="field-wrap" ref={containerRef} style={{ position: "relative", marginBottom: "0.85rem" }}>
      <label htmlFor={`${idPrefix}-search`} style={{ fontWeight: 600 }}>
        Tìm nhanh phường/xã{" "}
        <span style={{ fontSize: "0.85em", fontWeight: "normal", color: "var(--muted, #64748b)" }}>
          (Gõ tên: Bến Nghé, Dịch Vọng Hậu... hệ thống tự chọn Tỉnh và Xã bên dưới)
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
          placeholder="Gõ tên phường/xã để tự động chọn..."
          onFocus={() => {
            void loadDataIfNeeded();
            if (query.trim() && results.length > 0) setIsOpen(true);
          }}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, handleSelect)}
          aria-autocomplete="list"
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
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            maxHeight: "280px",
            overflowY: "auto",
            marginTop: "4px",
          }}
        >
          {isLoading && (
            <div style={{ padding: "10px 14px", color: "var(--muted, #64748b)", fontSize: "14px" }}>
              ⏳ Đang tải dữ liệu...
            </div>
          )}

          {error && (
            <div style={{ padding: "10px 14px", color: "var(--danger, #ef4444)", fontSize: "14px" }}>
              ⚠️ {error}
            </div>
          )}

          {!isLoading && !error && results.length === 0 && query.trim() && (
            <div style={{ padding: "10px 14px", color: "var(--muted, #64748b)", fontSize: "14px" }}>
              Không tìm thấy gợi ý phù hợp. Vui lòng chọn thủ công trong 2 menu bên dưới.
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
                    Khu vực: {item.districtName}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {selectedLabel && (
        <div
          style={{
            marginTop: "6px",
            padding: "5px 10px",
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
            ✓ <strong>Đã chọn nhanh:</strong> {selectedLabel}
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
            onClick={() => setSelectedLabel("")}
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}
