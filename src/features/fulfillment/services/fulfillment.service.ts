import { api, type ApiResponse } from "@/lib/api/client";
import type { Shipment } from "../types";

const unwrap = <T,>(response: ApiResponse<T> | T): T => response && typeof response === "object" && "data" in response ? response.data : response;

export const fulfillmentService = {
  async getShipmentByOrderId(orderId: string, signal?: AbortSignal): Promise<Shipment> {
    return unwrap(await api.get<ApiResponse<Shipment> | Shipment>(`/api/v1/shipments/order/${encodeURIComponent(orderId)}`, { signal }));
  },
  async getShipmentByTrackingNumber(trackingNumber: string, signal?: AbortSignal): Promise<Shipment> {
    return unwrap(await api.get<ApiResponse<Shipment> | Shipment>(`/api/v1/shipments/tracking/${encodeURIComponent(trackingNumber)}`, { signal }));
  },
};
