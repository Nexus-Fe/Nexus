import { api, type ApiResponse } from "@/lib/api/client";
import type { Product, ProductListQuery, ProductListResponse } from "../types";

function toQueryString(query: ProductListQuery = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `?${search}` : "";
}

export const catalogService = {
  getProducts: (query?: ProductListQuery) =>
    api.get<ApiResponse<ProductListResponse>>(
      `/api/catalog/products${toQueryString(query)}`,
    ),
  getProductById: (id: string) =>
    api.get<ApiResponse<Product>>(`/api/catalog/products/${encodeURIComponent(id)}`),
};
