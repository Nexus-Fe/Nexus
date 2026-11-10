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
  adminReportsService,
  reportStatusLabel,
  reportStatusTone,
  reportViolationTypeLabel,
  type AdminReportItem,
  type ResolveReportPayload,
} from "./services/admin-reports.service";

type ActionType = "resolve" | "dismiss" | null;

function normalizeTargetRole(role?: string): "Account" | "Buyer" | "Seller" {
  const r = (role ?? "").toLowerCase();
  if (r === "seller") return "Seller";
  if (r === "buyer") return "Buyer";
  return "Account";
}

export function AdminReportsScreen() {
  const [status, setStatus] = useState("");
  const [violationType, setViolationType] = useState("");
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<AdminReportItem | null>(null);

  // Actions
  const [actionType, setActionType] = useState<ActionType>(null);
  const [dismissNote, setDismissNote] = useState("");
  const [resolveForm, setResolveForm] = useState<{
    targetRole: "Account" | "Buyer" | "Seller";
    penaltyApplied: "Warning" | "DeductPoints" | "Restriction" | "BanAccount" | "Other";
    scoreDeduction: number;
    banAccount: boolean;
    suspendSellerShop: boolean;
    durationDays: string;
    policyClauseCode: string;
    resolutionNote: string;
  }>({
    targetRole: "Account",
    penaltyApplied: "DeductPoints",
    scoreDeduction: 10,
    banAccount: false,
    suspendSellerShop: false,
    durationDays: "7",
    policyClauseCode: "",
    resolutionNote: "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; traceId?: string } | null>(null);
  const [saved, setSaved] = useState("");

  const query = {
    page,
    pageSize: 20,
    status: status || undefined,
    violationType: violationType || undefined,
  };

  const reports = useApiResource(
    `admin-reports:${page}:${status}:${violationType}`,
    (signal) => adminReportsService.list(query, signal),
  );

  const records = reports.data?.items ?? [];

  function handleError(cause: unknown, fallback: string) {
    if (cause instanceof ApiError) {
      setError({ message: cause.message, traceId: cause.traceId });
    } else {
      setError({ message: cause instanceof Error ? cause.message : fallback });
    }
  }

  function openDetail(item: AdminReportItem) {
    setSelectedReport(item);
    setActionType(null);
    setDismissNote("");
    setResolveForm({
      targetRole: normalizeTargetRole(item.targetRole),
      penaltyApplied: "DeductPoints",
      scoreDeduction: 10,
      banAccount: false,
      suspendSellerShop: false,
      durationDays: "7",
      policyClauseCode: "",
      resolutionNote: "",
    });
    setError(null);
    setSaved("");
  }

  function closeDetail() {
    setSelectedReport(null);
    setActionType(null);
    setDismissNote("");
    setError(null);
    setSaved("");
  }

  async function submitDismiss(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReport) return;
    if (dismissNote.trim().length < 10) {
      setError({ message: "Lý do bác bỏ phải có ít nhất 10 ký tự." });
      return;
    }

    setBusy(true);
    setError(null);
    setSaved("");
    try {
      await adminReportsService.dismiss(selectedReport.reportId, {
        resolutionNote: dismissNote.trim(),
      });
      setSaved("Đã bác bỏ báo cáo vi phạm.");
      setActionType(null);
      reports.reload();
      // Update local item
      setSelectedReport((prev) =>
        prev
          ? {
              ...prev,
              status: "Rejected",
              resolutionNote: dismissNote.trim(),
              resolvedAt: new Date().toISOString(),
            }
          : null,
      );
    } catch (cause) {
      handleError(cause, "Không thể bác bỏ báo cáo.");
    } finally {
      setBusy(false);
    }
  }

  async function submitResolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReport) return;
    if (resolveForm.resolutionNote.trim().length < 10) {
      setError({ message: "Quyết định xử lý phải có ít nhất 10 ký tự." });
      return;
    }

    const score = Number(resolveForm.scoreDeduction);
    if (Number.isNaN(score) || score < 0 || score > 50) {
      setError({ message: "Điểm uy tín trừ phải là số nguyên từ 0 đến 50." });
      return;
    }

    const duration = resolveForm.durationDays ? parseInt(resolveForm.durationDays, 10) : undefined;
    const payload: ResolveReportPayload = {
      targetRole: resolveForm.targetRole,
      penaltyApplied: resolveForm.penaltyApplied,
      scoreDeduction: score,
      banAccount: resolveForm.banAccount,
      suspendSellerShop: resolveForm.suspendSellerShop,
      durationDays: duration && duration > 0 ? duration : null,
      policyClauseCode: resolveForm.policyClauseCode.trim() || null,
      resolutionNote: resolveForm.resolutionNote.trim(),
    };

    setBusy(true);
    setError(null);
    setSaved("");
    try {
      await adminReportsService.resolve(selectedReport.reportId, payload);
      setSaved("Đã xử lý và áp dụng chế tài vi phạm thành công.");
      setActionType(null);
      reports.reload();
      // Update local item
      setSelectedReport((prev) =>
        prev
          ? {
              ...prev,
              status: "Resolved",
              resolutionNote: resolveForm.resolutionNote.trim(),
              resolvedAt: new Date().toISOString(),
            }
          : null,
      );
    } catch (cause) {
      handleError(cause, "Không thể giải quyết báo cáo.");
    } finally {
      setBusy(false);
    }
  }

  const isPending =
    selectedReport &&
    (String(selectedReport.status).toLowerCase() === "pending" ||
      String(selectedReport.status).toLowerCase() === "underreview");

  const isResolvedOrRejected =
    selectedReport &&
    (String(selectedReport.status).toLowerCase() === "resolved" ||
      String(selectedReport.status).toLowerCase() === "rejected" ||
      String(selectedReport.status).toLowerCase() === "dismissed");

  return (
    <>
      <PageHeading
        overline="Quản trị hệ thống"
        title="Báo cáo & Khiếu nại vi phạm"
        description="Tiếp nhận, thẩm tra và xử lý dứt điểm các tố cáo vi phạm từ cộng đồng Người mua và Người bán."
        action={
          <button
            type="button"
            className="button button-secondary button-small"
            disabled={reports.loading}
            onClick={reports.reload}
          >
            {reports.loading ? "Đang cập nhật…" : "Làm mới danh sách"}
          </button>
        }
      />

      <Card className="card-pad" style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr)) auto",
            gap: "12px",
            alignItems: "end",
          }}
        >
          <label className="field-wrap" style={{ margin: 0 }}>
            <span>Trạng thái xử lý</span>
            <select
              className="select-field"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Chờ xử lý (Pending)</option>
              <option value="UnderReview">Đang xem xét (UnderReview)</option>
              <option value="Resolved">Đã giải quyết (Resolved)</option>
              <option value="Rejected">Đã bác bỏ (Rejected)</option>
            </select>
          </label>

          <label className="field-wrap" style={{ margin: 0 }}>
            <span>Loại vi phạm</span>
            <select
              className="select-field"
              value={violationType}
              onChange={(e) => {
                setViolationType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả hành vi</option>
              <option value="Fraud">Gian lận / Lừa đảo</option>
              <option value="Counterfeit">Hàng giả / Vi phạm bản quyền</option>
              <option value="Harassment">Quấy rối / Đe dọa</option>
              <option value="Spam">Spam / Rác</option>
              <option value="Other">Hành vi khác</option>
            </select>
          </label>

          {(status || violationType) && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setStatus("");
                setViolationType("");
                setPage(1);
              }}
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </Card>

      <Card>
        {reports.loading && !records.length ? (
          <NoData title="Đang tải danh sách báo cáo vi phạm…" />
        ) : reports.error ? (
          <p role="alert" className="notice">
            {reports.error.message}
          </p>
        ) : !records.length ? (
          <NoData title="Không có báo cáo vi phạm nào phù hợp." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã báo cáo</th>
                  <th>Loại vi phạm</th>
                  <th>Đối tượng bị tố cáo</th>
                  <th>Người gửi báo cáo</th>
                  <th>Trạng thái</th>
                  <th>Thời gian gửi</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item.reportId}>
                    <td>
                      <button
                        type="button"
                        className="user-cell-btn"
                        onClick={() => openDetail(item)}
                      >
                        <code>{item.reportId.slice(0, 8)}…</code>
                      </button>
                    </td>
                    <td>
                      <Badge tone={item.violationType === "Fraud" ? "red" : "slate"}>
                        {reportViolationTypeLabel(item.violationType)}
                      </Badge>
                    </td>
                    <td>
                      <code style={{ fontSize: "12px" }}>
                        {item.reportedUserId.slice(0, 8)}…
                      </code>
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "4px" }}>
                        ({item.targetRole})
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: "12px" }}>
                        {item.reporterId.slice(0, 8)}…
                      </code>
                    </td>
                    <td>
                      <Badge tone={reportStatusTone(item.status)}>
                        {reportStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => openDetail(item)}
                      >
                        {item.status === "Pending" ? "Xử lý" : "Chi tiết"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {Boolean(reports.data?.total) && (
          <AdminPagination
            page={page}
            pageSize={20}
            totalItems={reports.data?.total}
            onPageChange={(nextPage) => setPage(nextPage)}
            itemLabel="báo cáo"
          />
        )}
      </Card>

      {/* Detail & Action Modal */}
      {Boolean(selectedReport) && (
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
            aria-labelledby="report-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="report-modal-title">Hồ sơ báo cáo vi phạm</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Mã hồ sơ: <code>{selectedReport?.reportId}</code>
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

            {selectedReport && (
              <>
                <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                  <div className="info-row">
                    <span>Trạng thái hồ sơ</span>
                    <Badge tone={reportStatusTone(selectedReport.status)}>
                      {reportStatusLabel(selectedReport.status)}
                    </Badge>
                  </div>
                  <div className="info-row">
                    <span>Loại vi phạm tố cáo</span>
                    <Badge tone={selectedReport.violationType === "Fraud" ? "red" : "slate"}>
                      {reportViolationTypeLabel(selectedReport.violationType)}
                    </Badge>
                  </div>
                  <div className="info-row">
                    <span>Người gửi báo cáo (Reporter)</span>
                    <code>{selectedReport.reporterId}</code>
                  </div>
                  <div className="info-row">
                    <span>Đối tượng bị tố cáo</span>
                    <div>
                      <code>{selectedReport.reportedUserId}</code>
                      <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--muted)" }}>
                        (Vai trò: {selectedReport.targetRole})
                      </span>
                    </div>
                  </div>
                  {selectedReport.referenceType && (
                    <div className="info-row">
                      <span>Đối tượng liên quan</span>
                      <strong>
                        {selectedReport.referenceType}: {selectedReport.referenceId || "—"}
                      </strong>
                    </div>
                  )}
                  <div className="info-row">
                    <span>Thời gian gửi</span>
                    <strong>{new Date(selectedReport.createdAt).toLocaleString("vi-VN")}</strong>
                  </div>

                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", marginTop: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                      Mô tả nội dung vi phạm:
                    </span>
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                        lineHeight: "1.6",
                        color: "var(--ink)",
                      }}
                    >
                      {selectedReport.description}
                    </div>
                  </div>

                  {Boolean(selectedReport.evidenceUrls?.length) && (
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", marginTop: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                        Bằng chứng đính kèm ({selectedReport.evidenceUrls.length}):
                      </span>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px" }}>
                        {selectedReport.evidenceUrls.map((url, idx) => (
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

                  {/* Resolution history if processed */}
                  {isResolvedOrRejected && (
                    <div
                      style={{
                        borderTop: "1px solid var(--line)",
                        paddingTop: "12px",
                        marginTop: "4px",
                        background: String(selectedReport.status).toLowerCase() === "resolved" ? "#f0fdf4" : "#f8fafc",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${String(selectedReport.status).toLowerCase() === "resolved" ? "#bbf7d0" : "#e2e8f0"}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: String(selectedReport.status).toLowerCase() === "resolved" ? "#166534" : "var(--muted)",
                          display: "block",
                          marginBottom: "6px",
                        }}
                      >
                        Kết quả giải quyết:
                      </span>
                      {selectedReport.resolvedAt && (
                        <div className="info-row">
                          <span>Thời điểm giải quyết</span>
                          <strong>{new Date(selectedReport.resolvedAt).toLocaleString("vi-VN")}</strong>
                        </div>
                      )}
                      {selectedReport.resolvedBy && (
                        <div className="info-row">
                          <span>Người xử lý</span>
                          <small>{selectedReport.resolvedBy}</small>
                        </div>
                      )}
                      {selectedReport.resolutionNote && (
                        <div className="info-row">
                          <span>Ghi chú xử lý</span>
                          <strong>{selectedReport.resolutionNote}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons for Pending / UnderReview */}
                {isPending && !actionType && (
                  <div
                    className="action-row"
                    style={{ borderTop: "1px solid var(--line)", paddingTop: "14px" }}
                  >
                    <button
                      type="button"
                      className="button button-primary button-small"
                      disabled={busy}
                      onClick={() => {
                        setActionType("resolve");
                        setError(null);
                      }}
                      style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                    >
                      Áp dụng chế tài (Resolve)
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      disabled={busy}
                      onClick={() => {
                        setActionType("dismiss");
                        setError(null);
                      }}
                    >
                      Bác bỏ báo cáo (Dismiss)
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

                {/* Dismiss Form */}
                {actionType === "dismiss" && (
                  <form
                    className="auth-fields"
                    onSubmit={submitDismiss}
                    style={{ borderTop: "1px solid var(--line)", paddingTop: "14px", marginTop: "14px" }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "13px",
                        color: "var(--muted)",
                      }}
                    >
                      Bác bỏ báo cáo khi bằng chứng không đủ xác thực hoặc hành vi không cấu thành vi phạm quy chế sàn.
                    </div>

                    <label className="field-wrap">
                      Lý do bác bỏ (tối thiểu 10 ký tự) <span style={{ color: "var(--red)" }}>*</span>
                      <textarea
                        className="textarea-field"
                        required
                        maxLength={2000}
                        placeholder="Ví dụ: Báo cáo không kèm bằng chứng xác thực, lịch sử giao dịch diễn ra bình thường..."
                        value={dismissNote}
                        onChange={(e) => setDismissNote(e.target.value)}
                      />
                    </label>

                    <div className="action-row">
                      <button
                        className="button button-danger"
                        disabled={busy || dismissNote.trim().length < 10}
                      >
                        {busy ? "Đang xử lý…" : "Xác nhận bác bỏ báo cáo"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => setActionType(null)}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}

                {/* Resolve Form */}
                {actionType === "resolve" && (
                  <form
                    className="auth-fields"
                    onSubmit={submitResolve}
                    style={{ borderTop: "1px solid var(--line)", paddingTop: "14px", marginTop: "14px" }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "#f0fdf4",
                        borderRadius: "8px",
                        border: "1px solid #bbf7d0",
                        fontSize: "13px",
                        color: "#166534",
                      }}
                    >
                      Chọn các biện pháp chế tài tương xứng với mức độ vi phạm. Hệ thống sẽ tự động trừ điểm uy tín hoặc đình chỉ hoạt động.
                    </div>

                    <div className="form-grid">
                      <label className="field-wrap">
                        Đối tượng áp dụng
                        <select
                          className="select-field"
                          value={resolveForm.targetRole}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              targetRole: e.target.value as "Account" | "Buyer" | "Seller",
                            }))
                          }
                        >
                          <option value="Account">Account (Toàn diện)</option>
                          <option value="Buyer">Buyer (Người mua)</option>
                          <option value="Seller">Seller (Người bán / Shop)</option>
                        </select>
                      </label>

                      <label className="field-wrap">
                        Hình thức kỷ luật chính
                        <select
                          className="select-field"
                          value={resolveForm.penaltyApplied}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              penaltyApplied: e.target.value as
                                | "Warning"
                                | "DeductPoints"
                                | "Restriction"
                                | "BanAccount"
                                | "Other",
                            }))
                          }
                        >
                          <option value="DeductPoints">Trừ điểm uy tín</option>
                          <option value="Restriction">Đình chỉ quyền hạn</option>
                          <option value="Warning">Cảnh cáo bằng văn bản</option>
                          <option value="BanAccount">Khóa vĩnh viễn</option>
                          <option value="Other">Hình thức khác</option>
                        </select>
                      </label>
                    </div>

                    <div className="form-grid">
                      <label className="field-wrap">
                        Số điểm uy tín trừ (0 - 50)
                        <input
                          type="number"
                          className="field"
                          min={0}
                          max={50}
                          value={resolveForm.scoreDeduction}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              scoreDeduction: Number(e.target.value),
                            }))
                          }
                        />
                      </label>

                      <label className="field-wrap">
                        Thời hạn áp dụng (ngày)
                        <select
                          className="select-field"
                          value={resolveForm.durationDays}
                          onChange={(e) =>
                            setResolveForm((prev) => ({ ...prev, durationDays: e.target.value }))
                          }
                        >
                          <option value="3">3 ngày</option>
                          <option value="7">7 ngày</option>
                          <option value="14">14 ngày</option>
                          <option value="30">30 ngày</option>
                          <option value="">Vô thời hạn</option>
                        </select>
                      </label>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "4px 0" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={resolveForm.suspendSellerShop}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              suspendSellerShop: e.target.checked,
                            }))
                          }
                        />
                        <span>Tạm đình chỉ quyền bán hàng của Shop (nếu là Seller)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", color: "#dc2626" }}>
                        <input
                          type="checkbox"
                          checked={resolveForm.banAccount}
                          onChange={(e) =>
                            setResolveForm((prev) => ({ ...prev, banAccount: e.target.checked }))
                          }
                        />
                        <strong>Khóa tài khoản toàn diện (Ban Account)</strong>
                      </label>
                    </div>

                    <label className="field-wrap">
                      Mã điều khoản quy định vi phạm (tùy chọn)
                      <input
                        type="text"
                        className="field"
                        maxLength={100}
                        placeholder="Ví dụ: CLAUSE_2_COUNTERFEIT_GOODS"
                        value={resolveForm.policyClauseCode}
                        onChange={(e) =>
                          setResolveForm((prev) => ({
                            ...prev,
                            policyClauseCode: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="field-wrap">
                      Quyết định xử lý & Căn cứ chế tài (tối thiểu 10 ký tự) <span style={{ color: "var(--red)" }}>*</span>
                      <textarea
                        className="textarea-field"
                        required
                        maxLength={2000}
                        placeholder="Ghi rõ nội dung kết luận vi phạm và căn cứ áp dụng chế tài..."
                        value={resolveForm.resolutionNote}
                        onChange={(e) =>
                          setResolveForm((prev) => ({
                            ...prev,
                            resolutionNote: e.target.value,
                          }))
                        }
                      />
                    </label>

                    <div className="action-row">
                      <button
                        className="button button-primary"
                        disabled={busy || resolveForm.resolutionNote.trim().length < 10}
                        style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                      >
                        {busy ? "Đang xử lý…" : "Xác nhận ban hành quyết định"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => setActionType(null)}
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
