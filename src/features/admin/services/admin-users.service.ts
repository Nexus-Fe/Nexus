import { api, type ApiResponse } from "@/lib/api/client";
import { staffAdminDemoEnabled } from "@/lib/demo/staff-admin-demo";

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
  status?: string;
  createdAt?: string;
};

export type AdminUserPage = { items: AdminUser[]; total: number; page: number; limit: number };

type UserListPayload = { items?: AdminUser[]; users?: AdminUser[]; total?: number; page?: number; limit?: number };
type UserDetailPayload = AdminUser | { user: AdminUser };

const basePath = "/api/v1/admin/user";
const userPath = (id: string) => `${basePath}/${encodeURIComponent(id)}`;

export const adminUsersService = {
  async list(query: { page: number; limit: number; keyword: string; role: string; status: string }, signal?: AbortSignal): Promise<AdminUserPage> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-users-demo")).adminUsersDemo.list(query);
    const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.role) params.set("role", query.role);
    if (query.status) params.set("status", query.status);
    const response = await api.get<ApiResponse<UserListPayload>>(`${basePath}?${params}`, { signal });
    const payload = response.data;
    return { items: payload.items ?? payload.users ?? [], total: payload.total ?? 0, page: payload.page ?? query.page, limit: payload.limit ?? query.limit };
  },
  async detail(id: string, signal?: AbortSignal): Promise<AdminUser> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-users-demo")).adminUsersDemo.detail(id);
    const response = await api.get<ApiResponse<UserDetailPayload>>(userPath(id), { signal });
    const payload = response.data;
    return "user" in payload ? payload.user : payload;
  },
  async ban(id: string, reason: string): Promise<void> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-users-demo")).adminUsersDemo.ban(id);
    await api.patch(`${userPath(id)}/ban`, { reason });
  },
  async unban(id: string, reason: string): Promise<void> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-users-demo")).adminUsersDemo.unban(id);
    await api.patch(`${userPath(id)}/unban`, { reason });
  },
  async remove(id: string, reason: string): Promise<void> {
    if (staffAdminDemoEnabled) return (await import("../demo/admin-users-demo")).adminUsersDemo.remove(id);
    await api.delete<void>(userPath(id), { body: { reason } });
  },
};
