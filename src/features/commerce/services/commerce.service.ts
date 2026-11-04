import { api, type ApiResponse } from "@/lib/api/client";
import type { Cart, Order } from "../types";

function unwrap<T>(value: ApiResponse<T> | T): T {
  return value && typeof value === "object" && "data" in value ? value.data : value;
}

export const commerceService = {
  async getCart(): Promise<Cart> {
    return unwrap(await api.get<ApiResponse<Cart> | Cart>("/api/v1/carts/active"));
  },
  async getOrderById(id: string, signal?: AbortSignal): Promise<{ data: Order }> {
    const result = await api.get<ApiResponse<Order> | Order>(`/api/v1/orders/${encodeURIComponent(id)}`, { signal });
    return { data: unwrap(result) };
  },
};
