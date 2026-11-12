"use client";

import { useState, type FormEvent } from "react";
import { AdminPagination, Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { CopyableId } from "@/components/ui/CopyableId";
import { ApiError } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { adminUsersService, type AdminUserReputationLog } from "./services/admin-users.service";
import { AdminRolesScreen } from "./AdminRolesScreen";
import {
  userId,
  userName,
  maskIdentifyNumber,
  userStatusLabel,
  userStatusTone,
  getPrimaryRole,
  canonicalRoleCode,
  roleTone,
  extractAdminError,
  SELLER_POLICY_CLAUSES,
  ACCOUNT_BAN_POLICY_CLAUSES,
} from "./services/admin-helpers";

type Action = "ban" | "unban" | "delete" | "editProfile" | "reputation" | "roles" | "suspendShop" | "reactivateShop";

function sellerShopStatusTone(status?: string | null): "amber" | "green" | "sky" | "slate" {
  if (!status) return "slate";
  const s = status.toUpperCase();
  if (s === "SUSPENDED") return "amber";
  if (s === "PENDING") return "sky";
  if (s === "REJECTED") return "slate";
  if (s === "APPROVED") return "green";
  return "slate";
}

function sellerShopStatusLabel(status?: string | null): string {
  if (!status) return "Chưa có hồ sơ Shop";
  const s = status.toUpperCase();
  if (s === "SUSPENDED") return "Tạm đình chỉ (Shop)";
  if (s === "PENDING") return "Chờ duyệt KYC (Shop)";
  if (s === "REJECTED") return "Bị từ chối KYC (Shop)";
  if (s === "APPROVED") return "Đang hoạt động (Shop)";
  return status;
}

export function AdminUsersScreen() {
  const [activeTab, setActiveTab] = useState<"users" | "roles">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("tab") === "roles") return "roles";
    }
    return "users";
  });
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [banPolicyClauseCode, setBanPolicyClauseCode] = useState("");
  const [banEvidenceUrls, setBanEvidenceUrls] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDurationDays, setSuspendDurationDays] = useState("7");
  const [suspendPolicyClauseCode, setSuspendPolicyClauseCode] = useState("");
  const [suspendCustomClause, setSuspendCustomClause] = useState(false);
  const [suspendEvidenceUrls, setSuspendEvidenceUrls] = useState("");
  const [banCustomClause, setBanCustomClause] = useState(false);
  const [reactivateReason, setReactivateReason] = useState("");
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
      setError(extractAdminError(cause, fallback));
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

  function resetActionState() {
    setAction(null);
    setReason("");
    setBanPolicyClauseCode("");
    setBanCustomClause(false);
    setBanEvidenceUrls("");
    setSuspendReason("");
    setSuspendDurationDays("7");
    setSuspendPolicyClauseCode("");
    setSuspendCustomClause(false);
    setSuspendEvidenceUrls("");
    setReactivateReason("");
    setError(null);
  }

  function select(id: string) {
    setSelected(id);
    resetActionState();
    setShowFullCccd(false);
    setShowReputationHistory(false);
    setReputationLogs([]);
    setSaved("");
  }

  function close() {
    setSelected("");
    resetActionState();
    setShowFullCccd(false);
    setShowReputationHistory(false);
    setReputationLogs([]);
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
        const evidenceList = banEvidenceUrls
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        await adminUsersService.ban(selected, {
          reason: reason.trim(),
          policyClauseCode: banPolicyClauseCode.trim() || undefined,
          evidenceUrls: evidenceList.length > 0 ? evidenceList : undefined,
        });
        setSaved("Đã khóa tài khoản bằng Ban.");
      } else if (action === "suspendShop") {
        if (!suspendReason.trim()) {
          setError({ message: "Vui lòng nhập lý do đình chỉ gian hàng." });
          setBusy(false);
          return;
        }
        const duration = suspendDurationDays ? parseInt(suspendDurationDays, 10) : undefined;
        const evidenceList = suspendEvidenceUrls
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        await adminUsersService.suspendSeller(selected, {
          reason: suspendReason.trim(),
          durationDays: duration && duration > 0 ? duration : undefined,
          policyClauseCode: suspendPolicyClauseCode.trim() || undefined,
          evidenceUrls: evidenceList.length > 0 ? evidenceList : undefined,
        });
        setSaved("Đã đình chỉ hoạt động gian hàng thành công.");
      } else if (action === "reactivateShop") {
        await adminUsersService.reactivateSeller(selected, {
          reason: reactivateReason.trim() || undefined,
        });
        setSaved("Đã mở lại hoạt động gian hàng thành công.");
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
      resetActionState();
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
        overline="Quản trị người dùng & phân quyền"
        title="Người dùng & Phân quyền"
        description="Tra cứu hồ sơ tài khoản toàn sàn, bổ nhiệm vai trò nhân sự và quản lý quyền hạn hệ thống."
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="button button-secondary button-small"
              disabled={users.loading}
              onClick={users.reload}
            >
              {users.loading ? "Đang làm mới…" : "Làm mới dữ liệu"}
            </button>
            {activeTab === "users" && (
              <button
                type="button"
                className="button button-primary button-small"
                onClick={() => {
                  setError(null);
                  setSaved("");
                  setCreateOpen(true);
                }}
              >
                + Thêm tài khoản
              </button>
            )}
          </div>
        }
      />

      {/* Thanh Tabs chuẩn phân tách giao diện */}
      <div
        role="tablist"
        aria-label="Phân hệ người dùng và phân quyền"
        style={{
          display: "flex",
          gap: "24px",
          borderBottom: "1px solid var(--line, #e2e8f0)",
          marginBottom: "20px",
          marginTop: "-8px",
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "users"}
          onClick={() => setActiveTab("users")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "users" ? "2px solid var(--primary, #0284c7)" : "2px solid transparent",
            padding: "8px 4px 12px",
            fontSize: "14px",
            fontWeight: 600,
            color: activeTab === "users" ? "var(--primary, #0284c7)" : "var(--muted, #64748b)",
            cursor: "pointer",
            transition: "border-color 0.12s ease, color 0.12s ease",
          }}
        >
          Danh sách tài khoản
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "roles"}
          onClick={() => setActiveTab("roles")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "roles" ? "2px solid var(--primary, #0284c7)" : "2px solid transparent",
            padding: "8px 4px 12px",
            fontSize: "14px",
            fontWeight: 600,
            color: activeTab === "roles" ? "var(--primary, #0284c7)" : "var(--muted, #64748b)",
            cursor: "pointer",
            transition: "border-color 0.12s ease, color 0.12s ease",
          }}
        >
          Vai trò & Bổ nhiệm
        </button>
      </div>

      {activeTab === "roles" ? (
        <AdminRolesScreen embedded />
      ) : (
        <>
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
            <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Người dùng</th>
                  <th style={{ width: "28%" }}>Email</th>
                  <th style={{ width: "16%" }}>Vai trò chính</th>
                  <th style={{ width: "14%" }}>Uy tín</th>
                  <th style={{ width: "14%" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {records.map((user) => (
                  <tr
                    key={userId(user)}
                    className="clickable-row"
                    onClick={() => select(userId(user))}
                    title="Nhấn để xem chi tiết & quản trị tài khoản"
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
                      <div style={{ marginTop: "4px" }} onClick={(e) => e.stopPropagation()}>
                        <CopyableId id={userId(user)} />
                      </div>
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
            className="admin-modal-dialog admin-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="user-modal-title">Chi tiết & Quản trị tài khoản</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 0" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Mã người dùng (User ID):</span>
                  <CopyableId id={selected} showFull />
                </div>
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
                <div className="admin-detail-grid-2col" style={{ marginBottom: "16px" }}>
                  {/* Cột 1: Thông tin cá nhân & Liên hệ */}
                  <div style={{ display: "grid", gap: "2px" }}>
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
                        <span>Số CCCD/Định danh (PII)</span>
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
                            style={{ minHeight: "24px", padding: "0 8px", fontSize: "11px" }}
                          >
                            {showFullCccd ? "Ẩn bớt" : "Hiện"}
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
                  </div>

                  {/* Cột 2: Vai trò, Trạng thái & Uy tín */}
                  <div style={{ display: "grid", gap: "2px" }}>
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
                        <span>Điém uy tín Seller</span>
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
                </div>

                {Boolean(detail.data.isSeller || detail.data.sellerProfile) && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>Hồ sơ & Trạng thái Shop</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Badge tone={sellerShopStatusTone(detail.data.sellerProfile?.status)}>
                          {sellerShopStatusLabel(detail.data.sellerProfile?.status)}
                        </Badge>
                        {Boolean(detail.data.sellerProfile) && (
                          (detail.data.sellerProfile?.status ?? "").toLowerCase() === "suspended" ? (
                            <button
                              type="button"
                              className="button button-small"
                              disabled={busy}
                              onClick={() => {
                                resetActionState();
                                setAction("reactivateShop");
                              }}
                              style={{ backgroundColor: "#16a34a", borderColor: "#16a34a", color: "#fff", minHeight: "26px", padding: "0 10px", fontSize: "12px" }}
                            >
                              Mở lại Shop
                            </button>
                          ) : (detail.data.sellerProfile?.status ?? "").toLowerCase() === "approved" ? (
                            <button
                              type="button"
                              className="button button-small"
                              disabled={busy}
                              onClick={() => {
                                resetActionState();
                                setAction("suspendShop");
                              }}
                              style={{ backgroundColor: "#d97706", borderColor: "#d97706", color: "#fff", minHeight: "26px", padding: "0 10px", fontSize: "12px" }}
                            >
                              Đình chỉ Shop
                            </button>
                          ) : null
                        )}
                      </div>
                    </div>
                    <div className="admin-detail-grid-2col">
                      <div style={{ display: "grid", gap: "2px" }}>
                        <div className="info-row">
                          <span>Tên gian hàng</span>
                          <strong>{detail.data.sellerProfile?.shopName || "Gian hàng cá nhân"}</strong>
                        </div>
                        {detail.data.sellerProfile?.hotline && (
                          <div className="info-row">
                            <span>Hotline shop</span>
                            <strong>{detail.data.sellerProfile.hotline}</strong>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "grid", gap: "2px" }}>
                        {detail.data.sellerProfile?.businessEmail && (
                          <div className="info-row">
                            <span>Email doanh nghiệp</span>
                            <strong>{detail.data.sellerProfile.businessEmail}</strong>
                          </div>
                        )}
                        {detail.data.sellerProfile?.pickupAddress && (
                          <div className="info-row">
                            <span>Địa chỉ kho (GHN)</span>
                            <strong>{detail.data.sellerProfile.pickupAddress}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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

                {/* Khung hành động quản trị & Chế tài (Dàn 2 cột ngang hàng) */}
                <div className="admin-modal-actions-grid">
                  {/* Phân nhóm tác vụ 1: Thao tác hồ sơ & Quản trị thông thường */}
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid var(--line)",
                      background: "var(--canvas)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", display: "block" }}>
                        Thao tác quản trị tài khoản
                      </span>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: "1.4" }}>
                        Chỉnh sửa thông tin hồ sơ và điều chỉnh điểm uy tín của thành viên.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                      <button
                        type="button"
                        className={`button button-small ${action === "editProfile" ? "button-primary" : "button-secondary"}`}
                        disabled={busy}
                        onClick={openEditProfileAction}
                      >
                        Cập nhật hồ sơ
                      </button>
                      <button
                        type="button"
                        className={`button button-small ${action === "reputation" ? "button-primary" : "button-secondary"}`}
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
                    </div>
                  </div>

                  {/* Phân nhóm tác vụ 2: Vùng chế tài & nguy hiểm (Danger Zone) */}
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1px solid #fecdd3",
                      backgroundColor: "#fff1f2",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                        Vùng chế tài & xử lý vi phạm
                      </span>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#b91c1c", lineHeight: "1.4" }}>
                        Các hành động này ảnh hưởng trực tiếp đến quyền truy cập hoặc xóa tài khoản khỏi sàn.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                      {currentStatus !== "BANNED" && currentStatus !== "DELETED" && (
                        <button
                          type="button"
                          className="button button-small"
                          disabled={busy}
                          onClick={() => {
                            resetActionState();
                            setAction("ban");
                          }}
                          style={{
                            backgroundColor: action === "ban" ? "#b91c1c" : "#dc2626",
                            borderColor: "#dc2626",
                            color: "#fff",
                          }}
                        >
                          Khóa tài khoản (Ban)
                        </button>
                      )}
                      {currentStatus === "BANNED" && (
                        <button
                          type="button"
                          className="button button-small"
                          disabled={busy}
                          onClick={() => {
                            resetActionState();
                            setAction("unban");
                          }}
                          style={{
                            backgroundColor: action === "unban" ? "#0369a1" : "#0284c7",
                            borderColor: "#0284c7",
                            color: "#fff",
                          }}
                        >
                          Mở khóa tài khoản
                        </button>
                      )}
                      {currentStatus !== "DELETED" && (
                        <button
                          type="button"
                          className="button button-small"
                          disabled={busy}
                          onClick={() => {
                            resetActionState();
                            setAction("delete");
                          }}
                          style={{
                            backgroundColor: action === "delete" ? "#fee2e2" : "#fff",
                            borderColor: "#dc2626",
                            color: "#dc2626",
                            fontWeight: 600,
                          }}
                        >
                          Xóa mềm
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Khung thao tác hành động đang chọn (Active Action Panel) */}
                {action && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "16px",
                      borderRadius: "10px",
                      border: `1px solid ${action === "ban" || action === "delete" || action === "suspendShop" ? "#fca5a5" : "var(--line)"}`,
                      backgroundColor: action === "ban" || action === "delete" || action === "suspendShop" ? "#fef2f2" : "#f8fafc",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                        borderBottom: `1px solid ${action === "ban" || action === "delete" || action === "suspendShop" ? "#fecaca" : "var(--line)"}`,
                        paddingBottom: "8px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          fontWeight: 700,
                          color: action === "ban" || action === "delete" || action === "suspendShop" ? "#b91c1c" : "var(--ink)",
                        }}
                      >
                        {action === "roles" && "Bổ nhiệm & Quản lý vai trò"}
                        {action === "editProfile" && "Cập nhật hồ sơ tài khoản"}
                        {action === "reputation" && "Điều chỉnh điểm uy tín"}
                        {action === "ban" && "Chế tài: Khóa tài khoản (Ban)"}
                        {action === "unban" && "Khôi phục: Mở khóa tài khoản"}
                        {action === "delete" && "Cảnh báo: Xóa mềm tài khoản"}
                        {action === "suspendShop" && "Đình chỉ hoạt động gian hàng (Shop)"}
                        {action === "reactivateShop" && "Mở lại hoạt động gian hàng (Shop)"}
                      </h3>
                      <button
                        type="button"
                        className="admin-modal-close-btn"
                        onClick={() => resetActionState()}
                        disabled={busy}
                        aria-label="Đóng form"
                        title="Đóng form"
                        style={{ width: "26px", height: "26px", fontSize: "14px" }}
                      >
                        ✕
                      </button>
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

                    {action === "ban" && (
                      <>
                        <label className="field-wrap">
                          Phân loại vi phạm (tùy chọn)
                          <select
                            className="select-field"
                            value={banCustomClause ? "OTHER" : banPolicyClauseCode}
                            onChange={(e) => {
                              if (e.target.value === "OTHER") {
                                setBanCustomClause(true);
                                setBanPolicyClauseCode("");
                              } else {
                                setBanCustomClause(false);
                                setBanPolicyClauseCode(e.target.value);
                              }
                            }}
                          >
                            {ACCOUNT_BAN_POLICY_CLAUSES.map((clause) => (
                              <option key={clause.code} value={clause.code}>
                                {clause.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {banCustomClause && (
                          <label className="field-wrap">
                            Nhập phân loại vi phạm riêng
                            <input
                              type="text"
                              className="field"
                              maxLength={100}
                              placeholder="Ví dụ: Lạm dụng hoàn tiền, tạo tài khoản ảo số lượng lớn..."
                              value={banPolicyClauseCode}
                              onChange={(e) => setBanPolicyClauseCode(e.target.value)}
                            />
                          </label>
                        )}
                        <label className="field-wrap">
                          URL bằng chứng vi phạm (mỗi dòng một URL)
                          <textarea
                            className="textarea-field"
                            rows={3}
                            placeholder="https://evidence.example.com/proof1.png&#10;https://evidence.example.com/proof2.pdf"
                            value={banEvidenceUrls}
                            onChange={(e) => setBanEvidenceUrls(e.target.value)}
                          />
                        </label>
                      </>
                    )}

                    <div className="action-row">
                      <button className={"button " + (action === "ban" || action === "delete" ? "button-danger" : "button-primary")} disabled={busy || !reason.trim()}>
                        {busy ? "Đang xử lý…" : "Xác nhận"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => resetActionState()}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}

                {/* Form for Suspend Shop */}
                {action === "suspendShop" && (
                  <form
                    className="auth-fields"
                    onSubmit={(event) => void submitAction(event)}
                    style={{ marginTop: "14px" }}
                  >
                    <div style={{ padding: "10px 12px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "13px", color: "#92400e" }}>
                      Đình chỉ Shop sẽ đóng quyền bán hàng (ShopStatus = Suspended), nhưng vẫn bảo toàn quyền mua sắm cá nhân của người dùng.
                    </div>
                    <label className="field-wrap">
                      Lý do đình chỉ gian hàng <span style={{ color: "var(--red)" }}>*</span>
                      <textarea
                        className="textarea-field"
                        required
                        maxLength={1000}
                        placeholder="Nhập lý do chi tiết..."
                        value={suspendReason}
                        onChange={(event) => setSuspendReason(event.target.value)}
                      />
                    </label>
                    <label className="field-wrap">
                      Thời hạn đình chỉ
                      <select
                        className="select-field"
                        value={suspendDurationDays}
                        onChange={(e) => setSuspendDurationDays(e.target.value)}
                      >
                        <option value="3">3 ngày</option>
                        <option value="7">7 ngày (1 tuần)</option>
                        <option value="14">14 ngày (2 tuần)</option>
                        <option value="30">30 ngày (1 tháng)</option>
                        <option value="90">90 ngày (3 tháng)</option>
                        <option value="">Không thời hạn (Cho đến khi mở lại)</option>
                      </select>
                    </label>
                    <label className="field-wrap">
                      Phân loại vi phạm (tùy chọn)
                      <select
                        className="select-field"
                        value={suspendCustomClause ? "OTHER" : suspendPolicyClauseCode}
                        onChange={(e) => {
                          if (e.target.value === "OTHER") {
                            setSuspendCustomClause(true);
                            setSuspendPolicyClauseCode("");
                          } else {
                            setSuspendCustomClause(false);
                            setSuspendPolicyClauseCode(e.target.value);
                          }
                        }}
                      >
                        {SELLER_POLICY_CLAUSES.map((clause) => (
                          <option key={clause.code} value={clause.code}>
                            {clause.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {suspendCustomClause && (
                      <label className="field-wrap">
                        Nhập phân loại vi phạm riêng
                        <input
                          type="text"
                          className="field"
                          maxLength={100}
                          placeholder="Ví dụ: Đóng gói sai quy cách, gửi thiếu linh kiện..."
                          value={suspendPolicyClauseCode}
                          onChange={(e) => setSuspendPolicyClauseCode(e.target.value)}
                        />
                      </label>
                    )}
                    <label className="field-wrap">
                      URL bằng chứng vi phạm (mỗi dòng một URL)
                      <textarea
                        className="textarea-field"
                        rows={2}
                        placeholder="https://..."
                        value={suspendEvidenceUrls}
                        onChange={(e) => setSuspendEvidenceUrls(e.target.value)}
                      />
                    </label>
                    <div className="action-row">
                      <button
                        className="button button-danger"
                        disabled={busy || !suspendReason.trim()}
                      >
                        {busy ? "Đang xử lý…" : "Xác nhận đình chỉ Shop"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => resetActionState()}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}

                {/* Form for Reactivate Shop */}
                {action === "reactivateShop" && (
                  <form
                    className="auth-fields"
                    onSubmit={(event) => void submitAction(event)}
                    style={{ marginTop: "14px" }}
                  >
                    <div style={{ padding: "10px 12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "13px", color: "#166534" }}>
                      Mở lại gian hàng sẽ khôi phục trạng thái hoạt động của Shop (ShopStatus = Active) và thu hồi các án phạt hạn chế bán hàng.
                    </div>
                    <label className="field-wrap">
                      Lý do mở lại gian hàng (tùy chọn)
                      <textarea
                        className="textarea-field"
                        maxLength={1000}
                        placeholder="Gian hàng đã khắc phục đầy đủ vi phạm / khiếu nại thành công..."
                        value={reactivateReason}
                        onChange={(event) => setReactivateReason(event.target.value)}
                      />
                    </label>
                    <div className="action-row">
                      <button
                        className="button button-primary"
                        disabled={busy}
                        style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                      >
                        {busy ? "Đang xử lý…" : "Xác nhận mở lại Shop"}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={busy}
                        onClick={() => resetActionState()}
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
                {action === "reputation" && (() => {
                  const isEligibleSeller = Boolean(
                    detail.data?.isSeller ||
                    (detail.data?.roles ?? []).some((r: string) => r.toLowerCase() === "seller")
                  );
                  const currentScore = repForm.targetRole === "Seller"
                    ? (detail.data.sellerReputationScore ?? 50)
                    : (detail.data.reputationScore ?? 50);
                  const delta = parseInt(repForm.scoreDelta || "0", 10) || 0;
                  const projectedScore = Math.max(0, currentScore + delta);

                  return (
                    <form
                      className="auth-fields"
                      onSubmit={(event) => void submitAction(event)}
                      style={{ marginTop: "14px", display: "grid", gap: "14px" }}
                    >
                      {/* Chọn quỹ điểm */}
                      <div>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                          Quỹ điểm áp dụng
                        </span>
                        {isEligibleSeller ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              className={`button button-small ${repForm.targetRole === "Buyer" ? "button-primary" : "button-secondary"}`}
                              onClick={() => setRepForm((prev) => ({ ...prev, targetRole: "Buyer" }))}
                            >
                              Người mua (Buyer)
                            </button>
                            <button
                              type="button"
                              className={`button button-small ${repForm.targetRole === "Seller" ? "button-primary" : "button-secondary"}`}
                              onClick={() => setRepForm((prev) => ({ ...prev, targetRole: "Seller" }))}
                            >
                              Người bán (Seller)
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Badge tone="slate">Buyer (Người mua)</Badge>
                            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                              Tài khoản chưa kích hoạt vai trò Seller
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Khối xem trước biến động điểm (Score Preview) */}
                      <div
                        style={{
                          padding: "12px 16px",
                          borderRadius: "8px",
                          backgroundColor: delta > 0 ? "#f0fdf4" : delta < 0 ? "#fef2f2" : "#f8fafc",
                          border: `1px solid ${delta > 0 ? "#bbf7d0" : delta < 0 ? "#fecaca" : "#e2e8f0"}`,
                          display: "grid",
                          gridTemplateColumns: "1fr auto 1fr",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <small style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Điểm hiện tại</small>
                          <strong style={{ fontSize: "17px", color: "var(--ink)" }}>{currentScore}</strong>
                        </div>
                        <div style={{ textAlign: "center", padding: "0 8px" }}>
                          <small style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Biến động</small>
                          <strong
                            style={{
                              fontSize: "17px",
                              color: delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "var(--muted)",
                            }}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </strong>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <small style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Điểm sau điều chỉnh</small>
                          <strong
                            style={{
                              fontSize: "17px",
                              color: delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "var(--ink)",
                            }}
                          >
                            {projectedScore}
                          </strong>
                        </div>
                      </div>

                      {/* Chọn nhanh & Nhập điểm */}
                      <div className="field-wrap">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>
                            Số điểm điều chỉnh (-50 đến +50, khác 0) <span style={{ color: "var(--red)" }}>*</span>
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                          {[5, 10, 20].map((num) => (
                            <button
                              key={num}
                              type="button"
                              className="button button-small"
                              style={{
                                backgroundColor: repForm.scoreDelta === String(num) ? "#16a34a" : "#f0fdf4",
                                borderColor: "#bbf7d0",
                                color: repForm.scoreDelta === String(num) ? "#fff" : "#166534",
                                minHeight: "28px",
                                padding: "0 10px",
                                fontSize: "12px",
                              }}
                              onClick={() => setRepForm((prev) => ({ ...prev, scoreDelta: String(num) }))}
                            >
                              +{num}
                            </button>
                          ))}
                          {[-5, -10, -20].map((num) => (
                            <button
                              key={num}
                              type="button"
                              className="button button-small"
                              style={{
                                backgroundColor: repForm.scoreDelta === String(num) ? "#dc2626" : "#fef2f2",
                                borderColor: "#fecaca",
                                color: repForm.scoreDelta === String(num) ? "#fff" : "#991b1b",
                                minHeight: "28px",
                                padding: "0 10px",
                                fontSize: "12px",
                              }}
                              onClick={() => setRepForm((prev) => ({ ...prev, scoreDelta: String(num) }))}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                        <input
                          className="field"
                          type="number"
                          min="-50"
                          max="50"
                          step="1"
                          required
                          placeholder="Hoặc nhập số điểm (-50 đến +50)..."
                          value={repForm.scoreDelta}
                          onChange={(e) =>
                            setRepForm((prev) => ({ ...prev, scoreDelta: e.target.value }))
                          }
                        />
                      </div>

                      {/* Lý do điều chỉnh */}
                      <label className="field-wrap">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>
                            Lý do điều chỉnh <span style={{ color: "var(--red)" }}>*</span>
                          </span>
                          <small style={{ color: repForm.reason.trim().length < 10 ? "var(--red)" : "var(--muted)", fontSize: "11px" }}>
                            {repForm.reason.length}/500 ký tự (tối thiểu 10)
                          </small>
                        </div>
                        <textarea
                          className="textarea-field"
                          required
                          minLength={10}
                          maxLength={500}
                          rows={3}
                          placeholder="Nhập lý do chi tiết tối thiểu 10 ký tự (ví dụ: Khách hàng xử lý khiếu nại tích cực, vi phạm thời gian phản hồi...)"
                          value={repForm.reason}
                          onChange={(e) =>
                            setRepForm((prev) => ({ ...prev, reason: e.target.value }))
                          }
                        />
                      </label>

                      {/* Nút hành động */}
                      <div className="action-row">
                        <button
                          type="submit"
                          className="button button-primary"
                          disabled={busy || !delta || repForm.reason.trim().length < 10}
                        >
                          {busy ? "Đang cập nhật…" : "Xác nhận chỉnh điểm"}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={busy}
                          onClick={() => resetActionState()}
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  );
                })()}
                  </div>
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
      )}
    </>
  );
}
