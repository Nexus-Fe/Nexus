"use client";

import { useState, type FormEvent } from "react";
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
  adminPenaltiesService,
  penaltyStatusLabel,
  penaltyStatusTone,
  penaltyTypeLabel,
  penaltyViolationTypeLabel,
  targetRoleTone,
} from "./services/admin-penalties.service";
import { extractAdminError } from "./services/admin-helpers";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminPenaltiesScreen() {
  const [userIdFilter, setUserIdFilter] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");

  // Revoke state
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; traceId?: string } | null>(null);
  const [saved, setSaved] = useState("");

  const [filterError, setFilterError] = useState("");

  const query = {
    page,
    limit: 20,
    userId: userIdFilter || undefined,
    targetRole: targetRole || undefined,
    status: status || undefined,
  };

  const penalties = useApiResource(
    `admin-penalties:${page}:${userIdFilter}:${targetRole}:${status}`,
    (signal) => adminPenaltiesService.list(query, signal),
  );

  const detail = useApiResource(
    selected ? `admin-penalty:${selected}` : null,
    (signal) => adminPenaltiesService.detail(selected, signal),
  );

  const records = penalties.data?.items ?? [];

  function handleError(cause: unknown, fallback: string) {
    if (cause instanceof ApiError) {
      setError({ message: cause.message, traceId: cause.traceId });
    } else {
      setError(extractAdminError(cause, fallback));
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = userIdInput.trim();
    if (trimmed && !GUID_REGEX.test(trimmed)) {
      setFilterError("User ID phải là định dạng GUID hợp lệ (ví dụ: 12345678-1234-1234-1234-123456789abc).");
      return;
    }
    setFilterError("");
    setPage(1);
    setUserIdFilter(trimmed);
  }

  function openDetail(id: string) {
    setSelected(id);
    setShowRevokeForm(false);
    setRevokeReason("");
    setError(null);
    setSaved("");
  }

  function closeDetail() {
    setSelected("");
    setShowRevokeForm(false);
    setRevokeReason("");
    setError(null);
    setSaved("");
  }

  async function submitRevoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !revokeReason.trim()) return;

    setBusy(true);
    setError(null);
    setSaved("");
    try {
      await adminPenaltiesService.revoke(selected, revokeReason.trim());
      setSaved("Đã thu hồi quyết định xử phạt thành công. Quyền hạn đã được khôi phục.");
      setShowRevokeForm(false);
      setRevokeReason("");
      detail.reload();
      penalties.reload();
    } catch (cause) {
      handleError(cause, "Không thể thu hồi án phạt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Quản trị hệ thống"
        title="Sổ bộ án phạt toàn sàn"
        description="Tra cứu biên bản xử phạt vi phạm của Người mua và Gian hàng. Thu hồi chế tài kỷ luật khi khắc phục vi phạm."
        action={
          <button
            type="button"
            className="button button-secondary button-small"
            disabled={penalties.loading}
            onClick={penalties.reload}
          >
            {penalties.loading ? "Đang cập nhật…" : "Làm mới danh sách"}
          </button>
        }
      />

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
            <span>Tìm theo User ID (GUID)</span>
            <input
              className="field"
              placeholder="Nhập User GUID..."
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
            />
          </label>

          <label className="field-wrap" style={{ margin: 0 }}>
            <span>Đối tượng chịu phạt</span>
            <select
              className="select-field"
              value={targetRole}
              onChange={(e) => {
                setTargetRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vai trò</option>
              <option value="Buyer">Buyer (Người mua)</option>
              <option value="Seller">Seller (Người bán / Shop)</option>
              <option value="Account">Account (Toàn diện)</option>
            </select>
          </label>

          <label className="field-wrap" style={{ margin: 0 }}>
            <span>Trạng thái án phạt</span>
            <select
              className="select-field"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Active">Có hiệu lực (Active)</option>
              <option value="Expired">Đã hết hạn (Expired)</option>
              <option value="Revoked">Đã thu hồi (Revoked)</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="button button-primary">
              Tìm kiếm
            </button>
            {(userIdFilter || targetRole || status || userIdInput || filterError) && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setUserIdInput("");
                  setUserIdFilter("");
                  setFilterError("");
                  setTargetRole("");
                  setStatus("");
                  setPage(1);
                }}
              >
                Đặt lại
              </button>
            )}
          </div>
        </form>
        {filterError && (
          <p role="alert" className="notice" style={{ marginTop: "10px", color: "var(--red)" }}>
            {filterError}
          </p>
        )}
      </Card>

      <Card>
        {penalties.loading && !records.length ? (
          <NoData title="Đang tải danh sách án phạt vi phạm…" />
        ) : penalties.error ? (
          <p role="alert" className="notice">
            {penalties.error.message}
          </p>
        ) : !records.length ? (
          <NoData title="Không tìm thấy quyết định xử phạt nào." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người vi phạm</th>
                  <th>Vai trò</th>
                  <th>Hình thức xử phạt</th>
                  <th>Loại vi phạm</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>Thời hạn</th>
                  <th>Ngày ban hành</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        type="button"
                        className="user-cell-btn"
                        onClick={() => openDetail(item.id)}
                        title="Bấm để xem chi tiết án phạt"
                      >
                        <strong>{item.userEmail || item.userId}</strong>
                      </button>
                      {item.userEmail && item.userId && (
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          ID: {item.userId.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge tone={targetRoleTone(item.targetRole)}>
                        {item.targetRole}
                      </Badge>
                    </td>
                    <td>
                      <strong>{penaltyTypeLabel(item.penaltyApplied)}</strong>
                      {item.pointsDeducted > 0 && (
                        <span style={{ color: "#dc2626", marginLeft: "4px", fontSize: "12px" }}>
                          (-{item.pointsDeducted}đ)
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "13px" }}>
                        {penaltyViolationTypeLabel(item.violationType)}
                      </span>
                    </td>
                    <td style={{ fontSize: "13px", maxWidth: "220px" }} title={item.reason}>
                      {item.reason ? (item.reason.length > 35 ? `${item.reason.slice(0, 35)}…` : item.reason) : "—"}
                    </td>
                    <td>
                      <Badge tone={penaltyStatusTone(item.status)}>
                        {penaltyStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td style={{ fontSize: "12px" }}>
                      {item.expiresAt
                        ? new Date(item.expiresAt).toLocaleDateString("vi-VN")
                        : "Vô thời hạn"}
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {new Date(item.issuedAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => openDetail(item.id)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {Boolean(penalties.data?.total) && (
          <AdminPagination
            page={page}
            pageSize={20}
            totalItems={penalties.data?.total}
            onPageChange={(nextPage) => setPage(nextPage)}
            itemLabel="án phạt"
          />
        )}
      </Card>

      {/* Detail & Revoke Modal */}
      {Boolean(selected) && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) closeDetail();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) closeDetail();
          }}
        >
          <section
            className="admin-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="penalty-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="penalty-modal-title">Chi tiết quyết định xử phạt</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Mã biên bản: <code>{selected}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeDetail}
                disabled={busy}
                aria-label="Đóng popup"
                title="Đóng (Esc)"
              >
                ✕
              </button>
            </div>

            {detail.loading && <NoData title="Đang tải chi tiết biên bản xử phạt…" />}
            {detail.error && (
              <p role="alert" className="notice">
                {detail.error.message}
              </p>
            )}
            {error && (
              <div role="alert" className="notice">
                <p>{error.message}</p>
              </div>
            )}
            {saved && (
              <p role="status" className="form-success">
                {saved}
              </p>
            )}

            {detail.data && (
              <>
                <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                  <div className="info-row">
                    <span>Người vi phạm</span>
                    <strong>{detail.data.userFullName || detail.data.userEmail || "—"}</strong>
                  </div>
                  {detail.data.userEmail && (
                    <div className="info-row">
                      <span>Email tài khoản</span>
                      <strong>{detail.data.userEmail}</strong>
                    </div>
                  )}
                  <div className="info-row">
                    <span>User ID</span>
                    <code>{detail.data.userId}</code>
                  </div>
                  <div className="info-row">
                    <span>Vai trò áp dụng chế tài</span>
                    <Badge tone={targetRoleTone(detail.data.targetRole)}>
                      {detail.data.targetRole}
                    </Badge>
                  </div>
                  <div className="info-row">
                    <span>Hình thức xử phạt</span>
                    <strong>
                      {penaltyTypeLabel(detail.data.penaltyApplied)}
                      {detail.data.pointsDeducted > 0 && ` (Trừ ${detail.data.pointsDeducted} điểm)`}
                    </strong>
                  </div>
                  <div className="info-row">
                    <span>Loại vi phạm</span>
                    <Badge tone="slate">
                      {penaltyViolationTypeLabel(detail.data.violationType)}
                    </Badge>
                  </div>
                  {detail.data.policyClauseCode && (
                    <div className="info-row">
                      <span>Mã điều khoản vi phạm</span>
                      <code>{detail.data.policyClauseCode}</code>
                    </div>
                  )}
                  <div className="info-row">
                    <span>Trạng thái hiệu lực</span>
                    <Badge tone={penaltyStatusTone(detail.data.status)}>
                      {penaltyStatusLabel(detail.data.status)}
                    </Badge>
                  </div>
                  <div className="info-row">
                    <span>Lý do xử phạt</span>
                    <strong style={{ color: "var(--ink)", maxWidth: "65%", textAlign: "right" }}>
                      {detail.data.reason}
                    </strong>
                  </div>
                  <div className="info-row">
                    <span>Thời điểm lập biên bản</span>
                    <strong>{new Date(detail.data.issuedAt).toLocaleString("vi-VN")}</strong>
                  </div>
                  <div className="info-row">
                    <span>Thời hạn thi hành</span>
                    <strong>
                      {detail.data.expiresAt
                        ? new Date(detail.data.expiresAt).toLocaleString("vi-VN")
                        : "Vô thời hạn"}
                    </strong>
                  </div>
                  {detail.data.createdBy && (
                    <div className="info-row">
                      <span>Người ban hành</span>
                      <small style={{ color: "var(--muted)" }}>{detail.data.createdBy}</small>
                    </div>
                  )}

                  {/* Evidence URLs */}
                  {Boolean(detail.data.evidenceUrls?.length) && (
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", marginTop: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                        Tài liệu & Bằng chứng vi phạm:
                      </span>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px" }}>
                        {detail.data.evidenceUrls.map((url, idx) => (
                          <li key={idx} style={{ marginBottom: "4px" }}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--sky-dark)", textDecoration: "underline", wordBreak: "break-all" }}
                            >
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Revoke Audit Information */}
                  {String(detail.data.status).toUpperCase() === "REVOKED" && (
                    <div
                      style={{
                        borderTop: "1px solid var(--line)",
                        paddingTop: "12px",
                        marginTop: "4px",
                        background: "#f0fdf4",
                        padding: "10px 12px",
                        borderRadius: "8px",
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#166534", display: "block", marginBottom: "6px" }}>
                        Thông tin thu hồi án phạt:
                      </span>
                      {detail.data.revokedAt && (
                        <div className="info-row" style={{ color: "#166534" }}>
                          <span>Thời điểm thu hồi</span>
                          <strong>{new Date(detail.data.revokedAt).toLocaleString("vi-VN")}</strong>
                        </div>
                      )}
                      {detail.data.revokedBy && (
                        <div className="info-row" style={{ color: "#166534" }}>
                          <span>Người thực hiện thu hồi</span>
                          <small>{detail.data.revokedBy}</small>
                        </div>
                      )}
                      {detail.data.revokeReason && (
                        <div className="info-row" style={{ color: "#166534" }}>
                          <span>Lý do thu hồi</span>
                          <strong>{detail.data.revokeReason}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Revoke Action Button */}
                {String(detail.data.status).toUpperCase() === "ACTIVE" && !showRevokeForm && (
                  <div
                    className="action-row"
                    style={{ borderTop: "1px solid var(--line)", paddingTop: "14px" }}
                  >
                    <button
                      type="button"
                      className="button button-danger button-small"
                      disabled={busy}
                      onClick={() => {
                        setShowRevokeForm(true);
                        setRevokeReason("");
                        setError(null);
                      }}
                    >
                      Thu hồi án phạt (Admin Revoke)
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      disabled={busy}
                      onClick={closeDetail}
                    >
                      Đóng
                    </button>
                  </div>
                )}

                {/* Revoke Form */}
                {showRevokeForm && (
                  <form
                    className="auth-fields"
                    onSubmit={submitRevoke}
                    style={{ borderTop: "1px solid var(--line)", paddingTop: "14px", marginTop: "14px" }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "#fef2f2",
                        borderRadius: "8px",
                        border: "1px solid #fee2e2",
                        fontSize: "13px",
                        color: "#991b1b",
                      }}
                    >
                      Thu hồi án phạt sẽ giải phóng các hạn chế tương ứng (`Restriction`, `Suspended`), khôi phục trạng thái hoạt động bình thường cho tài khoản hoặc gian hàng.
                    </div>

                    <label className="field-wrap">
                      Lý do thu hồi án phạt <span style={{ color: "var(--red)" }}>*</span>
                      <textarea
                        className="textarea-field"
                        required
                        maxLength={1000}
                        placeholder="Nhập lý do thu hồi (khiếu nại thành công, khắc phục hậu quả, lỗi nhận định...)"
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                      />
                    </label>

                    <div className="action-row">
                      <button
                        className="button button-danger"
                        disabled={busy || !revokeReason.trim()}
                      >
                        {busy ? "Đang thu hồi…" : "Xác nhận thu hồi án phạt"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => setShowRevokeForm(false)}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
