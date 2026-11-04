import { api, type ApiResponse } from "@/lib/api/client";
import type { AuctionConfig, AuctionConfigList, AuctionDetail, AuctionResult, AuctionSaga, AuctionStatus, AuctionStatusHistory, AuctionSummary, BidItem, BidRequest, CreateAuctionRequest, MyBidItem, PagedData, UpdateAuctionRequest } from "../types";

const idPath = (id: string) => encodeURIComponent(id);
const unsupportedWrite = (): never => { throw new Error("Backend hiện tại chưa cung cấp thao tác ghi cho AuctionService."); };
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
  sellerList: (page = 1, status?: AuctionStatus | "ALL", signal?: AbortSignal) => api.get<ApiResponse<PagedData<AuctionSummary>>>(`/api/v1/auctions${query(page, 20, status)}`, { signal }),
  create: (_body: CreateAuctionRequest): Promise<ApiResponse<AuctionSummary>> => unsupportedWrite(),
  update: (_id: string, _body: UpdateAuctionRequest): Promise<ApiResponse<AuctionSummary>> => unsupportedWrite(),
  cancel: (_id: string, _reason?: string): Promise<void> => unsupportedWrite(),
  recreate: (_id: string, _body: Omit<CreateAuctionRequest, "productId" | "skuId">): Promise<ApiResponse<AuctionSummary>> => unsupportedWrite(),
  placeBid: (_id: string, _input: BidRequest, _ifMatch: string, _idempotencyKey?: string): Promise<void> => unsupportedWrite(),
  history: (_id: string, _signal?: AbortSignal): Promise<ApiResponse<AuctionStatusHistory>> => unsupportedWrite(),
  saga: (_id: string, _signal?: AbortSignal): Promise<ApiResponse<AuctionSaga>> => unsupportedWrite(),
  forceCancel: (_id: string, _reason: string): Promise<void> => unsupportedWrite(),
  configs: (_signal?: AbortSignal): Promise<ApiResponse<AuctionConfigList>> => unsupportedWrite(),
  updateConfig: (_key: string, _configValue: unknown, _description?: string): Promise<ApiResponse<AuctionConfig>> => unsupportedWrite(),
};
