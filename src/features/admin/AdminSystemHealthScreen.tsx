"use client";

import { useState } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import {
  adminHealthService,
  type TargetHealthItem,
} from "./services/admin-health.service";

type BadgeTone = "sky" | "green" | "amber" | "slate" | "red" | "indigo";

const SERVICE_LABELS: Record<string, string> = {
  users: "User Service (Tài khoản & Phân quyền)",
  catalog: "Catalog Service (Sản phẩm & Danh mục)",
  commerce: "Commerce Service (Giỏ hàng & Đơn hàng)",
  log: "Log Service (Nhật ký kiểm toán)",
  auction: "Auction Service (Đấu giá thời gian thực)",
  fulfillment: "Fulfillment Service (Kho vận & Giao nhận)",
  notification: "Notification Service (Thông báo & Email)",
  wallet: "Wallet Service (Ví điện tử & Sổ cái)",
};

function healthTone(status?: string): BadgeTone {
  const norm = (status ?? "").toLowerCase();
  if (norm === "healthy") return "green";
  if (norm === "degraded") return "amber";
  if (norm === "unhealthy") return "red";
  if (norm === "disabled") return "slate";
  return "sky";
}

function healthLabel(status?: string): string {
  const norm = (status ?? "").toLowerCase();
  if (norm === "healthy") return "Khỏe mạnh (Healthy)";
  if (norm === "degraded") return "Suy giảm (Degraded)";
  if (norm === "unhealthy") return "Sự cố (Unhealthy)";
  if (norm === "disabled") return "Đang tắt (Disabled)";
  if (norm === "unknown") return "Chưa thăm dò (Unknown)";
  return status || "—";
}

function formatTime(value?: string | null): string {
  if (!value) return "Chưa kiểm tra";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("vi-VN");
}

export function AdminSystemHealthScreen() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState<{ message: string; traceId?: string } | null>(null);
  const [copiedTrace, setCopiedTrace] = useState(false);

  const dashboard = useApiResource("admin-health-dashboard", (signal) =>
    adminHealthService.getDashboard(signal),
  );
  const incidents = useApiResource("admin-health-incidents", (signal) =>
    adminHealthService.getIncidents(30, signal),
  );

  const summary = dashboard.data?.summary;
  const services = dashboard.data?.services ?? [];
  const databases = dashboard.data?.databases ?? [];
  const incidentRows = incidents.data ?? [];

  function handleError(cause: unknown, fallbackMessage: string) {
    if (cause instanceof ApiError) {
      setActionError({ message: cause.message, traceId: cause.traceId });
    } else if (cause instanceof Error) {
      setActionError({ message: cause.message });
    } else {
      setActionError({ message: fallbackMessage });
    }
  }

  async function handlePing(item: TargetHealthItem) {
    const key = `ping:${item.kind}:${item.name}`;
    setBusyKey(key);
    setNotice("");
    setActionError(null);
    try {
      const result =
        item.kind === "database"
          ? await adminHealthService.checkDatabaseNow(item.name)
          : await adminHealthService.checkServiceNow(item.name);
      setNotice(
        `Đã kiểm tra tức thì ${item.kind === "database" ? "DB" : "Service"} "${item.name}": ${healthLabel(result.status)} (${result.latencyMs} ms).`,
      );
      dashboard.reload();
      incidents.reload();
    } catch (cause) {
      handleError(cause, "Không thể thực hiện kiểm tra tức thì.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleToggle(item: TargetHealthItem) {
    const key = `toggle:${item.kind}:${item.name}`;
    const nextEnabled = !item.isEnabled;
    setBusyKey(key);
    setNotice("");
    setActionError(null);
    try {
      if (item.kind === "database") {
        await adminHealthService.toggleDatabase(item.name, nextEnabled);
      } else {
        await adminHealthService.toggleService(item.name, nextEnabled);
      }
      setNotice(
        `Đã ${nextEnabled ? "bật" : "tắt"} thăm dò tự động cho ${item.kind === "database" ? "cơ sở dữ liệu" : "dịch vụ"} "${item.name}".`,
      );
      dashboard.reload();
    } catch (cause) {
      handleError(cause, "Không thể thay đổi trạng thái thăm dò tự động.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleBulkToggle(enabled: boolean, kind: "service" | "database" | "all") {
    const key = `bulk:${kind}:${enabled}`;
    setBusyKey(key);
    setNotice("");
    setActionError(null);
    try {
      await adminHealthService.bulkToggle(enabled, kind);
      setNotice(
        `Đã ${enabled ? "bật" : "tắt"} giám sát tự động cho ${kind === "service" ? "toàn bộ 8 Microservices" : kind === "database" ? "toàn bộ 8 Databases" : "tất cả mục tiêu"}.`,
      );
      dashboard.reload();
    } catch (cause) {
      handleError(cause, "Không thể cập nhật hàng loạt trạng thái giám sát.");
    } finally {
      setBusyKey(null);
    }
  }

  async function copyTraceId(traceId: string) {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <>
      <PageHeading
        overline="Giám sát hạ tầng"
        title="Tình trạng hệ thống"
        description="Theo dõi trạng thái hoạt động và độ trễ của các dịch vụ và cơ sở dữ liệu trên hệ thống."
        action={
          <div className="action-row">
            <button
              type="button"
              className="button button-secondary button-small"
              disabled={dashboard.loading || Boolean(busyKey)}
              onClick={() => {
                dashboard.reload();
                incidents.reload();
              }}
            >
              Làm mới trạng thái
            </button>
          </div>
        }
      />

      {dashboard.error && (
        <div role="alert" className="notice">
          <p>Không tải được bảng điều khiển sức khỏe hệ thống: {dashboard.error.message}</p>
          {dashboard.error instanceof ApiError && dashboard.error.traceId && (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => void copyTraceId((dashboard.error as ApiError).traceId!)}
            >
              {copiedTrace ? "Đã sao chép Trace ID" : `Copy Trace ID: ${dashboard.error.traceId}`}
            </button>
          )}
        </div>
      )}

      {actionError && (
        <div role="alert" className="notice">
          <p>{actionError.message}</p>
          {actionError.traceId && (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => void copyTraceId(actionError.traceId!)}
            >
              {copiedTrace ? "Đã sao chép Trace ID" : `Copy Trace ID: ${actionError.traceId}`}
            </button>
          )}
        </div>
      )}

      {notice && (
        <p role="status" className="form-success">
          {notice}
        </p>
      )}

      {summary && (
        <div className="grid-4" style={{ marginBottom: "20px" }}>
          <Card className="card-pad">
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Trạng thái tổng thể</span>
            <div style={{ marginTop: "8px" }}>
              <Badge tone={healthTone(summary.overallStatus)}>
                {healthLabel(summary.overallStatus)}
              </Badge>
            </div>
            <small style={{ display: "block", marginTop: "8px", color: "var(--muted)" }}>
              Cập nhật: {formatTime(summary.timestamp)}
            </small>
          </Card>

          <Card className="card-pad">
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Microservices (8 dịch vụ)</span>
            <strong style={{ display: "block", fontSize: "22px", marginTop: "6px" }}>
              {summary.healthyServices} / {summary.enabledServices} khỏe mạnh
            </strong>
            <small style={{ color: "var(--muted)" }}>
              Đang bật tự động: {summary.enabledServices}/{summary.totalServices} dịch vụ
            </small>
          </Card>

          <Card className="card-pad">
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Cơ sở dữ liệu (8 DB)</span>
            <strong style={{ display: "block", fontSize: "22px", marginTop: "6px" }}>
              {summary.healthyDatabases} / {summary.enabledDatabases} khỏe mạnh
            </strong>
            <small style={{ color: "var(--muted)" }}>
              Đang bật keep-alive: {summary.enabledDatabases}/{summary.totalDatabases} DB
            </small>
          </Card>

          <Card className="card-pad">
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Chu kỳ Cron Worker</span>
            <strong style={{ display: "block", fontSize: "22px", marginTop: "6px" }}>
              {summary.cronIntervalSeconds} giây
            </strong>
            <small style={{ color: "var(--muted)" }}>
              Ẩn hoàn toàn địa chỉ nội bộ & chuỗi kết nối
            </small>
          </Card>
        </div>
      )}

      <Card className="card-pad" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <strong>Điều khiển thăm dò tự động hàng loạt</strong>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
              Bật hoặc tắt tiến trình kiểm tra định kỳ (Cron Prober) cho toàn bộ cụm Microservices hoặc Databases.
            </p>
          </div>
          <div className="action-row">
            <button
              type="button"
              className="button button-primary button-small"
              disabled={Boolean(busyKey)}
              onClick={() => void handleBulkToggle(true, "service")}
            >
              Bật 8 Microservices
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              disabled={Boolean(busyKey)}
              onClick={() => void handleBulkToggle(true, "database")}
            >
              Bật 8 Databases
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              disabled={Boolean(busyKey)}
              onClick={() => void handleBulkToggle(false, "all")}
            >
              Tắt toàn bộ tự động
            </button>
          </div>
        </div>
      </Card>

      <SectionHeading
        title="Trạng thái 8 Microservices"
        hint="Nhấn 'Ping ngay' để đo độ trễ tức thì hoặc bật tự động thăm dò định kỳ"
      />
      <Card style={{ marginBottom: "24px" }}>
        {services.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Microservice</th>
                  <th>Trạng thái</th>
                  <th>Tự động thăm dò</th>
                  <th>Độ trễ (Latency)</th>
                  <th>Thống kê lỗi</th>
                  <th>Lần kiểm tra cuối</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {services.map((srv) => {
                  const pingBusy = busyKey === `ping:service:${srv.name}`;
                  const toggleBusy = busyKey === `toggle:service:${srv.name}`;
                  return (
                    <tr key={srv.name}>
                      <td>
                        <strong>{SERVICE_LABELS[srv.name] ?? srv.name}</strong>
                        <small style={{ display: "block", color: "var(--muted)" }}>
                          Mã dịch vụ: <code>{srv.name}</code>
                        </small>
                      </td>
                      <td>
                        <Badge tone={healthTone(srv.currentStatus)}>
                          {healthLabel(srv.currentStatus)}
                        </Badge>
                        {srv.lastError && (
                          <small style={{ display: "block", color: "var(--red)", marginTop: "4px" }}>
                            {srv.lastError}
                          </small>
                        )}
                      </td>
                      <td>
                        <Badge tone={srv.isEnabled ? "sky" : "slate"}>
                          {srv.isEnabled ? "Đang bật" : "Đang tắt"}
                        </Badge>
                      </td>
                      <td>
                        <strong>{srv.lastCheckedAt ? `${srv.lastLatencyMs} ms` : "—"}</strong>
                      </td>
                      <td>
                        <span>
                          Liên tiếp: <strong>{srv.consecutiveFailures}</strong> · Tổng: {srv.totalFailures}/{srv.totalChecks}
                        </span>
                      </td>
                      <td>{formatTime(srv.lastCheckedAt)}</td>
                      <td>
                        <div className="action-row">
                          <button
                            type="button"
                            className="button button-primary button-small"
                            disabled={Boolean(busyKey)}
                            onClick={() => void handlePing(srv)}
                          >
                            {pingBusy ? "Đang ping…" : "Ping ngay"}
                          </button>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            disabled={Boolean(busyKey)}
                            onClick={() => void handleToggle(srv)}
                          >
                            {toggleBusy ? "Đang lưu…" : srv.isEnabled ? "Tắt tự động" : "Bật tự động"}
                          </button>
                        </div>
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
              dashboard.loading
                ? "Đang tải trạng thái 8 Microservices…"
                : "Chưa có dữ liệu Microservices từ CheckHealService"
            }
          />
        )}
      </Card>

      <SectionHeading
        title="Trạng thái 8 Cơ sở dữ liệu (PostgreSQL Keep-Alive)"
        hint="Thực thi truy vấn SELECT 1; để kiểm tra kết nối cơ sở dữ liệu của từng phân hệ"
      />
      <Card style={{ marginBottom: "24px" }}>
        {databases.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cơ sở dữ liệu phân hệ</th>
                  <th>Trạng thái</th>
                  <th>Keep-Alive định kỳ</th>
                  <th>Độ trễ (Latency)</th>
                  <th>Thống kê lỗi</th>
                  <th>Lần kiểm tra cuối</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {databases.map((db) => {
                  const pingBusy = busyKey === `ping:database:${db.name}`;
                  const toggleBusy = busyKey === `toggle:database:${db.name}`;
                  return (
                    <tr key={db.name}>
                      <td>
                        <strong>{SERVICE_LABELS[db.name] ?? `DB ${db.name}`}</strong>
                        <small style={{ display: "block", color: "var(--muted)" }}>
                          Phân hệ: <code>{db.name}</code>
                        </small>
                      </td>
                      <td>
                        <Badge tone={healthTone(db.currentStatus)}>
                          {healthLabel(db.currentStatus)}
                        </Badge>
                        {db.lastError && (
                          <small style={{ display: "block", color: "var(--red)", marginTop: "4px" }}>
                            {db.lastError}
                          </small>
                        )}
                      </td>
                      <td>
                        <Badge tone={db.isEnabled ? "sky" : "slate"}>
                          {db.isEnabled ? "Đang bật" : "Đang tắt"}
                        </Badge>
                      </td>
                      <td>
                        <strong>{db.lastCheckedAt ? `${db.lastLatencyMs} ms` : "—"}</strong>
                      </td>
                      <td>
                        <span>
                          Liên tiếp: <strong>{db.consecutiveFailures}</strong> · Tổng: {db.totalFailures}/{db.totalChecks}
                        </span>
                      </td>
                      <td>{formatTime(db.lastCheckedAt)}</td>
                      <td>
                        <div className="action-row">
                          <button
                            type="button"
                            className="button button-primary button-small"
                            disabled={Boolean(busyKey)}
                            onClick={() => void handlePing(db)}
                          >
                            {pingBusy ? "Đang kiểm tra…" : "Ping DB"}
                          </button>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            disabled={Boolean(busyKey)}
                            onClick={() => void handleToggle(db)}
                          >
                            {toggleBusy ? "Đang lưu…" : db.isEnabled ? "Tắt Keep-Alive" : "Bật Keep-Alive"}
                          </button>
                        </div>
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
              dashboard.loading
                ? "Đang tải trạng thái cơ sở dữ liệu…"
                : "Chưa có dữ liệu cơ sở dữ liệu"
            }
          />
        )}
      </Card>

      <SectionHeading
        title="Nhật ký chuyển trạng thái & Sự cố gần đây (Incidents)"
        hint="Ghi nhận tự động khi dịch vụ hoặc cơ sở dữ liệu vượt ngưỡng lỗi liên tiếp hoặc phục hồi"
      />
      <Card>
        {incidentRows.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Mục tiêu</th>
                  <th>Loại</th>
                  <th>Chuyển trạng thái</th>
                  <th>Số lần lỗi liên tiếp</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {incidentRows.map((inc, index) => (
                  <tr key={inc.id ?? `${inc.targetName}-${index}`}>
                    <td>{formatTime(inc.occurredAt ?? inc.timestamp)}</td>
                    <td>
                      <strong>{inc.targetName}</strong>
                    </td>
                    <td>
                      <Badge tone="slate">{inc.targetKind}</Badge>
                    </td>
                    <td>
                      <span>{inc.previousStatus}</span> →{" "}
                      <Badge tone={healthTone(inc.newStatus)}>{inc.newStatus}</Badge>
                    </td>
                    <td>{inc.consecutiveFailures}</td>
                    <td>{inc.error ?? "Đã phục hồi trạng thái bình thường"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              incidents.loading
                ? "Đang tải nhật ký sự cố…"
                : "Không có sự cố chuyển trạng thái nào được ghi nhận gần đây"
            }
          />
        )}
      </Card>
    </>
  );
}
