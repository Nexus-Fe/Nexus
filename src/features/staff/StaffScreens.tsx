"use client";
/* Admin workflow responses are ungenerated Gateway JSON contracts. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";import {useParams} from "next/navigation";import {useState} from "react";import {ROUTES} from "@/constants/routes";import {Icon} from "@/components/ui/Icon";import {Badge,Card,NoData,PageHeading} from "@/components/ui/Primitives";import {api,type ApiResponse} from "@/lib/api/client";import {useApiResource} from "@/lib/api/use-api-resource";
type Obj=Record<string,any>;const unwrap=<T,>(x:ApiResponse<T>|T):T=>x&&typeof x==="object"&&"data" in x?(x as ApiResponse<T>).data:x as T;const rows=(x:any):Obj[]=>Array.isArray(x)?x:(x?.items??x?.data??x?.registrations??x?.reports??[]);const msg=(e:Error|null)=>e?.message??"";
export function StaffSellersScreen(){const [status,setStatus]=useState("PENDING");const resource=useApiResource(`/api/v1/admin/seller-registrations?page=1&limit=50&status=${status}`,async()=>rows(unwrap(await api.get<ApiResponse<any>>(`/api/v1/admin/seller-registrations?page=1&limit=50&status=${status}`))));return <><PageHeading overline="Nghiệp vụ Staff" title="Duyệt hồ sơ Seller" description="Hồ sơ đăng ký do User API trả về."/><div className="field-wrap"><label>Trạng thái hồ sơ<select className="select-field" value={status} onChange={e=>setStatus(e.target.value)}><option value="PENDING">Chờ xử lý</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option></select></label></div><Card>{resource.error&&<p role="alert" className="notice">{msg(resource.error)}</p>}{resource.data?.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Mã hồ sơ</th><th>Tên shop</th><th>Người nộp</th><th>Trạng thái</th><th></th></tr></thead><tbody>{resource.data.map((x,i)=><tr key={x.registrationId??x.id??i}><td>{x.registrationId??x.id}</td><td>{x.shopName??x.businessName??""}</td><td>{x.userName??x.email??""}</td><td><Badge>{x.status??""}</Badge></td><td><Link className="button button-secondary button-small" href={ROUTES.staff.seller(String(x.registrationId??x.id))}>Chi tiết</Link></td></tr>)}</tbody></table></div>:<NoData title={resource.loading?"Đang tải hồ sơ…":resource.error?"Không tải được hồ sơ":"Không có hồ sơ"}/>}</Card></>;}
export function StaffSellerDetailScreen(){const params=useParams<{id:string}>();const id=String(params.id??"");const detail=useApiResource(id?`/api/v1/admin/seller-registrations/${id}`:null,async()=>unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/admin/seller-registrations/${encodeURIComponent(id)}`)));const [reason,setReason]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);const decide=async(approved:boolean)=>{setBusy(true);setError("");try{await api.put(`/api/v1/admin/seller-registrations/${encodeURIComponent(id)}/${approved?"approve":"reject"}`,approved?{}:{rejectionReason:reason});detail.reload();}catch(e){setError(msg(e as Error));}finally{setBusy(false);}};return <><div className="crumbs"><Link href={ROUTES.staff.sellers}>Duyệt hồ sơ Seller</Link><Icon name="chevron" size={14}/><span>Chi tiết</span></div><PageHeading title="Chi tiết hồ sơ Seller" description={`Hồ sơ ${id} từ backend.`}/>{detail.error&&<p role="alert" className="notice">{msg(detail.error)}</p>}{error&&<p role="alert" className="notice">{error}</p>}<Card className="card-pad">{detail.data?Object.entries(detail.data).filter(([,v])=>v==null||typeof v!=="object").map(([k,v])=><div className="info-row" key={k}><span>{k}</span><strong>{String(v??"—")}</strong></div>):<NoData title={detail.loading?"Đang tải hồ sơ…":"Không có dữ liệu hồ sơ"}/>}<label className="field-wrap">Lý do từ chối<textarea className="textarea-field" value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="action-row"><button className="button button-primary" disabled={busy||!detail.data} onClick={()=>void decide(true)}>Phê duyệt</button><button className="button button-secondary" disabled={busy||!detail.data||!reason.trim()} onClick={()=>void decide(false)}>Từ chối</button></div></Card></>;}
export function StaffReportsScreen() {
  const [status, setStatus] = useState("");
  const resource = useApiResource(`/api/v1/admin/reports?page=1&limit=50&status=${status}`, async () =>
    rows(unwrap(await api.get<ApiResponse<any>>(`/api/v1/admin/reports?page=1&limit=50&status=${status}`))),
  );
  const [selected, setSelected] = useState<Obj | null>(null);

  return (
    <>
      <PageHeading overline="Nghiệp vụ Staff" title="Xử lý báo cáo & khiếu nại" description="Báo cáo từ User API." />
      <label className="field-wrap">
        Trạng thái
        <select className="select-field" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Tất cả</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="RESOLVED">Đã xử lý</option>
          <option value="DISMISSED">Đã bác bỏ</option>
        </select>
      </label>
      {resource.error && <p role="alert" className="notice">{msg(resource.error)}</p>}
      <div className="split">
        <Card>
          {resource.data?.length ? resource.data.map((report, index) => (
            <button className="info-row" key={report.reportId ?? report.id ?? index} onClick={() => setSelected(report)}>
              <span>{report.title ?? report.reason ?? report.reportId}</span>
              <Badge>{report.status ?? ""}</Badge>
            </button>
          )) : <NoData title={resource.loading ? "Đang tải báo cáo…" : "Không có báo cáo"} />}
        </Card>
        <Card className="card-pad">
          <h2>Nội dung báo cáo</h2>
          {selected ? Object.entries(selected).map(([key, value]) => (
            <div className="info-row" key={key}>
              <span>{key}</span>
              <strong>{typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}</strong>
            </div>
          )) : <NoData title="Chọn báo cáo để xem" />}
        </Card>
      </div>
      <p role="status" className="notice">
        Quyết định xử lý chưa khả dụng: UserService chưa công khai API REST cho báo cáo và Gateway chưa xác định danh sách mã hành động được phép.
      </p>
    </>
  );
}

export function StaffQueueScreen({ queue }: { queue: "withdrawals" | "moderation" | "discrepancies" }) {
  const details = {
    withdrawals: { title: "Duyệt yêu cầu rút tiền", description: "Gateway có hợp đồng PATCH quyết định Admin nhưng chưa có endpoint danh sách để nạp hàng đợi an toàn." },
    moderation: { title: "Kiểm duyệt sản phẩm", description: "Chưa có API hàng đợi báo cáo sản phẩm, chi tiết kiểm duyệt hoặc hợp đồng hành động Staff." },
    discrepancies: { title: "Sai lệch giao dịch", description: "Chưa có endpoint đối chiếu ledger và ghi bút toán điều chỉnh riêng. Không sửa trực tiếp giao dịch cũ." },
  }[queue];
  return <><PageHeading overline="Nghiệp vụ Staff" title={details.title} description={details.description} /><Card><NoData title="Chưa thể tải hàng đợi từ Gateway" /></Card><p className="status-note">Không có hành động nào được bật cho đến khi Gateway cung cấp danh sách, quyền và hợp đồng xử lý tương ứng.</p></>;
}
