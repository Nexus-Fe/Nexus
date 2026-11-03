import { api, type ApiResponse } from "@/lib/api/client";

export type Pagination = { pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasNextPage: boolean };
export type SellerProduct = {
  productId: string;
  name: string;
  brand?: string | null;
  categoryId: string;
  categoryName?: string | null;
  saleType: string;
  status: string;
  minPrice?: number | null;
  primaryImageUrl?: string | null;
  variantCount: number;
};
export type ProductVariant = {
  variantId: string;
  skuCode: string;
  name: string;
  price: number | null;
  currency: string;
  status: string;
  isActive: boolean;
  attributes: Array<{ attrName: string; attrValue: string }>;
};
export type ProductImage = { id: string; url: string; altText?: string | null; isActive: boolean; sortOrder: number };
export type SellerProductDetail = SellerProduct & {
  description?: string | null;
  specifications?: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
};
export type InventoryBalance = {
  id: string;
  skuId: string;
  warehouseId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  unavailableQuantity: number;
};

type Paged<T> = { items: T[]; pagination: Pagination };
type NewVariant = { skuCode: string; name: string; price: number; currency: string; attributes: Array<{ attrName: string; attrValue: string }> };
export type ProductCategory = { categoryId: string; name: string; level: number };

function unwrap<T>(response: ApiResponse<T> | T): T {
  return response && typeof response === "object" && "data" in response ? response.data : response;
}

export const sellerCatalogService = {
  async categories(signal?: AbortSignal): Promise<ProductCategory[]> {
    const categories: ProductCategory[] = [];
    let page = 1;
    while (true) {
      const response = await api.get<ApiResponse<Paged<ProductCategory>> | Paged<ProductCategory>>(`/api/v1/categories?page=${page}&pageSize=100`, { signal });
      const payload = unwrap(response);
      categories.push(...payload.items);
      if (!payload.pagination.hasNextPage) break;
      page += 1;
    }
    return categories;
  },
  async list(page: number, keyword: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), pageSize: "20", saleType: "REGULAR" });
    if (keyword) query.set("keyword", keyword);
    return unwrap(await api.get<ApiResponse<Paged<SellerProduct>> | Paged<SellerProduct>>(`/api/v1/seller/products?${query}`, { signal }));
  },
  async detail(id: string, signal?: AbortSignal) {
    return unwrap(await api.get<ApiResponse<SellerProductDetail> | SellerProductDetail>(`/api/v1/seller/products/${encodeURIComponent(id)}`, { signal }));
  },
  async create(input: { sellerId: string; categoryId: string; name: string; description?: string; brand?: string; variants: NewVariant[] }) {
    return unwrap(await api.post<ApiResponse<{ id: string }> | { id: string }>("/api/v1/products", { ...input, saleType: "REGULAR", specifications: null }));
  },
  async update(id: string, input: { name: string; description: string; brand: string; categoryId: string }) {
    return unwrap(await api.patch<ApiResponse<SellerProduct> | SellerProduct>(`/api/v1/products/${encodeURIComponent(id)}`, input));
  },
  async addVariant(id: string, input: NewVariant) {
    return unwrap(await api.post<ApiResponse<ProductVariant> | ProductVariant>(`/api/v1/products/${encodeURIComponent(id)}/variants`, input));
  },
  async setDefaultVariant(productId: string, variantId: string) {
    return unwrap(await api.put<ApiResponse<{ defaultVariantId: string }> | { defaultVariantId: string }>(`/api/v1/products/${encodeURIComponent(productId)}/default-variant`, { variantId }));
  },
  async uploadImage(id: string, file: File, altText: string) {
    const form = new FormData();
    form.append("file", file);
    if (altText.trim()) form.append("altText", altText.trim());
    return unwrap(await api.post<ApiResponse<ProductImage> | ProductImage>(`/api/v1/products/${encodeURIComponent(id)}/images`, form));
  },
  async deleteImage(productId: string, imageId: string) {
    await api.delete<void>(`/api/v1/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`);
  },
  async changeStatus(id: string, status: "ACTIVE" | "INACTIVE") {
    await api.patch(`/api/v1/products/${encodeURIComponent(id)}/status`, { status });
  },
  async deleteProduct(id: string) {
    await api.delete<void>(`/api/v1/products/${encodeURIComponent(id)}`);
  },
  async inventory(skuId: string, signal?: AbortSignal) {
    return unwrap(await api.get<ApiResponse<InventoryBalance> | InventoryBalance>(`/api/v1/inventories/${encodeURIComponent(skuId)}`, { signal }));
  },
};
