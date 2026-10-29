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

type CartItem = { id?: string; cartItemId?: string; productId?: string; skuId?: string; productName?: string; name?: string; price?: number; quantity: number; imageUrl?: string; subtotal?: number };
type Cart = { items?: CartItem[]; cartItems?: CartItem[]; totalAmount?: number; subtotal?: number };
type Obj = Record<string, unknown>;
const unwrap = <T,>(x: ApiResponse<T> | T): T => x && typeof x === "object" && "data" in x ? (x as ApiResponse<T>).data : x as T;
const errorText = (e: Error | null) => e?.message ?? "";
const currency = (value?: number) => formatMoney(value ?? null);
function useCart() { return useApiResource("/api/v1/cart", async () => unwrap(await api.get<ApiResponse<Cart>>("/api/v1/cart"))); }

export function CartScreen() {
  const cart = useCart(); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState("");
  const items = cart.data?.items ?? cart.data?.cartItems ?? [];
  const changeQuantity = async (item: CartItem, quantity: number) => { const id = item.cartItemId ?? item.id; if (!id || quantity < 1) return; setBusy(true); setActionError(""); try { await api.patch(`/api/v1/cart/items/${encodeURIComponent(id)}`, { quantity }); cart.reload(); } catch (e) { setActionError(errorText(e as Error)); } finally { setBusy(false); } };
  const remove = async (item: CartItem) => { const id = item.cartItemId ?? item.id; if (!id) return; setBusy(true); setActionError(""); try { await api.delete("/api/v1/cart/items", { body: { cartItemIds: [id], all: false } }); cart.reload(); } catch (e) { setActionError(errorText(e as Error)); } finally { setBusy(false); } };
  return <><PageHeading title="Giỏ hàng của bạn" />{cart.error && <p role="alert" className="notice">{errorText(cart.error)}</p>}{actionError && <p role="alert" className="notice">{actionError}</p>}<div className="split"><Card><div className="card-header"><h2>Sản phẩm trong giỏ</h2><Badge tone="slate">{items.length} sản phẩm</Badge></div>{cart.loading ? <NoData title="Đang tải giỏ hàng…" /> : items.length ? items.map((item, i) => <div className="info-row" key={item.cartItemId ?? item.id ?? i}><BackendImage src={resolveImageUrl(item.imageUrl ?? null)} alt={item.productName ?? item.name ?? "Sản phẩm"} compact /><div><strong>{item.productName ?? item.name ?? item.productId}</strong><p>{currency(item.price)}</p><label>Số lượng <input aria-label="Số lượng" type="number" min="1" value={item.quantity} disabled={busy} onChange={(e) => void changeQuantity(item, Number(e.target.value))} /></label><button className="button button-secondary button-small" disabled={busy || !(item.id || item.cartItemId)} onClick={() => void remove(item)}>Xóa</button></div></div>) : <NoData title={cart.error ? "Không tải được giỏ hàng" : "Giỏ hàng đang trống"} />}</Card><Card className="card-pad"><h2 style={{fontSize:17}}>Tóm tắt giỏ hàng</h2><div className="info-row"><span>Tạm tính</span><strong>{currency(cart.data?.subtotal ?? cart.data?.totalAmount)}</strong></div><div className="info-row"><span>Tổng cộng</span><strong>{currency(cart.data?.totalAmount ?? cart.data?.subtotal)}</strong></div><div className="action-row"><ButtonLink href={ROUTES.buyer.checkout}>Tiếp tục thanh toán <Icon name="arrow" size={16}/></ButtonLink></div></Card></div><div className="action-row"><ButtonLink href={ROUTES.catalog.index} variant="secondary">Tiếp tục mua sắm</ButtonLink></div></>;
}

export function CheckoutScreen() {
  const cart = useCart(); const router = useRouter(); const items = cart.data?.items ?? cart.data?.cartItems ?? [];
  const [form, setForm] = useState({ receiverName: "", street: "", ward: "", district: "", province: "", contactPhone: "", paymentMethod: "WALLET" });
  const [quote, setQuote] = useState<Obj | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const requestQuote = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setError(""); try { const quoteData = unwrap(await api.post<ApiResponse<Obj>>("/api/v1/checkout/quote", { cartItemIds: items.map((x) => x.cartItemId ?? x.id).filter(Boolean), shippingAddress: { receiverName: form.receiverName, street: form.street, ward: form.ward, district: form.district, province: form.province }, contactPhone: form.contactPhone, paymentMethod: form.paymentMethod })); setQuote(quoteData); } catch (ex) { setError(errorText(ex as Error)); } finally { setBusy(false); } };
  const createOrder = async () => { if (!quote) return; setBusy(true); setError(""); try { const order = unwrap(await api.post<ApiResponse<Obj>>("/api/v1/orders", { quoteId: quote.quoteId, paymentMethod: form.paymentMethod, shippingAddress: [form.receiverName, form.street, form.ward, form.district, form.province].filter(Boolean).join(", "), contactPhone: form.contactPhone })); const id = String(order.orderId ?? order.id ?? ""); if (!id) throw new Error("Backend không trả mã đơn hàng."); if (typeof order.paymentUrl === "string" && order.paymentUrl) window.location.assign(order.paymentUrl); else router.push(ROUTES.buyer.order(id)); } catch (ex) { setError(errorText(ex as Error)); } finally { setBusy(false); } };
  return <><div className="crumbs"><Link href={ROUTES.buyer.cart}>Giỏ hàng</Link><Icon name="chevron" size={14}/><span>Thanh toán</span></div><PageHeading title="Xác nhận đơn hàng & thanh toán" description="Báo giá và tạo đơn hàng qua Commerce API." />{error && <p role="alert" className="notice">{error}</p>}<form onSubmit={requestQuote}><div className="split"><div className="mini-list"><Card className="card-pad"><h2>Địa chỉ nhận hàng</h2><div className="form-grid">{([ ["receiverName","Người nhận"],["contactPhone","Số điện thoại"],["street","Địa chỉ"],["ward","Phường / xã"],["district","Quận / huyện"],["province","Tỉnh / thành phố"] ] as const).map(([key,label]) => <label className="field-wrap" key={key}>{label}<input required className="field" value={form[key]} onChange={(e) => set(key,e.target.value)} /></label>)}</div></Card><Card className="card-pad"><h2>Sản phẩm</h2>{cart.loading ? <NoData title="Đang tải giỏ hàng…" /> : items.length ? items.map((item,i) => <div className="info-row" key={item.cartItemId ?? item.id ?? i}><span>{item.productName ?? item.name} × {item.quantity}</span><strong>{currency(item.subtotal ?? (item.price ?? 0) * item.quantity)}</strong></div>) : <NoData title="Giỏ hàng trống" />}</Card><Card className="card-pad"><label>Phương thức thanh toán<select className="select-field" value={form.paymentMethod} onChange={(e) => set("paymentMethod",e.target.value)}><option value="WALLET">Ví Nexus</option><option value="VNPAY">VNPay</option></select></label></Card></div><Card className="card-pad"><h2>Tóm tắt thanh toán</h2>{quote ? Object.entries(quote).filter(([key,v]) => /amount|total|fee|discount/i.test(key) && (typeof v === "string" || typeof v === "number")).map(([key,value]) => <div className="info-row" key={key}><span>{key}</span><strong>{String(value)}</strong></div>) : <p>Yêu cầu báo giá để xem số tiền chính thức.</p>}<div className="action-row"><button className="button button-secondary" disabled={busy || !items.length}>Lấy báo giá</button>{quote && <button className="button button-primary" type="button" disabled={busy} onClick={() => void createOrder()}>Tạo đơn hàng</button>}</div></Card></div></form></>;
}

export function OrdersScreen() { return <><PageHeading title="Đơn hàng của tôi" /><Card className="card-pad"><NoData title="Chưa có API danh sách đơn hàng" /></Card><div className="order-lookup-section"><SectionHeading title="Tra cứu đơn hàng" action={<OrderLookup />} /></div></>; }
function OrderLookup() { const [id,setId] = useState(""); return <form className="order-lookup" onSubmit={(e) => e.preventDefault()}><input className="field" aria-label="Mã đơn hàng" placeholder="Mã đơn hàng" value={id} onChange={(e) => setId(e.target.value)} required/><button className="button button-primary" type="button" disabled title="Chức năng mở đơn hàng hiện chưa khả dụng">Xem đơn</button></form>; }
export function OrderDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  const order = useApiResource(id ? `/api/v1/order/${id}` : null, async () => unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/order/${encodeURIComponent(id)}`)));
  const shipment = useApiResource(id ? `/api/v1/shipments/order/${id}` : null, async () => unwrap(await api.get<ApiResponse<Obj | Obj[]>>(`/api/v1/shipments/order/${encodeURIComponent(id)}`)));
  const data = order.data;
  const status = String(data?.status ?? data?.orderStatus ?? "").toUpperCase();
  const paymentUrl = typeof data?.paymentUrl === "string" ? data.paymentUrl : "";
  const deadline = typeof data?.paymentDeadlineAt === "string" ? data.paymentDeadlineAt : "";
  const value = (...keys: string[]) => { for (const key of keys) if (data?.[key] != null) return String(data[key]); return "—"; };
  return <>
    <div className="crumbs"><Link href={ROUTES.buyer.orders}>Đơn hàng</Link><Icon name="chevron" size={14}/><span>{id}</span></div>
    <PageHeading title="Chi tiết đơn hàng" description="Chi tiết đơn và giao nhận từ backend." action={<ButtonLink href={ROUTES.buyer.orderReview(id)} variant="secondary">Đánh giá đơn hàng</ButtonLink>} />
    {order.error&&<p role="alert" className="notice">{errorText(order.error)}</p>}{shipment.error&&<p role="alert" className="notice">Giao nhận: {errorText(shipment.error)}</p>}
    {status.includes("PENDING_PAYMENT")&&<Card className="card-pad"><h2>Chờ thanh toán</h2><p>{deadline?`Thanh toán trước ${new Date(deadline).toLocaleString("vi-VN")}.`:"Đơn đang chờ xác nhận thanh toán."}</p>{paymentUrl?<a className="button button-primary" href={paymentUrl}>Tiếp tục thanh toán</a>:<p className="status-note">Gateway chưa trả liên kết thanh toán cho đơn này.</p>}</Card>}
    <div className="grid-3"><Card className="card-pad"><h2>Trạng thái</h2><Badge>{value("status","orderStatus")}</Badge></Card><Card className="card-pad"><h2>Mã đơn hàng</h2><strong>{id}</strong></Card><Card className="card-pad"><h2>Tổng thanh toán</h2><strong>{currency(Number(data?.totalAmount??data?.total??NaN))}</strong></Card></div>
    <div className="split"><Card className="card-pad"><h2>Thông tin đơn</h2>{data?Object.entries(data).filter(([,v])=>v===null||typeof v!=="object").map(([key,v])=><div className="info-row" key={key}><span>{key}</span><strong>{v===null?"—":String(v)}</strong></div>):<NoData title={order.loading?"Đang tải đơn hàng…":"Không có dữ liệu đơn hàng"}/>}</Card><Card className="card-pad"><h2>Giao nhận</h2>{shipment.data?<pre>{JSON.stringify(shipment.data,null,2)}</pre>:<NoData title={shipment.loading?"Đang tải giao nhận…":"Chưa có dữ liệu giao nhận"}/>}</Card></div>
    <SectionHeading title="Sản phẩm trong đơn"/><Card>{Array.isArray(data?.items)?(data.items as Obj[]).map((item,index)=><div className="info-row" key={String(item.id??index)}>{String(item.productName??item.name??item.productId)} × {String(item.quantity??"")}<strong>{String(item.subtotal??item.price??"")}</strong></div>):<NoData title="Backend không trả danh sách sản phẩm"/>}</Card>
  </>;
}

type UserReport = { reportId?: string; targetType?: string; targetId?: string; reason?: string; status?: string; adminNote?: string; createdAt?: string };
const reportStatusLabel: Record<string, string> = { PENDING: "Chờ xử lý", UNDER_REVIEW: "Đang xem xét", RESOLVED: "Đã xử lý", REJECTED: "Đã từ chối" };

export function BuyerOrderReviewScreen() {
  const params=useParams<{id:string}>();const orderId=String(params.id??"");
  const order=useApiResource(orderId?`/api/v1/order/${orderId}`:null,async()=>unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/order/${encodeURIComponent(orderId)}`)));
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
