import { api, type ApiResponse } from "@/lib/api/client";
import type { Shipment } from "../types";

// Gateway paths are initial assumptions and must be checked against backend OpenAPI.
export const fulfillmentService = {
  getShipments: () => api.get<ApiResponse<Shipment[]>>("/api/fulfillment/shipments"),
  getShipmentById: (id: string) =>
    api.get<ApiResponse<Shipment>>(
      `/api/fulfillment/shipments/${encodeURIComponent(id)}`,
    ),
};
