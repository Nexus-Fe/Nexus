import assert from "node:assert/strict";
import test from "node:test";
import { rankBidders } from "../src/features/auction/bid-leaderboard.ts";

const bid = (bidId, bidderId, amount, overrides = {}) => ({
  bidId, bidderId, bidderDisplayName: `Người ${bidderId}`,
  amount, sequenceNo: Number(bidId), placedAt: "2026-11-13T00:00:00Z",
  isWinning: false, isOutbid: true, isInvalidated: false, ...overrides,
});

test("one bidder occupies one ranking position across multiple bids", () => {
  const ranking = rankBidders([
    bid("1", "BUYER-A", 100),
    bid("2", "buyer-b", 150),
    bid("3", "buyer-a", 200),
    bid("3", "buyer-a", 200), // same bid from a refreshed history page
  ]);
  assert.deepEqual(ranking.map(({ bidderId, highestAmount, bidCount }) => ({ bidderId, highestAmount, bidCount })), [
    { bidderId: "buyer-a", highestAmount: 200, bidCount: 2 },
    { bidderId: "buyer-b", highestAmount: 150, bidCount: 1 },
  ]);
  assert.equal(ranking.filter((entry) => entry.isWinning).length, 1);
});

test("invalidated bids do not appear in the ranking", () => {
  const ranking = rankBidders([bid("1", "buyer-a", 100), bid("2", "buyer-b", 300, { isInvalidated: true })]);
  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].bidderId, "buyer-a");
});
