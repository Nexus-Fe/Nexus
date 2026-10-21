import { api, type ApiResponse } from "@/lib/api/client";
import type { AuditLogItem } from "../types";

// Gateway paths are initial assumptions and must be checked against backend OpenAPI.
export const auditLogService = {
  getAuditLogs: () => api.get<ApiResponse<AuditLogItem[]>>("/api/audit-logs"),
};
