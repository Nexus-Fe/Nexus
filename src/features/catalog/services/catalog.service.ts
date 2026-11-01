import { api, type ApiResponse } from "@/lib/api/client";
import type { Product, ProductListQuery, ProductListResponse } from "../types";

export type AuctionCatalogProduct = { productId: string; name: string; saleType: "REGULAR" | "AUCTION"; status: "DRAFT" | "ACTIVE" | "INACTIVE"; auctionStatus: string | null };
export type AuctionCatalogVariant = { variantId: string; skuCode: string; name: string; status: "ACTIVE" | "INACTIVE" };
export type AuctionCatalogDetail = { product: { productId: string; sellerId: string; saleType: "REGULAR" | "AUCTION"; status: "DRAFT" | "ACTIVE" | "INACTIVE" }; variants: AuctionCatalogVariant[] };

function toQueryString(query: ProductListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("pageSize", String(query.limit));
  if (query.search) params.set("keyword", query.search);
  if (query.categoryId) params.set("categoryId", query.categoryId);

  const search = params.toString();
  return search ? `?${search}` : "";
}

export const catalogService = {
  getProducts: (query?: ProductListQuery) =>
    api.get<ApiResponse<ProductListResponse>>(
      `/api/v1/products${toQueryString(query)}`,
    ),
  getProductById: (id: string) =>
    api.get<ApiResponse<Product>>(`/api/v1/product/${encodeURIComponent(id)}`),
  searchAuctionProducts: (keyword = "", signal?: AbortSignal) =>
    api.get<ApiResponse<{ items: AuctionCatalogProduct[] }>>(`/api/v1/product/search?page=1&pageSize=100&saleType=AUCTION&status=ACTIVE&keyword=${encodeURIComponent(keyword)}`, { signal }),
  getAuctionProduct: (id: string, signal?: AbortSignal) =>
    api.get<ApiResponse<AuctionCatalogDetail>>(`/api/v1/product/${encodeURIComponent(id)}`, { signal }),
};
