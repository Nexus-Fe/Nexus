import { api, type ApiResponse } from "@/lib/api/client";
import type { DepositRequest, WalletBalance, WalletTransaction } from "../types";

export const walletService = {
  getBalance: () => api.get<ApiResponse<WalletBalance>>("/api/wallet/balance"),
  getTransactions: () =>
    api.get<ApiResponse<WalletTransaction[]>>("/api/wallet/transactions"),
  deposit: (input: DepositRequest) =>
    api.post<ApiResponse<WalletTransaction>>("/api/wallet/deposits", input),
};
