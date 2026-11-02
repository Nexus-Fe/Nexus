import { api, type ApiResponse } from "@/lib/api/client";

export type SellerRegistration = {
  registrationId: string;
  userId?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string | null;
  shopName: string;
  businessEmail?: string | null;
  hotline?: string | null;
  identityCardNumber?: string | null;
  warehouseAddress?: string | null;
  pickupAddress?: string | null;
  status: string;
  createdAt?: string;
  submittedAt?: string;
  rejectionReason?: string | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
  businessLicenseUrl?: string | null;
};

export type SellerRegistrationPage = { items: SellerRegistration[]; total: number; page: number; limit: number };

type ListPayload = { items: SellerRegistration[]; pagination: { pageIndex: number; pageSize: number; totalCount: number } };

function unwrap<T>(response: ApiResponse<T> | T): T {
  return response && typeof response === "object" && "data" in response ? response.data : response;
}

const basePath = "/api/v1/admin/seller-registrations";
const detailPath = (id: string) => `${basePath}/${encodeURIComponent(id)}`;

export const sellerRegistrationsService = {
  async list(query: { page: number; limit: number; status: string }, signal?: AbortSignal): Promise<SellerRegistrationPage> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.limit) });
    if (query.status) params.set("status", query.status);
    const response = await api.get<ApiResponse<ListPayload> | ListPayload>(`${basePath}?${params}`, { signal });
    const payload = unwrap(response);
    return { items: payload.items ?? [], total: payload.pagination?.totalCount ?? 0, page: payload.pagination?.pageIndex ?? query.page, limit: payload.pagination?.pageSize ?? query.limit };
  },
  async detail(id: string, signal?: AbortSignal): Promise<SellerRegistration> {
    const response = await api.get<ApiResponse<SellerRegistration> | SellerRegistration>(detailPath(id), { signal });
    return unwrap(response);
  },
  async approve(id: string): Promise<void> {
    await api.put<ApiResponse<{ status: string }>>(`${detailPath(id)}/approve`, {});
  },
  async reject(id: string, rejectionReason: string): Promise<void> {
    await api.put<ApiResponse<{ status: string }>>(`${detailPath(id)}/reject`, { rejectionReason });
  },
};
