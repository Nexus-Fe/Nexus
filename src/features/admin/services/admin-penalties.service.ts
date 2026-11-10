import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import type { BadgeTone } from "@/components/ui/Primitives";

export type TargetRole = "Buyer" | "Seller" | "Account";
export type PenaltyStatus = "Active" | "Expired" | "Revoked";
export type PenaltyType = "Warning" | "DeductPoints" | "Restriction" | "BanAccount" | "Other";
export type PenaltyViolationType =
  | "PaymentTimeout"
  | "AuctionNonPayment"
  | "CancellationWithoutReason"
  | "Fraud"
  | "Other";

export type AdminPenaltyItem = {
  id: string;
  userId: string;
  userEmail?: string | null;
  targetRole: TargetRole;
  penaltyApplied: PenaltyType;
  violationType: PenaltyViolationType;
  status: PenaltyStatus;
  reason: string;
  policyClauseCode?: string | null;
  pointsDeducted: number;
  issuedAt: string;
  expiresAt?: string | null;
};

export type AdminPenaltyDetail = {
  id: string;
  userId: string;
  userEmail?: string | null;
  userFullName?: string | null;
  targetRole: TargetRole;
  penaltyApplied: PenaltyType;
  violationType: PenaltyViolationType;
  status: PenaltyStatus;
  reason: string;
  policyClauseCode?: string | null;
  evidenceUrls: string[];
  pointsDeducted: number;
  issuedAt: string;
  expiresAt?: string | null;
  createdBy?: string | null;
  revokedBy?: string | null;
  revokedAt?: string | null;
  revokeReason?: string | null;
};

export type AdminPenaltiesQuery = {
  page: number;
  limit: number;
  userId?: string;
  targetRole?: string;
  status?: string;
};

export type AdminPenaltiesPage = {
  items: AdminPenaltyItem[];
  total: number;
  page: number;
  limit: number;
};

type PenaltyListPayload = {
  items: AdminPenaltyItem[];
  pagination: { pageIndex: number; pageSize: number; totalCount: number };
};

const basePath = "/api/v1/admin/penalties";

export const adminPenaltiesService = {
  async list(query: AdminPenaltiesQuery, signal?: AbortSignal): Promise<AdminPenaltiesPage> {
    const params = new URLSearchParams({
      page: String(query.page),
      limit: String(query.limit),
    });
    if (query.userId) params.set("userId", query.userId.trim());
    if (query.targetRole) params.set("targetRole", query.targetRole);
    if (query.status) params.set("status", query.status);

    const response = await api.get<ApiResponse<PenaltyListPayload> | PenaltyListPayload>(
      `${basePath}?${params}`,
      { signal },
    );
    const payload = unwrap(response);
    const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
    const total = Array.isArray(payload)
      ? payload.length
      : (payload?.pagination?.totalCount ?? (payload as unknown as { total?: number })?.total ?? items.length);
    const page = payload?.pagination?.pageIndex ?? query.page;
    const limit = payload?.pagination?.pageSize ?? query.limit;

    return {
      items,
      total,
      page,
      limit,
    };
  },

  async detail(id: string, signal?: AbortSignal): Promise<AdminPenaltyDetail> {
    const response = await api.get<ApiResponse<AdminPenaltyDetail> | AdminPenaltyDetail>(
      `${basePath}/${encodeURIComponent(id)}`,
      { signal },
    );
    return unwrap(response);
  },

  async revoke(id: string, reason: string): Promise<void> {
    await api.put(`${basePath}/${encodeURIComponent(id)}/revoke`, { reason: reason.trim() });
  },
};

export function penaltyStatusTone(status?: string): BadgeTone {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return "red";
  if (s === "REVOKED") return "green";
  if (s === "EXPIRED") return "slate";
  return "sky";
}

export function penaltyStatusLabel(status?: string): string {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return "Có hiệu lực";
  if (s === "REVOKED") return "Đã thu hồi";
  if (s === "EXPIRED") return "Đã hết hạn";
  return status ?? "—";
}

export function penaltyTypeLabel(type?: string): string {
  const t = (type ?? "").toLowerCase();
  switch (t) {
    case "warning":
      return "Cảnh cáo";
    case "deductpoints":
      return "Trừ điểm uy tín";
    case "restriction":
      return "Đình chỉ / Giới hạn";
    case "banaccount":
      return "Khóa tài khoản";
    case "other":
      return "Hình thức khác";
    default:
      return type ?? "—";
  }
}

export function penaltyViolationTypeLabel(type?: string): string {
  const t = (type ?? "").toLowerCase();
  switch (t) {
    case "paymenttimeout":
      return "Quá hạn thanh toán";
    case "auctionnonpayment":
      return "Bỏ cọc đấu giá";
    case "cancellationwithoutreason":
      return "Hủy đơn vô cớ";
    case "fraud":
      return "Gian lận / Lừa đảo";
    case "other":
      return "Vi phạm khác";
    default:
      return type ?? "—";
  }
}

export function targetRoleTone(role?: string): BadgeTone {
  const r = (role ?? "").toUpperCase();
  if (r === "SELLER") return "amber";
  if (r === "BUYER") return "sky";
  return "indigo";
}
