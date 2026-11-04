"use client";

import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { adminUsersService, type AdminUser } from "./services/admin-users.service";

type BadgeTone = "sky" | "green" | "amber" | "slate" | "red" | "indigo";

export type SystemRoleItem = {
  id: string;
  code: string;
  name: string;
  description: string;
  tone: BadgeTone;
  status: string;
  userCount?: number;
};

const DEFAULT_SYSTEM_ROLES: SystemRoleItem[] = [
  {
    id: "Admin",
    code: "Admin",
    name: "Admin (Quản trị viên)",
    description: "Toàn quyền quản trị hệ thống: kiểm soát tài khoản người dùng, giám sát các phiên đấu giá trực tiếp, tra cứu nhật ký kiểm toán và cấu hình toàn sàn.",
    tone: "indigo",
    status: "Đang hoạt động",
  },
  {
    id: "SupportStaff",
    code: "SupportStaff",
    name: "Staff (Nhân viên vận hành)",
    description: "Vận hành và hỗ trợ sàn: kiểm duyệt sản phẩm đấu giá, xét duyệt hồ sơ người bán (Seller), xử lý khiếu nại báo cáo và duyệt yêu cầu rút tiền.",
    tone: "sky",
    status: "Đang hoạt động",
  },
  {
    id: "Seller",
    code: "Seller",
    name: "Seller (Người bán)",
    description: "Tài khoản người bán hàng: đăng tải sản phẩm, quản lý kho hàng, tạo và quản lý phiên đấu giá trực tiếp, theo dõi đơn bán và số dư ví.",
    tone: "amber",
    status: "Đang hoạt động",
  },
  {
    id: "Buyer",
    code: "Buyer",
    name: "Buyer (Người mua / Khách hàng)",
    description: "Khách hàng mua sắm: tham gia phòng đấu giá trực tiếp, đặt giá thầu (bids), thanh toán đơn trúng đấu giá và quản lý ví tiền.",
    tone: "slate",
    status: "Đang hoạt động",
  },
];

function normalizeRoleCode(role: string): string {
  return role.toLowerCase().replace(/^role_/, "");
}

function canonicalRoleCode(role: string): string {
  const norm = normalizeRoleCode(role);
  if (norm === "admin") return "Admin";
  if (norm === "supportstaff" || norm === "staff") return "SupportStaff";
  if (norm === "seller") return "Seller";
  if (norm === "buyer" || norm === "customer") return "Buyer";
  return role;
}

function roleTone(role: string): BadgeTone {
  const r = normalizeRoleCode(role);
  if (r.includes("admin")) return "indigo";
  if (r.includes("staff")) return "sky";
  if (r.includes("seller")) return "amber";
  return "slate";
}

function userMatchesRole(user: AdminUser, targetRoleCode: string): boolean {
  const target = normalizeRoleCode(targetRoleCode);
  const match = (r: string) => {
    const nr = normalizeRoleCode(r);
    if (target === "supportstaff" || target === "staff") {
      return nr === "supportstaff" || nr === "staff";
    }
    if (target === "buyer" || target === "customer") {
      return nr === "buyer" || nr === "customer";
    }
    return nr === target;
  };

  if (Array.isArray(user.roles)) {
    return user.roles.some((r) => match(String(r)));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((user as any).role) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return match(String((user as any).role));
  }
  return true;
}

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
    PENDING: "Chờ xác thực",
    DELETED: "Đã xóa",
  };
  return status ? labels[status.toUpperCase()] ?? status : "—";
}

function userStatusTone(status?: string): BadgeTone {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return "green";
  if (s === "BANNED") return "red";
  if (s === "PENDINGVERIFICATION" || s === "PENDING_ACTIVATION" || s === "PENDING") return "amber";
  if (s === "DELETED") return "slate";
  return "sky";
}

function getUserRoles(user: AdminUser): string[] {
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((user as any).role) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return [String((user as any).role)];
  }
  return ["Buyer"];
}

function parseRolesFromApi(data: unknown): SystemRoleItem[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawList: any[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = data as any;
    rawList = Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.data)
      ? obj.data
      : Array.isArray(obj.roles)
      ? obj.roles
      : [];
  }

  if (!rawList.length) {
    return DEFAULT_SYSTEM_ROLES;
  }

  return rawList.map((item, index) => {
    const rawName = String(item.name ?? item.roleName ?? item.code ?? `Vai trò ${index + 1}`);
    const code = String(item.code ?? item.name ?? item.roleName ?? rawName);
    const id = String(item.id ?? item.roleId ?? code);
    const defaultItem = DEFAULT_SYSTEM_ROLES.find(
      (r) => normalizeRoleCode(r.code) === normalizeRoleCode(code)
    );
    return {
      id,
      code,
      name: item.displayName ?? defaultItem?.name ?? rawName,
      description: item.description || defaultItem?.description || "Vai trò trực tiếp gán cho tài khoản người dùng.",
      tone: defaultItem?.tone ?? roleTone(code),
      status: item.status ?? "Đang hoạt động",
      userCount: item.userCount ?? item.usersCount ?? (Array.isArray(item.users) ? item.users.length : undefined),
    };
  });
}

export function AdminRolesScreen() {
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("Admin");
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  // Role Assignment States
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedRolesToAssign, setSelectedRolesToAssign] = useState<string[]>([]);
  const [editReason, setEditReason] = useState("Gán quyền quản trị viên từ giao diện Admin");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Add User into Current Role Modal States
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateKeyword, setCandidateKeyword] = useState("");
  const [candidateList, setCandidateList] = useState<AdminUser[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);

  // Load roles from backend or fallback to default system roles
  const rolesResource = useApiResource("/api/v1/admin/roles", async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await api.get<ApiResponse<any> | any>("/api/v1/admin/roles");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unwrapped = response && typeof response === "object" && "data" in response ? (response as any).data : response;
      return parseRolesFromApi(unwrapped);
    } catch {
      return DEFAULT_SYSTEM_ROLES;
    }
  });

  const roles = rolesResource.data ?? DEFAULT_SYSTEM_ROLES;
  const currentRole = roles.find((r) => r.code === selectedRoleCode || r.id === selectedRoleCode) ?? roles[0] ?? DEFAULT_SYSTEM_ROLES[0];

  // Query accounts directly assigned to the selected role
  const usersQuery = {
    page,
    limit: 20,
    keyword: search,
    role: currentRole?.code ?? "Admin",
    status,
  };

  const usersResource = useApiResource(
    `admin-role-users:${currentRole?.code}:${page}:${search}:${status}`,
    async (signal) => adminUsersService.list(usersQuery, signal)
  );

  const rawUsers = usersResource.data?.items ?? [];
  const users = rawUsers.filter((u) => userMatchesRole(u, currentRole?.code ?? "Admin"));
  const totalUsers = usersResource.data?.total ?? users.length;

  function selectRole(roleItem: SystemRoleItem) {
    setSelectedRoleCode(roleItem.code);
    setPage(1);
    setKeyword("");
    setSearch("");
    setStatus("");
    setActionError("");
    setActionSuccess("");
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(keyword.trim());
  }

  // Open Edit Roles Dialog for a specific user
  function openEditRoles(user: AdminUser) {
    setEditingUser(user);
    setSelectedRolesToAssign(getUserRoles(user).map(canonicalRoleCode));
    setEditReason("Gán quyền quản trị viên từ giao diện Admin");
    setActionError("");
    setActionSuccess("");
  }

  function closeEditRoles() {
    if (busy) return;
    setEditingUser(null);
    setActionError("");
    setActionSuccess("");
  }

  function toggleRoleCheckbox(roleCode: string) {
    setSelectedRolesToAssign((current) => {
      const canonical = canonicalRoleCode(roleCode);
      const exists = current.some((r) => normalizeRoleCode(r) === normalizeRoleCode(canonical));
      if (exists) {
        const next = current.filter((r) => normalizeRoleCode(r) !== normalizeRoleCode(canonical));
        return next.length > 0 ? next : ["Buyer"]; // Luôn giữ tối thiểu role Buyer
      } else {
        return [...current, canonical];
      }
    });
  }

  // Submit role update for user
  async function submitUpdateRoles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    const uid = userId(editingUser);
    if (!uid) {
      setActionError("Không xác định được mã tài khoản.");
      return;
    }
    if (selectedRolesToAssign.length === 0) {
      setActionError("Tài khoản phải có ít nhất 1 vai trò.");
      return;
    }

    const trimmedReason = editReason.trim();
    if (!trimmedReason) {
      setActionError("Vui lòng nhập lý do cập nhật vai trò (bắt buộc theo API contract).");
      return;
    }

    setBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      const canonicalRoles = Array.from(new Set(selectedRolesToAssign.map(canonicalRoleCode)));
      await adminUsersService.updateRoles(uid, canonicalRoles, trimmedReason);
      setActionSuccess(`Đã cập nhật vai trò cho tài khoản ${userName(editingUser)}.`);
      setTimeout(() => {
        closeEditRoles();
        usersResource.reload();
      }, 1000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể cập nhật vai trò cho tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  // Quick Revoke current role from user
  async function revokeCurrentRole(user: AdminUser) {
    const uid = userId(user);
    if (!uid || !currentRole) return;
    const currentRoles = getUserRoles(user);
    const updated = currentRoles.filter((r) => normalizeRoleCode(r) !== normalizeRoleCode(currentRole.code));
    const nextRoles = updated.length > 0 ? updated : ["Buyer"];
    const canonicalRoles = Array.from(new Set(nextRoles.map(canonicalRoleCode)));

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn gỡ vai trò ${currentRole.name} khỏi tài khoản ${userName(user)}?`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await adminUsersService.updateRoles(
        uid,
        canonicalRoles,
        `Gỡ vai trò ${currentRole.name} khỏi tài khoản từ giao diện Admin`
      );
      usersResource.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể gỡ vai trò.");
    } finally {
      setBusy(false);
    }
  }

  // Open "Add User into Role" modal
  function openAddUserModal() {
    setIsAddUserModalOpen(true);
    setCandidateKeyword("");
    setCandidateSearch("");
    setCandidateList([]);
    setActionError("");
    setActionSuccess("");
  }

  function closeAddUserModal() {
    if (busy) return;
    setIsAddUserModalOpen(false);
    setActionError("");
    setActionSuccess("");
  }

  async function searchCandidates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidateKeyword.trim()) return;
    setCandidateSearch(candidateKeyword.trim());
    setCandidateLoading(true);
    setActionError("");
    try {
      const res = await adminUsersService.list({
        page: 1,
        limit: 10,
        keyword: candidateKeyword.trim(),
        role: "",
        status: "",
      });
      setCandidateList(res.items ?? []);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Lỗi khi tìm kiếm tài khoản.");
    } finally {
      setCandidateLoading(false);
    }
  }

  // Assign current role to a candidate
  async function assignCurrentRoleToCandidate(candidate: AdminUser) {
    const uid = userId(candidate);
    if (!uid || !currentRole) return;
    const existingRoles = getUserRoles(candidate);
    const exists = existingRoles.some((r) => normalizeRoleCode(r) === normalizeRoleCode(currentRole.code));
    if (exists) {
      setActionError(`Tài khoản ${userName(candidate)} đã có vai trò ${currentRole.name}.`);
      return;
    }

    const newRoles = [...existingRoles, currentRole.code];
    const canonicalRoles = Array.from(new Set(newRoles.map(canonicalRoleCode)));
    setBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await adminUsersService.updateRoles(
        uid,
        canonicalRoles,
        `Gán vai trò ${currentRole.name} từ giao diện Admin`
      );
      setActionSuccess(`Đã gán vai trò ${currentRole.name} cho tài khoản ${userName(candidate)} thành công!`);
      usersResource.reload();
      setTimeout(() => {
        closeAddUserModal();
      }, 1200);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể gán vai trò.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Bảng điều khiển Admin"
        title="Danh sách vai trò & Gán vai trò"
        description="Xem danh sách các vai trò hệ thống, danh sách tài khoản được gán và trực tiếp phân vai trò cho người dùng."
      />

      <Card className="card-pad" style={{ marginBottom: "20px", background: "#f8fafc", borderLeft: "4px solid var(--sky)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <span style={{ color: "var(--sky-dark)", marginTop: "2px" }}>
            <Icon name="shield" size={20} />
          </span>
          <div style={{ fontSize: "13px", lineHeight: "1.5" }}>
            <strong style={{ color: "var(--ink)", display: "block", marginBottom: "2px" }}>
              Cơ chế phân quyền theo vai trò trực tiếp
            </strong>
            <p style={{ margin: 0, color: "#64748b" }}>
              Hệ thống đã tinh giản cơ chế ma trận quyền phức tạp. Bạn có thể xem nhanh các tài khoản của từng vai trò và trực tiếp gán hoặc thu hồi vai trò cho tài khoản ngay tại màn hình này.
            </p>
          </div>
        </div>
      </Card>

      <div className="roles-grid-layout">
        {/* Left Column: Roles list */}
        <div>
          <SectionHeading
            title="Vai trò hệ thống"
            hint="Chọn vai trò để quản lý danh sách tài khoản được gán"
          />
          <div style={{ display: "grid", gap: "12px" }}>
            {roles.map((r) => {
              const isSelected = (currentRole?.code === r.code) || (currentRole?.id === r.id);
              return (
                <button
                  type="button"
                  key={r.id}
                  className="role-card-btn"
                  aria-pressed={isSelected}
                  onClick={() => selectRole(r)}
                >
                  <div className="role-card-header">
                    <span className="role-card-title">{r.name}</span>
                    <Badge tone={r.tone}>{r.code}</Badge>
                  </div>
                  <p className="role-card-desc">{r.description}</p>
                  <div className="role-card-footer">
                    <span>Trạng thái: <strong style={{ color: "var(--ink)" }}>{r.status}</strong></span>
                    {isSelected && (
                      <span style={{ color: "var(--sky-dark)", fontWeight: 700 }}>
                        ● Đang quản lý
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Directly assigned accounts */}
        <div>
          <SectionHeading
            title={`Tài khoản gán vai trò: ${currentRole?.name ?? ""}`}
            hint={`Quản lý và gán quyền trực tiếp cho người dùng thuộc vai trò ${currentRole?.code ?? ""}`}
            action={
              <button
                type="button"
                className="button button-primary button-small"
                onClick={openAddUserModal}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>+</span> Gán tài khoản vào vai trò này
              </button>
            }
          />

          <Card>
            <form className="toolbar" onSubmit={handleSearch}>
              <label className="field-wrap" style={{ flex: 1, minWidth: 200 }}>
                Tìm kiếm trong vai trò này
                <input
                  className="field"
                  type="search"
                  placeholder="Nhập họ tên, username hoặc email…"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </label>

              <label className="field-wrap">
                Trạng thái
                <select
                  className="select-field"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tất cả</option>
                  <option value="Active">Đang hoạt động</option>
                  <option value="Banned">Đã cấm</option>
                  <option value="PendingVerification">Chờ xác thực</option>
                  <option value="Deleted">Đã xóa</option>
                </select>
              </label>

              <button className="button button-secondary" type="submit" style={{ alignSelf: "flex-end" }}>
                Tìm kiếm
              </button>
            </form>

            {usersResource.error && (
              <p role="alert" className="notice" style={{ margin: "14px 20px" }}>
                Không tải được danh sách tài khoản: {usersResource.error.message}
              </p>
            )}

            {users.length > 0 ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Email & SĐT</th>
                      <th>Vai trò hiện tại</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: "right" }}>Thao tác gán role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const userRolesList = getUserRoles(user);
                      const hasMultipleRoles = userRolesList.length > 1;
                      return (
                        <tr key={userId(user)}>
                          <td>
                            <strong>{userName(user)}</strong>
                            {user.username && <small style={{ display: "block", color: "var(--muted)" }}>@{user.username}</small>}
                          </td>
                          <td>
                            <div>{user.email}</div>
                            {user.phoneNumber && (
                              <small style={{ color: "var(--muted)" }}>{user.phoneNumber}</small>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {userRolesList.map((r) => (
                                <Badge key={r} tone={roleTone(r)}>
                                  {r}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td>
                            <Badge tone={userStatusTone(user.status)}>
                              {userStatusLabel(user.status)}
                            </Badge>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                type="button"
                                className="button button-secondary button-small"
                                onClick={() => openEditRoles(user)}
                                title="Chỉnh sửa toàn bộ các vai trò của tài khoản này"
                              >
                                Đổi vai trò
                              </button>
                              {hasMultipleRoles && currentRole?.code !== "Buyer" && (
                                <button
                                  type="button"
                                  className="button button-secondary button-small"
                                  style={{ color: "#9f2f2c" }}
                                  onClick={() => revokeCurrentRole(user)}
                                  title={`Gỡ vai trò ${currentRole?.name} khỏi tài khoản`}
                                >
                                  Gỡ vai trò
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoData
                title={
                  usersResource.loading
                    ? "Đang tải danh sách tài khoản…"
                    : usersResource.error
                    ? "Không tải được danh sách tài khoản từ API"
                    : search || status
                    ? "Không tìm thấy tài khoản phù hợp với điều kiện lọc"
                    : `Chưa có tài khoản nào được gán vai trò ${currentRole?.name ?? ""}`
                }
              />
            )}

            {usersResource.data && usersResource.data.total > usersResource.data.limit && (
              <div className="action-row" style={{ padding: "14px 20px" }}>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={page <= 1 || usersResource.loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trang trước
                </button>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                  Trang {page} / {Math.ceil(totalUsers / usersResource.data.limit)} ({totalUsers} tài khoản)
                </span>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={page * usersResource.data.limit >= totalUsers || usersResource.loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Trang sau
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal 1: Edit Roles for a User */}
      {editingUser && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) closeEditRoles();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) closeEditRoles();
          }}
        >
          <section
            className="admin-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-role-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="edit-role-modal-title">Cập nhật vai trò tài khoản</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Tài khoản: <strong>{userName(editingUser)}</strong> ({editingUser.email})
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeEditRoles}
                disabled={busy}
                aria-label="Đóng popup"
                title="Đóng (Esc)"
              >
                ✕
              </button>
            </div>

            {actionError && <p role="alert" className="notice">{actionError}</p>}
            {actionSuccess && <p role="status" className="form-success">{actionSuccess}</p>}

            <form onSubmit={submitUpdateRoles}>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px" }}>
                Chọn các vai trò được cấp trực tiếp cho tài khoản này (có thể chọn nhiều vai trò cùng lúc):
              </p>

              <div style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>
                {DEFAULT_SYSTEM_ROLES.map((r) => {
                  const isChecked = selectedRolesToAssign.some(
                    (code) => normalizeRoleCode(code) === normalizeRoleCode(r.code)
                  );
                  return (
                    <label
                      key={r.code}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: `1px solid ${isChecked ? "var(--sky)" : "var(--line)"}`,
                        background: isChecked ? "#f0f9ff" : "var(--surface)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRoleCheckbox(r.code)}
                        disabled={busy}
                        style={{ marginTop: "3px", width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{r.name}</strong>
                          <Badge tone={r.tone}>{r.code}</Badge>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                          {r.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                <label
                  htmlFor="role-edit-reason"
                  style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}
                >
                  Lý do phân quyền <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input
                  id="role-edit-reason"
                  type="text"
                  className="field"
                  style={{ width: "100%" }}
                  placeholder="Nhập lý do cập nhật vai trò (ví dụ: Gán quyền quản trị viên từ giao diện Admin)..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                />
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--muted)" }}>
                  Backend bắt buộc phải có trường &quot;reason&quot; (tránh lỗi 400 VAL_INVALID_INPUT).
                </p>
              </div>

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
                  onClick={closeEditRoles}
                  disabled={busy}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={busy || selectedRolesToAssign.length === 0}
                >
                  {busy ? "Đang lưu…" : "Lưu vai trò"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal 2: Add User into Current Role */}
      {isAddUserModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) closeAddUserModal();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) closeAddUserModal();
          }}
        >
          <section
            className="admin-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="add-user-modal-title">Gán tài khoản vào vai trò: {currentRole?.name}</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Tìm kiếm tài khoản người dùng trong hệ thống để gán thêm vai trò <code>{currentRole?.code}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeAddUserModal}
                disabled={busy}
                aria-label="Đóng popup"
                title="Đóng (Esc)"
              >
                ✕
              </button>
            </div>

            {actionError && <p role="alert" className="notice">{actionError}</p>}
            {actionSuccess && <p role="status" className="form-success">{actionSuccess}</p>}

            <form onSubmit={searchCandidates} style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <input
                className="field"
                type="search"
                placeholder="Nhập email, họ tên hoặc username cần gán…"
                value={candidateKeyword}
                onChange={(e) => setCandidateKeyword(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="button button-secondary" disabled={candidateLoading || busy}>
                {candidateLoading ? "Đang tìm…" : "Tìm kiếm"}
              </button>
            </form>

            {candidateLoading && <p style={{ fontSize: "13px", color: "var(--muted)" }}>Đang tìm kiếm tài khoản…</p>}

            {candidateList.length > 0 && (
              <div style={{ display: "grid", gap: "10px", maxHeight: "300px", overflowY: "auto", marginBottom: "16px" }}>
                {candidateList.map((c) => {
                  const cRoles = getUserRoles(c);
                  const alreadyHasRole = cRoles.some(
                    (r) => normalizeRoleCode(r) === normalizeRoleCode(currentRole?.code ?? "")
                  );
                  return (
                    <div
                      key={userId(c)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                        background: "var(--surface)",
                      }}
                    >
                      <div>
                        <strong>{userName(c)}</strong>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{c.email}</div>
                        <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                          {cRoles.map((r) => (
                            <Badge key={r} tone={roleTone(r)}>
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {alreadyHasRole ? (
                        <span style={{ fontSize: "12px", color: "var(--green-dark)", fontWeight: 600 }}>
                          ✓ Đã có vai trò này
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="button button-primary button-small"
                          disabled={busy}
                          onClick={() => assignCurrentRoleToCandidate(c)}
                        >
                          + Gán vai trò
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!candidateLoading && candidateSearch && candidateList.length === 0 && (
              <NoData title={`Không tìm thấy tài khoản nào với từ khóa "${candidateSearch}"`} />
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
                onClick={closeAddUserModal}
                disabled={busy}
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
