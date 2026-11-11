"use client";

import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/presentation";
import {
  adminLedgerService,
  type ProcessWithdrawalResponse,
  type BalanceAdjustmentResponse,
} from "./services/admin-ledger.service";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminLedgerScreen() {
  const [activeTab, setActiveTab] = useState<"withdrawals" | "adjustments">("withdrawals");

  // Withdrawal approval state
  const [withdrawalId, setWithdrawalId] = useState("");
  const [withdrawalAction, setWithdrawalAction] = useState<"Approve" | "Reject">("Approve");
  const [adminNote, setAdminNote] = useState("");
  const [withdrawalBusy, setWithdrawalBusy] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<{ message: string; traceId?: string } | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState("");
  const [withdrawalHistory, setWithdrawalHistory] = useState<ProcessWithdrawalResponse[]>([]);

  // Wallet balance adjustment state
  const [walletId, setWalletId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"Credit" | "Debit">("Credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustError, setAdjustError] = useState<{ message: string; traceId?: string } | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState("");
  const [adjustHistory, setAdjustHistory] = useState<
    Array<BalanceAdjustmentResponse & { adjustmentType: "Credit" | "Debit"; reason: string }>
  >([]);

  const [copiedTrace, setCopiedTrace] = useState(false);

  async function copyTraceId(traceId: string) {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 2000);
    } catch {
      // Ignore
    }
  }

  async function handleProcessWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedId = withdrawalId.trim();
    if (!UUID_REGEX.test(trimmedId)) {
      setWithdrawalError({ message: "Mã yêu cầu rút tiền phải đúng định dạng UUID." });
      return;
    }

    if (withdrawalAction === "Reject" && !adminNote.trim()) {
      setWithdrawalError({ message: "Vui lòng nhập lý do từ chối để thông báo cho người dùng." });
      return;
    }

    setWithdrawalBusy(true);
    setWithdrawalError(null);
    setWithdrawalSuccess("");
    try {
      const result = await adminLedgerService.processWithdrawal(trimmedId, {
        action: withdrawalAction,
        adminNote: adminNote.trim() || undefined,
      });
      setWithdrawalHistory((prev) => [result, ...prev]);
      setWithdrawalSuccess(
        `Đã xử lý yêu cầu rút tiền ${result.withdrawalId.slice(0, 8)}… với trạng thái: ${result.status}.`,
      );
      setWithdrawalId("");
      setAdminNote("");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setWithdrawalError({ message: cause.message, traceId: cause.traceId });
      } else {
        setWithdrawalError({
          message: cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu rút tiền.",
        });
      }
    } finally {
      setWithdrawalBusy(false);
    }
  }

  async function handleAdjustBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedWalletId = walletId.trim();
    if (!UUID_REGEX.test(trimmedWalletId)) {
      setAdjustError({ message: "Mã ví điện tử phải đúng định dạng UUID." });
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAdjustError({ message: "Số tiền điều chỉnh phải là số dương lớn hơn 0." });
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setAdjustError({ message: "Vui lòng nhập lý do hoặc căn cứ đối soát để ghi nhận vào sổ cái." });
      return;
    }

    setAdjustBusy(true);
    setAdjustError(null);
    setAdjustSuccess("");
    try {
      const result = await adminLedgerService.adjustBalance(trimmedWalletId, {
        amount: parsedAmount,
        adjustmentType,
        reason: trimmedReason,
      });
      setAdjustHistory((prev) => [
        {
          ...result,
          adjustmentType,
          reason: trimmedReason,
        },
        ...prev,
      ]);
      setAdjustSuccess(
        `Đã thực thi bút toán điều chỉnh cho ví ${result.walletId}. Số dư mới: ${formatMoney(result.balanceAfter)}.`,
      );
      setWalletId("");
      setAmount("");
      setReason("");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setAdjustError({ message: cause.message, traceId: cause.traceId });
      } else {
        setAdjustError({
          message: cause instanceof Error ? cause.message : "Không thể thực hiện bút toán điều chỉnh ví.",
        });
      }
    } finally {
      setAdjustBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Quản trị hệ thống"
        title="Sổ cái & Nghiệp vụ ví"
        description="Phê duyệt các yêu cầu rút tiền và thực hiện các bút toán điều chỉnh số dư ví khi có sự cố đối soát."
      />

      {/* Tabs chuyển đổi giữa Duyệt rút tiền và Điều chỉnh số dư */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("withdrawals")}
          className={`button ${activeTab === "withdrawals" ? "button-primary" : "button-secondary"}`}
          style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600 }}
        >
          Duyệt yêu cầu rút tiền
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("adjustments")}
          className={`button ${activeTab === "adjustments" ? "button-primary" : "button-secondary"}`}
          style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600 }}
        >
          Điều chỉnh số dư ví (Bút toán can thiệp)
        </button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        {activeTab === "withdrawals" ? (
          <Card className="card-pad">
            <SectionHeading
              title="Phê duyệt lệnh rút tiền ví"
              hint="Xác nhận chuyển khoản giải ngân hoặc từ chối hoàn tiền về số dư khả dụng"
            />

            {withdrawalError && (
              <div role="alert" className="notice">
                <p>{withdrawalError.message}</p>
                {withdrawalError.traceId && (
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void copyTraceId(withdrawalError.traceId!)}
                  >
                    {copiedTrace ? "Đã sao chép Trace ID" : `Copy Trace ID: ${withdrawalError.traceId}`}
                  </button>
                )}
              </div>
            )}

            {withdrawalSuccess && (
              <p role="status" className="form-success">
                {withdrawalSuccess}
              </p>
            )}

            <form className="auth-fields" onSubmit={(e) => void handleProcessWithdrawal(e)}>
              <label className="field-wrap">
                <span>Mã yêu cầu rút tiền (Withdrawal ID) <span style={{ color: "var(--red)" }}>*</span></span>
                <input
                  className="field"
                  required
                  placeholder="Ví dụ: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  value={withdrawalId}
                  onChange={(e) => setWithdrawalId(e.target.value)}
                  style={{ fontFamily: "monospace" }}
                />
                <span style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                  Lưu ý: Nhập mã phiếu rút tiền từ thông báo đối soát của hệ thống (không phải mã User ID).
                </span>
              </label>

              {/* 2 nút chọn quyết định nhanh */}
              <div style={{ marginBottom: "14px" }}>
                <span style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Quyết định xử lý <span style={{ color: "var(--red)" }}>*</span>
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setWithdrawalAction("Approve")}
                    style={{
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "8px",
                      border: "2px solid",
                      borderColor: withdrawalAction === "Approve" ? "#16a34a" : "var(--border)",
                      background: withdrawalAction === "Approve" ? "#f0fdf4" : "var(--surface)",
                      color: withdrawalAction === "Approve" ? "#15803d" : "var(--muted)",
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
                    onClick={() => setWithdrawalAction("Reject")}
                    style={{
                      height: "42px",
                      padding: "0 14px",
                      borderRadius: "8px",
                      border: "2px solid",
                      borderColor: withdrawalAction === "Reject" ? "#dc2626" : "var(--border)",
                      background: withdrawalAction === "Reject" ? "#fef2f2" : "var(--surface)",
                      color: withdrawalAction === "Reject" ? "#b91c1c" : "var(--muted)",
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

              <label className="field-wrap">
                <span>
                  {withdrawalAction === "Reject" ? (
                    <>Lý do từ chối <span style={{ color: "var(--red)" }}>* (Bắt buộc)</span></>
                  ) : (
                    "Ghi chú đối soát / Mã tham chiếu ngân hàng (Tùy chọn)"
                  )}
                </span>
                <textarea
                  className="textarea-field"
                  rows={2}
                  required={withdrawalAction === "Reject"}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    withdrawalAction === "Reject"
                      ? "Nêu rõ lý do từ chối (ví dụ: Tên tài khoản ngân hàng không khớp hồ sơ KYC)..."
                      : "Nhập mã tham chiếu đối soát hoặc biên lai chuyển khoản..."
                  }
                />
              </label>

              <div className="action-row" style={{ marginTop: 16 }}>
                <button
                  type="submit"
                  className="button"
                  disabled={withdrawalBusy || !withdrawalId.trim() || (withdrawalAction === "Reject" && !adminNote.trim())}
                  style={{
                    backgroundColor: withdrawalAction === "Approve" ? "#16a34a" : "#dc2626",
                    borderColor: withdrawalAction === "Approve" ? "#16a34a" : "#dc2626",
                    color: "#ffffff",
                    fontWeight: 600,
                  }}
                >
                  {withdrawalBusy
                    ? "Đang xử lý…"
                    : withdrawalAction === "Approve"
                    ? "Xác nhận duyệt giải ngân"
                    : "Xác nhận từ chối yêu cầu"}
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <Card className="card-pad">
            <SectionHeading
              title="Điều chỉnh số dư ví điện tử (Bút toán can thiệp)"
              hint="Tăng hoặc giảm số dư ví kèm căn cứ đối soát minh bạch vào sổ cái"
            />

            {adjustError && (
              <div role="alert" className="notice">
                <p>{adjustError.message}</p>
                {adjustError.traceId && (
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void copyTraceId(adjustError.traceId!)}
                  >
                    {copiedTrace ? "Đã sao chép Trace ID" : `Copy Trace ID: ${adjustError.traceId}`}
                  </button>
                )}
              </div>
            )}

            {adjustSuccess && (
              <p role="status" className="form-success">
                {adjustSuccess}
              </p>
            )}

            <form className="auth-fields" onSubmit={(e) => void handleAdjustBalance(e)}>
              <label className="field-wrap">
                <span>Mã ví điện tử (Wallet ID) <span style={{ color: "var(--red)" }}>*</span></span>
                <input
                  className="field"
                  required
                  placeholder="Ví dụ: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  style={{ fontFamily: "monospace" }}
                />
              </label>

              <div className="split" style={{ gap: "16px" }}>
                <label className="field-wrap">
                  <span>Loại bút toán can thiệp <span style={{ color: "var(--red)" }}>*</span></span>
                  <select
                    className="select-field"
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as "Credit" | "Debit")}
                  >
                    <option value="Credit">+ Cộng tiền vào ví (Hoàn tiền / Điều chỉnh tăng)</option>
                    <option value="Debit">- Trừ tiền khỏi ví (Thu hồi / Điều chỉnh giảm)</option>
                  </select>
                </label>

                <label className="field-wrap">
                  <span>Số tiền điều chỉnh (VNĐ) <span style={{ color: "var(--red)" }}>*</span></span>
                  <input
                    className="field"
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="Ví dụ: 500000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
              </div>

              <label className="field-wrap">
                <span>Lý do đối soát / Căn cứ biên bản điều chỉnh <span style={{ color: "var(--red)" }}>*</span></span>
                <textarea
                  className="textarea-field"
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập biên bản đối soát hoặc lý do ghi nhận bút toán điều chỉnh số dư..."
                />
              </label>

              <div className="action-row" style={{ marginTop: 16 }}>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={adjustBusy || !walletId.trim() || !amount.trim() || !reason.trim()}
                >
                  {adjustBusy ? "Đang ghi sổ cái…" : "Thực thi bút toán điều chỉnh"}
                </button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <SectionHeading
        title="Nhật ký các thao tác vừa thực thi trong phiên"
        hint="Lịch sử các quyết định duyệt rút tiền hoặc điều chỉnh số dư vừa thao tác"
      />
      <Card>
        {withdrawalHistory.length > 0 || adjustHistory.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Loại nghiệp vụ</th>
                  <th style={{ width: "24%" }}>Mã giao dịch / Bút toán</th>
                  <th style={{ width: "22%" }}>Mã đối tượng</th>
                  <th style={{ width: "18%" }}>Chi tiết thay đổi</th>
                  <th style={{ width: "16%", textAlign: "right" }}>Thời điểm thực thi</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalHistory.map((w) => (
                  <tr key={`w-${w.withdrawalId}-${w.processedAt}`}>
                    <td>
                      <Badge tone={w.status === "Approved" ? "green" : "red"}>
                        {w.status === "Approved" ? "Duyệt rút tiền" : "Từ chối rút tiền"}
                      </Badge>
                    </td>
                    <td>
                      <code>{w.transactionId ?? "—"}</code>
                    </td>
                    <td>
                      <code>{w.withdrawalId}</code>
                    </td>
                    <td>
                      Trạng thái: <strong>{w.status}</strong>
                    </td>
                    <td>{new Date(w.processedAt).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
                {adjustHistory.map((a) => (
                  <tr key={`a-${a.adjustmentId}`}>
                    <td>
                      <Badge tone={a.adjustmentType === "Credit" ? "green" : "amber"}>
                        {a.adjustmentType === "Credit" ? "+ Cộng tiền" : "- Trừ tiền"}
                      </Badge>
                    </td>
                    <td>
                      <code>{a.adjustmentId}</code>
                    </td>
                    <td>
                      <code>{a.walletId}</code>
                    </td>
                    <td>
                      Số dư sau điều chỉnh: <strong>{formatMoney(a.balanceAfter)}</strong>
                    </td>
                    <td>{new Date(a.createdAt).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData title="Chưa có bút toán đối soát hoặc xử lý rút tiền nào được thực hiện trong phiên này" />
        )}
      </Card>
    </>
  );
}
