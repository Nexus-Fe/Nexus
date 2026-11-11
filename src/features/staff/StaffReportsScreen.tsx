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
} from "@/features/admin/services/admin-reports.service";
import { extractAdminError } from "@/features/admin/services/admin-helpers";

type ActionType = "resolve" | "dismiss" | "hideReview" | null;

function normalizeTargetRole(role?: string): "Account" | "Buyer" | "Seller" {
  const r = (role ?? "").toLowerCase();
  if (r === "seller") return "Seller";
  if (r === "buyer") return "Buyer";
  return "Account";
}

export function StaffReportsScreen() {
  const [status, setStatus] = useState("");
  const [violationType, setViolationType] = useState("");
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<AdminReportItem | null>(null);

  // Actions
  const [actionType, setActionType] = useState<ActionType>(null);
  const [dismissNote, setDismissNote] = useState("");
  const [reviewIdToHide, setReviewIdToHide] = useState("");
  const [hideReviewReason, setHideReviewReason] = useState("");
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
    `staff-reports:${page}:${status}:${violationType}`,
    (signal) => adminReportsService.list(query, signal),
  );

  const records = reports.data?.items ?? [];

  function handleError(cause: unknown, fallback: string) {
    if (cause instanceof ApiError) {
      setError({ message: cause.message, traceId: cause.traceId });
    } else {
      setError(extractAdminError(cause, fallback));
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

  async function submitHideReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = reviewIdToHide.trim();
    const r = hideReviewReason.trim();
    if (!id) {
      setError({ message: "Vui lòng nhập mã đánh giá." });
      return;
    }
    if (!r) {
      setError({ message: "Vui lòng nhập lý do ẩn đánh giá." });
      return;
    }

    setBusy(true);
    setError(null);
    setSaved("");
    try {
      await adminReportsService.hideReview(id, r);
      setSaved("Đã ẩn đánh giá vi phạm thành công.");
      setActionType(null);
    } catch (cause) {
      handleError(cause, "Không thể ẩn đánh giá vi phạm.");
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

    setBusy(true);
    setError(null);
    setSaved("");

    const payload: ResolveReportPayload = {
      targetRole: resolveForm.targetRole,
      penaltyApplied: resolveForm.banAccount
        ? "BanAccount"
        : resolveForm.penaltyApplied,
      scoreDeduction: score,
      banAccount: resolveForm.banAccount,
      suspendSellerShop: resolveForm.suspendSellerShop,
      durationDays: resolveForm.durationDays ? Number(resolveForm.durationDays) : null,
      policyClauseCode: resolveForm.policyClauseCode.trim() || undefined,
      resolutionNote: resolveForm.resolutionNote.trim(),
    };

    try {
      await adminReportsService.resolve(selectedReport.reportId, payload);
      setSaved("Đã ban hành quyết định xử lý báo cáo vi phạm thành công.");
      setActionType(null);
      reports.reload();
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
      handleError(cause, "Không thể xử lý báo cáo vi phạm.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Nghiệp vụ Vận hành (Staff)"
        title="Khiếu nại & Vi phạm"
        description="Tiếp nhận, kiểm tra chứng cứ và ban hành quyết định xử lý báo cáo vi phạm từ người dùng sàn."
      />

      <Card>
        <div className="toolbar">
          <label className="field-wrap">
            Trạng thái xử lý
            <select
              className="select-field"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Chờ xử lý</option>
              <option value="UnderReview">Đang xem xét</option>
              <option value="Resolved">Đã giải quyết</option>
              <option value="Rejected">Đã bác bỏ</option>
            </select>
          </label>

          <label className="field-wrap">
            Loại vi phạm
            <select
              className="select-field"
              value={violationType}
              onChange={(e) => {
                setViolationType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả loại vi phạm</option>
              <option value="Fraud">Gian lận / Lừa đảo</option>
              <option value="Harassment">Quấy rối / Xúc phạm</option>
              <option value="Counterfeit">Hàng giả / Vi phạm</option>
              <option value="Spam">Spam / Tin rác</option>
              <option value="Other">Khác</option>
            </select>
          </label>
        </div>

        {reports.error && (
          <p role="alert" className="notice">
            {reports.error instanceof ApiError
              ? reports.error.message
              : "Không thể tải danh sách báo cáo vi phạm."}
          </p>
        )}

        {reports.loading ? (
          <NoData title="Đang nạp danh sách báo cáo…" />
        ) : records.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "18%", padding: "12px 10px" }}>Mã báo cáo</th>
                  <th style={{ width: "22%", padding: "12px 10px" }}>Loại vi phạm</th>
                  <th style={{ width: "15%", padding: "12px 10px" }}>Đối tượng</th>
                  <th style={{ width: "15%", padding: "12px 10px" }}>Trạng thái</th>
                  <th style={{ width: "18%", padding: "12px 10px" }}>Thời gian gửi</th>
                  <th style={{ width: "100px", padding: "12px 10px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => {
                  const d = new Date(item.createdAt);
                  const validDate = Number.isFinite(d.getTime());
                  const time = validDate ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
                  const date = validDate ? d.toLocaleDateString("vi-VN") : "—";
                  return (
                    <tr key={item.reportId}>
                      <td style={{ padding: "12px 10px", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                        <code>{item.reportId.slice(0, 8)}…</code>
                      </td>
                      <td style={{ padding: "12px 10px", wordBreak: "break-word" }}>
                        <strong>{reportViolationTypeLabel(item.violationType)}</strong>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <Badge tone={item.targetRole === "Seller" ? "amber" : "sky"}>
                          {item.targetRole}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <Badge tone={reportStatusTone(item.status)}>
                          {reportStatusLabel(item.status)}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", lineHeight: 1.25 }}>
                          <strong style={{ fontSize: "13px", fontWeight: 600 }}>{time}</strong>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>{date}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => openDetail(item)}
                        >
                          Xem & Xử lý
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData title="Không tìm thấy báo cáo nào phù hợp điều kiện lọc." />
        )}

        <AdminPagination
          page={reports.data?.page ?? page}
          pageSize={reports.data?.pageSize ?? 20}
          totalItems={reports.data?.total ?? 0}
          onPageChange={setPage}
          loading={reports.loading}
        />
      </Card>

      {/* Modal chi tiết & xử lý báo cáo */}
      {selectedReport && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          <section className="admin-modal" style={{ maxWidth: "700px" }}>
            <div className="admin-modal-heading">
              <div>
                <h2 id="report-modal-title">Chi tiết báo cáo vi phạm</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Mã báo cáo: <code>{selectedReport.reportId}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeDetail}
                disabled={busy}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            {saved && (
              <p role="status" className="form-success">
                {saved}
              </p>
            )}

            {error && (
              <div role="alert" className="notice">
                <p>{error.message}</p>
              </div>
            )}

            <div className="grid-2" style={{ gap: "12px", marginBottom: "16px" }}>
              <div className="info-row">
                <span>Người gửi báo cáo (Reporter):</span>
                <code>{selectedReport.reporterId}</code>
              </div>
              <div className="info-row">
                <span>Người bị báo cáo (Reported):</span>
                <code>{selectedReport.reportedUserId}</code>
              </div>
              <div className="info-row">
                <span>Phân loại vi phạm:</span>
                <strong>{reportViolationTypeLabel(selectedReport.violationType)}</strong>
              </div>
              <div className="info-row">
                <span>Trạng thái hiện tại:</span>
                <Badge tone={reportStatusTone(selectedReport.status)}>
                  {reportStatusLabel(selectedReport.status)}
                </Badge>
              </div>
              {selectedReport.referenceId && (
                <div className="info-row" style={{ gridColumn: "span 2" }}>
                  <span>Tham chiếu liên quan ({selectedReport.referenceType || "Đối tượng"}):</span>
                  <code>{selectedReport.referenceId}</code>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Nội dung mô tả từ người tố cáo:
              </span>
              <p style={{ margin: "6px 0 0", padding: "10px", background: "var(--bg-subtle, #f8fafc)", borderRadius: "6px", fontSize: "14px", lineHeight: "1.5" }}>
                {selectedReport.description}
              </p>
            </div>

            {selectedReport.evidenceUrls && selectedReport.evidenceUrls.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                  Bằng chứng đính kèm ({selectedReport.evidenceUrls.length}):
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                  {selectedReport.evidenceUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="button button-secondary button-small"
                    >
                      Bằng chứng #{idx + 1} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}

            {selectedReport.resolutionNote && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                <strong style={{ display: "block", color: "#166534", marginBottom: "4px" }}>
                  Biên bản xử lý trước đó:
                </strong>
                <p style={{ margin: 0, fontSize: "13px", color: "#15803d" }}>
                  {selectedReport.resolutionNote}
                </p>
              </div>
            )}

            {/* Chỉ hiển thị các nút thao tác khi báo cáo chưa bị đóng */}
            {selectedReport.status !== "Resolved" && selectedReport.status !== "Rejected" && (
              <>
                {actionType === null && (
                  <div className="action-row" style={{ borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
                    <button
                      type="button"
                      className="button button-primary button-small"
                      onClick={() => setActionType("resolve")}
                      style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                    >
                      Ban hành quyết định xử lý
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() => setActionType("dismiss")}
                      style={{ color: "var(--red)" }}
                    >
                      Bác bỏ báo cáo
                    </button>
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() => {
                        setActionType("hideReview");
                        setReviewIdToHide(selectedReport.referenceId ?? "");
                        setHideReviewReason(selectedReport.description ?? "");
                      }}
                    >
                      Ẩn đánh giá vi phạm
                    </button>
                  </div>
                )}

                {/* Form Bác bỏ */}
                {actionType === "dismiss" && (
                  <form onSubmit={submitDismiss} style={{ borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
                    <h3 style={{ fontSize: "15px", marginBottom: "8px" }}>Bác bỏ báo cáo vi phạm</h3>
                    <label className="field-wrap">
                      Lý do bác bỏ (tối thiểu 10 ký tự) <span style={{ color: "var(--red)" }}>*</span>
                      <textarea
                        className="textarea-field"
                        required
                        maxLength={500}
                        placeholder="Nêu rõ lý do không tiếp nhận hoặc khiếu nại không đủ căn cứ xác thực..."
                        value={dismissNote}
                        onChange={(e) => setDismissNote(e.target.value)}
                      />
                    </label>
                    <div className="action-row">
                      <button
                        className="button button-primary"
                        disabled={busy || dismissNote.trim().length < 10}
                      >
                        {busy ? "Đang xử lý…" : "Xác nhận bác bỏ"}
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

                {/* Form Xử lý vi phạm */}
                {actionType === "resolve" && (
                  <form onSubmit={submitResolve} style={{ borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
                    <h3 style={{ fontSize: "15px", marginBottom: "8px", color: "#16a34a" }}>
                      Ban hành chế tài xử lý vi phạm
                    </h3>

                    <div className="grid-2" style={{ gap: "10px" }}>
                      <label className="field-wrap">
                        Đối tượng áp dụng chế tài
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
                          <option value="Account">Toàn bộ tài khoản</option>
                          <option value="Buyer">Tư cách Người mua (Buyer)</option>
                          <option value="Seller">Tư cách Gian hàng (Seller)</option>
                        </select>
                      </label>

                      <label className="field-wrap">
                        Biện pháp xử lý chính
                        <select
                          className="select-field"
                          value={resolveForm.penaltyApplied}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              penaltyApplied: e.target.value as "Warning" | "DeductPoints" | "Restriction" | "BanAccount" | "Other",
                            }))
                          }
                        >
                          <option value="Warning">Cảnh cáo nhắc nhở</option>
                          <option value="DeductPoints">Trừ điểm uy tín</option>
                          <option value="Restriction">Đình chỉ quyền bán hàng</option>
                          <option value="BanAccount">Khóa tài khoản</option>
                          <option value="Other">Hình thức khác</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid-2" style={{ gap: "10px" }}>
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
                              scoreDeduction: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </label>

                      <label className="field-wrap">
                        Thời hạn áp dụng (ngày)
                        <input
                          type="number"
                          className="field"
                          min={1}
                          max={365}
                          value={resolveForm.durationDays}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              durationDays: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "10px 0" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={resolveForm.suspendSellerShop}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              suspendSellerShop: e.target.checked,
                              penaltyApplied: e.target.checked ? "Restriction" : prev.penaltyApplied,
                            }))
                          }
                        />
                        <span>Tạm đình chỉ quyền bán hàng (nếu là người bán)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", color: "#dc2626" }}>
                        <input
                          type="checkbox"
                          checked={resolveForm.banAccount}
                          onChange={(e) =>
                            setResolveForm((prev) => ({
                              ...prev,
                              banAccount: e.target.checked,
                              penaltyApplied: e.target.checked ? "BanAccount" : prev.penaltyApplied === "BanAccount" ? "DeductPoints" : prev.penaltyApplied,
                            }))
                          }
                        />
                        <strong>Khóa tài khoản toàn diện</strong>
                      </label>
                    </div>

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

                {/* Form Ẩn đánh giá vi phạm */}
                {actionType === "hideReview" && (
                  <form onSubmit={submitHideReview} style={{ borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
                    <h3 style={{ fontSize: "15px", marginBottom: "8px" }}>Ẩn đánh giá vi phạm</h3>
                    <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "12px" }}>
                      Hành động này sẽ ẩn đánh giá khỏi giao diện công khai và tự động hoàn trả điểm uy tín cho người bị đánh giá tiêu cực.
                    </p>
                    <label className="field-wrap">
                      Mã đánh giá <span style={{ color: "var(--red)" }}>*</span>
                      <input
                        className="field"
                        required
                        value={reviewIdToHide}
                        onChange={(e) => setReviewIdToHide(e.target.value)}
                        placeholder="Mã định danh đánh giá..."
                      />
                    </label>
                    <label className="field-wrap">
                      Lý do ẩn đánh giá <span style={{ color: "var(--red)" }}>*</span>
                      <textarea
                        className="textarea-field"
                        required
                        value={hideReviewReason}
                        onChange={(e) => setHideReviewReason(e.target.value)}
                        placeholder="Nêu rõ lý do vi phạm (bôi nhọ, ngôn từ kích động, xúc phạm)..."
                      />
                    </label>
                    <div className="action-row">
                      <button
                        className="button button-primary"
                        disabled={busy || !reviewIdToHide.trim() || !hideReviewReason.trim()}
                      >
                        {busy ? "Đang xử lý…" : "Xác nhận ẩn đánh giá"}
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
