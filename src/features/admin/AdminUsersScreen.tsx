"use client";

import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { useApiResource } from "@/lib/api/use-api-resource";
import { staffAdminDemoEnabled } from "@/lib/demo/staff-admin-demo";
import { StaffAdminDemoNotice } from "@/widgets/staff-admin-demo/DemoNotice";
import { adminUsersService, type AdminUser } from "./services/admin-users.service";

type Action = "ban" | "unban" | "delete";

function userId(user: AdminUser): string {
  return user.userId ?? user.id ?? "";
}

function userName(user: AdminUser): string {
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email;
}

function userStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    BANNED: "Đã cấm",
    PENDINGVERIFICATION: "Chờ xác thực",
    PENDING_ACTIVATION: "Chờ xác thực",
    DELETED: "Đã xóa",
  };
  return status ? labels[status.toUpperCase()] ?? status : "—";
}

export function AdminUsersScreen() {
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const query = { page, limit: 20, keyword: search, role, status };
  const users = useApiResource(`admin-users:${page}:${search}:${role}:${status}`, (signal) => adminUsersService.list(query, signal));
  const detail = useApiResource(selected ? `admin-user:${selected}` : null, (signal) => adminUsersService.detail(selected, signal));
  const records = users.data?.items ?? [];
  const currentStatus = (detail.data?.status ?? "").toUpperCase();

  function select(id: string) {
    setSelected(id);
    setAction(null);
    setReason("");
    setError("");
    setSaved("");
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(keyword.trim());
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !action || !reason.trim()) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      if (action === "ban") await adminUsersService.ban(selected, reason.trim());
      if (action === "unban") await adminUsersService.unban(selected, reason.trim());
      if (action === "delete") await adminUsersService.remove(selected, reason.trim());
      setSaved(action === "ban" ? "Đã khóa tài khoản bằng Ban." : action === "unban" ? "Đã mở khóa tài khoản." : "Đã xóa mềm tài khoản.");
      if (action === "delete") setSelected("");
      else detail.reload();
      users.reload();
      setAction(null);
      setReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeading overline="Bảng điều khiển Admin" title="Quản lý tài khoản" description={staffAdminDemoEnabled ? "Tra cứu và xử lý tài khoản mẫu trên máy local." : "Tra cứu và xử lý tài khoản qua User API."} />
    <StaffAdminDemoNotice />
    <SectionHeading title="Danh sách tài khoản" />
    <Card>
      <form className="toolbar" onSubmit={applySearch}>
        <label className="field-wrap">Tìm tên hoặc email<input className="field" type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} /></label>
        <label className="field-wrap">Vai trò<select className="select-field" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="Buyer">Buyer</option><option value="Seller">Seller</option><option value="SupportStaff">Staff</option><option value="Admin">Admin</option></select></label>
        <label className="field-wrap">Trạng thái<select className="select-field" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="Active">Đang hoạt động</option><option value="Banned">Đã cấm</option><option value="PendingVerification">Chờ xác thực</option><option value="Deleted">Đã xóa</option></select></label>
        <button className="button button-secondary">Tìm kiếm</button>
      </form>
      {users.error && <p role="alert" className="notice">{users.error.message}</p>}
      {records.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Người dùng</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{records.map((user) => <tr key={userId(user)}><td>{userName(user)}</td><td>{user.email}</td><td>{user.roles?.join(", ") ?? "—"}</td><td><Badge>{userStatusLabel(user.status)}</Badge></td><td><button type="button" className="button button-secondary button-small" onClick={() => select(userId(user))}>Chi tiết</button></td></tr>)}</tbody></table></div> : <NoData title={users.loading ? "Đang tải tài khoản…" : users.error ? "Không tải được tài khoản" : "Không có tài khoản phù hợp"} />}
      {users.data && users.data.total > users.data.limit && <div className="action-row"><button type="button" className="button button-secondary button-small" disabled={page <= 1 || users.loading} onClick={() => setPage((value) => value - 1)}>Trang trước</button><span>Trang {page}</span><button type="button" className="button button-secondary button-small" disabled={page * users.data.limit >= users.data.total || users.loading} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div>}
    </Card>
    <SectionHeading title="Chi tiết tài khoản" />
    {detail.error && <p role="alert" className="notice">{detail.error.message}</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    {saved && <p role="status" className="form-success">{saved}</p>}
    <Card className="card-pad">
      {detail.data ? <>
        <div className="info-row"><span>Họ tên</span><strong>{userName(detail.data)}</strong></div>
        <div className="info-row"><span>Email</span><strong>{detail.data.email}</strong></div>
        <div className="info-row"><span>Vai trò</span><strong>{detail.data.roles?.join(", ") ?? "—"}</strong></div>
        <div className="info-row"><span>Trạng thái</span><strong>{userStatusLabel(detail.data.status)}</strong></div>
        <div className="action-row">
          {currentStatus !== "BANNED" && currentStatus !== "DELETED" && <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setAction("ban"); setReason(""); }}>Khóa tài khoản (Ban)</button>}
          {currentStatus === "BANNED" && <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setAction("unban"); setReason(""); }}>Mở khóa</button>}
          {currentStatus !== "DELETED" && <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setAction("delete"); setReason(""); }}>Xóa mềm</button>}
        </div>
        {action && <form className="auth-fields" onSubmit={(event) => void submitAction(event)}>{action === "ban" && <p className="status-note">Hiện dùng Ban để khóa tài khoản; Admin cần mở khóa thủ công.</p>}<label className="field-wrap">Lý do {action === "ban" ? "khóa" : action === "unban" ? "mở khóa" : "xóa"}<textarea className="textarea-field" required value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="action-row"><button className="button button-primary" disabled={busy || !reason.trim()}>{busy ? "Đang xử lý…" : "Xác nhận"}</button><button type="button" className="button button-secondary" disabled={busy} onClick={() => setAction(null)}>Hủy</button></div></form>}
      </> : <NoData title={selected ? detail.loading ? "Đang tải tài khoản…" : "Không có dữ liệu tài khoản" : "Chọn tài khoản để xem chi tiết"} />}
    </Card>
  </>;
}
