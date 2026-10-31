"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/constants/routes";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { BackendImage } from "@/components/ui/BackendImage";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";

type CartItem = { id?: string; cartItemId?: string; productId?: string; skuId?: string; productName?: string; name?: string; price?: number; unitPriceSnapshot?: number; currentUnitPrice?: number; quantity: number; imageUrl?: string; subtotal?: number; lineTotal?: number; itemStatus?: string; priceChanged?: boolean };
type Cart = { items?: CartItem[]; cartItems?: CartItem[]; groups?: Array<{ items: CartItem[] }>; totalAmount?: number; subtotal?: number; subtotalAmount?: number };
type Obj = Record<string, unknown>;
type Quote = { orders?: Array<{ sellerId?: string; quoteId?: string; totalAmount?: number }>; grandTotal?: number; warnings?: string[] };
const unwrap = <T,>(x: ApiResponse<T> | T): T => x && typeof x === "object" && "data" in x ? (x as ApiResponse<T>).data : x as T;
const errorText = (e: Error | null) => e?.message ?? "";
const currency = (value?: number) => formatMoney(value ?? null);
function useCart() { return useApiResource("/api/v1/carts", async () => unwrap(await api.get<ApiResponse<Cart>>("/api/v1/carts"))); }
const cartItems = (cart: Cart | null) => cart?.groups?.flatMap((group) => group.items) ?? cart?.items ?? cart?.cartItems ?? [];

export function CartScreen() {
  const cart = useCart(); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState("");
  const items = cartItems(cart.data);
  const changeQuantity = async (item: CartItem, quantity: number) => { const id = item.cartItemId ?? item.id; if (!id || quantity < 1) return; setBusy(true); setActionError(""); try { await api.patch(`/api/v1/carts/items/${encodeURIComponent(id)}`, { quantity }); cart.reload(); } catch (e) { setActionError(errorText(e as Error)); } finally { setBusy(false); } };
  const clearAll = async () => { setBusy(true); setActionError(""); try { await api.delete("/api/v1/carts/items/all", { body: { all: true } }); cart.reload(); } catch (e) { setActionError(errorText(e as Error)); } finally { setBusy(false); } };
  return <><PageHeading title="Giỏ hàng của bạn" />{cart.error && <p role="alert" className="notice">{errorText(cart.error)}</p>}{actionError && <p role="alert" className="notice">{actionError}</p>}<div className="buyer-cart-layout"><div className="buyer-cart-items">{cart.data?.groups?.length ? cart.data.groups.map((group, index) => <Card key={index}><div className="card-header"><h2>{String((group as { sellerName?: string }).sellerName ?? "Shop")}</h2></div>{group.items.map((item, i) => <div className="info-row" key={item.cartItemId ?? item.id ?? i}><BackendImage src={resolveImageUrl(item.imageUrl ?? null)} alt={item.productName ?? "Sản phẩm"} compact /><div><strong>{item.productName ?? item.productId}</strong><p>{currency(item.currentUnitPrice ?? item.unitPriceSnapshot)}</p>{item.priceChanged && <p role="status">Giá sản phẩm đã thay đổi.</p>}{item.itemStatus && item.itemStatus !== "OK" && <p role="status">Trạng thái: {item.itemStatus}</p>}<label>Số lượng <input aria-label="Số lượng" type="number" min="1" value={item.quantity} disabled={busy} onChange={(e) => void changeQuantity(item, Number(e.target.value))} /></label></div></div>)}</Card>) : <Card><NoData title={cart.loading ? "Đang tải giỏ hàng…" : cart.error ? "Không tải được giỏ hàng" : "Giỏ hàng đang trống"} /></Card>}</div><Card className="card-pad buyer-cart-summary"><h2>Tạm tính</h2><strong>{currency(cart.data?.subtotalAmount ?? cart.data?.subtotal ?? cart.data?.totalAmount)}</strong><div className="action-row"><ButtonLink href={ROUTES.buyer.checkout}>Tiếp tục thanh toán <Icon name="arrow" size={16}/></ButtonLink>{items.length > 0 && <button className="button button-secondary" disabled={busy} onClick={() => void clearAll()}>Xóa toàn bộ giỏ</button>}</div></Card></div><div className="action-row"><ButtonLink href={ROUTES.catalog.index} variant="secondary">Tiếp tục mua sắm</ButtonLink></div></>;
}

export function CheckoutScreen() {
  const cart = useCart(); const router = useRouter(); const items = cartItems(cart.data);
  const [form, setForm] = useState({ receiverName: "", street: "", ward: "", district: "", province: "", ghnDistrictId: "", ghnWardCode: "", contactPhone: "", paymentMethod: "VNPAY" });
  const [quote, setQuote] = useState<Quote | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => { setForm((current) => ({ ...current, [key]: value })); setQuote(null); };
  const requestQuote = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setError(""); setQuote(null); try { const quoteData = unwrap(await api.post<ApiResponse<Quote>>("/api/v1/checkouts/quote", { cartItemIds: items.map((x) => x.cartItemId ?? x.id).filter(Boolean), shippingAddress: { receiverName: form.receiverName, street: form.street, ward: form.ward, district: form.district, province: form.province, ghnDistrictId: Number(form.ghnDistrictId), ghnWardCode: form.ghnWardCode }, contactPhone: form.contactPhone, paymentMethod: form.paymentMethod })); setQuote(quoteData); } catch (ex) { setError(errorText(ex as Error)); } finally { setBusy(false); } };
  const createOrder = async (quoteId: string) => { setBusy(true); setError(""); try { const order = unwrap(await api.post<ApiResponse<Obj>>("/api/v1/orders", { quoteId, paymentMethod: form.paymentMethod, shippingAddress: [form.receiverName, form.street, form.ward, form.district, form.province].filter(Boolean).join(", "), contactPhone: form.contactPhone })); const id = String(order.orderId ?? order.id ?? ""); if (!id) throw new Error("Backend không trả mã đơn hàng."); router.push(ROUTES.buyer.order(id)); } catch (ex) { setError(errorText(ex as Error)); } finally { setBusy(false); } };
  return <><div className="crumbs"><Link href={ROUTES.buyer.cart}>Giỏ hàng</Link><Icon name="chevron" size={14}/><span>Thanh toán</span></div><PageHeading title="Xác nhận đơn hàng & thanh toán" />{cart.error && <p role="alert" className="notice">{errorText(cart.error)}</p>}{error && <p role="alert" className="notice">{error}</p>}<form onSubmit={requestQuote}><div className="split"><div className="mini-list"><Card className="card-pad"><h2>Địa chỉ nhận hàng</h2><div className="form-grid">{([ ["receiverName","Người nhận"],["contactPhone","Số điện thoại"],["street","Địa chỉ"],["ward","Phường / xã"],["district","Quận / huyện"],["province","Tỉnh / thành phố"],["ghnDistrictId","Mã huyện GHN"],["ghnWardCode","Mã xã GHN"] ] as const).map(([key,label]) => <label className="field-wrap" key={key}>{label}<input required className="field" value={form[key]} onChange={(e) => set(key,e.target.value)} /></label>)}</div></Card><Card className="card-pad"><h2>Sản phẩm</h2>{cart.loading ? <NoData title="Đang tải giỏ hàng…" /> : items.length ? items.map((item,i) => <div className="info-row" key={item.cartItemId ?? item.id ?? i}><span>{item.productName ?? item.name} × {item.quantity}</span><strong>{currency(item.lineTotal ?? item.subtotal ?? (item.currentUnitPrice ?? item.unitPriceSnapshot ?? 0) * item.quantity)}</strong></div>) : <NoData title="Giỏ hàng trống" />}</Card><Card className="card-pad"><label>Phương thức thanh toán<select className="select-field" value={form.paymentMethod} onChange={(e) => set("paymentMethod",e.target.value)}><option value="WALLET">Ví Nexus</option><option value="VNPAY">VNPay</option></select></label></Card></div><Card className="card-pad"><h2>Tóm tắt thanh toán</h2>{quote ? <><div className="info-row"><span>Tổng thanh toán</span><strong>{currency(quote.grandTotal)}</strong></div>{quote.warnings?.map((warning) => <p role="status" key={warning}>{warning}</p>)}{quote.orders?.map((shop, index) => <div className="info-row" key={shop.quoteId ?? index}><span>Đơn của shop {index + 1}: {currency(shop.totalAmount)}</span><button className="button button-primary" type="button" disabled={busy || !shop.quoteId} onClick={() => void createOrder(shop.quoteId!)}>Tạo đơn</button></div>)}</> : <p>Yêu cầu báo giá để xem số tiền chính thức.</p>}<div className="action-row"><button className="button button-secondary" disabled={busy || !items.length}>Lấy báo giá</button></div></Card></div></form></>;
}

export function OrdersScreen() {
  const orders = useApiResource("/api/v1/orders?page=1&pageSize=20", async () => unwrap(await api.get<ApiResponse<{ items: Obj[] }>>("/api/v1/orders?page=1&pageSize=20")).items ?? []);
  return <><PageHeading title="Đơn hàng của tôi" />{orders.error && <p role="alert" className="notice">{errorText(orders.error)}</p>}<Card className="card-pad">{orders.data?.length ? orders.data.map((order) => { const id = String(order.orderId ?? order.id ?? ""); return <div className="info-row" key={id}><div><Link href={ROUTES.buyer.order(id)}><strong>{String(order.orderNo ?? id)}</strong></Link><p>{String(order.status ?? "—")}</p></div><strong>{currency(Number(order.totalAmount ?? NaN))}</strong></div>; }) : <NoData title={orders.loading ? "Đang tải đơn hàng…" : orders.error ? "Không tải được đơn hàng" : "Bạn chưa có đơn hàng"} />}</Card><div className="order-lookup-section"><SectionHeading title="Tra cứu đơn hàng" action={<OrderLookup />} /></div></>;
}
function OrderLookup() { const [id,setId] = useState(""); const router = useRouter(); return <form className="order-lookup" onSubmit={(e) => { e.preventDefault(); if (id.trim()) router.push(ROUTES.buyer.order(id.trim())); }}><input className="field" aria-label="Mã đơn hàng" placeholder="Mã đơn hàng" value={id} onChange={(e) => setId(e.target.value)} required/><button className="button button-primary" type="submit">Xem đơn</button></form>; }
export function OrderDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  const order = useApiResource(id ? `/api/v1/orders/${id}` : null, async () => unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/orders/${encodeURIComponent(id)}`)));
  const shipment = useApiResource(id ? `/api/v1/shipments/order/${id}` : null, async () => unwrap(await api.get<ApiResponse<Obj | Obj[]>>(`/api/v1/shipments/order/${encodeURIComponent(id)}`)));
  const data = order.data;
  const subOrders = Array.isArray(data?.subOrders) ? data.subOrders as Obj[] : [];
  const shipmentRows = shipment.data && !Array.isArray(shipment.data) && Array.isArray(shipment.data.shipments) ? shipment.data.shipments as Obj[] : [];
  const status = String(data?.status ?? data?.orderStatus ?? "").replace(/[^a-z]/gi, "").toUpperCase();
  const paymentUrl = typeof data?.paymentUrl === "string" ? data.paymentUrl : "";
  const deadline = typeof data?.paymentDeadlineAt === "string" ? data.paymentDeadlineAt : "";
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const startPayment = async () => {
    if (!data || !id) return;
    setActionBusy(true); setActionError("");
    try {
      const result = unwrap(await api.post<ApiResponse<{ paymentUrl: string }>>("/api/v1/wallets/checkout/direct", {
        orderId: id,
        amount: Number(data.totalAmount),
        gateway: "VNPAY",
        returnUrl: `${window.location.origin}/buyer/payment/result?orderId=${encodeURIComponent(id)}`,
      }));
      if (!result.paymentUrl) throw new Error("BE chưa trả liên kết thanh toán.");
      window.location.assign(result.paymentUrl);
    } catch (error) { setActionError(errorText(error as Error)); setActionBusy(false); }
  };
  const cancelOrder = async () => {
    setActionBusy(true); setActionError("");
    try { await api.post(`/api/v1/orders/${encodeURIComponent(id)}/cancel`, { reasonCode: "BUYER_CHANGED_MIND" }); order.reload(); }
    catch (error) { setActionError(errorText(error as Error)); }
    finally { setActionBusy(false); }
  };
  const value = (...keys: string[]) => { for (const key of keys) if (data?.[key] != null) return String(data[key]); return "—"; };
  return <>
    <div className="crumbs"><Link href={ROUTES.buyer.orders}>Đơn hàng</Link><Icon name="chevron" size={14}/><span>{id}</span></div>
    <PageHeading title="Chi tiết đơn hàng" description="Chi tiết đơn và giao nhận từ backend." action={<ButtonLink href={ROUTES.buyer.orderReview(id)} variant="secondary">Đánh giá đơn hàng</ButtonLink>} />
    {order.error&&<p role="alert" className="notice">{errorText(order.error)}</p>}{shipment.error&&<p role="alert" className="notice">Giao nhận: {errorText(shipment.error)}</p>}
    {actionError&&<p role="alert" className="notice">{actionError}</p>}
    <div className="order-detail-layout">
      {status === "PENDINGPAYMENT"&&<div className="order-detail-payment"><Card className="card-pad"><h2>Chờ thanh toán</h2><p>{deadline?`Thanh toán trước ${new Date(deadline).toLocaleString("vi-VN")}.`:"Đơn đang chờ xác nhận thanh toán."}</p>{paymentUrl&&<a className="button button-primary" href={paymentUrl}>Tiếp tục thanh toán</a>}</Card><div className="action-row"><button className="button button-primary" disabled={actionBusy || !Number(data?.totalAmount)} onClick={() => void startPayment()}>{actionBusy ? "Đang xử lý…" : "Thanh toán qua VNPay"}</button><button className="button button-secondary" disabled={actionBusy} onClick={() => void cancelOrder()}>Hủy đơn hàng</button></div></div>}
      <div className="grid-3"><Card className="card-pad"><h2>Trạng thái</h2><Badge>{value("status","orderStatus")}</Badge></Card><Card className="card-pad"><h2>Mã đơn hàng</h2><strong>{id}</strong></Card><Card className="card-pad"><h2>Tổng thanh toán</h2><strong>{currency(Number(data?.totalAmount??data?.total??NaN))}</strong></Card></div>
      <div className="split"><Card className="card-pad"><h2>Thông tin đơn</h2>{data?<><div className="info-row"><span>Người nhận</span><strong>{value("contactPhone")}</strong></div><div className="info-row"><span>Địa chỉ</span><strong>{value("shippingAddress")}</strong></div><div className="info-row"><span>Phương thức</span><strong>{value("paymentMethod")}</strong></div></>:<NoData title={order.loading?"Đang tải đơn hàng…":"Không có dữ liệu đơn hàng"}/>}</Card><Card className="card-pad"><h2>Giao nhận</h2>{shipmentRows.length?shipmentRows.map((row,index)=><div className="info-row" key={String(row.shipmentId??index)}><span>{String(row.carrierName??"Đơn vị vận chuyển")} · {String(row.trackingNumber??"Chưa có mã vận đơn")}</span><strong>{String(row.status??"—")}</strong></div>):<NoData title={shipment.loading?"Đang tải giao nhận…":shipment.error?"Không tải được giao nhận":"Chưa có vận đơn"}/>}</Card></div>
      <div className="order-detail-products"><SectionHeading title="Sản phẩm trong đơn"/><Card>{subOrders.length?subOrders.map((subOrder,index)=><div key={String(subOrder.subOrderId??index)}><div className="card-header"><h2>{String(subOrder.shopName??`Shop ${index+1}`)}</h2><Badge>{String(subOrder.status??"—")}</Badge></div>{Array.isArray(subOrder.items)&&(subOrder.items as Obj[]).map((item,itemIndex)=><div className="info-row" key={String(item.orderItemId??itemIndex)}><span>{String(item.productName??item.productId)} × {String(item.quantity??"")}</span><strong>{currency(Number(item.lineTotal??NaN))}</strong></div>)}</div>):<NoData title={order.loading?"Đang tải sản phẩm…":"Đơn chưa có sản phẩm"}/>}</Card></div>
    </div>
  </>;
}

type UserReport = { reportId?: string; targetType?: string; targetId?: string; reason?: string; status?: string; adminNote?: string; createdAt?: string };
const reportStatusLabel: Record<string, string> = { PENDING: "Chờ xử lý", UNDER_REVIEW: "Đang xem xét", RESOLVED: "Đã xử lý", REJECTED: "Đã từ chối" };

export function BuyerOrderReviewScreen() {
  const params=useParams<{id:string}>();const orderId=String(params.id??"");
  const order=useApiResource(orderId?`/api/v1/orders/${orderId}`:null,async()=>unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/orders/${encodeURIComponent(orderId)}`)));
  const [productId,setProductId]=useState("");const [productRating,setProductRating]=useState("5");const [partnerRating,setPartnerRating]=useState("5");const [comment,setComment]=useState("");const [partnerComment,setPartnerComment]=useState("");const [error,setError]=useState("");const [success,setSuccess]=useState("");const [busy,setBusy]=useState(false);
  const products=Array.isArray(order.data?.items)?order.data.items as Obj[]:[];const selected=products.find(item=>String(item.productId??item.id)===productId);const completed=String(order.data?.status??order.data?.orderStatus??"").toUpperCase().includes("COMPLETED");
  async function submitProduct(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!selected)return;setBusy(true);setError("");setSuccess("");try{await api.post(`/api/v1/order/${encodeURIComponent(orderId)}/products/${encodeURIComponent(productId)}/reviews`,{rating:Number(productRating),comment,images:[]});setSuccess("Đã gửi đánh giá sản phẩm.");}catch(reason){setError(errorText(reason as Error));}finally{setBusy(false);}}
  async function submitPartner(){const targetUserId=String(selected?.sellerId??order.data?.sellerId??"");if(!targetUserId){setError("Đơn hàng chưa trả mã người bán để gửi đánh giá.");return;}setBusy(true);setError("");setSuccess("");try{await api.post("/api/v1/reviews",{transactionType:"ORDER",transactionId:orderId,targetUserId,rating:Number(partnerRating),comment:partnerComment,mediaUrls:[]});setSuccess("Đã gửi đánh giá người bán.");}catch(reason){setError(errorText(reason as Error));}finally{setBusy(false);}}
  return <><div className="crumbs"><Link href={ROUTES.buyer.order(orderId)}>Đơn hàng {orderId}</Link><Icon name="chevron" size={14}/><span>Đánh giá</span></div><PageHeading overline="Sau khi nhận hàng" title="Đánh giá đơn hàng" description="Đánh giá sản phẩm và người bán sau khi đơn hàng hoàn tất."/>{order.error&&<p className="notice" role="alert">{errorText(order.error)}</p>}{!completed&&<p className="notice" role="status">Chỉ gửi đánh giá khi backend xác nhận đơn đã hoàn tất.</p>}{error&&<p className="notice" role="alert">{error}</p>}{success&&<p className="form-success" role="status">{success}</p>}<div className="split"><Card className="card-pad"><h2>Đánh giá sản phẩm</h2><form className="auth-fields" onSubmit={e=>void submitProduct(e)}><label className="field-wrap">Sản phẩm<select className="select-field" required value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Chọn sản phẩm trong đơn</option>{products.map((item,index)=>{const id=String(item.productId??item.id??"");return <option key={id||index} value={id}>{String(item.productName??item.name??id)}</option>;})}</select></label><label className="field-wrap">Số sao<select className="select-field" value={productRating} onChange={e=>setProductRating(e.target.value)}>{[5,4,3,2,1].map(value=><option value={value} key={value}>{value} sao</option>)}</select></label><label className="field-wrap">Nhận xét<textarea className="textarea-field" minLength={3} required value={comment} onChange={e=>setComment(e.target.value)}/></label><button className="button button-primary" disabled={busy||!completed||!selected}>{busy?"Đang gửi…":"Gửi đánh giá sản phẩm"}</button></form></Card><Card className="card-pad"><h2>Đánh giá người bán</h2><label className="field-wrap">Số sao<select className="select-field" value={partnerRating} onChange={e=>setPartnerRating(e.target.value)}>{[5,4,3,2,1].map(value=><option value={value} key={value}>{value} sao</option>)}</select></label><label className="field-wrap">Nhận xét<textarea className="textarea-field" minLength={3} value={partnerComment} onChange={e=>setPartnerComment(e.target.value)}/></label><p>Gửi đánh giá cho người bán của sản phẩm đã chọn.</p><button className="button button-secondary" disabled={busy||!completed||!selected||!partnerComment.trim()} onClick={()=>void submitPartner()}>Gửi đánh giá người bán</button></Card></div></>;
}

export function BuyerReportsScreen() {
  const [targetId,setTargetId]=useState("");const [violationType,setType]=useState("FRAUD");const [description,setDescription]=useState("");const [error,setError]=useState("");const [success,setSuccess]=useState("");const [busy,setBusy]=useState(false);
  const reports=useApiResource("/api/v1/me/reports?page=1&limit=20",async()=>{const result=unwrap(await api.get<ApiResponse<{items:UserReport[]}>>('/api/v1/me/reports?page=1&limit=20'));return result.items??[];});
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");setSuccess("");try{await api.post('/api/v1/users/reports',{reportedUserId:targetId,violationType,description,evidenceUrls:[]});setSuccess("Đã gửi báo cáo. Trạng thái sẽ cập nhật khi được xử lý.");setTargetId("");setDescription("");reports.reload();}catch(reason){setError(errorText(reason as Error));}finally{setBusy(false);}}
  return <div className="buyer-reports-page">
    <PageHeading title="Báo cáo người dùng" />
    <div className="split buyer-reports-layout">
      <Card className="card-pad buyer-report-form-card">
        <h2>Thông tin báo cáo</h2>
        <form className="auth-fields" onSubmit={e=>void submit(e)}>
          <label className="field-wrap">Mã người dùng bị báo cáo<input className="field" required value={targetId} onChange={e=>setTargetId(e.target.value)} placeholder="UUID" /></label>
          <label className="field-wrap">Loại vi phạm<select className="select-field" value={violationType} onChange={e=>setType(e.target.value)}><option value="SPAM">Spam</option><option value="FRAUD">Gian lận</option><option value="INAPPROPRIATE_CONTENT">Nội dung không phù hợp</option></select></label>
          <label className="field-wrap">Mô tả<textarea className="textarea-field" required minLength={10} value={description} onChange={e=>setDescription(e.target.value)} /></label>
          {error&&<p className="notice" role="alert">{error}</p>}
          {success&&<p className="form-success" role="status">{success}</p>}
          <button className="button button-primary" type="button" disabled title="Chức năng gửi báo cáo hiện chưa khả dụng">Gửi báo cáo</button>
        </form>
      </Card>
      <Card className="buyer-report-history-card">
        <div className="card-header"><h2>Báo cáo đã gửi</h2></div>
        {reports.error&&<p className="notice" role="alert">{errorText(reports.error)}</p>}
        {reports.data?.length?reports.data.map((report,index)=><div className="buyer-report-item" key={report.reportId??index}>
          <div className="buyer-report-item-content">
            <strong>{report.reason??report.targetType??"Báo cáo"}</strong>
            <span className="buyer-report-item-id">{report.targetId??"—"}</span>
            {report.createdAt&&<time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString("vi-VN")}</time>}
            {report.adminNote&&<p>Phản hồi: {report.adminNote}</p>}
          </div>
          <Badge>{reportStatusLabel[report.status?.toUpperCase() ?? ""] ?? report.status ?? "—"}</Badge>
        </div>):<NoData title={reports.loading?"Đang tải báo cáo…":reports.error?"Không tải được báo cáo":"Chưa gửi báo cáo nào"}/>}
      </Card>
    </div>
  </div>;
}
