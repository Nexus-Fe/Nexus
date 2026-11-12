import { api, unwrap, type ApiResponse } from "@/lib/api/client";

export type AuctionConfigDto = {
  configId: string;
  configKey: string;
  value: {
    antiSnipingExtensionMinutes?: number;
    maxExtensionCount?: number;
    defaultBidStepPercent?: number;
    [key: string]: unknown;
  };
  description?: string | null;
  version: number;
  isActive: boolean;
  updatedBy?: string | null;
  updatedAt: string;
};

export type AuctionConfigChangeDto = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type AuctionConfigHistoryItemDto = {
  configId: string;
  version: number;
  isActive: boolean;
  value: {
    antiSnipingExtensionMinutes?: number;
    maxExtensionCount?: number;
    defaultBidStepPercent?: number;
    [key: string]: unknown;
  };
  changes: AuctionConfigChangeDto[];
  updatedBy?: string | null;
  updatedAt: string;
};

export type PagedData<T> = {
  items: T[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type UpdateAuctionConfigRequest = {
  antiSnipingExtensionMinutes?: number | null;
  maxExtensionCount?: number | null;
  defaultBidStepPercent?: number | null;
};

const basePath = "/api/v1/admin/auction-configs";

export const adminAuctionConfigsService = {
  async list(page = 1, pageSize = 20, signal?: AbortSignal): Promise<PagedData<AuctionConfigDto>> {
    const response = await api.get<ApiResponse<PagedData<AuctionConfigDto>> | PagedData<AuctionConfigDto>>(
      `${basePath}?page=${page}&pageSize=${pageSize}`,
      { signal },
    );
    return unwrap(response);
  },

  async update(request: UpdateAuctionConfigRequest): Promise<AuctionConfigDto> {
    const response = await api.put<ApiResponse<AuctionConfigDto> | AuctionConfigDto>(
      basePath,
      request,
    );
    return unwrap(response);
  },

  async history(
    configKey: string,
    page = 1,
    pageSize = 20,
    signal?: AbortSignal,
  ): Promise<PagedData<AuctionConfigHistoryItemDto>> {
    const response = await api.get<
      ApiResponse<PagedData<AuctionConfigHistoryItemDto>> | PagedData<AuctionConfigHistoryItemDto>
    >(`${basePath}/${encodeURIComponent(configKey)}/history?page=${page}&pageSize=${pageSize}`, {
      signal,
    });
    return unwrap(response);
  },
};
