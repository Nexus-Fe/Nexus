"use client";

import Link from "next/link";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { walletService } from "./services/wallet.service";
import { transactionDate, transactionStatus, transactionType } from "./WalletScreen";

export function BuyerTopUpScreen() {
  return <>
    <PageHeading overline="Ví Buyer" title="Nạp tiền vào ví" description="Nạp tiền qua VNPay khi dịch vụ được kích hoạt." />
    <div className="split"><Card className="card-pad"><SectionHeading title="Thông tin nạp tiền" /><label className="field-wrap">Số tiền<input className="field" type="number" min="10000" max="5000000" step="1000" placeholder="Từ 10.000 ₫" disabled /></label><label className="field-wrap">Phương thức<select className="select-field" disabled><option>VNPay</option></select></label><button className="button button-disabled" disabled>Nạp tiền</button><p className="status-note">Tạm khóa thao tác: hệ thống chưa xử lý yêu cầu nạp tiền qua VNPay. Không tạo giao dịch mẫu.</p></Card>
      <Card className="card-pad"><h2>Trạng thái giao dịch</h2><NoData title="Chưa có yêu cầu nạp tiền" /><p>Kết quả chỉ xuất hiện sau khi Gateway xác nhận giao dịch.</p></Card></div>
  </>;
}

function SellerTransactionAmount({ type, status, amount }: { type: string; status: string; amount: number }) {
  const normalizedType = type.replace(/[^a-z]/gi, "").toUpperCase();
  const successful = ["SUCCESS", "COMPLETED"].includes(status.toUpperCase());
  const credit = successful && ["ESCROWRELEASE", "REFUNDCREDIT", "REFUND", "DEPOSIT", "TOPUPVNPAY"].includes(normalizedType);
  const debit = successful && ["PURCHASEDEBIT", "PAYMENT", "WITHDRAWALDEBIT"].includes(normalizedType);

  return <strong style={{ color: credit ? "#166534" : debit ? "#b91c1c" : undefined }}>
    {credit ? "+" : debit ? "−" : ""}{formatMoney(amount)}
  </strong>;
}
export function SellerWalletScreen() {
  const balance = useApiResource("seller-wallet-balance", (signal) => walletService.getBalance(signal));
  const transactions = useApiResource("seller-wallet-transactions", (signal) =>
    walletService.getTransactions(signal).then((response) => response.items),
  );
  const isReady = balance.data?.status?.toUpperCase() === "ACTIVE";

  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Doanh thu & ví"
        description="Theo dõi số dư khả dụng, tiền đang giữ và lịch sử nhận tiền sau khi người mua xác nhận nhận hàng."
      />
      {balance.error && <p className="notice" role="alert">Không tải được ví người bán: {balance.error.message}</p>}
      <div className="grid-3">
        <Card className="card-pad">
          <h2>Số dư khả dụng</h2>
          {balance.loading ? (
            <NoData title="Đang tải số dư…" />
          ) : balance.data ? (
            <>
              <strong className="seller-wallet-balance-amount" style={{ color: "var(--sky-dark)" }}>
                {formatMoney(balance.data.availableBalance ?? balance.data.balance)}
              </strong>
              <p className="status-note">
                Tiền đơn hàng được cộng tự động khi người mua xác nhận đã nhận hàng.
              </p>
            </>
          ) : (
            <NoData title="Chưa có dữ liệu" />
          )}
        </Card>
        <Card className="card-pad">
          <h2>Đang giữ</h2>
          {balance.loading ? (
            <NoData title="Đang tải…" />
          ) : balance.data ? (
            <>
              <strong className="seller-wallet-balance-amount">{formatMoney(balance.data.lockedBalance ?? 0)}</strong>
              <p className="status-note">Số tiền đang được ví tạm giữ.</p>
            </>
          ) : (
            <NoData title="Chưa có dữ liệu" />
          )}
        </Card>
        <Card className="card-pad">
          <h2>Trạng thái ví</h2>
          {balance.loading ? (
            <NoData title="Đang tải…" />
          ) : balance.data ? (
            <>
              <Badge>{isReady ? "Đang hoạt động" : balance.data.status}</Badge>
              <p className="status-note">Mã ví: {balance.data.walletId}</p>
            </>
          ) : (
            <NoData title="Chưa có dữ liệu" />
          )}
        </Card>
      </div>
      <SectionHeading title="Lịch sử doanh thu & giao dịch ví" />
      {transactions.error && <p className="notice" role="alert">Không tải được lịch sử: {transactions.error.message}</p>}
      <Card>
        {transactions.loading ? (
          <NoData title="Đang tải lịch sử doanh thu…" />
        ) : transactions.data?.length ? (
          <div className="table-scroll">
            <table className="data-table seller-wallet-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại giao dịch</th>
                  <th>Nội dung</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {transactions.data.map((tx) => (
                  <tr key={tx.id}>
                    <td>{transactionDate(tx.createdAt)}</td>
                    <td>{transactionType(tx.type)}</td>
                    <td>{tx.note || "—"}</td>
                    <td>
                      <SellerTransactionAmount type={tx.type} status={tx.status} amount={tx.amount} />
                    </td>
                    <td>
                      <Badge>{transactionStatus(tx.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData title="Chưa có giao dịch doanh thu" />
        )}
      </Card>
      <p className="status-note">
        Khi người mua bấm &ldquo;Đã nhận được hàng&rdquo;, toàn bộ tiền của đơn hàng được giải ngân trực tiếp vào ví Seller.{" "}
        <Link href={ROUTES.seller.withdrawals}>Xem yêu cầu rút tiền</Link>
      </p>
    </>
  );
}

export function SellerWithdrawalsScreen() {
  return <>
    <PageHeading overline="Kênh người bán" title="Yêu cầu rút tiền" description="Khoản rút tối thiểu 50.000 ₫. Yêu cầu cần được xác minh Seller và duyệt trước khi chuyển khoản." />
    <div className="split"><Card className="card-pad"><SectionHeading title="Tài khoản nhận tiền" /><div className="form-grid"><label className="field-wrap">Số tiền<input className="field" type="number" min="50000" step="1000" placeholder="Tối thiểu 50.000 ₫" disabled /></label><label className="field-wrap">Ngân hàng<input className="field" placeholder="Mã ngân hàng" disabled /></label><label className="field-wrap">Số tài khoản<input className="field" inputMode="numeric" disabled /></label><label className="field-wrap">Tên chủ tài khoản<input className="field" disabled /></label></div><button className="button button-disabled" disabled>Gửi yêu cầu rút</button><p className="status-note">Luồng rút tiền Seller chưa được kiểm chứng và thuộc đợt tiếp theo.</p></Card>
      <Card className="card-pad"><h2>Lịch sử yêu cầu</h2><NoData title="Chưa có dữ liệu yêu cầu rút" /></Card></div>
  </>;
}
