/**
 * =============================================================================
 * DOMAIN: Seller & Onboarding (Nexus E-Commerce)
 * Architecture: Feature-Sliced Design (FSD)
 * File: seller.api.ts
 * Description: REST API client service for Seller domain.
 * NOTE: Gateway requires paths to start with `/api/v1/`.
 * Replace dummy endpoints with official BE contracts once confirmed.
 * =============================================================================
 */

import { api, ApiError, type ApiResponse } from "@/lib/api/client";
import type {
  SellerRegistrationForm,
  SellerApplicationStatus,
  SellerProfile,
  UpdateSellerProfileDTO,
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  Category,
  InventoryItem,
  AdjustStockPayload,
  ProductStatus,
} from "../types/seller.types";

/**
 * Endpoint configurations for Seller domain.
 * All paths MUST start with `/api/v1/` to route through Nexus Gateway.
 */
export const SELLER_ENDPOINTS = {
  // Onboarding
  SUBMIT_APPLICATION: "/api/v1/seller/onboarding/apply",
  APPLICATION_STATUS: "/api/v1/seller/onboarding/status",

  // Seller Profile
  PROFILE: "/api/v1/seller/profile",

  // Products & Categories
  PRODUCTS: "/api/v1/seller/products",
  PRODUCT_BY_ID: (id: string) => `/api/v1/seller/products/${id}`,
  CATEGORIES: "/api/v1/categories",

  // Inventory & SKU
  INVENTORY: "/api/v1/seller/inventory",
  ADJUST_STOCK: (sku: string) => `/api/v1/seller/inventory/${sku}/adjust`,
} as const;

/**
 * Helper to safely extract payload data whether wrapped in ApiResponse<T> or returned raw.
 */
function extractData<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as ApiResponse<T>).data;
  }
  return res as T;
}

/**
 * Helper to cast typed DTO/interface to compatible body object for ApiRequestOptions
 */
function toBody(data: unknown): Record<string, unknown> {
  return data as Record<string, unknown>;
}

/**
 * Helper to handle and normalize API errors.
 * Preserves security: Never logs sensitive fields (e.g. CCCD, OTP).
 */
function handleApiError(error: unknown, contextAction: string): never {
  if (error instanceof ApiError) {
    // Chỉ ghi nhận lỗi nghiêm trọng phía máy chủ (>= 500), không spam console.error với lỗi 404/403/401 thường gặp
    if (error.status >= 500) {
      console.error(`[SellerApi] Server Error during ${contextAction}: HTTP ${error.status} - ${error.message}`);
    }
    throw error;
  }
  const fallbackMessage = error instanceof Error ? error.message : "Đã có lỗi không xác định xảy ra.";
  throw new Error(fallbackMessage);
}

// -----------------------------------------------------------------------------
// 1. ONBOARDING (ĐĂNG KÝ MỞ SHOP)
// -----------------------------------------------------------------------------

/**
 * Gửi hồ sơ đăng ký mở shop (Buyer -> Seller Onboarding)
 * Lưu ý: citizenId là thông tin nhạy cảm, không được log ra console.
 */
export async function submitSellerApplication(
  data: SellerRegistrationForm
): Promise<SellerApplicationStatus> {
  try {
    const res = await api.post<ApiResponse<SellerApplicationStatus> | SellerApplicationStatus>(
      SELLER_ENDPOINTS.SUBMIT_APPLICATION,
      toBody(data)
    );
    return extractData<SellerApplicationStatus>(res);
  } catch (error) {
    return handleApiError(error, "submitSellerApplication");
  }
}

/**
 * Lấy trạng thái hồ sơ đăng ký mở shop (Chờ duyệt / Đã duyệt / Từ chối kèm lý do)
 * Trả về null nếu chưa từng nộp hồ sơ (HTTP 404).
 */
export async function getSellerApplicationStatus(): Promise<SellerApplicationStatus | null> {
  try {
    const res = await api.get<ApiResponse<SellerApplicationStatus> | SellerApplicationStatus>(
      SELLER_ENDPOINTS.APPLICATION_STATUS
    );
    return extractData<SellerApplicationStatus>(res);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    return handleApiError(error, "getSellerApplicationStatus");
  }
}

// -----------------------------------------------------------------------------
// 2. SELLER PROFILE (QUẢN LÝ HỒ SƠ SHOP)
// -----------------------------------------------------------------------------

/**
 * Lấy thông tin hồ sơ Shop hiện tại
 */
export async function getSellerProfile(): Promise<SellerProfile | null> {
  try {
    const res = await api.get<ApiResponse<SellerProfile> | SellerProfile>(
      SELLER_ENDPOINTS.PROFILE
    );
    return extractData<SellerProfile>(res);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    return handleApiError(error, "getSellerProfile");
  }
}

/**
 * Cập nhật thông tin hồ sơ Shop (Tên shop, hotline, địa chỉ lấy hàng)
 */
export async function updateSellerProfile(
  data: UpdateSellerProfileDTO
): Promise<SellerProfile> {
  try {
    const res = await api.put<ApiResponse<SellerProfile> | SellerProfile>(
      SELLER_ENDPOINTS.PROFILE,
      toBody(data)
    );
    return extractData<SellerProfile>(res);
  } catch (error) {
    return handleApiError(error, "updateSellerProfile");
  }
}

// -----------------------------------------------------------------------------
// 3. PRODUCT MANAGEMENT & CATEGORIES (QUẢN LÝ SẢN PHẨM & DANH MỤC)
// -----------------------------------------------------------------------------

/**
 * Lấy danh sách sản phẩm của Seller
 */
export async function getProducts(params?: {
  categoryId?: string;
  status?: ProductStatus;
}): Promise<Product[]> {
  try {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set("categoryId", params.categoryId);
    if (params?.status) query.set("status", params.status);

    const queryString = query.toString();
    const endpoint = queryString
      ? `${SELLER_ENDPOINTS.PRODUCTS}?${queryString}`
      : SELLER_ENDPOINTS.PRODUCTS;

    const res = await api.get<ApiResponse<Product[]> | Product[]>(endpoint);
    return extractData<Product[]>(res) ?? [];
  } catch (error) {
    return handleApiError(error, "getProducts");
  }
}

/**
 * Tạo mới sản phẩm.
 * Mặc định trạng thái sản phẩm mới sẽ là PENDING_APPROVAL nếu BE quy định kiểm duyệt.
 */
export async function createProduct(data: CreateProductDTO): Promise<Product> {
  try {
    const res = await api.post<ApiResponse<Product> | Product>(
      SELLER_ENDPOINTS.PRODUCTS,
      toBody(data)
    );
    return extractData<Product>(res);
  } catch (error) {
    return handleApiError(error, "createProduct");
  }
}

/**
 * Cập nhật sản phẩm theo ID
 */
export async function updateProduct(
  id: string,
  data: UpdateProductDTO
): Promise<Product> {
  try {
    const res = await api.put<ApiResponse<Product> | Product>(
      SELLER_ENDPOINTS.PRODUCT_BY_ID(id),
      toBody(data)
    );
    return extractData<Product>(res);
  } catch (error) {
    return handleApiError(error, `updateProduct(${id})`);
  }
}

/**
 * Xóa sản phẩm theo ID
 */
export async function deleteProduct(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await api.delete<ApiResponse<{ success: boolean; message?: string }> | { success: boolean; message?: string }>(
      SELLER_ENDPOINTS.PRODUCT_BY_ID(id)
    );
    return extractData<{ success: boolean; message?: string }>(res) ?? { success: true };
  } catch (error) {
    return handleApiError(error, `deleteProduct(${id})`);
  }
}

/**
 * Lấy danh sách danh mục sản phẩm (Read-only từ Catalog)
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const res = await api.get<ApiResponse<Category[]> | Category[]>(
      SELLER_ENDPOINTS.CATEGORIES
    );
    return extractData<Category[]>(res) ?? [];
  } catch (error) {
    return handleApiError(error, "getCategories");
  }
}

// -----------------------------------------------------------------------------
// 4. INVENTORY / SKU MANAGEMENT (QUẢN LÝ TỒN KHO)
// -----------------------------------------------------------------------------

/**
 * Lấy danh sách tồn kho theo từng SKU của Seller
 */
export async function getInventory(): Promise<InventoryItem[]> {
  try {
    const res = await api.get<ApiResponse<InventoryItem[]> | InventoryItem[]>(
      SELLER_ENDPOINTS.INVENTORY
    );
    return extractData<InventoryItem[]>(res) ?? [];
  } catch (error) {
    return handleApiError(error, "getInventory");
  }
}

/**
 * Điều chỉnh số lượng tồn kho theo SKU
 * Logic độc lập và tách biệt khỏi thông tin shop.
 */
export async function adjustStock(
  sku: string,
  quantity: number,
  note?: string
): Promise<InventoryItem> {
  try {
    const payload: AdjustStockPayload = { sku, quantity, note };
    const res = await api.post<ApiResponse<InventoryItem> | InventoryItem>(
      SELLER_ENDPOINTS.ADJUST_STOCK(sku),
      toBody(payload)
    );
    return extractData<InventoryItem>(res);
  } catch (error) {
    return handleApiError(error, `adjustStock(${sku})`);
  }
}
