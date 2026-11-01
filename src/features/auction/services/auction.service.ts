import { api, type ApiResponse } from "@/lib/api/client";
import type { AuctionConfig, AuctionConfigList, AuctionDetail, AuctionResult, AuctionSaga, AuctionStatus, AuctionStatusHistory, AuctionSummary, BidItem, BidRequest, CreateAuctionRequest, MyBidItem, PagedData, UpdateAuctionRequest } from "../types";

const idPath = (id: string) => encodeURIComponent(id);
const query = (page: number, pageSize: number, status?: AuctionStatus | "ALL") => `?page=${page}&pageSize=${pageSize}${status && status !== "ALL" ? `&status=${status}` : ""}`;
export const auctionService = {
  list: (page = 1, pageSize = 20, status?: AuctionStatus | "ALL", signal?: AbortSignal) => api.get<ApiResponse<PagedData<AuctionSummary>>>(`/api/v1/auctions${query(page, pageSize, status)}`, { signal }),
  detail: async (id: string, signal?: AbortSignal) => {
    const response = await api.getWithMetadata<ApiResponse<AuctionDetail>>(`/api/v1/auctions/${idPath(id)}`, { signal });
    if (response.data.data?.auctionId?.toLowerCase() !== id.toLowerCase()) {
      throw new Error("Thông tin phiên trả về không khớp mã phiên đã chọn. Vui lòng tải lại hoặc quay về danh sách.");
    }
    return response;
  },
  bids: (id: string, page = 1, signal?: AbortSignal) => api.get<ApiResponse<PagedData<BidItem>>>(`/api/v1/auctions/${idPath(id)}/bids${query(page, 20)}`, { signal }),
  myBids: (page = 1, status?: AuctionStatus | "ALL", signal?: AbortSignal) => api.get<ApiResponse<PagedData<MyBidItem>>>(`/api/v1/me/bids${query(page, 20, status)}`, { signal }),
  result: (id: string, signal?: AbortSignal) => api.get<ApiResponse<AuctionResult>>(`/api/v1/auctions/${idPath(id)}/result`, { signal }),
  sellerList: (page = 1, status?: AuctionStatus | "ALL", signal?: AbortSignal) => api.get<ApiResponse<PagedData<AuctionSummary>>>(`/api/v1/seller/auctions${query(page, 20, status)}`, { signal }),
  create: (body: CreateAuctionRequest) => api.post<ApiResponse<AuctionSummary>>("/api/v1/auctions", body),
  update: (id: string, body: UpdateAuctionRequest) => api.put<ApiResponse<AuctionSummary>>(`/api/v1/auctions/${idPath(id)}`, body),
  cancel: (id: string, reason?: string) => api.post(`/api/v1/auctions/${idPath(id)}/cancel`, reason ? { reason } : {}),
  recreate: (id: string, body: Omit<CreateAuctionRequest, "productId" | "skuId">) => api.post<ApiResponse<AuctionSummary>>(`/api/v1/auctions/${idPath(id)}/recreate`, body),
  placeBid: (id: string, input: BidRequest, ifMatch: string, idempotencyKey = crypto.randomUUID()) => api.post(`/api/v1/auctions/${idPath(id)}/bids`, input, { headers: { "If-Match": ifMatch, "Idempotency-Key": idempotencyKey } }),
  history: (id: string, signal?: AbortSignal) => api.get<ApiResponse<AuctionStatusHistory>>(`/api/v1/auctions/${idPath(id)}/status-history`, { signal }),
  saga: (id: string, signal?: AbortSignal) => api.get<ApiResponse<AuctionSaga>>(`/api/v1/admin/auctions/${idPath(id)}/saga`, { signal }),
  forceCancel: (id: string, reason: string) => api.post(`/api/v1/admin/auctions/${idPath(id)}/force-cancel`, { reason }),
  configs: (signal?: AbortSignal) => api.get<ApiResponse<AuctionConfigList>>(`/api/v1/admin/auction-configs`, { signal }),
  updateConfig: (key: string, configValue: unknown, description?: string) => api.put<ApiResponse<AuctionConfig>>(`/api/v1/admin/auction-configs/${idPath(key)}`, { configValue, description }),
};
