"use client";

import { useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { formatMoney } from "@/lib/presentation";

type LocalCouponDraft = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderAmount: number;
  maxUsage: number;
  expiresAt: string;
  isActive: boolean;
  description: string;
};

export function AdminCouponsScreen() {
  // Kept strictly in React RAM state (never stored in localStorage/sessionStorage)
  const [drafts, setDrafts] = useState<LocalCouponDraft[]>([]);
  const [keyword, setKeyword] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: "10",
    minOrderAmount: "100000",
    maxUsage: "100",
    expiresAt: "",
    description: "",
  });
  const [notice, setNotice] = useState("");

  const filtered = keyword.trim()
    ? drafts.filter(
        (d) =>
          d.code.toLowerCase().includes(keyword.trim().toLowerCase()) ||
          d.description.toLowerCase().includes(keyword.trim().toLowerCase()),
      )
    : drafts;

  function handleCreateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = form.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!normalizedCode) return;

    const nextDraft: LocalCouponDraft = {
      id: `draft-${Date.now()}`,
      code: normalizedCode,
      discountType: form.discountType,
      discountValue: Number(form.discountValue) || 0,
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxUsage: Number(form.maxUsage) || 1,
      expiresAt: form.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      isActive: true,
      description: form.description.trim() || "Bản nháp chiến dịch mã giảm giá toàn sàn",
    };

    setDrafts((prev) => [nextDraft, ...prev]);
    setNotice(
      `Đã tạo mã giảm giá "${normalizedCode}" thành công.`,
    );
    setModalOpen(false);
    setForm({
      code: "",
      discountType: "PERCENTAGE",
      discountValue: "10",
      minOrderAmount: "100000",
      maxUsage: "100",
      expiresAt: "",
      description: "",
    });
  }

  function toggleDraftStatus(id: string) {
    setDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item)),
    );
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <>
      <PageHeading
        overline="Quản lý khuyến mãi"
        title="Quản lý mã giảm giá"
        description="Thiết lập và quản lý các chương trình mã giảm giá, voucher khuyến mãi trên toàn sàn."
        action={
          <button
            type="button"
            className="button button-primary button-small"
            onClick={() => setModalOpen(true)}
          >
            + Tạo mã giảm giá
          </button>
        }
      />

      {notice && (
        <p role="status" className="form-success">
          {notice}
        </p>
      )}

      <SectionHeading
        title="Danh sách mã giảm giá"
        hint="Quản lý các mã khuyến mãi đang áp dụng"
      />

      <Card>
        <div className="toolbar">
          <label className="field-wrap" style={{ flex: 1, maxWidth: 360 }}>
            Tìm theo mã code hoặc mô tả
            <input
              className="field"
              type="search"
              placeholder="Ví dụ: NEXUS10, FREESHIP..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>
        </div>

        {filtered.length > 0 ? (
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>Mã giảm giá</th>
                  <th style={{ width: "16%" }}>Loại ưu đãi</th>
                  <th style={{ width: "14%" }}>Đơn tối thiểu</th>
                  <th style={{ width: "13%" }}>Giới hạn lượt</th>
                  <th style={{ width: "15%" }}>Hạn sử dụng</th>
                  <th style={{ width: "10%" }}>Trạng thái</th>
                  <th style={{ width: "16%", minWidth: "160px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code>{item.code}</code>
                      <small style={{ display: "block", color: "var(--muted)" }}>
                        {item.description}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {item.discountType === "PERCENTAGE"
                          ? `Giảm ${item.discountValue}%`
                          : `Giảm ${formatMoney(item.discountValue)}`}
                      </strong>
                    </td>
                    <td>{formatMoney(item.minOrderAmount)}</td>
                    <td>{item.maxUsage} lượt</td>
                    <td>{item.expiresAt}</td>
                    <td>
                      <Badge tone={item.isActive ? "green" : "slate"}>
                        {item.isActive ? "Sẵn sàng (Draft)" : "Tạm tắt"}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "8px",
                          flexWrap: "nowrap",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDraftStatus(item.id);
                          }}
                        >
                          {item.isActive ? "Tạm tắt" : "Bật lại"}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDraft(item.id);
                          }}
                        >
                          Xóa nháp
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData title="Chưa có bản nháp mã giảm giá nào. Nhấn '+ Soạn bản nháp mã giảm giá' để kiểm thử cấu hình." />
        )}
      </Card>

      {modalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setModalOpen(false);
          }}
        >
          <section
            className="admin-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-modal-title"
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="coupon-modal-title">Tạo mã giảm giá mới</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  Thiết lập thông tin mã giảm giá và điều kiện áp dụng toàn sàn.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Đóng popup"
              >
                ✕
              </button>
            </div>

            <form className="auth-fields" onSubmit={handleCreateDraft}>
              <div className="form-grid">
                <label className="field-wrap">
                  Mã Coupon (Code) <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    className="field"
                    required
                    maxLength={32}
                    placeholder="Ví dụ: NEXUSVIP50"
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                </label>

                <label className="field-wrap">
                  Loại giảm giá
                  <select
                    className="select-field"
                    value={form.discountType}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        discountType: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT",
                      }))
                    }
                  >
                    <option value="PERCENTAGE">Theo phần trăm (%)</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                  </select>
                </label>

                <label className="field-wrap">
                  Giá trị giảm {form.discountType === "PERCENTAGE" ? "(%)" : "(VNĐ)"}{" "}
                  <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    className="field"
                    type="number"
                    min="1"
                    max={form.discountType === "PERCENTAGE" ? "100" : undefined}
                    required
                    value={form.discountValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                  />
                </label>

                <label className="field-wrap">
                  Giá trị đơn hàng tối thiểu (VNĐ)
                  <input
                    className="field"
                    type="number"
                    min="0"
                    required
                    value={form.minOrderAmount}
                    onChange={(e) => setForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                  />
                </label>

                <label className="field-wrap">
                  Giới hạn lượt sử dụng
                  <input
                    className="field"
                    type="number"
                    min="1"
                    required
                    value={form.maxUsage}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxUsage: e.target.value }))}
                  />
                </label>

                <label className="field-wrap">
                  Ngày hết hạn
                  <input
                    className="field"
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </label>
              </div>

              <label className="field-wrap">
                Mô tả chương trình
                <textarea
                  className="textarea-field"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ghi chú phạm vi áp dụng của mã giảm giá..."
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
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="button button-primary" disabled={!form.code.trim()}>
                  Lưu mã giảm giá
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
