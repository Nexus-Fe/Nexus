"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminPagination, Badge, Card, NoData, PageHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { sellerRegistrationsService, type SellerRegistration } from "./services/seller-registrations.service";

const statuses = [
  { value: "", label: "Tất cả" },
  { value: "Pending", label: "Chờ duyệt" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Rejected", label: "Từ chối" },
];

function statusLabel(status: string): string {
  const value = status.toUpperCase();
  if (value === "PENDING" || value === "PENDING_APPROVAL") return "Chờ duyệt";
  if (value === "APPROVED") return "Đã duyệt";
  if (value === "REJECTED") return "Từ chối";
  return status;
}

function statusTone(status: string): "sky" | "green" | "amber" | "slate" | "red" {
  const value = status.toUpperCase();
  if (value === "APPROVED") return "green";
  if (value === "REJECTED") return "red";
  if (value === "PENDING" || value === "PENDING_APPROVAL") return "amber";
  return "slate";
}

function isPending(status: string): boolean {
  return ["PENDING", "PENDING_APPROVAL"].includes(status.toUpperCase());
}

function documentUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function DocumentLink({
  label,
  url,
  onPreview,
}: {
  label: string;
  url?: string | null;
  onPreview?: (label: string, url: string) => void;
}) {
  const href = documentUrl(url);
  if (!href) {
    return (
      <div className="info-row">
        <span>{label}</span>
        <strong>Chưa có dữ liệu</strong>
      </div>
    );
  }

  return (
    <div className="info-row">
      <span>{label}</span>
      <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
        {onPreview && (
          <button
            type="button"
            className="button button-secondary button-small"
            style={{ fontSize: "12px", padding: "3px 8px" }}
            onClick={() => onPreview(label, href)}
          >
            🔍 Xem ảnh trực tiếp
          </button>
        )}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "12px", color: "var(--muted)" }}
        >
          Mở tab mới ↗
        </a>
      </div>
    </div>
  );
}

function DocPreviewModal({
  previewDoc,
  onClose,
}: {
  previewDoc: { label: string; url: string } | null;
  onClose: () => void;
}) {
  if (!previewDoc) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1100,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "20px",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
            {previewDoc.label}
          </h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <a
              href={previewDoc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-secondary button-small"
              style={{ fontSize: "12px" }}
            >
              Mở ảnh gốc ↗
            </a>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "none",
                background: "#f1f5f9",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "14px",
                display: "grid",
                placeItems: "center",
              }}
              aria-label="Đóng xem ảnh"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#0f172a",
            borderRadius: "8px",
            display: "grid",
            placeItems: "center",
            padding: "10px",
            minHeight: "360px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewDoc.url}
            alt={previewDoc.label}
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function StaffSellersScreen() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRegistration, setSelectedRegistration] = useState<SellerRegistration | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ label: string; url: string } | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSaved, setModalSaved] = useState("");

  const registrations = useApiResource(`seller-registrations:${status}:${page}`, (signal) => sellerRegistrationsService.list({ page, limit: 20, status }, signal));
  const records = registrations.data?.items ?? [];

  async function handleModalDecide(approved: boolean) {
    if (!selectedRegistration) return;
    if (!approved && !modalReason.trim()) {
      setModalError("Vui lòng nhập lý do từ chối hồ sơ người bán.");
      return;
    }
    setModalBusy(true);
    setModalError("");
    setModalSaved("");
    try {
      if (approved) {
        await sellerRegistrationsService.approve(selectedRegistration.registrationId);
        setModalSaved("Đã phê duyệt hồ sơ người bán thành công.");
      } else {
        await sellerRegistrationsService.reject(selectedRegistration.registrationId, modalReason.trim());
        setModalSaved("Đã từ chối hồ sơ người bán.");
      }
      registrations.reload();
      setTimeout(() => {
        setSelectedRegistration(null);
        setModalSaved("");
        setModalReason("");
      }, 1200);
    } catch (cause) {
      setModalError(cause instanceof Error ? cause.message : "Không thể xử lý hồ sơ.");
    } finally {
      setModalBusy(false);
    }
  }

  return <>
    <PageHeading overline="Nghiệp vụ Vận hành" title="Duyệt người bán" description="Hồ sơ đăng ký tài khoản bán hàng." />
    <label className="field-wrap">Trạng thái hồ sơ<select className="select-field" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <Card>
      {registrations.error && <p role="alert" className="notice">{registrations.error.message}</p>}
      {records.length ? (
        <div className="table-scroll">
          <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ width: "28%", padding: "12px 10px" }}>Mã hồ sơ</th>
                <th style={{ width: "28%", padding: "12px 10px" }}>Tên shop</th>
                <th style={{ width: "28%", padding: "12px 10px" }}>Email doanh nghiệp</th>
                <th style={{ width: "16%", padding: "12px 10px" }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {records.map((registration) => (
                <tr
                  key={registration.registrationId}
                  className="clickable-row"
                  onClick={() => setSelectedRegistration(registration)}
                  title="Nhấn để xem popup thông tin người bán"
                >
                  <td style={{ padding: "12px 10px", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    <code>{registration.registrationId}</code>
                  </td>
                  <td style={{ padding: "12px 10px", wordBreak: "break-word" }}>
                    <strong>{registration.shopName}</strong>
                  </td>
                  <td style={{ padding: "12px 10px", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    {registration.businessEmail ?? "—"}
                  </td>
                  <td style={{ padding: "12px 10px" }}>
                    <Badge tone={statusTone(registration.status)}>
                      {statusLabel(registration.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <NoData
          title={
            registrations.loading
              ? "Đang tải hồ sơ…"
              : registrations.error
                ? "Không tải được hồ sơ"
                : "Không có hồ sơ"
          }
        />
      )}
      {registrations.data && (
        <AdminPagination
          page={page}
          pageSize={registrations.data.limit}
          totalItems={registrations.data.total}
          loading={registrations.loading}
          onPageChange={(nextPage) => setPage(nextPage)}
          itemLabel="hồ sơ"
        />
      )}
    </Card>

    {/* Popup thông tin người bán */}
    {selectedRegistration && (
      <div
        className="admin-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedRegistration(null);
            setModalError("");
            setModalSaved("");
            setModalReason("");
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSelectedRegistration(null);
            setModalError("");
            setModalSaved("");
            setModalReason("");
          }
        }}
      >
        <section
          className="admin-modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seller-modal-title"
          style={{ maxWidth: 760, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
        >
          <div className="admin-modal-heading">
            <div>
              <h2 id="seller-modal-title">Thông tin hồ sơ người bán</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                Mã hồ sơ: <code>{selectedRegistration.registrationId}</code>
              </p>
            </div>
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => {
                setSelectedRegistration(null);
                setModalError("");
                setModalSaved("");
                setModalReason("");
              }}
              aria-label="Đóng popup"
            >
              ✕
            </button>
          </div>

          {modalError && <p role="alert" className="notice">{modalError}</p>}
          {modalSaved && <p role="status" className="form-success">{modalSaved}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
            <RegistrationDetails
              registration={selectedRegistration}
              onPreview={(label, url) => setPreviewDoc({ label, url })}
            />

            {isPending(selectedRegistration.status) && (
              <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <label className="field-wrap">
                  Lý do từ chối (bắt buộc nếu từ chối)
                  <textarea
                    className="textarea-field"
                    rows={2}
                    placeholder="Nhập lý do từ chối hồ sơ người bán..."
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                  />
                </label>
                <div className="action-row" style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={modalBusy}
                    onClick={() => void handleModalDecide(true)}
                  >
                    {modalBusy ? "Đang xử lý…" : "Phê duyệt hồ sơ"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={modalBusy || !modalReason.trim()}
                    onClick={() => void handleModalDecide(false)}
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <Link
                className="button button-secondary button-small"
                href={ROUTES.staff.seller(selectedRegistration.registrationId)}
                onClick={() => setSelectedRegistration(null)}
              >
                Mở trang quản trị chi tiết →
              </Link>
            </div>
          </div>
        </section>
      </div>
    )}

    <DocPreviewModal previewDoc={previewDoc} onClose={() => setPreviewDoc(null)} />
  </>;
}

function RegistrationDetails({
  registration,
  onPreview,
}: {
  registration: SellerRegistration;
  onPreview?: (label: string, url: string) => void;
}) {
  return <>
    <div className="info-row"><span>Người nộp</span><strong>{registration.applicantName ?? "—"}</strong></div>
    <div className="info-row"><span>Email tài khoản</span><strong>{registration.applicantEmail ?? "—"}</strong></div>
    <div className="info-row"><span>Số điện thoại tài khoản</span><strong>{registration.applicantPhone ?? "—"}</strong></div>
    <div className="info-row"><span>Tên shop</span><strong>{registration.shopName}</strong></div>
    <div className="info-row"><span>Email doanh nghiệp</span><strong>{registration.businessEmail ?? "—"}</strong></div>
    <div className="info-row"><span>Hotline</span><strong>{registration.hotline ?? "—"}</strong></div>
    <div className="info-row"><span>CCCD</span><strong>{registration.identityCardNumber ?? "—"}</strong></div>
    <div className="info-row"><span>Địa chỉ kho</span><strong>{registration.warehouseAddress ?? registration.pickupAddress ?? "—"}</strong></div>
    <div className="info-row"><span>Trạng thái</span><strong><Badge tone={statusTone(registration.status)}>{statusLabel(registration.status)}</Badge></strong></div>
    {registration.rejectionReason && <div className="info-row"><span>Lý do từ chối</span><strong>{registration.rejectionReason}</strong></div>}
    <DocumentLink label="Mặt trước CCCD" url={registration.idCardFrontUrl} onPreview={onPreview} />
    <DocumentLink label="Mặt sau CCCD" url={registration.idCardBackUrl} onPreview={onPreview} />
    <DocumentLink label="Giấy phép kinh doanh" url={registration.businessLicenseUrl} onPreview={onPreview} />
  </>;
}

export function StaffSellerDetailScreen() {
  const id = String(useParams<{ id: string }>().id ?? "");
  const registration = useApiResource(id ? `seller-registration:${id}` : null, (signal) => sellerRegistrationsService.detail(id, signal));
  const sellerId = registration.data?.userId ?? "";
  const sellerProfile = useApiResource(
    sellerId && registration.data?.status?.toUpperCase() === "APPROVED" ? `seller-profile:${sellerId}` : null,
    (signal) => sellerRegistrationsService.getSellerProfile(sellerId, signal),
  );

  const [previewDoc, setPreviewDoc] = useState<{ label: string; url: string } | null>(null);
  const [reason, setReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const canDecide = Boolean(registration.data && isPending(registration.data.status) && !decided);

  async function decide(approved: boolean) {
    if (!canDecide || (!approved && !reason.trim())) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      if (approved) await sellerRegistrationsService.approve(id);
      else await sellerRegistrationsService.reject(id, reason.trim());
      setDecided(true);
      setSaved(approved ? "Đã phê duyệt hồ sơ." : "Đã từ chối hồ sơ.");
      registration.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xử lý hồ sơ.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspend(suspend: boolean) {
    if (!sellerId) return;
    if (suspend && !suspendReason.trim()) {
      setError("Vui lòng nhập lý do đình chỉ gian hàng.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      if (suspend) {
        await sellerRegistrationsService.suspendSeller(sellerId, { reason: suspendReason.trim(), durationDays: 30 });
        setSaved("Đã tạm đình chỉ quyền bán hàng của gian hàng.");
      } else {
        await sellerRegistrationsService.reactivateSeller(sellerId, { reason: "Staff khôi phục hoạt động gian hàng" });
        setSaved("Đã kích hoạt lại gian hàng thành công.");
      }
      setSuspendReason("");
      sellerProfile.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái gian hàng.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeading title="Chi tiết hồ sơ người bán" description={`Mã hồ sơ: ${id}`} />
    {registration.error && <p role="alert" className="notice">Không tải được chi tiết hồ sơ: {registration.error.message}</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    {saved && <p role="status" className="form-success">{saved}</p>}
    <Card className="card-pad">
      {registration.data ? (
        <RegistrationDetails
          registration={registration.data}
          onPreview={(label, url) => setPreviewDoc({ label, url })}
        />
      ) : (
        <NoData title={registration.loading ? "Đang tải hồ sơ…" : registration.error ? "Không tải được chi tiết hồ sơ" : "Không có dữ liệu hồ sơ"} />
      )}
      {canDecide && <>
        <label className="field-wrap">Lý do từ chối<textarea className="textarea-field" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="action-row"><button type="button" className="button button-primary" disabled={busy} onClick={() => void decide(true)}>{busy ? "Đang xử lý…" : "Phê duyệt"}</button><button type="button" className="button button-secondary" disabled={busy || !reason.trim()} onClick={() => void decide(false)}>Từ chối</button></div>
      </>}

      {/* Quản lý gian hàng sau khi đã duyệt */}
      {registration.data && registration.data.status?.toUpperCase() === "APPROVED" && sellerId && (
        <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Quản trị trạng thái gian hàng</h3>
          {sellerProfile.data && (
            <div style={{ marginBottom: 16 }}>
              <div className="info-row"><span>Trạng thái gian hàng:</span><strong><Badge tone={sellerProfile.data.status === "Active" ? "green" : "red"}>{sellerProfile.data.status || "Hoạt động"}</Badge></strong></div>
              <div className="info-row"><span>Điểm uy tín:</span><strong>{sellerProfile.data.reputationScore ?? 100} ({sellerProfile.data.trustLevel || "Chuẩn mực"})</strong></div>
              <div className="info-row"><span>Số lần bị kỷ luật:</span><strong>{sellerProfile.data.penaltyCount ?? 0}</strong></div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="field-wrap" style={{ margin: 0 }}>
              <span>Lý do đình chỉ (nếu đình chỉ gian hàng)</span>
              <input
                className="field"
                placeholder="Nhập lý do đình chỉ hoạt động gian hàng..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </label>
            <div className="action-row">
              <button
                type="button"
                className="button button-secondary"
                style={{ color: "var(--red)" }}
                disabled={busy || !suspendReason.trim()}
                onClick={() => void handleSuspend(true)}
              >
                {busy ? "Đang xử lý…" : "Đình chỉ gian hàng (30 ngày)"}
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={busy}
                onClick={() => void handleSuspend(false)}
              >
                {busy ? "Đang xử lý…" : "Kích hoạt lại gian hàng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>

    <DocPreviewModal previewDoc={previewDoc} onClose={() => setPreviewDoc(null)} />
  </>;
}
