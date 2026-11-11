"use client";

import { useState, type FormEvent } from "react";
import { AdminPagination, Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { adminUsersService, type AdminUser } from "./services/admin-users.service";
import {
  canonicalRoleCode,
  getPrimaryRole,
  getUserRoles,
  normalizeRoleCode,
  roleTone,
  userId,
  userName,
  userStatusLabel,
  userStatusTone,
} from "./services/admin-helpers";

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
    id: "Buyer",
    code: "Buyer",
    name: "Buyer (Người mua / Khách hàng)",
    description:
      "Khách hàng mua sắm: tham gia phòng đấu giá trực tiếp, đặt giá thầu (bids), thanh toán đơn trúng đấu giá và quản lý ví tiền.",
    tone: "slate",
    status: "Đang hoạt động",
  },
  {
    id: "Seller",
    code: "Seller",
    name: "Seller (Người bán - Cấp qua duyệt KYC)",
    description:
      "Tài khoản người bán hàng: chỉ được cấp tự động sau khi hoàn tất quy trình đăng ký và thẩm định KYC gian hàng.",
    tone: "amber",
    status: "Đang hoạt động",
  },
  {
    id: "SupportStaff",
    code: "SupportStaff",
    name: "Staff (Nhân viên vận hành)",
    description:
      "Vận hành và hỗ trợ sàn: kiểm duyệt sản phẩm đấu giá, xét duyệt hồ sơ người bán (Seller KYC), xử lý khiếu nại báo cáo và duyệt yêu cầu rút tiền.",
    tone: "sky",
    status: "Đang hoạt động",
  },
  {
    id: "Admin",
    code: "Admin",
    name: "Admin (Quản trị viên)",
    description:
      "Toàn quyền quản trị hệ thống: kiểm soát tài khoản người dùng, giám sát các phiên đấu giá trực tiếp, và cấu hình toàn sàn.",
    tone: "indigo",
    status: "Đang hoạt động",
  },
];

function userMatchesRole(user: AdminUser, targetRoleCode: string): boolean {
  return canonicalRoleCode(getPrimaryRole(user)) === canonicalRoleCode(targetRoleCode);
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
    const code = String(item.roleCode ?? item.code ?? item.name ?? item.roleName ?? rawName);
    const id = String(item.id ?? item.roleId ?? code);
    const defaultItem = DEFAULT_SYSTEM_ROLES.find(
      (r) => normalizeRoleCode(r.code) === normalizeRoleCode(code),
    );
    return {
      id,
      code: defaultItem?.code ?? code,
      name: item.displayName ?? defaultItem?.name ?? rawName,
      description:
        item.description ||
        defaultItem?.description ||
        "Vai trò chính gán cho tài khoản người dùng (1-User 1-Primary-Role).",
      tone: defaultItem?.tone ?? roleTone(code),
      status: item.isActive === false ? "Đã tắt" : (item.status ?? "Đang hoạt động"),
      userCount:
        item.userCount ?? item.usersCount ?? (Array.isArray(item.users) ? item.users.length : undefined),
    };
  });
}

export function AdminRolesScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("Buyer");
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  // Single-Select Primary Role Assignment State (1-User 1-Primary-Role)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string>("Buyer");
  const [editReason, setEditReason] = useState("Cập nhật vai trò chính từ giao diện Admin");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Add User into Current Role Modal States
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateKeyword, setCandidateKeyword] = useState("");
  const [candidateList, setCandidateList] = useState<AdminUser[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);

  const rolesResource = useApiResource("/api/v1/admin/roles", async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await api.get<ApiResponse<any> | any>("/api/v1/admin/roles");
      const unwrapped =
        response && typeof response === "object" && "data" in response
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (response as any).data
          : response;
      return parseRolesFromApi(unwrapped);
    } catch {
      return DEFAULT_SYSTEM_ROLES;
    }
  });

  const roles = rolesResource.data ?? DEFAULT_SYSTEM_ROLES;
  const currentRole =
    roles.find((r) => r.code === selectedRoleCode || r.id === selectedRoleCode) ??
    roles[0] ??
    DEFAULT_SYSTEM_ROLES[0];
  const isCurrentRoleSeller = normalizeRoleCode(currentRole?.code ?? "") === "seller";

  const usersQuery = {
    page,
    limit: 20,
    keyword: search,
    role: currentRole?.code ?? "Admin",
    status,
  };

  const usersResource = useApiResource(
    `admin-role-users:${currentRole?.code}:${page}:${search}:${status}`,
    async (signal) => adminUsersService.list(usersQuery, signal),
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

  function openEditRoles(user: AdminUser) {
    setEditingUser(user);
    const primaryRole = getPrimaryRole(user);
    setSelectedRoleToAssign(primaryRole);
    setEditReason("Cập nhật vai trò chính từ giao diện Admin");
    setActionError("");
    setActionSuccess("");
  }

  function closeEditRoles() {
    if (busy) return;
    setEditingUser(null);
    setActionError("");
    setActionSuccess("");
  }

  async function submitUpdateRoles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    const uid = userId(editingUser);
    if (!uid) {
      setActionError("Không xác định được mã tài khoản.");
      return;
    }
    if (!selectedRoleToAssign) {
      setActionError("Vui lòng chọn 1 vai trò chính cho tài khoản.");
      return;
    }

    const canonicalTarget = canonicalRoleCode(selectedRoleToAssign);
    const currentPrimary = getPrimaryRole(editingUser);
    if (canonicalTarget === "Seller" && currentPrimary !== "Seller") {
      setActionError(
        "Không thể gán trực tiếp vai trò Seller. Người dùng phải đăng ký và được duyệt hồ sơ người bán.",
      );
      return;
    }

    const trimmedReason = editReason.trim();
    if (!trimmedReason) {
      setActionError("Vui lòng nhập lý do phân quyền.");
      return;
    }

    setBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await adminUsersService.updateRoles(uid, [canonicalTarget], trimmedReason);
      setActionSuccess(
        `Đã chuyển vai trò chính của tài khoản ${userName(editingUser)} sang ${canonicalTarget}.`,
      );
      setTimeout(() => {
        closeEditRoles();
        usersResource.reload();
      }, 900);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Không thể cập nhật vai trò cho tài khoản.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openAddUserModal() {
    if (isCurrentRoleSeller) return;
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

  async function assignCurrentRoleToCandidate(candidate: AdminUser) {
    const uid = userId(candidate);
    if (!uid || !currentRole) return;
    if (isCurrentRoleSeller) {
      setActionError("Vai trò Seller chỉ được cấp qua quy trình xét duyệt KYC.");
      return;
    }

    const alreadyHasRole =
      normalizeRoleCode(getPrimaryRole(candidate)) === normalizeRoleCode(currentRole.code);
    if (alreadyHasRole) {
      setActionError(`Tài khoản ${userName(candidate)} đã ở vai trò ${currentRole.name}.`);
      return;
    }

    const targetCanonical = canonicalRoleCode(currentRole.code);
    setBusy(true);
    setActionError("");
    setActionSuccess("");
    try {
      await adminUsersService.updateRoles(
        uid,
        [targetCanonical],
        `Chuyển vai trò chính sang ${currentRole.name} từ giao diện Admin`,
      );
      setActionSuccess(
        `Đã gán vai trò chính ${currentRole.name} cho tài khoản ${userName(candidate)} thành công!`,
      );
      usersResource.reload();
      setTimeout(() => {
        closeAddUserModal();
      }, 1000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không thể gán vai trò.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!embedded && (
        <PageHeading
          overline="Phân quyền tài khoản"
          title="Quản lý tài khoản theo vai trò"
          description="Quản lý và chuyển đổi vai trò người dùng hệ thống (quy tắc 1 tài khoản - 1 vai trò chính)."
        />
      )}

      <div className="role-rule-strip">
        <div className="role-rule-content">
          <Icon name="shield" size={16} />
          <span>
            <strong>Quy tắc phân quyền:</strong> Mỗi tài khoản chỉ nắm giữ duy nhất <strong>1 vai trò chính</strong> trong hệ thống. Vai trò <strong>Seller</strong> được kích hoạt tự động sau khi duyệt hồ sơ KYC người bán.
          </span>
        </div>
      </div>

      {/* Secondary Role Selector (Minimalist Horizontal Tabs) */}
      <div className="role-selector-bar">
        <div className="role-tabs-wrap">
          <span className="role-tabs-title">Vai trò hệ thống:</span>
          <div className="role-tabs-list" role="tablist" aria-label="Vai trò hệ thống">
            {roles.map((r) => {
              const isSelected = currentRole?.code === r.code || currentRole?.id === r.id;
              return (
                <button
                  type="button"
                  key={r.id || r.code}
                  role="tab"
                  aria-selected={isSelected}
                  className={`role-tab-pill ${isSelected ? `active active-${r.tone}` : ""}`}
                  onClick={() => selectRole(r)}
                >
                  <span className="role-tab-label">{r.name}</span>
                  <Badge tone={r.tone}>
                    {r.code}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div className="role-active-hint">
          <div className="role-active-desc">
            <span className="role-active-dot" />
            <span>{currentRole.description}</span>
          </div>
          {isCurrentRoleSeller && (
            <span className="role-seller-notice">
              Cấp tự động qua luồng xét duyệt hồ sơ Người bán
            </span>
          )}
        </div>
      </div>

      {/* Primary Centerpiece: Accounts Belonging to Selected Role */}
      <div className="role-accounts-main">
        <SectionHeading
          title={`Tài khoản thuộc vai trò: ${currentRole?.name ?? ""}`}
          hint={
            isCurrentRoleSeller
              ? "Vai trò Người bán (Seller) chỉ được cấp tự động sau khi thẩm định và phê duyệt hồ sơ KYC"
              : `Quản lý và chuyển vai trò chính cho người dùng thuộc vai trò ${currentRole?.code ?? ""}`
          }
          action={
            isCurrentRoleSeller ? (
              <Badge tone="amber">Cấp tự động qua duyệt KYC</Badge>
            ) : (
              <button
                type="button"
                className="button button-primary button-small"
                onClick={openAddUserModal}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>+</span> Gán tài khoản vào vai trò này
              </button>
            )
          }
        />

        <Card>
          <form className="toolbar" onSubmit={handleSearch}>
            <label className="field-wrap" style={{ flex: 1, minWidth: 240 }}>
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

            <button
              className="button button-secondary"
              type="submit"
              style={{ alignSelf: "flex-end" }}
            >
              Tìm kiếm
            </button>
          </form>

          {usersResource.error && (
            <p role="alert" className="notice" style={{ margin: "14px 20px" }}>
              Không tải được danh sách tài khoản: {usersResource.error.message}
            </p>
          )}

          <div style={{ position: "relative", minHeight: "400px" }}>
            {usersResource.loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(255, 255, 255, 0.72)",
                  backdropFilter: "blur(2px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  borderRadius: "8px",
                  transition: "opacity 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--sky-dark)", fontWeight: 600, fontSize: "13px" }}>
                  <div className="route-loading-mark" />
                  Đang tải danh sách tài khoản…
                </div>
              </div>
            )}

            {users.length > 0 ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 200 }}>Người dùng</th>
                      <th style={{ minWidth: 220 }}>Email & SĐT</th>
                      <th style={{ minWidth: 130 }}>Vai trò chính</th>
                      <th style={{ minWidth: 140 }}>Trạng thái</th>
                      <th className="text-right sticky-col-right" style={{ textAlign: "right", whiteSpace: "nowrap", minWidth: 160 }}>
                        Thao tác phân quyền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const primaryRole = getPrimaryRole(user);
                      return (
                        <tr key={userId(user)}>
                          <td>
                            <strong>{userName(user)}</strong>
                            {user.username && (
                              <small style={{ display: "block", color: "var(--muted)" }}>
                                @{user.username}
                              </small>
                            )}
                          </td>
                          <td>
                            <div>{user.email}</div>
                            {user.phoneNumber && (
                              <small style={{ color: "var(--muted)" }}>{user.phoneNumber}</small>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              <Badge tone={roleTone(primaryRole)}>
                                {primaryRole}
                              </Badge>
                            </div>
                          </td>
                          <td>
                            <Badge tone={userStatusTone(user.status)}>
                              {userStatusLabel(user.status)}
                            </Badge>
                          </td>
                          <td className="text-right sticky-col-right" style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                type="button"
                                className="button button-secondary button-small"
                                onClick={() => openEditRoles(user)}
                                title="Đổi vai trò chính của tài khoản này (Single-select)"
                              >
                                Đổi vai trò chính
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : !usersResource.loading ? (
              <NoData
                title={
                  usersResource.error
                    ? "Không tải được danh sách tài khoản từ API"
                    : search || status
                      ? "Không tìm thấy tài khoản phù hợp với điều kiện lọc"
                      : `Chưa có tài khoản nào thuộc vai trò ${currentRole?.name ?? ""}`
                }
              />
            ) : null}
          </div>

            {usersResource.data && (
              <AdminPagination
                page={page}
                pageSize={usersResource.data.limit}
                totalItems={totalUsers}
                loading={usersResource.loading}
                onPageChange={(nextPage) => setPage(nextPage)}
                itemLabel="tài khoản"
              />
            )}
          </Card>
        </div>

      {/* Modal 1: Single-Select Radio Button Role Editor (1-User 1-Primary-Role) */}
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
                <h2 id="edit-role-modal-title">Đổi vai trò chính (1-User 1-Primary-Role)</h2>
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

            {actionError && (
              <p role="alert" className="notice">
                {actionError}
              </p>
            )}
            {actionSuccess && (
              <p role="status" className="form-success">
                {actionSuccess}
              </p>
            )}

            <form onSubmit={(e) => void submitUpdateRoles(e)}>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px" }}>
                Chọn <strong>duy nhất 1 vai trò chính</strong> cho tài khoản này (tự động thu hồi toàn bộ Refresh Token cũ sau khi đổi):
              </p>

              <div
                role="radiogroup"
                aria-label="Vai trò chính"
                style={{ display: "grid", gap: "10px", marginBottom: "20px" }}
              >
                {DEFAULT_SYSTEM_ROLES.map((r) => {
                  const isSellerOption = normalizeRoleCode(r.code) === "seller";
                  const userAlreadySeller = getUserRoles(editingUser).some(
                    (ur) => normalizeRoleCode(ur) === "seller",
                  );
                  const isDisabledOption = busy || (isSellerOption && !userAlreadySeller);
                  const isChecked =
                    normalizeRoleCode(selectedRoleToAssign) === normalizeRoleCode(r.code);

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
                        background: isDisabledOption
                          ? "#f8fafc"
                          : isChecked
                            ? "#f0f9ff"
                            : "var(--surface)",
                        opacity: isDisabledOption ? 0.65 : 1,
                        cursor: isDisabledOption ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="radio"
                        name="primary-user-role"
                        checked={isChecked}
                        onChange={() => {
                          if (!isDisabledOption) {
                            setSelectedRoleToAssign(canonicalRoleCode(r.code));
                          }
                        }}
                        disabled={isDisabledOption}
                        style={{
                          marginTop: "3px",
                          width: "16px",
                          height: "16px",
                          cursor: isDisabledOption ? "not-allowed" : "pointer",
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                            {r.name}
                          </strong>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            {isSellerOption && !userAlreadySeller && (
                              <Badge tone="amber">Chỉ cấp qua KYC</Badge>
                            )}
                            <Badge tone={r.tone}>{r.code}</Badge>
                          </div>
                        </div>
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: "12px",
                            color: "#64748b",
                            lineHeight: 1.4,
                          }}
                        >
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
                  placeholder="Nhập lý do cập nhật vai trò..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                />
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
                  disabled={busy || !selectedRoleToAssign}
                >
                  {busy ? "Đang lưu…" : "Lưu vai trò chính"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal 2: Assign User into Current Role (Single-Role replacement) */}
      {isAddUserModalOpen && !isCurrentRoleSeller && (
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
                  Tìm kiếm tài khoản để chuyển vai trò chính sang <code>{currentRole?.code}</code>
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

            {actionError && (
              <p role="alert" className="notice">
                {actionError}
              </p>
            )}
            {actionSuccess && (
              <p role="status" className="form-success">
                {actionSuccess}
              </p>
            )}

            <form
              onSubmit={(e) => void searchCandidates(e)}
              style={{ display: "flex", gap: "8px", marginBottom: "16px" }}
            >
              <input
                className="field"
                type="search"
                placeholder="Nhập email, họ tên hoặc username cần gán…"
                value={candidateKeyword}
                onChange={(e) => setCandidateKeyword(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button
                type="submit"
                className="button button-secondary"
                disabled={candidateLoading || busy}
              >
                {candidateLoading ? "Đang tìm…" : "Tìm kiếm"}
              </button>
            </form>

            {candidateLoading && (
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>Đang tìm kiếm tài khoản…</p>
            )}

            {candidateList.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  marginBottom: "16px",
                }}
              >
                {candidateList.map((c) => {
                  const cPrimary = getPrimaryRole(c);
                  const alreadyHasRole =
                    normalizeRoleCode(cPrimary) === normalizeRoleCode(currentRole?.code ?? "");
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
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            marginTop: "4px",
                            flexWrap: "wrap",
                          }}
                        >
                          <Badge tone={roleTone(cPrimary)}>
                            {cPrimary}
                          </Badge>
                        </div>
                      </div>

                      {alreadyHasRole ? (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--green-dark)",
                            fontWeight: 600,
                          }}
                        >
                          ✓ Đã ở vai trò này
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="button button-primary button-small"
                          disabled={busy}
                          onClick={() => void assignCurrentRoleToCandidate(c)}
                        >
                          Chuyển sang {currentRole?.code}
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
