"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Badge, Card, PageHeading } from "@/components/ui/Primitives";
import { CopyableId } from "@/components/ui/CopyableId";
import { ApiError } from "@/lib/api/client";
import {
  adminLedgerService,
  type ProcessWithdrawalResponse,
} from "@/features/admin/services/admin-ledger.service";
import { extractAdminError } from "@/features/admin/services/admin-helpers";

type ProcessedItem = {
  withdrawalId: string;
  action: "Approve" | "Reject";
  adminNote?: string;
  processedAt: string;
  status: string;
};

export function StaffWithdrawalsScreen() {
  const [withdrawalId, setWithdrawalId] = useState("");
  const [action, setAction] = useState<"Approve" | "Reject">("Approve");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; traceId?: string } | null>(null);
  const [success, setSuccess] = useState<string>("");
  const [history, setHistory] = useState<ProcessedItem[]>([]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedId = withdrawalId.trim();

    if (!trimmedId) {
      setError({ message: "Vui lòng nhập mã yêu cầu rút tiền." });
      return;
    }

    if (action === "Reject" && !adminNote.trim()) {
      setError({ message: "Vui lòng nhập lý do từ chối để thông báo cho người dùng." });
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess("");

    try {
      const result: ProcessWithdrawalResponse = await adminLedgerService.processWithdrawal(trimmedId, {
        action,
        adminNote: adminNote.trim() || undefined,
      });

      const message =
        action === "Approve"
          ? `Đã duyệt giải ngân cho lệnh ${trimmedId.slice(0, 8)}… thành công.`
          : `Đã từ chối lệnh ${trimmedId.slice(0, 8)}… và hoàn tiền lại vào ví.`;

      setSuccess(message);
      setHistory((prev) => [
        {
          withdrawalId: trimmedId,
          action,
          adminNote: adminNote.trim() || undefined,
          processedAt: result.processedAt || new Date().toISOString(),
          status: result.status,
        },
        ...prev,
      ]);

      setWithdrawalId("");
      setAdminNote("");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError({ message: cause.message, traceId: cause.traceId });
      } else {
        setError(extractAdminError(cause, "Không thể xử lý yêu cầu rút tiền."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Duyệt rút tiền ví"
        description="Thẩm định và xác nhận chuyển khoản giải ngân hoặc từ chối hoàn trả số dư."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Khung xử lý rút tiền */}
        <Card className="card-pad" style={{ borderRadius: "10px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px 0" }}>
            Xử lý yêu cầu rút tiền
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 20px 0" }}>
            Nhập mã yêu cầu cần đối soát từ thông báo để thực hiện quyết định.
          </p>

          {error && (
            <div role="alert" className="notice" style={{ marginBottom: "16px" }}>
              <p style={{ margin: 0 }}>{error.message}</p>
              {error.traceId && (
                <small style={{ display: "block", marginTop: "4px", color: "var(--muted)" }}>
                  Mã lỗi: {error.traceId}
                </small>
              )}
            </div>
          )}

          {success && (
            <div role="status" className="form-success" style={{ marginBottom: "16px" }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Mã yêu cầu rút tiền */}
            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="withdrawal-id"
                style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}
              >
                Mã yêu cầu rút tiền <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                id="withdrawal-id"
                className="field"
                placeholder="Ví dụ: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                value={withdrawalId}
                onChange={(e) => setWithdrawalId(e.target.value)}
                required
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  padding: "10px 12px",
                }}
              />
            </div>

            {/* Quyết định: 2 nút bấm gọn gàng */}
            <div style={{ marginBottom: "18px" }}>
              <span style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Quyết định xử lý <span style={{ color: "var(--red)" }}>*</span>
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setAction("Approve")}
                  style={{
                    height: "42px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "2px solid",
                    borderColor: action === "Approve" ? "#16a34a" : "var(--border)",
                    background: action === "Approve" ? "#f0fdf4" : "var(--surface)",
                    color: action === "Approve" ? "#15803d" : "var(--muted)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "center",
                    boxSizing: "border-box",
                    transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease",
                  }}
                >
                  Phê duyệt giải ngân
                </button>

                <button
                  type="button"
                  onClick={() => setAction("Reject")}
                  style={{
                    height: "42px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "2px solid",
                    borderColor: action === "Reject" ? "#dc2626" : "var(--border)",
                    background: action === "Reject" ? "#fef2f2" : "var(--surface)",
                    color: action === "Reject" ? "#b91c1c" : "var(--muted)",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "center",
                    boxSizing: "border-box",
                    transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease",
                  }}
                >
                  Từ chối & hoàn tiền
                </button>
              </div>
            </div>

            {/* Ghi chú hoặc Lý do */}
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="admin-note"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "6px",
                  lineHeight: "20px",
                }}
              >
                <span>
                  {action === "Reject" ? "Lý do từ chối" : "Ghi chú đối soát"}{" "}
                  <span style={{ color: action === "Reject" ? "var(--red)" : "var(--muted)", fontWeight: 400 }}>
                    {action === "Reject" ? "* (Bắt buộc)" : "(Tùy chọn)"}
                  </span>
                </span>
              </label>
              <textarea
                id="admin-note"
                className="textarea-field"
                rows={2}
                placeholder={
                  action === "Reject"
                    ? "Nhập lý do từ chối (sai tên chủ tài khoản, số tài khoản không đúng...)"
                    : "Mã chuyển khoản hoặc ghi chú đối soát..."
                }
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                required={action === "Reject"}
                style={{ width: "100%", fontSize: "13px", padding: "10px 12px" }}
              />
            </div>

            {/* Nút hành động */}
            <button
              type="submit"
              className="button"
              disabled={busy || !withdrawalId.trim() || (action === "Reject" && !adminNote.trim())}
              style={{
                width: "100%",
                padding: "11px",
                fontSize: "14px",
                fontWeight: 600,
                backgroundColor: action === "Approve" ? "#16a34a" : "#dc2626",
                borderColor: action === "Approve" ? "#16a34a" : "#dc2626",
                color: "#ffffff",
                cursor: busy || !withdrawalId.trim() || (action === "Reject" && !adminNote.trim()) ? "not-allowed" : "pointer",
              }}
            >
              {busy
                ? "Đang xử lý…"
                : action === "Approve"
                ? "Xác nhận duyệt giải ngân"
                : "Xác nhận từ chối yêu cầu"}
            </button>
          </form>
        </Card>

        {/* Khung nhật ký trong phiên */}
        <Card className="card-pad" style={{ borderRadius: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                Nhật ký xử lý trong phiên
              </h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
                Các yêu cầu đã thao tác trong phiên làm việc hiện tại.
              </p>
            </div>
            {history.length > 0 && (
              <Badge tone="slate">{history.length} lệnh</Badge>
            )}
          </div>

          {history.length === 0 ? (
            <div
              style={{
                padding: "48px 16px",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "13px",
              }}
            >
              Chưa có lệnh rút tiền nào được xử lý trong phiên này.
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40%", padding: "8px 10px" }}>Mã yêu cầu</th>
                    <th style={{ width: "30%", padding: "8px 10px" }}>Quyết định</th>
                    <th style={{ width: "30%", padding: "8px 10px", textAlign: "right" }}>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => (
                    <tr key={`${item.withdrawalId}-${idx}`}>
                      <td style={{ padding: "8px 10px", wordBreak: "break-all" }}>
                        <CopyableId id={item.withdrawalId} />
                        {item.adminNote && (
                          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                            {item.adminNote}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Badge tone={item.action === "Approve" ? "green" : "red"}>
                          {item.action === "Approve" ? "Đã duyệt" : "Từ chối"}
                        </Badge>
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: "12px", color: "var(--muted)", textAlign: "right" }}>
                        {new Date(item.processedAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
