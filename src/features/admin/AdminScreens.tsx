"use client";
/* Gateway list envelopes vary by domain; these adapters normalize their JSON records. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AdminPagination, Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { auditLogService } from "@/features/audit-log/services/audit-log.service";
import type { AuditLogItem } from "@/features/audit-log/types";
import { ApiError, api, unwrap, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { AdminCategoriesScreen } from "./AdminCategoriesScreen";
import { AdminConfigsScreen } from "./AdminConfigsScreen";
import { AdminCouponsScreen } from "./AdminCouponsScreen";
import { AdminLedgerScreen } from "./AdminLedgerScreen";
import { AdminRolesScreen } from "./AdminRolesScreen";
import { AdminSystemHealthScreen } from "./AdminSystemHealthScreen";

export {
  AdminCategoriesScreen,
  AdminConfigsScreen,
  AdminCouponsScreen,
  AdminLedgerScreen,
  AdminRolesScreen,
  AdminSystemHealthScreen,
};

const msg = (e: Error | null) => e?.message ?? "";

const adminWorkspaces = [
  ["Tài khoản người dùng", "Quản lý hồ sơ, tạo tài khoản nội bộ, điểm uy tín và khóa/mở khóa", ROUTES.admin.users],
  ["Vai trò & Phân quyền", "Quản lý vai trò hệ thống (1-User 1-Primary-Role) và gán quyền", ROUTES.admin.roles],
  ["Danh mục sản phẩm", "Cấu trúc cây danh mục toàn sàn (bao gồm cả danh mục đang ẩn)", ROUTES.admin.categories],
  ["Giám sát đấu giá", "Theo dõi phiên đấu giá trực tiếp, lịch sử lượt đặt giá (bids)", ROUTES.admin.auctions],
  ["Cấu hình đấu giá", "Quy tắc chống sniping, bước giá và điểm uy tín đấu giá", ROUTES.admin.auctionConfigs],
  ["Cấu hình toàn sàn", "Tham số vận hành động của toàn hệ thống", ROUTES.admin.configs],
  ["Mã giảm giá toàn sàn", "Thiết lập và quản lý các chương trình khuyến mãi", ROUTES.admin.coupons],
  ["Sổ cái & Đối soát ví", "Duyệt yêu cầu rút tiền và điều chỉnh số dư ví theo ID", ROUTES.admin.ledger],
  ["Nhật ký kiểm toán", "Tra cứu và theo dõi các sự kiện thay đổi dữ liệu trên hệ thống", ROUTES.admin.auditLog],
  ["Tình trạng hệ thống", "Giám sát thời gian thực các dịch vụ và cơ sở dữ liệu", ROUTES.admin.systemHealth],
] as const;

type OverviewTargetStatus = {
  name: string;
  kind: string;
  isEnabled: boolean;
  currentStatus: string;
  lastLatencyMs: number;
};

type OverviewSnapshot = {
  health: {
    available: boolean;
    overallStatus: string;
    healthyServices: number;
    enabledServices: number;
    totalServices: number;
    healthyDatabases: number;
    enabledDatabases: number;
    totalDatabases: number;
    services: OverviewTargetStatus[];
    databases: OverviewTargetStatus[];
  };
  usersCount: number | null;
  auctionsCount: number | null;
  pendingReportsCount: number | null;
};

function extractTotalCount(raw: unknown): number {
  const payload = unwrap(raw as any);
  if (payload && typeof payload === "object") {
    if (typeof (payload as any).pagination?.totalCount === "number") {
      return (payload as any).pagination.totalCount;
    }
    if (typeof (payload as any).total === "number") {
      return (payload as any).total;
    }
    if (Array.isArray((payload as any).items)) {
      return (payload as any).items.length;
    }
  }
  if (Array.isArray(payload)) {
    return payload.length;
  }
  return 0;
}

export function AdminOverviewScreen() {
  const overview = useApiResource("admin-overview-metrics", async (signal) => {
    const [healthRes, usersRes, reportsRes] = await Promise.allSettled([
      api.get<ApiResponse<any>>("/api/v1/healthcheck/status", { signal }),
      api.get<ApiResponse<any>>("/api/v1/admin/users?page=1&pageSize=1", { signal }),
      api.get<ApiResponse<any>>("/api/v1/admin/reports?status=Pending&page=1&pageSize=1", { signal }),
    ]);

    const healthPayload =
      healthRes.status === "fulfilled" ? unwrap(healthRes.value) : null;
    const healthData = healthPayload?.summary ?? null;

    const snapshot: OverviewSnapshot = {
      health: {
        available: Boolean(healthData),
        overallStatus: String(healthData?.overallStatus ?? "unknown"),
        healthyServices: Number(healthData?.healthyServices ?? 0),
        enabledServices: Number(healthData?.enabledServices ?? 0),
        totalServices: Number(healthData?.totalServices ?? 8),
        healthyDatabases: Number(healthData?.healthyDatabases ?? 0),
        enabledDatabases: Number(healthData?.enabledDatabases ?? 0),
        totalDatabases: Number(healthData?.totalDatabases ?? 8),
        services: Array.isArray(healthPayload?.services) ? healthPayload.services : [],
        databases: Array.isArray(healthPayload?.databases) ? healthPayload.databases : [],
      },
      usersCount:
        usersRes.status === "fulfilled" ? extractTotalCount(usersRes.value) : null,
      auctionsCount: null,
      pendingReportsCount:
        reportsRes.status === "fulfilled" ? extractTotalCount(reportsRes.value) : null,
    };

    return snapshot;
  });

  const data = overview.data;
  const healthStatusNorm = (data?.health.overallStatus ?? "").toLowerCase();
  const healthBadgeTone =
    healthStatusNorm === "healthy"
      ? "green"
      : healthStatusNorm === "degraded"
        ? "amber"
        : healthStatusNorm === "unhealthy"
          ? "red"
          : "sky";

  return (
    <>
      <PageHeading
        overline="Quản trị hệ thống"
        title="Tổng quan vận hành hệ thống"
        description="Theo dõi tình trạng hoạt động của hạ tầng, người dùng và các phân hệ trên sàn."
        action={
          <button
            type="button"
            className="button button-secondary button-small"
            disabled={overview.loading}
            onClick={overview.reload}
          >
            {overview.loading ? "Đang cập nhật…" : "Làm mới số liệu"}
          </button>
        }
      />

      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <Card className="card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Sức khỏe hệ thống</span>
            <Badge tone={healthBadgeTone}>
              {data?.health.available ? data.health.overallStatus.toUpperCase() : "CHỜ KẾT NỐI"}
            </Badge>
          </div>
          <strong style={{ display: "block", fontSize: "24px", margin: "10px 0 4px" }}>
            {data?.health.available
              ? `${data.health.healthyServices}/${data.health.totalServices} Dịch vụ hoạt động`
              : overview.loading
                ? "Đang tải…"
                : "8 Dịch vụ"}
          </strong>
          <small style={{ display: "block", color: "var(--muted)", marginBottom: "10px" }}>
            {data?.health.available
              ? "Hệ thống dịch vụ và cơ sở dữ liệu hoạt động ổn định"
              : "Kiểm tra trực tiếp tại Tình trạng hệ thống"}
          </small>
          <Link className="button button-secondary button-small" href={ROUTES.admin.systemHealth}>
            Mở giám sát hạ tầng
          </Link>
        </Card>

        <Card className="card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Tài khoản toàn sàn</span>
            <Badge tone="indigo">Người dùng</Badge>
          </div>
          <strong style={{ display: "block", fontSize: "24px", margin: "10px 0 4px" }}>
            {data?.usersCount != null
              ? data.usersCount.toLocaleString("vi-VN")
              : overview.loading
                ? "Đang tải…"
                : "—"}
          </strong>
          <small style={{ display: "block", color: "var(--muted)", marginBottom: "10px" }}>
            Tổng số tài khoản người dùng trên toàn sàn
          </small>
          <Link className="button button-secondary button-small" href={ROUTES.admin.users}>
            Quản lý tài khoản
          </Link>
        </Card>

        <Card className="card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Phiên đấu giá</span>
            <Badge tone="amber">Sắp ra mắt</Badge>
          </div>
          <strong style={{ display: "block", fontSize: "24px", margin: "10px 0 4px" }}>
            Coming Soon
          </strong>
          <small style={{ display: "block", color: "var(--muted)", marginBottom: "10px" }}>
            Tính năng đấu giá đang được hoàn thiện
          </small>
          <Link className="button button-secondary button-small" href={ROUTES.admin.auctions}>
            Xem chi tiết
          </Link>
        </Card>

        <Card className="card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Báo cáo chờ xử lý</span>
            <Badge tone={data?.pendingReportsCount ? "amber" : "slate"}>Báo cáo</Badge>
          </div>
          <strong style={{ display: "block", fontSize: "24px", margin: "10px 0 4px" }}>
            {data?.pendingReportsCount != null
              ? data.pendingReportsCount.toLocaleString("vi-VN")
              : overview.loading
                ? "Đang tải…"
                : "—"}
          </strong>
          <small style={{ display: "block", color: "var(--muted)", marginBottom: "10px" }}>
            Báo cáo vi phạm đang chờ xem xét
          </small>
          <Link className="button button-secondary button-small" href={ROUTES.admin.auditLog}>
            Tra cứu nhật ký
          </Link>
        </Card>
      </div>

      {data?.health.available && data.health.services.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <SectionHeading
            title="Trạng thái dịch vụ & cơ sở dữ liệu"
            hint="Giám sát thời gian thực các thành phần hệ thống"
          />
          <Card className="card-pad">
            <div className="grid-4" style={{ gap: "10px" }}>
              {data.health.services.map((svc) => {
                const st = (svc.currentStatus ?? "").toLowerCase();
                const tone =
                  st === "healthy"
                    ? "green"
                    : st === "degraded"
                      ? "amber"
                      : st === "unhealthy"
                        ? "red"
                        : "slate";
                const db = data.health.databases.find((d) => d.name === svc.name);
                return (
                  <div
                    key={svc.name}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      background: "var(--surface)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <strong style={{ textTransform: "capitalize" }}>{svc.name}</strong>
                      <Badge tone={tone}>{svc.currentStatus}</Badge>
                    </div>
                    <small style={{ color: "var(--muted)", display: "block" }}>
                      Độ trễ: {svc.lastLatencyMs}ms · DB: {db?.currentStatus ?? "Không khả dụng"}
                    </small>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <SectionHeading
        title="Lối tắt quản lý"
        hint="Truy cập nhanh các phân hệ chức năng"
      />
      <div className="form-grid">
        {adminWorkspaces.map(([title, description, href]) => (
          <Link className="card card-pad" href={href} key={href}>
            <h2>{title}</h2>
            <p>{description}</p>
            <span className="button button-secondary button-small">Mở khu vực</span>
          </Link>
        ))}
      </div>
    </>
  );
}

function scrubPayloadValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubPayloadValue);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/^(password|passwordhash|refreshtoken|accesstoken|secret|apikey|connectionstring)$/i.test(k)) {
        out[k] = "[REDACTED]";
      } else if (/^(identifynumber|identitynumber|cccd)$/i.test(k) && typeof v === "string") {
        out[k] = v.length > 4 ? `••••••••${v.slice(-4)}` : "••••";
      } else {
        out[k] = scrubPayloadValue(v);
      }
    }
    return out;
  }
  return value;
}

function formatPrettyPayload(raw?: string): string {
  if (!raw || !raw.trim()) return "Không có dữ liệu payload chi tiết.";
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(scrubPayloadValue(parsed), null, 2);
  } catch {
    return raw;
  }
}

type FilterOptionGroup = {
  service: string;
  label: string;
  options: { value: string; label: string }[];
};

const EVENT_TYPE_GROUPS: FilterOptionGroup[] = [
  {
    service: "user-service",
    label: "Tài khoản & Phân quyền (user-service)",
    options: [
      { value: "USER_REGISTER", label: "USER_REGISTER - Đăng ký tài khoản" },
      { value: "USER_LOGIN", label: "USER_LOGIN - Đăng nhập" },
      { value: "USER_LOGOUT", label: "USER_LOGOUT - Đăng xuất" },
      { value: "USER_BANNED", label: "USER_BANNED - Khóa người dùng" },
      { value: "USER_UNBANNED", label: "USER_UNBANNED - Mở khóa người dùng" },
      { value: "SELLER_APPROVE", label: "SELLER_APPROVE - Duyệt hồ sơ Seller" },
      { value: "SELLER_REJECT", label: "SELLER_REJECT - Từ chối hồ sơ Seller" },
      { value: "ROLE_ASSIGN", label: "ROLE_ASSIGN - Gán vai trò quản trị" },
      { value: "ROLE_REVOKE", label: "ROLE_REVOKE - Thu hồi vai trò" },
      { value: "PROFILE_UPDATE", label: "PROFILE_UPDATE - Cập nhật thông tin" },
      { value: "PASSWORD_CHANGE", label: "PASSWORD_CHANGE - Đổi mật khẩu" },
    ],
  },
  {
    service: "catalog-service",
    label: "Danh mục & Sản phẩm (catalog-service)",
    options: [
      { value: "CATEGORY_CREATE", label: "CATEGORY_CREATE - Tạo danh mục" },
      { value: "CATEGORY_UPDATE", label: "CATEGORY_UPDATE - Cập nhật danh mục" },
      { value: "CATEGORY_DELETE", label: "CATEGORY_DELETE - Xóa danh mục" },
      { value: "PRODUCT_CREATE", label: "PRODUCT_CREATE - Đăng sản phẩm mới" },
      { value: "PRODUCT_UPDATE", label: "PRODUCT_UPDATE - Chỉnh sửa sản phẩm" },
      { value: "PRODUCT_STATUS_CHANGE", label: "PRODUCT_STATUS_CHANGE - Đổi trạng thái" },
      { value: "INVENTORY_UPDATE", label: "INVENTORY_UPDATE - Cập nhật tồn kho" },
    ],
  },
  {
    service: "auction-service",
    label: "Đấu giá (auction-service)",
    options: [
      { value: "AUCTION_CREATE", label: "AUCTION_CREATE - Tạo phiên đấu giá" },
      { value: "AUCTION_START", label: "AUCTION_START - Bắt đầu đấu giá" },
      { value: "AUCTION_BID", label: "AUCTION_BID - Khách đặt giá thầu" },
      { value: "AUCTION_END", label: "AUCTION_END - Kết thúc phiên đấu giá" },
      { value: "AUCTION_CANCEL", label: "AUCTION_CANCEL - Hủy phiên đấu giá" },
    ],
  },
  {
    service: "commerce-service",
    label: "Đơn hàng & Giỏ hàng (commerce-service)",
    options: [
      { value: "ORDER_CREATED", label: "ORDER_CREATED - Khởi tạo đơn hàng" },
      { value: "ORDER_PAID", label: "ORDER_PAID - Thanh toán thành công" },
      { value: "ORDER_CONFIRMED", label: "ORDER_CONFIRMED - Xác nhận đơn hàng" },
      { value: "ORDER_CANCELLED", label: "ORDER_CANCELLED - Hủy đơn hàng" },
      { value: "CHECKOUT_COMPLETED", label: "CHECKOUT_COMPLETED - Hoàn tất thanh toán" },
    ],
  },
  {
    service: "fulfillment-service",
    label: "Giao vận (fulfillment-service)",
    options: [
      { value: "SHIPMENT_CREATED", label: "SHIPMENT_CREATED - Tạo vận đơn vận chuyển" },
      { value: "SHIPMENT_SHIPPED", label: "SHIPMENT_SHIPPED - Đang vận chuyển" },
      { value: "SHIPMENT_DELIVERED", label: "SHIPMENT_DELIVERED - Giao hàng thành công" },
      { value: "SHIPMENT_CANCELLED", label: "SHIPMENT_CANCELLED - Hủy vận chuyển" },
    ],
  },
  {
    service: "wallet-service",
    label: "Ví điện tử & Thanh toán (wallet-service)",
    options: [
      { value: "WALLET_TOPUP", label: "WALLET_TOPUP - Nạp tiền vào ví" },
      { value: "WALLET_WITHDRAW", label: "WALLET_WITHDRAW - Yêu cầu rút tiền" },
      { value: "WALLET_TRANSFER", label: "WALLET_TRANSFER - Chuyển tiền ví" },
      { value: "ESCROW_HOLD", label: "ESCROW_HOLD - Tạm giữ tiền ký quỹ" },
      { value: "ESCROW_RELEASE", label: "ESCROW_RELEASE - Giải ngân tiền ký quỹ" },
    ],
  },
  {
    service: "log-service",
    label: "Hệ thống & Bảo mật (log-service / system)",
    options: [
      { value: "SYSTEM_CONFIG_UPDATE", label: "SYSTEM_CONFIG_UPDATE - Cập nhật cấu hình hệ thống" },
      { value: "SECURITY_ALERT", label: "SECURITY_ALERT - Cảnh báo bảo mật" },
    ],
  },
];

const ENTITY_GROUPS: FilterOptionGroup[] = [
  {
    service: "user-service",
    label: "Người dùng & Phân quyền (user-service)",
    options: [
      { value: "User", label: "User - Người dùng" },
      { value: "SellerProfile", label: "SellerProfile - Hồ sơ người bán" },
      { value: "Role", label: "Role - Vai trò quản trị" },
      { value: "Permission", label: "Permission - Quyền hạn" },
    ],
  },
  {
    service: "catalog-service",
    label: "Sản phẩm & Danh mục (catalog-service)",
    options: [
      { value: "Category", label: "Category - Danh mục ngành hàng" },
      { value: "Product", label: "Product - Sản phẩm" },
      { value: "ProductVariant", label: "ProductVariant - Biến thể sản phẩm" },
      { value: "ProductImage", label: "ProductImage - Hình ảnh sản phẩm" },
    ],
  },
  {
    service: "auction-service",
    label: "Đấu giá (auction-service)",
    options: [
      { value: "Auction", label: "Auction - Phiên đấu giá" },
      { value: "AuctionBid", label: "AuctionBid - Lượt đặt giá" },
      { value: "AuctionConfig", label: "AuctionConfig - Cấu hình đấu giá" },
    ],
  },
  {
    service: "commerce-service",
    label: "Đơn hàng & Giỏ hàng (commerce-service)",
    options: [
      { value: "Order", label: "Order - Đơn hàng" },
      { value: "SubOrder", label: "SubOrder - Đơn con theo shop" },
      { value: "Cart", label: "Cart - Giỏ hàng" },
      { value: "Checkout", label: "Checkout - Phiên thanh toán" },
    ],
  },
  {
    service: "fulfillment-service",
    label: "Vận chuyển (fulfillment-service)",
    options: [
      { value: "Shipment", label: "Shipment - Kiện hàng / Vận đơn" },
      { value: "ShippingAddress", label: "ShippingAddress - Địa chỉ giao hàng" },
    ],
  },
  {
    service: "wallet-service",
    label: "Ví & Dòng tiền (wallet-service)",
    options: [
      { value: "Wallet", label: "Wallet - Ví điện tử" },
      { value: "WalletTransaction", label: "WalletTransaction - Giao dịch ví" },
      { value: "WithdrawalRequest", label: "WithdrawalRequest - Yêu cầu rút tiền" },
    ],
  },
  {
    service: "log-service",
    label: "Hệ thống (system)",
    options: [
      { value: "SystemConfig", label: "SystemConfig - Cấu hình hệ thống" },
      { value: "Coupon", label: "Coupon - Mã giảm giá" },
    ],
  },
];

export function AdminAuditLogScreen() {
  const [filters, setFilters] = useState({
    actorUserId: "",
    serviceName: "",
    eventType: "",
    entityName: "",
    logLevel: "",
    from: "",
    to: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedText, setCopiedText] = useState("");
  const [customEventMode, setCustomEventMode] = useState(false);
  const [customEntityMode, setCustomEntityMode] = useState(false);

  const pageSize = 20;
  const filterKey = JSON.stringify({ page, ...appliedFilters });

  const filteredEventGroups = filters.serviceName
    ? EVENT_TYPE_GROUPS.filter((g) => g.service === filters.serviceName)
    : EVENT_TYPE_GROUPS;

  const filteredEntityGroups = filters.serviceName
    ? ENTITY_GROUPS.filter((g) => g.service === filters.serviceName)
    : ENTITY_GROUPS;

  const resource = useApiResource(`admin-logs:${filterKey}`, (signal) =>
    auditLogService.list(
      {
        page,
        pageSize,
        ...appliedFilters,
      },
      signal,
    ),
  );

  const rows = resource.data?.items ?? [];
  const total = resource.data?.total ?? 0;

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({
      actorUserId: filters.actorUserId.trim(),
      serviceName: filters.serviceName.trim(),
      eventType: filters.eventType.trim(),
      entityName: filters.entityName.trim(),
      logLevel: filters.logLevel.trim(),
      from: filters.from,
      to: filters.to,
    });
  }

  function resetFilters() {
    const empty = {
      actorUserId: "",
      serviceName: "",
      eventType: "",
      entityName: "",
      logLevel: "",
      from: "",
      to: "",
    };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
    setCustomEventMode(false);
    setCustomEntityMode(false);
  }

  function applyDatePreset(days: number) {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    if (days === 0) {
      setFilters((prev) => ({ ...prev, from: toStr, to: toStr }));
    } else {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const fromStr = fromDate.toISOString().slice(0, 10);
      setFilters((prev) => ({ ...prev, from: fromStr, to: toStr }));
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(""), 1800);
    } catch {
      // Ignore clipboard failures
    }
  }

  return (
    <>
      <PageHeading
        overline="Bảo mật & Giám sát"
        title="Nhật ký kiểm toán"
        description="Tra cứu và theo dõi toàn bộ các sự kiện thay đổi dữ liệu, thao tác quản trị trên hệ thống."
      />

      <Card style={{ marginBottom: "20px" }}>
        <form className="audit-filter-form" onSubmit={handleFilterSubmit}>
          <div className="audit-filter-grid">
            <label className="field-wrap">
              <span>Mã người thực hiện (Actor ID)</span>
              <input
                className="field"
                placeholder="UUID người thực hiện..."
                value={filters.actorUserId}
                onChange={(e) => setFilters({ ...filters, actorUserId: e.target.value })}
              />
            </label>

            <label className="field-wrap">
              <span>Dịch vụ (Service)</span>
              <select
                className="select-field"
                value={filters.serviceName}
                onChange={(e) => setFilters({ ...filters, serviceName: e.target.value })}
              >
                <option value="">Tất cả dịch vụ</option>
                <option value="user-service">user-service</option>
                <option value="catalog-service">catalog-service</option>
                <option value="auction-service">auction-service</option>
                <option value="commerce-service">commerce-service</option>
                <option value="wallet-service">wallet-service</option>
                <option value="fulfillment-service">fulfillment-service</option>
                <option value="notification-service">notification-service</option>
                <option value="log-service">log-service</option>
              </select>
            </label>

            {/* Sự kiện / Hành động */}
            <label className="field-wrap">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Sự kiện / Hành động</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEventMode((prev) => !prev);
                    setFilters((prev) => ({ ...prev, eventType: "" }));
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sky-dark)",
                    fontSize: 11,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                  title={customEventMode ? "Chọn từ danh sách có sẵn" : "Nhập tay tên sự kiện tùy chỉnh"}
                >
                  {customEventMode ? "← Chọn danh sách" : "✏️ Nhập tay"}
                </button>
              </div>
              {customEventMode ? (
                <input
                  className="field"
                  placeholder="Ví dụ: UserBanned, RoleAssign..."
                  value={filters.eventType}
                  onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                  autoFocus
                />
              ) : (
                <select
                  className="select-field"
                  value={filters.eventType}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setCustomEventMode(true);
                      setFilters({ ...filters, eventType: "" });
                    } else {
                      setFilters({ ...filters, eventType: e.target.value });
                    }
                  }}
                >
                  <option value="">Tất cả sự kiện / hành động</option>
                  {filteredEventGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__custom__">✏️ Nhập sự kiện tùy chỉnh khác...</option>
                </select>
              )}
            </label>

            {/* Đối tượng (Entity) */}
            <label className="field-wrap">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Đối tượng (Entity)</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEntityMode((prev) => !prev);
                    setFilters((prev) => ({ ...prev, entityName: "" }));
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sky-dark)",
                    fontSize: 11,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                  title={customEntityMode ? "Chọn từ danh sách có sẵn" : "Nhập tay tên đối tượng tùy chỉnh"}
                >
                  {customEntityMode ? "← Chọn danh sách" : "✏️ Nhập tay"}
                </button>
              </div>
              {customEntityMode ? (
                <input
                  className="field"
                  placeholder="Ví dụ: User, Category, Order..."
                  value={filters.entityName}
                  onChange={(e) => setFilters({ ...filters, entityName: e.target.value })}
                  autoFocus
                />
              ) : (
                <select
                  className="select-field"
                  value={filters.entityName}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setCustomEntityMode(true);
                      setFilters({ ...filters, entityName: "" });
                    } else {
                      setFilters({ ...filters, entityName: e.target.value });
                    }
                  }}
                >
                  <option value="">Tất cả đối tượng (Entity)</option>
                  {filteredEntityGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__custom__">✏️ Nhập đối tượng tùy chỉnh khác...</option>
                </select>
              )}
            </label>

            <label className="field-wrap">
              <span>Mức độ (Log Level)</span>
              <select
                className="select-field"
                value={filters.logLevel}
                onChange={(e) => setFilters({ ...filters, logLevel: e.target.value })}
              >
                <option value="">Tất cả mức độ</option>
                <option value="INFO">INFO (Thông tin)</option>
                <option value="WARN">WARN (Cảnh báo)</option>
                <option value="ERROR">ERROR (Lỗi)</option>
                <option value="DEBUG">DEBUG (Gỡ lỗi)</option>
              </select>
            </label>

            <label className="field-wrap">
              <span>Từ ngày</span>
              <input
                className="field"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </label>

            <label className="field-wrap">
              <span>Đến ngày</span>
              <input
                className="field"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </label>

            <div className="field-wrap">
              <span style={{ visibility: "hidden" }}>Thao tác</span>
              <div className="audit-filter-actions">
                <button type="submit" className="button button-primary">
                  Lọc nhật ký
                </button>
                <button type="button" className="button button-secondary" onClick={resetFilters}>
                  Đặt lại
                </button>
              </div>
            </div>
          </div>

          <div className="quick-date-group">
            <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 4 }}>Chọn nhanh:</span>
            <button
              type="button"
              className="quick-date-btn"
              onClick={() => applyDatePreset(0)}
            >
              Hôm nay
            </button>
            <button
              type="button"
              className="quick-date-btn"
              onClick={() => applyDatePreset(7)}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              className="quick-date-btn"
              onClick={() => applyDatePreset(30)}
            >
              30 ngày qua
            </button>
          </div>
        </form>
      </Card>

      {resource.error && (
        <div role="alert" className="notice" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          <div>
            <strong>Không tải được nhật ký:</strong> {msg(resource.error)}
          </div>
          {resource.error instanceof ApiError && resource.error.status === 401 && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              Yêu cầu quyền Quản trị viên (Admin / Staff) để truy cập nhật ký kiểm toán. Vui lòng đăng nhập tài khoản có quyền phù hợp.
            </p>
          )}
          {resource.error instanceof ApiError &&
            (resource.error.status === 502 ||
              resource.error.status === 503 ||
              resource.error.errorCode === "GATEWAY_UNAVAILABLE") && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              Không thể kết nối đến backend LogService (cổng 8004) qua API Gateway. Vui lòng kiểm tra container <code>nexus-log-service</code> đã chạy hay chưa.
            </p>
          )}
          {resource.error instanceof ApiError && resource.error.traceId && (
            <button
              type="button"
              className="button button-secondary button-small"
              style={{ alignSelf: "flex-start", marginTop: 4 }}
              onClick={() =>
                void copyToClipboard((resource.error as ApiError).traceId!, "error-trace")
              }
            >
              {copiedText === "error-trace"
                ? "Đã sao chép Trace ID"
                : `Copy Trace ID: ${resource.error.traceId}`}
            </button>
          )}
        </div>
      )}

      {copiedText && copiedText !== "error-trace" && (
        <p role="status" className="form-success">
          {copiedText}
        </p>
      )}

      <Card>
        {rows.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Mức độ</th>
                  <th>Dịch vụ</th>
                  <th>Hành động / Sự kiện</th>
                  <th>Đối tượng tác động</th>
                  <th>Người thực hiện</th>
                  <th>Trace ID</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const timeValue = row.occurredAt ?? row.createdAt;
                  const actor = row.actorUserId ?? row.actorId ?? "—";
                  const entity = row.entityName ?? row.resource ?? "—";
                  const level = (row.logLevel || "INFO").toUpperCase();
                  const levelTone: "red" | "amber" | "sky" | "slate" =
                    level === "ERROR" || level === "CRITICAL" || level === "FATAL"
                      ? "red"
                      : level === "WARN" || level === "WARNING"
                        ? "amber"
                        : "slate";
                  return (
                    <tr key={row.id ?? index}>
                      <td>
                        {timeValue ? new Date(timeValue).toLocaleString("vi-VN") : "—"}
                      </td>
                      <td>
                        <Badge tone={levelTone}>{level}</Badge>
                      </td>
                      <td>
                        <Badge tone="slate">{row.serviceName || "system"}</Badge>
                      </td>
                      <td>
                        <Badge tone="sky">{row.action || row.eventType || "—"}</Badge>
                        {row.eventType && row.action && row.eventType !== row.action && (
                          <small style={{ display: "block", color: "var(--muted)" }}>
                            {row.eventType}
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{entity}</strong>
                        {row.entityId && (
                          <small style={{ display: "block", color: "var(--muted)" }}>
                            ID: <code>{row.entityId}</code>
                          </small>
                        )}
                      </td>
                      <td>
                        <code>{actor}</code>
                        {row.actorRole && (
                          <small style={{ display: "block", color: "var(--muted)" }}>
                            Vai trò: {row.actorRole}
                          </small>
                        )}
                      </td>
                      <td>
                        {row.traceId ? (
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            title="Sao chép Trace ID để đối chiếu trong F12 Network"
                            onClick={() =>
                              void copyToClipboard(
                                row.traceId!,
                                `Đã sao chép Trace ID: ${row.traceId}`,
                              )
                            }
                          >
                            Copy Trace ID
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => setSelectedLog(row)}
                        >
                          Xem Payload
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải nhật ký kiểm toán…"
                : resource.error
                  ? "Không có dữ liệu do Gateway trả lỗi"
                  : "Chưa có sự kiện nào khớp với bộ lọc hiện tại"
            }
          />
        )}

        <AdminPagination
          page={page}
          pageSize={pageSize}
          totalItems={total}
          loading={resource.loading}
          onPageChange={(nextPage) => setPage(nextPage)}
          itemLabel="bản ghi nhật ký"
        />
      </Card>

      {selectedLog && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelectedLog(null);
          }}
        >
          <section
            className="admin-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-payload-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="audit-payload-modal-title">Chi tiết sự kiện kiểm toán</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  ID sự kiện: <code>{selectedLog.id}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedLog(null)}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
              <div className="info-row">
                <span>Thời điểm ghi nhận</span>
                <strong>
                  {selectedLog.occurredAt
                    ? new Date(selectedLog.occurredAt).toLocaleString("vi-VN")
                    : "—"}
                </strong>
              </div>
              <div className="info-row">
                <span>Dịch vụ & Sự kiện</span>
                <strong>
                  {selectedLog.serviceName} · {selectedLog.eventType || selectedLog.action}
                </strong>
              </div>
              <div className="info-row">
                <span>Đối tượng tác động</span>
                <strong>
                  {selectedLog.entityName} ({selectedLog.entityId || "—"})
                </strong>
              </div>
              <div className="info-row">
                <span>Người thực hiện</span>
                <strong>
                  {selectedLog.actorUserId || "—"} {selectedLog.actorRole ? `(${selectedLog.actorRole})` : ""}
                </strong>
              </div>
              <div className="info-row">
                <span>Trace ID / Correlation ID</span>
                <code>
                  {selectedLog.traceId || "—"} / {selectedLog.correlationId || "—"}
                </code>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong>Dữ liệu JSON Payload (Đã ẩn trường nhạy cảm)</strong>
                <div className="action-row">
                  {selectedLog.traceId && (
                    <button
                      type="button"
                      className="button button-secondary button-small"
                      onClick={() =>
                        void copyToClipboard(
                          selectedLog.traceId!,
                          `Đã sao chép Trace ID: ${selectedLog.traceId}`,
                        )
                      }
                    >
                      Copy Trace ID
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() =>
                      void copyToClipboard(
                        formatPrettyPayload(selectedLog.payload),
                        "Đã sao chép nội dung JSON Payload.",
                      )
                    }
                  >
                    Sao chép JSON
                  </button>
                </div>
              </div>
              <pre
                style={{
                  background: "#0f172a",
                  color: "#e2e8f0",
                  padding: "14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  overflowX: "auto",
                  maxHeight: "320px",
                  margin: 0,
                }}
              >
                {formatPrettyPayload(selectedLog.payload)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedLog(null)}
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function AdminContractScreen({
  screen,
}: {
  screen: "categories" | "configs" | "coupons" | "ledger" | "system-health";
}) {
  if (screen === "categories") return <AdminCategoriesScreen />;
  if (screen === "configs") return <AdminConfigsScreen />;
  if (screen === "coupons") return <AdminCouponsScreen />;
  if (screen === "ledger") return <AdminLedgerScreen />;
  return <AdminSystemHealthScreen />;
}
