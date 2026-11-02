"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/auth/SessionProvider";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";

type CartItem = { id: string; productId: string; skuId: string; sellerId: string; productName: string; quantity: number; unitPriceSnapshot: number };
type Cart = { id: string; buyerId: string; status: string; itemCount: number; subtotalAmount: number; items: CartItem[] };
type Order = { id: string; buyerId: string; status: string; totalAmount: number; paymentDeadlineAt: string };
type Shipment = { id: string; orderId: string; trackingNumber: string | null; status: string; receiverName: string; receiverPhone: string; receiverAddress: string };
type Paged<T> = { items: T[]; pagination: { pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasNextPage: boolean } };

function unwrap<T>(response: ApiResponse<T> | T): T {
  return response && typeof response === "object" && "data" in response ? response.data : response;
}

function useCart() {
  return useApiResource("buyer-active-cart", (signal) => api.get<ApiResponse<Cart> | Cart>("/api/v1/carts/active", { signal }).then(unwrap));
}

export function CartScreen() {
  const cart = useCart();
  const items = cart.data?.items ?? [];
  const groups = Object.groupBy(items, (item) => item.sellerId);
  return <>
    <PageHeading title="Giỏ hàng của bạn" />
    {cart.error && <p className="notice" role="alert">{cart.error.message}</p>}
    <div className="buyer-cart-layout">
      <div className="buyer-cart-items">
        {items.length ? Object.entries(groups).map(([sellerId, sellerItems]) => <Card className="card-pad" key={sellerId}>
          <h2>Gian hàng {sellerId.slice(0, 8)}</h2>
          {sellerItems?.map((item) => <div className="info-row" key={item.id}><div><strong>{item.productName}</strong><p>SKU {item.skuId} · {formatMoney(item.unitPriceSnapshot)} × {item.quantity}</p></div><strong>{formatMoney(item.unitPriceSnapshot * item.quantity)}</strong></div>)}
          <p className="status-note">Chọn món, đổi số lượng hoặc xóa món sẽ khả dụng khi Commerce cung cấp API ghi giỏ hàng.</p>
        </Card>) : <Card><NoData title={cart.loading ? "Đang tải giỏ hàng…" : cart.error ? "Không tải được giỏ hàng" : "Giỏ hàng đang trống"} /></Card>}
      </div>
      <Card className="card-pad buyer-cart-summary"><h2>Tạm tính</h2><strong>{cart.data ? formatMoney(cart.data.subtotalAmount) : "—"}</strong><p>{cart.data?.itemCount ?? 0} sản phẩm</p><button className="button button-primary" type="button" disabled>Tiếp tục thanh toán</button><p className="status-note">Commerce chưa có API chọn món, báo giá và đặt hàng. Giỏ hàng hiện chỉ đọc dữ liệu thật.</p></Card>
    </div>
    <div className="action-row"><Link className="button button-secondary" href={ROUTES.catalog.index}>Tiếp tục mua sắm</Link></div>
  </>;
}

export function CheckoutScreen() {
  const cart = useCart();
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "VNPAY">("VNPAY");
  return <>
    <PageHeading title="Xác nhận đơn hàng & thanh toán" />
    <p className="notice" role="status">Chưa thể đặt hàng: Commerce chưa có API báo giá, tạo đơn và giữ kho 30 phút. Dữ liệu bên dưới được đọc từ giỏ hàng thật.</p>
    {cart.error && <p className="notice" role="alert">{cart.error.message}</p>}
    <div className="split"><div className="mini-list"><Card className="card-pad"><SectionHeading title="Địa chỉ nhận hàng" /><p>Địa chỉ GHN sẽ được nhập và kiểm tra khi API báo giá và đặt hàng hoạt động.</p><label className="field-wrap">Người nhận<input className="field" disabled /></label><label className="field-wrap">Số điện thoại<input className="field" disabled /></label><label className="field-wrap">Địa chỉ<input className="field" disabled /></label></Card><Card className="card-pad"><SectionHeading title="Sản phẩm" />{cart.data?.items.length ? cart.data.items.map((item) => <div className="info-row" key={item.id}><span>{item.productName} × {item.quantity}</span><strong>{formatMoney(item.unitPriceSnapshot * item.quantity)}</strong></div>) : <NoData title={cart.loading ? "Đang tải giỏ hàng…" : "Giỏ hàng trống"} />}</Card></div><Card className="card-pad"><SectionHeading title="Thanh toán" /><label className="field-wrap">Phương thức<select className="select-field" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "WALLET" | "VNPAY")}><option value="WALLET">Ví Nexus</option><option value="VNPAY">VNPay</option></select></label><div className="info-row"><span>Tạm tính</span><strong>{cart.data ? formatMoney(cart.data.subtotalAmount) : "—"}</strong></div><p>Phí giao hàng và tổng thanh toán chính thức cần API báo giá.</p><button className="button button-primary" type="button" disabled>Đặt hàng</button><p className="status-note">{paymentMethod === "WALLET" ? "Thanh toán bằng số dư Ví chưa có API thu tiền đơn hàng." : "Webhook VNPay hiện chỉ xác nhận giao dịch nạp ví, chưa hoàn tất đơn hàng."}</p></Card></div>
  </>;
}

export function OrdersScreen() {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const buyerId = user?.id ?? "";
  const orders = useApiResource(buyerId ? `buyer-orders:${buyerId}:${page}` : null, (signal) => api.get<ApiResponse<Paged<Order>> | Paged<Order>>(`/api/v1/orders/buyer/${encodeURIComponent(buyerId)}?page=${page}&pageSize=20`, { signal }).then(unwrap));
  return <>
    <PageHeading title="Đơn hàng của tôi" />
    {orders.error && <p className="notice" role="alert">{orders.error.message}</p>}
    <Card className="card-pad">{orders.data?.items.length ? orders.data.items.map((order) => <div className="info-row" key={order.id}><div><Link href={ROUTES.buyer.order(order.id)}><strong>Đơn {order.id}</strong></Link><p>{order.status}</p></div><strong>{formatMoney(order.totalAmount)}</strong></div>) : <NoData title={orders.loading ? "Đang tải đơn hàng…" : orders.error ? "Không tải được đơn hàng" : "Bạn chưa có đơn hàng"} />}
      {orders.data && orders.data.pagination.totalPages > 1 && <div className="action-row"><button type="button" className="button button-secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trang trước</button><span>Trang {page}/{orders.data.pagination.totalPages}</span><button type="button" className="button button-secondary" disabled={!orders.data.pagination.hasNextPage} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div>}
    </Card>
  </>;
}

export function OrderDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const orderId = String(id ?? "");
  const order = useApiResource(orderId ? `buyer-order:${orderId}` : null, (signal) => api.get<ApiResponse<Order> | Order>(`/api/v1/orders/${encodeURIComponent(orderId)}`, { signal }).then(unwrap));
  const shipment = useApiResource(orderId ? `buyer-shipment:${orderId}` : null, (signal) => api.get<ApiResponse<Shipment> | Shipment>(`/api/v1/shipments/order/${encodeURIComponent(orderId)}`, { signal }).then(unwrap));
  const pending = order.data?.status.replace(/[^a-z]/gi, "").toUpperCase() === "PENDINGPAYMENT";
  return <>
    <PageHeading title="Chi tiết đơn hàng" />
    {order.error && <p className="notice" role="alert">{order.error.message}</p>}
    <div className="order-detail-layout">
      {pending && <Card className="card-pad"><h2>Chờ thanh toán</h2><p>Hạn thanh toán: {order.data?.paymentDeadlineAt ? new Date(order.data.paymentDeadlineAt).toLocaleString("vi-VN") : "—"}</p><div className="action-row"><button type="button" className="button button-primary" disabled>Thanh toán bằng Ví Nexus</button><button type="button" className="button button-secondary" disabled>Thanh toán qua VNPay</button><button type="button" className="button button-secondary" disabled>Hủy đơn</button></div><p className="status-note">Chưa có API thu tiền Ví, webhook VNPay hoàn tất đơn hoặc API hủy đơn kèm nhả kho.</p></Card>}
      <div className="grid-3"><Card className="card-pad"><h2>Trạng thái</h2><Badge>{order.data?.status ?? "—"}</Badge></Card><Card className="card-pad"><h2>Mã đơn hàng</h2><strong className="seller-wrap-value">{orderId}</strong></Card><Card className="card-pad"><h2>Tổng thanh toán</h2><strong>{order.data ? formatMoney(order.data.totalAmount) : "—"}</strong></Card></div>
      <div className="split"><Card className="card-pad"><h2>Thông tin đơn</h2>{order.data ? <><div className="info-row"><span>Mã Buyer</span><strong>{order.data.buyerId}</strong></div><div className="info-row"><span>Hạn thanh toán</span><strong>{new Date(order.data.paymentDeadlineAt).toLocaleString("vi-VN")}</strong></div></> : <NoData title={order.loading ? "Đang tải đơn hàng…" : "Không có dữ liệu đơn hàng"} />}</Card><Card className="card-pad"><h2>Giao nhận</h2>{shipment.error && <p className="notice" role="alert">{shipment.error.message}</p>}{shipment.data ? <><div className="info-row"><span>Mã vận đơn</span><strong>{shipment.data.trackingNumber ?? "Chưa cấp"}</strong></div><div className="info-row"><span>Trạng thái</span><strong>{shipment.data.status}</strong></div><div className="info-row"><span>Người nhận</span><strong>{shipment.data.receiverName}</strong></div><div className="info-row"><span>Địa chỉ</span><strong>{shipment.data.receiverAddress}</strong></div></> : <NoData title={shipment.loading ? "Đang tải vận đơn…" : "Chưa có vận đơn"} />}</Card></div>
      <Card className="card-pad"><h2>Sản phẩm trong đơn</h2><p>Commerce hiện chỉ trả mã, trạng thái, tổng tiền và hạn thanh toán. Danh sách sản phẩm sẽ hiển thị khi API chi tiết đơn cung cấp dữ liệu thật.</p></Card>
    </div>
  </>;
}
