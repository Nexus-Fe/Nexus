import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import type { NotificationItem, NotificationPage } from "../types";

export const notificationService = {
  getNotifications: async (page = 1, pageSize = 20, isRead?: boolean, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (isRead !== undefined) query.set("isRead", String(isRead));
    return unwrap(await api.get<ApiResponse<NotificationPage> | NotificationPage>(
      `/api/v1/notifications/me?${query}`, { signal },
    ));
  },
  markAsRead: (id: string) =>
    api.patch<ApiResponse<NotificationItem> | NotificationItem>(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {}),
};
