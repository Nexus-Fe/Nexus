"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSession } from "@/components/auth/SessionProvider";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { fulfillmentService } from "@/features/fulfillment";

type CartItem = { id: string; productId: string; skuId: string; sellerId: string; productName: string; quantity: number; unitPriceSnapshot: number };
type Cart = { id: string; buyerId: string; status: string; itemCount: number; subtotalAmount: number; items: CartItem[] };
type Order = { id: string; buyerId: string; status: string; totalAmount: number; paymentDeadlineAt: string };
type Paged<T> = { items: T[]; pagination: { pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasNextPage: boolean } };

function useCart() {
  return useApiResource("buyer-active-cart", (signal) => api.get<ApiResponse<Cart> | Cart>("/api/v1/carts/me", { signal }).then(unwrap));
}

const SHIPPING_STORAGE_KEY = "nexus:checkout-shipping";
type ShippingForm = { receiverName: string; phone: string; address: string };
type ShippingErrors = Partial<Record<keyof ShippingForm, string>>;
const emptyShipping: ShippingForm = { receiverName: "", phone: "", address: "" };

function loadShipping(): ShippingForm {
  if (typeof window === "undefined") return emptyShipping;
  try {
    const raw = window.sessionStorage.getItem(SHIPPING_STORAGE_KEY);
    if (!raw) return emptyShipping;
    const parsed = JSON.parse(raw) as Partial<ShippingForm>;
    return { receiverName: String(parsed.receiverName ?? ""), phone: String(parsed.phone ?? ""), address: String(parsed.address ?? "") };
  } catch {
    return emptyShipping;
  }
}

function validateShipping(form: ShippingForm): ShippingErrors {
  const errors: ShippingErrors = {};
  if (form.receiverName.trim().length < 2) errors.receiverName = "Nhập họ tên người nhận.";
  if (!/^(0|\+84)\d{9}$/.test(form.phone.replace(/[\s.-]/g, ""))) errors.phone = "Nhập số điện thoại Việt Nam hợp lệ, ví dụ 0901234567.";
  if (form.address.trim().length < 5) errors.address = "Nhập địa chỉ nhận hàng cụ thể.";
  return errors;
}

export function CartScreen() {
  const router = useRouter();
  const cart = useCart();
  const items = cart.data?.items ?? [];
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const groups = items.reduce<Record<string, CartItem[]>>((result, item) => {
    (result[item.sellerId] ??= []).push(item);
    return result;
  }, {});
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  function toggleItem(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }
  function continueToCheckout() {
    if (!selectedItems.length) return;
    const query = new URLSearchParams({ items: selectedItems.map((item) => item.id).join(",") });
    router.push(`${ROUTES.buyer.checkout}?${query}`);
  }

  return <>
    <PageHeading title="Giỏ hàng của bạn" />
    {cart.error && <p className="notice" role="alert">{cart.error.message}</p>}
    <div className="buyer-cart-layout">
      <div className="buyer-cart-items">
        {items.length ? <>
          <label className="cart-item-select"><input type="checkbox" checked={allSelected} onChange={toggleAll} /><span><strong>Chọn tất cả ({items.length})</strong></span></label>
          {Object.entries(groups).map(([sellerId, sellerItems]) => <Card className="card-pad" key={sellerId}>
            <h2>Gian hàng {sellerId.slice(0, 8)}</h2>
            {sellerItems.map((item) => <div className="info-row" key={item.id}><label className="cart-item-select"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleItem(item.id)} aria-label={`Chọn ${item.productName}`} /><span><strong>{item.productName}</strong><span>SKU {item.skuId} · {formatMoney(item.unitPriceSnapshot)} × {item.quantity}</span></span></label><strong>{formatMoney(item.unitPriceSnapshot * item.quantity)}</strong></div>)}
          </Card>)}
          <p className="status-note">Đổi số lượng và xóa món chưa khả dụng trên giao diện này.</p>
        </> : <Card><NoData title={cart.loading ? "Đang tải giỏ hàng…" : cart.error ? "Không tải được giỏ hàng" : "Giỏ hàng đang trống"} /></Card>}
      </div>
      <Card className="card-pad buyer-cart-summary"><h2>Tạm tính</h2><strong>{selectedItems.length ? formatMoney(selectedTotal) : cart.data ? formatMoney(cart.data.subtotalAmount) : "—"}</strong><p>{selectedItems.length ? `${selectedItems.length}/${items.length} sản phẩm được chọn` : `${cart.data?.itemCount ?? 0} sản phẩm`}</p><button className="button button-primary" type="button" disabled={!selectedItems.length} onClick={continueToCheckout}>Tiếp tục thanh toán</button><p className="status-note">{selectedItems.length ? "Bước tiếp theo nhận thông tin giao hàng. Thanh toán tạm chưa mở." : "Chọn ít nhất một sản phẩm để tiếp tục."}</p></Card>
    </div>
    <div className="action-row"><Link className="button button-secondary" href={ROUTES.catalog.index}>Tiếp tục mua sắm</Link></div>
  </>;
}

export function CheckoutScreen() {
  const cart = useCart();
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get("items");
  const [form, setForm] = useState<ShippingForm>(loadShipping);
  const [errors, setErrors] = useState<ShippingErrors>({});
  const [saved, setSaved] = useState(false);
  const allItems = cart.data?.items ?? [];
  const selectedIds = selectedParam ? new Set(selectedParam.split(",").filter(Boolean)) : null;
  const items = selectedIds ? allItems.filter((item) => selectedIds.has(item.id)) : allItems;
  const subtotal = items.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0);

  function setField(field: keyof ShippingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }
  function saveShipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateShipping(form);
    setErrors(found);
    if (Object.keys(found).length) { setSaved(false); return; }
    window.sessionStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify({ receiverName: form.receiverName.trim(), phone: form.phone.trim(), address: form.address.trim() }));
    setSaved(true);
  }

  return <>
    <PageHeading title="Thông tin giao hàng" />
    <p className="notice" role="status">Bước này chỉ nhận thông tin giao hàng. Đặt hàng và thanh toán tạm chưa mở.</p>
    {cart.error && <p className="notice" role="alert">{cart.error.message}</p>}
    <div className="split"><div className="mini-list">
      <Card className="card-pad"><SectionHeading title="Địa chỉ nhận hàng" />
        <form className="auth-fields" onSubmit={saveShipping} noValidate>
          <label className="field-wrap">Người nhận<input className="field" name="receiverName" autoComplete="name" value={form.receiverName} onChange={(event) => setField("receiverName", event.target.value)} aria-invalid={Boolean(errors.receiverName)} />{errors.receiverName && <small role="alert">{errors.receiverName}</small>}</label>
          <label className="field-wrap">Số điện thoại<input className="field" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setField("phone", event.target.value)} aria-invalid={Boolean(errors.phone)} />{errors.phone && <small role="alert">{errors.phone}</small>}</label>
          <label className="field-wrap">Địa chỉ<input className="field" name="address" autoComplete="street-address" value={form.address} onChange={(event) => setField("address", event.target.value)} aria-invalid={Boolean(errors.address)} />{errors.address && <small role="alert">{errors.address}</small>}</label>
          <button className="button button-secondary" type="submit">Lưu thông tin giao hàng</button>
          {saved && <p className="form-success" role="status">Đã lưu thông tin giao hàng. Thanh toán tạm chưa mở nên đơn chưa được tạo.</p>}
        </form>
      </Card>
      <Card className="card-pad"><SectionHeading title="Sản phẩm" />{items.length ? items.map((item) => <div className="info-row" key={item.id}><span>{item.productName} × {item.quantity}</span><strong>{formatMoney(item.unitPriceSnapshot * item.quantity)}</strong></div>) : <NoData title={cart.loading ? "Đang tải giỏ hàng…" : "Chưa có sản phẩm được chọn"} />}</Card>
    </div>
    <Card className="card-pad"><SectionHeading title="Thanh toán" />
      <label className="field-wrap">Phương thức<select className="select-field" value="" disabled><option value="">Chưa mở thanh toán</option></select></label>
      <div className="info-row"><span>Tạm tính</span><strong>{items.length ? formatMoney(subtotal) : "—"}</strong></div>
      <button className="button button-primary" type="button" disabled>Đặt hàng</button>
      <p className="status-note">Thanh toán tạm khóa. Bạn chỉ có thể nhập thông tin giao hàng ở bước này.</p>
    </Card></div>
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
  const shipment = useApiResource(orderId ? `buyer-shipment:${orderId}` : null, (signal) => fulfillmentService.getShipmentByOrderId(orderId, signal));
  const pending = order.data?.status.replace(/[^a-z]/gi, "").toUpperCase() === "PENDINGPAYMENT";
  return <>
    <PageHeading title="Chi tiết đơn hàng" />
    {order.error && <p className="notice" role="alert">{order.error.message}</p>}
    <div className="order-detail-layout">
      {pending && <Card className="card-pad"><h2>Chờ thanh toán</h2><p>Hạn thanh toán: {order.data?.paymentDeadlineAt ? new Date(order.data.paymentDeadlineAt).toLocaleString("vi-VN") : "—"}</p><div className="action-row"><button type="button" className="button button-primary" disabled>Thanh toán bằng Ví Nexus</button><button type="button" className="button button-secondary" disabled>Thanh toán qua VNPay</button><button type="button" className="button button-secondary" disabled>Hủy đơn</button></div><p className="status-note">Thanh toán và hủy đơn tạm chưa mở trong bản demo này.</p></Card>}
      <div className="grid-3"><Card className="card-pad"><h2>Trạng thái</h2><Badge>{order.data?.status ?? "—"}</Badge></Card><Card className="card-pad"><h2>Mã đơn hàng</h2><strong className="seller-wrap-value">{orderId}</strong></Card><Card className="card-pad"><h2>Tổng thanh toán</h2><strong>{order.data ? formatMoney(order.data.totalAmount) : "—"}</strong></Card></div>
      <div className="split"><Card className="card-pad"><h2>Thông tin đơn</h2>{order.data ? <><div className="info-row"><span>Mã Buyer</span><strong>{order.data.buyerId}</strong></div><div className="info-row"><span>Hạn thanh toán</span><strong>{new Date(order.data.paymentDeadlineAt).toLocaleString("vi-VN")}</strong></div></> : <NoData title={order.loading ? "Đang tải đơn hàng…" : "Không có dữ liệu đơn hàng"} />}</Card><Card className="card-pad"><h2>Giao nhận</h2>{shipment.error && <p className="notice" role="alert">{shipment.error.message}</p>}{shipment.data ? <><div className="info-row"><span>Mã vận đơn</span><strong>{shipment.data.trackingNumber ?? "Chưa cấp"}</strong></div><div className="info-row"><span>Trạng thái</span><strong>{shipment.data.status}</strong></div><div className="info-row"><span>Người nhận</span><strong>{shipment.data.receiverName}</strong></div><div className="info-row"><span>Địa chỉ</span><strong>{shipment.data.receiverAddress}</strong></div></> : <NoData title={shipment.loading ? "Đang tải vận đơn…" : "Chưa có vận đơn"} />}</Card></div>
      <Card className="card-pad"><h2>Sản phẩm trong đơn</h2><p>Commerce hiện chỉ trả mã, trạng thái, tổng tiền và hạn thanh toán. Danh sách sản phẩm sẽ hiển thị khi API chi tiết đơn cung cấp dữ liệu thật.</p></Card>
    </div>
  </>;
}
