"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Card, NoData, PageHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { staffAdminDemoEnabled } from "@/lib/demo/staff-admin-demo";
import { StaffAdminDemoNotice } from "@/widgets/staff-admin-demo/DemoNotice";
import { sellerRegistrationsService, type SellerRegistration } from "./services/seller-registrations.service";

const statuses = [
  { value: "Pending", label: "Chờ duyệt" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Rejected", label: "Từ chối" },
];

function statusLabel(status: string): string {
  const value = status.toUpperCase();
  if (value === "PENDING" || value === "PENDING_APPROVAL") return "Chờ duyệt";
  if (value === "APPROVED") return "Đã duyệt";
  if (value === "REJECTED") return "Từ chối";
  return status;
}

function isPending(status: string): boolean {
  return ["PENDING", "PENDING_APPROVAL"].includes(status.toUpperCase());
}

function documentUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function DocumentLink({ label, url }: { label: string; url?: string | null }) {
  const href = documentUrl(url);
  return <div className="info-row"><span>{label}</span><strong>{href ? <a href={href} target="_blank" rel="noopener noreferrer">Xem tài liệu</a> : "Chưa có dữ liệu"}</strong></div>;
}

export function StaffSellersScreen() {
  const [status, setStatus] = useState("Pending");
  const [page, setPage] = useState(1);
  const registrations = useApiResource(`seller-registrations:${status}:${page}`, (signal) => sellerRegistrationsService.list({ page, limit: 20, status }, signal));
  const records = registrations.data?.items ?? [];

  return <>
    <PageHeading overline="Nghiệp vụ Staff" title="Duyệt hồ sơ Seller" description={staffAdminDemoEnabled ? "Hồ sơ Seller mẫu cho buổi demo local." : "Hồ sơ đăng ký do User API trả về."} />
    <StaffAdminDemoNotice />
    <label className="field-wrap">Trạng thái hồ sơ<select className="select-field" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <Card>
      {registrations.error && <p role="alert" className="notice">{registrations.error.message}</p>}
      {records.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Mã hồ sơ</th><th>Tên shop</th><th>Người nộp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{records.map((registration) => <tr key={registration.registrationId}><td>{registration.registrationId}</td><td>{registration.shopName}</td><td>{registration.businessEmail ?? registration.userId ?? "—"}</td><td><Badge>{statusLabel(registration.status)}</Badge></td><td><Link className="button button-secondary button-small" href={ROUTES.staff.seller(registration.registrationId)}>Chi tiết</Link></td></tr>)}</tbody></table></div> : <NoData title={registrations.loading ? "Đang tải hồ sơ…" : registrations.error ? "Không tải được hồ sơ" : "Không có hồ sơ"} />}
      {registrations.data && registrations.data.total > registrations.data.limit && <div className="action-row"><button type="button" className="button button-secondary button-small" disabled={page <= 1 || registrations.loading} onClick={() => setPage((value) => value - 1)}>Trang trước</button><span>Trang {page}</span><button type="button" className="button button-secondary button-small" disabled={page * registrations.data.limit >= registrations.data.total || registrations.loading} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div>}
    </Card>
  </>;
}

function RegistrationDetails({ registration }: { registration: SellerRegistration }) {
  return <>
    <div className="info-row"><span>Tên shop</span><strong>{registration.shopName}</strong></div>
    <div className="info-row"><span>Email doanh nghiệp</span><strong>{registration.businessEmail ?? "—"}</strong></div>
    <div className="info-row"><span>Hotline</span><strong>{registration.hotline ?? "—"}</strong></div>
    <div className="info-row"><span>CCCD</span><strong>{registration.identityCardNumber ?? "—"}</strong></div>
    <div className="info-row"><span>Địa chỉ kho</span><strong>{registration.warehouseAddress ?? registration.pickupAddress ?? "—"}</strong></div>
    <div className="info-row"><span>Trạng thái</span><strong><Badge>{statusLabel(registration.status)}</Badge></strong></div>
    {registration.rejectionReason && <div className="info-row"><span>Lý do từ chối</span><strong>{registration.rejectionReason}</strong></div>}
    <DocumentLink label="Mặt trước CCCD" url={registration.idCardFrontUrl} />
    <DocumentLink label="Mặt sau CCCD" url={registration.idCardBackUrl} />
    <DocumentLink label="Giấy phép kinh doanh" url={registration.businessLicenseUrl} />
  </>;
}

export function StaffSellerDetailScreen() {
  const id = String(useParams<{ id: string }>().id ?? "");
  const registration = useApiResource(id ? `seller-registration:${id}` : null, (signal) => sellerRegistrationsService.detail(id, signal));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const canDecide = Boolean(registration.data && isPending(registration.data.status) && !decided);

  async function decide(approved: boolean) {
    if (!canDecide || (!approved && !reason.trim())) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      if (approved) await sellerRegistrationsService.approve(id);
      else await sellerRegistrationsService.reject(id, reason.trim());
      setDecided(true);
      setSaved(approved ? "Đã phê duyệt hồ sơ." : "Đã từ chối hồ sơ.");
      registration.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xử lý hồ sơ.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="crumbs"><Link href={ROUTES.staff.sellers}>Duyệt hồ sơ Seller</Link><span>/</span><span>Chi tiết</span></div>
    <PageHeading title="Chi tiết hồ sơ Seller" description={staffAdminDemoEnabled ? `Hồ sơ mẫu ${id}.` : `Hồ sơ ${id} từ backend.`} />
    <StaffAdminDemoNotice />
    {registration.error && <p role="alert" className="notice">Không tải được chi tiết hồ sơ: {registration.error.message}</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    {saved && <p role="status" className="form-success">{saved}</p>}
    <Card className="card-pad">
      {registration.data ? <RegistrationDetails registration={registration.data} /> : <NoData title={registration.loading ? "Đang tải hồ sơ…" : registration.error ? "Không tải được chi tiết hồ sơ" : "Không có dữ liệu hồ sơ"} />}
      {canDecide && <>
        <label className="field-wrap">Lý do từ chối<textarea className="textarea-field" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="action-row"><button type="button" className="button button-primary" disabled={busy} onClick={() => void decide(true)}>{busy ? "Đang xử lý…" : "Phê duyệt"}</button><button type="button" className="button button-secondary" disabled={busy || !reason.trim()} onClick={() => void decide(false)}>Từ chối</button></div>
      </>}
    </Card>
  </>;
}
