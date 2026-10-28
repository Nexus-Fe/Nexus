import { api, type ApiResponse } from "@/lib/api/client";
import type { DepositRequest, WalletBalance, WalletTransaction } from "../types";

export const walletService = {
  getBalance: () => api.get<ApiResponse<WalletBalance>>("/api/v1/wallets/me"),
  getTransactions: () =>
    api.get<ApiResponse<WalletTransaction[]>>("/api/v1/wallets/transactions?page=1&limit=30"),
  deposit: (input: DepositRequest) =>
    api.post<ApiResponse<WalletTransaction>>("/api/v1/wallets/topups/vnpay", input),
  createDirectCheckout: (input: { orderId: string; amount: number; gateway: "VNPAY"; bankCode?: string; returnUrl: string }) =>
    api.post<ApiResponse<{ transactionId: string; orderId: string; amount: number; paymentUrl: string; status: string }>>("/api/v1/wallets/checkout/direct", input),
};
