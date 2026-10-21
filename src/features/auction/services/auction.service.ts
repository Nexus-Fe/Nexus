import { api, type ApiResponse } from "@/lib/api/client";
import type { AuctionSession, BidRequest } from "../types";

// Gateway paths are initial assumptions and must be checked against backend OpenAPI.
export const auctionService = {
  getAuctions: () => api.get<ApiResponse<AuctionSession[]>>("/api/auctions"),
  getAuctionById: (id: string) =>
    api.get<ApiResponse<AuctionSession>>(`/api/auctions/${encodeURIComponent(id)}`),
  placeBid: (id: string, input: BidRequest) =>
    api.post<ApiResponse<AuctionSession>>(
      `/api/auctions/${encodeURIComponent(id)}/bids`,
      input,
    ),
};
