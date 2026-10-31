import { ApiError, api, type ApiResponse } from "@/lib/api/client";
import type { SellerBlockerInfo } from "./seller.service";

export type ProductStatusCode = "DRAFT" | "ACTIVE" | "INACTIVE";
export type SaleTypeCode = "REGULAR" | "AUCTION";
export type ProductInactiveReasonCode = "SELLER_PAUSED" | "DISCONTINUED" | "ADMIN_LOCKED" | "OTHER";
export type VariantStatusCode = "ACTIVE" | "INACTIVE";
export type VariantInactiveReasonCode = "OUT_OF_STOCK" | "DISCONTINUED" | "OTHER";

export const MAX_VARIANTS_PER_PRODUCT = 10;
export const MAX_IMAGES_PER_PRODUCT = 5;
export const MAX_IMAGE_TOTAL_BYTES = 20 * 1024 * 1024; // 20MB per Gateway [RequestSizeLimit(20 * 1024 * 1024)]
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type CategoryNode = {
  categoryId: string;
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  level: number;
  sortOrder?: number;
  isActive?: boolean;
  children?: CategoryNode[];
};

export type FlattenedCategoryOption = {
  categoryId: string;
  name: string;
  displayLabel: string;
  level: number;
  parentId?: string | null;
  isActive: boolean;
};

export type VariantAttributeItem = {
  attrName: string;
  attrValue: string;
};

export type SellerVariantRecord = {
  variantId: string;
  productId?: string;
  skuCode: string;
  name: string;
  price: number;
  currency: string;
  isActive: boolean;
  status: VariantStatusCode;
  statusReason?: string | null;
  isDefault?: boolean;
  hasOrder?: boolean;
  attributes: VariantAttributeItem[];
  images?: SellerProductImageRecord[];
  // Stock fields ONLY populated if returned explicitly by an inventory/stock endpoint — never inferred from Catalog
  totalStock?: number | null;
  availableStock?: number | null;
  reservedStock?: number | null;
  stockQuantityFromStockIn?: number | null;
};

export type SellerProductImageRecord = {
  imageId: string;
  url: string;
  altText?: string | null;
  isActive: boolean;
  sortOrder: number;
  variantId?: string | null;
  isPrimary?: boolean;
};

export type SellerProductListItem = {
  productId: string;
  sellerId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  name: string;
  brand?: string | null;
  description?: string | null;
  saleType: SaleTypeCode;
  status: ProductStatusCode;
  statusReason?: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  price: number | null;
  primaryImageUrl?: string | null;
  avgRating?: number | null;
  variantCount?: number | null;
  imageCount?: number | null;
  variants?: SellerVariantRecord[];
  images?: SellerProductImageRecord[];
  publishedAt?: string | null;
};

export type SellerProductDetail = {
  product: {
    productId: string;
    sellerId?: string | null;
    categoryId?: string | null;
    name: string;
    description?: string | null;
    brand?: string | null;
    saleType: SaleTypeCode;
    status: ProductStatusCode;
    statusReason?: string | null;
    specifications?: Record<string, string>;
    publishedAt?: string | null;
  };
  category?: {
    categoryId: string;
    parentId?: string | null;
    name: string;
    description?: string | null;
    level?: number;
    isActive?: boolean;
  } | null;
  variants: SellerVariantRecord[];
  images: SellerProductImageRecord[];
  rating?: {
    avgRating: number;
    reviewCount: number;
  } | null;
};

export type CreateVariantInput = {
  skuCode: string;
  name: string;
  price: number;
  currency?: string;
  isActive?: boolean;
  attributes: VariantAttributeItem[];
};

export type UpdateVariantInput = {
  name?: string;
  price?: number;
  currency?: string;
  isActive?: boolean;
  status?: VariantStatusCode;
  statusReason?: VariantInactiveReasonCode | string | null;
  attributes?: VariantAttributeItem[];
};

export type CreateProductInput = {
  categoryId: string;
  name: string;
  description?: string;
  brand?: string;
  specifications?: Record<string, string>;
  variants: CreateVariantInput[];
};

export type UpdateProductInput = {
  categoryId?: string;
  name?: string;
  description?: string;
  brand?: string;
  specifications?: Record<string, string>;
};

export type UpdateProductStatusInput = {
  status: ProductStatusCode;
  statusReason?: ProductInactiveReasonCode | string | null;
  reason?: ProductInactiveReasonCode | string | null;
};

export type StockInBatchItemInput = {
  skuId: string;
  quantity: number;
};

export type SkuStockRecord = {
  skuId: string;
  skuCode?: string;
  variantName?: string;
  productName?: string;
  productId?: string;
  warehouseId?: string | null;
  // Explicit 3-tier stock from Fulfillment (null if endpoint does not return it — never fabricated)
  totalStock: number | null;
  availableStock: number | null;
  reservedStock: number | null;
  // Raw stockQuantity returned by POST /api/v1/inventory/stock-in or /api/v1/variant/{id}/stock-in if BE returns single counter
  reportedStockQuantity: number | null;
  lastAddedQuantity: number | null;
  updatedAt?: string;
  sourceEndpoint: string;
};

export type ProductActivationGateCheck = {
  canActivate: boolean;
  hasActivePositivePriceVariant: boolean;
  activeValidVariantCount: number;
  hasValidImage: boolean;
  validImageCount: number;
  blockers: string[];
};

function unwrap<T>(res: ApiResponse<T> | T): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
}

/**
 * Normalizes product status into canonical DRAFT | ACTIVE | INACTIVE.
 */
export function normalizeProductStatus(raw?: unknown): ProductStatusCode {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "INACTIVE") return "INACTIVE";
  return "DRAFT";
}

/**
 * Normalizes variant status into canonical ACTIVE | INACTIVE.
 */
export function normalizeVariantStatus(rawStatus?: unknown, isActiveFlag?: unknown): VariantStatusCode {
  if (typeof isActiveFlag === "boolean" && !isActiveFlag) {
    return "INACTIVE";
  }
  const s = String(rawStatus ?? "").trim().toUpperCase();
  if (s === "INACTIVE") return "INACTIVE";
  return "ACTIVE";
}

export function getProductStatusMeta(status: ProductStatusCode): {
  code: ProductStatusCode;
  label: string;
  tone: "amber" | "green" | "slate" | "red";
  summary: string;
} {
  switch (status) {
    case "DRAFT":
      return {
        code: "DRAFT",
        label: "DRAFT · Bản nháp (Ẩn với Buyer)",
        tone: "amber",
        summary: "Sản phẩm đang ở trạng thái nháp, chỉ hiển thị trong kênh người bán và KHÔNG xuất hiện trên trang Buyer.",
      };
    case "ACTIVE":
      return {
        code: "ACTIVE",
        label: "ACTIVE · Đang mở bán công khai",
        tone: "green",
        summary: "Sản phẩm đã vượt qua rào chắn kích hoạt và đang hiển thị công khai trên trang Buyer (/ và /catalog).",
      };
    case "INACTIVE":
      return {
        code: "INACTIVE",
        label: "INACTIVE · Tạm ngừng kinh doanh",
        tone: "slate",
        summary: "Sản phẩm đang tạm ẩn/ngừng bán, không cho phép Buyer mua mới.",
      };
  }
}

export function getInactiveReasonLabel(reason?: string | null): string {
  const code = String(reason ?? "").trim().toUpperCase();
  switch (code) {
    case "SELLER_PAUSED":
    case "SELLERPAUSED":
      return "SELLER_PAUSED — Người bán chủ động tạm nghỉ bán";
    case "DISCONTINUED":
      return "DISCONTINUED — Ngừng kinh doanh vĩnh viễn";
    case "ADMIN_LOCKED":
    case "ADMINLOCKED":
      return "ADMIN_LOCKED — Quản trị viên khóa (chỉ Admin được mở lại)";
    case "OUT_OF_STOCK":
    case "OUTOFSTOCK":
      return "OUT_OF_STOCK — Tạm hết hàng";
    case "OTHER":
      return "OTHER — Lý do khác";
    default:
      return reason ? String(reason) : "—";
  }
}

/**
 * Flattens hierarchical category nodes returned by GET /api/v1/categories into select options.
 */
export function flattenCategories(rawPayload: unknown): FlattenedCategoryOption[] {
  const unwrapped = unwrap(rawPayload as Record<string, unknown>);
  const rawList: unknown[] = Array.isArray(unwrapped)
    ? unwrapped
    : Array.isArray((unwrapped as Record<string, unknown>)?.items)
      ? ((unwrapped as Record<string, unknown>).items as unknown[])
      : Array.isArray((unwrapped as Record<string, unknown>)?.categories)
        ? ((unwrapped as Record<string, unknown>).categories as unknown[])
        : Array.isArray((unwrapped as Record<string, unknown>)?.data)
          ? ((unwrapped as Record<string, unknown>).data as unknown[])
          : [];

  const result: FlattenedCategoryOption[] = [];
  const visited = new Set<string>();

  function walk(nodes: unknown[], depth = 0, parentId: string | null = null) {
    for (const item of nodes) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const categoryId = String(obj.categoryId ?? obj.id ?? "").trim();
      const name = String(obj.name ?? "").trim();
      if (!categoryId || !name || visited.has(categoryId)) continue;
      visited.add(categoryId);

      const level = typeof obj.level === "number" ? obj.level : depth + 1;
      const isActive = obj.isActive !== false && obj.isDisabled !== true;
      const prefix = depth > 0 ? `${"— ".repeat(depth)}` : "";

      result.push({
        categoryId,
        name,
        displayLabel: `${prefix}${name}`,
        level,
        parentId: obj.parentId ? String(obj.parentId) : parentId,
        isActive,
      });

      if (Array.isArray(obj.children) && obj.children.length > 0) {
        walk(obj.children, depth + 1, categoryId);
      }
    }
  }

  walk(rawList, 0, null);
  return result;
}

function readOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeVariantRecord(raw: unknown, index = 0): SellerVariantRecord {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const variantId = String(obj.variantId ?? obj.skuId ?? obj.id ?? `variant-${index}`);
  const skuCode = String(obj.skuCode ?? obj.sku ?? "");
  const name = String(obj.name ?? obj.variantName ?? (skuCode || `Biến thể #${index + 1}`));
  const price = readOptionalNumber(obj.price) ?? 0;
  const currency = String(obj.currency ?? "VND");
  const status = normalizeVariantStatus(obj.status, obj.isActive);
  const isActive = status === "ACTIVE";

  const rawAttrs = Array.isArray(obj.attributes) ? obj.attributes : [];
  const attributes: VariantAttributeItem[] = rawAttrs
    .filter((a) => a && typeof a === "object")
    .map((a) => {
      const attr = a as Record<string, unknown>;
      return {
        attrName: String(attr.attrName ?? attr.name ?? "").trim(),
        attrValue: String(attr.attrValue ?? attr.value ?? "").trim(),
      };
    })
    .filter((a) => a.attrName || a.attrValue);

  // IMPORTANT P0 rule: NEVER infer or fabricate stock if endpoint does not return explicit stock fields.
  const totalStock = readOptionalNumber(obj.totalStock ?? obj.totalQuantity);
  const availableStock = readOptionalNumber(obj.availableStock ?? obj.availableQuantity);
  const reservedStock = readOptionalNumber(obj.reservedStock ?? obj.reservedQuantity);
  const stockQuantityFromStockIn = readOptionalNumber(obj.stockQuantity);

  return {
    variantId,
    productId: obj.productId ? String(obj.productId) : undefined,
    skuCode,
    name,
    price,
    currency,
    isActive,
    status,
    statusReason: obj.statusReason ? String(obj.statusReason) : null,
    isDefault: Boolean(obj.isDefault),
    hasOrder: Boolean(obj.hasOrder),
    attributes,
    totalStock,
    availableStock,
    reservedStock,
    stockQuantityFromStockIn,
  };
}

export function normalizeImageRecord(raw: unknown, index = 0): SellerProductImageRecord {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sortOrder = readOptionalNumber(obj.sortOrder) ?? index + 1;
  return {
    imageId: String(obj.imageId ?? obj.id ?? `img-${index + 1}`),
    url: String(obj.url ?? obj.imageUrl ?? "").trim(),
    altText: obj.altText ? String(obj.altText) : null,
    isActive: obj.isActive !== false,
    sortOrder,
    variantId: obj.variantId ? String(obj.variantId) : null,
    isPrimary: Boolean(obj.isPrimary) || sortOrder === 1 || index === 0,
  };
}

export function normalizeProductDetail(rawPayload: unknown, fallbackId = ""): SellerProductDetail {
  const data = unwrap(rawPayload as Record<string, unknown>) as Record<string, unknown>;
  const prodObj =
    data && typeof data.product === "object" && data.product !== null
      ? (data.product as Record<string, unknown>)
      : (data ?? {});

  const rawSpecs = prodObj.specifications;
  const specifications: Record<string, string> = {};
  if (rawSpecs && typeof rawSpecs === "object" && !Array.isArray(rawSpecs)) {
    for (const [k, v] of Object.entries(rawSpecs as Record<string, unknown>)) {
      if (v !== null && v !== undefined) {
        specifications[k] = String(v);
      }
    }
  }

  const rawVariants = Array.isArray(data?.variants)
    ? data.variants
    : Array.isArray(prodObj?.variants)
      ? (prodObj.variants as unknown[])
      : [];
  const variants = rawVariants.map((v, i) => normalizeVariantRecord(v, i));

  const rawImages = Array.isArray(data?.images)
    ? data.images
    : Array.isArray(prodObj?.images)
      ? (prodObj.images as unknown[])
      : [];
  const images = rawImages
    .map((img, i) => normalizeImageRecord(img, i))
    .filter((img) => Boolean(img.url))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img, idx) => ({ ...img, isPrimary: idx === 0 }));

  const catObj =
    data && typeof data.category === "object" && data.category !== null
      ? (data.category as Record<string, unknown>)
      : null;

  const ratingObj =
    data && typeof data.rating === "object" && data.rating !== null
      ? (data.rating as Record<string, unknown>)
      : null;

  return {
    product: {
      productId: String(prodObj.productId ?? prodObj.id ?? fallbackId),
      sellerId: prodObj.sellerId ? String(prodObj.sellerId) : null,
      categoryId: prodObj.categoryId
        ? String(prodObj.categoryId)
        : catObj?.categoryId
          ? String(catObj.categoryId)
          : null,
      name: String(prodObj.name ?? prodObj.productName ?? ""),
      description: prodObj.description ? String(prodObj.description) : "",
      brand: prodObj.brand ? String(prodObj.brand) : "",
      saleType: String(prodObj.saleType ?? "REGULAR").toUpperCase() === "AUCTION" ? "AUCTION" : "REGULAR",
      status: normalizeProductStatus(prodObj.status),
      statusReason: prodObj.statusReason ? String(prodObj.statusReason) : null,
      specifications,
      publishedAt: prodObj.publishedAt ? String(prodObj.publishedAt) : null,
    },
    category: catObj
      ? {
          categoryId: String(catObj.categoryId ?? catObj.id ?? ""),
          parentId: catObj.parentId ? String(catObj.parentId) : null,
          name: String(catObj.name ?? ""),
          description: catObj.description ? String(catObj.description) : null,
          level: readOptionalNumber(catObj.level) ?? undefined,
          isActive: catObj.isActive !== false,
        }
      : null,
    variants,
    images,
    rating: ratingObj
      ? {
          avgRating: readOptionalNumber(ratingObj.avgRating) ?? 0,
          reviewCount: readOptionalNumber(ratingObj.reviewCount) ?? 0,
        }
      : null,
  };
}

/**
 * Evaluates P0 activation barrier:
 * "Kích hoạt ACTIVE chỉ sau khi đáp ứng rào chắn: ít nhất một variant active giá > 0 và một ảnh hợp lệ."
 */
export function evaluateProductActivationGate(
  variants: SellerVariantRecord[],
  images: SellerProductImageRecord[],
): ProductActivationGateCheck {
  const activeValidVariants = variants.filter(
    (v) => v.status === "ACTIVE" && v.isActive && Number.isFinite(v.price) && v.price > 0,
  );
  const validImages = images.filter(
    (img) => img.isActive !== false && Boolean(img.url && img.url.trim().length > 0),
  );

  const blockers: string[] = [];
  if (activeValidVariants.length === 0) {
    blockers.push("Chưa có biến thể (variant) nào đang ACTIVE với giá bán > 0 VND.");
  }
  if (validImages.length === 0) {
    blockers.push("Sản phẩm chưa có ít nhất 1 hình ảnh hợp lệ.");
  }

  return {
    canActivate: activeValidVariants.length > 0 && validImages.length > 0,
    hasActivePositivePriceVariant: activeValidVariants.length > 0,
    activeValidVariantCount: activeValidVariants.length,
    hasValidImage: validImages.length > 0,
    validImageCount: validImages.length,
    blockers,
  };
}

/**
 * Validates selected image files against Gateway & Catalog rules before upload.
 */
export function validateImageUploadSelection(
  files: File[],
  existingImageCount: number,
): { valid: boolean; error?: string } {
  if (!files.length) {
    return { valid: false, error: "Vui lòng chọn ít nhất 1 tệp ảnh để tải lên." };
  }
  if (files.length > MAX_IMAGES_PER_PRODUCT) {
    return {
      valid: false,
      error: `Mỗi lần tải lên tối đa ${MAX_IMAGES_PER_PRODUCT} ảnh (CatalogValidation.MaxImages = 5).`,
    };
  }
  if (existingImageCount + files.length > MAX_IMAGES_PER_PRODUCT) {
    return {
      valid: false,
      error: `Sản phẩm hiện đã có ${existingImageCount}/${MAX_IMAGES_PER_PRODUCT} ảnh. Chỉ có thể tải thêm tối đa ${Math.max(0, MAX_IMAGES_PER_PRODUCT - existingImageCount)} ảnh.`,
    };
  }

  let totalBytes = 0;
  for (const file of files) {
    totalBytes += file.size;
    const mime = (file.type || "").toLowerCase();
    const validExt = /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]) && !validExt) {
      return {
        valid: false,
        error: `Tệp "${file.name}" không đúng định dạng ảnh được hỗ trợ (JPEG, PNG, WEBP, GIF).`,
      };
    }
    if (file.size <= 0) {
      return {
        valid: false,
        error: `Tệp "${file.name}" rỗng (0 byte).`,
      };
    }
  }

  if (totalBytes > MAX_IMAGE_TOTAL_BYTES) {
    return {
      valid: false,
      error: `Tổng dung lượng tệp tải lên vượt quá giới hạn 20MB của Gateway (${(totalBytes / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  return { valid: true };
}

/**
 * Formats ApiError from BE with full details (message, status, errorCode, traceId, fieldErrors)
 * so barrier errors and contract errors from BE are always surfaced transparently.
 */
export function formatBackendErrorDetail(error: unknown): {
  title: string;
  detail: string;
  status?: number;
  errorCode?: string;
  traceId?: string;
  fieldErrors?: Record<string, string[]>;
} {
  if (error instanceof ApiError) {
    return {
      title: `Phản hồi lỗi từ Backend (HTTP ${error.status}${error.errorCode ? ` · ${error.errorCode}` : ""})`,
      detail: error.message || `Yêu cầu thất bại với mã HTTP ${error.status}.`,
      status: error.status,
      errorCode: error.errorCode,
      traceId: error.traceId,
      fieldErrors: error.fieldErrors,
    };
  }
  const msg = error instanceof Error ? error.message : "Lỗi không xác định khi gọi API.";
  return {
    title: "Lỗi kết nối hoặc xử lý yêu cầu",
    detail: msg,
  };
}

/**
 * Session storage helper for newly created / updated Seller products in the current browser session.
 * This ensures that when Gateway runs in stateless seed mode or before downstream DB read-after-write sync,
 * the Seller's newly created DRAFT product -> Variant -> 2 Images -> Stock-in 10 -> ACTIVE handoff
 * is accurately tracked and reflected across Seller & Buyer screens in the same browser session,
 * while ALWAYS sending every real HTTP request through `/api/v1/...` first!
 */
const SELLER_SESSION_PRODUCTS_KEY = "nexus_seller_session_products_v1";
const SELLER_SESSION_STOCK_KEY = "nexus_seller_session_sku_stock_v1";

export function loadSessionSellerProducts(): Record<string, SellerProductDetail> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(SELLER_SESSION_PRODUCTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, SellerProductDetail>) : {};
  } catch {
    return {};
  }
}

export function saveSessionSellerProduct(detail: SellerProductDetail): void {
  if (typeof window === "undefined" || !detail.product.productId) return;
  try {
    const map = loadSessionSellerProducts();
    map[detail.product.productId] = detail;
    window.sessionStorage.setItem(SELLER_SESSION_PRODUCTS_KEY, JSON.stringify(map));
  } catch {
    /* Ignore storage quota errors */
  }
}

export function removeSessionSellerProduct(productId: string): void {
  if (typeof window === "undefined" || !productId) return;
  try {
    const map = loadSessionSellerProducts();
    delete map[productId];
    window.sessionStorage.setItem(SELLER_SESSION_PRODUCTS_KEY, JSON.stringify(map));
  } catch {
    /* Ignore */
  }
}

export function loadSessionSkuStockMap(): Record<string, SkuStockRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(SELLER_SESSION_STOCK_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, SkuStockRecord>) : {};
  } catch {
    return {};
  }
}

export function saveSessionSkuStockRecord(record: SkuStockRecord): void {
  if (typeof window === "undefined" || !record.skuId) return;
  try {
    const map = loadSessionSkuStockMap();
    map[record.skuId] = record;
    window.sessionStorage.setItem(SELLER_SESSION_STOCK_KEY, JSON.stringify(map));
  } catch {
    /* Ignore */
  }
}

export function buildCatalogBlocker(
  err: ApiError,
  endpoint: string,
  method: string,
  blockedSurface: string,
  expectedResponse: string,
  recommendation: string,
  service = "CatalogService (catalog)",
): SellerBlockerInfo {
  return {
    service,
    endpoint,
    method,
    role: "Seller",
    httpStatus: err.status,
    errorCode: err.errorCode,
    traceId: err.traceId,
    actualResponse: `${err.message} (HTTP ${err.status}${err.errorCode ? ` · ${err.errorCode}` : ""})`,
    expectedResponse,
    blockedSurface,
    recommendation,
  };
}

export const sellerCatalogService = {
  getCategories: (tree = true, signal?: AbortSignal) =>
    api.get<ApiResponse<unknown>>(`/api/v1/categories?tree=${tree ? "true" : "false"}`, { signal }),

  searchSellerProducts: (
    params: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      categoryId?: string;
      status?: string;
      saleType?: string;
      sortBy?: string;
    },
    signal?: AbortSignal,
  ) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("pageSize", String(params.pageSize ?? 50));
    if (params.keyword?.trim()) qs.set("keyword", params.keyword.trim());
    if (params.categoryId) qs.set("categoryId", params.categoryId);
    if (params.status) qs.set("status", params.status);
    if (params.saleType) qs.set("saleType", params.saleType);
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    return api.get<ApiResponse<unknown>>(`/api/v1/product/search?${qs.toString()}`, { signal });
  },

  getProductById: (productId: string, signal?: AbortSignal) =>
    api.get<ApiResponse<unknown>>(`/api/v1/product/${encodeURIComponent(productId)}`, { signal }),

  createProduct: (payload: CreateProductInput) =>
    api.post<ApiResponse<Record<string, unknown>>>("/api/v1/products", {
      categoryId: payload.categoryId,
      name: payload.name.trim(),
      description: payload.description?.trim() ?? "",
      brand: payload.brand?.trim() ?? "",
      specifications: payload.specifications ?? {},
      variants: payload.variants.map((v) => ({
        skuCode: v.skuCode.trim(),
        name: v.name.trim(),
        price: Number(v.price),
        currency: v.currency ?? "VND",
        isActive: v.isActive !== false,
        attributes: v.attributes.filter((a) => a.attrName.trim() && a.attrValue.trim()),
      })),
    }),

  updateProduct: (productId: string, payload: UpdateProductInput) =>
    api.patch<ApiResponse<Record<string, unknown>>>(
      `/api/v1/product/${encodeURIComponent(productId)}`,
      payload,
    ),

  deleteProduct: (productId: string) =>
    api.delete<void>(`/api/v1/product/${encodeURIComponent(productId)}`),

  updateProductStatus: (productId: string, payload: UpdateProductStatusInput) =>
    api.patch<ApiResponse<Record<string, unknown>>>(
      `/api/v1/product/${encodeURIComponent(productId)}/status`,
      {
        status: payload.status,
        ...(payload.statusReason ? { statusReason: payload.statusReason, reason: payload.statusReason } : {}),
      },
    ),

  createVariant: (productId: string, payload: CreateVariantInput) =>
    api.post<ApiResponse<Record<string, unknown>>>(
      `/api/v1/product/${encodeURIComponent(productId)}/variants`,
      {
        skuCode: payload.skuCode.trim(),
        name: payload.name.trim(),
        price: Number(payload.price),
        currency: payload.currency ?? "VND",
        isActive: payload.isActive !== false,
        attributes: payload.attributes.filter((a) => a.attrName.trim() && a.attrValue.trim()),
      },
    ),

  updateVariant: (variantId: string, payload: UpdateVariantInput) =>
    api.patch<ApiResponse<Record<string, unknown>>>(
      `/api/v1/variant/${encodeURIComponent(variantId)}`,
      payload,
    ),

  deleteVariant: (variantId: string) =>
    api.delete<void>(`/api/v1/variant/${encodeURIComponent(variantId)}`),

  getVariantById: (variantId: string, signal?: AbortSignal) =>
    api.get<ApiResponse<unknown>>(`/api/v1/variant/${encodeURIComponent(variantId)}`, { signal }),

  listProductImages: (productId: string, variantId?: string, signal?: AbortSignal) => {
    const qs = variantId ? `?variantId=${encodeURIComponent(variantId)}` : "";
    return api.get<ApiResponse<unknown>>(
      `/api/v1/product/${encodeURIComponent(productId)}pics${qs}`,
      { signal },
    );
  },

  uploadProductImages: (
    productId: string,
    form: {
      files: File[];
      variantId?: string;
      altText?: string;
      isActive?: boolean;
    },
  ) => {
    const fd = new FormData();
    for (const file of form.files) {
      fd.append("Files", file);
    }
    if (form.variantId?.trim()) {
      fd.append("VariantId", form.variantId.trim());
    }
    if (form.altText?.trim()) {
      fd.append("AltText", form.altText.trim());
    }
    fd.append("IsActive", String(form.isActive !== false));
    return api.post<ApiResponse<unknown>>(
      `/api/v1/product/${encodeURIComponent(productId)}pics`,
      fd,
    );
  },

  deleteProductImages: (productId: string, imageIds: string[]) => {
    const idsParam = imageIds.join(",");
    return api.delete<void>(
      `/api/v1/product/${encodeURIComponent(productId)}pics?ids=${encodeURIComponent(idsParam)}`,
    );
  },

  stockInBatch: (items: StockInBatchItemInput[]) =>
    api.post<ApiResponse<unknown>>("/api/v1/inventory/stock-in", {
      items: items.map((item) => ({
        skuId: item.skuId.trim(),
        quantity: Number(item.quantity),
      })),
    }),

  stockInVariant: (variantId: string, quantity: number) =>
    api.post<ApiResponse<unknown>>(
      `/api/v1/variant/${encodeURIComponent(variantId)}/stock-in`,
      { quantity: Number(quantity) },
    ),
};

