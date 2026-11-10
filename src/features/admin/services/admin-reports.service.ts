import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import type { BadgeTone } from "@/components/ui/Primitives";

export type ReportStatus = "Pending" | "UnderReview" | "Resolved" | "Rejected";
export type ReportViolationType = "Fraud" | "Harassment" | "Counterfeit" | "Spam" | "Other";

export type AdminReportItem = {
  reportId: string;
  reporterId: string;
  reportedUserId: string;
  targetRole: string;
  referenceType?: string | null;
  referenceId?: string | null;
  violationType: string;
  description: string;
  evidenceUrls: string[];
  status: ReportStatus;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
};

export type ResolveReportPayload = {
  targetRole?: "Account" | "Buyer" | "Seller";
  penaltyApplied?: "Warning" | "DeductPoints" | "Restriction" | "BanAccount" | "Other" | null;
  scoreDeduction?: number;
  banAccount?: boolean;
  suspendSellerShop?: boolean;
  durationDays?: number | null;
  policyClauseCode?: string | null;
  resolutionNote: string;
};

export type DismissReportPayload = {
  resolutionNote: string;
  reason?: string;
};

export type AdminReportsQuery = {
  page: number;
  pageSize: number;
  status?: string;
  violationType?: string;
};

export type AdminReportsPage = {
  items: AdminReportItem[];
  total: number;
  page: number;
  pageSize: number;
};

type ReportListPayload = {
  items: AdminReportItem[];
  pagination: { pageIndex: number; pageSize: number; totalCount: number };
};

const basePath = "/api/v1/admin/reports";

export const adminReportsService = {
  async list(query: AdminReportsQuery, signal?: AbortSignal): Promise<AdminReportsPage> {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.status) params.set("status", query.status);
    if (query.violationType) params.set("violationType", query.violationType);

    const response = await api.get<ApiResponse<ReportListPayload> | ReportListPayload>(
      `${basePath}?${params}`,
      { signal },
    );
    const payload = unwrap(response);
    const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
    const total = Array.isArray(payload)
      ? payload.length
      : (payload?.pagination?.totalCount ?? (payload as unknown as { total?: number })?.total ?? items.length);
    const page = payload?.pagination?.pageIndex ?? query.page;
    const pageSize = payload?.pagination?.pageSize ?? query.pageSize;

    return {
      items,
      total,
      page,
      pageSize,
    };
  },

  async resolve(reportId: string, payload: ResolveReportPayload): Promise<void> {
    await api.put(`${basePath}/${encodeURIComponent(reportId)}/resolve`, payload);
  },

  async dismiss(reportId: string, payload: DismissReportPayload): Promise<void> {
    await api.put(`${basePath}/${encodeURIComponent(reportId)}/dismiss`, {
      resolutionNote: payload.resolutionNote,
      reason: payload.reason ?? payload.resolutionNote,
    });
  },
};

export function reportStatusTone(status?: string): BadgeTone {
  const s = (status ?? "").toUpperCase();
  if (s === "PENDING") return "amber";
  if (s === "UNDERREVIEW") return "sky";
  if (s === "RESOLVED") return "green";
  if (s === "REJECTED" || s === "DISMISSED") return "slate";
  return "sky";
}

export function reportStatusLabel(status?: string): string {
  const s = (status ?? "").toUpperCase();
  if (s === "PENDING") return "Chờ xử lý";
  if (s === "UNDERREVIEW") return "Đang xem xét";
  if (s === "RESOLVED") return "Đã giải quyết";
  if (s === "REJECTED" || s === "DISMISSED") return "Đã bác bỏ";
  return status ?? "—";
}

export function reportViolationTypeLabel(type?: string): string {
  const t = (type ?? "").toLowerCase();
  switch (t) {
    case "fraud":
      return "Gian lận / Lừa đảo";
    case "harassment":
      return "Quấy rối / Xúc phạm";
    case "counterfeit":
      return "Hàng giả / Vi phạm sở hữu";
    case "spam":
      return "Spam / Tin rác";
    case "other":
      return "Vi phạm khác";
    default:
      return type ?? "—";
  }
}
