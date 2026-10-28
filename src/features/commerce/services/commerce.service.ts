import { api, type ApiResponse } from "@/lib/api/client";
import type { Cart, CreateOrderRequest, Order } from "../types";

export const commerceService = {
  getCart: () => api.get<ApiResponse<Cart>>("/api/v1/cart"),
  createOrder: (input: CreateOrderRequest) =>
    api.post<ApiResponse<Order>>("/api/v1/orders", input),
  getOrderById: (id: string, signal?: AbortSignal) =>
    api.get<ApiResponse<Order>>(`/api/v1/order/${encodeURIComponent(id)}`, { signal }),
};
