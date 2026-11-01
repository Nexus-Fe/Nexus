import { api, type ApiResponse } from "@/lib/api/client";
import type { AuditLogItem } from "../types";

export const auditLogService = {
  getAuditLogs: () => api.get<ApiResponse<AuditLogItem[]>>("/api/v1/admin/logs?page=1&pageSize=50"),
};
