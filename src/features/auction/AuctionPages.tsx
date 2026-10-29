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
import { AuctionUnavailableState } from "./AuctionUnavailableState";
import { auctionService } from "./services/auction.service";
import type { AuctionStatus, AuctionSummary, Pagination } from "./types";
import { isAuctionId } from "./validation";

export const auctionStatuses: (AuctionStatus | "ALL")[] = ["ALL", "RUNNING", "SCHEDULED", "DRAFT", "ENDED", "SETTLED", "FAILED", "CANCELLED"];
const publicAuctionStatuses: (AuctionStatus | "ALL")[] = ["ALL", "RUNNING", "SCHEDULED", "ENDED"];
export const statusLabel = (status: AuctionStatus | "ALL") => ({ ALL: "Tất cả", DRAFT: "Nháp", SCHEDULED: "Sắp diễn ra", RUNNING: "Đang diễn ra", ENDED: "Đã kết thúc", SETTLED: "Đã hoàn tất", FAILED: "Không thành công", CANCELLED: "Đã hủy" })[status];
export const dateText = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa có dữ liệu";
export const message = (error: Error | null) => error instanceof ApiError && error.status === 503 ? "Dịch vụ đấu giá hiện không khả dụng. Vui lòng thử lại sau." : error?.message ?? "";

export function PaginationBar({ pagination, page, setPage }: { pagination?: Pagination; page: number; setPage: (page: number) => void }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return <nav className="auction-pagination" aria-label="Trang kết quả"><button type="button" disabled={!pagination.hasPreviousPage} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {pagination.pageIndex} / {pagination.totalPages}</span><button type="button" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}>Trang sau</button></nav>;
}

export function StatusFilter({ status, setStatus, options = auctionStatuses }: { status: AuctionStatus | "ALL"; setStatus: (status: AuctionStatus | "ALL") => void; options?: (AuctionStatus | "ALL")[] }) {
  return <div className="auction-filters" role="group" aria-label="Lọc trạng thái phiên">{options.map((option) => <button key={option} type="button" className={status === option ? "active" : ""} aria-pressed={status === option} onClick={() => setStatus(option)}>{statusLabel(option)}</button>)}</div>;
}

export function AuctionTile({ auction, href }: { auction: AuctionSummary; href: string }) {
  return <Link href={href} className="auction-tile"><div className="auction-tile-image"><BackendImage src={resolveImageUrl(auction.primaryImageUrl)} alt={auction.productName} compact /><Badge tone={auction.status === "RUNNING" ? "green" : "slate"}>{statusLabel(auction.status)}</Badge></div><div className="auction-tile-body"><h3>{auction.productName}</h3><p>{auction.status === "RUNNING" ? <>Còn lại: <Countdown end={auction.scheduledEndAt} /></> : `Kết thúc ${dateText(auction.scheduledEndAt)}`}</p><div><span>Giá hiện tại<strong>{formatMoney(auction.currentPriceAmount ?? auction.startPriceAmount)}</strong></span><span>{auction.bidCount} lượt đặt giá</span></div></div></Link>;
}

export function AuctionListScreen() {
  const [status, setStatus] = useState<AuctionStatus | "ALL">("RUNNING");
  const [page, setPage] = useState(1);
  const resource = useApiResource(`auctions:${page}:${status}`, (signal) => auctionService.list(page, 12, status, signal).then((response) => response.data));
  const visibleAuctions = resource.data?.items.filter((auction) => status === "ALL" || auction.status === status) ?? [];
  return <div className="auction-surface"><section className="hero auction-hero"><div className="hero-copy"><p className="overline">Nexus Auction</p><h1>Khám phá phiên đang diễn ra</h1><p>Theo dõi giá và thời hạn của từng phiên. Chọn một phiên để xem chi tiết và tham gia.</p><div className="action-row"><ButtonLink href={ROUTES.buyer.auctions}>Đấu giá của tôi</ButtonLink></div></div><div className="hero-visual" aria-hidden="true"><span className="hero-orbit hero-orbit-one"/><span className="hero-orbit hero-orbit-two"/><span className="hero-icon"><Icon name="gavel" size={58}/></span></div></section><SectionHeading title="Danh sách phiên" hint="Dữ liệu được tải trực tiếp từ Auction Service." /><StatusFilter status={status} options={publicAuctionStatuses} setStatus={(next) => { setStatus(next); setPage(1); }} />{resource.error && <p role="alert" className="notice">{message(resource.error)}</p>}{resource.loading ? <NoData title="Đang tải phiên đấu giá…" /> : visibleAuctions.length ? <div className="auction-list-grid">{visibleAuctions.map((auction) => <AuctionTile key={auction.auctionId} auction={auction} href={ROUTES.auction.room(auction.auctionId)} />)}</div> : <NoData title={resource.error ? "Không tải được danh sách phiên" : "Chưa có phiên ở trạng thái này"} />}<PaginationBar pagination={resource.data?.pagination} page={page} setPage={setPage} /></div>;
}

function useAuctionId() { return String(useParams<{ id: string }>().id ?? ""); }
function useClock() { const [now, setNow] = useState(0); useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []); return now; }
function Countdown({ end }: { end: string }) { const now = useClock(); const remaining = Math.max(0, new Date(end).getTime() - now); const days = Math.floor(remaining / 86400000); const hours = Math.floor(remaining / 3600000) % 24; const minutes = Math.floor(remaining / 60000) % 60; const seconds = Math.floor(remaining / 1000) % 60; const text = days ? `${days} ngày ${hours} giờ ${minutes} phút` : `${hours} giờ ${minutes} phút ${seconds} giây`; return <time dateTime={end}>{now ? remaining ? text : "Đã hết giờ" : "Đang cập nhật…"}</time>; }

const auctionTone = (status: AuctionStatus) => ({ DRAFT: "slate", SCHEDULED: "amber", RUNNING: "green", ENDED: "slate", SETTLED: "indigo", FAILED: "red", CANCELLED: "red" })[status] as "slate" | "amber" | "green" | "indigo" | "red";
const specificationText = (value: unknown) => typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : Array.isArray(value) ? value.map(String).join(", ") : value && typeof value === "object" ? JSON.stringify(value) : "";

export function AuctionRoomScreen() {
  const id = useAuctionId(); const { user } = useSession(); const now = useClock(); const canBid = Boolean(user?.roles?.some((role) => /^(buyer|customer)$/i.test(role)) || /^(buyer|customer)$/i.test(user?.role ?? ""));
  const detail = useApiResource(isAuctionId(id) ? `auction:${id}` : null, (signal) => auctionService.detail(id, signal).then(({ data, headers }) => ({ auction: data.data, version: headers.get("etag") })));
  const [bidPage, setBidPage] = useState(1);
  const bids = useApiResource(isAuctionId(id) ? `bids:${id}:${bidPage}` : null, (signal) => auctionService.bids(id, bidPage, signal).then((response) => response.data));
  const reloadDetail = detail.reload; const reloadBids = bids.reload;
  useEffect(() => { if (!isAuctionId(id)) return; const timer = window.setInterval(() => { if (document.visibilityState === "visible") { reloadDetail(); reloadBids(); } }, 5000); return () => window.clearInterval(timer); }, [id, reloadDetail, reloadBids]);
  const [amount, setAmount] = useState(""); const [selectedImage, setSelectedImage] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const auction = detail.data?.auction; const active = Boolean(now && auction?.status === "RUNNING" && new Date(auction.scheduledEndAt).getTime() > now); const scheduled = auction?.status === "SCHEDULED";
  const currentPrice = auction?.currentPriceAmount ?? auction?.startPriceAmount ?? 0; const minimumBid = currentPrice + (auction?.bidStepAmount ?? 0); const amountValue = Number(amount); const validAmount = /^\d+$/.test(amount) && Number.isSafeInteger(amountValue) && amountValue >= minimumBid;
  const images = auction ? [...(auction.images ?? []).map((image) => image.url), auction.primaryImageUrl].filter((url, index, all): url is string => Boolean(url) && all.indexOf(url) === index) : [];
  const canSubmit = active && canBid && Boolean(detail.data?.version) && validAmount && !busy;
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); setSuccess(""); if (!active) { setError("Phiên không còn nhận lượt đặt giá."); return; } if (!canBid) { setError("Chỉ tài khoản người mua đã đăng nhập mới có thể đặt giá."); return; } if (!detail.data?.version) { setError("Chưa thể đặt giá vì phiên chưa có mã phiên bản mới nhất. Hãy tải lại thông tin."); return; } if (!validAmount) { setError(`Giá đặt phải từ ${formatMoney(minimumBid)} trở lên.`); return; } setBusy(true); try { await auctionService.placeBid(id, { amount: amountValue }, detail.data.version); setSuccess("Giá đặt đã được ghi nhận."); setAmount(""); refreshAuction(); } catch (cause) { if (cause instanceof ApiError && (cause.status === 409 || cause.status === 412)) { setError("Giá phiên vừa thay đổi. Đang tải lại thông tin; hãy kiểm tra trước khi đặt lại giá."); refreshAuction(); } else setError(message(cause as Error)); } finally { setBusy(false); } }
  function refreshAuction() { detail.reload(); bids.reload(); }
  if (!isAuctionId(id)) return <NoData title="Mã phiên đấu giá không hợp lệ" />;
  if (detail.error instanceof ApiError && detail.error.status === 404) return <AuctionUnavailableState />;
  return <div className="auction-surface auction-room"><div className="crumbs"><Link href={ROUTES.auction.index}>Danh sách phiên</Link><Icon name="chevron" size={14}/><span>{auction?.productName ?? "Chi tiết phiên đấu giá"}</span></div>
    <PageHeading title={auction?.productName ?? "Phòng đấu giá"} description={auction ? `Mã phiên ${auction.auctionId}` : "Đang tải thông tin phiên đấu giá"} action={<ButtonLink href={ROUTES.auction.index} variant="secondary" small>Quay lại danh sách</ButtonLink>} />
    {detail.error && <div className="notice" role="alert"><p>{message(detail.error)}</p><button className="button button-secondary button-small" type="button" onClick={refreshAuction}>Tải lại phiên</button></div>}
    {error && <p className="notice" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}
    {detail.loading && !auction ? <NoData title="Đang tải phiên đấu giá…" /> : auction ? <>
      <div className="auction-room-grid">
        <div className="auction-room-main">
          <Card className="card-pad">
            <div className="auction-detail-image"><BackendImage src={resolveImageUrl(images[selectedImage] ?? auction.primaryImageUrl)} alt={auction.productName} /></div>
            {images.length > 1 && <div className="auction-gallery" aria-label="Ảnh sản phẩm">{images.map((image, index) => <button type="button" key={`${image}-${index}`} className={selectedImage === index ? "auction-gallery-item active" : "auction-gallery-item"} aria-pressed={selectedImage === index} aria-label={`Xem ảnh ${index + 1}`} onClick={() => setSelectedImage(index)}><BackendImage src={resolveImageUrl(image)} alt="" compact /></button>)}</div>}
            <div className="auction-product-heading"><div><h2>{auction.productName}</h2><p>Mã sản phẩm: {auction.productId}</p></div><Badge tone={auctionTone(auction.status)}>{statusLabel(auction.status)}</Badge></div>
            {auction.description && <p className="auction-description">{auction.description}</p>}
            {auction.specifications && Object.entries(auction.specifications).some(([, value]) => specificationText(value)) && <><SectionHeading title="Thông tin sản phẩm" /><dl className="auction-specifications">{Object.entries(auction.specifications).filter(([, value]) => specificationText(value)).slice(0, 8).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{specificationText(value)}</dd></div>)}</dl></>}
            {auction.sellerId && <p className="auction-seller-reference">Mã người bán: {auction.sellerId}</p>}
          </Card>
          <Card className="card-pad auction-rules"><h2>Quy tắc phiên đấu giá</h2><ul><li>Phiên đấu giá không yêu cầu đặt cọc.</li><li>Người thắng thanh toán trong vòng 24 giờ sau khi phiên kết thúc.</li><li>Lượt đặt giá trong 5 phút cuối có thể gia hạn phiên thêm 5 phút.</li></ul></Card>
        </div>
        <aside className="auction-room-rail">
          <Card className="card-pad auction-bid-panel">
            <div className="auction-status-line"><Badge tone={auctionTone(auction.status)}>{statusLabel(auction.status)}</Badge><div><span>{scheduled ? "Bắt đầu sau" : "Thời gian còn"}</span><strong><Countdown end={scheduled ? auction.scheduledStartAt : auction.scheduledEndAt} /></strong></div></div>
            <p className="auction-price-label">Giá hiện tại</p><strong className="auction-live-price">{formatMoney(currentPrice)}</strong>
            <div className="auction-price-facts"><div><span>Giá khởi điểm</span><strong>{formatMoney(auction.startPriceAmount)}</strong></div><div><span>Lượt đặt giá</span><strong>{auction.bidCount}</strong></div><div><span>Bước giá</span><strong>{formatMoney(auction.bidStepAmount)}</strong></div></div>
            <div className="auction-schedule-facts"><div><span>Bắt đầu</span><strong>{dateText(auction.scheduledStartAt)}</strong></div><div><span>Kết thúc</span><strong>{dateText(auction.scheduledEndAt)}</strong></div></div>
            {active && <><p className="auction-reputation">Điểm uy tín tối thiểu để đặt giá: <strong>{auction.minReputationToBid}</strong></p><div className="auction-quick-bids"><button type="button" className="button button-secondary" disabled={!canBid || busy} onClick={() => setAmount(String(minimumBid))}>+1 bước giá</button><button type="button" className="button button-secondary" disabled={!canBid || busy} onClick={() => setAmount(String(currentPrice + 2 * auction.bidStepAmount))}>+2 bước giá</button></div><form onSubmit={(event) => void submit(event)}>
              <label className="field-wrap" htmlFor="auction-bid-amount">Mức giá bạn muốn đặt<input id="auction-bid-amount" className="field" type="number" inputMode="numeric" min={minimumBid} step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
              {amount && !validAmount && <small className="auction-field-error">Giá tối thiểu là {formatMoney(minimumBid)}.</small>}
              <button className="button button-primary full-width" disabled={!canSubmit}>{busy ? "Đang gửi giá…" : "Đặt giá"}</button>
            </form>
            {!user && <ButtonLink href={ROUTES.auth.login} variant="secondary">Đăng nhập để đặt giá</ButtonLink>}
            {user && !canBid && <p className="auction-action-note">Chỉ tài khoản người mua mới có thể đặt giá.</p>}
            {!detail.data?.version && <p className="auction-action-note" role="status">Chưa có mã phiên bản mới nhất. Hãy tải lại trước khi đặt giá.</p>}
            </>}
            {scheduled && <p className="auction-action-note">Phiên chưa bắt đầu. Bạn có thể đặt giá khi phiên chuyển sang trạng thái đang diễn ra.</p>}
            {(auction.status === "ENDED" || auction.status === "SETTLED") && <div className="auction-terminal-actions"><p>Phiên đã kết thúc. {canBid ? "Xem kết quả để biết trạng thái lượt đấu của bạn." : "Đăng nhập bằng tài khoản người mua để xem kết quả cá nhân."}</p>{canBid && <ButtonLink href={ROUTES.buyer.auctionResult(id)}>Xem kết quả phiên</ButtonLink>}{!user && <ButtonLink href={ROUTES.auth.login} variant="secondary">Đăng nhập</ButtonLink>}</div>}
            {(auction.status === "FAILED" || auction.status === "CANCELLED" || auction.status === "DRAFT") && <p className="auction-action-note">Phiên này hiện không nhận lượt đặt giá.</p>}
            <button className="button button-secondary button-small auction-refresh" type="button" onClick={refreshAuction}>Tải lại thông tin phiên</button>
          </Card>
          <Card className="card-pad auction-bid-history"><div className="auction-history-heading"><h2>Lịch sử đặt giá</h2><span>Tự cập nhật</span></div>
            {bids.error && <p className="notice" role="alert">{message(bids.error)}</p>}
            {bids.loading && !bids.data ? <NoData title="Đang tải lịch sử đặt giá…" /> : bids.data?.items.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Người tham gia</th><th>Mức giá</th><th>Thời điểm</th><th>Trạng thái</th></tr></thead><tbody>{bids.data.items.map((bid) => <tr key={bid.bidId}><td>{bid.bidderDisplayName}</td><td>{formatMoney(bid.amount)}</td><td>{dateText(bid.placedAt)}</td><td><Badge tone={bid.isInvalidated ? "red" : bid.isWinning ? "green" : "slate"}>{bid.isInvalidated ? "Không hợp lệ" : bid.isWinning ? "Dẫn đầu" : bid.isOutbid ? "Đã bị vượt" : "Hợp lệ"}</Badge></td></tr>)}</tbody></table></div> : <NoData title={bids.error ? "Không tải được lịch sử đặt giá" : "Chưa có lượt đặt giá"} />}
            <PaginationBar pagination={bids.data?.pagination} page={bidPage} setPage={setBidPage} />
          </Card>
        </aside>
      </div>
    </> : <NoData title={detail.error ? "Không tải được thông tin phiên" : "Không tìm thấy phiên đấu giá"} />}
  </div>;
}

export function MyAuctionsScreen() { const [status, setStatus] = useState<AuctionStatus | "ALL">("ALL"); const [page, setPage] = useState(1); const resource = useApiResource(`my-bids:${page}:${status}`, (signal) => auctionService.myBids(page, status, signal).then((response) => response.data)); return <div className="auction-surface"><PageHeading title="Đấu giá của tôi" description="Theo dõi những phiên bạn đã tham gia và kết quả sau khi kết thúc." /><StatusFilter status={status} setStatus={(next) => { setStatus(next); setPage(1); }} />{resource.error && <p role="alert" className="notice">{message(resource.error)}</p>}{resource.loading ? <NoData title="Đang tải phiên của bạn…" /> : resource.data?.items.length ? <div className="auction-list-grid">{resource.data.items.map((item) => <Card className="card-pad" key={item.auctionId}><h2>{item.productName}</h2><Badge tone={item.isLeading ? "green" : "slate"}>{item.isLeading ? "Đang dẫn đầu" : statusLabel(item.auctionStatus)}</Badge><div className="info-row"><span>Giá cao nhất của bạn</span><strong>{formatMoney(item.myHighestBidAmount)}</strong></div><div className="info-row"><span>Giá hiện tại</span><strong>{formatMoney(item.currentPriceAmount)}</strong></div><p>Kết thúc {dateText(item.endsAt)}</p><div className="action-row"><ButtonLink href={ROUTES.auction.room(item.auctionId)} small>Xem phiên</ButtonLink><ButtonLink href={ROUTES.buyer.auctionResult(item.auctionId)} variant="secondary" small>Kết quả</ButtonLink></div></Card>)}</div> : <NoData title={resource.error ? "Không tải được phiên của bạn" : "Bạn chưa tham gia phiên nào"} />}<PaginationBar pagination={resource.data?.pagination} page={page} setPage={setPage} /></div>; }

export function BuyerAuctionResultScreen({ payment = false }: { payment?: boolean }) { const id = useAuctionId(); const { user } = useSession(); const now = useClock(); const resource = useApiResource(isAuctionId(id) ? `result:${id}` : null, (signal) => auctionService.result(id, signal).then((response) => response.data)); const result = resource.data; const won = Boolean(result?.hasWinner && result.winnerId === user?.id); const deadlinePassed = Boolean(now && result?.paymentDeadlineAt && new Date(result.paymentDeadlineAt).getTime() < now); return <div className="auction-surface"><PageHeading title={payment ? "Thanh toán đơn đấu giá" : "Kết quả đấu giá"} description={`Phiên ${id}`} />{resource.error && <p role="alert" className="notice">{message(resource.error)}</p>}{resource.loading ? <NoData title="Đang tải kết quả…" /> : result ? <div className="split"><Card className="card-pad"><Badge tone={won ? "green" : "slate"}>{statusLabel(result.status)}</Badge><h2>{result.hasWinner ? won ? "Bạn đã thắng phiên này" : "Phiên đã có người thắng" : "Phiên chưa có người thắng"}</h2><div className="info-row"><span>Giá cuối</span><strong>{formatMoney(result.finalPriceAmount)}</strong></div><div className="info-row"><span>Thời điểm xác định</span><strong>{dateText(result.determinedAt)}</strong></div>{result.paymentDeadlineAt && <div className="info-row"><span>Hạn thanh toán</span><strong>{dateText(result.paymentDeadlineAt)}</strong></div>}{result.paidAt && <p>Đã thanh toán lúc {dateText(result.paidAt)}.</p>}{won && deadlinePassed && !result.paidAt && <p role="status">Đã quá hạn thanh toán. Vui lòng xem trạng thái đơn hàng.</p>}</Card><Card className="card-pad"><h2>Bước tiếp theo</h2>{won && result.orderId ? <><p>Đơn hàng thắng đấu giá đã được tạo. Kiểm tra số tiền, trạng thái và phương thức thanh toán trong chi tiết đơn hàng.</p>{payment && <><div className="info-row"><span>Thời hạn</span><strong>{deadlinePassed ? "Đã quá hạn" : result.paymentDeadlineAt ? <Countdown end={result.paymentDeadlineAt} /> : "Đang chờ cập nhật"}</strong></div><p>Thanh toán trước hạn hiển thị ở trên. Tổng tiền được lấy từ đơn hàng; bạn sẽ được chuyển sang cổng VNPay sau khi tạo phiên thanh toán.</p><AuctionOrderPayment auctionId={id} orderId={result.orderId} deadlinePassed={deadlinePassed} /><ButtonLink href={ROUTES.buyer.wallet} variant="secondary">Kiểm tra Ví Nexus</ButtonLink></>}<ButtonLink href={ROUTES.buyer.order(result.orderId)}>Xem chi tiết đơn hàng</ButtonLink>{!payment && <ButtonLink href={ROUTES.buyer.auctionPayment(id)} variant="secondary">Thông tin thanh toán</ButtonLink>}</> : <p>{won ? "Đơn hàng thắng đấu giá đang được tạo. Vui lòng tải lại kết quả sau." : result.hasWinner ? payment ? "Chỉ người thắng có thể thanh toán phiên này." : "Bạn không thắng phiên này. Xem các phiên khác để tiếp tục tham gia." : "Kết quả sẽ được cập nhật sau khi phiên kết thúc."}</p>}<div className="action-row"><ButtonLink href={ROUTES.buyer.auctions} variant="secondary">Đấu giá của tôi</ButtonLink></div></Card></div> : <NoData title="Chưa có kết quả phiên đấu giá" />}</div>; }






