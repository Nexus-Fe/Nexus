import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export type AuctionOrderDetail = {
  id: string; orderNo: string; auctionId: string; productName: string;
  winningAmount: number; shippingFeeAmount: number | null; totalAmount: number | null;
  status: string; paymentDeadlineAt: string; sellerRespondDeadlineAt: string | null;
  paidAt: string | null; shippedAt: string | null; deliveredAt: string | null;
};
export type AuctionOrderSummary = Pick<AuctionOrderDetail, "id" | "orderNo" | "auctionId" | "productName" | "winningAmount" | "totalAmount" | "status" | "paymentDeadlineAt">;
export type ShippingAddress = { fullName: string; phoneNumber: string; addressLine: string; provinceName: string; districtName: string; wardName: string; ghnDistrictId: number; ghnWardCode: string };
type SellerOrdersPage = { items: AuctionOrderSummary[]; pageIndex: number; pageSize: number; totalCount: number; totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean };
const path = (id: string) => `/api/v1/auction-orders/${encodeURIComponent(id)}`;

export const auctionOrderService = {
  detail: async (id: string, signal?: AbortSignal) => unwrap(await api.get<ApiResponse<AuctionOrderDetail> | AuctionOrderDetail>(path(id), { signal })),
  sellerList: async (page = 1, signal?: AbortSignal) => unwrap(await api.get<ApiResponse<SellerOrdersPage> | SellerOrdersPage>(`/api/v1/auction-orders/seller?page=${page}&pageSize=10`, { signal })),
  submitShipping: (id: string, address: ShippingAddress) => api.put(`${path(id)}/shipping`, { shippingAddress: address, contactPhone: address.phoneNumber }),
  pay: async (id: string) => unwrap(await api.post<ApiResponse<{ status: string }> | { status: string }>(`${path(id)}/pay`)),
  accept: (id: string) => api.post(`${path(id)}/accept`, { note: null }),
  reject: (id: string, reasonNote: string) => api.post(`${path(id)}/reject`, { reasonNote, reasonCode: "SellerRejected" }),
  confirmReceipt: (id: string) => api.post(`${path(id)}/confirm-receipt`),
};
