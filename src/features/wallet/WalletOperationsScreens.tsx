"use client";

import Link from "next/link";
import { Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";

export function BuyerTopUpScreen() {
  return <><div className="crumbs"><Link href={ROUTES.buyer.wallet}>Ví của tôi</Link><span>/</span><span>Nạp tiền</span></div>
    <PageHeading overline="Ví Buyer" title="Nạp tiền vào ví" description="Mỗi giao dịch tối đa 5.000.000 ₫ theo quy tắc trong flow đặc tả." />
    <div className="split"><Card className="card-pad"><SectionHeading title="Thông tin nạp tiền" /><label className="field-wrap">Số tiền<input className="field" type="number" min="1" max="5000000" step="1000" placeholder="Nhập số tiền" disabled /></label><label className="field-wrap">Phương thức<select className="select-field" disabled><option>Chuyển khoản</option></select></label><button className="button button-disabled" disabled>Nạp tiền</button><p className="status-note">Tạm khóa thao tác: Wallet service hiện chưa có REST endpoint nạp tiền qua Gateway. Không tạo giao dịch mẫu.</p></Card>
      <Card className="card-pad"><h2>Trạng thái giao dịch</h2><NoData title="Chưa có yêu cầu nạp tiền" /><p>Kết quả chỉ xuất hiện sau khi Gateway xác nhận giao dịch.</p></Card></div>
  </>;
}

export function SellerWalletScreen() {
  return <><PageHeading overline="Kênh người bán" title="Doanh thu & ví" description="Theo dõi số dư khả dụng, tiền đang giữ và lịch sử nhận tiền sau khi đơn hoàn tất." />
    <div className="grid-3"><Card className="card-pad"><h2>Có thể rút</h2><NoData title="Chưa có dữ liệu" /></Card><Card className="card-pad"><h2>Đang giữ</h2><NoData title="Chưa có dữ liệu" /></Card><Card className="card-pad"><h2>Phí nền tảng</h2><NoData title="Chưa có dữ liệu" /></Card></div>
    <SectionHeading title="Lịch sử doanh thu" /><Card><NoData title="Wallet API chưa trả dữ liệu qua Gateway" /></Card><p className="status-note">Số dư và khoản chiết khấu chỉ hiển thị khi Wallet API trả dữ liệu thật. <Link href={ROUTES.seller.withdrawals}>Xem yêu cầu rút tiền</Link></p>
  </>;
}

export function SellerWithdrawalsScreen() {
  return <><div className="crumbs"><Link href={ROUTES.seller.wallet}>Doanh thu & ví</Link><span>/</span><span>Yêu cầu rút tiền</span></div>
    <PageHeading overline="Kênh người bán" title="Yêu cầu rút tiền" description="Khoản rút tối thiểu 50.000 ₫. Yêu cầu cần được xác minh Seller và duyệt trước khi chuyển khoản." />
    <div className="split"><Card className="card-pad"><SectionHeading title="Tài khoản nhận tiền" /><div className="form-grid"><label className="field-wrap">Số tiền<input className="field" type="number" min="50000" step="1000" placeholder="Tối thiểu 50.000 ₫" disabled /></label><label className="field-wrap">Ngân hàng<input className="field" placeholder="Mã ngân hàng" disabled /></label><label className="field-wrap">Số tài khoản<input className="field" inputMode="numeric" disabled /></label><label className="field-wrap">Tên chủ tài khoản<input className="field" disabled /></label></div><button className="button button-disabled" disabled>Gửi yêu cầu rút</button><p className="status-note">Chưa thể gửi: Wallet service chưa cung cấp REST endpoint hoạt động trong Gateway Real mode.</p></Card>
      <Card className="card-pad"><h2>Lịch sử yêu cầu</h2><NoData title="Chưa có dữ liệu yêu cầu rút" /></Card></div>
  </>;
}
