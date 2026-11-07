"use client";

import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError, api, unwrap, type ApiResponse } from "@/lib/api/client";
import { formatMoney } from "@/lib/presentation";

type ProcessWithdrawalResponse = {
  withdrawalId: string;
  status: string;
  processedAt: string;
  transactionId?: string | null;
};

type BalanceAdjustmentResponse = {
  adjustmentId: string;
  walletId: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminLedgerScreen() {
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
  const [adjustHistory, setAdjustHistory] = useState<(BalanceAdjustmentResponse & { adjustmentType: string; reason: string })[]>([]);

  const [copiedTrace, setCopiedTrace] = useState(false);

  async function copyTraceId(traceId: string) {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 1800);
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

    setWithdrawalBusy(true);
    setWithdrawalError(null);
    setWithdrawalSuccess("");
    try {
      const response = await api.patch<ApiResponse<ProcessWithdrawalResponse> | ProcessWithdrawalResponse>(
        `/api/v1/admin/wallets/withdrawals/${encodeURIComponent(trimmedId)}`,
        {
          action: withdrawalAction,
          adminNote: adminNote.trim() || undefined,
        },
      );
      const result = unwrap(response);
      setWithdrawalHistory((prev) => [result, ...prev]);
      setWithdrawalSuccess(
        `Đã xử lý yêu cầu rút tiền ${result.withdrawalId} với trạng thái: ${result.status}.`,
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

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setAdjustError({ message: "Số tiền điều chỉnh phải lớn hơn 0." });
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setAdjustError({ message: "Vui lòng nhập lý do điều chỉnh số dư để ghi nhận vào sổ cái." });
      return;
    }

    setAdjustBusy(true);
    setAdjustError(null);
    setAdjustSuccess("");
    try {
      const response = await api.post<ApiResponse<BalanceAdjustmentResponse> | BalanceAdjustmentResponse>(
        `/api/v1/admin/wallets/${encodeURIComponent(trimmedWalletId)}/adjustments`,
        {
          amount: numericAmount,
          adjustmentType,
          reason: trimmedReason,
        },
      );
      const result = unwrap(response);
      setAdjustHistory((prev) => [
        { ...result, adjustmentType, reason: trimmedReason },
        ...prev,
      ]);
      setAdjustSuccess(
        `Đã ${adjustmentType === "Credit" ? "cộng" : "trừ"} ${formatMoney(result.amount)} cho ví ${result.walletId}. Số dư sau điều chỉnh: ${formatMoney(result.balanceAfter)}.`,
      );
      setAmount("");
      setReason("");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setAdjustError({ message: cause.message, traceId: cause.traceId });
      } else {
        setAdjustError({
          message: cause instanceof Error ? cause.message : "Không thể điều chỉnh số dư ví.",
        });
      }
    } finally {
      setAdjustBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Quản lý tài chính"
        title="Sổ cái & Đối soát ví"
        description="Phê duyệt yêu cầu rút tiền và thực hiện các bút toán điều chỉnh số dư ví đối soát."
      />

      <div className="split" style={{ marginBottom: "24px" }}>
        {/* Left: Process Withdrawal by ID */}
        <Card className="card-pad">
          <SectionHeading
            title="1. Xử lý yêu cầu rút tiền theo mã"
            hint="Duyệt hoặc từ chối giải ngân yêu cầu rút tiền"
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
              Mã yêu cầu rút tiền <span style={{ color: "var(--red)" }}>*</span>
              <input
                className="field"
                required
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={withdrawalId}
                onChange={(e) => setWithdrawalId(e.target.value)}
              />
            </label>

            <label className="field-wrap">
              Quyết định xử lý <span style={{ color: "var(--red)" }}>*</span>
              <select
                className="select-field"
                value={withdrawalAction}
                onChange={(e) => setWithdrawalAction(e.target.value as "Approve" | "Reject")}
              >
                <option value="Approve">Phê duyệt giải ngân</option>
                <option value="Reject">Từ chối & hoàn trả số dư khả dụng</option>
              </select>
            </label>

            <label className="field-wrap">
              Ghi chú đối soát
              <textarea
                className="textarea-field"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Nhập mã giao dịch ngân hàng hoặc lý do từ chối..."
              />
            </label>

            <div className="action-row">
              <button
                type="submit"
                className={"button " + (withdrawalAction === "Reject" ? "button-danger" : "button-primary")}
                disabled={withdrawalBusy || !withdrawalId.trim()}
              >
                {withdrawalBusy ? "Đang xử lý…" : "Xác nhận xử lý rút tiền"}
              </button>
            </div>
          </form>
        </Card>

        {/* Right: Adjust Wallet Balance by WalletId */}
        <Card className="card-pad">
          <SectionHeading
            title="2. Điều chỉnh số dư ví"
            hint="Tăng hoặc giảm số dư ví kèm lý do đối soát"
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
              Mã ví điện tử <span style={{ color: "var(--red)" }}>*</span>
              <input
                className="field"
                required
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
              />
            </label>

            <div className="form-grid">
              <label className="field-wrap">
                Loại bút toán <span style={{ color: "var(--red)" }}>*</span>
                <select
                  className="select-field"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as "Credit" | "Debit")}
                >
                  <option value="Credit">+ Cộng tiền vào ví</option>
                  <option value="Debit">- Trừ tiền khỏi ví</option>
                </select>
              </label>

              <label className="field-wrap">
                Số tiền (VNĐ) <span style={{ color: "var(--red)" }}>*</span>
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
              Lý do đối soát / điều chỉnh <span style={{ color: "var(--red)" }}>*</span>
              <textarea
                className="textarea-field"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập biên bản đối soát hoặc lý do điều chỉnh số dư..."
              />
            </label>

            <div className="action-row">
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
      </div>

      <SectionHeading
        title="Bút toán vừa thực thi trong phiên"
        hint="Lịch sử các giao dịch vừa thao tác trong phiên làm việc"
      />
      <Card>
        {withdrawalHistory.length > 0 || adjustHistory.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loại nghiệp vụ</th>
                  <th>Mã giao dịch / Bút toán</th>
                  <th>Mã đối tượng</th>
                  <th>Chi tiết thay đổi</th>
                  <th>Thời điểm thực thi</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalHistory.map((w) => (
                  <tr key={`w-${w.withdrawalId}-${w.processedAt}`}>
                    <td>
                      <Badge tone="sky">Duyệt rút tiền</Badge>
                    </td>
                    <td>
                      <code>{w.transactionId ?? "—"}</code>
                    </td>
                    <td>
                      <code>{w.withdrawalId}</code>
                    </td>
                    <td>
                      Trạng thái mới: <strong>{w.status}</strong>
                    </td>
                    <td>{new Date(w.processedAt).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
                {adjustHistory.map((a) => (
                  <tr key={`a-${a.adjustmentId}`}>
                    <td>
                      <Badge tone={a.adjustmentType === "Credit" ? "green" : "amber"}>
                        Điều chỉnh ví: {a.adjustmentType === "Credit" ? "+ Cộng tiền" : "- Trừ tiền"}
                      </Badge>
                    </td>
                    <td>
                      <code>{a.adjustmentId}</code>
                    </td>
                    <td>
                      <code>{a.walletId}</code>
                    </td>
                    <td>
                      <strong>
                        {a.adjustmentType === "Credit" ? "+" : "-"}
                        {formatMoney(a.amount)}
                      </strong>{" "}
                      → Số dư mới: <strong>{formatMoney(a.balanceAfter)}</strong> — Lý do: {a.reason}
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
