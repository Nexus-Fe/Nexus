export type WalletBalance = {
  balance: number;
  currency: string;
};

export type WalletTransaction = {
  id: string;
  amount: number;
  type: "DEPOSIT" | "PAYMENT" | "REFUND" | string;
  status: string;
  createdAt: string;
};

export type DepositRequest = {
  amount: number;
};
