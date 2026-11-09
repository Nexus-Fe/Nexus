"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
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

  function selectCategory(category: AdminCategory) {
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
  }

  function resetForm() {
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
      setSaved(editing ? "Đã cập nhật danh mục." : "Đã tạo danh mục.");
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
      if (editing === id) resetForm();
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
      />
      {categories.error && (
        <p className="notice" role="alert">
          Không tải được danh mục: {categories.error.message}
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="form-success" role="status">
          {saved}
        </p>
      )}
      <SectionHeading title={editing ? "Sửa danh mục" : "Tạo danh mục"} />
      <Card className="card-pad">
        <form onSubmit={(event) => void submit(event)}>
          <div className="form-grid">
            <label className="field-wrap">
              Tên danh mục
              <input
                className="field"
                required
                maxLength={100}
                value={form.name}
                onChange={(event) =>
                  setForm((value) => ({ ...value, name: event.target.value }))
                }
              />
            </label>
            <label className="field-wrap">
              Danh mục cha
              <select
                className="select-field"
                value={form.parentId ?? ""}
                disabled={Boolean(editing)}
                onChange={(event) =>
                  setForm((value) => ({ ...value, parentId: event.target.value || null }))
                }
              >
                <option value="">Không có</option>
                {records
                  .filter((category) => category.categoryId !== editing)
                  .map((category) => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.name}
                    </option>
                  ))}
              </select>
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
            <p className="status-note">
              Không thể thay đổi danh mục cha sau khi khởi tạo. Bạn có thể ẩn hoặc bật hiển thị lại danh mục bất cứ lúc nào.
            </p>
          )}
          <label className="field-wrap">
            Mô tả
            <textarea
              className="textarea-field"
              value={form.description}
              onChange={(event) =>
                setForm((value) => ({ ...value, description: event.target.value }))
              }
            />
          </label>
          <div className="action-row">
            <button className="button button-primary" disabled={busy}>
              {busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo danh mục"}
            </button>
            {editing && (
              <button
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={resetForm}
              >
                Hủy sửa
              </button>
            )}
          </div>
        </form>
      </Card>
      <SectionHeading title="Danh sách danh mục toàn sàn" />
      <Card>
        {records.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên danh mục</th>
                  <th>Danh mục cha</th>
                  <th>Thứ tự</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {records.map((category) => (
                  <tr key={category.categoryId}>
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
                    <td>{category.sortOrder ?? 0}</td>
                    <td>
                      <Badge tone={category.isActive === false ? "slate" : "green"}>
                        {category.isActive === false ? "Đã ẩn (Disabled)" : "Đang hiển thị"}
                      </Badge>
                    </td>
                    <td>
                      <div className="action-row">
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          disabled={busy}
                          onClick={() => selectCategory(category)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="button button-danger button-small"
                          disabled={busy}
                          onClick={() => setDeleting(category.categoryId)}
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
