import { api, type ApiResponse } from "@/lib/api/client";

export type SellerProfile = { shopId: string; shopName: string; ratingAvg: number; totalProducts: number };

export const sellerService = {
  getProfile: (signal?: AbortSignal) => api.get<ApiResponse<SellerProfile>>("/api/v1/seller/profile", { signal }),
};
