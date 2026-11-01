import { api, type ApiResponse } from "@/lib/api/client";
import type { Shipment } from "../types";

export const fulfillmentService = {
  getShipments: () => api.get<ApiResponse<Shipment[]>>("/api/v1/seller/shipment?page=1&pageSize=20"),
  getShipmentById: (id: string) =>
    api.get<ApiResponse<Shipment>>(
      `/api/v1/seller/shipment/${encodeURIComponent(id)}`,
    ),
};
