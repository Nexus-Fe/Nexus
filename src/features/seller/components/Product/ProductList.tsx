"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ApiError } from "@/lib/api/client";
import { getProducts, deleteProduct, updateProduct } from "../../services/seller.api";
import type { Product, ProductStatus } from "../../types/seller.types";
import { Card, Badge, PageHeading } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";

export interface ProductListProps {
  onEditProduct?: (product: Product) => void;
  onCreateProduct?: () => void;
  className?: string;
}

export function ProductList({
  onEditProduct,
  onCreateProduct,
  className = "",
}: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);

    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(err.message || "Không thể tải danh sách sản phẩm.");
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Lỗi kết nối khi tải danh sách sản phẩm.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getProducts();
        if (active) setProducts(data || []);
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Lỗi kết nối khi tải danh sách sản phẩm.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);

    try {
      await deleteProduct(productToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setActionSuccessMessage(`Đã xóa sản phẩm "${productToDelete.name}" thành công.`);
      setProductToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Xóa sản phẩm thất bại. Vui lòng thử lại.";
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    if (product.status === "PENDING_APPROVAL") {
      alert("Sản phẩm đang chờ Staff kiểm duyệt, không thể thay đổi trạng thái lúc này.");
      return;
    }

    const nextStatus: ProductStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUpdatingStatusId(product.id);

    try {
      const updated = await updateProduct(product.id, { status: nextStatus });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: updated.status ?? nextStatus } : p))
      );
      setActionSuccessMessage(
        `Đã chuyển trạng thái sản phẩm sang ${nextStatus === "ACTIVE" ? "Đang bán" : "Tạm ẩn"}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Không thể thay đổi trạng thái sản phẩm.";
      alert(msg);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const renderStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return <Badge tone="amber">Chờ duyệt (Staff)</Badge>;
      case "ACTIVE":
        return <Badge tone="green">Đang bán</Badge>;
      case "INACTIVE":
        return <Badge tone="slate">Tạm ẩn</Badge>;
      default:
        return <Badge tone="slate">{status}</Badge>;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  // 1. LOADING
  if (isLoading) {
    return (
      <Card className={`card-pad ${className}`} style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <span className="spinner" style={{ display: "inline-block", width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--sky)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Đang tải danh sách sản phẩm...</p>
      </Card>
    );
  }

  // 2. FORBIDDEN
  if (isForbidden) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>Không có quyền truy cập</h3>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Bạn cần đăng nhập tài khoản Người Bán (Seller) để xem và quản lý danh sách sản phẩm.
        </p>
      </Card>
    );
  }

  // 3. ERROR
  if (errorMessage) {
    return (
      <Card className={`card-pad ${className}`} style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
        <h3 style={{ fontSize: 17, marginBottom: 8, color: "#991b1b" }}>Không thể tải danh sách sản phẩm</h3>
        <p style={{ color: "#991b1b", fontSize: 13, marginBottom: 18 }}>{errorMessage}</p>
        <button type="button" onClick={fetchProducts} className="button button-secondary">
          Thử lại
        </button>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header bar */}
      <PageHeading
        title="Danh sách Sản phẩm"
        description="Quản lý, theo dõi tình trạng duyệt và phân phối sản phẩm trong shop."
        action={
          onCreateProduct && (
            <button type="button" onClick={onCreateProduct} className="button button-primary">
              <Icon name="plus" size={16} /> Thêm sản phẩm mới
            </button>
          )
        }
      />

      {/* Thông báo thao tác */}
      {actionSuccessMessage && (
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
            marginBottom: 16,
          }}
        >
          <span>{actionSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. EMPTY */}
      {products.length === 0 ? (
        <Card className="card-pad" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
          <h3 style={{ fontSize: 17, marginBottom: 8 }}>Chưa có sản phẩm nào</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: 440, margin: "0 auto 20px" }}>
            Shop của bạn chưa đăng bán sản phẩm nào. Hãy tạo sản phẩm đầu tiên để bắt đầu bán hàng trên Nexus.
          </p>
          {onCreateProduct && (
            <button type="button" onClick={onCreateProduct} className="button button-primary">
              <Icon name="plus" size={16} /> Tạo sản phẩm đầu tiên
            </button>
          )}
        </Card>
      ) : (
        /* TABLE */
        <Card>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const displayImg = product.imageUrl || product.images?.[0];
                  return (
                    <tr key={product.id}>
                      {/* Hình ảnh & Tên */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ position: "relative", width: 44, height: 44, borderRadius: 8, background: "#f1f5f9", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {displayImg ? (
                              <Image src={displayImg} alt={product.name} fill sizes="44px" style={{ objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: 20 }}>🖼️</span>
                            )}
                          </div>
                          <div>
                            <strong style={{ display: "block", color: "var(--ink)", fontSize: 13 }}>
                              {product.name}
                            </strong>
                            {product.sku && (
                              <small style={{ color: "var(--muted)", fontFamily: "monospace" }}>
                                SKU: {product.sku}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Danh mục */}
                      <td style={{ color: "var(--muted)" }}>
                        {product.categoryName || product.categoryId || "—"}
                      </td>

                      {/* Giá */}
                      <td>
                        <strong style={{ color: "var(--ink)" }}>{formatCurrency(product.price)}</strong>
                      </td>

                      {/* Trạng thái */}
                      <td>{renderStatusBadge(product.status)}</td>

                      {/* Thao tác */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          {onEditProduct && (
                            <button
                              type="button"
                              onClick={() => onEditProduct(product)}
                              className="button button-secondary button-small"
                            >
                              Sửa
                            </button>
                          )}

                          {product.status !== "PENDING_APPROVAL" && (
                            <button
                              type="button"
                              disabled={updatingStatusId === product.id}
                              onClick={() => handleToggleStatus(product)}
                              className="button button-light button-small"
                            >
                              {updatingStatusId === product.id
                                ? "..."
                                : product.status === "ACTIVE"
                                ? "Ẩn"
                                : "Bật bán"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="button button-secondary button-small"
                            style={{ color: "#ef4444", borderColor: "#fecaca" }}
                          >
                            Xóa
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

      {/* DIALOG XÁC NHẬN XÓA SẢN PHẨM */}
      {productToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          <Card className="card-pad" style={{ maxWidth: 440, width: "100%", background: "#fff", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Xác nhận xóa sản phẩm</h3>
            </div>

            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
              Bạn có chắc chắn muốn xóa sản phẩm{" "}
              <strong style={{ color: "var(--ink)" }}>&ldquo;{productToDelete.name}&rdquo;</strong>?
              Thao tác này sẽ gỡ bỏ sản phẩm khỏi cửa hàng và không thể hoàn tác.
            </p>

            <div className="action-row">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="button button-secondary"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="button button-primary"
                style={{ background: "#ef4444" }}
              >
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
