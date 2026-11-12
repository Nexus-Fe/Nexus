import type { BidItem } from "./types";

export type RankedBidder = {
  bidderId: string;
  displayName: string;
  highestAmount: number;
  bidCount: number;
  isWinning: boolean;
};

/** Một người giữ một vị trí; các lượt cũ vẫn được giữ trong lịch sử riêng. */
export function rankBidders(bids: BidItem[]): RankedBidder[] {
  const uniqueBids = new Map(bids.map((bid) => [bid.bidId, bid]));
  const bidders = new Map<string, RankedBidder>();
  for (const bid of uniqueBids.values()) {
    if (bid.isInvalidated) continue;
    const bidderId = bid.bidderId.toLowerCase();
    const previous = bidders.get(bidderId);
    if (!previous) {
      bidders.set(bidderId, {
        bidderId,
        displayName: bid.bidderDisplayName,
        highestAmount: bid.amount,
        bidCount: 1,
        isWinning: false,
      });
      continue;
    }
    previous.bidCount += 1;
    if (bid.amount > previous.highestAmount) {
      previous.highestAmount = bid.amount;
      previous.displayName = bid.bidderDisplayName;
    }
  }
  const ranking = [...bidders.values()].sort((a, b) => b.highestAmount - a.highestAmount);
  if (ranking.length) ranking[0].isWinning = true;
  return ranking;
}
