import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export type InAppNotificationItemResponse = {
  id: string;
  userId: string;
  title?: string | null;
  body?: string | null;
  payload?: string | null;
  isRead: boolean;
  readAt?: string | null;
  notificationType?: string | null;
  status: string;
  createdAt: string;
};

export type EventLogSummaryResponse = {
  id: string;
  eventId?: string | null;
  sourceService: string;
  eventType: string;
  occurredAt: string;
  actorId?: string | null;
  actorRole?: string | null;
  targetId?: string | null;
  traceId?: string | null;
  createdAt: string;
};

export type EventLogDetailResponse = {
  summary: EventLogSummaryResponse;
  payload?: Record<string, unknown> | null;
  headers?: Record<string, string> | null;
};

export type PagedData<T> = {
  items: T[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type SearchNotificationQuery = {
  userId?: string;
  notificationType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type ListEventLogsQuery = {
  page?: number;
  pageSize?: number;
  sourceService?: string;
  eventType?: string;
  actorId?: string;
  targetId?: string;
  eventId?: string;
  traceId?: string;
  from?: string;
  to?: string;
};

export const adminNotificationsService = {
  async searchNotifications(
    query: SearchNotificationQuery = {},
    signal?: AbortSignal,
  ): Promise<PagedData<InAppNotificationItemResponse>> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    });
    if (query.userId?.trim()) params.set("userId", query.userId.trim());
    if (query.notificationType?.trim()) params.set("notificationType", query.notificationType.trim());
    if (query.status?.trim()) params.set("status", query.status.trim());

    const response = await api.get<
      ApiResponse<PagedData<InAppNotificationItemResponse>> | PagedData<InAppNotificationItemResponse>
    >(`/api/v1/admin/notifications?${params}`, { signal });
    return unwrap(response);
  },

  async listEventLogs(
    query: ListEventLogsQuery = {},
    signal?: AbortSignal,
  ): Promise<PagedData<EventLogSummaryResponse>> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    });
    if (query.sourceService?.trim()) params.set("sourceService", query.sourceService.trim());
    if (query.eventType?.trim()) params.set("eventType", query.eventType.trim());
    if (query.actorId?.trim()) params.set("actorId", query.actorId.trim());
    if (query.targetId?.trim()) params.set("targetId", query.targetId.trim());
    if (query.eventId?.trim()) params.set("eventId", query.eventId.trim());
    if (query.traceId?.trim()) params.set("traceId", query.traceId.trim());
    if (query.from?.trim()) params.set("from", query.from.trim());
    if (query.to?.trim()) params.set("to", query.to.trim());

    const response = await api.get<
      ApiResponse<PagedData<EventLogSummaryResponse>> | PagedData<EventLogSummaryResponse>
    >(`/api/v1/admin/notifications/event-logs?${params}`, { signal });
    return unwrap(response);
  },

  async getEventLog(id: string, signal?: AbortSignal): Promise<EventLogDetailResponse> {
    const response = await api.get<
      ApiResponse<EventLogDetailResponse> | EventLogDetailResponse
    >(`/api/v1/admin/notifications/event-logs/${encodeURIComponent(id)}`, { signal });
    return unwrap(response);
  },
};
