"use client";

import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { useApiResource } from "@/lib/api/use-api-resource";
import { adminUsersService, type AdminUser } from "./services/admin-users.service";

type Action = "ban" | "unban" | "delete";
type BadgeTone = "sky" | "green" | "amber" | "slate" | "red" | "indigo";

function userId(user: AdminUser): string {
  return user.userId ?? user.id ?? "";
}

function userName(user: AdminUser): string {
  return user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email;
}

function userStatusLabel(status?: string): string {
  const normalized = (status ?? "").toUpperCase().replace(/[\s_-]+/g, "");
  const labels: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    BANNED: "Đã cấm",
    PENDINGVERIFICATION: "Chờ xác thực",
    PENDINGACTIVATION: "Chờ xác thực",
    PENDING: "Chờ xác thực",
    DELETED: "Đã xóa",
  };
  return labels[normalized] ?? status ?? "—";
}

function userStatusTone(status?: string): BadgeTone {
  const normalized = (status ?? "").toUpperCase().replace(/[\s_-]+/g, "");
  if (normalized === "ACTIVE") return "green";
  if (normalized === "BANNED") return "red";
  if (normalized === "PENDINGVERIFICATION" || normalized === "PENDINGACTIVATION" || normalized === "PENDING") return "amber";
  if (normalized === "DELETED") return "slate";
  return "sky";
}

type RoleInfo = { label: string; tone: BadgeTone; order: number };

function formatRole(role: string): RoleInfo {
  const normalized = role.toLowerCase().replace(/^role_/, "").replace(/[\s_-]+/g, "").trim();
  if (normalized === "admin" || normalized === "administrator") {
    return { label: "Admin", tone: "indigo", order: 1 };
  }
  if (normalized === "staff" || normalized === "supportstaff") {
    return { label: "Staff", tone: "sky", order: 2 };
  }
  if (normalized === "seller") {
    return { label: "Seller", tone: "amber", order: 3 };
  }
  if (normalized === "buyer" || normalized === "customer") {
    return { label: "Buyer", tone: "slate", order: 4 };
  }
  return {
    label: role.charAt(0).toUpperCase() + role.slice(1),
    tone: "slate",
    order: 5,
  };
}

function renderRoles(roles?: string[]) {
  if (!roles || roles.length === 0) return <span>—</span>;
  const formatted = roles.map(formatRole).sort((a, b) => a.order - b.order);
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
      {formatted.map((r) => (
        <Badge key={r.label} tone={r.tone}>
          {r.label}
        </Badge>
      ))}
    </div>
  );
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

  function close() {
    setSelected("");
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
      if (action === "delete") {
        setTimeout(() => close(), 1200);
      } else {
        detail.reload();
      }
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
    <PageHeading overline="Bảng điều khiển Admin" title="Quản lý tài khoản" description="Tra cứu và xử lý tài khoản qua User API." />
    <SectionHeading title="Danh sách tài khoản" />
    <Card>
      <form className="toolbar" onSubmit={applySearch}>
        <label className="field-wrap">Tìm tên hoặc email<input className="field" type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} /></label>
        <label className="field-wrap">Vai trò<select className="select-field" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="Buyer">Buyer</option><option value="Seller">Seller</option><option value="SupportStaff">Staff</option><option value="Admin">Admin</option></select></label>
        <label className="field-wrap">Trạng thái<select className="select-field" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="Active">Đang hoạt động</option><option value="Banned">Đã cấm</option><option value="PendingVerification">Chờ xác thực</option><option value="Deleted">Đã xóa</option></select></label>
        <button className="button button-secondary">Tìm kiếm</button>
      </form>
      {users.error && <p role="alert" className="notice">{users.error.message}</p>}
      {records.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {records.map((user) => (
                <tr key={userId(user)} className="clickable-user-row" onClick={() => select(userId(user))}>
                  <td>
                    <button
                      type="button"
                      className="user-cell-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        select(userId(user));
                      }}
                    >
                      <strong>{userName(user)}</strong>
                      {user.username && <small>@{user.username}</small>}
                    </button>
                  </td>
                  <td>{user.email}</td>
                  <td>{renderRoles(user.roles)}</td>
                  <td>
                    <Badge tone={userStatusTone(user.status)}>
                      {userStatusLabel(user.status)}
                    </Badge>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        select(userId(user));
                      }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <NoData title={users.loading ? "Đang tải tài khoản…" : users.error ? "Không tải được tài khoản" : "Không có tài khoản phù hợp"} />
      )}
      {users.data && users.data.total > users.data.limit && (
        <div className="action-row">
          <button type="button" className="button button-secondary button-small" disabled={page <= 1 || users.loading} onClick={() => setPage((value) => value - 1)}>
            Trang trước
          </button>
          <span>Trang {page}</span>
          <button type="button" className="button button-secondary button-small" disabled={page * users.data.limit >= users.data.total || users.loading} onClick={() => setPage((value) => value + 1)}>
            Trang sau
          </button>
        </div>
      )}
    </Card>

    {Boolean(selected) && (
      <div
        className="admin-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) close();
        }}
      >
        <section
          className="admin-modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
        >
          <div className="admin-modal-heading">
            <div>
              <h2 id="user-modal-title">Chi tiết tài khoản</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                Mã định danh: <code>{selected}</code>
              </p>
            </div>
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={close}
              disabled={busy}
              aria-label="Đóng popup"
              title="Đóng (Esc)"
            >
              ✕
            </button>
          </div>

          {detail.loading && <NoData title="Đang tải thông tin tài khoản…" />}
          {detail.error && <p role="alert" className="notice">{detail.error.message}</p>}
          {error && <p role="alert" className="notice">{error}</p>}
          {saved && <p role="status" className="form-success">{saved}</p>}

          {detail.data && (
            <>
              <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                <div className="info-row"><span>Họ và tên</span><strong>{userName(detail.data)}</strong></div>
                <div className="info-row"><span>Email</span><strong>{detail.data.email}</strong></div>
                {detail.data.username && <div className="info-row"><span>Tên đăng nhập</span><strong>@{detail.data.username}</strong></div>}
                <div className="info-row"><span>Số điện thoại</span><strong>{detail.data.phoneNumber ?? "—"}</strong></div>
                {detail.data.identifyNumber && <div className="info-row"><span>Số CCCD/Định danh</span><strong>{detail.data.identifyNumber}</strong></div>}
                {detail.data.address && <div className="info-row"><span>Địa chỉ</span><strong>{detail.data.address}</strong></div>}
                <div className="info-row">
                  <span>Vai trò</span>
                  {renderRoles(detail.data.roles)}
                </div>
                <div className="info-row">
                  <span>Trạng thái</span>
                  <Badge tone={userStatusTone(detail.data.status)}>
                    {userStatusLabel(detail.data.status)}
                  </Badge>
                </div>
                {detail.data.reputationScore != null && (
                  <div className="info-row">
                    <span>Điểm uy tín</span>
                    <strong>{detail.data.reputationScore} ({detail.data.trustLevel ?? "Standard"})</strong>
                  </div>
                )}
                {detail.data.createdAt && (
                  <div className="info-row">
                    <span>Ngày tạo tài khoản</span>
                    <strong>{new Date(detail.data.createdAt).toLocaleString("vi-VN")}</strong>
                  </div>
                )}
                {currentStatus === "BANNED" && detail.data.banReason && (
                  <div className="info-row" style={{ color: "#9f2f2c" }}>
                    <span>Lý do khóa</span>
                    <strong>{detail.data.banReason}</strong>
                  </div>
                )}
              </div>

              <div className="action-row" style={{ borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                {currentStatus !== "BANNED" && currentStatus !== "DELETED" && (
                  <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setAction("ban"); setReason(""); }}>
                    Khóa tài khoản (Ban)
                  </button>
                )}
                {currentStatus === "BANNED" && (
                  <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setAction("unban"); setReason(""); }}>
                    Mở khóa
                  </button>
                )}
                {currentStatus !== "DELETED" && (
                  <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setAction("delete"); setReason(""); }}>
                    Xóa mềm
                  </button>
                )}
              </div>

              {action && (
                <form className="auth-fields" onSubmit={(event) => void submitAction(event)} style={{ marginTop: "14px" }}>
                  {action === "ban" && <p className="status-note">Hiện dùng Ban để khóa tài khoản; Admin cần mở khóa thủ công.</p>}
                  <label className="field-wrap">
                    Lý do {action === "ban" ? "khóa" : action === "unban" ? "mở khóa" : "xóa"}
                    <textarea className="textarea-field" required value={reason} onChange={(event) => setReason(event.target.value)} />
                  </label>
                  <div className="action-row">
                    <button className="button button-primary" disabled={busy || !reason.trim()}>
                      {busy ? "Đang xử lý…" : "Xác nhận"}
                    </button>
                    <button type="button" className="button button-secondary" disabled={busy} onClick={() => setAction(null)}>
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: "16px", marginTop: "16px" }}>
                <button type="button" className="button button-secondary" onClick={close} disabled={busy}>
                  Đóng
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    )}
  </>;
}
