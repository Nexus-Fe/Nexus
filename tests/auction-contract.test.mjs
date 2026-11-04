import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAuctionStatus, parseAuctionList, statusLabel } from "../src/features/auction/contract.ts";

const item = {
  auctionId: "11111111-1111-1111-1111-111111111111",
  productId: "22222222-2222-2222-2222-222222222222",
  skuId: null,
  sellerId: "33333333-3333-3333-3333-333333333333",
  productName: null,
  primaryImageUrl: null,
  status: "Running",
  startPriceAmount: 100_000,
  currentPriceAmount: null,
  bidCount: 0,
  scheduledStartAt: "2026-11-04T10:00:00Z",
  scheduledEndAt: "2026-11-05T10:00:00Z",
  createdAt: "2026-11-03T10:00:00Z",
};
const pagination = { pageIndex: 1, pageSize: 20, totalCount: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false };
const payload = (row) => ({ items: [row], pagination });

test("accepts current DTO, nullable fields and PascalCase enum values", () => {
  const parsed = parseAuctionList(payload(item));
  assert.equal(parsed.items[0].status, "RUNNING");
  assert.equal(parsed.items[0].skuId, null);
  assert.equal(parsed.items[0].productName, null);
  assert.equal(statusLabel(parsed.items[0].status), "Đang diễn ra");
});

test("accepts an empty page", () => {
  assert.deepEqual(parseAuctionList({ items: [], pagination: { ...pagination, totalCount: 0, totalPages: 0 } }).items, []);
});

test("rejects missing, null, non-string and unknown statuses before rendering", () => {
  for (const status of [undefined, null, 1, "Unknown", "ALL"]) {
    assert.throws(() => parseAuctionList(payload({ ...item, status })), /dòng 1 thiếu hoặc sai trạng thái status/);
  }
  assert.equal(normalizeAuctionStatus(undefined), "");
  assert.equal(normalizeAuctionStatus(null), "");
  assert.equal(statusLabel(undefined), "Không rõ trạng thái");
});

test("rejects the old DTO and malformed list structure with a clear error", () => {
  assert.throws(() => parseAuctionList(payload({ id: item.auctionId, title: "Old auction" })), /thiếu mã phiên auctionId/);
  assert.throws(() => parseAuctionList(payload({ ...item, auctionId: undefined })), /thiếu mã phiên auctionId/);
  assert.throws(() => parseAuctionList({ items: null, pagination }), /thiếu danh sách hoặc phân trang/);
  assert.throws(() => parseAuctionList(payload({ ...item, scheduledEndAt: "not-a-date" })), /thiếu hoặc sai thông tin phiên/);
});
