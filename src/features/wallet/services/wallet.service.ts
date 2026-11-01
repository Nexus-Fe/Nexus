import { api, type ApiResponse } from "@/lib/api/client";
import type { DepositRequest, WalletBalance, WalletTransaction, WalletTransactionPage } from "../types";

export const walletService = {
  getBalance: (signal?: AbortSignal) => api.get<ApiResponse<WalletBalance>>("/api/v1/wallets/me", { signal }),
  getTransactions: (signal?: AbortSignal) =>
    api.get<ApiResponse<WalletTransactionPage>>("/api/v1/wallets/transactions?page=1&limit=10", { signal }),
  deposit: (input: DepositRequest) =>
    api.post<ApiResponse<WalletTransaction>>("/api/v1/wallets/topups/vnpay", input),
  createDirectCheckout: (input: { orderId: string; amount: number; gateway: "VNPAY"; bankCode?: string; returnUrl: string }) =>
    api.post<ApiResponse<{ transactionId: string; orderId: string; amount: number; paymentUrl: string; status: string }>>("/api/v1/wallets/checkout/direct", input),
};
