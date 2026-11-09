"use client";

import { useState, type FormEvent } from "react";
import { AdminPagination, Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { adminUsersService, type AdminUserReputationLog } from "./services/admin-users.service";
import {
  userId,
  userName,
  maskIdentifyNumber,
  userStatusLabel,
  userStatusTone,
  getPrimaryRole,
  canonicalRoleCode,
  roleTone,
} from "./services/admin-helpers";

type Action = "ban" | "unban" | "delete" | "editProfile" | "reputation" | "roles";

export function AdminUsersScreen() {
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [showFullCccd, setShowFullCccd] = useState(false);
  const [showReputationHistory, setShowReputationHistory] = useState(false);
  const [reputationLogs, setReputationLogs] = useState<AdminUserReputationLog[]>([]);
  const [reputationLoading, setReputationLoading] = useState(false);

  // Edit profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    status: "Active",
    reason: "",
  });

  // Reputation adjustment form state
  const [repForm, setRepForm] = useState({
    targetRole: "Buyer" as "Buyer" | "Seller",
    scoreDelta: "5",
    reason: "",
  });
  const [roleForm, setRoleForm] = useState({ roleCode: "Buyer", reason: "" });

  // Create internal user modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    username: "",
    phoneNumber: "",
    roleCode: "SupportStaff",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; traceId?: string } | null>(null);
  const [saved, setSaved] = useState("");
  const [copiedTrace, setCopiedTrace] = useState(false);

  const query = { page, limit: 20, keyword: search, role, status };
  const users = useApiResource(
    `admin-users:${page}:${search}:${role}:${status}`,
    (signal) => adminUsersService.list(query, signal),
  );
  const detail = useApiResource(selected ? `admin-user:${selected}` : null, (signal) =>
    adminUsersService.detail(selected, signal),
  );
  const records = users.data?.items ?? [];
  const currentStatus = (detail.data?.status ?? "").toUpperCase();

  function handleError(cause: unknown, fallback: string) {
    if (cause instanceof ApiError) {
      setError({ message: cause.message, traceId: cause.traceId });
    } else {
      setError({ message: cause instanceof Error ? cause.message : fallback });
    }
  }

  async function copyTraceId(traceId: string) {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 1800);
    } catch {
      // Ignore
    }
  }

  function select(id: string) {
    setSelected(id);
    setAction(null);
    setReason("");
    setShowFullCccd(false);
    setShowReputationHistory(false);
    setReputationLogs([]);
    setError(null);
    setSaved("");
  }

  function close() {
    setSelected("");
    setAction(null);
    setReason("");
    setShowFullCccd(false);
    setShowReputationHistory(false);
    setReputationLogs([]);
    setError(null);
    setSaved("");
  }

  function toggleReputationHistory() {
    if (showReputationHistory) {
      setShowReputationHistory(false);
    } else {
      setShowReputationHistory(true);
      setAction(null);
      if (selected) {
        setReputationLoading(true);
        adminUsersService
          .getReputationHistory(selected)
          .then((logs) => setReputationLogs(logs))
          .catch(() => setReputationLogs([]))
          .finally(() => setReputationLoading(false));
      }
    }
  }

  function openEditProfileAction() {
    if (!detail.data) return;
    setAction("editProfile");
    setProfileForm({
      firstName: detail.data.firstName ?? "",
      lastName: detail.data.lastName ?? "",
      phoneNumber: detail.data.phoneNumber ?? "",
      status: detail.data.status ?? "Active",
      reason: "Cập nhật thông tin hồ sơ từ cổng Admin",
    });
    setError(null);
    setSaved("");
  }

  function openReputationAction() {
    setAction("reputation");
    setRepForm({
      targetRole: "Buyer",
      scoreDelta: "5",
      reason: "",
    });
    setError(null);
    setSaved("");
  }

  function openRolesAction() {
    if (!detail.data) return;
    setAction("roles");
    setRoleForm({
      roleCode: canonicalRoleCode(getPrimaryRole(detail.data)),
      reason: "",
    });
    setError(null);
    setSaved("");
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(keyword.trim());
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !action) return;

    setBusy(true);
    setError(null);
    setSaved("");
    try {
      if (action === "ban") {
        if (!reason.trim()) return;
        await adminUsersService.ban(selected, reason.trim());
        setSaved("Đã khóa tài khoản bằng Ban.");
      } else if (action === "unban") {
        if (!reason.trim()) return;
        await adminUsersService.unban(selected, reason.trim());
        setSaved("Đã mở khóa tài khoản.");
      } else if (action === "delete") {
        if (!reason.trim()) return;
        await adminUsersService.remove(selected, reason.trim());
        setSaved("Đã xóa mềm tài khoản.");
      } else if (action === "editProfile") {
        if (!profileForm.firstName.trim() || !profileForm.lastName.trim() || !profileForm.reason.trim()) {
          setError({ message: "Vui lòng nhập đầy đủ Họ, Tên và Lý do cập nhật." });
          setBusy(false);
          return;
        }
        await adminUsersService.updateProfile(selected, profileForm);
        setSaved("Đã cập nhật thông tin hồ sơ tài khoản.");
      } else if (action === "reputation") {
        const delta = Number(repForm.scoreDelta);
        const isSellerAccount = detail.data?.isSeller || (detail.data?.roles ?? []).some((r: string) => r.toLowerCase() === "seller");
        if (repForm.targetRole === "Seller" && !isSellerAccount) {
          setError({ message: "Tài khoản này chỉ có vai trò Buyer, không thể điều chỉnh điểm uy tín Seller." });
          setBusy(false);
          return;
        }
        if (!Number.isInteger(delta) || delta === 0 || delta < -50 || delta > 50) {
          setError({ message: "Mức điểm điều chỉnh (ScoreDelta) phải là số nguyên từ -50 đến +50 (khác 0)." });
          setBusy(false);
          return;
        }
        if (repForm.reason.trim().length < 10 || repForm.reason.trim().length > 500) {
          setError({ message: "Lý do điều chỉnh điểm uy tín phải từ 10 đến 500 ký tự." });
          setBusy(false);
          return;
        }
        await adminUsersService.adjustReputation(selected, {
          targetRole: repForm.targetRole,
          scoreDelta: delta,
          reason: repForm.reason.trim(),
        });
        setSaved(`Đã điều chỉnh điểm uy tín (${delta > 0 ? `+${delta}` : delta}) thành công.`);
        if (showReputationHistory) {
          adminUsersService.getReputationHistory(selected).then((logs) => setReputationLogs(logs)).catch(() => {});
        } else {
          setReputationLogs([]);
        }
      } else if (action === "roles") {
        const currentRole = canonicalRoleCode(getPrimaryRole(detail.data!));
        if (roleForm.roleCode === "Seller" && currentRole !== "Seller") {
          setError({ message: "Không thể gán trực tiếp vai trò Seller. Tài khoản phải được duyệt hồ sơ người bán." });
          return;
        }
        if (!roleForm.reason.trim()) {
          setError({ message: "Vui lòng nhập lý do thay đổi vai trò." });
          return;
        }
        await adminUsersService.updateRoles(selected, [roleForm.roleCode], roleForm.reason.trim());
        setSaved("Đã cập nhật vai trò chính của tài khoản.");
      }

      if (action === "delete") {
        setTimeout(() => close(), 1200);
      } else {
        detail.reload();
      }
      users.reload();
      setAction(null);
      setReason("");
    } catch (cause) {
      handleError(cause, "Không thể cập nhật tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createForm.password.length < 8 || createForm.password.length > 72) {
      setError({ message: "Mật khẩu khởi tạo phải từ 8 đến 72 ký tự." });
      return;
    }

    setBusy(true);
    setError(null);
    setSaved("");
    try {
      await adminUsersService.create({
        email: createForm.email,
        password: createForm.password,
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        username: createForm.username || undefined,
        phoneNumber: createForm.phoneNumber || undefined,
        roleCodes: [createForm.roleCode],
      });
      setSaved(`Đã khởi tạo tài khoản "${createForm.email}" với vai trò ${createForm.roleCode}.`);
      setCreateOpen(false);
      setCreateForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        username: "",
        phoneNumber: "",
        roleCode: "SupportStaff",
      });
      users.reload();
    } catch (cause) {
      handleError(cause, "Không thể tạo tài khoản mới.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Quản lý tài khoản"
        title="Quản lý tài khoản"
        description="Tra cứu, khởi tạo tài khoản nội bộ, chỉnh sửa hồ sơ, điều chỉnh điểm uy tín và xử lý trạng thái tài khoản."
        action={
          <button
            type="button"
            className="button button-primary button-small"
            onClick={() => {
              setError(null);
              setSaved("");
              setCreateOpen(true);
            }}
          >
            + Tạo tài khoản nội bộ
          </button>
        }
      />

      {saved && !selected && (
        <p role="status" className="form-success">
          {saved}
        </p>
      )}

      <SectionHeading title="Danh sách tài khoản" />
      <Card>
        <form
          className="toolbar"
          onSubmit={applySearch}
          style={{ display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap" }}
        >
          <label className="field-wrap" style={{ flex: "1 1 240px", minWidth: 200 }}>
            <span>Tìm tên hoặc email</span>
            <input
              className="field"
              type="search"
              placeholder="Nhập tên, email hoặc SĐT..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <label className="field-wrap" style={{ flex: "1 1 200px", minWidth: 160 }}>
            <span>Vai trò</span>
            <select
              className="select-field"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vai trò</option>
              <option value="Buyer">Buyer</option>
              <option value="Seller">Seller</option>
              <option value="SupportStaff">Staff</option>
              <option value="Admin">Admin</option>
            </select>
          </label>
          <label className="field-wrap" style={{ flex: "1 1 200px", minWidth: 160 }}>
            <span>Trạng thái</span>
            <select
              className="select-field"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Banned">Đã cấm</option>
              <option value="PendingVerification">Chờ xác thực</option>
              <option value="Deleted">Đã xóa</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <button type="submit" className="button button-primary" style={{ minWidth: 100 }}>
              Tìm kiếm
            </button>
            {(keyword || role || status) && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setKeyword("");
                  setRole("");
                  setStatus("");
                  setPage(1);
                }}
              >
                Đặt lại
              </button>
            )}
          </div>
        </form>

        {users.error && (
          <p role="alert" className="notice">
            {users.error.message}
          </p>
        )}

        {records.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Vai trò chính</th>
                  <th>Uy tín</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((user) => (
                  <tr
                    key={userId(user)}
                    className="clickable-user-row"
                    onClick={() => select(userId(user))}
                  >
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
                    <td>
                      <Badge tone={roleTone(getPrimaryRole(user))}>
                        {getPrimaryRole(user)}
                      </Badge>
                    </td>
                    <td>
                      <div>
                        {user.isSeller && <small style={{ color: "var(--muted)" }}>Buyer: </small>}
                        <strong>{user.reputationScore ?? 50}</strong>
                        {user.trustLevel && (
                          <small style={{ color: "var(--muted)", marginLeft: "4px" }}>
                            ({user.trustLevel})
                          </small>
                        )}
                      </div>
                      {user.isSeller && (
                        <div style={{ marginTop: "2px" }}>
                          <small style={{ color: "var(--muted)" }}>Seller: </small>
                          <strong style={{ color: "#b45309" }}>{user.sellerReputationScore ?? 50}</strong>
                          {user.sellerTrustLevel && (
                            <small style={{ color: "var(--muted)", marginLeft: "4px" }}>
                              ({user.sellerTrustLevel})
                            </small>
                          )}
                        </div>
                      )}
                    </td>
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
          <NoData
            title={
              users.loading
                ? "Đang tải tài khoản…"
                : users.error
                  ? "Không tải được tài khoản"
                  : "Không có tài khoản phù hợp"
            }
          />
        )}

        {users.data && (
          <AdminPagination
            page={page}
            pageSize={users.data.limit}
            totalItems={users.data.total}
            loading={users.loading}
            onPageChange={(nextPage) => setPage(nextPage)}
            itemLabel="tài khoản"
          />
        )}
      </Card>

      {/* Modal 1: User Detail & Operations */}
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
                <h2 id="user-modal-title">Chi tiết & Quản trị tài khoản</h2>
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
            {detail.error && (
              <p role="alert" className="notice">
                {detail.error.message}
              </p>
            )}
            {error && (
              <div role="alert" className="notice">
                <p>{error.message}</p>
                {error.traceId && (
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void copyTraceId(error.traceId!)}
                  >
                    {copiedTrace ? "Đã sao chép Trace ID" : `Copy Trace ID: ${error.traceId}`}
                  </button>
                )}
              </div>
            )}
            {saved && (
              <p role="status" className="form-success">
                {saved}
              </p>
            )}

            {detail.data && (
              <>
                <div style={{ display: "grid", gap: "10px", marginBottom: "16px" }}>
                  <div className="info-row">
                    <span>Họ và tên</span>
                    <strong>{userName(detail.data)}</strong>
                  </div>
                  <div className="info-row">
                    <span>Email</span>
                    <strong>{detail.data.email}</strong>
                  </div>
                  {detail.data.username && (
                    <div className="info-row">
                      <span>Tên đăng nhập</span>
                      <strong>@{detail.data.username}</strong>
                    </div>
                  )}
                  <div className="info-row">
                    <span>Số điện thoại</span>
                    <strong>{detail.data.phoneNumber ?? "—"}</strong>
                  </div>
                  {detail.data.identifyNumber && (
                    <div className="info-row">
                      <span>Số CCCD/Định danh (Bảo vệ PII)</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong>
                          {showFullCccd
                            ? detail.data.identifyNumber
                            : maskIdentifyNumber(detail.data.identifyNumber)}
                        </strong>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => setShowFullCccd((prev) => !prev)}
                        >
                          {showFullCccd ? "Ẩn bớt" : "Hiện đầy đủ"}
                        </button>
                      </div>
                    </div>
                  )}
                  {detail.data.address && (
                    <div className="info-row">
                      <span>Địa chỉ</span>
                      <strong>{detail.data.address}</strong>
                    </div>
                  )}
                  <div className="info-row">
                    <span>Vai trò chính</span>
                    <Badge tone={roleTone(getPrimaryRole(detail.data))}>
                      {getPrimaryRole(detail.data)}
                    </Badge>
                  </div>
                  <div className="info-row">
                    <span>Trạng thái</span>
                    <Badge tone={userStatusTone(detail.data.status)}>
                      {userStatusLabel(detail.data.status)}
                    </Badge>
                  </div>
                  {detail.data.reputationScore != null && (
                    <div className="info-row">
                      <span>Điểm uy tín Buyer</span>
                      <strong>
                        {detail.data.reputationScore} ({detail.data.trustLevel ?? "Standard"})
                      </strong>
                    </div>
                  )}
                  {(detail.data.isSeller || detail.data.sellerReputationScore != null) && (
                    <div className="info-row">
                      <span>Điểm uy tín Seller</span>
                      <strong>
                        {detail.data.sellerReputationScore ?? 50} ({detail.data.sellerTrustLevel ?? "Standard"})
                      </strong>
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

                {((detail.data.reputationLogs && detail.data.reputationLogs.length > 0) || showReputationHistory) && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "14px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                        Lịch sử biến động điểm uy tín
                      </span>
                      {reputationLoading && <small style={{ color: "var(--muted)" }}>Đang tải…</small>}
                    </div>

                    {reputationLoading ? (
                      <p style={{ fontSize: "12px", color: "var(--muted)", margin: "8px 0" }}>
                        Đang truy vấn lịch sử uy tín từ máy chủ…
                      </p>
                    ) : (reputationLogs.length > 0 || (detail.data.reputationLogs && detail.data.reputationLogs.length > 0)) ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                        {(reputationLogs.length > 0 ? reputationLogs : detail.data.reputationLogs ?? []).map((log: AdminUserReputationLog, idx: number) => {
                          const delta = Number(log.changeAmount ?? log.delta ?? 0);
                          const isPositive = delta > 0;
                          return (
                            <div
                              key={log.id || log.logId || idx}
                              style={{
                                padding: "8px 10px",
                                backgroundColor: "#f8fafc",
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                fontSize: "12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Badge tone={String(log.targetRole ?? "").toLowerCase() === "seller" ? "amber" : "slate"}>
                                    {log.targetRole ?? "Buyer"}
                                  </Badge>
                                  <strong style={{ color: isPositive ? "#16a34a" : delta < 0 ? "#dc2626" : "var(--ink)" }}>
                                    {isPositive ? `+${delta}` : delta} điểm
                                  </strong>
                                  {log.scoreAfter != null && (
                                    <span style={{ color: "var(--muted)" }}>
                                      (Sau: {log.scoreAfter})
                                    </span>
                                  )}
                                </span>
                                <small style={{ color: "var(--muted)" }}>
                                  {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "—"}
                                </small>
                              </div>
                              {(log.note || log.reason) && (
                                <div style={{ color: "var(--ink)", marginTop: "2px" }}>
                                  Lý do: <strong>{log.note || log.reason}</strong>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ fontSize: "12px", color: "var(--muted)", margin: "8px 0" }}>
                        Chưa có dữ liệu biến động điểm uy tín nào được ghi nhận cho tài khoản này.
                      </p>
                    )}
                  </div>
                )}

                <div
                  className="action-row"
                  style={{ borderTop: "1px solid var(--line)", paddingTop: "14px", flexWrap: "wrap" }}
                >
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    disabled={busy}
                    onClick={openRolesAction}
                  >
                    Quản lý vai trò
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    disabled={busy}
                    onClick={openEditProfileAction}
                  >
                    Cập nhật hồ sơ
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    disabled={busy}
                    onClick={openReputationAction}
                  >
                    Chỉnh điểm uy tín
                  </button>
                  <button
                    type="button"
                    className={`button button-small ${showReputationHistory ? "button-primary" : "button-secondary"}`}
                    disabled={busy}
                    onClick={toggleReputationHistory}
                  >
                    {showReputationHistory ? "Ẩn lịch sử uy tín" : "Nhật ký uy tín"}
                  </button>
                  {currentStatus !== "BANNED" && currentStatus !== "DELETED" && (
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      disabled={busy}
                      onClick={() => {
                        setAction("ban");
                        setReason("");
                        setError(null);
                      }}
                    >
                      Khóa tài khoản (Ban)
                    </button>
                  )}
                  {currentStatus === "BANNED" && (
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      disabled={busy}
                      onClick={() => {
                        setAction("unban");
                        setReason("");
                        setError(null);
                      }}
                    >
                      Mở khóa
                    </button>
                  )}
                  {currentStatus !== "DELETED" && (
                    <button
                      type="button"
                      className="button button-danger button-small"
                      disabled={busy}
                      onClick={() => {
                        setAction("delete");
                        setReason("");
                        setError(null);
                      }}
                    >
                      Xóa mềm
                    </button>
                  )}
                </div>

                {action === "roles" && (
                  <form className="auth-fields" onSubmit={(event) => void submitAction(event)} style={{ marginTop: "14px" }}>
                    <label className="field-wrap">
                      Vai trò chính
                      <select
                        className="select-field"
                        value={roleForm.roleCode}
                        onChange={(event) => setRoleForm((value) => ({ ...value, roleCode: event.target.value }))}
                      >
                        <option value="Buyer">Buyer (Người mua)</option>
                        <option value="SupportStaff">SupportStaff (Nhân viên vận hành)</option>
                        <option value="Admin">Admin (Quản trị viên)</option>
                        {canonicalRoleCode(getPrimaryRole(detail.data)) === "Seller" && (
                          <option value="Seller">Seller (Người bán)</option>
                        )}
                      </select>
                    </label>
                    <p className="status-note">Vai trò Seller chỉ được cấp qua quy trình duyệt hồ sơ người bán.</p>
                    <label className="field-wrap">
                      Lý do thay đổi vai trò
                      <textarea
                        className="textarea-field"
                        required
                        value={roleForm.reason}
                        onChange={(event) => setRoleForm((value) => ({ ...value, reason: event.target.value }))}
                      />
                    </label>
                    <div className="action-row">
                      <button className="button button-primary" disabled={busy || !roleForm.reason.trim() || roleForm.roleCode === canonicalRoleCode(getPrimaryRole(detail.data))}>
                        {busy ? "Đang lưu…" : "Lưu vai trò"}
                      </button>
                      <button type="button" className="button button-secondary" disabled={busy} onClick={() => setAction(null)}>
                        Hủy
                      </button>
                    </div>
                  </form>
                )}

                {/* Form for Ban / Unban / Delete */}
                {(action === "ban" || action === "unban" || action === "delete") && (
                  <form
                    className="auth-fields"
                    onSubmit={(event) => void submitAction(event)}
                    style={{ marginTop: "14px" }}
                  >
                    {action === "ban" && (
                      <p className="status-note">
                        Hiện dùng Ban để khóa tài khoản; toàn bộ phiên đăng nhập của người dùng sẽ bị thu hồi ngay lập tức.
                      </p>
                    )}
                    <label className="field-wrap">
                      Lý do {action === "ban" ? "khóa" : action === "unban" ? "mở khóa" : "xóa"}{" "}
                      <span style={{ color: "var(--red)" }}>*</span>
                      <textarea
                        className="textarea-field"
                        required
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </label>
                    <div className="action-row">
                      <button className={"button " + (action === "ban" || action === "delete" ? "button-danger" : "button-primary")} disabled={busy || !reason.trim()}>
                        {busy ? "Đang xử lý…" : "Xác nhận"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => setAction(null)}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}

                {/* Form for Edit Profile (PUT /api/v1/admin/users/{id}) */}
                {action === "editProfile" && (
                  <form
                    className="auth-fields"
                    onSubmit={(event) => void submitAction(event)}
                    style={{ marginTop: "14px" }}
                  >
                    <div className="form-grid">
                      <label className="field-wrap">
                        Họ (First Name) <span style={{ color: "var(--red)" }}>*</span>
                        <input
                          className="field"
                          required
                          value={profileForm.firstName}
                          onChange={(e) =>
                            setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field-wrap">
                        Tên (Last Name) <span style={{ color: "var(--red)" }}>*</span>
                        <input
                          className="field"
                          required
                          value={profileForm.lastName}
                          onChange={(e) =>
                            setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field-wrap">
                        Số điện thoại
                        <input
                          className="field"
                          value={profileForm.phoneNumber}
                          onChange={(e) =>
                            setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
                          }
                        />
                      </label>
                      <label className="field-wrap">
                        Trạng thái
                        <select
                          className="select-field"
                          value={profileForm.status}
                          onChange={(e) =>
                            setProfileForm((prev) => ({ ...prev, status: e.target.value }))
                          }
                        >
                          <option value="Active">Active (Đang hoạt động)</option>
                          <option value="PendingVerification">PendingVerification (Chờ xác thực)</option>
                        </select>
                      </label>
                    </div>
                    <label className="field-wrap">
                      Lý do cập nhật hồ sơ <span style={{ color: "var(--red)" }}>*</span>
                      <input
                        className="field"
                        required
                        value={profileForm.reason}
                        onChange={(e) =>
                          setProfileForm((prev) => ({ ...prev, reason: e.target.value }))
                        }
                      />
                    </label>
                    <div className="action-row">
                      <button type="submit" className="button button-primary" disabled={busy}>
                        {busy ? "Đang lưu…" : "Lưu thay đổi hồ sơ"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => setAction(null)}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}

                {/* Form for Adjust Reputation (PATCH /api/v1/admin/users/{id}/reputation) */}
                {action === "reputation" && (
                  <form
                    className="auth-fields"
                    onSubmit={(event) => void submitAction(event)}
                    style={{ marginTop: "14px" }}
                  >
                    <div className="form-grid">
                      <label className="field-wrap">
                        Quỹ điểm mục tiêu (TargetRole)
                        <select
                          className="select-field"
                          value={repForm.targetRole}
                          onChange={(e) =>
                            setRepForm((prev) => ({
                              ...prev,
                              targetRole: e.target.value as "Buyer" | "Seller",
                            }))
                          }
                        >
                          <option value="Buyer">Buyer (Người mua)</option>
                          {detail.data?.isSeller || (detail.data?.roles ?? []).some((r: string) => r.toLowerCase() === "seller") ? (
                            <option value="Seller">Seller (Người bán)</option>
                          ) : (
                            <option value="Seller" disabled>
                              Seller (Tài khoản không có vai trò Seller)
                            </option>
                          )}
                        </select>
                      </label>
                      <label className="field-wrap">
                        Điểm thay đổi (-50 đến +50, khác 0) <span style={{ color: "var(--red)" }}>*</span>
                        <input
                          className="field"
                          type="number"
                          min="-50"
                          max="50"
                          step="1"
                          required
                          value={repForm.scoreDelta}
                          onChange={(e) =>
                            setRepForm((prev) => ({ ...prev, scoreDelta: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <label className="field-wrap">
                      Lý do điều chỉnh (10 – 500 ký tự) <span style={{ color: "var(--red)" }}>*</span>
                      <textarea
                        className="textarea-field"
                        required
                        minLength={10}
                        maxLength={500}
                        placeholder="Nhập lý do chi tiết tối thiểu 10 ký tự..."
                        value={repForm.reason}
                        onChange={(e) =>
                          setRepForm((prev) => ({ ...prev, reason: e.target.value }))
                        }
                      />
                    </label>
                    <div className="action-row">
                      <button type="submit" className="button button-primary" disabled={busy}>
                        {busy ? "Đang cập nhật…" : "Xác nhận chỉnh điểm"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => setAction(null)}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    borderTop: "1px solid var(--line)",
                    paddingTop: "16px",
                    marginTop: "16px",
                  }}
                >
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={close}
                    disabled={busy}
                  >
                    Đóng
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* Modal 2: Create Internal / System User (POST /api/v1/admin/users) */}
      {createOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setCreateOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) setCreateOpen(false);
          }}
        >
          <section
            className="admin-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="create-user-modal-title">Khởi tạo tài khoản mới</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Khởi tạo tài khoản quản trị hoặc nhân viên mới trong hệ thống.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setCreateOpen(false)}
                disabled={busy}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            {error && (
              <div role="alert" className="notice">
                <p>{error.message}</p>
                {error.traceId && (
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void copyTraceId(error.traceId!)}
                  >
                    {copiedTrace ? "Đã sao chép Trace ID" : `Copy Trace ID: ${error.traceId}`}
                  </button>
                )}
              </div>
            )}

            <form className="auth-fields" onSubmit={(e) => void submitCreateUser(e)}>
              <div className="form-grid">
                <label className="field-wrap">
                  Email đăng nhập <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    className="field"
                    type="email"
                    required
                    placeholder="staff.new@nexus.local"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </label>

                <label className="field-wrap">
                  Mật khẩu khởi tạo (8 – 72 ký tự) <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    className="field"
                    type="password"
                    required
                    minLength={8}
                    maxLength={72}
                    placeholder="Nhập mật khẩu an toàn..."
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                  />
                </label>

                <label className="field-wrap">
                  Họ (First Name) <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    className="field"
                    required
                    value={createForm.firstName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                  />
                </label>

                <label className="field-wrap">
                  Tên (Last Name) <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    className="field"
                    required
                    value={createForm.lastName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                  />
                </label>

                <label className="field-wrap">
                  Username (3 – 50 ký tự, tùy chọn)
                  <input
                    className="field"
                    minLength={3}
                    maxLength={50}
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, username: e.target.value }))
                    }
                  />
                </label>

                <label className="field-wrap">
                  Số điện thoại
                  <input
                    className="field"
                    value={createForm.phoneNumber}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="field-wrap">
                Vai trò chính (1-User 1-Primary-Role) <span style={{ color: "var(--red)" }}>*</span>
                <select
                  className="select-field"
                  value={createForm.roleCode}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, roleCode: e.target.value }))
                  }
                >
                  <option value="SupportStaff">Staff (Nhân viên vận hành - SupportStaff)</option>
                  <option value="Admin">Admin (Quản trị viên hệ thống)</option>
                  <option value="Buyer">Buyer (Người mua / Khách hàng)</option>
                </select>
                <small style={{ color: "var(--muted)" }}>
                  Lưu ý: Vai trò Seller không được phép tạo trực tiếp bởi Admin (CANNOT_CREATE_SELLER) mà bắt buộc qua quy trình duyệt hồ sơ KYC.
                </small>
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  borderTop: "1px solid var(--line)",
                  paddingTop: "16px",
                }}
              >
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => setCreateOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={busy}>
                  {busy ? "Đang khởi tạo…" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
