import { api, type ApiResponse } from "@/lib/api/client";
import type { ProductListQuery, ProductListResponse } from "../types";
import type { ProductSpecification } from "../types/product-specification";

export type AuctionCatalogProduct = { productId: string; name: string; saleType: string; status: string };
export type AuctionCatalogVariant = { variantId: string; skuCode: string; name: string; price: number | null; status: string; isActive: boolean; attributes: Array<{ attrName: string; attrValue: string }>; primaryImageUrl?: string | null };
export type CatalogProductDetail = {
  productId: string;
  sellerId: string;
  name: string;
  description: string | null;
  brand: string | null;
  saleType: string;
  status: string;
  specifications: ProductSpecification[] | null;
  publishedAt: string | null;
  category: { categoryId: string; parentId: string | null; name: string; level: number } | null;
  variants: AuctionCatalogVariant[];
  images: Array<{ imageId: string; url: string; altText: string | null; isActive: boolean; sortOrder: number; variantId: string | null }>;
  rating: { avgRating: number | null; reviewCount: number };
};
export type AuctionCatalogDetail = CatalogProductDetail;
export type AuctionCatalogPage = { items: AuctionCatalogProduct[]; pagination: { pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasNextPage: boolean } };

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
    api.get<ApiResponse<CatalogProductDetail>>(`/api/v1/products/${encodeURIComponent(id)}`),
  searchAuctionProducts: (keyword = "", signal?: AbortSignal) =>
    api.get<ApiResponse<AuctionCatalogPage>>(`/api/v1/products/search?page=1&pageSize=100&saleType=Auction&keyword=${encodeURIComponent(keyword)}`, { signal }),
  getAuctionProduct: (id: string, signal?: AbortSignal) =>
    api.get<ApiResponse<CatalogProductDetail>>(`/api/v1/products/${encodeURIComponent(id)}`, { signal }),
};
