import { api, type ApiResponse } from "@/lib/api/client";
import type { NotificationItem } from "../types";

// Gateway paths are initial assumptions and must be checked against backend OpenAPI.
export const notificationService = {
  getNotifications: () =>
    api.get<ApiResponse<NotificationItem[]>>("/api/notifications"),
  markAsRead: (id: string) =>
    api.patch<ApiResponse<NotificationItem>>(
      `/api/notifications/${encodeURIComponent(id)}/read`,
    ),
};
