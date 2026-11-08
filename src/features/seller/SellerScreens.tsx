"use client";
/* Catalog and fulfillment responses are ungenerated Gateway JSON contracts. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/components/auth/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { fulfillmentService } from "@/features/fulfillment";
import { loadSafeRegistrationDraft } from "./services/seller.service";
import { sellerCatalogService, type InventoryBalance, type ProductVariant } from "./services/catalog.service";
import { sellerOrdersService } from "./services/seller-orders.service";
import { MAX_INVENTORY_QUANTITY, parseInitialInventoryQuantity } from "./services/inventory-quantity";
import { describeCategoryError, leafCategoryOptions } from "./services/category-options";

export { BecomeSellerScreen } from "./BecomeSellerScreen";

type Obj = Record<string, any>;
const msg = (e: Error | null) => e?.message ?? "";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SPEC_PRESETS = ["Chất liệu", "Xuất xứ", "Bảo hành", "Kích thước", "Trọng lượng", "Bộ sản phẩm"];

type DraftImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  altText: string;
  isPrimary: boolean;
};

type DraftVariantItem = {
  id: string;
  skuCode: string;
  name: string;
  price: string;
  quantity: string;
  currency: string;
  isActive: boolean;
  attributes: Array<{ attrName: string; attrValue: string }>;
};

function buildAutoSku(productName: string, variantName: string, index: number): string {
  const clean = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase();

  const pToken = clean(productName).split("-").slice(0, 3).join("-") || "NEX";
  const vToken = clean(variantName).split("-").slice(0, 2).join("-") || `V${index + 1}`;
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${pToken}-${vToken}-${suffix}`.slice(0, 48);
}

export function SellerProductsScreen() {
  const [q, setQ] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const resource = useApiResource(
    `seller-products:${page}:${pageSize}:${keyword}`,
    (signal) => sellerCatalogService.list(page, keyword, signal, pageSize),
  );
  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Quản lý sản phẩm"
        description="Sản phẩm và trạng thái từ Catalog API."
      />
      <SectionHeading
        title="Danh sách sản phẩm"
        action={
          <ButtonLink href={ROUTES.seller.newProduct}>
            <Icon name="plus" size={17} /> Tạo sản phẩm mới
          </ButtonLink>
        }
      />
      <Card className="seller-products-list">
        <form
          className="toolbar seller-products-search"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setKeyword(q.trim());
            if (keyword === q.trim() && page === 1) resource.reload();
          }}
        >
          <input
            className="field"
            placeholder="Tìm theo tên sản phẩm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="button button-secondary">Tìm kiếm</button>
        </form>
        {resource.error && (
          <p role="alert" className="notice">
            {msg(resource.error)}
          </p>
        )}
        {resource.data?.items.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Biến thể SKU</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((p) => (
                  <tr key={p.productId}>
                    <td>
                      <Link href={ROUTES.seller.product(p.productId)}>
                        <strong>{p.name}</strong>
                      </Link>
                      {p.brand && <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.brand}</div>}
                    </td>
                    <td>{p.categoryName || "—"}</td>
                    <td>
                      <strong>{formatMoney(p.minPrice ?? null)}</strong>
                    </td>
                    <td>{p.variantCount} SKU</td>
                    <td>
                      <Badge>{p.status ?? ""}</Badge>
                    </td>
                    <td>
                      <ButtonLink href={ROUTES.seller.product(p.productId)} variant="secondary">Điều chỉnh</ButtonLink>
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
                ? "Đang tải sản phẩm…"
                : resource.error
                  ? "Không tải được sản phẩm"
                  : "Chưa có sản phẩm"
            }
          />
        )}
        {resource.data && (
          <div className="seller-products-pagination">
            <label className="seller-products-page-size">
              <span>Hiển thị</span>
              <select
                className="field"
                aria-label="Số sản phẩm mỗi trang"
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
              >
                {[10, 30, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button button-secondary"
              disabled={page <= 1 || resource.loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Trang trước
            </button>
            <span>
              Trang {page}/{resource.data.pagination.totalPages}
            </span>
            <button
              type="button"
              className="button button-secondary"
              disabled={!resource.data.pagination.hasNextPage || resource.loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau
            </button>
          </div>
        )}
      </Card>
    </>
  );
}

export function SellerProductEditorScreen() {
  const { user } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  // Dynamic specifications (JSON object per R105_POST_PRODUCTS.md)
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: "Bảo hành", value: "12 tháng chính hãng" },
    { key: "Xuất xứ", value: "Việt Nam" },
  ]);

  // Product images (1-5 images uploaded during creation)
  const [images, setImages] = useState<DraftImageItem[]>([]);

  // Product variants (1-10 variants with custom attributes & initial stock)
  const [variants, setVariants] = useState<DraftVariantItem[]>([
    {
      id: "var-1",
      skuCode: "",
      name: "Tiêu chuẩn",
      price: "",
      quantity: "20",
      currency: "VND",
      isActive: true,
      attributes: [
        { attrName: "Màu sắc", attrValue: "" },
        { attrName: "Kích cỡ", attrValue: "" },
      ],
    },
  ]);

  // Quick create warehouse drawer (WH-04)
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  useEffect(() => {
    const openWarehouseFormFromHash = () => {
      if (window.location.hash === "#create-warehouse") setShowCreateWarehouse(true);
    };
    window.addEventListener("hashchange", openWarehouseFormFromHash);
    const initialCheck = window.setTimeout(openWarehouseFormFromHash, 0);
    return () => {
      window.removeEventListener("hashchange", openWarehouseFormFromHash);
      window.clearTimeout(initialCheck);
    };
  }, []);
  const [newWhCode, setNewWhCode] = useState("");
  const [newWhName, setNewWhName] = useState("");
  const [newWhAddress, setNewWhAddress] = useState("");
  const [creatingWh, setCreatingWh] = useState(false);

  const [error, setError] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [busy, setBusy] = useState(false);

  const categories = useApiResource("seller-product-categories", sellerCatalogService.categories);
  const warehouses = useApiResource(
    user?.id ? `seller-warehouses:${user.id}` : "seller-warehouses:anon",
    (signal) => sellerCatalogService.listWarehouses(user?.id, signal),
  );


  const categoryOptions = leafCategoryOptions(categories.data ?? []);
  const selectedCategory = categoryOptions.find((c) => c.categoryId === categoryId);
  const activeWarehouseId = warehouseId || warehouses.data?.[0]?.id || "";
  const selectedWarehouse = warehouses.data?.find((w) => w.id === activeWarehouseId);

  function handleSelectImages(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError("");
    const next: DraftImageItem[] = [...images];
    for (const file of Array.from(fileList)) {
      if (next.length >= 5) {
        setError("Một sản phẩm hỗ trợ tối đa 5 ảnh đại diện chung.");
        break;
      }
      if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
        setError(`Ảnh "${file.name}" không hợp lệ. Chỉ nhận JPG, PNG, WEBP tối đa 5 MB.`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl,
        altText: name.trim() || file.name.replace(/\.[^.]+$/, ""),
        isPrimary: next.length === 0,
      });
    }
    setImages(next);
  }

  function setPrimaryDraftImage(targetId: string) {
    setImages((prev) => prev.map((img) => ({ ...img, isPrimary: img.id === targetId })));
  }

  function removeDraftImage(targetId: string) {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== targetId);
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
  }

  function addSpecRow(presetKey = "") {
    if (presetKey && specs.some((s) => s.key.toLowerCase() === presetKey.toLowerCase())) return;
    setSpecs((prev) => [...prev, { key: presetKey, value: "" }]);
  }

  function updateSpecRow(index: number, field: "key" | "value", val: string) {
    setSpecs((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item)));
  }

  function removeSpecRow(index: number) {
    setSpecs((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addVariantCard() {
    if (variants.length >= 10) return;
    const nextIdx = variants.length + 1;
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${nextIdx}`,
        skuCode: buildAutoSku(name, `Phien-ban-${nextIdx}`, nextIdx - 1),
        name: `Phiên bản #${nextIdx}`,
        price: prev[0]?.price || "",
        quantity: "10",
        currency: "VND",
        isActive: false,
        attributes: [{ attrName: "Màu sắc", attrValue: "" }],
      },
    ]);
  }

  function updateVariantField(index: number, field: keyof DraftVariantItem, value: any) {
    setVariants((prev) =>
      prev.map((v, idx) => {
        if (field === "isActive") {
          return { ...v, isActive: idx === index };
        }
        return idx === index ? { ...v, [field]: value } : v;
      }),
    );
  }

  function addVariantAttribute(variantIdx: number, presetName = "") {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === variantIdx
          ? { ...v, attributes: [...v.attributes, { attrName: presetName, attrValue: "" }] }
          : v,
      ),
    );
  }

  function updateVariantAttribute(
    variantIdx: number,
    attrIdx: number,
    field: "attrName" | "attrValue",
    value: string,
  ) {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === variantIdx
          ? {
              ...v,
              attributes: v.attributes.map((a, aIdx) => (aIdx === attrIdx ? { ...a, [field]: value } : a)),
            }
          : v,
      ),
    );
  }

  function removeVariantAttribute(variantIdx: number, attrIdx: number) {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === variantIdx
          ? { ...v, attributes: v.attributes.filter((_, aIdx) => aIdx !== attrIdx) }
          : v,
      ),
    );
  }

  function removeVariantCard(index: number) {
    if (variants.length <= 1) return;
    setVariants((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (!next.some((v) => v.isActive) && next.length > 0) {
        next[0] = { ...next[0], isActive: true };
      }
      return next;
    });
  }

  async function handleQuickCreateWarehouse() {
    if (!newWhCode.trim() || !newWhName.trim()) {
      setError("Vui lòng nhập Mã kho và Tên kho.");
      return;
    }
    setCreatingWh(true);
    setError("");
    try {
      const created = await sellerCatalogService.createWarehouse({
        code: newWhCode,
        name: newWhName,
        address: newWhAddress || "Kho tiêu chuẩn Seller Nexus",
        sellerId: user?.id,
      });
      setShowCreateWarehouse(false);
      setNewWhCode("");
      setNewWhName("");
      setNewWhAddress("");
      warehouses.reload();
      if (created?.id) setWarehouseId(created.id);
    } catch (cause) {
      setError(msg(cause as Error));
    } finally {
      setCreatingWh(false);
    }
  }

  async function submitProduct(publishImmediately: boolean) {
    setBusy(true);
    setError("");
    setProgressNote("");
    try {
      if (!user?.id) throw new Error("Bạn cần đăng nhập tài khoản Seller để tạo sản phẩm.");
      if (!name.trim()) throw new Error("Vui lòng nhập tên sản phẩm.");
      if (!categoryId) throw new Error("Vui lòng chọn một danh mục ngành hàng lá.");

      if (publishImmediately && images.length === 0) {
        throw new Error(
          "Để Đăng bán & Lên kệ ngay (ACTIVE), sản phẩm cần ít nhất 1 ảnh đại diện. Vui lòng chọn ảnh ở Mục 2 hoặc bấm 'Lưu bản nháp'.",
        );
      }

      const specifications = specs
        .map((row) => ({ name: row.key.trim(), value: row.value.trim() }))
        .filter((row) => row.name && row.value);

      // Validate and normalize variants
      const preparedVariants = variants.map((v, idx) => {
        const sku = v.skuCode.trim() || buildAutoSku(name, v.name, idx);
        const parsedPrice = Number(v.price);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          throw new Error(`Biến thể #${idx + 1} (${sku}): Giá bán phải lớn hơn 0 ₫.`);
        }
        const initialQuantity = parseInitialInventoryQuantity(v.quantity);
        const cleanAttrs = v.attributes
          .map((a) => ({ attrName: a.attrName.trim(), attrValue: a.attrValue.trim() }))
          .filter((a) => a.attrName && a.attrValue);

        return {
          skuCode: sku,
          name: v.name.trim() || name.trim(),
          price: parsedPrice,
          currency: v.currency || "VND",
          quantity: initialQuantity,
          isActive: v.isActive,
          warehouseId: activeWarehouseId || null,
          attributes: cleanAttrs,
        };
      });

      setProgressNote("Bước 1/3: Đang khởi tạo sản phẩm & khai báo tồn kho đầu kỳ (FUL-01)…");
      const created = await sellerCatalogService.create({
        sellerId: user.id,
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        brand: brand.trim() || undefined,
        specifications,
        variants: preparedVariants,
      });

      const productId = created.id || created.productId;
      if (!productId) throw new Error("Catalog API chưa trả về mã sản phẩm.");

      // Upload images sequentially so sortOrder and primary image are preserved
      if (images.length > 0) {
        // Put primary image first so it automatically becomes active cover image on upload
        const orderedImages = [...images].sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1));
        for (let i = 0; i < orderedImages.length; i++) {
          const item = orderedImages[i];
          setProgressNote(`Bước 2/3: Đang tải ảnh sản phẩm (${i + 1}/${orderedImages.length})…`);
          const uploaded = await sellerCatalogService.uploadImage(
            productId,
            item.file,
            item.altText.trim() || name.trim(),
            i,
          );
          if (item.isPrimary && i > 0 && uploaded?.id) {
            await sellerCatalogService.setPrimaryImage(uploaded.id, item.altText.trim() || name.trim());
          }
        }
      }

      if (publishImmediately) {
        setProgressNote("Bước 3/3: Đang kích hoạt mở bán sản phẩm lên sàn (ACTIVE)…");
        await sellerCatalogService.changeStatus(productId, "ACTIVE");
      }

      router.push(ROUTES.seller.product(productId));
    } catch (ex) {
      setError(describeCategoryError(msg(ex as Error)));
      setBusy(false);
      setProgressNote("");
    }
  }

  // Live preview metrics
  const primaryPreviewImage = images.find((i) => i.isPrimary) ?? images[0];
  const validPrices = variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0);
  const minPreviewPrice = validPrices.length ? Math.min(...validPrices) : null;
  const maxPreviewPrice = validPrices.length ? Math.max(...validPrices) : null;
  const totalInitialStock = variants.reduce((sum, v) => {
    const q = Number(v.quantity);
    return sum + (Number.isInteger(q) && q >= 0 ? q : 0);
  }, 0);

  const isBasicReady = Boolean(name.trim() && categoryId);
  const isVariantsReady =
    variants.length > 0 &&
    variants.every(
      (v) =>
        Number.isFinite(Number(v.price)) &&
        Number(v.price) > 0 &&
        v.quantity !== "" &&
        Number.isInteger(Number(v.quantity)) &&
        Number(v.quantity) >= 0 &&
        Number(v.quantity) <= MAX_INVENTORY_QUANTITY,
    );
  const isWarehouseReady = Boolean(activeWarehouseId);
  const isImageReady = images.length > 0;

  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Studio Tạo Sản Phẩm & Lên Kho"
        description="Khởi tạo sản phẩm, thông số kỹ thuật, bộ ảnh và khai báo tồn kho đầu kỳ cho toàn bộ SKU chỉ trong một luồng."
      />

      {error && (
        <p role="alert" className="notice" style={{ marginBottom: 18 }}>
          {error}
        </p>
      )}
      {progressNote && (
        <p role="status" className="form-success" style={{ marginBottom: 18 }}>
          {progressNote}
        </p>
      )}

      <div className="seller-studio-layout">
        <div className="seller-studio-main">
          {/* SECTION 1: BASIC INFO */}
          <Card className="card-pad">
            <div className="seller-section-head">
              <div className="seller-section-title-group">
                <span className="seller-section-step">1</span>
                <div>
                  <h2>Thông tin cơ bản & Ngành hàng</h2>
                  <p>Tên sản phẩm rõ ràng, đúng danh mục giúp người mua dễ tìm kiếm và lọc trên sàn.</p>
                </div>
              </div>
              <Badge>{isBasicReady ? "Đã hoàn tất" : "Bắt buộc"}</Badge>
            </div>

            <div className="auth-fields">
              <label className="field-wrap">
                <span>
                  Tên sản phẩm <strong style={{ color: "#dc2626" }}>*</strong>
                </span>
                <input
                  className="field"
                  required
                  maxLength={255}
                  placeholder="Ví dụ: Đồng Hồ Cơ Orient Bambino Gen 4 Mặt Trắng Dây Da Nâu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <div className="form-grid">
                <label className="field-wrap">
                  <span>
                    Danh mục ngành hàng <strong style={{ color: "#dc2626" }}>*</strong>
                  </span>
                  <select
                    className="select-field"
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Chọn danh mục</option>
                    {categoryOptions.map((option) => (
                      <option key={option.categoryId} value={option.categoryId}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {categories.error && <small role="alert">{msg(categories.error)}</small>}
                </label>

                <label className="field-wrap">
                  <span>Thương hiệu (Brand)</span>
                  <input
                    className="field"
                    maxLength={150}
                    placeholder="Ví dụ: Orient, Seiko, Apple, Nexus Official…"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </label>
              </div>

              <label className="field-wrap">
                <span>Mô tả chi tiết sản phẩm</span>
                <textarea
                  className="textarea-field"
                  maxLength={4000}
                  placeholder="Mô tả đặc điểm nổi bật, công dụng, chính sách bảo hành và hướng dẫn sử dụng…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </div>
          </Card>

          {/* SECTION 2: IMAGES */}
          <Card className="card-pad">
            <div className="seller-section-head">
              <div className="seller-section-title-group">
                <span className="seller-section-step">2</span>
                <div>
                  <h2>Hình ảnh sản phẩm ({images.length}/5 ảnh)</h2>
                  <p>
                    Tải lên từ 1–5 ảnh (.jpg, .png, .webp, tối đa 5 MB/ảnh). Cần ít nhất 1 ảnh bìa để kích hoạt mở bán
                    ngay.
                  </p>
                </div>
              </div>
              <Badge>{isImageReady ? `Đã chọn ${images.length} ảnh` : "Cần khi Mở bán ngay"}</Badge>
            </div>

            {images.length < 5 && (
              <label className="seller-image-dropzone">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    handleSelectImages(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                <Icon name="plus" size={24} />
                <strong>Bấm để chọn ảnh sản phẩm (có thể chọn nhiều ảnh cùng lúc)</strong>
                <small>Hỗ trợ định dạng JPG, PNG, WEBP · Dung lượng tối đa 5 MB / ảnh</small>
              </label>
            )}

            {images.length > 0 && (
              <div className="seller-image-preview-grid">
                {images.map((img, index) => (
                  <div
                    key={img.id}
                    className={`seller-image-preview-card${img.isPrimary ? " is-primary" : ""}`}
                  >
                    <div className="seller-image-preview-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.previewUrl} alt={img.altText || `Ảnh ${index + 1}`} />
                      {img.isPrimary && <span className="seller-image-cover-pill">★ Ảnh bìa chính</span>}
                    </div>
                    <input
                      className="field"
                      style={{ minHeight: 34, fontSize: 12 }}
                      placeholder="Mô tả ảnh (Alt text)"
                      value={img.altText}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((item) => (item.id === img.id ? { ...item, altText: e.target.value } : item)),
                        )
                      }
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      {!img.isPrimary && (
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          style={{ flex: 1 }}
                          onClick={() => setPrimaryDraftImage(img.id)}
                        >
                          Đặt làm bìa
                        </button>
                      )}
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        style={{ flex: img.isPrimary ? 1 : undefined }}
                        onClick={() => removeDraftImage(img.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* SECTION 3: SPECIFICATIONS JSON */}
          <Card className="card-pad">
            <div className="seller-section-head">
              <div className="seller-section-title-group">
                <span className="seller-section-step">3</span>
                <div>
                  <h2>Thông số kỹ thuật (Specifications)</h2>
                  <p>Hiển thị tại bảng thông số chi tiết sản phẩm, tự động đóng gói chuẩn JSON Object.</p>
                </div>
              </div>
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => addSpecRow("")}
              >
                <Icon name="plus" size={14} /> Thêm thông số
              </button>
            </div>

            <div className="seller-preset-bar">
              <span>Gợi ý nhanh:</span>
              {SPEC_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="seller-preset-chip"
                  onClick={() => addSpecRow(preset)}
                >
                  + {preset}
                </button>
              ))}
            </div>

            <div className="seller-spec-list">
              {specs.map((row, idx) => (
                <div key={idx} className="seller-spec-row">
                  <input
                    className="field"
                    placeholder="Tên thông số (VD: Chất liệu)"
                    value={row.key}
                    onChange={(e) => updateSpecRow(idx, "key", e.target.value)}
                  />
                  <input
                    className="field"
                    placeholder="Giá trị (VD: Thép không gỉ 316L)"
                    value={row.value}
                    onChange={(e) => updateSpecRow(idx, "value", e.target.value)}
                  />
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => removeSpecRow(idx)}
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* SECTION 4: WAREHOUSE & SKU VARIANTS */}
          <Card className="card-pad">
            <div className="seller-section-head">
              <div className="seller-section-title-group">
                <span className="seller-section-step">4</span>
                <div>
                  <h2>Kho lưu trữ & Biến thể SKU ({variants.length}/10)</h2>
                  <p>
                    Mỗi biến thể được tạo sẽ tự động khai báo tồn kho đầu kỳ sang FulfillmentService (API FUL-01) và ghi
                    sổ cái INITIAL.
                  </p>
                </div>
              </div>
              {variants.length < 10 && (
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={addVariantCard}
                >
                  <Icon name="plus" size={14} /> Thêm biến thể SKU
                </button>
              )}
            </div>

            {/* Warehouse Selection Bar (WH-03 / WH-01 / WH-04) */}
            <div className="seller-warehouse-box" id="create-warehouse">
              <div className="seller-warehouse-header">
                <div>
                  <strong>Kho nhận hàng & Khai báo tồn đầu kỳ (WH-03 / FUL-01)</strong>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                    Chọn kho vật lý lưu trữ sản phẩm. Nếu chưa có kho riêng, bạn có thể dùng kho trung tâm hoặc tạo kho
                    mới ngay.
                  </div>
                </div>
                {!warehouses.data?.some((warehouse) => warehouse.type === "SellerWarehouse") && (
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => setShowCreateWarehouse((v) => !v)}
                  >
                    {showCreateWarehouse ? "Đóng tạo kho" : "+ Tạo kho riêng"}
                  </button>
                )}
              </div>

              <label className="field-wrap">
                <select
                  className="select-field"
                  value={activeWarehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                >
                  {warehouses.data?.length ? (
                    warehouses.data.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        [{wh.code}] {wh.name} {wh.sellerId === user?.id ? "· (Kho của Shop)" : "· (Kho hệ thống)"}
                        {wh.address ? ` — ${wh.address}` : ""}
                      </option>
                    ))
                  ) : (
                    <option value="">Tự động chọn kho mặc định đang hoạt động của hệ thống</option>
                  )}
                </select>
              </label>

              {showCreateWarehouse && !warehouses.data?.some((warehouse) => warehouse.type === "SellerWarehouse") && (
                <div className="seller-warehouse-create-drawer">
                  <strong style={{ fontSize: 13 }}>Đăng ký kho mới cho Gian hàng (API WH-04)</strong>
                  <div className="form-grid">
                    <label className="field-wrap">
                      Mã kho (Code)
                      <input
                        className="field"
                        placeholder="VD: WH-SHOP-HCM01"
                        value={newWhCode}
                        onChange={(e) => setNewWhCode(e.target.value)}
                      />
                    </label>
                    <label className="field-wrap">
                      Tên kho hàng
                      <input
                        className="field"
                        placeholder="VD: Kho Quận 1 - TP.HCM"
                        value={newWhName}
                        onChange={(e) => setNewWhName(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="field-wrap">
                    Địa chỉ lấy hàng
                    <input
                      className="field"
                      placeholder="VD: 122 Hoàng Văn Thụ, Phường 9, Phú Nhuận, TP.HCM"
                      value={newWhAddress}
                      onChange={(e) => setNewWhAddress(e.target.value)}
                    />
                  </label>
                  <div className="action-row" style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      className="button button-primary button-small"
                      disabled={creatingWh}
                      onClick={() => void handleQuickCreateWarehouse()}
                    >
                      {creatingWh ? "Đang tạo kho…" : "Lưu & Chọn kho này"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Variants List */}
            <div className="seller-variant-stack">
              {variants.map((variant, vIdx) => (
                <div
                  key={variant.id}
                  className={`seller-variant-card${variant.isActive ? " is-default" : ""}`}
                >
                  <div className="seller-variant-card-header">
                    <div className="seller-variant-card-title">
                      <span>Biến thể #{vIdx + 1}</span>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: variant.isActive ? "var(--sky-dark)" : "var(--muted)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="defaultVariant"
                          checked={variant.isActive}
                          onChange={() => updateVariantField(vIdx, "isActive", true)}
                        />
                        {variant.isActive ? "★ Biến thể mặc định (isActive)" : "Đặt làm mặc định"}
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {variants.length > 1 && (
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => removeVariantCard(vIdx)}
                        >
                          Xóa biến thể
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-grid">
                    <label className="field-wrap">
                      <span>
                        Mã SKU <strong style={{ color: "#dc2626" }}>*</strong>
                      </span>
                      <div className="seller-sku-input-group">
                        <input
                          className="field"
                          required
                          placeholder="Để trống sẽ tự sinh mã SKU"
                          value={variant.skuCode}
                          onChange={(e) => updateVariantField(vIdx, "skuCode", e.target.value)}
                        />
                        <button
                          type="button"
                          className="button button-secondary button-small seller-sku-generate"
                          aria-label="Tự sinh mã SKU"
                          onClick={() => updateVariantField(vIdx, "skuCode", buildAutoSku(name, variant.name, vIdx))}
                        >
                          +
                        </button>
                      </div>
                    </label>

                    <label className="field-wrap">
                      <span>
                        Tên biến thể <strong style={{ color: "#dc2626" }}>*</strong>
                      </span>
                      <input
                        className="field"
                        required
                        placeholder="VD: Dây da nâu - Mặt trắng 40mm"
                        value={variant.name}
                        onChange={(e) => updateVariantField(vIdx, "name", e.target.value)}
                      />
                    </label>

                    <label className="field-wrap">
                      <span>
                        Giá bán (VND) <strong style={{ color: "#dc2626" }}>*</strong>
                      </span>
                      <input
                        type="number"
                        min="1"
                        required
                        className="field"
                        placeholder="VD: 3400000"
                        value={variant.price}
                        onChange={(e) => updateVariantField(vIdx, "price", e.target.value)}
                      />
                    </label>

                    <label className="field-wrap">
                      <span>
                        Tồn kho đầu kỳ (Quantity) <strong style={{ color: "#dc2626" }}>*</strong>
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={MAX_INVENTORY_QUANTITY}
                        step="1"
                        required
                        className="field"
                        placeholder="Số lượng nhập kho ban đầu"
                        value={variant.quantity}
                        onChange={(e) => updateVariantField(vIdx, "quantity", e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Variant Attributes */}
                  <div className="seller-attr-list">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                        Thuộc tính phân loại của biến thể (Màu sắc, Kích cỡ, Phiên bản…)
                      </span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["Màu sắc", "Kích cỡ", "Dung lượng", "Chất liệu"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className="seller-preset-chip"
                            onClick={() => addVariantAttribute(vIdx, preset)}
                          >
                            + {preset}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="seller-preset-chip"
                          onClick={() => addVariantAttribute(vIdx)}
                        >
                          + Thuộc tính
                        </button>
                      </div>
                    </div>

                    {variant.attributes.map((attr, aIdx) => (
                      <div key={aIdx} className="seller-attr-row">
                        <input
                          className="field"
                          placeholder="Tên thuộc tính (VD: Màu sắc)"
                          value={attr.attrName}
                          onChange={(e) => updateVariantAttribute(vIdx, aIdx, "attrName", e.target.value)}
                        />
                        <input
                          className="field"
                          placeholder="Giá trị (VD: Xanh Navy)"
                          value={attr.attrValue}
                          onChange={(e) => updateVariantAttribute(vIdx, aIdx, "attrValue", e.target.value)}
                        />
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => removeVariantAttribute(vIdx, aIdx)}
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* STICKY RIGHT RAIL: LIVE PREVIEW & READINESS CHECKLIST */}
        <aside className="seller-studio-rail">
          <Card className="card-pad">
            <SectionHeading title="Xem trước" />
            <div className="seller-preview-card">
              <div className="seller-preview-media">
                {primaryPreviewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={primaryPreviewImage.previewUrl} alt={name || "Preview"} />
                ) : (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>Chưa chọn ảnh bìa</span>
                )}
              </div>
              <div className="seller-preview-body">
                <span className="seller-preview-brand">
                  {brand.trim() || selectedCategory?.label || "NEXUS MERCHANT"}
                </span>
                <h3 className="seller-preview-title">{name.trim() || "Tên sản phẩm sẽ hiển thị tại đây"}</h3>
                <div className="seller-preview-price">
                  {minPreviewPrice !== null
                    ? minPreviewPrice === maxPreviewPrice
                      ? formatMoney(minPreviewPrice)
                      : `${formatMoney(minPreviewPrice)} – ${formatMoney(maxPreviewPrice)}`
                    : "Chưa nhập giá"}
                </div>
                <div className="seller-preview-meta">
                  <span>{variants.length} biến thể SKU</span>
                  <strong>Tổng tồn: {totalInitialStock} sp</strong>
                </div>
              </div>
            </div>

            <ul className="seller-checklist">
              <li>
                <span className={`seller-check-indicator${isBasicReady ? " is-ready" : ""}`}>
                  {isBasicReady ? "✓" : "1"}
                </span>
                <span>
                  <strong>Thông tin & Danh mục:</strong>{" "}
                  {isBasicReady ? selectedCategory?.label : "Cần nhập tên & chọn danh mục"}
                </span>
              </li>
              <li>
                <span className={`seller-check-indicator${isVariantsReady ? " is-ready" : ""}`}>
                  {isVariantsReady ? "✓" : "2"}
                </span>
                <span>
                  <strong>Biến thể & Giá bán:</strong>{" "}
                  {isVariantsReady
                    ? `${variants.length} SKU hợp lệ · Tổng ${totalInitialStock} sản phẩm`
                    : "Nhập giá > 0 và số lượng tồn >= 0"}
                </span>
              </li>
              <li>
                <span className={`seller-check-indicator${isWarehouseReady ? " is-ready" : ""}`}>
                  {isWarehouseReady ? "✓" : "3"}
                </span>
                <span>
                  <strong>Kho lưu trữ (FUL-01):</strong>{" "}
                  {selectedWarehouse ? `${selectedWarehouse.code} (${selectedWarehouse.name})` : "Kho mặc định hệ thống"}
                </span>
              </li>
              <li>
                <span className={`seller-check-indicator${isImageReady ? " is-ready" : ""}`}>
                  {isImageReady ? "✓" : "!"}
                </span>
                <span>
                  <strong>Ảnh đại diện mở bán:</strong>{" "}
                  {isImageReady
                    ? `Đã sẵn sàng ${images.length} ảnh sản phẩm`
                    : "Cần ít nhất 1 ảnh nếu muốn Mở bán ngay"}
                </span>
              </li>
            </ul>

            <div className="seller-studio-actions">
              <button
                type="button"
                className="button button-primary"
                disabled={busy || !isBasicReady || !isVariantsReady}
                onClick={() => void submitProduct(true)}
              >
                {busy ? "Đang xử lý lên kho & lên kệ…" : "Đăng bán & Lên kho ngay (ACTIVE)"}
              </button>

              <button
                type="button"
                className="button button-secondary"
                disabled={busy || !isBasicReady || !isVariantsReady}
                onClick={() => void submitProduct(false)}
              >
                {busy ? "Đang lưu…" : "Lưu bản nháp & Khai báo kho (DRAFT)"}
              </button>

              <ButtonLink href={ROUTES.seller.products} variant="secondary">
                Quay lại danh sách
              </ButtonLink>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

export function SellerInventoryScreen() {
  const { user } = useSession();
  const warehouses = useApiResource(
    user?.id ? `seller-inv-warehouses:${user.id}` : "seller-inv-warehouses:anon",
    (signal) => sellerCatalogService.listWarehouses(user?.id, signal),
  );
  const personalWarehouses = warehouses.data?.filter((warehouse) => warehouse.type === "SellerWarehouse") ?? [];
  const platformWarehouses = warehouses.data?.filter((warehouse) => warehouse.type === "PlatformWarehouse") ?? [];
  const [warehouseId, setWarehouseId] = useState("");
  const activeWarehouseId = warehouses.data?.some((warehouse) => warehouse.id === warehouseId)
    ? warehouseId
    : (warehouses.data?.[0]?.id ?? "");
  const products = useApiResource(
    activeWarehouseId ? `seller-inventory-products:${user?.id}:${activeWarehouseId}` : null,
    (signal) => sellerCatalogService.listProductsInWarehouse(activeWarehouseId, signal),
  );

  const [productId, setProductId] = useState("");
  const activeProductId = products.data?.some((product) => product.productId === productId)
    ? productId
    : (products.data?.[0]?.productId ?? "");
  const detail = useApiResource(
    activeProductId ? `seller-inventory-product:${activeProductId}` : null,
    (signal) => sellerCatalogService.detail(activeProductId, signal),
  );
  const [skuId, setSkuId] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, { name: string; price: string; totalQuantity: string }>>({});
  const [savingVariantId, setSavingVariantId] = useState<string | null>(null);
  const [detailsMessage, setDetailsMessage] = useState("");
  const [detailsError, setDetailsError] = useState("");

  const variantIdsKey = detail.data?.variants.map((v) => v.variantId).join(",") ?? "";
  const batchBalances = useApiResource(
    variantIdsKey ? `seller-inventory-batch:${variantIdsKey}` : null,
    (signal) => sellerCatalogService.inventoryBatch(detail.data?.variants.map((v) => v.variantId) ?? [], signal),
  );

  const balanceMap = new Map<string, InventoryBalance[]>();
  for (const item of batchBalances.data ?? []) {
    balanceMap.set(item.skuId, [...(balanceMap.get(item.skuId) ?? []), item]);
  }
  const visibleVariants = detail.data?.variants.filter((variant) =>
    balanceMap.get(variant.variantId)?.some((balance) => balance.warehouseId === activeWarehouseId),
  ) ?? [];
  const activeSkuId = visibleVariants.some((variant) => variant.variantId === skuId)
    ? skuId
    : (visibleVariants[0]?.variantId ?? "");
  const warehouseName = (warehouseId: string) => {
    const warehouse = warehouses.data?.find((item) => item.id === warehouseId);
    return warehouse ? `[${warehouse.code}] ${warehouse.name}` : `Kho ${warehouseId}`;
  };

  useEffect(() => {
    if (!detailsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [detailsOpen]);

  function openProductDetails(variant: ProductVariant) {
    setSkuId(variant.variantId);
    setDetailsError("");
    setDetailsMessage("");
    const inventory = balanceMap.get(variant.variantId)?.find((balance) => balance.warehouseId === activeWarehouseId);
    setVariantDrafts({
      [variant.variantId]: {
        name: variant.name,
        price: String(variant.price ?? ""),
        totalQuantity: String(inventory?.totalQuantity ?? ""),
      },
    });
    setDetailsOpen(true);
  }

  async function saveVariantDetails(variant: ProductVariant) {
    const draft = variantDrafts[variant.variantId];
    const inventories = balanceMap.get(variant.variantId) ?? [];
    if (!draft) {
      setDetailsError("Không có thay đổi để lưu.");
      return;
    }

    const nextPrice = Number(draft.price);
    if (!draft.name.trim() || !Number.isFinite(nextPrice) || nextPrice <= 0) {
      setDetailsError("Tên biến thể và giá bán phải hợp lệ; giá bán phải lớn hơn 0.");
      return;
    }

    const variantChanged = draft.name.trim() !== variant.name || nextPrice !== Number(variant.price);
    if (!variantChanged) {
      setDetailsError("Chưa có thay đổi tên hoặc giá bán để lưu.");
      return;
    }
    setSavingVariantId(variant.variantId);
    setDetailsError("");
    setDetailsMessage("");
    try {
      await sellerCatalogService.updateVariant(variant.variantId, {
          name: draft.name.trim(),
          price: nextPrice,
          currency: variant.currency || "VND",
          attributes: variant.attributes,
      });
      detail.reload();
      batchBalances.reload();
      setVariantDrafts((current) => ({
        ...current,
        [variant.variantId]: {
          name: draft.name.trim(),
          price: String(nextPrice),
          totalQuantity: inventories[0] ? String(inventories[0].totalQuantity) : "",
        },
      }));
      setDetailsMessage("Đã lưu tên biến thể và giá bán.");
    } catch (cause) {
      detail.reload();
      batchBalances.reload();
      const failure = cause instanceof Error ? cause.message : "Không lưu được thay đổi.";
      setDetailsError(failure);
    } finally {
      setSavingVariantId(null);
    }
  }

  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Quản lý kho"
        description="Tra cứu tổng tồn, có thể bán và đang giữ theo từng SKU từ Fulfillment."
      />

      {/* Warehouse Bar */}
      <Card className="card-pad seller-inventory-warehouse-bar" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>Kho hàng đang liên kết</h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              Kho riêng của seller: {personalWarehouses.length} · Kho chung nền tảng: {platformWarehouses.length}
            </p>
          </div>
          <div className="action-row">
            {personalWarehouses.length ? (
              <button type="button" className="button button-disabled" disabled title="Mỗi seller chỉ có một kho riêng">Tạo kho riêng</button>
            ) : (
              <ButtonLink href={`${ROUTES.seller.newProduct}#create-warehouse`}>Tạo kho riêng</ButtonLink>
            )}
          </div>
        </div>

        {warehouses.data?.length ? (
          <div className="grid-2" style={{ marginTop: 14 }}>
            {warehouses.data.map((wh) => (
              <button
                key={wh.id}
                type="button"
                className={`mini-item seller-warehouse-choice${activeWarehouseId === wh.id ? " is-selected" : ""}`}
                aria-pressed={activeWarehouseId === wh.id}
                onClick={() => { setWarehouseId(wh.id); setProductId(""); setSkuId(""); setDetailsOpen(false); }}
              >
                <div>
                  <strong>
                    [{wh.code}] {wh.name}
                  </strong>
                  <p>{wh.address || "Kho tiêu chuẩn trên hệ thống Fulfillment"}</p>
                </div>
                <Badge>{wh.type === "PlatformWarehouse" ? "Kho chung nền tảng" : "Kho riêng của seller"}</Badge>
              </button>
            ))}
          </div>
        ) : (
          <p className="status-note">{warehouses.loading ? "Đang tải danh sách kho…" : warehouses.error ? `Không tải được danh sách kho: ${warehouses.error.message}` : "Chưa có kho nào khả dụng."}</p>
        )}
      </Card>

      {/* Product & Variant Selector */}
      <Card className="card-pad seller-inventory-selector" style={{ marginBottom: 20 }}>
        <SectionHeading title="Chọn Sản phẩm & Biến thể SKU" />
        <div className="form-grid">
          <label className="field-wrap">
            Sản phẩm
            <select
              className="select-field"
              value={activeProductId}
              onChange={(event) => {
                setProductId(event.target.value);
                setSkuId("");
              }}
            >
              <option value="">Chọn sản phẩm</option>
              {products.data?.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.name} ({item.status})
                </option>
              ))}
            </select>
          </label>
          <label className="field-wrap">
            Biến thể (SKU)
            <select
              className="select-field"
              value={activeSkuId}
              onChange={(event) => {
                setSkuId(event.target.value);
              }}
              disabled={!detail.data}
            >
              <option value="">Chọn biến thể SKU</option>
              {visibleVariants.map((variant) => (
                <option key={variant.variantId} value={variant.variantId}>
                  {variant.skuCode} · {variant.name} ({formatMoney(variant.price)})
                </option>
              ))}
            </select>
          </label>
        </div>

        {products.loading && <p className="status-note">Đang tìm sản phẩm của bạn trong kho đã chọn…</p>}
        {products.error && <p className="notice" role="alert">Không tải được sản phẩm trong kho: {products.error.message}</p>}
        {products.data?.length === 0 && <p className="status-note">Bạn chưa có sản phẩm nào trong kho này.</p>}

        {/* Batch overview of all variants in the selected product */}
        {detail.data && visibleVariants.length > 0 && (
          <div className="table-scroll" style={{ marginTop: 18 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên biến thể</th>
                    <th>Kho</th>
                  <th>Giá bán</th>
                  <th>Tổng tồn (Total)</th>
                  <th>Khả dụng (Available)</th>
                  <th>Đang giữ (Reserved)</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleVariants.flatMap((v) => {
                  const inventories = (balanceMap.get(v.variantId) ?? []).filter((balance) => balance.warehouseId === activeWarehouseId);
                  const isSelected = v.variantId === activeSkuId;
                  return (inventories.length ? inventories : [null]).map((inv) => (
                    <tr
                      key={`${v.variantId}:${inv?.warehouseId ?? "empty"}`}
                      style={isSelected ? { background: "#f0f9ff" } : undefined}
                    >
                      <td>
                        <strong>{v.skuCode}</strong>
                      </td>
                      <td>{v.name}</td>
                      <td>{inv ? warehouseName(inv.warehouseId) : "Chưa có kho"}</td>
                      <td>{formatMoney(v.price)}</td>
                      <td>
                        <strong>{inv ? inv.totalQuantity : "—"}</strong>
                      </td>
                      <td style={{ color: "#059669", fontWeight: 700 }}>
                        {inv ? inv.availableQuantity : "—"}
                      </td>
                      <td style={{ color: "#b45309", fontWeight: 700 }}>
                        {inv ? inv.reservedQuantity : "—"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`button button-small ${isSelected ? "button-primary" : "button-secondary"}`}
                          disabled={batchBalances.loading}
                          onClick={() => openProductDetails(v)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detailsOpen && detail.data && (
        <div
          className="seller-inventory-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsOpen(false);
          }}
        >
          <section
            className="seller-inventory-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-inventory-modal-title"
          >
            <header className="seller-inventory-modal-header">
              <div>
                <h2 id="seller-inventory-modal-title">Chi tiết sản phẩm & tồn kho</h2>
                <p>{detail.data.name}</p>
              </div>
              <button
                type="button"
                className="seller-inventory-modal-close"
                aria-label="Đóng chi tiết"
                onClick={() => setDetailsOpen(false)}
              >
                ×
              </button>
            </header>

            <p className="seller-inventory-modal-help">
              Bạn có thể sửa tên và giá bán. Tồn kho được hiển thị riêng theo từng kho; điều chỉnh tồn cần API chỉ rõ kho.
            </p>

            {detailsError && <p className="notice" role="alert">{detailsError}</p>}
            {detailsMessage && <p className="form-success" role="status">{detailsMessage}</p>}

            <div className="table-scroll seller-inventory-modal-table-scroll">
              <table className="data-table seller-inventory-modal-table">
                <thead>
                  <tr>
                    <th>Tên biến thể</th>
                  <th>Kho</th>
                    <th>Giá bán</th>
                    <th>Tổng tồn (Total)</th>
                    <th>Khả dụng (Available)</th>
                    <th>Đang giữ (Reserved)</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVariants.filter((variant) => variant.variantId === activeSkuId).map((variant) => {
                    const draft = variantDrafts[variant.variantId];
                    const inventories = (balanceMap.get(variant.variantId) ?? []).filter((balance) => balance.warehouseId === activeWarehouseId);
                    const isSelected = variant.variantId === activeSkuId;
                    const hasChanges = Boolean(draft && (
                      draft.name.trim() !== variant.name ||
                      Number(draft.price) !== Number(variant.price)
                    ));
                    return (
                      <tr key={variant.variantId} className={isSelected ? "is-selected" : undefined}>
                        <td>
                          <label className="seller-inventory-modal-name">
                            <span>{variant.skuCode}</span>
                            <input
                              className="field"
                              value={draft?.name ?? variant.name}
                              aria-label={`Tên biến thể ${variant.skuCode}`}
                              onChange={(event) => setVariantDrafts((current) => ({
                                ...current,
                                [variant.variantId]: { ...current[variant.variantId], name: event.target.value },
                              }))}
                            />
                          </label>
                        </td>
                        <td>{inventories.length ? inventories.map((item) => <div key={item.warehouseId}>{warehouseName(item.warehouseId)}</div>) : "Chưa có kho"}</td>
                        <td>
                          <input
                            className="field seller-inventory-modal-number"
                            type="number"
                            min="1"
                            step="1"
                            value={draft?.price ?? String(variant.price ?? "")}
                            aria-label={`Giá bán ${variant.skuCode}`}
                            onChange={(event) => setVariantDrafts((current) => ({
                              ...current,
                              [variant.variantId]: { ...current[variant.variantId], price: event.target.value },
                            }))}
                          />
                        </td>
                        <td className="seller-inventory-modal-readonly">{inventories.length ? inventories.map((item) => <div key={item.warehouseId}>{item.totalQuantity.toLocaleString("vi-VN")}</div>) : "—"}</td>
                        <td className="seller-inventory-modal-readonly">
                          {inventories.length ? inventories.map((item) => <div key={item.warehouseId}>{item.availableQuantity.toLocaleString("vi-VN")}</div>) : "—"}
                        </td>
                        <td className="seller-inventory-modal-readonly">
                          {inventories.length ? inventories.map((item) => <div key={item.warehouseId}>{item.reservedQuantity.toLocaleString("vi-VN")}</div>) : "—"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button button-primary button-small"
                            disabled={savingVariantId === variant.variantId || !hasChanges}
                            onClick={() => void saveVariantDetails(variant)}
                          >
                            {savingVariantId === variant.variantId ? "Đang lưu…" : "Lưu"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="seller-inventory-modal-footer">
              <button type="button" className="button button-secondary" onClick={() => setDetailsOpen(false)}>
                Đóng
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

export function SellerShipmentsScreen() {
  const [orderId, setOrderId] = useState("");
  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Vận đơn & giao nhận"
        description="Tra cứu vận đơn theo mã đơn hàng qua Fulfillment API."
      />
      <Card className="card-pad">
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            if (orderId.trim()) window.location.assign(ROUTES.seller.shipment(orderId.trim()));
          }}
        >
          <label className="field-wrap">
            Mã đơn hàng
            <input
              className="field"
              required
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="UUID đơn hàng"
            />
          </label>
          <button className="button button-secondary">Tra cứu vận đơn</button>
        </form>
        <p className="status-note">
          Fulfillment chưa có API danh sách vận đơn theo Seller. Bạn có thể tra cứu bằng mã đơn hàng đã biết.
        </p>
      </Card>
      <Card className="card-pad">
        <h2>Tạo vận đơn GHN</h2>
        <p>Đơn hàng có thể tạo vận đơn sau khi Seller chấp nhận. Tạo vận đơn tạm chưa mở trong bản demo này.</p>
        <button className="button button-disabled" disabled>
          Tạo vận đơn
        </button>
      </Card>
    </>
  );
}

type SellerSubOrderItem = {
  itemId: string;
  productId: string;
  skuId: string;
  productName: string;
  skuCode?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type SellerSubOrder = {
  subOrderId: string;
  subOrderNo: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  shopName: string;
  status: string;
  paymentMethod: string;
  shippingAddress: {
    receiverName: string;
    receiverPhone: string;
    street: string;
    ward: string;
    district: string;
    province: string;
    fullAddress?: string | null;
  };
  contactPhone: string;
  itemsAmount: number;
  shippingFeeAmount: number;
  totalAmount: number;
  createdAt: string;
  items: SellerSubOrderItem[];
};

type SellerSubOrderSummary = Pick<
  SellerSubOrder,
  "subOrderId" | "subOrderNo" | "orderId" | "buyerId" | "sellerId" | "status" | "paymentMethod" |
  "itemsAmount" | "shippingFeeAmount" | "totalAmount" | "createdAt"
> & { itemCount: number };

type SellerPaged<T> = {
  items: T[];
  pagination: { pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasNextPage: boolean };
};

function describeSellerOrderStatus(status: string): string {
  const key = status.replace(/[^a-z]/gi, "").toUpperCase();
  return (
    (
      {
        PENDINGPAYMENT: "Chờ thanh toán",
        PAID: "Đã thanh toán · Chờ bạn xác nhận",
        CONFIRMED: "Đã xác nhận · Đã khởi tạo đơn hàng",
        SELLERACCEPTED: "Đã xác nhận · Đã khởi tạo đơn hàng",
        SHIPPING: "Đang giao hàng",
        SHIPPED: "Đang giao hàng",
        DELIVERED: "Đã giao · Chờ người mua xác nhận",
        COMPLETED: "Hoàn tất · Đã cộng tiền vào ví",
        SELLERREJECTED: "Đã từ chối · Đã hoàn tiền cho người mua",
        CANCELLED: "Đã hủy",
      } as Record<string, string>
    )[key] ?? status
  );
}

function sellerOrderStatusTone(status: string): "sky" | "amber" | "green" | "red" {
  const key = status.replace(/[^a-z]/gi, "").toUpperCase();
  if (key === "CONFIRMED" || key === "SELLERACCEPTED") return "amber";
  if (key === "COMPLETED") return "green";
  if (key === "CANCELLED" || key === "SELLERREJECTED") return "red";
  return "sky";
}

export function SellerOrdersScreen() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const resource = useApiResource(
    `seller-sub-orders:${page}:${pageSize}:${statusFilter}`,
    (signal) =>
      sellerOrdersService.list<SellerPaged<SellerSubOrderSummary>>(page, signal, pageSize, statusFilter || undefined),
  );

  async function acceptOrder(sub: SellerSubOrderSummary) {
    setBusyId(sub.subOrderId);
    setFeedback("");
    setActionError("");
    try {
      await sellerOrdersService.accept(sub.orderId, sub.subOrderId);
      setFeedback(
        `Đã chấp nhận đơn ${sub.subOrderNo}. Thông tin vận đơn sẽ cập nhật khi có dữ liệu từ hệ thống giao nhận.`,
      );
      resource.reload();
    } catch (reason) {
      setActionError(msg(reason as Error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Đơn cần xử lý"
        description="Các đơn hàng người mua đã thanh toán bằng Ví Nexus và chuyển tới gian hàng của bạn."
      />
      {(resource.error || actionError) && (
        <p role="alert" className="notice">
          {actionError || msg(resource.error)}
        </p>
      )}
      {feedback && (
        <p role="status" className="form-success">
          {feedback}
        </p>
      )}
      <div className="seller-orders-filter">
        <label className="field-wrap">
          Trạng thái đơn
          <select className="select-field" value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }}>
            <option value="">Tất cả trạng thái</option>
            <option value="Paid">Chờ xác nhận</option>
            <option value="Confirmed">Đã xác nhận</option>
            <option value="Shipped">Đang giao hàng</option>
            <option value="Delivered">Đã giao</option>
            <option value="Completed">Hoàn tất</option>
            <option value="Cancelled">Đã hủy</option>
            <option value="Refunded">Đã hoàn tiền</option>
          </select>
        </label>
      </div>
      <Card className="card-pad seller-orders-card">
        {resource.data?.items.length ? (
          <div className="table-scroll seller-orders-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã đơn gian hàng</th>
                  <th>Mã người mua</th>
                  <th>Mặt hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((sub) => {
                  const normalizedStatus = sub.status.replace(/[^a-z]/gi, "").toUpperCase();
                  const canAccept = ["PAID", "PENDINGCONFIRMATION"].includes(normalizedStatus);
                  return (
                    <tr key={sub.subOrderId}>
                      <td>
                        <Link href={ROUTES.seller.order(sub.subOrderId)}>
                          <strong>{sub.subOrderNo}</strong>
                        </Link>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          {new Date(sub.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </td>
                      <td>
                        <strong>{sub.buyerId}</strong>
                      </td>
                      <td>{sub.itemCount} mặt hàng</td>
                      <td>
                        <strong>{formatMoney(sub.totalAmount)}</strong>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          Ship: {formatMoney(sub.shippingFeeAmount)}
                        </div>
                      </td>
                      <td>
                        <Badge tone={sellerOrderStatusTone(sub.status)}>
                          {describeSellerOrderStatus(sub.status)}
                        </Badge>
                      </td>
                      <td>
                        <div className="action-row seller-orders-actions">
                          {canAccept && (
                            <button
                              type="button"
                              className="button button-primary"
                              disabled={busyId === sub.subOrderId}
                              onClick={() => void acceptOrder(sub)}
                            >
                              {busyId === sub.subOrderId ? "Đang xác nhận…" : "Chấp nhận đơn"}
                            </button>
                          )}
                          <ButtonLink href={ROUTES.seller.order(sub.subOrderId)} variant="secondary">
                            Chi tiết
                          </ButtonLink>
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
              resource.loading
                ? "Đang tải danh sách đơn bán…"
                : resource.error
                  ? "Không tải được danh sách đơn bán"
                  : statusFilter ? "Không có đơn ở trạng thái đã chọn" : "Chưa có đơn hàng nào được chuyển đến shop"
            }
          />
        )}
        {resource.data && (
          <div className="seller-products-pagination seller-orders-pagination">
            <label className="seller-products-page-size">
              <span>Hiển thị</span>
              <select
                className="field"
                aria-label="Số đơn mỗi trang"
                value={pageSize}
                onChange={(event) => {
                  setPage(1);
                  setPageSize(Number(event.target.value));
                }}
              >
                {[10, 30, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button button-secondary"
              disabled={page <= 1 || resource.loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Trang trước
            </button>
            <span>
              Trang {page}/{resource.data.pagination.totalPages}
            </span>
            <button
              type="button"
              className="button button-secondary"
              disabled={!resource.data.pagination.hasNextPage || resource.loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau
            </button>
          </div>
        )}
      </Card>
    </>
  );
}

export function SellerOrderDetailScreen() {
  const params = useParams<{ id: string }>();
  const subOrderId = String(params.id ?? "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const resource = useApiResource(
    subOrderId ? `seller-sub-order-detail:${subOrderId}` : null,
    (signal) =>
      sellerOrdersService.detail<SellerSubOrder>(subOrderId, signal),
  );

  const sub = resource.data;
  const canAccept = Boolean(sub && ["PAID", "PENDINGCONFIRMATION"].includes(sub.status.replace(/[^a-z]/gi, "").toUpperCase()));

  async function handleAccept() {
    if (!sub) return;
    setBusy(true);
    setFeedback("");
    setActionError("");
    try {
      await sellerOrdersService.accept(sub.orderId, sub.subOrderId);
      setFeedback(
        "Đã chấp nhận đơn hàng. Vận đơn sẽ cập nhật khi hệ thống giao nhận tạo thành công.",
      );
      resource.reload();
    } catch (reason) {
      setActionError(msg(reason as Error));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!sub) return;
    setBusy(true);
    setFeedback("");
    setActionError("");
    try {
      await sellerOrdersService.reject(sub.orderId, sub.subOrderId, "Gian hàng tạm hết tồn kho cho đơn hàng này.");
      setFeedback(
        "Đã từ chối đơn hàng. Vui lòng kiểm tra trạng thái hoàn tiền trên ví của người mua.",
      );
      resource.reload();
    } catch (reason) {
      setActionError(msg(reason as Error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title={sub ? `Chi tiết đơn bán ${sub.subOrderNo}` : "Chi tiết đơn bán"}
        description="Xác nhận đơn hàng để khởi tạo vận đơn và thông báo cho người mua."
      />
      {(resource.error || actionError) && (
        <p role="alert" className="notice">
          {actionError || msg(resource.error)}
        </p>
      )}
      {feedback && (
        <p role="status" className="form-success">
          {feedback}
        </p>
      )}
      <Card className="card-pad seller-order-detail-card">
        {sub ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <h2 style={{ margin: 0 }}>Đơn hàng {sub.subOrderNo}</h2>
              <Badge tone={sellerOrderStatusTone(sub.status)}>{describeSellerOrderStatus(sub.status)}</Badge>
            </div>
            <div className="seller-order-detail-columns">
              <div className="seller-order-detail-main">
            <div className="seller-order-detail-facts">
            <div className="info-row">
              <span>Phương thức thanh toán</span>
              <strong>Ví Nexus ({sub.paymentMethod})</strong>
            </div>
            <div className="info-row">
              <span>Người nhận</span>
              <strong>
                {sub.shippingAddress?.receiverName} · {sub.contactPhone}
              </strong>
            </div>
            <div className="info-row">
              <span>Địa chỉ giao hàng</span>
              <strong>
                {sub.shippingAddress?.fullAddress ||
                  `${sub.shippingAddress?.street}, ${sub.shippingAddress?.ward}, ${sub.shippingAddress?.province}`}
              </strong>
            </div>
            </div>
            <div className="table-scroll seller-order-detail-items">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.items.map((item) => (
                    <tr key={item.itemId}>
                      <td>
                        <strong>{item.productName}</strong>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.unitPrice)}</td>
                      <td>
                        <strong>{formatMoney(item.lineTotal)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </div>
              <aside className="seller-order-detail-side">
            <h3>Tổng kết đơn hàng</h3>
            <div className="info-row">
              <span>Tiền hàng</span>
              <strong>{formatMoney(sub.itemsAmount)}</strong>
            </div>
            <div className="info-row">
              <span>Phí giao hàng</span>
              <strong>{formatMoney(sub.shippingFeeAmount)}</strong>
            </div>
            <div className="info-row">
              <span>Tổng tiền đơn hàng</span>
              <strong style={{ color: "var(--sky-dark)" }}>{formatMoney(sub.totalAmount)}</strong>
            </div>
            <div className="action-row" style={{ marginTop: 18 }}>
              {canAccept && (
                <>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={busy}
                    onClick={() => void handleAccept()}
                  >
                    {busy ? "Đang xử lý…" : "Chấp nhận đơn"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() => void handleReject()}
                  >
                    Từ chối đơn
                  </button>
                </>
              )}
              <ButtonLink href={ROUTES.seller.orders} variant="secondary">
                Quay lại đơn hàng
              </ButtonLink>
            </div>
              </aside>
            </div>
          </>
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải chi tiết đơn bán…"
                : resource.error
                  ? "Không tải được chi tiết đơn bán"
                  : "Không tìm thấy đơn bán"
            }
          />
        )}
      </Card>
    </>
  );
}

export function SellerShipmentDetailScreen() {
  const params = useParams<{ id: string }>();
  const orderId = String(params.id ?? "");
  const resource = useApiResource(
    orderId ? `seller-shipment-order:${orderId}` : null,
    (signal) => fulfillmentService.getShipmentByOrderId(orderId, signal),
  );
  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Theo dõi vận đơn"
        description="Trạng thái giao nhận của đơn hàng từ Fulfillment API."
      />
      {resource.error && (
        <p className="notice" role="alert">
          {msg(resource.error)}
        </p>
      )}
      <Card className="card-pad">
        {resource.data ? (
          <>
            <div className="info-row">
              <span>Mã đơn hàng</span>
              <strong className="seller-wrap-value">{resource.data.orderId}</strong>
            </div>
            <div className="info-row">
              <span>Mã vận đơn</span>
              <strong>{resource.data.trackingNumber ?? "Chưa cấp"}</strong>
            </div>
            <div className="info-row">
              <span>Trạng thái</span>
              <Badge>{resource.data.status}</Badge>
            </div>
            <div className="info-row">
              <span>Người nhận</span>
              <strong>{resource.data.receiverName}</strong>
            </div>
            <div className="info-row">
              <span>Số điện thoại</span>
              <strong>{resource.data.receiverPhone}</strong>
            </div>
            <div className="info-row">
              <span>Địa chỉ</span>
              <strong className="seller-wrap-value">{resource.data.receiverAddress}</strong>
            </div>
          </>
        ) : (
          <NoData
            title={
              resource.loading
                ? "Đang tải vận đơn…"
                : resource.error
                  ? "Không tải được vận đơn"
                  : "Không có dữ liệu vận đơn"
            }
          />
        )}
      </Card>
      <p className="status-note">
        Fulfillment hiện chỉ cung cấp tra cứu theo mã đơn hàng hoặc mã theo dõi; chưa có API tạo vận đơn cho Seller.
      </p>
    </>
  );
}

export function SellerShopScreen() {
  const { user } = useSession();
  const shop = useApiResource("/api/v1/sellers/profile", async () =>
    unwrap(await api.get<ApiResponse<Obj>>("/api/v1/sellers/profile")),
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError("");
    setSaved("");
    setBusy(true);
    try {
      await api.patch("/api/v1/sellers/profile", {
        shopName: String(values.get("shopName") ?? ""),
        hotline: String(values.get("hotline") ?? ""),
        description: String(values.get("description") ?? ""),
        pickupAddress: String(values.get("streetAddress") ?? ""),
        provinceId: Number(values.get("provinceId")),
        districtId: Number(values.get("districtId")),
        wardCode: String(values.get("wardCode") ?? ""),
      });
      setSaved("Đã cập nhật hồ sơ gian hàng.");
      shop.reload();
    } catch (reason) {
      setError(msg(reason as Error));
    } finally {
      setBusy(false);
    }
  }

  const draft = loadSafeRegistrationDraft(user?.id);
  const data = shop.data ?? {};
  const address =
    typeof data.pickupAddress === "object" && data.pickupAddress !== null
      ? (data.pickupAddress as Obj)
      : typeof data.warehouseAddress === "object" && data.warehouseAddress !== null
        ? (data.warehouseAddress as Obj)
        : {};

  const resolvedShopName = String(data.shopName ?? draft?.shopName ?? "");
  const resolvedHotline = String(data.hotline ?? draft?.hotline ?? "");
  const resolvedProvinceId = String(address.provinceId ?? data.provinceId ?? draft?.warehouseAddress.provinceId ?? "");
  const resolvedDistrictId = String(address.districtId ?? data.districtId ?? draft?.warehouseAddress.districtId ?? "");
  const resolvedWardCode = String(address.wardCode ?? data.wardCode ?? draft?.warehouseAddress.wardCode ?? "");
  const resolvedStreetAddress = String(
    address.streetAddress ??
      (typeof data.pickupAddress === "string" ? data.pickupAddress : "") ??
      draft?.warehouseAddress.streetAddress ??
      "",
  );

  return (
    <>
      <PageHeading
        overline="Kênh người bán"
        title="Hồ sơ gian hàng"
      />
      {shop.error && (
        <p role="alert" className="notice">
          {msg(shop.error)}
        </p>
      )}

      <div className="seller-shop-columns">
        <Card className="card-pad seller-shop-summary">
          <h2>Thông tin đã lưu</h2>
          <dl className="seller-shop-facts">
            <div><dt>Tên gian hàng</dt><dd>{resolvedShopName || "—"}</dd></div>
            <div><dt>Hotline</dt><dd>{resolvedHotline || "—"}</dd></div>
            <div><dt>Địa chỉ lấy hàng</dt><dd>{resolvedStreetAddress || "—"}</dd></div>
          </dl>
        </Card>

        <Card className="card-pad seller-shop-editor">
        <h2>Chỉnh sửa gian hàng</h2>
        <form
          className="auth-fields"
          key={JSON.stringify([
            resolvedShopName,
            resolvedHotline,
            resolvedProvinceId,
            resolvedDistrictId,
            resolvedWardCode,
            resolvedStreetAddress,
          ])}
          onSubmit={(e) => void submit(e)}
        >
          <label className="field-wrap">
            Tên gian hàng
            <input className="field" name="shopName" required defaultValue={resolvedShopName} />
          </label>
          <label className="field-wrap">
            Hotline
            <input className="field" name="hotline" required defaultValue={resolvedHotline} />
          </label>
          <label className="field-wrap">
            Mô tả
            <textarea className="textarea-field" name="description" defaultValue={String(data.description ?? "")} />
          </label>
          <h3>Địa chỉ lấy hàng (Mã GHN)</h3>
          <div className="form-grid">
            <label className="field-wrap">
              Mã tỉnh (provinceId)
              <input className="field" name="provinceId" type="number" required defaultValue={resolvedProvinceId} />
            </label>
            <label className="field-wrap">
              Mã quận/huyện (districtId)
              <input className="field" name="districtId" type="number" required defaultValue={resolvedDistrictId} />
            </label>
            <label className="field-wrap">
              Mã phường (wardCode)
              <input className="field" name="wardCode" required defaultValue={resolvedWardCode} />
            </label>
            <label className="field-wrap">
              Địa chỉ cụ thể (streetAddress)
              <input className="field" name="streetAddress" required defaultValue={resolvedStreetAddress} />
            </label>
          </div>
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          <button className="button button-primary" disabled={busy || shop.loading}>
            {busy ? "Đang lưu…" : "Lưu hồ sơ shop"}
          </button>
        </form>
        </Card>
      </div>
      {saved && (
        <div className="app-notification" role="status" aria-live="polite" aria-atomic="true">
          <span className="app-notification-mark" aria-hidden="true">✓</span>
          <span className="app-notification-message">{saved}</span>
          <button type="button" className="app-notification-close" aria-label="Đóng thông báo" onClick={() => setSaved("")}>×</button>
        </div>
      )}
    </>
  );
}
