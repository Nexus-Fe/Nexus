"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ApiError } from "@/lib/api/client";
import { getInventory, adjustStock } from "../../services/seller.api";
import type { InventoryItem } from "../../types/seller.types";
import { Card, Badge, PageHeading } from "@/components/ui/Primitives";

export interface InventoryManagerProps {
  className?: string;
}

interface ToastNotice {
  id: string;
  type: "success" | "error";
  message: string;
}

export function InventoryManager({ className = "" }: InventoryManagerProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});
  const [updatingSkus, setUpdatingSkus] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now().toString();
    setToast({ id, type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);

    try {
      const data = await getInventory();
      const inventoryList = data || [];
      setItems(inventoryList);

      const initialDrafts: Record<string, number> = {};
      inventoryList.forEach((item) => {
        initialDrafts[item.sku] = item.quantity;
      });
      setDraftQuantities(initialDrafts);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(err.message || "Không thể tải danh sách tồn kho.");
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Lỗi kết nối khi tải danh sách tồn kho.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getInventory();
        if (!active) return;
        const inventoryList = data || [];
        setItems(inventoryList);

        const initialDrafts: Record<string, number> = {};
        inventoryList.forEach((item) => {
          initialDrafts[item.sku] = item.quantity;
        });
        setDraftQuantities(initialDrafts);
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Lỗi kết nối khi tải danh sách tồn kho.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleQuantityChange = (sku: string, nextValue: number) => {
    const safeValue = Math.max(0, Math.floor(nextValue || 0));
    setDraftQuantities((prev) => ({ ...prev, [sku]: safeValue }));
  };

  const handleUpdateStock = async (sku: string) => {
    const targetItem = items.find((it) => it.sku === sku);
    if (!targetItem) return;

    const newQuantity = draftQuantities[sku];
    if (newQuantity === undefined || newQuantity < 0) {
      showToast("error", "Số lượng tồn kho không được âm.");
      return;
    }

    setUpdatingSkus((prev) => ({ ...prev, [sku]: true }));

    try {
      const updated = await adjustStock(sku, newQuantity);

      setItems((prev) =>
        prev.map((it) =>
          it.sku === sku
            ? {
                ...it,
                ...updated,
                quantity: updated.quantity ?? newQuantity,
                availableQuantity:
                  updated.availableQuantity ??
                  Math.max(0, (updated.quantity ?? newQuantity) - (it.reservedQuantity ?? 0)),
              }
            : it
        )
      );

      setDraftQuantities((prev) => ({
        ...prev,
        [sku]: updated.quantity ?? newQuantity,
      }));

      showToast("success", `Đã cập nhật tồn kho cho SKU "${sku}" thành công (${newQuantity} sản phẩm).`);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Cập nhật tồn kho thất bại. Vui lòng thử lại.";
      showToast("error", msg);
    } finally {
      setUpdatingSkus((prev) => ({ ...prev, [sku]: false }));
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.sku.toLowerCase().includes(q) ||
        (it.productName && it.productName.toLowerCase().includes(q)) ||
        (it.variantName && it.variantName.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // 1. LOADING
  if (isLoading) {
    return (
      <Card className={`card-pad ${className}`} style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <span className="spinner" style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--sky)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Đang tải dữ liệu tồn kho...</p>
      </Card>
    );
  }

  // 2. FORBIDDEN
  if (isForbidden) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Không có quyền truy cập kho</h3>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Tài khoản của bạn cần có vai trò Người Bán (Seller) để thực hiện kiểm kê và điều chỉnh tồn kho.
        </p>
      </Card>
    );
  }

  // 3. ERROR
  if (errorMessage) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
        <h3 style={{ fontSize: 17, marginBottom: 8, color: "#991b1b" }}>Không thể tải dữ liệu tồn kho</h3>
        <p style={{ color: "#991b1b", fontSize: 13, marginBottom: 18 }}>{errorMessage}</p>
        <button type="button" onClick={fetchInventory} className="button button-secondary">
          Thử lại
        </button>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            color: toast.type === "success" ? "#166534" : "#991b1b",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, marginLeft: 8 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header bar */}
      <PageHeading
        title="Quản lý Tồn kho (Inventory)"
        description="Theo dõi và điều chỉnh số lượng tồn kho theo từng SKU sản phẩm trong kho hàng."
        action={
          items.length > 0 && (
            <div style={{ maxWidth: 280, width: "100%" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo SKU hoặc tên..."
                className="field"
                style={{ minHeight: 38 }}
              />
            </div>
          )
        }
      />

      {/* 4. EMPTY STATE */}
      {items.length === 0 ? (
        <Card className="card-pad" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏭</div>
          <h3 style={{ fontSize: 17, marginBottom: 8 }}>Chưa có sản phẩm nào trong kho</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: 440, margin: "0 auto 20px" }}>
            Hệ thống chưa ghi nhận mã SKU hoặc danh mục tồn kho nào cho cửa hàng của bạn. Hãy tạo sản phẩm và SKU mới trước.
          </p>
          <button type="button" onClick={fetchInventory} className="button button-secondary">
            Làm mới dữ liệu
          </button>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="card-pad" style={{ textAlign: "center", padding: "36px 20px" }}>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
            Không tìm thấy SKU nào khớp với từ khóa &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="button button-secondary button-small"
          >
            Xóa bộ lọc tìm kiếm
          </button>
        </Card>
      ) : (
        /* TABLE */
        <Card>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên Sản phẩm / Phân loại</th>
                  <th style={{ textAlign: "center" }}>Tạm giữ</th>
                  <th style={{ textAlign: "center" }}>Khả dụng</th>
                  <th>Tồn kho</th>
                  <th style={{ textAlign: "right" }}>Điều chỉnh & Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const draftVal = draftQuantities[item.sku] ?? item.quantity;
                  const isRowUpdating = Boolean(updatingSkus[item.sku]);
                  const hasChanged = draftVal !== item.quantity;
                  const isOutOfStock = (item.availableQuantity ?? item.quantity) <= 0;

                  return (
                    <tr key={item.sku}>
                      {/* Mã SKU */}
                      <td>
                        <strong style={{ fontFamily: "monospace", color: "var(--ink)" }}>
                          {item.sku}
                        </strong>
                      </td>

                      {/* Tên sản phẩm */}
                      <td>
                        <strong style={{ display: "block", color: "var(--ink)", fontSize: 13 }}>
                          {item.productName || "Sản phẩm chưa đặt tên"}
                        </strong>
                        {item.variantName && (
                          <small style={{ color: "var(--muted)" }}>Phân loại: {item.variantName}</small>
                        )}
                      </td>

                      {/* Tạm giữ */}
                      <td style={{ textAlign: "center", color: "var(--muted)" }}>
                        {item.reservedQuantity ?? 0}
                      </td>

                      {/* Khả dụng */}
                      <td style={{ textAlign: "center" }}>
                        <Badge tone={isOutOfStock ? "red" : "green"}>
                          {item.availableQuantity !== undefined ? item.availableQuantity : item.quantity}
                        </Badge>
                      </td>

                      {/* Tồn kho */}
                      <td>
                        <strong style={{ color: "var(--ink)" }}>{item.quantity}</strong>
                      </td>

                      {/* Bộ điều khiển */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          {/* +/- và input */}
                          <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                            <button
                              type="button"
                              disabled={isRowUpdating || draftVal <= 0}
                              onClick={() => handleQuantityChange(item.sku, draftVal - 1)}
                              style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", fontWeight: 700, color: "var(--ink)" }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              disabled={isRowUpdating}
                              value={draftVal}
                              onChange={(e) => handleQuantityChange(item.sku, parseInt(e.target.value, 10) || 0)}
                              style={{ width: 48, height: 28, textAlign: "center", border: "none", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)", outline: "none", fontSize: 12, fontWeight: 700 }}
                            />
                            <button
                              type="button"
                              disabled={isRowUpdating}
                              onClick={() => handleQuantityChange(item.sku, draftVal + 1)}
                              style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", fontWeight: 700, color: "var(--ink)" }}
                            >
                              +
                            </button>
                          </div>

                          {/* Nút Cập nhật */}
                          <button
                            type="button"
                            disabled={isRowUpdating || !hasChanged}
                            onClick={() => handleUpdateStock(item.sku)}
                            className={`button button-small ${hasChanged ? "button-primary" : "button-disabled"}`}
                            style={{ minWidth: 80 }}
                          >
                            {isRowUpdating ? "..." : "Lưu kho"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
