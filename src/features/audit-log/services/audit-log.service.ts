import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import type { AuditLogItem, AuditLogQuery } from "../types";

export type AuditLogPage = {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
};

type RawLogPage = {
  items?: AuditLogItem[];
  pagination?: {
    pageIndex: number;
    pageSize: number;
    totalCount: number;
  };
};

export const auditLogService = {
  getAuditLogs: (query: AuditLogQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    });
    if (query.actorUserId) params.set("actorUserId", query.actorUserId);
    if (query.serviceName) params.set("serviceName", query.serviceName);
    if (query.eventType) params.set("eventType", query.eventType);
    if (query.entityName) params.set("entityName", query.entityName);
    if (query.logLevel) params.set("logLevel", query.logLevel);
    if (query.from) params.set("from", query.from.length === 10 ? `${query.from}T00:00:00` : query.from);
    if (query.to) params.set("to", query.to.length === 10 ? `${query.to}T23:59:59` : query.to);
    return api.get<ApiResponse<RawLogPage | AuditLogItem[]>>(`/api/v1/logs?${params}`, { signal });
  },

  async list(query: AuditLogQuery = {}, signal?: AbortSignal): Promise<AuditLogPage> {
    const response = await auditLogService.getAuditLogs(query, signal);
    const data = unwrap(response);
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      };
    }
    const obj = data as RawLogPage;
    const items = Array.isArray(obj?.items) ? obj.items : [];
    return {
      items,
      total: obj?.pagination?.totalCount ?? items.length,
      page: obj?.pagination?.pageIndex ?? query.page ?? 1,
      pageSize: obj?.pagination?.pageSize ?? query.pageSize ?? 20,
    };
  },
};
