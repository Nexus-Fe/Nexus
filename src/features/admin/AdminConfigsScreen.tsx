"use client";

import { useState, type FormEvent } from "react";
import { AdminPagination, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ApiError } from "@/lib/api/client";
import { adminConfigsService } from "./services/admin-configs.service";
import { useApiResource } from "@/lib/api/use-api-resource";

export type SystemConfigItem = {
  key: string;
  value: string;
  description?: string | null;
  dataType: string;
  updatedAt?: string;
};

const CONFIG_DESCRIPTIONS_VI: Record<string, string> = {
  DEFAULT_REPUTATION_SCORE: "Điểm uy tín mặc định khi đăng ký mới",
  AUTO_APPROVE_BUYER: "Tự động kích hoạt tài khoản buyer sau xác thực email",
  AUCTION_MIN_REPUTATION_BID: "Ngưỡng điểm uy tín tối thiểu để tham gia đặt giá đấu giá",
  AUCTION_MIN_REPUTATION_CREATE: "Ngưỡng điểm uy tín tối thiểu cho người bán để tạo phiên đấu giá",
  FEATURE_REPUTATION_ENFORCEMENT: "Bật/tắt áp dụng quy tắc điểm uy tín trên toàn bộ sàn",
  PAYMENT_TIMEOUT_PENALTY_SCORE: "Điểm uy tín bị trừ khi người mua quá hạn thanh toán đấu giá",
  SELLER_CANCEL_PENALTY_SCORE: "Điểm uy tín bị trừ khi người bán hủy đơn hàng hoặc phiên đấu giá",
  ANTI_FARMING_COOLDOWN_DAYS: "Số ngày chờ tối thiểu giữa các lần cộng điểm uy tín cho cùng một cặp giao dịch (chống cày điểm)",
  ORDER_COMPLETED_REWARD_SCORE: "Điểm uy tín được thưởng khi hoàn thành đơn hàng",
};

const TEXT_DESCRIPTIONS_VI: Record<string, string> = {
  "reputation score points rewarded upon completing an order.": "Điểm uy tín được thưởng khi hoàn thành đơn hàng.",
  "reputation score points rewarded upon completing an order": "Điểm uy tín được thưởng khi hoàn thành đơn hàng",
  "toggle strict reputation score enforcement across auctions and commerce.": "Bật/tắt áp dụng quy tắc điểm uy tín trên toàn bộ sàn.",
  "reputation score points deducted when a buyer defaults on auction payment.": "Điểm uy tín bị trừ khi người mua quá hạn thanh toán đấu giá.",
  "reputation score points deducted when a seller cancels an order or auction.": "Điểm uy tín bị trừ khi người bán hủy đơn hàng hoặc phiên đấu giá.",
  "minimum days between positive reputation rewards for the same trading pair.": "Số ngày chờ tối thiểu giữa các lần cộng điểm uy tín cho cùng một cặp giao dịch (chống cày điểm).",
  "minimum buyer reputation score required to place a bid in an auction.": "Ngưỡng điểm uy tín tối thiểu để tham gia đặt giá đấu giá.",
  "minimum seller reputation score required to create an auction.": "Ngưỡng điểm uy tín tối thiểu cho người bán để tạo phiên đấu giá.",
};

function formatConfigDescription(key: string, description?: string | null): string {
  const normalizedKey = key.trim().toUpperCase();
  if (CONFIG_DESCRIPTIONS_VI[normalizedKey]) {
    return CONFIG_DESCRIPTIONS_VI[normalizedKey];
  }

  if (description) {
    const trimmed = description.trim();
    const lower = trimmed.toLowerCase();
    if (TEXT_DESCRIPTIONS_VI[lower]) {
      return TEXT_DESCRIPTIONS_VI[lower];
    }
    return trimmed;
  }

  return "Tham số cấu hình vận hành hệ thống";
}

function formatDateTimeSplit(value?: string): { time: string; date: string } | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isFinite(d.getTime())) {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const time = `${hours}:${minutes}:${seconds}`;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const date = `${day}/${month}/${year}`;
    return { time, date };
  }

  const parts = value.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { time: parts[0], date: parts[1] };
  }
  return { time: value, date: "" };
}

export function AdminConfigsScreen() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ key: "", value: "", reason: "" });
  const [selectedDesc, setSelectedDesc] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("String");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; traceId?: string } | null>(null);
  const [saved, setSaved] = useState("");
  const [copiedTrace, setCopiedTrace] = useState(false);

  const pageSize = 50;
  const resource = useApiResource(`admin-configs:${page}`, async (signal) => adminConfigsService.list(page, pageSize, signal));

  const allItems = resource.data?.items ?? [];
  const filteredItems = keyword.trim()
    ? allItems.filter(
        (item) =>
          item.key.toLowerCase().includes(keyword.trim().toLowerCase()) ||
          formatConfigDescription(item.key, item.description).toLowerCase().includes(keyword.trim().toLowerCase()) ||
          (item.description ?? "").toLowerCase().includes(keyword.trim().toLowerCase()) ||
          item.value.toLowerCase().includes(keyword.trim().toLowerCase()),
      )
    : allItems;

  const isBooleanType =
    selectedType.toLowerCase() === "boolean" ||
    form.value.toLowerCase() === "true" ||
    form.value.toLowerCase() === "false";

  function openEditModal(item: SystemConfigItem) {
    const itemType = item.dataType || "String";
    const isBool =
      itemType.toLowerCase() === "boolean" ||
      item.value.toLowerCase() === "true" ||
      item.value.toLowerCase() === "false";
    setForm({
      key: item.key,
      value: isBool ? (item.value.toLowerCase() === "false" ? "false" : "true") : item.value,
      reason: `Cập nhật tham số ${item.key} từ cổng Admin`,
    });
    setSelectedDesc(formatConfigDescription(item.key, item.description));
    setSelectedType(itemType);
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setModalOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = form.key.trim();
    const value = form.value.trim();
    const reason = form.reason.trim();

    if (key.length < 2 || key.length > 100) {
      setError({ message: "Mã tham số phải từ 2 đến 100 ký tự." });
      return;
    }
    if (value.length < 1 || value.length > 1000) {
      setError({ message: "Giá trị cấu hình phải từ 1 đến 1000 ký tự." });
      return;
    }
    if (!reason || reason.length > 500) {
      setError({ message: "Vui lòng nhập lý do thay đổi (tối đa 500 ký tự) để lưu nhật ký kiểm toán." });
      return;
    }

    setBusy(true);
    setError(null);
    setSaved("");
    try {
      await adminConfigsService.update({ key, value, reason });
      setSaved(`Đã cập nhật tham số cấu hình "${key}" thành công.`);
      setModalOpen(false);
      resource.reload();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError({ message: cause.message, traceId: cause.traceId });
      } else {
        setError({ message: cause instanceof Error ? cause.message : "Không thể cập nhật cấu hình." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyTraceId(traceId: string) {
    try {
      await navigator.clipboard.writeText(traceId);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 1800);
    } catch {
      // Ignore clipboard error
    }
  }

  return (
    <>
      <PageHeading
        overline="Quản trị hệ thống"
        title="Cấu hình toàn sàn"
        description="Quản lý và cập nhật trực tiếp các tham số vận hành của toàn hệ thống. Mọi thay đổi được ghi nhận vào nhật ký kiểm toán."
        action={
          <div className="action-row">
            <button
              type="button"
              className="button button-secondary button-small"
              disabled={resource.loading}
              onClick={resource.reload}
            >
              {resource.loading ? "Đang làm mới…" : "Làm mới dữ liệu"}
            </button>
          </div>
        }
      />

      {resource.error && (
        <div role="alert" className="notice">
          <p>Không tải được danh sách cấu hình: {resource.error.message}</p>
          {resource.error instanceof ApiError && resource.error.traceId && (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => void copyTraceId((resource.error as ApiError).traceId!)}
            >
              {copiedTrace ? "Đã sao chép Trace ID" : `Copy Trace ID: ${resource.error.traceId}`}
            </button>
          )}
        </div>
      )}

      {saved && (
        <p role="status" className="form-success">
          {saved}
        </p>
      )}

      <SectionHeading
        title="Danh sách tham số hệ thống"
        hint={`Hiển thị ${filteredItems.length} / ${resource.data?.total ?? 0} tham số`}
      />

      <Card>
        <div className="toolbar">
          <label className="field-wrap" style={{ flex: 1, maxWidth: 420 }}>
            Tìm nhanh theo mã Key, giá trị hoặc mô tả
            <input
              className="field"
              type="search"
              placeholder="Ví dụ: Auction, Fee, Reputation, Max..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>
        </div>

        {filteredItems.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã tham số</th>
                  <th>Giá trị hiện tại</th>
                  <th>Mô tả nghiệp vụ</th>
                  <th style={{ minWidth: 120 }}>Cập nhật lần cuối</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <code>{item.key}</code>
                    </td>
                    <td>
                      <strong>{item.value}</strong>
                    </td>
                    <td>{formatConfigDescription(item.key, item.description)}</td>
                    <td>
                      {(() => {
                        const dt = formatDateTimeSplit(item.updatedAt);
                        if (!dt) return <span style={{ color: "var(--muted)" }}>—</span>;
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "13px" }}>{dt.time}</span>
                            <span style={{ fontSize: "12px", color: "var(--muted)" }}>{dt.date}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => openEditModal(item)}
                      >
                        Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải danh sách tham số hệ thống…"
                : resource.error
                  ? "Không tải được dữ liệu cấu hình từ Gateway"
                  : keyword.trim()
                    ? "Không có tham số nào khớp từ khóa tìm kiếm"
                    : "Chưa có tham số cấu hình nào được khởi tạo"
            }
          />
        )}

        {resource.data && (
          <AdminPagination
            page={page}
            pageSize={pageSize}
            totalItems={resource.data.total}
            loading={resource.loading}
            onPageChange={(nextPage) => setPage(nextPage)}
            itemLabel="cấu hình"
          />
        )}
      </Card>

      {modalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) closeModal();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) closeModal();
          }}
        >
          <section
            className="admin-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="config-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="config-modal-title">Chỉnh sửa tham số cấu hình</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Cập nhật giá trị tham số hệ thống kèm lý do thay đổi.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeModal}
                disabled={busy}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            {error && (
              <div role="alert" className="notice">
                <p>{error.message}</p>
                {error.traceId && (
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => void copyTraceId(error.traceId!)}
                  >
                    {copiedTrace ? "Đã sao chép Trace ID" : `Copy Trace ID: ${error.traceId}`}
                  </button>
                )}
              </div>
            )}

            <form className="auth-fields" onSubmit={(e) => void handleSubmit(e)}>
              <label className="field-wrap">
                Mã tham số
                <input
                  className="field"
                  readOnly
                  disabled
                  value={form.key}
                  style={{ backgroundColor: "var(--surface-muted)", cursor: "not-allowed" }}
                />
              </label>

              <div className="info-row">
                <span>Kiểu dữ liệu / Mô tả</span>
                <strong>
                  {selectedType} {selectedDesc ? `· ${selectedDesc}` : ""}
                </strong>
              </div>

              <label className="field-wrap">
                Giá trị cấu hình mới <span style={{ color: "var(--red)" }}>*</span>
                {isBooleanType ? (
                  <select
                    className="select-field"
                    value={form.value.toLowerCase() === "false" ? "false" : "true"}
                    onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    className="field"
                    required
                    minLength={1}
                    maxLength={1000}
                    value={form.value}
                    onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
                    placeholder="Nhập giá trị mới..."
                  />
                )}
              </label>

              <label className="field-wrap">
                Lý do thay đổi <span style={{ color: "var(--red)" }}>*</span>
                <textarea
                  className="textarea-field"
                  required
                  maxLength={500}
                  value={form.reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ghi rõ lý do thay đổi tham số để lưu vào Audit Log..."
                />
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  borderTop: "1px solid var(--line)",
                  paddingTop: "16px",
                }}
              >
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busy}
                  onClick={closeModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={busy || !form.key.trim() || !form.value.trim() || !form.reason.trim()}
                >
                  {busy ? "Đang lưu…" : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}



