import { api, type ApiResponse } from "@/lib/api/client";
import type { Cart, CreateOrderRequest, Order } from "../types";

export const commerceService = {
  getCart: () => api.get<ApiResponse<Cart>>("/api/commerce/cart"),
  createOrder: (input: CreateOrderRequest) =>
    api.post<ApiResponse<Order>>("/api/commerce/orders", input),
  getOrderById: (id: string) =>
    api.get<ApiResponse<Order>>(`/api/commerce/orders/${encodeURIComponent(id)}`),
};
