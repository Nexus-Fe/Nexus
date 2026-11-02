import { api, type ApiResponse } from "@/lib/api/client";

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

type UserListPayload = { items: AdminUser[]; pagination: { pageIndex: number; pageSize: number; totalCount: number } };
type UserDetailPayload = AdminUser | { user: AdminUser };

const basePath = "/api/v1/admin/users";
const userPath = (id: string) => `${basePath}/${encodeURIComponent(id)}`;
const unwrap = <T,>(response: ApiResponse<T> | T): T => response && typeof response === "object" && "data" in response ? response.data : response;

export const adminUsersService = {
  async list(query: { page: number; limit: number; keyword: string; role: string; status: string }, signal?: AbortSignal): Promise<AdminUserPage> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.limit) });
    if (query.keyword) params.set("keyword", query.keyword);
    if (query.role) params.set("role", query.role);
    if (query.status) params.set("status", query.status);
    const response = await api.get<ApiResponse<UserListPayload> | UserListPayload>(`${basePath}?${params}`, { signal });
    const payload = unwrap(response);
    return { items: payload.items ?? [], total: payload.pagination?.totalCount ?? 0, page: payload.pagination?.pageIndex ?? query.page, limit: payload.pagination?.pageSize ?? query.limit };
  },
  async detail(id: string, signal?: AbortSignal): Promise<AdminUser> {
    const response = await api.get<ApiResponse<UserDetailPayload> | UserDetailPayload>(userPath(id), { signal });
    const payload = unwrap(response);
    return "user" in payload ? payload.user : payload;
  },
  async ban(id: string, reason: string): Promise<void> {
    await api.patch(`${userPath(id)}/ban`, { reason });
  },
  async unban(id: string, reason: string): Promise<void> {
    await api.patch(`${userPath(id)}/unban`, { reason });
  },
  async remove(id: string, reason: string): Promise<void> {
    await api.delete<void>(userPath(id), { body: { reason } });
  },
};
