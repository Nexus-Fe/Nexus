import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export const sellerOrdersService = {
  async list<T>(page: number, signal?: AbortSignal, pageSize = 20, status?: string): Promise<T> {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) query.set("status", status);
    const response = await api.get<ApiResponse<T> | T>(
      `/api/v1/sub-orders?${query}`,
      { signal },
    );
    return unwrap(response);
  },

  async detail<T>(subOrderId: string, signal?: AbortSignal): Promise<T> {
    const response = await api.get<ApiResponse<T> | T>(
      "/api/v1/sub-orders/" + encodeURIComponent(subOrderId),
      { signal },
    );
    return unwrap(response);
  },

  async accept(orderId: string, subOrderId: string): Promise<void> {
    await api.post("/api/v1/orders/" + encodeURIComponent(orderId) + "/accept", { subOrderId });
  },

  async reject(orderId: string, subOrderId: string, reasonText: string): Promise<void> {
    await api.post("/api/v1/orders/" + encodeURIComponent(orderId) + "/reject", {
      subOrderId,
      reasonCode: "OutOfStock",
      reasonText,
    });
  },
};
