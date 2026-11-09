"use client";
/* Gateway list envelopes vary by domain; these adapters normalize their JSON records. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Badge, Card, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { AdminCategoriesScreen } from "./AdminCategoriesScreen";
import { AdminConfigsScreen } from "./AdminConfigsScreen";
import { AdminCouponsScreen } from "./AdminCouponsScreen";
import { AdminLedgerScreen } from "./AdminLedgerScreen";
import { AdminRolesScreen } from "./AdminRolesScreen";

export {
  AdminCategoriesScreen,
  AdminConfigsScreen,
  AdminCouponsScreen,
  AdminLedgerScreen,
  AdminRolesScreen,
};

const adminWorkspaces = [
  ["Tài khoản người dùng", "Quản lý hồ sơ, tạo tài khoản nội bộ, điểm uy tín và khóa/mở khóa", ROUTES.admin.users],
  ["Danh mục sản phẩm", "Cấu trúc cây danh mục toàn sàn (bao gồm cả danh mục đang ẩn)", ROUTES.admin.categories],
  ["Giám sát đấu giá", "Theo dõi phiên đấu giá trực tiếp, lịch sử lượt đặt giá (bids)", ROUTES.admin.auctions],
  ["Cấu hình đấu giá", "Quy tắc chống sniping, bước giá và điểm uy tín đấu giá", ROUTES.admin.auctionConfigs],
  ["Cấu hình toàn sàn", "Tham số vận hành động của toàn hệ thống", ROUTES.admin.configs],
  ["Mã giảm giá toàn sàn", "Thiết lập và quản lý các chương trình khuyến mãi", ROUTES.admin.coupons],
  ["Sổ cái & Đối soát ví", "Duyệt yêu cầu rút tiền và điều chỉnh số dư ví theo ID", ROUTES.admin.ledger],
] as const;

type OverviewSnapshot = {
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
    const [usersRes, reportsRes] = await Promise.allSettled([
      api.get<ApiResponse<any>>("/api/v1/admin/users?page=1&pageSize=1", { signal }),
      api.get<ApiResponse<any>>("/api/v1/admin/reports?status=Pending&page=1&pageSize=1", { signal }),
    ]);

    const snapshot: OverviewSnapshot = {
      usersCount:
        usersRes.status === "fulfilled" ? extractTotalCount(usersRes.value) : null,
      auctionsCount: null,
      pendingReportsCount:
        reportsRes.status === "fulfilled" ? extractTotalCount(reportsRes.value) : null,
    };

    return snapshot;
  });

  const data = overview.data;

  return (
    <>
      <PageHeading
        overline="Quản trị hệ thống"
        title="Tổng quan vận hành hệ thống"
        description="Theo dõi tình trạng hoạt động của người dùng và các phân hệ trên sàn."
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

      <div className="grid-3" style={{ marginBottom: "24px" }}>
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
          <span style={{ display: "inline-block", height: "32px" }} />
        </Card>
      </div>

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

export function AdminContractScreen({
  screen,
}: {
  screen: "categories" | "configs" | "coupons" | "ledger";
}) {
  if (screen === "categories") return <AdminCategoriesScreen />;
  if (screen === "configs") return <AdminConfigsScreen />;
  if (screen === "coupons") return <AdminCouponsScreen />;
  return <AdminLedgerScreen />;
}
