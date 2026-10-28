"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "@/components/auth/SessionProvider";
import { BackendImage } from "@/components/ui/BackendImage";
import { Icon } from "@/components/ui/Icon";
import { Badge, ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { ApiError } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import { AuctionOrderPayment } from "@/widgets/payment/AuctionOrderPayment";
import { auctionService } from "./services/auction.service";
import type { AuctionStatus, AuctionSummary, Pagination } from "./types";
import { isAuctionId } from "./validation";

export const auctionStatuses: (AuctionStatus | "ALL")[] = ["ALL", "RUNNING", "SCHEDULED", "DRAFT", "ENDED", "SETTLED", "FAILED", "CANCELLED"];
export const statusLabel = (status: AuctionStatus | "ALL") => ({ ALL: "Tất cả", DRAFT: "Nháp", SCHEDULED: "Sắp diễn ra", RUNNING: "Đang diễn ra", ENDED: "Đã kết thúc", SETTLED: "Đã hoàn tất", FAILED: "Không thành công", CANCELLED: "Đã hủy" })[status];
export const dateText = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa có dữ liệu";
export const message = (error: Error | null) => error instanceof ApiError && error.status === 503 ? "Dịch vụ đấu giá hiện không khả dụng. Vui lòng thử lại sau." : error?.message ?? "";

export function PaginationBar({ pagination, page, setPage }: { pagination?: Pagination; page: number; setPage: (page: number) => void }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return <nav className="auction-pagination" aria-label="Trang kết quả"><button type="button" disabled={!pagination.hasPreviousPage} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {pagination.pageIndex} / {pagination.totalPages}</span><button type="button" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}>Trang sau</button></nav>;
}

export function StatusFilter({ status, setStatus }: { status: AuctionStatus | "ALL"; setStatus: (status: AuctionStatus | "ALL") => void }) {
  return <div className="auction-filters" role="group" aria-label="Lọc trạng thái phiên">{auctionStatuses.map((option) => <button key={option} type="button" className={status === option ? "active" : ""} aria-pressed={status === option} onClick={() => setStatus(option)}>{statusLabel(option)}</button>)}</div>;
}

export function AuctionTile({ auction, href }: { auction: AuctionSummary; href: string }) {
  return <Link href={href} className="auction-tile"><div className="auction-tile-image"><BackendImage src={resolveImageUrl(auction.primaryImageUrl)} alt={auction.productName} compact /><Badge tone={auction.status === "RUNNING" ? "green" : "slate"}>{statusLabel(auction.status)}</Badge></div><div className="auction-tile-body"><h3>{auction.productName}</h3><p>{auction.status === "RUNNING" ? <>Còn lại: <Countdown end={auction.scheduledEndAt} /></> : `Kết thúc ${dateText(auction.scheduledEndAt)}`}</p><div><span>Giá hiện tại<strong>{formatMoney(auction.currentPriceAmount ?? auction.startPriceAmount)}</strong></span><span>{auction.bidCount} lượt đặt giá</span></div></div></Link>;
}

function FeaturedAuction({ auction }: { auction: AuctionSummary }) {
  return <article className="auction-featured">
    <div className="auction-featured-image"><BackendImage src={resolveImageUrl(auction.primaryImageUrl)} alt={auction.productName} /><Badge tone="green">Đang diễn ra</Badge></div>
    <div className="auction-featured-content">
      <p className="auction-featured-kicker">Phiên đang được quan tâm</p>
      <h2>{auction.productName}</h2>
      <div className="auction-featured-metrics">
        <div><span>Giá hiện tại</span><strong>{formatMoney(auction.currentPriceAmount ?? auction.startPriceAmount)}</strong></div>
        <div><span>Lượt đặt giá</span><strong>{auction.bidCount}</strong></div>
      </div>
      <p>Còn lại: <Countdown end={auction.scheduledEndAt} /></p>
      <ButtonLink href={ROUTES.auction.room(auction.auctionId)}>Vào phòng đấu giá</ButtonLink>
    </div>
  </article>;
}

export function AuctionListScreen() {
  const [status, setStatus] = useState<AuctionStatus | "ALL">("RUNNING");
  const [page, setPage] = useState(1);
  const resource = useApiResource(`auctions:${page}:${status}`, (signal) => auctionService.list(page, 12, status, signal).then((response) => response.data));
  const featured = page === 1 ? resource.data?.items.find((auction) => auction.status === "RUNNING") : undefined;
  const tiles = resource.data?.items.filter((auction) => auction.auctionId !== featured?.auctionId) ?? [];
  return <div className="auction-surface"><section className="hero auction-hero"><div className="hero-copy"><p className="overline">Nexus Auction</p><h1>Khám phá phiên đang diễn ra</h1><p>Theo dõi giá và thời hạn của từng phiên. Chọn một phiên để xem chi tiết và tham gia.</p><div className="action-row"><ButtonLink href={ROUTES.buyer.auctions}>Đấu giá của tôi</ButtonLink></div></div><div className="hero-visual" aria-hidden="true"><span className="hero-orbit hero-orbit-one"/><span className="hero-orbit hero-orbit-two"/><span className="hero-icon"><Icon name="gavel" size={58}/></span></div></section>{featured && <FeaturedAuction auction={featured} />}<SectionHeading title="Danh sách phiên" hint="Dữ liệu được tải trực tiếp từ Auction Service." /><StatusFilter status={status} setStatus={(next) => { setStatus(next); setPage(1); }} />{resource.error && <p role="alert" className="notice">{message(resource.error)}</p>}{resource.loading ? <NoData title="Đang tải phiên đấu giá…" /> : tiles.length ? <div className="auction-list-grid">{tiles.map((auction) => <AuctionTile key={auction.auctionId} auction={auction} href={ROUTES.auction.room(auction.auctionId)} />)}</div> : resource.data?.items.length ? null : <NoData title={resource.error ? "Không tải được danh sách phiên" : "Chưa có phiên ở trạng thái này"} />}<PaginationBar pagination={resource.data?.pagination} page={page} setPage={setPage} /></div>;
}

function useAuctionId() { return String(useParams<{ id: string }>().id ?? ""); }
function useClock() { const [now, setNow] = useState(0); useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []); return now; }
function Countdown({ end }: { end: string }) { const now = useClock(); const remaining = Math.max(0, new Date(end).getTime() - now); const hours = Math.floor(remaining / 3600000); const minutes = Math.floor(remaining / 60000) % 60; const seconds = Math.floor(remaining / 1000) % 60; return <time dateTime={end}>{now ? remaining ? `${hours} giờ ${minutes} phút ${seconds} giây` : "Đã hết giờ" : "Đang cập nhật…"}</time>; }

export function AuctionRoomScreen() {
  const id = useAuctionId(); const { user } = useSession(); const now = useClock(); const canBid = Boolean(user?.roles?.some((role) => /^(buyer|customer)$/i.test(role)) || /^(buyer|customer)$/i.test(user?.role ?? ""));
  const detail = useApiResource(isAuctionId(id) ? `auction:${id}` : null, (signal) => auctionService.detail(id, signal).then(({ data, headers }) => ({ auction: data.data, version: headers.get("etag") })));
  const bids = useApiResource(isAuctionId(id) ? `bids:${id}` : null, (signal) => auctionService.bids(id, 1, signal).then((response) => response.data));
  const reloadDetail = detail.reload; const reloadBids = bids.reload;
  useEffect(() => { if (!isAuctionId(id)) return; const timer = window.setInterval(() => { if (document.visibilityState === "visible") { reloadDetail(); reloadBids(); } }, 5000); return () => window.clearInterval(timer); }, [id, reloadDetail, reloadBids]);
  const [amount, setAmount] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const auction = detail.data?.auction; const active = Boolean(now && auction?.status === "RUNNING" && new Date(auction.scheduledEndAt).getTime() > now);
  async function submit(event: FormEvent) { event.preventDefault(); if (!detail.data?.version) { setError("Phiên đấu giá chưa có mã phiên bản để đặt giá an toàn."); return; } setBusy(true); setError(""); setSuccess(""); try { await auctionService.placeBid(id, { amount: Number(amount) }, detail.data.version); setSuccess("Giá đặt đã được ghi nhận. Đang cập nhật phiên."); setAmount(""); detail.reload(); bids.reload(); } catch (cause) { setError(message(cause as Error)); } finally { setBusy(false); } }
  if (!isAuctionId(id)) return <NoData title="Mã phiên đấu giá không hợp lệ" />;
  return <div className="auction-surface"><div className="crumbs"><Link href={ROUTES.auction.index}>Đấu giá</Link><span>›</span><span>Phòng đấu giá</span></div><PageHeading title={auction?.productName ?? "Phòng đấu giá"} description={auction ? `Phiên ${auction.auctionId}` : "Đang tải thông tin phiên đấu giá"} />{detail.error && <p role="alert" className="notice">{message(detail.error)}</p>}{error && <p role="alert" className="notice">{error}</p>}{success && <p role="status" className="form-success">{success}</p>}{detail.loading && !auction ? <NoData title="Đang tải phiên đấu giá…" /> : auction ? <div className="auction-room-grid"><Card className="card-pad"><div className="auction-detail-image"><BackendImage src={resolveImageUrl(auction.images?.find((image) => image.isPrimary)?.url ?? auction.primaryImageUrl)} alt={auction.productName} /></div><h2>{auction.productName}</h2><p>{auction.description}</p><div className="auction-facts"><span>Trạng thái <strong>{statusLabel(auction.status)}</strong></span><span>Người dẫn đầu <strong>{auction.leadingBidderDisplayName ?? "Chưa có"}</strong></span><span>Số lượt đặt giá <strong>{auction.bidCount}</strong></span><span>Kết thúc <strong>{dateText(auction.scheduledEndAt)}</strong></span></div></Card><div className="mini-list"><Card className="card-pad auction-bid-panel"><Badge tone={active ? "green" : "slate"}>{statusLabel(auction.status)}</Badge><p>Giá hiện tại</p><strong className="auction-live-price">{formatMoney(auction.currentPriceAmount ?? auction.startPriceAmount)}</strong><p>Còn lại: <Countdown end={auction.scheduledEndAt} /></p><div className="info-row"><span>Bước giá</span><strong>{formatMoney(auction.bidStepAmount)}</strong></div><div className="info-row"><span>Điểm uy tín tối thiểu</span><strong>{auction.minReputationToBid}</strong></div><p>Bid sát giờ có thể gia hạn {auction.antiSnipingExtensionMinutes} phút, tối đa {auction.maxExtensionCount} lần. Đã gia hạn {auction.extensionCount} lần.</p><form onSubmit={(event) => void submit(event)}><label className="field-wrap">Giá bạn đặt<input className="field" type="number" min={(auction.currentPriceAmount ?? auction.startPriceAmount) + auction.bidStepAmount} step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label><button className="button button-primary" disabled={!active || !canBid || !detail.data?.version || busy}>Đặt giá</button></form>{!user && <p>Đăng nhập để đặt giá.</p>}{user && !canBid && <p>Chỉ tài khoản người mua có thể đặt giá.</p>}{active && !detail.data?.version && <p role="status">Backend chưa cung cấp ETag cho phiên này.</p>}</Card><Card className="card-pad"><h2>Lịch sử đặt giá</h2>{bids.error && <p role="alert">{message(bids.error)}</p>}{bids.data?.items.length ? <ol className="auction-bids">{bids.data.items.map((bid) => <li key={bid.bidId}><span>{bid.bidderDisplayName}<small>{dateText(bid.placedAt)} · {bid.isInvalidated ? "Không hợp lệ" : bid.isWinning ? "Đang dẫn đầu" : bid.isOutbid ? "Đã bị vượt giá" : "Đã ghi nhận"}</small></span><strong>{formatMoney(bid.amount)}</strong></li>)}</ol> : <NoData title={bids.loading ? "Đang tải lịch sử…" : "Chưa có lượt đặt giá"} />}</Card></div></div> : <NoData title="Không có thông tin phiên đấu giá" />}</div>;
}

export function MyAuctionsScreen() { const [status, setStatus] = useState<AuctionStatus | "ALL">("ALL"); const [page, setPage] = useState(1); const resource = useApiResource(`my-bids:${page}:${status}`, (signal) => auctionService.myBids(page, status, signal).then((response) => response.data)); return <div className="auction-surface"><PageHeading title="Đấu giá của tôi" description="Theo dõi những phiên bạn đã tham gia và kết quả sau khi kết thúc." /><StatusFilter status={status} setStatus={(next) => { setStatus(next); setPage(1); }} />{resource.error && <p role="alert" className="notice">{message(resource.error)}</p>}{resource.loading ? <NoData title="Đang tải phiên của bạn…" /> : resource.data?.items.length ? <div className="auction-list-grid">{resource.data.items.map((item) => <Card className="card-pad" key={item.auctionId}><h2>{item.productName}</h2><Badge tone={item.isLeading ? "green" : "slate"}>{item.isLeading ? "Đang dẫn đầu" : statusLabel(item.auctionStatus)}</Badge><div className="info-row"><span>Giá cao nhất của bạn</span><strong>{formatMoney(item.myHighestBidAmount)}</strong></div><div className="info-row"><span>Giá hiện tại</span><strong>{formatMoney(item.currentPriceAmount)}</strong></div><p>Kết thúc {dateText(item.endsAt)}</p><div className="action-row"><ButtonLink href={ROUTES.auction.room(item.auctionId)} small>Xem phiên</ButtonLink><ButtonLink href={ROUTES.buyer.auctionResult(item.auctionId)} variant="secondary" small>Kết quả</ButtonLink></div></Card>)}</div> : <NoData title={resource.error ? "Không tải được phiên của bạn" : "Bạn chưa tham gia phiên nào"} />}<PaginationBar pagination={resource.data?.pagination} page={page} setPage={setPage} /></div>; }

export function BuyerAuctionResultScreen({ payment = false }: { payment?: boolean }) { const id = useAuctionId(); const { user } = useSession(); const now = useClock(); const resource = useApiResource(isAuctionId(id) ? `result:${id}` : null, (signal) => auctionService.result(id, signal).then((response) => response.data)); const result = resource.data; const won = Boolean(result?.hasWinner && result.winnerId === user?.id); const deadlinePassed = Boolean(now && result?.paymentDeadlineAt && new Date(result.paymentDeadlineAt).getTime() < now); return <div className="auction-surface"><PageHeading title={payment ? "Thanh toán đơn đấu giá" : "Kết quả đấu giá"} description={`Phiên ${id}`} />{resource.error && <p role="alert" className="notice">{message(resource.error)}</p>}{resource.loading ? <NoData title="Đang tải kết quả…" /> : result ? <div className="split"><Card className="card-pad"><Badge tone={won ? "green" : "slate"}>{statusLabel(result.status)}</Badge><h2>{result.hasWinner ? won ? "Bạn đã thắng phiên này" : "Phiên đã có người thắng" : "Phiên chưa có người thắng"}</h2><div className="info-row"><span>Giá cuối</span><strong>{formatMoney(result.finalPriceAmount)}</strong></div><div className="info-row"><span>Thời điểm xác định</span><strong>{dateText(result.determinedAt)}</strong></div>{result.paymentDeadlineAt && <div className="info-row"><span>Hạn thanh toán</span><strong>{dateText(result.paymentDeadlineAt)}</strong></div>}{result.paidAt && <p>Đã thanh toán lúc {dateText(result.paidAt)}.</p>}{won && deadlinePassed && !result.paidAt && <p role="status">Đã quá hạn thanh toán. Vui lòng xem trạng thái đơn hàng.</p>}</Card><Card className="card-pad"><h2>Bước tiếp theo</h2>{won && result.orderId ? <><p>Đơn hàng thắng đấu giá đã được tạo. Kiểm tra số tiền, trạng thái và phương thức thanh toán trong chi tiết đơn hàng.</p>{payment && <><div className="info-row"><span>Thời hạn</span><strong>{deadlinePassed ? "Đã quá hạn" : result.paymentDeadlineAt ? <Countdown end={result.paymentDeadlineAt} /> : "Đang chờ cập nhật"}</strong></div><p>Thanh toán trước hạn hiển thị ở trên. Tổng tiền được lấy từ đơn hàng; bạn sẽ được chuyển sang cổng VNPay sau khi tạo phiên thanh toán.</p><AuctionOrderPayment auctionId={id} orderId={result.orderId} deadlinePassed={deadlinePassed} /><ButtonLink href={ROUTES.buyer.wallet} variant="secondary">Kiểm tra Ví Nexus</ButtonLink></>}<ButtonLink href={ROUTES.buyer.order(result.orderId)}>Xem chi tiết đơn hàng</ButtonLink>{!payment && <ButtonLink href={ROUTES.buyer.auctionPayment(id)} variant="secondary">Thông tin thanh toán</ButtonLink>}</> : <p>{won ? "Đơn hàng thắng đấu giá đang được tạo. Vui lòng tải lại kết quả sau." : result.hasWinner ? payment ? "Chỉ người thắng có thể thanh toán phiên này." : "Bạn không thắng phiên này. Xem các phiên khác để tiếp tục tham gia." : "Kết quả sẽ được cập nhật sau khi phiên kết thúc."}</p>}<div className="action-row"><ButtonLink href={ROUTES.buyer.auctions} variant="secondary">Đấu giá của tôi</ButtonLink></div></Card></div> : <NoData title="Chưa có kết quả phiên đấu giá" />}</div>; }






