"use client";

import { useState } from "react";
import {
  AdminPagination,
  Badge,
  Card,
  NoData,
  PageHeading,
} from "@/components/ui/Primitives";
import { ApiError } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import {
  adminNotificationsService,
  type InAppNotificationItemResponse,
} from "./services/admin-notifications.service";

export function AdminNotificationsScreen() {
  const [activeTab, setActiveTab] = useState<"notifications" | "event-logs">("notifications");

  // Notifications state
  const [notifPage, setNotifPage] = useState(1);
  const [notifUserId, setNotifUserId] = useState("");
  const [notifType, setNotifType] = useState("");
  const [notifStatus, setNotifStatus] = useState("");
  const [selectedNotif, setSelectedNotif] = useState<InAppNotificationItemResponse | null>(null);

  // Event Logs state
  const [eventPage, setEventPage] = useState(1);
  const [sourceService, setSourceService] = useState("");
  const [eventType, setEventType] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Resource: Notifications
  const notifResource = useApiResource(
    `admin-notifications:${notifPage}:${notifUserId}:${notifType}:${notifStatus}`,
    async (signal) => {
      if (activeTab !== "notifications") return null;
      try {
        return await adminNotificationsService.searchNotifications(
          {
            page: notifPage,
            pageSize: 20,
            userId: notifUserId || undefined,
            notificationType: notifType || undefined,
            status: notifStatus || undefined,
          },
          signal,
        );
      } catch {
        return {
          items: [],
          pagination: {
            pageIndex: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        };
      }
    },
  );

  // Resource: Event Logs
  const eventLogsResource = useApiResource(
    `admin-event-logs:${eventPage}:${sourceService}:${eventType}`,
    async (signal) => {
      if (activeTab !== "event-logs") return null;
      try {
        return await adminNotificationsService.listEventLogs(
          {
            page: eventPage,
            pageSize: 20,
            sourceService: sourceService || undefined,
            eventType: eventType || undefined,
          },
          signal,
        );
      } catch {
        return {
          items: [],
          pagination: {
            pageIndex: 1,
            pageSize: 20,
            totalCount: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        };
      }
    },
  );

  // Resource: Event Log Detail
  const eventDetailResource = useApiResource(
    `admin-event-log-detail:${selectedEventId}`,
    async (signal) => {
      if (!selectedEventId) return null;
      try {
        return await adminNotificationsService.getEventLog(selectedEventId, signal);
      } catch {
        return null;
      }
    },
  );

  const notifItems = notifResource.data?.items ?? [];
  const eventItems = eventLogsResource.data?.items ?? [];

  return (
    <>
      <PageHeading
        overline="Giám sát & Thông báo"
        title="Lịch sử thông báo & Nhật ký sự kiện"
        description="Tra cứu lịch sử phát thông báo toàn sàn và theo dõi nhật ký sự kiện đồng bộ từ các microservices."
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="button button-secondary button-small"
              disabled={activeTab === "notifications" ? notifResource.loading : eventLogsResource.loading}
              onClick={() => {
                if (activeTab === "notifications") {
                  notifResource.reload();
                } else {
                  eventLogsResource.reload();
                }
              }}
            >
              {(activeTab === "notifications" ? notifResource.loading : eventLogsResource.loading)
                ? "Đang làm mới…"
                : "Làm mới dữ liệu"}
            </button>
          </div>
        }
      />

      {/* Thanh Tabs chuẩn phân tách giao diện */}
      <div
        role="tablist"
        aria-label="Phân hệ thông báo và nhật ký sự kiện"
        style={{
          display: "flex",
          gap: "24px",
          borderBottom: "1px solid var(--line, #e2e8f0)",
          marginBottom: "20px",
          marginTop: "-8px",
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "notifications"}
          onClick={() => setActiveTab("notifications")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "notifications" ? "2px solid var(--primary, #0284c7)" : "2px solid transparent",
            padding: "8px 4px 12px",
            fontSize: "14px",
            fontWeight: activeTab === "notifications" ? 600 : 500,
            color: activeTab === "notifications" ? "var(--primary, #0284c7)" : "var(--muted, #64748b)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Lịch sử thông báo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "event-logs"}
          onClick={() => setActiveTab("event-logs")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "event-logs" ? "2px solid var(--primary, #0284c7)" : "2px solid transparent",
            padding: "8px 4px 12px",
            fontSize: "14px",
            fontWeight: activeTab === "event-logs" ? 600 : 500,
            color: activeTab === "event-logs" ? "var(--primary, #0284c7)" : "var(--muted, #64748b)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Nhật ký sự kiện (Event Logs)
        </button>
      </div>

      {/* TAB 1: LỊCH SỬ THÔNG BÁO */}
      {activeTab === "notifications" && (
        <Card>
          <div className="toolbar">
            <label className="field-wrap" style={{ flex: 1, minWidth: "220px" }}>
              Mã người dùng (User ID)
              <input
                className="field"
                placeholder="UUID người nhận..."
                value={notifUserId}
                onChange={(e) => {
                  setNotifUserId(e.target.value);
                  setNotifPage(1);
                }}
              />
            </label>

            <label className="field-wrap" style={{ minWidth: "180px" }}>
              Loại thông báo
              <select
                className="select-field"
                value={notifType}
                onChange={(e) => {
                  setNotifType(e.target.value);
                  setNotifPage(1);
                }}
              >
                <option value="">Tất cả loại</option>
                <option value="AUCTION">Đấu giá</option>
                <option value="ORDER">Đơn hàng</option>
                <option value="WALLET">Ví tiền</option>
                <option value="SYSTEM">Hệ thống</option>
                <option value="ACCOUNT">Tài khoản</option>
              </select>
            </label>

            <label className="field-wrap" style={{ minWidth: "150px" }}>
              Trạng thái đọc
              <select
                className="select-field"
                value={notifStatus}
                onChange={(e) => {
                  setNotifStatus(e.target.value);
                  setNotifPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="SENT">Chưa đọc</option>
                <option value="READ">Đã đọc</option>
              </select>
            </label>
          </div>

          {notifResource.error && (
            <p role="alert" className="notice">
              {notifResource.error instanceof ApiError
                ? notifResource.error.message
                : "Không thể nạp lịch sử thông báo."}
            </p>
          )}

          {notifResource.loading ? (
            <NoData title="Đang nạp lịch sử thông báo…" />
          ) : notifItems.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã thông báo</th>
                    <th>Người nhận (User ID)</th>
                    <th>Phân loại</th>
                    <th>Tiêu đề & Nội dung</th>
                    <th>Trạng thái</th>
                    <th>Thời gian gửi</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {notifItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <code>{item.id.slice(0, 8)}…</code>
                      </td>
                      <td>
                        <code>{item.userId.slice(0, 8)}…</code>
                      </td>
                      <td>
                        <Badge tone="indigo">{item.notificationType || "Chung"}</Badge>
                      </td>
                      <td>
                        <strong>{item.title || "—"}</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.body || "—"}
                        </p>
                      </td>
                      <td>
                        <Badge tone={item.isRead ? "green" : "amber"}>
                          {item.isRead ? "Đã đọc" : "Chưa đọc"}
                        </Badge>
                      </td>
                      <td>
                        {new Date(item.createdAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => setSelectedNotif(item)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NoData title="Không tìm thấy lịch sử thông báo nào phù hợp." />
          )}

          <AdminPagination
            page={notifResource.data?.pagination?.pageIndex ?? notifPage}
            pageSize={notifResource.data?.pagination?.pageSize ?? 20}
            totalItems={notifResource.data?.pagination?.totalCount ?? 0}
            onPageChange={setNotifPage}
            loading={notifResource.loading}
          />
        </Card>
      )}

      {/* TAB 2: NHẬT KÝ SỰ KIỆN (EVENT LOGS) */}
      {activeTab === "event-logs" && (
        <Card>
          <div className="toolbar">
            <label className="field-wrap" style={{ minWidth: "180px" }}>
              Dịch vụ phát sinh (Service)
              <select
                className="select-field"
                value={sourceService}
                onChange={(e) => {
                  setSourceService(e.target.value);
                  setEventPage(1);
                }}
              >
                <option value="">Tất cả dịch vụ</option>
                <option value="AuctionService">AuctionService</option>
                <option value="CatalogService">CatalogService</option>
                <option value="CommerceService">CommerceService</option>
                <option value="UserService">UserService</option>
                <option value="WalletService">WalletService</option>
                <option value="FulfillmentService">FulfillmentService</option>
              </select>
            </label>

            <label className="field-wrap" style={{ flex: 1, minWidth: "220px" }}>
              Tên sự kiện (EventType)
              <input
                className="field"
                placeholder="Ví dụ: OrderCreated, BidPlaced..."
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value);
                  setEventPage(1);
                }}
              />
            </label>
          </div>

          {eventLogsResource.error && (
            <p role="alert" className="notice">
              {eventLogsResource.error instanceof ApiError
                ? eventLogsResource.error.message
                : "Không thể nạp danh sách sự kiện."}
            </p>
          )}

          {eventLogsResource.loading ? (
            <NoData title="Đang nạp nhật ký sự kiện…" />
          ) : eventItems.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dịch vụ nguồn</th>
                    <th>Loại sự kiện (EventType)</th>
                    <th>Tác nhân (Actor / Role)</th>
                    <th>Mã Trace ID</th>
                    <th>Thời điểm phát sinh</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {eventItems.map((evt) => (
                    <tr key={evt.id}>
                      <td>
                        <strong>{evt.sourceService}</strong>
                      </td>
                      <td>
                        <code>{evt.eventType}</code>
                      </td>
                      <td>
                        {evt.actorId ? (
                          <span>
                            <code>{evt.actorId.slice(0, 8)}…</code>
                            {evt.actorRole && (
                              <span style={{ marginLeft: "4px" }}>
                                <Badge tone="sky">{evt.actorRole}</Badge>
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>Hệ thống</span>
                        )}
                      </td>
                      <td>
                        {evt.traceId ? <code>{evt.traceId.slice(0, 10)}…</code> : "—"}
                      </td>
                      <td>
                        {new Date(evt.occurredAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => setSelectedEventId(evt.id)}
                        >
                          Payload & Metadata
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NoData title="Chưa có bản ghi nhật ký sự kiện nào được ghi nhận." />
          )}

          <AdminPagination
            page={eventLogsResource.data?.pagination?.pageIndex ?? eventPage}
            pageSize={eventLogsResource.data?.pagination?.pageSize ?? 20}
            totalItems={eventLogsResource.data?.pagination?.totalCount ?? 0}
            onPageChange={setEventPage}
            loading={eventLogsResource.loading}
          />
        </Card>
      )}

      {/* Modal Chi tiết Thông báo */}
      {selectedNotif && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-detail-title"
        >
          <section className="admin-modal" style={{ maxWidth: "600px" }}>
            <div className="admin-modal-heading">
              <div>
                <h2 id="notif-detail-title">Chi tiết thông báo</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Mã: <code>{selectedNotif.id}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedNotif(null)}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            <div className="grid-2" style={{ gap: "10px", marginBottom: "14px" }}>
              <div className="info-row">
                <span>Người nhận:</span>
                <code>{selectedNotif.userId}</code>
              </div>
              <div className="info-row">
                <span>Phân loại:</span>
                <Badge tone="indigo">{selectedNotif.notificationType || "Chung"}</Badge>
              </div>
              <div className="info-row">
                <span>Trạng thái:</span>
                <Badge tone={selectedNotif.isRead ? "green" : "amber"}>
                  {selectedNotif.isRead ? "Đã đọc" : "Chưa đọc"}
                </Badge>
              </div>
              <div className="info-row">
                <span>Thời gian gửi:</span>
                <strong>{new Date(selectedNotif.createdAt).toLocaleString("vi-VN")}</strong>
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Tiêu đề:</span>
              <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: "15px" }}>{selectedNotif.title || "—"}</p>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Nội dung chi tiết:</span>
              <p style={{ margin: "4px 0 0", padding: "10px", background: "var(--bg-subtle, #f8fafc)", borderRadius: "6px", fontSize: "14px", lineHeight: "1.5" }}>
                {selectedNotif.body || "—"}
              </p>
            </div>

            {selectedNotif.payload && (
              <div>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Dữ liệu Payload:</span>
                <pre style={{ margin: "4px 0 0", padding: "10px", background: "#1e293b", color: "#f8fafc", borderRadius: "6px", fontSize: "12px", overflowX: "auto" }}>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedNotif.payload), null, 2);
                    } catch {
                      return selectedNotif.payload;
                    }
                  })()}
                </pre>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal Chi tiết Event Log */}
      {selectedEventId && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-detail-title"
        >
          <section className="admin-modal" style={{ maxWidth: "700px" }}>
            <div className="admin-modal-heading">
              <div>
                <h2 id="event-detail-title">Chi tiết sự kiện hệ thống</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Mã sự kiện: <code>{selectedEventId}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setSelectedEventId(null)}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            {eventDetailResource.loading ? (
              <NoData title="Đang tải dữ liệu Payload & Headers…" />
            ) : eventDetailResource.data ? (
              <div>
                <div className="grid-2" style={{ gap: "10px", marginBottom: "14px" }}>
                  <div className="info-row">
                    <span>Dịch vụ nguồn:</span>
                    <strong>{eventDetailResource.data.summary.sourceService}</strong>
                  </div>
                  <div className="info-row">
                    <span>Loại sự kiện:</span>
                    <code>{eventDetailResource.data.summary.eventType}</code>
                  </div>
                  <div className="info-row">
                    <span>Actor ID:</span>
                    <code>{eventDetailResource.data.summary.actorId || "N/A"}</code>
                  </div>
                  <div className="info-row">
                    <span>Trace ID:</span>
                    <code>{eventDetailResource.data.summary.traceId || "N/A"}</code>
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Message Payload (JSON):</span>
                  <pre style={{ margin: "4px 0 0", padding: "10px", background: "#1e293b", color: "#f8fafc", borderRadius: "6px", fontSize: "12px", overflowX: "auto", maxHeight: "250px" }}>
                    {JSON.stringify(eventDetailResource.data.payload, null, 2)}
                  </pre>
                </div>

                {eventDetailResource.data.headers && (
                  <div>
                    <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Correlation Headers:</span>
                    <pre style={{ margin: "4px 0 0", padding: "10px", background: "#1e293b", color: "#f8fafc", borderRadius: "6px", fontSize: "12px", overflowX: "auto" }}>
                      {JSON.stringify(eventDetailResource.data.headers, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <NoData title="Không tìm thấy chi tiết sự kiện." />
            )}
          </section>
        </div>
      )}
    </>
  );
}
