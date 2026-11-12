"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "@/components/auth/SessionProvider";
import { BackendImage } from "@/components/ui/BackendImage";

import { AdminPagination, Badge, ButtonLink, Card, NoData, PageHeading, SectionHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { ApiError } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney, resolveImageUrl } from "@/lib/presentation";
import { AuctionOrderPayment } from "./AuctionOrderPayment";
import { AuctionBidLeaderboard } from "./AuctionBidLeaderboard";
import { AuctionUnavailableState } from "./AuctionUnavailableState";
import { BuyerAuctionOffers } from "./BuyerAuctionOffers";
import { auctionService } from "./services/auction.service";
import { normalizeAuctionStatus, statusLabel, auctionStatusTone } from "./contract";
import type { AuctionStatus, AuctionSummary, Pagination, PlaceBidResponse } from "./types";
import { isAuctionId } from "./validation";

export { normalizeAuctionStatus, statusLabel, auctionStatusTone } from "./contract";

export const auctionStatuses: (AuctionStatus | "ALL")[] = ["ALL", "RUNNING", "SCHEDULED", "DRAFT", "ENDED", "SETTLED", "FAILED", "CANCELLED"];

export const dateText = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa có dữ liệu";
export const message = (error: Error | null) => error instanceof ApiError && error.status === 503 ? "Dịch vụ đấu giá hiện không khả dụng. Vui lòng thử lại sau." : error?.message ?? "";

export function PaginationBar({ pagination, page, setPage }: { pagination?: Pagination; page: number; setPage: (page: number) => void }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <AdminPagination
      page={page}
      pageSize={pagination.pageSize}
      totalItems={pagination.totalCount}
      totalPages={pagination.totalPages}
      onPageChange={setPage}
      itemLabel="phiên đấu giá"
    />
  );
}

export function StatusFilter({ status, setStatus, options = auctionStatuses }: { status: AuctionStatus | "ALL"; setStatus: (status: AuctionStatus | "ALL") => void; options?: (AuctionStatus | "ALL")[] }) {
  return <div className="auction-filters" role="group" aria-label="Lọc trạng thái phiên">{options.map((option) => <button key={option} type="button" className={status === option ? "active" : ""} aria-pressed={status === option} onClick={() => setStatus(option)}>{statusLabel(option)}</button>)}</div>;
}

export function AuctionTile({ auction, href }: { auction: AuctionSummary; href: string }) {
  return <Link href={href} className="auction-tile"><div className="auction-tile-image"><BackendImage src={resolveImageUrl(auction.primaryImageUrl)} alt={auction.productName ?? "Sản phẩm đấu giá"} compact /><Badge tone={auctionStatusTone(auction.status)}>{statusLabel(auction.status)}</Badge></div><div className="auction-tile-body"><h3>{auction.productName ?? "Sản phẩm chưa có tên"}</h3><p>{normalizeAuctionStatus(auction.status) === "RUNNING" ? <>Còn lại: <Countdown end={auction.scheduledEndAt} /></> : `Kết thúc ${dateText(auction.scheduledEndAt)}`}</p><div><span>Giá hiện tại<strong>{formatMoney(auction.currentPriceAmount ?? auction.startPriceAmount)}</strong></span><span>{auction.bidCount} lượt đặt giá</span></div></div></Link>;
}

export function AuctionListScreen() {
  const [status, setStatus] = useState<AuctionStatus | "ALL">("RUNNING");
  const [page, setPage] = useState(1);
  const auctions = useApiResource(`public-auctions:${status}:${page}`, (signal) => auctionService.list(page, 20, status, signal).then((response) => response.data));
  return <div className="auction-surface">
    <PageHeading title="Đấu giá" description="Theo dõi các phiên đang diễn ra và sắp mở bán." />
    <StatusFilter status={status} setStatus={(next) => { setStatus(next); setPage(1); }} options={["RUNNING", "SCHEDULED", "ENDED", "SETTLED"]} />
    {auctions.error && <div className="notice" role="alert">{message(auctions.error)} <button type="button" className="button button-secondary button-small" onClick={auctions.reload}>Tải lại</button></div>}
    {auctions.loading && !auctions.data ? <NoData title="Đang tải phiên đấu giá…" /> : auctions.data?.items.length ? <div className="auction-list-grid">{auctions.data.items.map((auction) => <AuctionTile key={auction.auctionId} auction={auction} href={ROUTES.auction.room(auction.auctionId)} />)}</div> : !auctions.error && <NoData title="Chưa có phiên phù hợp" />}
    <PaginationBar pagination={auctions.data?.pagination} page={page} setPage={setPage} />
  </div>;
}

function useAuctionId() { return String(useParams<{ id: string }>().id ?? ""); }
function useClock(offsetMs = 0) { const [now, setNow] = useState(0); useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []); return now ? now + offsetMs : 0; }
function Countdown({ end, offsetMs = 0 }: { end: string; offsetMs?: number }) { const now = useClock(offsetMs); const remaining = Math.max(0, new Date(end).getTime() - now); const days = Math.floor(remaining / 86400000); const hours = Math.floor(remaining / 3600000) % 24; const minutes = Math.floor(remaining / 60000) % 60; const seconds = Math.floor(remaining / 1000) % 60; const text = days ? `${days} ngày ${hours} giờ ${minutes} phút` : `${hours} giờ ${minutes} phút ${seconds} giây`; return <time dateTime={end}>{now ? remaining ? text : "Đã hết giờ" : "Đang cập nhật…"}</time>; }

const auctionTone = (status: string) => auctionStatusTone(status);
const specificationText = (value: unknown) => typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : Array.isArray(value) ? value.map(String).join(", ") : value && typeof value === "object" ? JSON.stringify(value) : "";
const specificationRows = (value: unknown): { name: string; value: string }[] => {
  if (Array.isArray(value)) return value.filter((item): item is { name: string; value: unknown } => Boolean(item && typeof item === "object" && typeof item.name === "string")).map((item) => ({ name: item.name, value: specificationText(item.value) })).filter((item) => item.value);
  if (value && typeof value === "object") return Object.entries(value).map(([name, item]) => ({ name, value: specificationText(item) })).filter((item) => item.value);
  return [];
};

export function AuctionRoomScreen() {
  const id = useAuctionId(); const { user } = useSession(); const canBid = Boolean(user?.roles?.some((role) => /^(buyer|customer|seller)$/i.test(role)) || /^(buyer|customer|seller)$/i.test(user?.role ?? ""));
  const detail = useApiResource(isAuctionId(id) ? `auction:${id}` : null, (signal) => auctionService.detail(id, signal).then(({ data, headers }) => { const serverTime = Date.parse(headers.get("Date") ?? ""); return { auction: data.data, version: String(data.data.rowVersion), clockOffsetMs: Number.isFinite(serverTime) ? serverTime - Date.now() : 0 }; }));
  const now = useClock(detail.data?.clockOffsetMs ?? 0);
  const [bidPage, setBidPage] = useState(1);
  const bids = useApiResource(isAuctionId(id) ? `bids:${id}:${bidPage}` : null, (signal) => auctionService.bids(id, bidPage, signal).then((response) => response.data));
  const recentBids = useApiResource(isAuctionId(id) && bidPage > 1 ? `recent-bids:${id}` : null, (signal) => auctionService.bids(id, 1, signal).then((response) => response.data));
  const reloadDetail = detail.reload; const reloadBids = bids.reload; const reloadRecentBids = recentBids.reload;
  useEffect(() => { if (!isAuctionId(id)) return; const timer = window.setInterval(() => { if (document.visibilityState === "visible") { reloadDetail(); reloadBids(); if (bidPage > 1) reloadRecentBids(); } }, 5000); return () => window.clearInterval(timer); }, [id, bidPage, reloadDetail, reloadBids, reloadRecentBids]);
  const [amount, setAmount] = useState(""); const [selectedImage, setSelectedImage] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [latestBid, setLatestBid] = useState<PlaceBidResponse | null>(null);
  const auction = detail.data?.auction; const currentStatus = normalizeAuctionStatus(auction?.status ?? ""); const useLatestBid = Boolean(latestBid && latestBid.auctionId === id && latestBid.rowVersion >= (auction?.rowVersion ?? 0)); const scheduledEndAt = useLatestBid ? latestBid!.scheduledEndAt : auction?.scheduledEndAt ?? ""; const active = Boolean(now && currentStatus === "RUNNING" && new Date(scheduledEndAt).getTime() > now); const scheduled = currentStatus === "SCHEDULED";
  const currentPrice = useLatestBid ? latestBid!.currentPriceAmount : auction?.currentPriceAmount ?? auction?.startPriceAmount ?? 0; const minimumBid = (useLatestBid || auction?.currentPriceAmount != null) ? currentPrice + (auction?.bidStepAmount ?? 0) : auction?.startPriceAmount ?? 0; const amountValue = Number(amount); const validAmount = /^\d+$/.test(amount) && Number.isSafeInteger(amountValue) && amountValue >= minimumBid;
  const images = auction ? [...(auction.images ?? []).map((image) => image.url), auction.primaryImageUrl].filter((url, index, all): url is string => Boolean(url) && all.indexOf(url) === index) : [];
  const currentVersion = useLatestBid ? String(latestBid!.rowVersion) : detail.data?.version;
  const canSubmit = active && canBid && auction?.sellerId !== user?.id && Boolean(currentVersion) && validAmount && !busy;
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); setSuccess(""); if (!active) { setError("Phiên không còn nhận lượt đặt giá."); return; } if (!canBid) { setError("Tài khoản này không có quyền đặt giá."); return; } if (auction?.sellerId === user?.id) { setError("Bạn không thể đặt giá cho phiên của mình."); return; } if (!currentVersion) { setError("Chưa thể đặt giá vì phiên chưa có mã phiên bản mới nhất. Hãy tải lại thông tin."); return; } if (!validAmount) { setError(`Giá đặt phải từ ${formatMoney(minimumBid)} trở lên.`); return; } setBusy(true); try { const placed = await auctionService.placeBid(id, { amount: amountValue }, currentVersion!); setLatestBid(placed); setSuccess("Đã đặt giá thành công."); setAmount(""); refreshAuction(); } catch (cause) { if (cause instanceof ApiError && (cause.status === 409 || cause.status === 412)) { setError("Giá phiên vừa thay đổi. Đang tải lại thông tin; hãy kiểm tra trước khi đặt lại giá."); refreshAuction(); } else setError(message(cause as Error)); } finally { setBusy(false); } }
  function refreshAuction() { detail.reload(); bids.reload(); if (bidPage > 1) recentBids.reload(); }
  if (!isAuctionId(id)) return <NoData title="Mã phiên đấu giá không hợp lệ" />;
  if (detail.error instanceof ApiError && detail.error.status === 404) return <AuctionUnavailableState />;
  return <div className="auction-surface auction-room">
    <PageHeading title={auction?.productName ?? "Phòng đấu giá"} description={auction ? `Mã phiên ${auction.auctionId}` : "Đang tải thông tin phiên đấu giá"} action={<ButtonLink href={ROUTES.auction.index} variant="secondary" small>Quay lại danh sách</ButtonLink>} />
    {detail.error && <div className="notice" role="alert"><p>{message(detail.error)}</p><button className="button button-secondary button-small" type="button" onClick={refreshAuction}>Tải lại phiên</button></div>}
    {error && <p className="notice" role="alert">{error}</p>}{success && <p className="form-success" role="status">{success}</p>}
    {detail.loading && !auction ? <NoData title="Đang tải phiên đấu giá…" /> : auction ? <>
      <div className="auction-room-grid">
        <div className="auction-room-main">
          <Card className="card-pad">
            <div className="auction-detail-image"><BackendImage src={resolveImageUrl(images[selectedImage] ?? auction.primaryImageUrl)} alt={auction.productName ?? "Sản phẩm đấu giá"} /></div>
            {images.length > 1 && <div className="auction-gallery" aria-label="Ảnh sản phẩm">{images.map((image, index) => <button type="button" key={`${image}-${index}`} className={selectedImage === index ? "auction-gallery-item active" : "auction-gallery-item"} aria-pressed={selectedImage === index} aria-label={`Xem ảnh ${index + 1}`} onClick={() => setSelectedImage(index)}><BackendImage src={resolveImageUrl(image)} alt="" compact /></button>)}</div>}
            <div className="auction-product-heading"><div><h2>{auction.productName ?? "Sản phẩm chưa có tên"}</h2><p>Mã sản phẩm: {auction.productId}</p></div><Badge tone={auctionTone(auction.status)}>{statusLabel(auction.status)}</Badge></div>
            {auction.description && <p className="auction-description">{auction.description}</p>}
            {specificationRows(auction.specifications).length > 0 && <><SectionHeading title="Thông tin sản phẩm" /><dl className="auction-specifications">{specificationRows(auction.specifications).slice(0, 8).map((row) => <div key={row.name}><dt>{row.name}</dt><dd>{row.value}</dd></div>)}</dl></>}
            {auction.sellerId && <p className="auction-seller-reference">Mã người bán: {auction.sellerId}</p>}
          </Card>
          <Card className="card-pad auction-rules"><h2>Quy tắc phiên đấu giá</h2><ul><li>Giá đặt phải đạt mức tối thiểu của phiên.</li><li>Hạn thanh toán hiển thị sau khi phiên có kết quả.</li><li>Phiên có thể gia hạn {auction.antiSnipingExtensionMinutes} phút/lần, tối đa {auction.maxExtensionCount} lần.</li></ul></Card>
        </div>
        <aside className="auction-room-rail">
          <Card className="card-pad auction-bid-panel">
            <div className="auction-status-line"><Badge tone={auctionTone(auction.status)}>{statusLabel(auction.status)}</Badge><div><span>{scheduled ? "Bắt đầu sau" : "Thời gian còn"}</span><strong><Countdown end={scheduled ? auction.scheduledStartAt : scheduledEndAt} offsetMs={detail.data?.clockOffsetMs} /></strong></div></div>
            <p className="auction-price-label">Giá hiện tại</p><strong className="auction-live-price">{formatMoney(currentPrice)}</strong>
            <div className="auction-price-facts"><div><span>Giá khởi điểm</span><strong>{formatMoney(auction.startPriceAmount)}</strong></div><div><span>Lượt đặt giá</span><strong>{useLatestBid ? latestBid!.bidCount : auction.bidCount}</strong></div><div><span>Bước giá</span><strong>{formatMoney(auction.bidStepAmount)}</strong></div></div>
            {(useLatestBid ? latestBid!.extensionCount : auction.extensionCount) > 0 && <p className="auction-extension-note">Đã gia hạn {auction.antiSnipingExtensionMinutes} phút · lần {useLatestBid ? latestBid!.extensionCount : auction.extensionCount}/{auction.maxExtensionCount}</p>}<div className="auction-schedule-facts"><div><span>Bắt đầu</span><strong>{dateText(auction.scheduledStartAt)}</strong></div><div><span>Kết thúc</span><strong>{dateText(scheduledEndAt)}</strong></div></div>
            {active && <><p className="auction-reputation">Hệ thống kiểm tra điểm uy tín khi đặt giá.</p><div className="auction-quick-bids"><button type="button" className="button button-secondary" disabled={!canBid || auction.sellerId === user?.id || busy} onClick={() => setAmount(String(minimumBid))}>+1 bước giá</button><button type="button" className="button button-secondary" disabled={!canBid || auction.sellerId === user?.id || busy} onClick={() => setAmount(String(currentPrice + 2 * auction.bidStepAmount))}>+2 bước giá</button><button type="button" className="button button-secondary" disabled={!canBid || auction.sellerId === user?.id || busy} onClick={() => setAmount(String(currentPrice + 5 * auction.bidStepAmount))}>+5 bước giá</button></div><form onSubmit={(event) => void submit(event)}>
              <label className="field-wrap" htmlFor="auction-bid-amount">Mức giá bạn muốn đặt<input id="auction-bid-amount" className="field" type="number" inputMode="numeric" min={minimumBid} step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
              {amount && !validAmount && <small className="auction-field-error">Giá tối thiểu là {formatMoney(minimumBid)}.</small>}
              <button className="button button-primary full-width" disabled={!canSubmit}>{busy ? "Đang gửi giá…" : "Đặt giá"}</button>
            </form>
            {!user && <ButtonLink href={ROUTES.auth.login} variant="secondary">Đăng nhập để đặt giá</ButtonLink>}
            {user && !canBid && <p className="auction-action-note">Tài khoản này không có quyền đặt giá.</p>}{user && auction.sellerId === user.id && <p className="auction-action-note">Bạn không thể đặt giá cho phiên của mình.</p>}
            {!currentVersion && <p className="auction-action-note" role="status">Chưa có mã phiên bản mới nhất. Hãy tải lại trước khi đặt giá.</p>}
            </>}
            {scheduled && <p className="auction-action-note">Phiên chưa bắt đầu. Bạn có thể đặt giá khi phiên chuyển sang trạng thái đang diễn ra.</p>}
            {(currentStatus === "ENDED" || currentStatus === "SETTLED") && <div className="auction-terminal-actions"><p>Phiên đã kết thúc. {canBid ? "Xem kết quả để biết trạng thái lượt đấu của bạn." : "Đăng nhập bằng tài khoản người mua để xem kết quả cá nhân."}</p>{canBid && <ButtonLink href={ROUTES.buyer.auctionResult(id)}>Xem kết quả phiên</ButtonLink>}{!user && <ButtonLink href={ROUTES.auth.login} variant="secondary">Đăng nhập</ButtonLink>}</div>}
            {(currentStatus === "FAILED" || currentStatus === "CANCELLED" || currentStatus === "DRAFT") && <p className="auction-action-note">Phiên này hiện không nhận lượt đặt giá.</p>}
            <button className="button button-secondary button-small auction-refresh" type="button" onClick={refreshAuction}>Tải lại thông tin phiên</button>
          </Card>
          <AuctionBidLeaderboard auctionId={id} recentBids={bidPage === 1 ? bids.data?.items : recentBids.data?.items} />
          <Card className="card-pad auction-bid-history"><div className="auction-history-heading"><div><h2>Lịch sử từng lượt đặt giá</h2><p>Mỗi dòng là một lượt, nên cùng một người có thể xuất hiện nhiều lần.</p></div><span>Tự cập nhật</span></div>
            {bids.error && <p className="notice" role="alert">{message(bids.error)}</p>}
            {bids.loading && !bids.data ? <NoData title="Đang tải lịch sử đặt giá…" /> : bids.data?.items.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Người tham gia</th><th>Mức giá</th><th>Thời điểm</th><th>Trạng thái</th></tr></thead><tbody>{bids.data.items.map((bid) => <tr key={bid.bidId}><td>{bid.bidderDisplayName}</td><td>{formatMoney(bid.amount)}</td><td>{dateText(bid.placedAt)}</td><td><Badge tone={bid.isInvalidated ? "red" : bid.isWinning ? "green" : "slate"}>{bid.isInvalidated ? "Không hợp lệ" : bid.isWinning ? "Dẫn đầu" : bid.isOutbid ? "Đã bị vượt" : "Hợp lệ"}</Badge></td></tr>)}</tbody></table></div> : <NoData title={bids.error ? "Không tải được lịch sử đặt giá" : "Chưa có lượt đặt giá"} />}
            <PaginationBar pagination={bids.data?.pagination} page={bidPage} setPage={setBidPage} />
          </Card>
        </aside>
      </div>
    </> : <NoData title={detail.error ? "Không tải được thông tin phiên" : "Không tìm thấy phiên đấu giá"} />}
  </div>;
}

export function MyAuctionsScreen() {
  const [page, setPage] = useState(1);
  const resource = useApiResource(`my-bids:${page}`, (signal) => auctionService.myBids(page, signal).then((response) => response.data));
  return <div className="auction-surface">
    <PageHeading title="Lượt đặt giá của tôi" description="Mỗi thẻ là một lượt đặt giá. Mở kết quả để biết bạn có thắng cả phiên hay không." />
    <BuyerAuctionOffers />
    {resource.error && <div className="notice" role="alert">{message(resource.error)} <button type="button" className="button button-secondary button-small" onClick={resource.reload}>Tải lại</button></div>}
    {resource.loading && !resource.data ? <NoData title="Đang tải lượt đặt giá…" /> : resource.data?.items.length ? <div className="auction-list-grid">{resource.data.items.map((item) => <Card className="card-pad auction-my-bid" key={item.bidId}>
      <h2>{item.auctionTitle}</h2>
      <Badge tone={item.isInvalidated ? "red" : item.isWinning ? "green" : "slate"}>{item.isInvalidated ? "Lượt không hợp lệ" : item.isWinning ? ["ENDED", "SETTLED"].includes(normalizeAuctionStatus(item.status ?? "")) ? "Lượt thắng phiên" : "Lượt đang dẫn đầu" : item.isOutbid ? "Lượt đã bị vượt giá" : statusLabel(item.status)}</Badge>
      <div className="info-row"><span>Giá đã đặt</span><strong>{formatMoney(item.amount)}</strong></div>
      <div className="info-row"><span>Thời điểm</span><strong>{dateText(item.placedAt)}</strong></div>
      <div className="action-row"><ButtonLink href={ROUTES.auction.room(item.auctionId)} small>Xem phiên</ButtonLink><ButtonLink href={ROUTES.buyer.auctionResult(item.auctionId)} variant="secondary" small>Kết quả</ButtonLink></div>
    </Card>)}</div> : !resource.error && <NoData title="Bạn chưa đặt giá phiên nào" />}
    <PaginationBar pagination={resource.data?.pagination} page={page} setPage={setPage} />
  </div>;
}

export function BuyerAuctionResultScreen({ payment = false }: { payment?: boolean }) { const id = useAuctionId(); const { user } = useSession(); const now = useClock(); const resource = useApiResource(isAuctionId(id) ? `result:${id}` : null, (signal) => auctionService.result(id, signal).then((response) => response.data)); const result = resource.data; const won = Boolean(result?.hasWinner && result.winnerId === user?.id); const deadlinePassed = Boolean(now && result?.paymentDeadlineAt && new Date(result.paymentDeadlineAt).getTime() < now); return <div className="auction-surface"><PageHeading title={payment ? "Thanh toán đơn đấu giá" : "Kết quả đấu giá"} description={`Phiên ${id}`} action={<button type="button" className="button button-secondary button-small" onClick={resource.reload} disabled={resource.loading}>Kiểm tra lại</button>} />{resource.error && <p role="alert" className="notice">{message(resource.error)}</p>}{resource.loading && !result ? <NoData title="Đang tải kết quả…" /> : result ? <div className="split"><Card className="card-pad"><Badge tone={won ? "green" : "slate"}>{statusLabel(result.status)}</Badge><h2>{result.hasWinner ? won ? "Bạn đã thắng phiên này" : "Phiên đã có người thắng" : "Phiên chưa có người thắng"}</h2><div className="info-row"><span>Giá cuối</span><strong>{formatMoney(result.finalPriceAmount)}</strong></div><div className="info-row"><span>Thời điểm xác định</span><strong>{dateText(result.determinedAt)}</strong></div>{result.paymentDeadlineAt && <div className="info-row"><span>Hạn thanh toán</span><strong>{dateText(result.paymentDeadlineAt)}</strong></div>}{result.paidAt && <p>Đã thanh toán lúc {dateText(result.paidAt)}.</p>}{won && deadlinePassed && !result.paidAt && <p role="status">Đã quá hạn thanh toán. Vui lòng xem trạng thái đơn hàng.</p>}</Card><Card className="card-pad"><h2>Bước tiếp theo</h2>{won && result.orderId ? <><p>Đơn hàng thắng đấu giá đã được tạo. Kiểm tra số tiền, trạng thái và phương thức thanh toán trong chi tiết đơn hàng.</p>{payment && <><div className="info-row"><span>Thời hạn</span><strong>{deadlinePassed ? "Đã quá hạn" : result.paymentDeadlineAt ? <Countdown end={result.paymentDeadlineAt} /> : "Đang chờ cập nhật"}</strong></div><p>Thanh toán trước hạn hiển thị ở trên. Tổng tiền lấy từ đơn đấu giá. Nhập địa chỉ nhận hàng trước khi thanh toán bằng Ví Nexus.</p><AuctionOrderPayment orderId={result.orderId} deadlinePassed={deadlinePassed} /><ButtonLink href={ROUTES.buyer.wallet} variant="secondary">Kiểm tra Ví Nexus</ButtonLink></>}{!payment && <ButtonLink href={ROUTES.buyer.auctionPayment(id)} variant="secondary">Thông tin thanh toán</ButtonLink>}</> : <p>{won ? "Đơn hàng thắng đấu giá đang được tạo. Vui lòng tải lại kết quả sau." : result.hasWinner ? payment ? "Chỉ người thắng có thể thanh toán phiên này." : "Bạn không thắng phiên này. Xem các phiên khác để tiếp tục tham gia." : "Kết quả sẽ được cập nhật sau khi phiên kết thúc."}</p>}<div className="action-row"><ButtonLink href={ROUTES.buyer.auctions} variant="secondary">Đấu giá của tôi</ButtonLink></div></Card></div> : <NoData title="Chưa có kết quả phiên đấu giá" />}</div>; }






