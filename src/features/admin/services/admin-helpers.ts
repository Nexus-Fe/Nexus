import type { BadgeTone } from "@/components/ui/Primitives";
import type { AdminUser } from "./admin-users.service";

export function userId(user: AdminUser): string {
  return user.userId ?? user.id ?? "";
}

export function userName(user: AdminUser): string {
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.email
  );
}

export function maskIdentifyNumber(raw?: string | null): string {
  if (!raw) return "—";
  const trimmed = raw.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••••••${trimmed.slice(-4)}`;
}

export function userStatusLabel(status?: string): string {
  const normalized = (status ?? "").toUpperCase().replace(/[\s_-]+/g, "");
  const labels: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    BANNED: "Đã cấm",
    PENDINGVERIFICATION: "Chờ xác thực",
    PENDINGACTIVATION: "Chờ xác thực",
    PENDING_ACTIVATION: "Chờ xác thực",
    PENDING: "Chờ xác thực",
    DELETED: "Đã xóa",
  };
  return labels[normalized] ?? status ?? "—";
}

export function userStatusTone(status?: string): BadgeTone {
  const s = (status ?? "").toUpperCase().replace(/[\s_-]+/g, "");
  if (s === "ACTIVE") return "green";
  if (s === "BANNED") return "red";
  if (s === "PENDINGVERIFICATION" || s === "PENDINGACTIVATION" || s === "PENDING") {
    return "amber";
  }
  if (s === "DELETED") return "slate";
  return "sky";
}

export function normalizeRoleCode(role: string): string {
  return role.toLowerCase().replace(/^role_/, "").replace(/[\s_-]+/g, "");
}

export function canonicalRoleCode(role: string): string {
  const norm = normalizeRoleCode(role);
  if (norm === "admin" || norm === "administrator") return "Admin";
  if (norm === "supportstaff" || norm === "staff") return "SupportStaff";
  if (norm === "seller") return "Seller";
  if (norm === "buyer" || norm === "customer") return "Buyer";
  return role;
}

export function roleTone(role: string): BadgeTone {
  const r = normalizeRoleCode(role);
  if (r.includes("admin")) return "indigo";
  if (r.includes("staff")) return "sky";
  if (r.includes("seller")) return "amber";
  return "slate";
}

export function getUserRoles(user: AdminUser): string[] {
  const raw: string[] = [];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    raw.push(...user.roles.map((r) => String(r)));
  } else if ((user as { role?: unknown }).role) {
    raw.push(String((user as { role?: unknown }).role));
  }
  if (raw.length === 0) return ["Buyer"];
  return Array.from(new Set(raw.map(canonicalRoleCode)));
}

export function getPrimaryRole(user: AdminUser): string {
  const canonical = getUserRoles(user);
  const precedence = ["Admin", "SupportStaff", "Seller", "Buyer"];
  for (const role of precedence) {
    if (canonical.includes(role)) return role;
  }
  return canonical[0] ?? "Buyer";
}

export type AdminErrorState = {
  message: string;
  traceId?: string;
};

export function extractAdminError(cause: unknown, fallback: string): AdminErrorState {
  if (cause && typeof cause === "object" && "message" in cause) {
    const msg = String((cause as { message: unknown }).message || fallback);
    const traceId = "traceId" in cause ? String((cause as { traceId: unknown }).traceId) : undefined;
    return { message: msg, traceId };
  }
  return { message: cause instanceof Error ? cause.message : fallback };
}

export type PolicyClause = {
  code: string;
  label: string;
};

export const SELLER_POLICY_CLAUSES: PolicyClause[] = [
  { code: "", label: "-- Chọn phân loại vi phạm (Mặc định: Vi phạm quy chuẩn vận hành) --" },
  { code: "SELLER_OPERATIONAL_VIOLATION", label: "Vi phạm quy chuẩn vận hành gian hàng" },
  { code: "SELLER_DELIVERY_DELAY", label: "Giao hàng trễ hạn nhiều lần" },
  { code: "SELLER_ORDER_CANCELLATION", label: "Tự ý hủy đơn hàng của khách" },
  { code: "SELLER_INCORRECT_INVENTORY", label: "Khai báo tồn kho ảo, không còn hàng để giao" },
  { code: "SELLER_POOR_QUALITY", label: "Tỷ lệ đánh giá tiêu cực và khiếu nại vượt ngưỡng" },
  { code: "SELLER_OFF_PLATFORM_TRANSACTION", label: "Dụ dỗ khách thanh toán ngoài sàn" },
  { code: "SELLER_HARASSMENT", label: "Xúc phạm, đe dọa hoặc quấy rối khách hàng" },
  { code: "SELLER_COUNTERFEIT_GOODS", label: "Bán hàng giả, hàng nhái hoặc vi phạm bản quyền" },
  { code: "OTHER", label: "Khác (Tự nhập nội dung riêng...)" },
];

export const ACCOUNT_BAN_POLICY_CLAUSES: PolicyClause[] = [
  { code: "", label: "-- Chọn phân loại vi phạm (Mặc định: Vi phạm quy chế nền tảng) --" },
  { code: "POL_GENERAL_TOS_VIOLATION", label: "Vi phạm nghiêm trọng quy chế sử dụng sàn" },
  { code: "POL_FRAUD_SECURITY_01", label: "Gian lận thanh toán, lừa đảo, chiếm đoạt tài sản" },
  { code: "POL_ILLEGAL_GOODS_03", label: "Buôn bán hàng cấm, vi phạm pháp luật" },
  { code: "POL_ACCOUNT_TAKEOVER_02", label: "Dấu hiệu tài khoản bị xâm phạm hoặc tấn công hệ thống" },
  { code: "POL_MULTIPLE_ACCOUNTS_ABUSE", label: "Tạo nhiều tài khoản ảo để trục lợi khuyến mãi" },
  { code: "POL_COMMUNITY_STANDARDS_04", label: "Vi phạm nghiêm trọng chuẩn mực văn hóa cộng đồng" },
  { code: "OTHER", label: "Khác (Tự nhập nội dung riêng...)" },
];

export const REPORT_POLICY_CLAUSES: PolicyClause[] = [
  { code: "", label: "-- Chọn phân loại vi phạm --" },
  { code: "POL_GENERAL_TOS_VIOLATION", label: "Vi phạm quy chế sử dụng sàn" },
  { code: "SELLER_DELIVERY_DELAY", label: "Giao hàng trễ hạn nhiều lần" },
  { code: "SELLER_ORDER_CANCELLATION", label: "Tự ý hủy đơn hàng của khách" },
  { code: "SELLER_INCORRECT_INVENTORY", label: "Khai báo tồn kho ảo, không còn hàng để giao" },
  { code: "SELLER_OFF_PLATFORM_TRANSACTION", label: "Dụ dỗ khách thanh toán ngoài sàn" },
  { code: "SELLER_HARASSMENT", label: "Xúc phạm, quấy rối khách hàng" },
  { code: "SELLER_COUNTERFEIT_GOODS", label: "Bán hàng giả, hàng nhái hoặc vi phạm bản quyền" },
  { code: "POL_ILLEGAL_GOODS_03", label: "Buôn bán hàng cấm, vi phạm pháp luật" },
  { code: "POL_FRAUD_SECURITY_01", label: "Gian lận thanh toán, lừa đảo" },
  { code: "OTHER", label: "Khác (Tự nhập nội dung riêng...)" },
];

export function formatPolicyClause(code?: string | null): string {
  if (!code) return "";
  const all = [...SELLER_POLICY_CLAUSES, ...ACCOUNT_BAN_POLICY_CLAUSES, ...REPORT_POLICY_CLAUSES];
  const found = all.find((c) => c.code === code && c.code !== "" && c.code !== "OTHER");
  return found ? found.label : code;
}
