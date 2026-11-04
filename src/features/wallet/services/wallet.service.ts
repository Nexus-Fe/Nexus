import { api, type ApiResponse } from "@/lib/api/client";
import type { DepositRequest, WalletBalance, WalletTransaction, WalletTransactionPage } from "../types";

export const walletService = {
  async getBalance(signal?: AbortSignal): Promise<WalletBalance> {
    const response = await api.get<ApiResponse<WalletBalance> | WalletBalance>("/api/v1/wallets/me", { signal });
    return "data" in response ? response.data : response;
  },
  async getTransactions(signal?: AbortSignal): Promise<WalletTransactionPage> {
    const response = await api.get<ApiResponse<WalletTransactionPage> | WalletTransactionPage>("/api/v1/wallets/transactions?page=1&pageSize=10", { signal });
    return "data" in response ? response.data : response;
  },
  deposit: (input: DepositRequest) =>
    api.post<ApiResponse<WalletTransaction>>("/api/v1/wallets/topups/vnpay", input),
  createDirectCheckout: (input: { orderId: string; amount: number; gateway: "VNPAY"; bankCode?: string; returnUrl: string }) =>
    api.post<ApiResponse<{ transactionId: string; orderId: string; amount: number; paymentUrl: string; status: string }>>("/api/v1/wallets/checkout/direct", input),
};
