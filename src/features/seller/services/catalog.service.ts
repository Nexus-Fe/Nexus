import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export type Pagination = {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
};

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
  hasOrder?: boolean;
  attributes: Array<{ attrName: string; attrValue: string }>;
};

export type ProductImage = {
  id: string;
  url: string;
  altText?: string | null;
  isActive: boolean;
  sortOrder: number;
};

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
  updatedAt: string;
};

export type WarehouseInfo = {
  id: string;
  code: string;
  name: string;
  type?: string;
  address?: string | null;
  isDisabled?: boolean;
  sellerId?: string | null;
};

export type CreatedProductResponse = {
  id: string;
  productId?: string;
  status?: string;
  saleType?: string;
  variants?: Array<{ variantId: string; skuCode: string }>;
};

type Paged<T> = { items: T[]; pagination: Pagination };

export type NewVariant = {
  skuCode: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  isActive?: boolean;
  warehouseId?: string | null;
  attributes: Array<{ attrName: string; attrValue: string }>;
};

export type ProductCategory = {
  categoryId: string;
  name: string;
  level: number;
  parentId?: string | null;
  isDisabled?: boolean;
};

export const sellerCatalogService = {
  async categories(signal?: AbortSignal): Promise<ProductCategory[]> {
    const categories: ProductCategory[] = [];
    let page = 1;
    while (true) {
      const response = await api.get<ApiResponse<Paged<ProductCategory>> | Paged<ProductCategory>>(
        `/api/v1/categories?page=${page}&pageSize=100`,
        { signal },
      );
      const payload = unwrap(response);
      categories.push(...payload.items);
      if (!payload.pagination.hasNextPage) break;
      page += 1;
    }
    return categories;
  },

  async list(page: number, keyword: string, signal?: AbortSignal, pageSize = 20) {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), saleType: "REGULAR" });
    if (keyword) query.set("keyword", keyword);
    return unwrap(
      await api.get<ApiResponse<Paged<SellerProduct>> | Paged<SellerProduct>>(
        `/api/v1/seller/products?${query}`,
        { signal },
      ),
    );
  },

  async detail(id: string, signal?: AbortSignal) {
    return unwrap(
      await api.get<ApiResponse<SellerProductDetail> | SellerProductDetail>(
        `/api/v1/seller/products/${encodeURIComponent(id)}`,
        { signal },
      ),
    );
  },

  async create(input: {
    sellerId: string;
    categoryId: string;
    name: string;
    description?: string;
    brand?: string;
    specifications?: Record<string, string> | string | null;
    variants: NewVariant[];
  }): Promise<CreatedProductResponse> {
    return unwrap(
      await api.post<ApiResponse<CreatedProductResponse> | CreatedProductResponse>("/api/v1/products", {
        ...input,
        saleType: "REGULAR",
        specifications: input.specifications ?? null,
      }),
    );
  },

  async update(
    id: string,
    input: {
      name: string;
      description: string;
      brand: string;
      categoryId: string;
      specifications?: Record<string, string> | string | null;
    },
  ) {
    return unwrap(
      await api.patch<ApiResponse<SellerProduct> | SellerProduct>(`/api/v1/products/${encodeURIComponent(id)}`, input),
    );
  },

  async addVariant(id: string, input: NewVariant) {
    return unwrap(
      await api.post<ApiResponse<ProductVariant> | ProductVariant>(
        `/api/v1/products/${encodeURIComponent(id)}/variants`,
        input,
      ),
    );
  },

  async updateVariant(
    variantId: string,
    input: {
      name: string;
      price: number;
      currency?: string;
      attributes?: Array<{ attrName: string; attrValue: string }>;
    },
  ) {
    return unwrap(
      await api.patch<ApiResponse<ProductVariant> | ProductVariant>(
        `/api/v1/variants/${encodeURIComponent(variantId)}`,
        {
          ...input,
          currency: input.currency ?? "VND",
        },
      ),
    );
  },

  async deleteVariant(variantId: string) {
    await api.delete<void>(`/api/v1/variants/${encodeURIComponent(variantId)}`);
  },

  async setDefaultVariant(productId: string, variantId: string) {
    return unwrap(
      await api.put<ApiResponse<{ defaultVariantId: string }> | { defaultVariantId: string }>(
        `/api/v1/products/${encodeURIComponent(productId)}/default-variant`,
        { variantId },
      ),
    );
  },

  async uploadImage(id: string, file: File, altText: string, sortOrder = 0) {
    const form = new FormData();
    form.append("file", file);
    if (altText.trim()) form.append("altText", altText.trim());
    form.append("sortOrder", String(sortOrder));
    return unwrap(
      await api.post<ApiResponse<ProductImage> | ProductImage>(
        `/api/v1/products/${encodeURIComponent(id)}/images`,
        form,
      ),
    );
  },

  async setPrimaryImage(imageId: string, altText?: string) {
    return unwrap(
      await api.patch<ApiResponse<ProductImage> | ProductImage>(`/api/v1/images/${encodeURIComponent(imageId)}`, {
        isActive: true,
        ...(altText !== undefined ? { altText } : {}),
      }),
    );
  },

  async deleteImage(productId: string, imageId: string) {
    await api.delete<void>(
      `/api/v1/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
    );
  },

  async changeStatus(id: string, status: "ACTIVE" | "INACTIVE" | "DRAFT", statusReason?: string) {
    await api.patch(`/api/v1/products/${encodeURIComponent(id)}/status`, {
      status,
      ...(statusReason ? { statusReason } : {}),
    });
  },

  async deleteProduct(id: string) {
    await api.delete<void>(`/api/v1/products/${encodeURIComponent(id)}`);
  },

  async inventory(skuId: string, signal?: AbortSignal) {
    return unwrap(
      await api.get<ApiResponse<InventoryBalance> | InventoryBalance>(
        `/api/v1/inventories/${encodeURIComponent(skuId)}`,
        { signal },
      ),
    );
  },

  async inventoryBatch(skuIds: string[], signal?: AbortSignal): Promise<InventoryBalance[]> {
    if (!skuIds.length) return [];
    return unwrap(
      await api.post<ApiResponse<InventoryBalance[]> | InventoryBalance[]>(
        "/api/v1/inventories/by-skus",
        skuIds as unknown as Record<string, unknown>,
        { signal },
      ),
    );
  },

  async listWarehouses(sellerId?: string, signal?: AbortSignal): Promise<WarehouseInfo[]> {
    const result: WarehouseInfo[] = [];
    const seen = new Set<string>();

    if (sellerId) {
      try {
        const sellerWh = unwrap(
          await api.get<ApiResponse<WarehouseInfo | WarehouseInfo[]> | WarehouseInfo | WarehouseInfo[]>(
            `/api/v1/warehouses/seller/${encodeURIComponent(sellerId)}`,
            { signal },
          ),
        );
        const list = Array.isArray(sellerWh) ? sellerWh : sellerWh ? [sellerWh] : [];
        for (const item of list) {
          if (item?.id && !seen.has(item.id)) {
            seen.add(item.id);
            result.push(item);
          }
        }
      } catch {
        // Seller may not have a dedicated warehouse yet; fallback to active platform warehouses
      }
    }

    try {
      const activePaged = unwrap(
        await api.get<ApiResponse<Paged<WarehouseInfo> | WarehouseInfo[]> | Paged<WarehouseInfo> | WarehouseInfo[]>(
          "/api/v1/warehouses?page=1&pageSize=50",
          { signal },
        ),
      );
      const list = Array.isArray(activePaged) ? activePaged : activePaged?.items ?? [];
      for (const item of list) {
        if (item?.id && !seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
    } catch {
      // Ignore if warehouse list endpoint is temporarily unreachable
    }

    return result;
  },

  async createWarehouse(input: { code: string; name: string; address: string; sellerId?: string }) {
    return unwrap(
      await api.post<ApiResponse<WarehouseInfo> | WarehouseInfo>("/api/v1/warehouses", {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        type: "SellerWarehouse",
        address: input.address.trim(),
        sellerId: input.sellerId,
      }),
    );
  },
};
