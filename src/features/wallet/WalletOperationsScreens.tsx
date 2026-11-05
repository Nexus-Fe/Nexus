"use client";

import Link from "next/link";
import { Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { walletService } from "./services/wallet.service";

function sellerTransactionType(type: string): string {
  return ({ ESCROWRELEASE: "Doanh thu đơn hàng", WITHDRAWAL: "Rút tiền", WITHDRAWALDEBIT: "Rút tiền",
    REFUND: "Hoàn tiền", REFUNDCREDIT: "Hoàn tiền" } as Record<string, string>)[type.toUpperCase()] ?? type;
}

function sellerTransactionStatus(status: string): string {
  return ({ PENDING: "Đang xử lý", SUCCESS: "Thành công", COMPLETED: "Hoàn tất", FAILED: "Thất bại",
    CANCELLED: "Đã hủy" } as Record<string, string>)[status.toUpperCase()] ?? status;
}

function sellerTransactionDirection(type: string, status: string, amount: number): "credit" | "debit" | null {
  if (!Number.isFinite(amount) || amount === 0 || !["SUCCESS", "COMPLETED"].includes(status.toUpperCase())) return null;
  const normalizedType = type.toUpperCase();
  if (["ESCROWRELEASE", "REFUNDCREDIT", "WITHDRAWALREVERSAL", "TRANSFERIN", "ADJUSTMENTCREDIT", "TOPUPVNPAY"].includes(normalizedType)) return "credit";
  if (["WITHDRAWALDEBIT", "PURCHASEDEBIT", "DIRECTGATEWAYPAYMENT", "TRANSFEROUT", "ADJUSTMENTDEBIT"].includes(normalizedType)) return "debit";
  return null;
}

function SellerTransactionAmount({ type, status, amount }: { type: string; status: string; amount: number }) {
  const direction = sellerTransactionDirection(type, status, amount);
  return <span className={`seller-money-amount${direction ? ` seller-money-${direction}` : ""}`}>
    {direction === "credit" ? "+" : direction === "debit" ? "−" : ""}{formatMoney(Math.abs(amount))}
  </span>;
}

function sellerTransactionDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Chưa có dữ liệu";
}

export function BuyerTopUpScreen() {
  return <>
    <PageHeading overline="Ví Buyer" title="Nạp tiền vào ví" description="Nạp tiền qua VNPay khi dịch vụ được kích hoạt." />
    <div className="split"><Card className="card-pad"><SectionHeading title="Thông tin nạp tiền" /><label className="field-wrap">Số tiền<input className="field" type="number" min="10000" max="5000000" step="1000" placeholder="Từ 10.000 ₫" disabled /></label><label className="field-wrap">Phương thức<select className="select-field" disabled><option>VNPay</option></select></label><button className="button button-disabled" disabled>Nạp tiền</button><p className="status-note">Tạm khóa thao tác: hệ thống chưa xử lý yêu cầu nạp tiền qua VNPay. Không tạo giao dịch mẫu.</p></Card>
      <Card className="card-pad"><h2>Trạng thái giao dịch</h2><NoData title="Chưa có yêu cầu nạp tiền" /><p>Kết quả chỉ xuất hiện sau khi Gateway xác nhận giao dịch.</p></Card></div>
  </>;
}

export function SellerWalletScreen() {
  const balance = useApiResource("seller-wallet-balance", (signal) => walletService.getBalance(signal));
  const transactions = useApiResource("seller-wallet-transactions", (signal) =>
    walletService.getTransactions(signal).then((response) => response.items));
  return <><PageHeading overline="Kênh người bán" title="Doanh thu & ví" description="Theo dõi số dư khả dụng, tiền đang giữ và lịch sử nhận tiền sau khi đơn hoàn tất." />
    {balance.error && <p className="notice" role="alert">Không tải được số dư ví: {balance.error.message}</p>}
    <div className="grid-3 seller-wallet-balances">
      <Card className="card-pad"><h2>Có thể rút</h2>{balance.data ? <strong>{formatMoney(balance.data.availableBalance)}</strong> : <NoData title={balance.loading ? "Đang tải số dư…" : "Chưa có dữ liệu"} />}</Card>
      <Card className="card-pad"><h2>Đang giữ</h2>{balance.data ? <strong>{formatMoney(balance.data.lockedBalance)}</strong> : <NoData title={balance.loading ? "Đang tải số dư…" : "Chưa có dữ liệu"} />}</Card>
      <Card className="card-pad"><h2>Tổng số dư</h2>{balance.data ? <strong>{formatMoney(balance.data.balance)}</strong> : <NoData title={balance.loading ? "Đang tải số dư…" : "Chưa có dữ liệu"} />}</Card>
    </div>
    <SectionHeading title="Lịch sử doanh thu" />
    {transactions.error && <p className="notice" role="alert">Không tải được giao dịch: {transactions.error.message}</p>}
    {transactions.data?.length ? <Card><div className="table-scroll"><table className="data-table seller-money-table"><thead><tr><th scope="col">Thời gian</th><th scope="col">Loại</th><th scope="col" className="seller-money-cell">Số tiền</th><th scope="col">Trạng thái</th></tr></thead><tbody>{transactions.data.map((item) =>
      <tr key={item.id}><td>{sellerTransactionDate(item.createdAt)}</td><td>{sellerTransactionType(item.type)}</td><td className="seller-money-cell"><SellerTransactionAmount type={item.type} status={item.status} amount={item.amount} /></td><td>{sellerTransactionStatus(item.status)}</td></tr>)}</tbody></table></div></Card>
      : !transactions.error && <Card><NoData title={transactions.loading ? "Đang tải giao dịch…" : "Chưa có giao dịch"} /></Card>}
    <p className="status-note"><Link href={ROUTES.seller.withdrawals}>Xem yêu cầu rút tiền</Link></p>
  </>;
}

export function SellerWithdrawalsScreen() {
  const balance = useApiResource("seller-withdrawal-balance", (signal) => walletService.getBalance(signal));
  const transactions = useApiResource("seller-withdrawal-transactions", (signal) =>
    walletService.getTransactions(signal).then((response) => response.items.filter((item) => item.type.toUpperCase().includes("WITHDRAW"))));
  return <>
    <PageHeading overline="Kênh người bán" title="Yêu cầu rút tiền" description="Khoản rút tối thiểu 50.000 ₫. Yêu cầu cần được xác minh Seller và duyệt trước khi chuyển khoản." />
    <div className="split"><Card className="card-pad"><SectionHeading title="Tài khoản nhận tiền" /><div className="form-grid"><label className="field-wrap">Số tiền<input className="field seller-money-input" type="number" min="50000" step="1000" placeholder="Tối thiểu 50.000 ₫" disabled /></label><label className="field-wrap">Ngân hàng<input className="field" placeholder="Mã ngân hàng" disabled /></label><label className="field-wrap">Số tài khoản<input className="field" inputMode="numeric" disabled /></label><label className="field-wrap">Tên chủ tài khoản<input className="field" disabled /></label></div><button className="button button-disabled" disabled>Gửi yêu cầu rút</button><p className="status-note">Chưa thể gửi yêu cầu rút tiền qua API hiện tại.</p></Card>
      <Card className="card-pad seller-withdrawal-balance"><h2>Số dư có thể rút</h2>{balance.error && <p className="notice" role="alert">Không tải được số dư: {balance.error.message}</p>}{balance.data ? <strong>{formatMoney(balance.data.availableBalance)}</strong> : !balance.error && <NoData title={balance.loading ? "Đang tải số dư…" : "Chưa có dữ liệu"} />}</Card></div>
    <SectionHeading title="Giao dịch rút tiền gần đây" />
    {transactions.error && <p className="notice" role="alert">Không tải được giao dịch rút tiền: {transactions.error.message}</p>}
    {transactions.data?.length ? <Card><div className="table-scroll"><table className="data-table seller-money-table"><thead><tr><th scope="col">Thời gian</th><th scope="col" className="seller-money-cell">Số tiền</th><th scope="col">Trạng thái</th></tr></thead><tbody>{transactions.data.map((item) =>
      <tr key={item.id}><td>{sellerTransactionDate(item.createdAt)}</td><td className="seller-money-cell"><SellerTransactionAmount type={item.type} status={item.status} amount={item.amount} /></td><td>{sellerTransactionStatus(item.status)}</td></tr>)}</tbody></table></div></Card>
      : !transactions.error && <Card><NoData title={transactions.loading ? "Đang tải giao dịch…" : "Chưa có giao dịch rút tiền"} /></Card>}
    <p className="status-note">Danh sách này chỉ gồm giao dịch rút đã ghi vào ví; yêu cầu đang chờ duyệt cần API lịch sử riêng từ BE.</p>
  </>;
}
