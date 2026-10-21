export type AuditLogItem = {
  id: string;
  actorId: string;
  action: string;
  resource: string;
  createdAt: string;
  traceId?: string;
};
