"use client";

import Link from "next/link";
import { Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { walletService } from "./services/wallet.service";

function transactionType(type: string): string {
  return ({ TOPUPVNPAY: "Nạp tiền", DEPOSIT: "Nạp tiền", PURCHASEDEBIT: "Thanh toán", PAYMENT: "Thanh toán", REFUNDCREDIT: "Hoàn tiền", REFUND: "Hoàn tiền" } as Record<string, string>)[type.toUpperCase()] ?? type;
}

function transactionStatus(status: string): string {
  return ({ PENDING: "Đang xử lý", SUCCESS: "Thành công", COMPLETED: "Hoàn tất", FAILED: "Thất bại", CANCELLED: "Đã hủy" } as Record<string, string>)[status.toUpperCase()] ?? status;
}

function transactionDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Chưa có dữ liệu";
}

export function WalletScreen() {
  const balance = useApiResource("buyer-wallet-balance", (signal) => walletService.getBalance(signal).then((response) => response.data));
  const transactions = useApiResource("buyer-wallet-transactions", (signal) => walletService.getTransactions(signal).then((response) => response.data.items));

  return <div className="color-indigo">
    <PageHeading title="Ví & lịch sử giao dịch" />
    <Card className="card-pad wallet-status">
      <div>
        <h2>Số dư ví</h2>
        {balance.error && <p className="notice" role="alert">Không tải được số dư: {balance.error.message}</p>}
        {balance.loading ? <NoData title="Đang tải số dư…" /> : balance.data ? <strong>{formatMoney(balance.data.balance)}</strong> : !balance.error && <NoData title="Chưa có dữ liệu ví" />}
      </div>
    </Card>
    <SectionHeading title="10 giao dịch gần nhất" />
    {transactions.error && <p className="notice" role="alert">Không tải được lịch sử: {transactions.error.message}</p>}
    {transactions.loading ? <NoData title="Đang tải lịch sử…" /> : transactions.data?.length ? <Card><div className="table-scroll"><table className="data-table"><thead><tr><th>Thời gian</th><th>Loại</th><th>Số tiền</th><th>Trạng thái</th></tr></thead><tbody>{transactions.data.map((transaction) => <tr key={transaction.id}><td>{transactionDate(transaction.createdAt)}</td><td>{transactionType(transaction.type)}</td><td>{formatMoney(transaction.amount)}</td><td>{transactionStatus(transaction.status)}</td></tr>)}</tbody></table></div></Card> : !transactions.error && <NoData title="Chưa có giao dịch" />}
    <div className="action-row"><Link className="button button-secondary" href={ROUTES.buyer.topUp}>Nạp tiền vào ví</Link></div>
  </div>;
}
