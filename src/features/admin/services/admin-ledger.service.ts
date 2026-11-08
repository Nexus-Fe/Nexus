import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export type ProcessWithdrawalPayload = {
  action: "Approve" | "Reject";
  adminNote?: string;
};

export type ProcessWithdrawalResponse = {
  withdrawalId: string;
  status: string;
  processedAt: string;
  transactionId?: string | null;
};

export type BalanceAdjustmentPayload = {
  amount: number;
  adjustmentType: "Credit" | "Debit";
  reason: string;
  referenceId?: string;
};

export type BalanceAdjustmentResponse = {
  adjustmentId: string;
  walletId: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

export const adminLedgerService = {
  async processWithdrawal(
    id: string,
    payload: ProcessWithdrawalPayload,
  ): Promise<ProcessWithdrawalResponse> {
    const response = await api.patch<
      ApiResponse<ProcessWithdrawalResponse> | ProcessWithdrawalResponse
    >(`/api/v1/admin/wallets/withdrawals/${encodeURIComponent(id)}`, {
      action: payload.action,
      adminNote: payload.adminNote?.trim() || undefined,
    });
    return unwrap(response);
  },

  async adjustBalance(
    walletId: string,
    payload: BalanceAdjustmentPayload,
  ): Promise<BalanceAdjustmentResponse> {
    const response = await api.post<
      ApiResponse<BalanceAdjustmentResponse> | BalanceAdjustmentResponse
    >(`/api/v1/admin/wallets/${encodeURIComponent(walletId)}/adjustments`, {
      amount: payload.amount,
      adjustmentType: payload.adjustmentType,
      reason: payload.reason.trim(),
      referenceId: payload.referenceId?.trim() || undefined,
    });
    return unwrap(response);
  },
};
