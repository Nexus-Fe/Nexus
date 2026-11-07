import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export type HealthSampleItem = {
  timestamp: string;
  status: string;
  latencyMs: number;
  httpStatusCode?: number | null;
  message?: string | null;
  error?: string | null;
};

export type TargetHealthItem = {
  name: string;
  kind: "service" | "database" | string;
  isEnabled: boolean;
  currentStatus: string;
  lastCheckedAt?: string | null;
  lastLatencyMs: number;
  consecutiveFailures: number;
  totalChecks: number;
  totalFailures: number;
  lastError?: string | null;
  recentSamples?: HealthSampleItem[];
};

export type HealthSummary = {
  overallStatus: string;
  totalServices: number;
  enabledServices: number;
  healthyServices: number;
  totalDatabases: number;
  enabledDatabases: number;
  healthyDatabases: number;
  cronIntervalSeconds: number;
  timestamp: string;
};

export type HealthDashboardData = {
  summary: HealthSummary;
  services: TargetHealthItem[];
  databases: TargetHealthItem[];
};

export type ManualCheckResult = {
  name: string;
  kind: string;
  status: string;
  latencyMs: number;
  message?: string | null;
  error?: string | null;
  timestamp: string;
};

export type IncidentRecordItem = {
  id?: string;
  targetName: string;
  targetKind: string;
  previousStatus: string;
  newStatus: string;
  consecutiveFailures: number;
  latencyMs?: number;
  error?: string | null;
  occurredAt?: string;
  timestamp?: string;
};

const basePath = "/api/v1/healthcheck";

export const adminHealthService = {
  async getDashboard(signal?: AbortSignal): Promise<HealthDashboardData> {
    const response = await api.get<ApiResponse<HealthDashboardData> | HealthDashboardData>(
      `${basePath}/status`,
      { signal },
    );
    return unwrap(response);
  },

  async getServices(signal?: AbortSignal): Promise<TargetHealthItem[]> {
    const response = await api.get<ApiResponse<TargetHealthItem[]> | TargetHealthItem[]>(
      `${basePath}/services`,
      { signal },
    );
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  async getDatabases(signal?: AbortSignal): Promise<TargetHealthItem[]> {
    const response = await api.get<ApiResponse<TargetHealthItem[]> | TargetHealthItem[]>(
      `${basePath}/databases`,
      { signal },
    );
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  async checkServiceNow(serviceName: string): Promise<ManualCheckResult> {
    const response = await api.post<ApiResponse<ManualCheckResult> | ManualCheckResult>(
      `${basePath}/services/${encodeURIComponent(serviceName)}/check`,
      {},
    );
    return unwrap(response);
  },

  async toggleService(serviceName: string, enabled: boolean): Promise<TargetHealthItem> {
    const response = await api.put<ApiResponse<TargetHealthItem> | TargetHealthItem>(
      `${basePath}/services/${encodeURIComponent(serviceName)}/toggle`,
      { enabled },
    );
    return unwrap(response);
  },

  async checkDatabaseNow(serviceName: string): Promise<ManualCheckResult> {
    const response = await api.post<ApiResponse<ManualCheckResult> | ManualCheckResult>(
      `${basePath}/databases/${encodeURIComponent(serviceName)}/check`,
      {},
    );
    return unwrap(response);
  },

  async toggleDatabase(serviceName: string, enabled: boolean): Promise<TargetHealthItem> {
    const response = await api.put<ApiResponse<TargetHealthItem> | TargetHealthItem>(
      `${basePath}/databases/${encodeURIComponent(serviceName)}/toggle`,
      { enabled },
    );
    return unwrap(response);
  },

  async bulkToggle(enabled: boolean, kind: "service" | "database" | "all" = "all"): Promise<void> {
    await api.put(`${basePath}/bulk-toggle`, { enabled, kind });
  },

  async getIncidents(limit = 30, signal?: AbortSignal): Promise<IncidentRecordItem[]> {
    const response = await api.get<ApiResponse<IncidentRecordItem[]> | IncidentRecordItem[]>(
      `${basePath}/incidents?limit=${limit}`,
      { signal },
    );
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },
};
