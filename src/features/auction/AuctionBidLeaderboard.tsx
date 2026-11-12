"use client";

import { Badge, Card, NoData } from "@/components/ui/Primitives";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { rankBidders } from "./bid-leaderboard";
import { auctionService } from "./services/auction.service";
import type { BidItem } from "./types";

export function AuctionBidLeaderboard({ auctionId, recentBids = [] }: { auctionId: string; recentBids?: BidItem[] }) {
  const resource = useApiResource(`bid-leaderboard:${auctionId}`, (signal) => auctionService.allBids(auctionId, signal));
  const ranking = resource.data ? rankBidders([...resource.data, ...recentBids]) : null;
  return <Card className="card-pad auction-bid-leaderboard">
    <div className="auction-history-heading"><div><h2>Bảng xếp hạng người tham gia</h2><p>Mỗi người một vị trí theo mức giá hợp lệ cao nhất.</p></div><button type="button" className="button button-secondary button-small" disabled={resource.loading} onClick={resource.reload}>Cập nhật</button></div>
    {resource.error && <p className="notice" role="alert">Không tải được bảng xếp hạng: {resource.error.message}</p>}
    {resource.loading && !resource.data ? <NoData title="Đang tải bảng xếp hạng…" /> : ranking?.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Hạng</th><th>Người tham gia</th><th>Giá cao nhất</th><th>Lượt đặt</th><th>Trạng thái</th></tr></thead><tbody>{ranking.map((bidder, index) => <tr key={bidder.bidderId}><td>{index + 1}</td><td>{bidder.displayName}</td><td><strong>{formatMoney(bidder.highestAmount)}</strong></td><td>{bidder.bidCount}</td><td>{bidder.isWinning && <Badge tone="green">Giá cao nhất</Badge>}</td></tr>)}</tbody></table></div> : !resource.error && <NoData title="Chưa có người đặt giá" />}
  </Card>;
}
