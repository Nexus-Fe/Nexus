"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAddressSearch } from "@/hooks/useAddressSearch";
import type { AddressItem } from "@/types/address";
import administrativeUnits from "@/data/vietnam-administrative-units.json";
import { removeVietnameseTones } from "@/utils/vietnamese";

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
  } = useAddressSearch(8);

  const [selectedLabel, setSelectedLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsOpen]);

  const handleSelect = (item: AddressItem) => {
    setSelectedLabel(item.fullName);
    clearSearch();

    // Map tên tỉnh sang mã tỉnh của administrativeUnits
    const normalizedItemProvince = removeVietnameseTones(item.provinceName).replace(/^(tinh|thanh pho|tp\.?)\s+/i, "").trim();
    const matchedProvince = administrativeUnits.provinces.find((p) => {
      const normPName = removeVietnameseTones(p.name).replace(/^(tinh|thanh pho|tp\.?)\s+/i, "").trim();
      return normPName === normalizedItemProvince || normPName.includes(normalizedItemProvince) || normalizedItemProvince.includes(normPName);
    });

    if (matchedProvince) {
      const normalizedItemWard = removeVietnameseTones(item.wardName).replace(/^(phuong|xa|thi tran)\s+/i, "").trim();
      const matchedWard = matchedProvince.wards.find((w) => {
        const normWName = removeVietnameseTones(w.name).replace(/^(phuong|xa|thi tran)\s+/i, "").trim();
        return normWName === normalizedItemWard || normWName.includes(normalizedItemWard) || normalizedItemWard.includes(normWName);
      });

      if (matchedWard) {
        onSelectWard(matchedProvince.code, matchedWard.code);
        return;
      }
      onSelectWard(matchedProvince.code, "");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (event.key === "ArrowDown" && query.trim()) setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex(selectedIndex < results.length - 1 ? selectedIndex + 1 : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : results.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
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
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={isOpen}
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
