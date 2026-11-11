import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export type AdminUserReputationLog = {
  id?: string;
  logId?: string;
  targetRole?: string;
  changeAmount: number;
  delta?: number;
  scoreAfter?: number;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  createdAt: string;
};

export type AdminSellerProfileDetail = {
  shopName: string;
  status: string;
  hotline?: string | null;
  businessEmail?: string | null;
  pickupAddress?: string | null;
  provinceId?: number | null;
  districtId?: number | null;
  wardCode?: string | null;
  avatarUrl?: string | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
  businessLicenseUrl?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
};

export type AdminUser = {
  id?: string;
  userId?: string;
  displayName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  roles?: string[];
  identifyNumber?: string | null;
  address?: string | null;
  gender?: string | null;
  isSeller?: boolean;
  sellerProfile?: AdminSellerProfileDetail | null;
  reputationScore?: number;
  trustLevel?: string;
  sellerReputationScore?: number;
  sellerTrustLevel?: string;
  banReason?: string | null;
  bannedAt?: string | null;
  updatedAt?: string | null;
  status?: string;
  createdAt?: string;
  reputationLogs?: AdminUserReputationLog[];
};

export type CreateAdminUserPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  username?: string;
  roleCodes: string[];
};

export type UpdateAdminUserPayload = {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status?: string;
  reason: string;
};

export type BanUserPayload = {
  reason: string;
  policyClauseCode?: string;
  evidenceUrls?: string[];
};

export type SuspendSellerPayload = {
  reason: string;
  durationDays?: number;
  policyClauseCode?: string;
  evidenceUrls?: string[];
};

export type ReactivateSellerPayload = {
  reason?: string;
};

export type AdjustReputationPayload = {
  targetRole: "Buyer" | "Seller";
  scoreDelta: number;
  reason: string;
};

export type UpdateUserRolesPayload = {
  roleCodes: string[];
  reason: string;
};

export type AdminUserPage = { items: AdminUser[]; total: number; page: number; limit: number };

type UserListPayload = { items: AdminUser[]; pagination: { pageIndex: number; pageSize: number; totalCount: number } };
type UserDetailPayload = AdminUser | { user: AdminUser };

const basePath = "/api/v1/admin/users";
const userPath = (id: string) => `${basePath}/${encodeURIComponent(id)}`;

export const adminUsersService = {
  async list(
    query: { page: number; limit: number; keyword: string; role: string; status: string },
    signal?: AbortSignal,
  ): Promise<AdminUserPage> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.limit) });
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.role) params.set("role", query.role);
    if (query.status) params.set("status", query.status);
    const response = await api.get<ApiResponse<UserListPayload> | UserListPayload>(
      `${basePath}?${params}`,
      { signal },
    );
    const payload = unwrap(response);
    return {
      items: payload.items ?? [],
      total: payload.pagination?.totalCount ?? 0,
      page: payload.pagination?.pageIndex ?? query.page,
      limit: payload.pagination?.pageSize ?? query.limit,
    };
  },

  async detail(id: string, signal?: AbortSignal): Promise<AdminUser> {
    const response = await api.get<ApiResponse<UserDetailPayload> | UserDetailPayload>(
      userPath(id),
      { signal },
    );
    const payload = unwrap(response);
    return "user" in payload ? payload.user : payload;
  },

  async create(payload: CreateAdminUserPayload): Promise<void> {
    await api.post(basePath, {
      email: payload.email.trim(),
      password: payload.password,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      phoneNumber: payload.phoneNumber?.trim() || undefined,
      username: payload.username?.trim() || undefined,
      roleCodes: payload.roleCodes.slice(0, 1),
    });
  },

  async updateProfile(id: string, payload: UpdateAdminUserPayload): Promise<void> {
    await api.put(userPath(id), {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      phoneNumber: payload.phoneNumber?.trim() || undefined,
      status: payload.status || undefined,
      reason: payload.reason.trim(),
    });
  },

  async adjustReputation(id: string, payload: AdjustReputationPayload): Promise<void> {
    await api.patch(`${userPath(id)}/reputation`, {
      targetRole: payload.targetRole,
      scoreDelta: payload.scoreDelta,
      delta: payload.scoreDelta,
      reason: payload.reason.trim(),
    });
  },

  async ban(
    id: string,
    payloadOrReason: string | BanUserPayload,
  ): Promise<void> {
    const body =
      typeof payloadOrReason === "string" ? { reason: payloadOrReason } : payloadOrReason;
    await api.patch(`${userPath(id)}/ban`, body);
  },

  async suspendSeller(sellerId: string, payload: SuspendSellerPayload): Promise<void> {
    await api.put(`/api/v1/admin/sellers/${encodeURIComponent(sellerId)}/suspend`, payload);
  },

  async reactivateSeller(sellerId: string, payload?: ReactivateSellerPayload): Promise<void> {
    await api.put(`/api/v1/admin/sellers/${encodeURIComponent(sellerId)}/reactivate`, payload ?? {});
  },

  async unban(id: string, reason: string): Promise<void> {
    await api.patch(`${userPath(id)}/unban`, { reason });
  },

  async remove(id: string, reason: string): Promise<void> {
    await api.delete<void>(userPath(id), { body: { reason } });
  },

  async updateRoles(
    id: string,
    roleCodesOrPayload: string[] | UpdateUserRolesPayload,
    optionalReason?: string,
  ): Promise<void> {
    let roleCodes: string[];
    let reason: string;

    if (Array.isArray(roleCodesOrPayload)) {
      roleCodes = roleCodesOrPayload;
      reason = optionalReason?.trim() || "Gán quyền quản trị viên từ giao diện Admin";
    } else {
      roleCodes = roleCodesOrPayload.roleCodes;
      reason =
        roleCodesOrPayload.reason?.trim() ||
        optionalReason?.trim() ||
        "Gán quyền quản trị viên từ giao diện Admin";
    }

    await api.put(`${userPath(id)}/roles`, {
      roleCodes: roleCodes.slice(0, 1),
      reason,
    });
  },

  async getReputationHistory(
    userId: string,
    signal?: AbortSignal,
  ): Promise<AdminUserReputationLog[]> {
    try {
      const response = await api.get<ApiResponse<unknown> | unknown>(
        `/api/v1/users/${encodeURIComponent(userId)}/reputation/history`,
        { signal },
      );
      const payload = unwrap(response) as
        | AdminUserReputationLog[]
        | { items?: AdminUserReputationLog[]; data?: AdminUserReputationLog[]; history?: AdminUserReputationLog[] };

      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.items)) return payload.items;
      if (payload && Array.isArray(payload.data)) return payload.data;
      if (payload && Array.isArray(payload.history)) return payload.history;
      return [];
    } catch {
      return [];
    }
  },
};
