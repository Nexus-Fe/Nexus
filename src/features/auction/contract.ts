import type { AuctionStatus } from "./types";
import type { AuctionSummary, PagedData, Pagination } from "./types";

const statusLabels = {
  ALL: "Tất cả",
  DRAFT: "Nháp",
  SCHEDULED: "Sắp diễn ra",
  RUNNING: "Đang diễn ra",
  ENDED: "Đã kết thúc",
  SETTLED: "Đã hoàn tất",
  FAILED: "Không thành công",
  CANCELLED: "Đã hủy",
} satisfies Record<AuctionStatus | "ALL", string>;

export function normalizeAuctionStatus(status: unknown): AuctionStatus | "ALL" | "" {
  if (typeof status !== "string") return "";
  const normalized = status.trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(statusLabels, normalized)
    ? normalized as AuctionStatus | "ALL"
    : "";
}

export function statusLabel(status: unknown): string {
  const normalized = normalizeAuctionStatus(status);
  return normalized ? statusLabels[normalized] : "Không rõ trạng thái";
}

const invalidList = (detail: string): never => {
  throw new Error(`Dữ liệu danh sách phiên đấu giá không hợp lệ (${detail}). Hãy tải lại danh sách; nếu vẫn lỗi, liên hệ hỗ trợ.`);
};
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const nullableText = (value: unknown): value is string | null => value === null || typeof value === "string";
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const amount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const date = (value: unknown): value is string => text(value) && Number.isFinite(Date.parse(value));

export function parseAuctionList(data: unknown): PagedData<AuctionSummary> {
  if (!record(data)) return invalidList("thiếu danh sách hoặc phân trang");
  if (!Array.isArray(data.items)) return invalidList("thiếu danh sách hoặc phân trang");
  if (!record(data.pagination)) return invalidList("thiếu danh sách hoặc phân trang");
  const pagination = data.pagination;
  if (!count(pagination.pageIndex) || !count(pagination.pageSize) || !count(pagination.totalCount) ||
    !count(pagination.totalPages) || typeof pagination.hasPreviousPage !== "boolean" ||
    typeof pagination.hasNextPage !== "boolean") return invalidList("phân trang sai định dạng");

  const items = data.items.map((item: unknown, index: number): AuctionSummary => {
    const row = index + 1;
    if (!record(item)) return invalidList(`dòng ${row} không phải phiên đấu giá`);
    if (!text(item.auctionId)) return invalidList(`dòng ${row} thiếu mã phiên auctionId`);
    const status = normalizeAuctionStatus(item.status);
    if (!status || status === "ALL") return invalidList(`dòng ${row} thiếu hoặc sai trạng thái status`);
    if (!text(item.productId) || !text(item.sellerId) || !nullableText(item.skuId) ||
      !nullableText(item.productName) || !nullableText(item.primaryImageUrl) ||
      !amount(item.startPriceAmount) || (item.currentPriceAmount !== null && !amount(item.currentPriceAmount)) ||
      !count(item.bidCount) || !date(item.scheduledStartAt) || !date(item.scheduledEndAt) ||
      !date(item.createdAt)) return invalidList(`dòng ${row} thiếu hoặc sai thông tin phiên`);
    return {
      auctionId: item.auctionId,
      productId: item.productId,
      skuId: item.skuId,
      sellerId: item.sellerId,
      productName: item.productName,
      primaryImageUrl: item.primaryImageUrl,
      status,
      startPriceAmount: item.startPriceAmount,
      currentPriceAmount: item.currentPriceAmount,
      bidCount: item.bidCount,
      scheduledStartAt: item.scheduledStartAt,
      scheduledEndAt: item.scheduledEndAt,
      createdAt: item.createdAt,
    };
  });

  return {
    items,
    pagination: {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      totalCount: pagination.totalCount,
      totalPages: pagination.totalPages,
      hasPreviousPage: pagination.hasPreviousPage,
      hasNextPage: pagination.hasNextPage,
    } satisfies Pagination,
  };
}
