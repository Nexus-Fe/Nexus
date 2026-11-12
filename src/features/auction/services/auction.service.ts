import { api, ApiError, unwrap, type ApiResponse } from "@/lib/api/client";
import type { AuctionDetail, AuctionResult, AuctionSaga, AuctionStatus, AuctionSummary, BidItem, BidRequest, CreateAuctionRequest, MyBidItem, PagedData, PlaceBidResponse, UpdateAuctionRequest, WinnerOffer } from "../types";
import { parseAuctionList } from "../contract";

const idPath = (id: string) => encodeURIComponent(id);
const envelope = <T>(data: T): ApiResponse<T> => ({ success: true, statusCode: 200, data });
const query = (page: number, pageSize: number, status?: AuctionStatus | "ALL") => `?page=${page}&pageSize=${pageSize}${status && status !== "ALL" ? `&status=${status}` : ""}`;
type Settlement = { sellerId: string; orderId: string | null; paymentDeadlineAt: string | null; paidAt: string | null };
export type AuctionSettlementRow = { auctionId: string; productTitle: string; finalPriceAmount: number | null; settlementStatus: string; status: string; winnerId: string | null; orderId: string | null; paymentDeadlineAt: string | null; paidAt: string | null; determinedAt: string };

async function auctionList(path: string, signal?: AbortSignal): Promise<ApiResponse<PagedData<AuctionSummary>>> {
  const response = await api.get<ApiResponse<unknown> | unknown>(path, { signal });
  return envelope(parseAuctionList(unwrap(response)));
}

export const auctionService = {
  list: (page = 1, pageSize = 20, status?: AuctionStatus | "ALL", signal?: AbortSignal) => auctionList(`/api/v1/auctions${query(page, pageSize, status)}`, signal),
  sellerList: (page = 1, status?: AuctionStatus | "ALL", signal?: AbortSignal) => auctionList(`/api/v1/seller/auctions${query(page, 20, status)}`, signal),
  detail: async (id: string, signal?: AbortSignal) => {
    const response = await api.getWithMetadata<ApiResponse<AuctionDetail> | AuctionDetail>(`/api/v1/auctions/${idPath(id)}`, { signal });
    const auction = unwrap(response.data);
    if (auction.auctionId?.toLowerCase() !== id.toLowerCase()) throw new Error("Thông tin phiên không khớp mã đã chọn. Hãy tải lại trang.");
    return { ...response, data: envelope(auction) };
  },
  bids: async (id: string, page = 1, signal?: AbortSignal) => envelope(unwrap(await api.get<ApiResponse<PagedData<BidItem>> | PagedData<BidItem>>(`/api/v1/auctions/${idPath(id)}/bids${query(page, 20)}`, { signal }))),
  allBids: async (id: string, signal?: AbortSignal): Promise<BidItem[]> => {
    const readPage = async (page: number) => unwrap(await api.get<ApiResponse<PagedData<BidItem>> | PagedData<BidItem>>(`/api/v1/auctions/${idPath(id)}/bids?page=${page}&pageSize=100`, { signal }));
    const first = await readPage(1);
    const byBidId = new Map(first.items.map((bid) => [bid.bidId, bid]));
    for (let firstPage = 2; firstPage <= first.pagination.totalPages; firstPage += 4) {
      const pages = await Promise.all(Array.from({ length: Math.min(4, first.pagination.totalPages - firstPage + 1) }, (_, index) => readPage(firstPage + index)));
      for (const page of pages) for (const bid of page.items) byBidId.set(bid.bidId, bid);
    }
    return [...byBidId.values()];
  },
  myBids: async (page = 1, signal?: AbortSignal) => envelope(unwrap(await api.get<ApiResponse<PagedData<MyBidItem>> | PagedData<MyBidItem>>(`/api/v1/me/bids${query(page, 20)}`, { signal }))),
  myOffers: async (page = 1, signal?: AbortSignal) => envelope(unwrap(await api.get<ApiResponse<PagedData<WinnerOffer>> | PagedData<WinnerOffer>>(`/api/v1/me/auction-offers${query(page, 20)}`, { signal }))),
  settlements: async (page = 1, status = "", determinedFrom = "", signal?: AbortSignal) => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (status) params.set("status", status);
    if (determinedFrom) params.set("determinedFrom", new Date(`${determinedFrom}T00:00:00`).toISOString());
    return unwrap(await api.get<ApiResponse<PagedData<AuctionSettlementRow>> | PagedData<AuctionSettlementRow>>(`/api/v1/auction-settlements?${params}`, { signal }));
  },
  acceptOffer: (id: string, offerId: string) => api.post(`/api/v1/auctions/${idPath(id)}/winner-offers/${idPath(offerId)}/accept`),
  declineOffer: (id: string, offerId: string, reason?: string) => api.post(`/api/v1/auctions/${idPath(id)}/winner-offers/${idPath(offerId)}/decline`, { reason }),
  result: async (id: string, signal?: AbortSignal): Promise<ApiResponse<AuctionResult>> => {
    const result = unwrap(await api.get<ApiResponse<Pick<AuctionResult, "auctionId" | "status" | "winnerId" | "winningBidId" | "finalPriceAmount" | "determinedAt">> | Pick<AuctionResult, "auctionId" | "status" | "winnerId" | "winningBidId" | "finalPriceAmount" | "determinedAt">>(`/api/v1/auctions/${idPath(id)}/result`, { signal }));
    let settlement: Settlement | null = null;
    if (result.winnerId) {
      try { settlement = unwrap(await api.get<ApiResponse<Settlement> | Settlement>(`/api/v1/auctions/${idPath(id)}/settlement`, { signal })); }
      catch (cause) { if (!(cause instanceof ApiError && cause.status === 404)) throw cause; }
    }
    return envelope({ ...result, hasWinner: Boolean(result.winnerId), winnerDisplayName: null, sellerId: settlement?.sellerId ?? "", orderId: settlement?.orderId ?? null, paymentDeadlineAt: settlement?.paymentDeadlineAt ?? null, paidAt: settlement?.paidAt ?? null });
  },
  create: async (body: CreateAuctionRequest) => envelope(unwrap(await api.post<ApiResponse<{ auctionId: string }> | { auctionId: string }>("/api/v1/auctions", body))),
  update: async (id: string, body: UpdateAuctionRequest) => envelope(unwrap(await api.put<ApiResponse<{ auctionId: string }> | { auctionId: string }>(`/api/v1/auctions/${idPath(id)}`, body))),
  cancel: (id: string, reason?: string) => api.post(`/api/v1/auctions/${idPath(id)}/cancel`, reason ? { reason } : {}),
  recreate: async (id: string, body: Omit<CreateAuctionRequest, "skuId">) => envelope(unwrap(await api.post<ApiResponse<{ auctionId: string }> | { auctionId: string }>(`/api/v1/auctions/${idPath(id)}/recreate`, body))),
  placeBid: async (id: string, input: BidRequest, ifMatch: string, idempotencyKey = crypto.randomUUID()): Promise<PlaceBidResponse> => unwrap(await api.post<ApiResponse<PlaceBidResponse> | PlaceBidResponse>(`/api/v1/auctions/${idPath(id)}/bids`, input, { headers: { "If-Match": ifMatch, "Idempotency-Key": idempotencyKey } })),
  history: async (id: string, page = 1, signal?: AbortSignal) => envelope(unwrap(await api.get<ApiResponse<PagedData<{ historyId: string; changedAt: string; toStatus: string; reason: string | null }>> | PagedData<{ historyId: string; changedAt: string; toStatus: string; reason: string | null }>>(`/api/v1/auctions/${idPath(id)}/status-history?page=${page}&pageSize=50`, { signal }))),
  saga: async (id: string, signal?: AbortSignal): Promise<ApiResponse<AuctionSaga>> => envelope(unwrap(await api.get<ApiResponse<AuctionSaga> | AuctionSaga>(`/api/v1/admin/auctions/${idPath(id)}/saga`, { signal }))),
  forceCancel: (id: string, reason: string) => api.post(`/api/v1/admin/auctions/${idPath(id)}/force-cancel`, { reason }),
};
