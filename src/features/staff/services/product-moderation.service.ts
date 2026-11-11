import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export type ProductModerationStatus =
  | "Draft"
  | "PendingApproval"
  | "Active"
  | "Rejected"
  | "Suspended";

export type AdminProductItem = {
  productId: string;
  sellerId: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  brand?: string | null;
  saleType: string;
  status: string;
  statusReason?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  primaryImageUrl?: string | null;
  createdAt: string;
  publishedAt?: string | null;
};

export type AdminProductSearchQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  statusReason?: string;
  categoryId?: string;
  sellerId?: string;
  saleType?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

export type AdminProductSearchPage = {
  items: AdminProductItem[];
  total: number;
  page: number;
  pageSize: number;
};

type ListPayload = {
  items: AdminProductItem[];
  pagination: { pageIndex: number; pageSize: number; totalCount: number };
};

export type ModerateProductPayload = {
  action: "APPROVE" | "REJECT" | "SUSPEND" | "UNLOCK";
  reason?: string;
  note?: string;
};

const basePath = "/api/v1/admin/products";

export const productModerationService = {
  async list(query: AdminProductSearchQuery = {}, signal?: AbortSignal): Promise<AdminProductSearchPage> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    });
    if (query.keyword) params.set("keyword", query.keyword.trim());
    if (query.status) params.set("status", query.status);
    if (query.statusReason) params.set("statusReason", query.statusReason);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    if (query.sellerId) params.set("sellerId", query.sellerId);
    if (query.saleType) params.set("saleType", query.saleType);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);

    const response = await api.get<ApiResponse<ListPayload> | ListPayload>(`${basePath}?${params}`, { signal });
    const payload = unwrap(response);
    const items = Array.isArray(payload) ? payload : (payload?.items ?? []);
    const total = Array.isArray(payload)
      ? payload.length
      : (payload?.pagination?.totalCount ?? (payload as unknown as { total?: number })?.total ?? items.length);
    const page = payload?.pagination?.pageIndex ?? (query.page ?? 1);
    const pageSize = payload?.pagination?.pageSize ?? (query.pageSize ?? 20);

    return { items, total, page, pageSize };
  },

  async moderate(id: string, payload: ModerateProductPayload): Promise<void> {
    await api.patch(`${basePath}/${encodeURIComponent(id)}/moderate`, payload);
  },
};
