import Link from "next/link";
import { Card, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";

export function WalletScreen() {
  return (
    <div className="color-indigo">
      <PageHeading
        title="Ví & lịch sử giao dịch"
        description="Số dư và giao dịch sẽ xuất hiện khi Wallet API được kết nối qua Gateway."
      />

      <SectionHeading title="Wallet API chưa sẵn sàng" />
      <Card className="card-pad">
        <div role="status">
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
      </Card>
      <div className="action-row"><Link className="button button-secondary" href={ROUTES.buyer.topUp}>Nạp tiền vào ví</Link></div>
    </div>
  );
}
