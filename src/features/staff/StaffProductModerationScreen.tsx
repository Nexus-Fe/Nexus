"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import {
  AdminPagination,
  Badge,
  Card,
  NoData,
  PageHeading,
} from "@/components/ui/Primitives";
import { ApiError } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import {
  productModerationService,
  type AdminProductItem,
  type ModerateProductPayload,
} from "./services/product-moderation.service";
import { extractAdminError } from "@/features/admin/services/admin-helpers";

const statuses = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PendingApproval", label: "Chờ duyệt" },
  { value: "Active", label: "Đang hoạt động" },
  { value: "Rejected", label: "Bị từ chối" },
  { value: "Suspended", label: "Bị đình chỉ / tạm khóa" },
  { value: "Draft", label: "Bản nháp" },
];

function statusLabel(status: string): string {
  const val = status?.toUpperCase();
  if (val === "PENDINGAPPROVAL" || val === "PENDING_APPROVAL") return "Chờ duyệt";
  if (val === "ACTIVE") return "Đang hoạt động";
  if (val === "REJECTED") return "Bị từ chối";
  if (val === "SUSPENDED") return "Bị đình chỉ";
  if (val === "DRAFT") return "Bản nháp";
  return status || "—";
}

function statusTone(status: string): "sky" | "green" | "amber" | "slate" | "red" {
  const val = status?.toUpperCase();
  if (val === "ACTIVE") return "green";
  if (val === "PENDINGAPPROVAL" || val === "PENDING_APPROVAL") return "amber";
  if (val === "REJECTED" || val === "SUSPENDED") return "red";
  return "slate";
}

function formatPrice(amount?: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function StaffProductModerationScreen() {
  const [status, setStatus] = useState("PendingApproval");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  // Modal / Action state
  const [selectedProduct, setSelectedProduct] = useState<AdminProductItem | null>(null);
  const [action, setAction] = useState<"APPROVE" | "REJECT" | "SUSPEND" | "UNLOCK">("APPROVE");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; traceId?: string } | null>(null);
  const [success, setSuccess] = useState("");

  const resource = useApiResource(
    `staff-products:${page}:${status}:${keyword}`,
    (signal) =>
      productModerationService.list(
        {
          page,
          pageSize: 20,
          status: status || undefined,
          keyword: keyword || undefined,
        },
        signal,
      ),
  );

  const products = resource.data?.items ?? [];

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setKeyword(searchInput.trim());
    setPage(1);
  }

  function openModerate(product: AdminProductItem) {
    setSelectedProduct(product);
    const upper = product.status?.toUpperCase();
    if (upper === "SUSPENDED") {
      setAction("UNLOCK");
    } else if (upper === "ACTIVE") {
      setAction("SUSPENDED" as unknown as "SUSPEND");
    } else {
      setAction("APPROVE");
    }
    setReason("");
    setError(null);
    setSuccess("");
  }

  async function handleModerateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;

    if ((action === "REJECT" || action === "SUSPEND") && !reason.trim()) {
      setError({ message: "Vui lòng nhập lý do khi Từ chối hoặc Đình chỉ sản phẩm." });
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess("");

    try {
      const payload: ModerateProductPayload = {
        action,
        reason: reason.trim() || undefined,
      };
      await productModerationService.moderate(selectedProduct.productId, payload);
      setSuccess(`Đã xử lý sản phẩm thành công (${action}).`);
      resource.reload();
      setTimeout(() => {
        setSelectedProduct(null);
      }, 1200);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError({ message: cause.message, traceId: cause.traceId });
      } else {
        setError(extractAdminError(cause, "Không thể xử lý kiểm duyệt sản phẩm."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Nghiệp vụ Staff"
        title="Duyệt sản phẩm đăng bán"
        description="Duyệt sản phẩm mới đăng tải, từ chối hoặc tạm đình chỉ các sản phẩm vi phạm quy định sàn."
      />

      {/* Filter bar */}
      <Card className="card-pad" style={{ marginBottom: "16px" }}>
        <form
          onSubmit={handleSearch}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr)) auto",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label className="field-wrap" style={{ margin: 0 }}>
            <span>Tìm kiếm từ khóa</span>
            <input
              className="field"
              placeholder="Tên sản phẩm, thương hiệu..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>

          <label className="field-wrap" style={{ margin: 0 }}>
            <span>Trạng thái kiểm duyệt</span>
            <select
              className="select-field"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {statuses.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="button button-primary">
              Tìm kiếm
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setSearchInput("");
                setKeyword("");
                setStatus("");
                setPage(1);
              }}
            >
              Xóa lọc
            </button>
          </div>
        </form>
      </Card>

      {/* Main Table */}
      <Card>
        {resource.error && (
          <p role="alert" className="notice">
            {resource.error.message}
          </p>
        )}

        {products.length ? (
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: 64, padding: "12px 8px" }}>Ảnh</th>
                  <th style={{ width: "36%", padding: "12px 10px" }}>Tên sản phẩm</th>
                  <th style={{ width: "18%", padding: "12px 10px" }}>Danh mục</th>
                  <th style={{ width: "14%", padding: "12px 10px" }}>Hình thức bán</th>
                  <th style={{ width: "16%", padding: "12px 10px" }}>Khoảng giá</th>
                  <th style={{ width: "16%", padding: "12px 10px" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.productId}
                    className="clickable-row"
                    onClick={() => openModerate(p)}
                    title="Nhấn để xem chi tiết & kiểm duyệt sản phẩm"
                  >
                    <td style={{ padding: "12px 8px" }}>
                      {p.primaryImageUrl ? (
                        <Image
                          src={p.primaryImageUrl}
                          alt={p.name}
                          width={48}
                          height={48}
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: "cover",
                            borderRadius: 4,
                            border: "1px solid var(--border)",
                          }}
                          unoptimized
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            background: "var(--surface-muted, #f1f5f9)",
                            borderRadius: 4,
                            display: "grid",
                            placeItems: "center",
                            fontSize: 10,
                            color: "var(--muted)",
                          }}
                        >
                          Chưa có ảnh
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 10px", wordBreak: "break-word", overflowWrap: "anywhere", lineHeight: 1.45 }}>
                      <strong style={{ display: "block" }}>{p.name}</strong>
                      {p.brand && <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.brand}</div>}
                    </td>
                    <td style={{ padding: "12px 10px", wordBreak: "break-word" }}>{p.categoryName || "—"}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <Badge tone="slate">{p.saleType}</Badge>
                    </td>
                    <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                      {p.minPrice != null || p.maxPrice != null
                        ? `${formatPrice(p.minPrice)} ~ ${formatPrice(p.maxPrice)}`
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
                      {p.statusReason && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, wordBreak: "break-word" }}>{p.statusReason}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải danh sách sản phẩm…"
                : resource.error
                  ? "Không thể tải danh sách sản phẩm"
                  : "Không có sản phẩm nào phù hợp"
            }
          />
        )}

        {resource.data && (
          <AdminPagination
            page={page}
            pageSize={resource.data.pageSize}
            totalItems={resource.data.total}
            loading={resource.loading}
            onPageChange={(p) => setPage(p)}
            itemLabel="sản phẩm"
          />
        )}
      </Card>

      {/* Moderate Action Modal */}
      {selectedProduct && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setSelectedProduct(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) setSelectedProduct(null);
          }}
        >
          <section className="admin-modal" style={{ maxWidth: "600px" }}>
            <div className="admin-modal-heading">
              <div>
                <h2 id="product-modal-title">Kiểm duyệt sản phẩm</h2>
                <p className="admin-modal-desc">
                  Mã: <code>{selectedProduct.productId}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                aria-label="Đóng"
                onClick={() => setSelectedProduct(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="info-row">
                <span>Tên sản phẩm</span>
                <strong>{selectedProduct.name}</strong>
              </div>
              <div className="info-row">
                <span>Danh mục</span>
                <strong>{selectedProduct.categoryName || "—"}</strong>
              </div>
              <div className="info-row">
                <span>Trạng thái hiện tại</span>
                <Badge tone={statusTone(selectedProduct.status)}>
                  {statusLabel(selectedProduct.status)}
                </Badge>
              </div>
            </div>

            {error && (
              <p role="alert" className="notice">
                {error.message}
                {error.traceId && <small> (Trace: {error.traceId})</small>}
              </p>
            )}
            {success && <p role="status" className="form-success">{success}</p>}

            <form onSubmit={handleModerateSubmit}>
              <label className="field-wrap">
                <span>Hành động kiểm duyệt</span>
                <select
                  className="select-field"
                  value={action}
                  onChange={(e) => setAction(e.target.value as "APPROVE" | "REJECT" | "SUSPEND" | "UNLOCK")}
                >
                  <option value="APPROVE">Phê duyệt sản phẩm lên sàn</option>
                  <option value="REJECT">Từ chối đăng bán</option>
                  <option value="SUSPEND">Tạm đình chỉ / khóa sản phẩm</option>
                  <option value="UNLOCK">Mở khóa sản phẩm</option>
                </select>
              </label>

              <label className="field-wrap">
                <span>Lý do / Ghi chú {action === "REJECT" || action === "SUSPEND" ? "(Bắt buộc)" : "(Tùy chọn)"}</span>
                <textarea
                  className="textarea-field"
                  rows={3}
                  placeholder="Nhập lý do kiểm duyệt gửi thông báo cho người bán..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={action === "REJECT" || action === "SUSPEND"}
                />
              </label>

              <div className="action-row" style={{ marginTop: 16 }}>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={busy}
                >
                  {busy ? "Đang xử lý…" : "Xác nhận kiểm duyệt"}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => setSelectedProduct(null)}
                >
                  Đóng
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
