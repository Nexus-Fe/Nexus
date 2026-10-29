import Link from "next/link";
import { Card, PageHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";

export function WalletScreen() {
  return (
    <div className="color-indigo">
      <PageHeading title="Ví & lịch sử giao dịch" />

      <div className="wallet-status-copy" role="status">
          <p>
            Gateway hiện chuyển tiếp các yêu cầu ví bằng HTTP REST, nhưng Wallet service chỉ
            công khai health check và gRPC. Vì vậy Nexus chưa thể đọc số dư, lịch sử giao dịch,
            tạo thanh toán VNPay hoặc gửi yêu cầu rút tiền bằng API thật.
          </p>
          <p>
            Màn hình sẽ hiển thị dữ liệu và thao tác khi Gateway có REST adapter cho Wallet;
            hiện tại không gửi yêu cầu giao dịch.
          </p>
      </div>
      <Card className="card-pad wallet-status">
        <span className="wallet-coming-soon" aria-hidden="true">Coming soon</span>
      </Card>
      <div className="action-row"><Link className="button button-secondary" href={ROUTES.buyer.topUp}>Nạp tiền vào ví</Link></div>
    </div>
  );
}
