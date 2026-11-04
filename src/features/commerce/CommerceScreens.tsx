"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Card, NoData, PageHeading } from "@/components/ui/Primitives";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";

type Obj = Record<string, unknown>;
const unwrap = <T,>(value: ApiResponse<T> | T): T => value && typeof value === "object" && "data" in value ? value.data : value;
const errorText = (error: Error | null) => error?.message ?? "";

type UserReport = { reportId?: string; targetType?: string; targetId?: string; reason?: string; status?: string; adminNote?: string; createdAt?: string };
const reportStatusLabel: Record<string, string> = { PENDING: "Chờ xử lý", UNDER_REVIEW: "Đang xem xét", RESOLVED: "Đã xử lý", REJECTED: "Đã từ chối" };

export function BuyerOrderReviewScreen() {
  const params=useParams<{id:string}>();const orderId=String(params.id??"");
  const order=useApiResource(orderId?`/api/v1/orders/${orderId}`:null,async()=>unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/orders/${encodeURIComponent(orderId)}`)));
  const [productId,setProductId]=useState("");const [productRating,setProductRating]=useState("5");const [partnerRating,setPartnerRating]=useState("5");const [comment,setComment]=useState("");const [partnerComment,setPartnerComment]=useState("");const [error,setError]=useState("");const [success,setSuccess]=useState("");const [busy,setBusy]=useState(false);
  const products=Array.isArray(order.data?.items)?order.data.items as Obj[]:[];const selected=products.find(item=>String(item.productId??item.id)===productId);const completed=String(order.data?.status??order.data?.orderStatus??"").toUpperCase().includes("COMPLETED");
  async function submitProduct(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!selected)return;setBusy(true);setError("");setSuccess("");try{await api.post(`/api/v1/orders/${encodeURIComponent(orderId)}/products/${encodeURIComponent(productId)}/reviews`,{rating:Number(productRating),comment,images:[]});setSuccess("Đã gửi đánh giá sản phẩm.");}catch(reason){setError(errorText(reason as Error));}finally{setBusy(false);}}
  async function submitPartner(){const targetUserId=String(selected?.sellerId??order.data?.sellerId??"");if(!targetUserId){setError("Đơn hàng chưa trả mã người bán để gửi đánh giá.");return;}setBusy(true);setError("");setSuccess("");try{await api.post("/api/v1/reviews",{transactionType:"ORDER",transactionId:orderId,targetUserId,rating:Number(partnerRating),comment:partnerComment,mediaUrls:[]});setSuccess("Đã gửi đánh giá người bán.");}catch(reason){setError(errorText(reason as Error));}finally{setBusy(false);}}
  return <><PageHeading overline="Sau khi nhận hàng" title="Đánh giá đơn hàng" description="Đánh giá sản phẩm và người bán sau khi đơn hàng hoàn tất."/>{order.error&&<p className="notice" role="alert">{errorText(order.error)}</p>}{!completed&&<p className="notice" role="status">Chỉ gửi đánh giá khi backend xác nhận đơn đã hoàn tất.</p>}{error&&<p className="notice" role="alert">{error}</p>}{success&&<p className="form-success" role="status">{success}</p>}<div className="split"><Card className="card-pad"><h2>Đánh giá sản phẩm</h2><form className="auth-fields" onSubmit={e=>void submitProduct(e)}><label className="field-wrap">Sản phẩm<select className="select-field" required value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Chọn sản phẩm trong đơn</option>{products.map((item,index)=>{const id=String(item.productId??item.id??"");return <option key={id||index} value={id}>{String(item.productName??item.name??id)}</option>;})}</select></label><label className="field-wrap">Số sao<select className="select-field" value={productRating} onChange={e=>setProductRating(e.target.value)}>{[5,4,3,2,1].map(value=><option value={value} key={value}>{value} sao</option>)}</select></label><label className="field-wrap">Nhận xét<textarea className="textarea-field" minLength={3} required value={comment} onChange={e=>setComment(e.target.value)}/></label><button className="button button-primary" disabled={busy||!completed||!selected}>{busy?"Đang gửi…":"Gửi đánh giá sản phẩm"}</button></form></Card><Card className="card-pad"><h2>Đánh giá người bán</h2><label className="field-wrap">Số sao<select className="select-field" value={partnerRating} onChange={e=>setPartnerRating(e.target.value)}>{[5,4,3,2,1].map(value=><option value={value} key={value}>{value} sao</option>)}</select></label><label className="field-wrap">Nhận xét<textarea className="textarea-field" minLength={3} value={partnerComment} onChange={e=>setPartnerComment(e.target.value)}/></label><p>Gửi đánh giá cho người bán của sản phẩm đã chọn.</p><button className="button button-secondary" disabled={busy||!completed||!selected||!partnerComment.trim()} onClick={()=>void submitPartner()}>Gửi đánh giá người bán</button></Card></div></>;
}

export function BuyerReportsScreen() {
  const [targetId,setTargetId]=useState("");const [violationType,setType]=useState("FRAUD");const [description,setDescription]=useState("");const [error,setError]=useState("");const [success,setSuccess]=useState("");const [,setBusy]=useState(false);
  const reports=useApiResource("/api/v1/me/reports?page=1&limit=20",async()=>{const result=unwrap(await api.get<ApiResponse<{items:UserReport[]}>>('/api/v1/me/reports?page=1&limit=20'));return result.items??[];});
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setError("");setSuccess("");try{await api.post('/api/v1/users/reports',{reportedUserId:targetId,violationType,description,evidenceUrls:[]});setSuccess("Đã gửi báo cáo. Trạng thái sẽ cập nhật khi được xử lý.");setTargetId("");setDescription("");reports.reload();}catch(reason){setError(errorText(reason as Error));}}
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
