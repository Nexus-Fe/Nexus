export type AuditLogItem = {
  id: string;
  occurredAt: string;
  serviceName: string;
  eventType: string;
  action: string;
  entityName: string;
  entityId: string;
  actorUserId: string;
  actorRole?: string;
  correlationId?: string;
  traceId?: string;
  logLevel?: string;
  payload?: string;
  // Backward-compatible optional aliases
  actorId?: string;
  resource?: string;
  createdAt?: string;
};

export type AuditLogQuery = {
  page?: number;
  pageSize?: number;
  actorUserId?: string;
  serviceName?: string;
  eventType?: string;
  entityName?: string;
  logLevel?: string;
  from?: string;
  to?: string;
};
