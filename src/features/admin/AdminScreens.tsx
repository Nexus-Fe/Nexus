"use client";
/* Gateway list envelopes vary by domain; these adapters normalize their JSON records. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { isSensitiveIdentityKey } from "@/features/seller/services/seller.service";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";

export { AdminRolesScreen } from "./AdminRolesScreen";

type Obj = Record<string, any>;
const unwrap = <T,>(x: ApiResponse<T> | T): T =>
  x && typeof x === "object" && "data" in x ? (x as ApiResponse<T>).data : (x as T);
const list = (x: any): Obj[] =>
  Array.isArray(x) ? x : x?.items ?? x?.data ?? x?.users ?? x?.roles ?? x?.permissions ?? [];
const msg = (e: Error | null) => e?.message ?? "";

export function AdminUsersScreen() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("");
  const users = useApiResource(
    `/api/v1/admin/users?page=1&limit=50&keyword=${encodeURIComponent(q)}`,
    async () => list(unwrap(await api.get<ApiResponse<any>>(`/api/v1/admin/users?page=1&limit=50&keyword=${encodeURIComponent(q)}`)))
  );
  const detail = useApiResource(
    selected ? `/api/v1/admin/user/${selected}` : null,
    async () => unwrap(await api.get<ApiResponse<Obj>>(`/api/v1/admin/user/${encodeURIComponent(selected)}`))
  );
  const data = users.data ?? [];
  return (
    <>
      <PageHeading overline="Bảng điều khiển Admin" title="Quản lý tài khoản" description="Dữ liệu tài khoản được truy vấn từ User API." />
      <SectionHeading title="Danh sách tài khoản" />
      <Card>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            users.reload();
          }}
        >
          <input className="field" style={{ maxWidth: 320 }} placeholder="Tìm tên hoặc email" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="button button-secondary">Tìm kiếm</button>
        </form>
        {users.error && <p role="alert" className="notice">{msg(users.error)}</p>}
        {data.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((u, i) => (
                  <tr key={u.id ?? u.userId ?? i}>
                    <td>{u.displayName ?? u.username ?? u.id}</td>
                    <td>{u.email ?? ""}</td>
                    <td>{(u.roles ?? []).join?.(", ") ?? u.role ?? ""}</td>
                    <td>
                      <Badge>{u.status ?? (u.isActive ? "Active" : "")}</Badge>
                    </td>
                    <td>
                      <button type="button" className="button button-secondary button-small" onClick={() => setSelected(String(u.id ?? u.userId))}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData title={users.loading ? "Đang tải tài khoản…" : users.error ? "Không tải được danh sách" : "Không có người dùng"} />
        )}
      </Card>
      <SectionHeading title="Chi tiết tài khoản" />
      {detail.error && <p role="alert" className="notice">{msg(detail.error)}</p>}
      <Card className="card-pad">
        {detail.data ? (
          Object.entries(detail.data)
            .filter(([k, v]) => !isSensitiveIdentityKey(k) && (v == null || typeof v !== "object"))
            .map(([k, v]) => (
              <div className="info-row" key={k}>
                <span>{k}</span>
                <strong>{String(v ?? "—")}</strong>
              </div>
            ))
        ) : (
          <NoData title={selected ? (detail.loading ? "Đang tải…" : "Chọn tài khoản để xem") : "Chọn tài khoản để xem chi tiết"} />
        )}
      </Card>
    </>
  );
}

const adminWorkspaces = [
  ["Tài khoản", "Người dùng, trạng thái và hồ sơ", ROUTES.admin.users],
  ["Danh sách vai trò", "Xem vai trò hệ thống và tài khoản gán trực tiếp", ROUTES.admin.roles],
  ["Đấu giá", "Theo dõi phiên và xử lý vận hành", ROUTES.admin.auctions],
  ["Cấu hình đấu giá", "Ngưỡng và quy tắc phiên", ROUTES.admin.auctionConfigs],
  ["Danh mục", "Cấu trúc danh mục sản phẩm", ROUTES.admin.categories],
  ["Sổ giao dịch", "Dòng tiền và đối soát", ROUTES.admin.ledger],
  ["Nhật ký kiểm toán", "Tra cứu thay đổi có người thực hiện", ROUTES.admin.auditLog],
  ["Cấu hình hệ thống", "Tham số toàn sàn", ROUTES.admin.configs],
];

export function AdminOverviewScreen() {
  return (
    <>
      <PageHeading overline="Không gian quản trị" title="Tổng quan vận hành" description="Đi tới từng khu vực quản trị. Chỉ số sẽ xuất hiện khi có API tổng hợp được xác nhận." />
      <Card className="notice">
        <strong>Chưa có dữ liệu tổng quan</strong>
        <p>User, Finance và System Health chưa cung cấp hợp đồng REST đã xác minh cho dashboard. Nexus không hiển thị số liệu minh họa như số liệu thật.</p>
      </Card>
      <SectionHeading title="Khu vực quản trị" />
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

export function AdminAuditLogScreen() {
  const [filters, setFilters] = useState({ actorId: "", action: "", fromDate: "", toDate: "" });
  const query = new URLSearchParams({
    page: "1",
    limit: "50",
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  }).toString();
  const resource = useApiResource(
    `/api/v1/admin/audit-logs?${query}`,
    async () => list(unwrap(await api.get<ApiResponse<any>>(`/api/v1/admin/audit-logs?${query}`)))
  );
  const rows = resource.data ?? [];
  return (
    <>
      <PageHeading overline="Admin · chỉ đọc" title="Nhật ký kiểm toán" description="Tra cứu ai đã thực hiện thay đổi, đối tượng bị tác động và lý do." />
      <Card>
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            resource.reload();
          }}
        >
          <input className="field" placeholder="Mã người thực hiện" value={filters.actorId} onChange={(e) => setFilters({ ...filters, actorId: e.target.value })} />
          <input className="field" placeholder="Hành động" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
          <label>
            Từ ngày
            <input className="field" type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
          </label>
          <label>
            Đến ngày
            <input className="field" type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
          </label>
          <button className="button button-secondary">Lọc nhật ký</button>
        </form>
      </Card>
      {resource.error && <p role="alert" className="notice">Không tải được nhật ký: {msg(resource.error)}</p>}
      <Card>
        {rows.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Người thực hiện</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>Lý do</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ?? index}>
                    <td>{row.createdAt ?? "—"}</td>
                    <td>{row.actorId ?? "—"}</td>
                    <td>
                      <Badge>{row.action ?? "—"}</Badge>
                    </td>
                    <td>{row.targetEntity ?? "—"}</td>
                    <td>{row.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData title={resource.loading ? "Đang tải nhật ký…" : resource.error ? "Không có dữ liệu do Gateway trả lỗi" : "Chưa có sự kiện trong khoảng thời gian này"} />
        )}
      </Card>
    </>
  );
}

export function AdminContractScreen({ screen }: { screen: "categories" | "configs" | "coupons" | "ledger" | "system-health" }) {
  const metadata = {
    categories: { title: "Danh mục sản phẩm", endpoint: "/api/v1/categories", note: "Gateway hiện chưa xác nhận được đường dẫn Catalog tương thích; màn này chỉ đọc dữ liệu nếu endpoint hoạt động." },
    configs: { title: "Cấu hình toàn sàn", endpoint: "/api/v1/admin/configs", note: "Hiện chỉ đọc. Chưa bật lưu vì User API chưa công khai controller quản trị tương ứng trong audit backend." },
    coupons: { title: "Mã giảm giá toàn sàn", endpoint: null, note: "Gateway và backend chưa có endpoint coupon được xác nhận; chưa có dữ liệu hoặc thao tác tạo mã." },
    ledger: { title: "Sổ giao dịch và đối soát", endpoint: null, note: "Chưa có endpoint REST đọc ledger đã xác nhận. Không hiển thị giao dịch mẫu như số liệu thật." },
    "system-health": { title: "Tình trạng hệ thống", endpoint: null, note: "Chưa có hợp đồng API cho Event Log/System Health trong frontend Gateway." },
  }[screen];
  const resource = useApiResource(metadata.endpoint, async () => list(unwrap(await api.get<ApiResponse<any>>(metadata.endpoint!))));
  const records = resource.data ?? [];
  return (
    <>
      <PageHeading overline="Không gian quản trị" title={metadata.title} description={metadata.note} />
      {resource.error && <p role="alert" className="notice">Gateway không trả dữ liệu: {msg(resource.error)}</p>}
      <Card>
        {records.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(records[0])
                    .filter((key) => !isSensitiveIdentityKey(key))
                    .slice(0, 6)
                    .map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {records.map((row, index) => (
                  <tr key={row.id ?? row.key ?? index}>
                    {Object.keys(records[0])
                      .filter((key) => !isSensitiveIdentityKey(key))
                      .slice(0, 6)
                      .map((key) => (
                        <td key={key}>{String(row[key] ?? "—")}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData title={resource.loading ? "Đang tải dữ liệu…" : resource.error ? "Dữ liệu chưa sẵn sàng từ Gateway" : "Chưa có API dữ liệu cho khu vực này"} />
        )}
      </Card>
      <p className="status-note">Các thao tác ghi đang tắt cho đến khi hợp đồng và quyền backend được xác nhận.</p>
    </>
  );
}
