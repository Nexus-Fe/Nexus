import { api, unwrap, type ApiResponse } from "@/lib/api/client";
import type { Shipment } from "../types";

export const fulfillmentService = {
  async getShipmentByOrderId(orderId: string, signal?: AbortSignal): Promise<Shipment> {
    return unwrap(await api.get<ApiResponse<Shipment> | Shipment>(`/api/v1/shipments/order/${encodeURIComponent(orderId)}`, { signal }));
  },
  async getShipmentByTrackingNumber(trackingNumber: string, signal?: AbortSignal): Promise<Shipment> {
    return unwrap(await api.get<ApiResponse<Shipment> | Shipment>(`/api/v1/shipments/tracking/${encodeURIComponent(trackingNumber)}`, { signal }));
  },
};
