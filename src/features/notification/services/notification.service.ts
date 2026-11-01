import { api, type ApiResponse } from "@/lib/api/client";
import type { NotificationItem } from "../types";

export const notificationService = {
  getNotifications: () =>
    api.get<ApiResponse<NotificationItem[]>>("/api/v1/notifications/me?pageIndex=1&pageSize=20"),
  markAsRead: (id: string) =>
    api.patch<ApiResponse<NotificationItem>>("/api/v1/notifications/me/read", { notificationIds: [id], markAll: false }),
};
