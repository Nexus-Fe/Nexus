"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import { getCategories, createProduct, updateProduct } from "../../services/seller.api";
import type {
  Product,
  Category,
  CreateProductDTO,
  UpdateProductDTO,
} from "../../types/seller.types";
import { Card } from "@/components/ui/Primitives";

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Tên sản phẩm tối thiểu 3 ký tự")
    .max(150, "Tên sản phẩm tối đa 150 ký tự"),
  categoryId: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn danh mục sản phẩm"),
  price: z
    .number({ message: "Vui lòng nhập giá bán hợp lệ" })
    .positive("Giá bán phải lớn hơn 0")
    .max(1_000_000_000, "Giá bán tối đa 1 tỷ VNĐ"),
  imageUrl: z
    .string()
    .trim()
    .url("Vui lòng nhập URL hình ảnh hợp lệ (http/https)")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(10, "Mô tả sản phẩm tối thiểu 10 ký tự")
    .max(3000, "Mô tả sản phẩm tối đa 3000 ký tự"),
  sku: z
    .string()
    .trim()
    .max(50, "Mã SKU tối đa 50 ký tự")
    .optional()
    .or(z.literal("")),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export interface ProductFormProps {
  initialProduct?: Product | null;
  onSuccess?: (product: Product) => void;
  onCancel?: () => void;
  className?: string;
}

export function ProductForm({
  initialProduct,
  onSuccess,
  onCancel,
  className = "",
}: ProductFormProps) {
  const isEditMode = Boolean(initialProduct?.id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(
    initialProduct?.imageUrl ?? initialProduct?.images?.[0] ?? ""
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialProduct?.name ?? "",
      categoryId: initialProduct?.categoryId ?? "",
      price: initialProduct?.price ?? 0,
      imageUrl: initialProduct?.imageUrl ?? initialProduct?.images?.[0] ?? "",
      description: initialProduct?.description ?? "",
      sku: initialProduct?.sku ?? "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setIsLoadingCategories(true);
      setCategoryError(null);
      try {
        const data = await getCategories();
        if (isMounted) {
          setCategories(data || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof ApiError
              ? err.message
              : "Không thể tải danh sách danh mục. Vui lòng tải lại.";
          setCategoryError(msg);
        }
      } finally {
        if (isMounted) setIsLoadingCategories(false);
      }
    }

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialProduct) {
      reset({
        name: initialProduct.name ?? "",
        categoryId: initialProduct.categoryId ?? "",
        price: initialProduct.price ?? 0,
        imageUrl: initialProduct.imageUrl ?? initialProduct.images?.[0] ?? "",
        description: initialProduct.description ?? "",
        sku: initialProduct.sku ?? "",
      });
    }
  }, [initialProduct, reset]);

  const onSubmit = async (values: ProductFormValues) => {
    setSubmitError(null);

    try {
      if (isEditMode && initialProduct?.id) {
        const updatePayload: UpdateProductDTO = {
          name: values.name,
          categoryId: values.categoryId,
          price: values.price,
          description: values.description,
          images: values.imageUrl ? [values.imageUrl] : [],
        };

        const updated = await updateProduct(initialProduct.id, updatePayload);
        onSuccess?.(updated);
      } else {
        // =========================================================================
        // QUAN TRỌNG: Sản phẩm mới sẽ vào trạng thái PENDING_APPROVAL chờ Staff duyệt,
        // không được phép tự publish thành ACTIVE.
        // =========================================================================
        const createPayload: CreateProductDTO = {
          name: values.name,
          categoryId: values.categoryId,
          price: values.price,
          description: values.description,
          images: values.imageUrl ? [values.imageUrl] : [],
          sku: values.sku || undefined,
        };

        const created = await createProduct(createPayload);
        onSuccess?.(created);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || "Thao tác với sản phẩm thất bại. Vui lòng kiểm tra lại dữ liệu.");
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
      }
    }
  };

  return (
    <Card className={`card-pad ${className}`} style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isEditMode ? "Chỉnh sửa Sản phẩm" : "Thêm Sản phẩm Mới"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
            {isEditMode
              ? "Cập nhật các thông số sản phẩm đang có trong cửa hàng."
              : "Sản phẩm sau khi tạo sẽ được gửi tới Ban Quản Trị để duyệt trước khi mở bán."}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="button button-secondary button-small"
          >
            ✕ Hủy bỏ
          </button>
        )}
      </div>

      {submitError && (
        <div
          role="alert"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <strong>⚠️ Lỗi: </strong>
            <span>{submitError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "grid", gap: 20 }}>
        {/* Tên sản phẩm */}
        <div className="field-wrap">
          <label htmlFor="name">
            Tên sản phẩm <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            id="name"
            type="text"
            disabled={isSubmitting}
            placeholder="VD: Bàn phím cơ không dây Nexus Pro (RGB, Red Switch)"
            className="field"
            {...register("name")}
          />
          {errors.name && <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>{errors.name.message}</p>}
        </div>

        {/* Danh mục & Giá */}
        <div className="form-grid">
          {/* Danh mục */}
          <div className="field-wrap">
            <label htmlFor="categoryId">
              Danh mục ngành hàng <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {isLoadingCategories ? (
              <div className="field" style={{ display: "flex", alignItems: "center", color: "var(--muted)", background: "#f8fafc" }}>
                Đang tải danh mục...
              </div>
            ) : (
              <select
                id="categoryId"
                disabled={isSubmitting || isLoadingCategories}
                className="select-field"
                {...register("categoryId")}
              >
                <option value="">-- Chọn danh mục phù hợp --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
            {categoryError && (
              <p style={{ margin: "4px 0 0", color: "#d97706", fontSize: 12 }}>{categoryError}</p>
            )}
            {errors.categoryId && (
              <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>{errors.categoryId.message}</p>
            )}
          </div>

          {/* Giá */}
          <div className="field-wrap">
            <label htmlFor="price">
              Giá niêm yết (VNĐ) <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              id="price"
              type="number"
              step="1000"
              disabled={isSubmitting}
              placeholder="VD: 590000"
              className="field"
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price && <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>{errors.price.message}</p>}
          </div>
        </div>

        {/* SKU code */}
        <div className="field-wrap">
          <label htmlFor="sku">Mã SKU sản phẩm (Tùy chọn)</label>
          <input
            id="sku"
            type="text"
            disabled={isSubmitting}
            placeholder="VD: NEXUS-KB-PRO-RED"
            className="field"
            style={{ fontFamily: "monospace" }}
            {...register("sku")}
          />
          {errors.sku && <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>{errors.sku.message}</p>}
        </div>

        {/* URL Hình ảnh */}
        <div className="field-wrap">
          <label htmlFor="imageUrl">URL Hình ảnh đại diện</label>
          <input
            id="imageUrl"
            type="url"
            disabled={isSubmitting}
            placeholder="https://example.com/images/product.jpg"
            className="field"
            {...register("imageUrl", {
              onChange: (e) => setPreviewImageUrl(e.target.value),
            })}
          />
          {errors.imageUrl && (
            <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>{errors.imageUrl.message}</p>
          )}

          {previewImageUrl && !errors.imageUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid var(--line)", marginTop: 8 }}>
              <div style={{ position: "relative", width: 50, height: 50, borderRadius: 6, overflow: "hidden", background: "#fff", flexShrink: 0 }}>
                <Image src={previewImageUrl} alt="Xem trước" fill sizes="50px" style={{ objectFit: "cover" }} unoptimized />
              </div>
              <small style={{ color: "var(--muted)", fontSize: 12 }}>
                Hình ảnh đại diện sẽ hiển thị trên trang danh mục và chi tiết sản phẩm.
              </small>
            </div>
          )}
        </div>

        {/* Mô tả */}
        <div className="field-wrap">
          <label htmlFor="description">
            Mô tả chi tiết sản phẩm <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            id="description"
            rows={5}
            disabled={isSubmitting}
            placeholder="Mô tả các thông số kỹ thuật, tính năng nổi bật, chính sách bảo hành và hướng dẫn sử dụng..."
            className="textarea-field"
            {...register("description")}
          />
          {errors.description && (
            <p style={{ margin: "4px 0 0", color: "#ef4444", fontSize: 12 }}>{errors.description.message}</p>
          )}
        </div>

        {/* Note kiểm duyệt */}
        {!isEditMode && (
          <div style={{ padding: 14, background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
            <strong>ℹ️ Quy định kiểm duyệt:</strong> Sản phẩm sau khi bấm tạo sẽ chuyển vào trạng thái{" "}
            <strong>PENDING_APPROVAL (Chờ duyệt)</strong>. Staff của sàn Nexus sẽ đối soát nội dung và hình ảnh trước khi sản phẩm được kích hoạt bán công khai.
          </div>
        )}

        {/* Actions */}
        <div className="action-row" style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          {onCancel && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className="button button-secondary"
            >
              Hủy
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`button button-primary ${isSubmitting ? "button-disabled" : ""}`}
            style={{ minWidth: 180, minHeight: 44 }}
          >
            {isSubmitting ? "Đang xử lý..." : isEditMode ? "Lưu thay đổi" : "Tạo sản phẩm (Gửi duyệt)"}
          </button>
        </div>
      </form>
    </Card>
  );
}
