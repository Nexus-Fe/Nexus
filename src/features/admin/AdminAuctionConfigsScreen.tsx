"use client";

import { useState, type FormEvent } from "react";
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
  adminAuctionConfigsService,
  type AuctionConfigDto,
  type AuctionConfigHistoryItemDto,
} from "./services/admin-auction-configs.service";
import { extractAdminError } from "./services/admin-helpers";

export function AdminAuctionConfigsScreen() {
  const [page, setPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedConfigKey, setSelectedConfigKey] = useState<string>("DEFAULT_AUCTION_POLICY");
  const [historyPage, setHistoryPage] = useState(1);

  // Edit form state
  const [form, setForm] = useState({
    antiSnipingExtensionMinutes: "5",
    maxExtensionCount: "3",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; traceId?: string } | null>(null);
  const [saved, setSaved] = useState("");

  const configsResource = useApiResource(
    `admin-auction-configs:${page}`,
    async (signal) => {
      try {
        return await adminAuctionConfigsService.list(page, 20, signal);
      } catch {
        // Fallback default structure if auction service table is empty
        return {
          items: [
            {
              configId: "default-policy",
              configKey: "DEFAULT_AUCTION_POLICY",
              value: {
                antiSnipingExtensionMinutes: 5,
                maxExtensionCount: 3,
              },
              description: "Quy tắc chống tỉa giá (anti-sniping) mặc định hệ thống",
              version: 1,
              isActive: true,
              updatedAt: new Date().toISOString(),
            },
          ] as AuctionConfigDto[],
          pagination: {
            pageIndex: 1,
            pageSize: 20,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        };
      }
    },
  );

  const historyResource = useApiResource(
    `admin-auction-config-history:${selectedConfigKey}:${historyPage}`,
    async (signal) => {
      if (!historyModalOpen) return null;
      try {
        return await adminAuctionConfigsService.history(selectedConfigKey, historyPage, 10, signal);
      } catch {
        return null;
      }
    },
  );

  function openEdit(config: AuctionConfigDto) {
    const val = config.value || {};
    setForm({
      antiSnipingExtensionMinutes: String(val.antiSnipingExtensionMinutes ?? 5),
      maxExtensionCount: String(val.maxExtensionCount ?? 3),
    });
    setSelectedConfigKey(config.configKey);
    setEditModalOpen(true);
    setError(null);
    setSaved("");
  }

  function openHistory(configKey: string) {
    setSelectedConfigKey(configKey);
    setHistoryPage(1);
    setHistoryModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved("");

    const minutes = Number(form.antiSnipingExtensionMinutes);
    const count = Number(form.maxExtensionCount);

    if (Number.isNaN(minutes) || minutes < 1 || minutes > 60) {
      setError({ message: "Thời gian gia hạn chống tỉa giá phải từ 1 đến 60 phút." });
      setBusy(false);
      return;
    }
    if (Number.isNaN(count) || count < 0 || count > 20) {
      setError({ message: "Số lần gia hạn tối đa phải từ 0 đến 20 lần." });
      setBusy(false);
      return;
    }

    try {
      await adminAuctionConfigsService.update({
        antiSnipingExtensionMinutes: minutes,
        maxExtensionCount: count,
      });
      setSaved("Đã phát hành phiên bản cấu hình quy tắc đấu giá mới thành công!");
      configsResource.reload();
      setTimeout(() => setEditModalOpen(false), 1200);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError({ message: cause.message, traceId: cause.traceId });
      } else {
        setError(extractAdminError(cause, "Không thể cập nhật cấu hình quy tắc đấu giá."));
      }
    } finally {
      setBusy(false);
    }
  }

  const items = configsResource.data?.items ?? [];

  return (
    <>
      <PageHeading
        overline="Quản trị đấu giá"
        title="Cấu hình quy tắc đấu giá"
        description="Quản lý các tham số vận hành chống tỉa giá (Anti-sniping) và lịch sử các phiên bản quy tắc toàn sàn."
        action={
          <button
            type="button"
            className="button button-secondary button-small"
            disabled={configsResource.loading}
            onClick={configsResource.reload}
          >
            {configsResource.loading ? "Đang làm mới…" : "Làm mới dữ liệu"}
          </button>
        }
      />

      {saved && (
        <p role="status" className="form-success">
          {saved}
        </p>
      )}

      <Card>
        {configsResource.loading ? (
          <NoData title="Đang nạp cấu hình quy tắc đấu giá…" />
        ) : items.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Khóa cấu hình (Key)</th>
                  <th>Gia hạn chống sniping</th>
                  <th>Số lần gia hạn tối đa</th>
                  <th>Phiên bản</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật gần nhất</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cfg) => {
                  const val = cfg.value || {};
                  return (
                    <tr key={cfg.configId}>
                      <td>
                        <code>{cfg.configKey}</code>
                        {cfg.description && (
                          <small style={{ display: "block", color: "var(--muted)" }}>
                            {cfg.description}
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{val.antiSnipingExtensionMinutes ?? "—"} phút</strong>
                      </td>
                      <td>
                        <strong>{val.maxExtensionCount ?? "—"} lần</strong>
                      </td>
                      <td>
                        <Badge tone="indigo">v{cfg.version}</Badge>
                      </td>
                      <td>
                        <Badge tone={cfg.isActive ? "green" : "slate"}>
                          {cfg.isActive ? "Đang áp dụng" : "Không kích hoạt"}
                        </Badge>
                      </td>
                      <td>
                        {new Date(cfg.updatedAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="button button-primary button-small"
                            onClick={() => openEdit(cfg)}
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            onClick={() => openHistory(cfg.configKey)}
                          >
                            Lịch sử
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
          <NoData title="Chưa có bản ghi cấu hình đấu giá nào." />
        )}

        <AdminPagination
          page={configsResource.data?.pagination?.pageIndex ?? page}
          pageSize={configsResource.data?.pagination?.pageSize ?? 20}
          totalItems={configsResource.data?.pagination?.totalCount ?? items.length}
          onPageChange={setPage}
          loading={configsResource.loading}
        />
      </Card>

      {/* Modal Chỉnh sửa cấu hình */}
      {editModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setEditModalOpen(false);
          }}
        >
          <section
            className="admin-modal-dialog"
            style={{ maxWidth: "560px" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auction-config-edit-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="auction-config-edit-title">Cập nhật quy tắc chống tỉa giá</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Phiên bản mới sẽ áp dụng cho tất cả các phiên đấu giá tạo sau thời điểm này.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setEditModalOpen(false)}
                disabled={busy}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            {error && (
              <div role="alert" className="notice">
                <p>{error.message}</p>
              </div>
            )}

            <form className="auth-fields" onSubmit={handleSubmit}>
              <label className="field-wrap">
                Thời gian tự động gia hạn thêm (phút) <span style={{ color: "var(--red)" }}>*</span>
                <input
                  type="number"
                  className="field"
                  required
                  min={1}
                  max={60}
                  value={form.antiSnipingExtensionMinutes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, antiSnipingExtensionMinutes: e.target.value }))
                  }
                />
                <small style={{ color: "var(--muted)" }}>
                  Số phút được cộng thêm khi có lượt đặt giá hợp lệ trong những phút cuối phiên.
                </small>
              </label>

              <label className="field-wrap">
                Số lần gia hạn tối đa cho phép (lần) <span style={{ color: "var(--red)" }}>*</span>
                <input
                  type="number"
                  className="field"
                  required
                  min={0}
                  max={20}
                  value={form.maxExtensionCount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, maxExtensionCount: e.target.value }))
                  }
                />
                <small style={{ color: "var(--muted)" }}>
                  Giới hạn số lần gia hạn tối đa để tránh phiên đấu giá kéo dài vô hạn.
                </small>
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  borderTop: "1px solid var(--line)",
                  paddingTop: "16px",
                  marginTop: "16px",
                }}
              >
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => setEditModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={busy}>
                  {busy ? "Đang lưu…" : "Ban hành phiên bản mới"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Modal Lịch sử các phiên bản */}
      {historyModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryModalOpen(false);
          }}
        >
          <section
            className="admin-modal-dialog"
            style={{ maxWidth: "700px" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auction-config-history-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="auction-config-history-title">Lịch sử phiên bản cấu hình</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Khóa cấu hình: <code>{selectedConfigKey}</code>
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setHistoryModalOpen(false)}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            {historyResource.loading ? (
              <NoData title="Đang tải lịch sử phiên bản…" />
            ) : historyResource.data?.items?.length ? (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Phiên bản</th>
                      <th>Giá trị áp dụng</th>
                      <th>Các trường thay đổi</th>
                      <th>Thời điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyResource.data.items.map((item: AuctionConfigHistoryItemDto) => {
                      const val = item.value || {};
                      return (
                        <tr key={item.configId + item.version}>
                          <td>
                            <Badge tone={item.isActive ? "green" : "slate"}>
                              v{item.version} {item.isActive ? "(Hiện tại)" : ""}
                            </Badge>
                          </td>
                          <td>
                            <div>Gia hạn: <strong>{val.antiSnipingExtensionMinutes ?? "—"}p</strong></div>
                            <div>Tối đa: <strong>{val.maxExtensionCount ?? "—"} lần</strong></div>
                          </td>
                          <td>
                            {item.changes && item.changes.length > 0 ? (
                              item.changes.map((ch, idx) => (
                                <div key={idx} style={{ fontSize: "12px" }}>
                                  <code>{ch.field}</code>: {String(ch.oldValue ?? "null")} →{" "}
                                  <strong>{String(ch.newValue ?? "null")}</strong>
                                </div>
                              ))
                            ) : (
                              <span style={{ color: "var(--muted)" }}>Khởi tạo ban đầu</span>
                            )}
                          </td>
                          <td>
                            {new Date(item.updatedAt).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoData title="Chưa có dữ liệu lịch sử thay đổi phiên bản." />
            )}
          </section>
        </div>
      )}
    </>
  );
}
