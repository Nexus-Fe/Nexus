import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import type { ProductSpecification } from "@/features/catalog/types/product-specification";

function normalizeSpecifications(value: unknown): ProductSpecification[] {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is ProductSpecification =>
      typeof item === "object" && item !== null && typeof item.name === "string" && typeof item.value === "string");
  }
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).filter(([, item]) => typeof item === "string")
      .map(([name, item]) => ({ name, value: String(item) }));
  }
  return [];
}

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
  variantId?: string | null;
  url: string;
  altText?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type SellerProductDetail = SellerProduct & {
  description?: string | null;
  specifications?: ProductSpecification[] | null;
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

export type InventoryAdjustmentResponse = {
  skuId: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  adjustmentLedgerId: string;
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

export function isPlatformWarehouse(warehouse: WarehouseInfo): boolean {
  const type = String(warehouse.type ?? "").toLowerCase();
  return type === "platformwarehouse" || type === "1" || warehouse.code?.toUpperCase() === "WH-CENTRAL-01";
}

export function isSellerWarehouse(warehouse: WarehouseInfo, sellerId?: string): boolean {
  return Boolean(sellerId && warehouse.sellerId?.toLowerCase() === sellerId.toLowerCase() && !isPlatformWarehouse(warehouse));
}

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

  async listProductsInWarehouse(warehouseId: string, signal?: AbortSignal): Promise<SellerProduct[]> {
    const products: SellerProduct[] = [];
    try {
      for (let page = 1; ; page += 1) {
        const result = await this.list(page, "", signal, 100);
        products.push(...(result?.items ?? []));
        if (!result?.pagination?.hasNextPage) break;
      }
    } catch {
      return [];
    }

    if (products.length === 0) return [];

    const details: SellerProductDetail[] = [];
    for (let index = 0; index < products.length; index += 5) {
      const chunk = await Promise.allSettled(
        products.slice(index, index + 5).map((product) => this.detail(product.productId, signal)),
      );
      for (const res of chunk) {
        if (res.status === "fulfilled" && res.value) {
          details.push(res.value);
        }
      }
    }
    const variants = details.flatMap((detail) => (detail.variants ?? []).map((variant) => ({
      productId: detail.productId,
      skuId: variant.variantId,
    })));
    if (variants.length === 0) return [];

    const stockedSkuIds = new Set<string>();
    for (let index = 0; index < variants.length; index += 100) {
      try {
        const balances = await this.inventoryBatch(variants.slice(index, index + 100).map((variant) => variant.skuId), signal);
        for (const balance of balances) {
          if (balance.warehouseId === warehouseId) stockedSkuIds.add(balance.skuId);
        }
      } catch {
        // ignore single batch balance failure
      }
    }
    const stockedProductIds = new Set(variants.filter((variant) => stockedSkuIds.has(variant.skuId)).map((variant) => variant.productId));
    return products.filter((product) => stockedProductIds.has(product.productId));
  },
  async detail(id: string, signal?: AbortSignal): Promise<SellerProductDetail> {
    const product = unwrap(
      await api.get<ApiResponse<SellerProductDetail> | SellerProductDetail>(
        `/api/v1/seller/products/${encodeURIComponent(id)}`,
        { signal },
      ),
    );
    return { ...product, specifications: normalizeSpecifications(product.specifications) };
  },

  async create(input: {
    sellerId: string;
    categoryId: string;
    name: string;
    description?: string;
    brand?: string;
    specifications?: ProductSpecification[] | null;
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
      specifications?: ProductSpecification[] | null;
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

  async uploadImage(id: string, file: File, altText: string, sortOrder = 0, variantId?: string) {
    const form = new FormData();
    form.append("file", file);
    if (altText.trim()) form.append("altText", altText.trim());
    form.append("sortOrder", String(sortOrder));
    if (variantId) form.append("variantId", variantId);
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

  async adjustInventory(input: {
    skuId: string;
    type: "Intake" | "Adjust";
    quantity: number;
    note: string;
  }) {
    return unwrap(
      await api.post<ApiResponse<InventoryAdjustmentResponse> | InventoryAdjustmentResponse>(
        "/api/v1/inventories/adjust",
        input,
      ),
    );
  },

  async listWarehouses(sellerId?: string, signal?: AbortSignal): Promise<WarehouseInfo[]> {
    if (!sellerId) return [];
    try {
      const result = unwrap(
        await api.get<ApiResponse<WarehouseInfo | WarehouseInfo[]> | WarehouseInfo | WarehouseInfo[]>(
          `/api/v1/warehouses/seller/${encodeURIComponent(sellerId)}`,
          { signal },
        ),
      );
      const warehouses = Array.isArray(result) ? result : result ? [result] : [];
      return warehouses.filter((warehouse) => !isPlatformWarehouse(warehouse))
        .slice(0, 1).map((warehouse) => ({ ...warehouse, type: "SellerWarehouse" }));
    } catch (error) {
      if (error instanceof Error && /404|not found/i.test(error.message)) return [];
      throw error;
    }
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
