export type WalletBalance = {
  walletId: string;
  userId: string;
  balance: number;
  availableBalance: number;
  lockedBalance: number;
  currency: string;
  status: string;
  updatedAt: string;
};

export type WalletTransaction = {
  id: string;
  amount: number;
  type: "DEPOSIT" | "PAYMENT" | "REFUND" | string;
  status: string;
  createdAt: string;
  currency?: string;
  note?: string;
};

export type WalletTransactionPage = {
  items: WalletTransaction[];
};

export type DepositRequest = {
  amount: number;
};
