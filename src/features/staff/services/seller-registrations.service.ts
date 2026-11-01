import { api, type ApiResponse } from "@/lib/api/client";
import { staffAdminDemoEnabled } from "@/lib/demo/staff-admin-demo";

export type SellerRegistration = {
  registrationId: string;
  userId?: string;
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

type ListPayload = { items?: SellerRegistration[]; registrations?: SellerRegistration[]; total?: number; page?: number; limit?: number };

const basePath = "/api/v1/admin/seller-registrations";
const detailPath = (id: string) => `${basePath}/${encodeURIComponent(id)}`;

export const sellerRegistrationsService = {
  async list(query: { page: number; limit: number; status: string }, signal?: AbortSignal): Promise<SellerRegistrationPage> {
    if (staffAdminDemoEnabled) return (await import("../demo/seller-registrations-demo")).sellerRegistrationsDemo.list(query);
    const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
    if (query.status) params.set("status", query.status);
    const response = await api.get<ApiResponse<ListPayload>>(`${basePath}?${params}`, { signal });
    const payload = response.data;
    return { items: payload.items ?? payload.registrations ?? [], total: payload.total ?? 0, page: payload.page ?? query.page, limit: payload.limit ?? query.limit };
  },
  async detail(id: string, signal?: AbortSignal): Promise<SellerRegistration> {
    if (staffAdminDemoEnabled) return (await import("../demo/seller-registrations-demo")).sellerRegistrationsDemo.detail(id);
    const response = await api.get<ApiResponse<SellerRegistration>>(detailPath(id), { signal });
    return response.data;
  },
  async approve(id: string): Promise<void> {
    if (staffAdminDemoEnabled) return (await import("../demo/seller-registrations-demo")).sellerRegistrationsDemo.approve(id);
    await api.put<ApiResponse<{ status: string }>>(`${detailPath(id)}/approve`, {});
  },
  async reject(id: string, rejectionReason: string): Promise<void> {
    if (staffAdminDemoEnabled) return (await import("../demo/seller-registrations-demo")).sellerRegistrationsDemo.reject(id, rejectionReason);
    await api.put<ApiResponse<{ status: string }>>(`${detailPath(id)}/reject`, { rejectionReason });
  },
};
