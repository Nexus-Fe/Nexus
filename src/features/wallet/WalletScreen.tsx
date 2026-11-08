"use client";

import Link from "next/link";
import { Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { walletService } from "./services/wallet.service";

export function transactionType(type: string): string {
  return (
    {
      TOPUPVNPAY: "Nạp tiền",
      DEPOSIT: "Nạp tiền",
      PURCHASEDEBIT: "Thanh toán đơn hàng",
      PAYMENT: "Thanh toán",
      REFUNDCREDIT: "Hoàn tiền",
      REFUND: "Hoàn tiền",
      ESCROWRELEASE: "Nhận tiền đơn hàng",
      WITHDRAWALDEBIT: "Rút tiền",
    } as Record<string, string>
  )[type.toUpperCase()] ?? type;
}

export function transactionStatus(status: string): string {
  return (
    {
      PENDING: "Đang xử lý",
      SUCCESS: "Thành công",
      COMPLETED: "Hoàn tất",
      FAILED: "Thất bại",
      CANCELLED: "Đã hủy",
    } as Record<string, string>
  )[status.toUpperCase()] ?? status;
}

const creditTypes = new Set([
  "TOPUPVNPAY",
  "DEPOSIT",
  "REFUNDCREDIT",
  "REFUND",
  "TRANSFERIN",
  "ADJUSTMENTCREDIT",
  "WITHDRAWALREVERSAL",
]);

const debitTypes = new Set([
  "PURCHASEDEBIT",
  "PAYMENT",
  "TRANSFEROUT",
  "ADJUSTMENTDEBIT",
  "WITHDRAWALDEBIT",
]);

function transactionDirection(
  type: string,
  status: string,
  amount: number,
): "credit" | "debit" | null {
  if (amount === 0 || !["SUCCESS", "COMPLETED"].includes(status.toUpperCase())) {
    return null;
  }

  const normalizedType = type.toUpperCase();
  if (creditTypes.has(normalizedType)) return "credit";
  if (debitTypes.has(normalizedType)) return "debit";
  return null;
}

export function transactionDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Chưa có dữ liệu";
}

export function WalletScreen() {
  const balance = useApiResource(
    "buyer-wallet-balance",
    (signal) => walletService.getBalance(signal),
  );
  const transactions = useApiResource(
    "buyer-wallet-transactions",
    (signal) => walletService.getTransactions(signal).then((response) => response.items),
  );
  const isReady = balance.data?.status?.toUpperCase() === "ACTIVE";

  return (
    <div className="color-indigo">
      <PageHeading title="Ví & lịch sử giao dịch" />

      <Card className="card-pad wallet-status">
        <div>
          <h2>Số dư ví</h2>
          {balance.error && (
            <p className="notice" role="alert">
              Không tải được số dư: {balance.error.message}
            </p>
          )}
          {balance.loading ? (
            <NoData title="Đang kiểm tra ví…" />
          ) : balance.data ? (
            <>
              <strong>{formatMoney(balance.data.balance)}</strong>
              <p className="status-note">
                Ví {isReady ? "đã sẵn sàng" : `đang ở trạng thái ${balance.data.status}`}
                {" · mã "}{balance.data.walletId}
              </p>
            </>
          ) : (
            !balance.error && <NoData title="Chưa xác nhận được ví" />
          )}
        </div>
      </Card>

      <SectionHeading title="10 giao dịch gần nhất" />
      {transactions.error && (
        <p className="notice" role="alert">
          Không tải được lịch sử: {transactions.error.message}
        </p>
      )}

      {transactions.loading ? (
        <NoData title="Đang tải lịch sử…" />
      ) : transactions.data?.length ? (
        <Card>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại giao dịch</th>
                  <th>Nội dung</th>
                  <th style={{ textAlign: "right" }}>Số tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {transactions.data.map((transaction) => {
                  const direction = transactionDirection(
                    transaction.type,
                    transaction.status,
                    transaction.amount,
                  );

                  return (
                    <tr key={transaction.id}>
                      <td>{transactionDate(transaction.createdAt)}</td>
                      <td>{transactionType(transaction.type)}</td>
                      <td>{transaction.note || "—"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {direction ? (
                          <span className={`wallet-amount-badge wallet-amount-${direction}`}>
                            {direction === "credit" ? "+" : "−"}
                            {formatMoney(Math.abs(transaction.amount))}
                          </span>
                        ) : (
                          formatMoney(Math.abs(transaction.amount))
                        )}
                      </td>
                      <td>{transactionStatus(transaction.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        !transactions.error && <NoData title="Chưa có giao dịch" />
      )}

      <div className="action-row">
        <Link className="button button-secondary" href={ROUTES.buyer.topUp}>
          Nạp tiền vào ví
        </Link>
      </div>
    </div>
  );
}