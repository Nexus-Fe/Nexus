"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading } from "@/components/ui/Primitives";
import { useApiResource } from "@/lib/api/use-api-resource";
import {
  adminCategoriesService,
  type AdminCategory,
  type CategoryInput,
} from "./services/admin-categories.service";

type FormState = CategoryInput & { isActive: boolean };

const emptyForm: FormState = {
  name: "",
  description: "",
  parentId: null,
  sortOrder: 0,
  isActive: true,
};

export function AdminCategoriesScreen() {
  const categories = useApiResource("admin-categories", adminCategoriesService.list);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const records = categories.data ?? [];
  const categoryNames = new Map(records.map((category) => [category.categoryId, category.name]));
  const categoryToDelete = records.find((category) => category.categoryId === deleting);

  useEffect(() => {
    const dialog = confirmDialog.current;
    if (!dialog) return;
    if (deleting && !dialog.open) dialog.showModal();
    if (!deleting && dialog.open) dialog.close();
  }, [deleting]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setSaved("");
    setModalOpen(true);
  }

  function openEdit(category: AdminCategory) {
    setEditing(category.categoryId);
    setDeleting(null);
    setForm({
      name: category.name,
      description: category.description ?? "",
      parentId: category.parentId ?? null,
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive ?? true,
    });
    setError("");
    setSaved("");
    setModalOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const input: CategoryInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        parentId: form.parentId,
        sortOrder: form.sortOrder,
      };
      if (editing) {
        const current = records.find((category) => category.categoryId === editing);
        if (!current) throw new Error("Danh mục cần sửa không còn trong danh sách.");
        await adminCategoriesService.update(editing, {
          name: input.name,
          description: input.description,
          level: current.level ?? 1,
          sortOrder: input.sortOrder,
          isDisabled: !form.isActive,
        });
      } else {
        await adminCategoriesService.create(input);
      }
      setSaved(editing ? "Đã cập nhật danh mục thành công." : "Đã tạo danh mục mới thành công.");
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      categories.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu danh mục.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCategory(id: string) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await adminCategoriesService.remove(id);
      setDeleting(null);
      if (editing === id) closeModal();
      setSaved("Đã xóa danh mục.");
      categories.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa danh mục.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Quản lý sản phẩm"
        title="Danh mục sản phẩm"
        description="Quản lý cấu trúc cây danh mục và trạng thái hiển thị của các ngành hàng toàn sàn."
        action={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="button button-primary button-small"
              onClick={openCreate}
            >
              + Tạo danh mục
            </button>
            <button
              type="button"
              className="button button-secondary button-small"
              disabled={categories.loading}
              onClick={categories.reload}
            >
              {categories.loading ? "Đang làm mới…" : "Làm mới dữ liệu"}
            </button>
          </div>
        }
      />

      {categories.error && (
        <p className="notice" role="alert">
          Không tải được danh mục: {categories.error.message}
        </p>
      )}
      {error && !modalOpen && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="form-success" role="status">
          {saved}
        </p>
      )}

      <Card>
        {records.length ? (
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Tên danh mục</th>
                  <th style={{ width: "26%" }}>Danh mục cha</th>
                  <th style={{ width: "10%", textAlign: "center" }}>Thứ tự</th>
                  <th style={{ width: "16%" }}>Trạng thái</th>
                  <th style={{ width: "16%", minWidth: "140px", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((category) => (
                  <tr
                    key={category.categoryId}
                    className="clickable-row"
                    onClick={() => openEdit(category)}
                    title="Nhấn để chỉnh sửa danh mục này"
                  >
                    <td>
                      <strong>{category.name}</strong>
                      {category.description && (
                        <small style={{ display: "block", color: "var(--muted)" }}>
                          {category.description}
                        </small>
                      )}
                    </td>
                    <td>
                      {category.parentId
                        ? (categoryNames.get(category.parentId) ?? category.parentId)
                        : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>{category.sortOrder ?? 0}</td>
                    <td>
                      <Badge tone={category.isActive === false ? "slate" : "green"}>
                        {category.isActive === false ? "Đã ẩn (Disabled)" : "Đang hiển thị"}
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
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(category);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="button button-danger button-small"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(category.categoryId);
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoData
            title={
              categories.loading
                ? "Đang tải danh mục…"
                : categories.error
                  ? "Không tải được danh mục"
                  : "Chưa có danh mục"
            }
          />
        )}
      </Card>

      {/* Modal Popup Tạo / Sửa danh mục */}
      {modalOpen && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) closeModal();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) closeModal();
          }}
        >
          <section
            className="admin-modal-dialog"
            style={{ maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="admin-modal-heading">
              <div>
                <h2 id="category-modal-title">
                  {editing ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                  {editing
                    ? `Mã danh mục: ${editing}`
                    : "Thiết lập thông tin danh mục hàng hóa mới toàn sàn."}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeModal}
                disabled={busy}
                aria-label="Đóng popup"
                title="Đóng (Esc)"
              >
                ✕
              </button>
            </div>

            {error && (
              <p className="notice" role="alert" style={{ marginBottom: "14px" }}>
                {error}
              </p>
            )}

            <form onSubmit={(event) => void submit(event)}>
              <div className="form-grid">
                <label className="field-wrap">
                  Tên danh mục <span style={{ color: "var(--red)" }}>*</span>
                  <input
                    className="field"
                    required
                    maxLength={100}
                    placeholder="Ví dụ: Thiết bị Điện tử..."
                    value={form.name}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, name: event.target.value }))
                    }
                  />
                </label>
                <label className="field-wrap">
                  Danh mục cha
                  {editing ? (
                    <input
                      className="field"
                      disabled
                      readOnly
                      value={form.parentId ? (categoryNames.get(form.parentId) ?? form.parentId) : "Không có (Danh mục gốc)"}
                      style={{ background: "#f8fafc", color: "#64748b", cursor: "not-allowed" }}
                    />
                  ) : (
                    <select
                      className="select-field"
                      value={form.parentId ?? ""}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, parentId: event.target.value || null }))
                      }
                    >
                      <option value="">Không có (Danh mục gốc)</option>
                      {records.map((category) => (
                        <option key={category.categoryId} value={category.categoryId}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <label className="field-wrap">
                  Thứ tự hiển thị
                  <input
                    className="field"
                    type="number"
                    min="0"
                    required
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, sortOrder: Number(event.target.value) }))
                    }
                  />
                </label>
                {editing && (
                  <label className="field-wrap">
                    Trạng thái
                    <select
                      className="select-field"
                      value={form.isActive ? "active" : "inactive"}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          isActive: event.target.value === "active",
                        }))
                      }
                    >
                      <option value="active">Đang hiển thị</option>
                      <option value="inactive">Đã ẩn</option>
                    </select>
                  </label>
                )}
              </div>
              {editing && (
                <p className="status-note" style={{ marginTop: "10px", fontSize: "12px" }}>
                  Không thể thay đổi danh mục cha sau khi khởi tạo. Bạn có thể ẩn hoặc bật hiển thị lại danh mục bất cứ lúc nào.
                </p>
              )}
              <label className="field-wrap" style={{ marginTop: "12px" }}>
                Mô tả
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, description: event.target.value }))
                  }
                />
              </label>
              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
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
                <button className="button button-primary" disabled={busy}>
                  {busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo danh mục"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <dialog
        ref={confirmDialog}
        className="admin-modal-dialog admin-category-confirm"
        aria-labelledby="delete-category-title"
        aria-describedby="delete-category-description"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setDeleting(null);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) setDeleting(null);
        }}
      >
        <h2 id="delete-category-title">Xóa danh mục?</h2>
        <p id="delete-category-description">
          Bạn có chắc muốn xóa danh mục <strong>{categoryToDelete?.name}</strong>? Thao tác này có thể ảnh hưởng đến các sản phẩm đang thuộc danh mục.
        </p>
        {error && <p className="notice" role="alert">{error}</p>}
        <div className="action-row">
          <button type="button" className="button button-danger" disabled={busy || !deleting} onClick={() => deleting && void removeCategory(deleting)}>
            {busy ? "Đang xóa…" : "Xác nhận xóa"}
          </button>
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => setDeleting(null)}>
            Hủy
          </button>
        </div>
      </dialog>
    </>
  );
}
