import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import type { Cart, Order } from "../types";

export const commerceService = {
  async getCart(): Promise<Cart> {
    return unwrap(await api.get<ApiResponse<Cart> | Cart>("/api/v1/carts/me"));
  },
  async addCartItem(input: { skuId: string; productId?: string; quantity: number }): Promise<void> {
    await api.post<unknown>("/api/v1/carts/me/items", input);
  },
  async getOrderById(id: string, signal?: AbortSignal): Promise<{ data: Order }> {
    const result = await api.get<ApiResponse<Order> | Order>(`/api/v1/orders/${encodeURIComponent(id)}`, { signal });
    return { data: unwrap(result) };
  },
};
