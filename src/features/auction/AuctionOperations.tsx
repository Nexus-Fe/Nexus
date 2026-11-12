"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, ButtonLink, Card, NoData, PageHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { catalogService } from "@/features/catalog";
import { useSession } from "@/components/auth/SessionProvider";
import { sellerService } from "@/features/seller";
import { auctionService } from "./services/auction.service";
import { dateText, message, PaginationBar, StatusFilter, statusLabel, normalizeAuctionStatus, auctionStatusTone } from "./AuctionPages";
import { isAuctionId } from "./validation";
import { AuctionComingSoon } from "./AuctionComingSoon";
import type { AuctionStatus, AuctionSummary } from "./types";

type Role = "seller" | "staff" | "admin";
const detailHref = (role: Role, id: string) => role === "seller" ? ROUTES.seller.auction(id) : role === "staff" ? ROUTES.staff.auction(id) : ROUTES.admin.auction(id);

function formatTimeAndDate(iso?: string | null) {
  if (!iso) return { time: "—", date: "—" };
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return { time: "—", date: "—" };
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return {
    time: `${hours}:${minutes}`,
    date: `${day}/${month}/${year}`,
  };
}

export function OperationsListScreen({ role }: { role: Role }) {
  const router = useRouter();
  const [lookup, setLookup] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [status, setStatus] = useState<AuctionStatus | "ALL">("ALL"); const [page, setPage] = useState(1);
  const resource = useApiResource(`${role}-auctions:${page}:${status}`, (signal) => auctionService.list(page, 20, status, signal).then((response) => response.data));

  if (resource.error) {
    return (
      <AuctionComingSoon
        title={`${role === "seller" ? "Quản lý phiên đấu giá" : role === "staff" ? "Giám sát đấu giá" : "Quản lý đấu giá"} (Sắp ra mắt)`}
        description="Dịch vụ Đấu giá (AuctionService) đang trong giai đoạn hoàn thiện hạ tầng. Tính năng sẽ tự động kích hoạt khi dịch vụ sẵn sàng."
        backHref={role === "admin" ? ROUTES.admin.overview : role === "staff" ? ROUTES.staff.sellers : ROUTES.seller.products}
        backLabel={role === "admin" ? "Về trang tổng quan" : role === "staff" ? "Duyệt hồ sơ Seller" : "Quản lý sản phẩm"}
      />
    );
  }

  return (
    <div className="auction-surface">
      <PageHeading
        title={role === "seller" ? "Quản lý phiên đấu giá" : role === "staff" ? "Giám sát đấu giá" : "Quản lý đấu giá"}
        description={role === "seller" ? "Quản lý và tạo mới các phiên đấu giá cho sản phẩm của gian hàng bạn." : "Theo dõi danh sách và trạng thái các phiên đấu giá toàn sàn."}
        action={role === "seller" ? <ButtonLink href={ROUTES.seller.newAuction}>+ Tạo phiên đấu giá</ButtonLink> : undefined}
      />
      <form
        className="auction-lookup"
        onSubmit={(event) => {
          event.preventDefault();
          const id = lookup.trim();
          if (!isAuctionId(id)) {
            setLookupError("Nhập mã phiên UUID hợp lệ.");
            return;
          }
          setLookupError("");
          router.push(detailHref(role, id));
        }}
      >
        <label className="field-wrap">
          Tra cứu theo mã phiên
          <input
            className="field"
            value={lookup}
            onChange={(event) => {
              setLookup(event.target.value);
              setLookupError("");
            }}
            placeholder="UUID của phiên đấu giá"
          />
        </label>
        <button className="button button-secondary">Mở phiên</button>
      </form>
      {lookupError && <p role="alert" className="notice">{lookupError}</p>}
      {resource.data && (
        <div className="auction-result-count">
          {resource.data.pagination.totalCount} phiên phù hợp với bộ lọc
        </div>
      )}
      <StatusFilter status={status} setStatus={(next) => { setStatus(next); setPage(1); }} />
      {resource.error && (
        <div className="notice" role="alert">
          <p>{message(resource.error)}</p>
          <button className="button button-secondary button-small" type="button" onClick={resource.reload}>
            Tải lại danh sách
          </button>
        </div>
      )}
      {resource.loading ? (
        <NoData title="Đang tải phiên đấu giá…" />
      ) : resource.data?.items.length ? (
        <Card>
          <div className="table-scroll">
            <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "35%", minWidth: "220px" }}>SẢN PHẨM</th>
                  <th style={{ width: "15%", minWidth: "120px" }}>TRẠNG THÁI</th>
                  <th style={{ width: "15%", minWidth: "120px" }}>GIÁ HIỆN TẠI</th>
                  <th style={{ width: "10%", minWidth: "80px", textAlign: "center" }}>LƯỢT BID</th>
                  <th style={{ width: "13%", minWidth: "110px" }}>KẾT THÚC</th>
                  <th style={{ width: "12%", minWidth: "90px", textAlign: "right" }}>CHI TIẾT</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((auction: AuctionSummary) => {
                  const end = formatTimeAndDate(auction.scheduledEndAt);
                  return (
                    <tr
                      key={auction.auctionId}
                      className="clickable-row"
                      onClick={() => router.push(detailHref(role, auction.auctionId))}
                      title="Nhấn để mở chi tiết phiên đấu giá"
                    >
                      <td style={{ wordBreak: "break-word", whiteSpace: "normal", lineHeight: 1.45 }}>
                        <strong style={{ display: "block", color: "var(--text)" }}>
                          {auction.productName ?? "Sản phẩm chưa có tên"}
                        </strong>
                      </td>
                      <td>
                        <Badge tone={auctionStatusTone(auction.status)}>
                          {statusLabel(auction.status)}
                        </Badge>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {formatMoney(auction.currentPriceAmount ?? auction.startPriceAmount)}
                      </td>
                      <td style={{ textAlign: "center" }}>{auction.bidCount}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", lineHeight: 1.25 }}>
                          <strong style={{ fontSize: "14px", fontWeight: 600 }}>{end.time}</strong>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>{end.date}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <ButtonLink
                          href={detailHref(role, auction.auctionId)}
                          small
                          variant="secondary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Mở phiên
                        </ButtonLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <NoData title={resource.error ? "Không tải được danh sách" : "Chưa có phiên phù hợp"} />
      )}
      <PaginationBar pagination={resource.data?.pagination} page={page} setPage={setPage} />
    </div>
  );
}

type StatusHistoryEntry = {
  historyId?: string;
  id?: string;
  changedAt: string;
  toStatus: string;
  reason?: string | null;
};

export function OperationsDetailScreen({ role }: { role: Role }) {
  const id = String(useParams<{ id: string }>().id ?? "");
  const detail = useApiResource(isAuctionId(id) ? `ops-auction:${id}` : null, (signal) => auctionService.detail(id, signal).then((response) => response.data.data));
  const history = useApiResource<{ items: StatusHistoryEntry[] }>(isAuctionId(id) && role !== "seller" ? `auction-history:${id}` : null, async (signal) => {
    try {
      const res = await auctionService.history(id, 1, signal);
      const d = ("data" in res ? res.data : res) as unknown as { items?: StatusHistoryEntry[]; data?: { items?: StatusHistoryEntry[] } };
      const items = Array.isArray(d) ? d : (d?.items ?? d?.data?.items ?? []);
      return { items };
    } catch {
      return { items: [] };
    }
  });
  const saga = useApiResource<{ sagaType: string; currentState: string; updatedAt: string } | null>(null, async () => null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const auction = detail.data;
  const isPrivileged = role === "admin" || role === "staff";

  async function cancel() {
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do can thiệp hủy phiên.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await auctionService.forceCancel(id, reason.trim());
      setSaved("Đã cưỡng chế hủy phiên thành công.");
      setConfirmCancel(false);
      detail.reload();
      history.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cưỡng chế hủy phiên.");
    } finally {
      setBusy(false);
    }
  }

  if (!isAuctionId(id)) return <NoData title="Mã phiên không hợp lệ" />;
  return (
    <div className="auction-surface">
      <PageHeading title={auction?.productName ?? "Chi tiết phiên đấu giá"} description={`Mã phiên: ${id}`} />
      {role === "seller" && normalizeAuctionStatus(auction?.status ?? "") === "SCHEDULED" && (
        <div className="portal-page-actions">
          <ButtonLink href={ROUTES.seller.editAuction(id)} variant="secondary">Sửa phiên</ButtonLink>
        </div>
      )}
      {detail.error && <p className="notice" role="alert">{message(detail.error)}</p>}
      {error && <p className="notice" role="alert">{error}</p>}
      {saved && <p className="form-success" role="status">{saved}</p>}
      {detail.loading ? (
        <NoData title="Đang tải phiên…" />
      ) : auction ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "20px", alignItems: "start", marginTop: "16px" }}>
          {/* CỘT TRÁI: CHỈ SỐ CHÍNH & LỊCH SỬ ĐẶT GIÁ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Dải chỉ số phiên */}
            <Card style={{ padding: "18px 20px", borderRadius: "10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", textAlign: "center" }}>
                <div style={{ borderRight: "1px solid var(--border)", paddingRight: "12px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Trạng thái
                  </span>
                  <div style={{ marginTop: "6px" }}>
                    <Badge tone={auctionStatusTone(auction.status)}>{statusLabel(auction.status)}</Badge>
                  </div>
                </div>
                <div style={{ borderRight: "1px solid var(--border)", paddingRight: "12px" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Giá hiện tại
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary, #0284c7)", marginTop: "4px" }}>
                    {formatMoney(auction.currentPriceAmount ?? auction.startPriceAmount)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Lượt đặt giá
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>
                    {auction.bidCount} <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--muted)" }}>lượt</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Lịch sử đặt giá */}
            <SellerBidHistory id={id} />

            {/* Lịch sử chuyển trạng thái (dành cho Staff/Admin) */}
            {role !== "seller" && (
              <Card className="card-pad" style={{ borderRadius: "10px" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 12px 0" }}>Lịch sử chuyển trạng thái</h2>
                {history.error && <p role="alert" className="notice">{message(history.error)}</p>}
                {history.data?.items.length ? (
                  <div className="table-scroll">
                    <table className="data-table" style={{ width: "100%", tableLayout: "fixed" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "35%" }}>Thời điểm</th>
                          <th style={{ width: "30%" }}>Trạng thái</th>
                          <th style={{ width: "35%" }}>Lý do / Căn cứ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.data.items.map((entry: StatusHistoryEntry, idx: number) => (
                          <tr key={entry.historyId || entry.id || idx}>
                            <td>{dateText(entry.changedAt)}</td>
                            <td>
                              <Badge tone={auctionStatusTone(entry.toStatus)}>{statusLabel(entry.toStatus)}</Badge>
                            </td>
                            <td style={{ color: "var(--muted)", fontSize: "12px", wordBreak: "break-word" }}>
                              {entry.reason || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <NoData title={history.loading ? "Đang tải lịch sử…" : "Chưa có lịch sử trạng thái"} />
                )}
              </Card>
            )}
          </div>

          {/* CỘT PHẢI: THÔNG SỐ PHIÊN & KHUNG CAN THIỆP XỬ LÝ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Thông số phiên */}
            <Card className="card-pad" style={{ borderRadius: "10px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 14px 0" }}>Thông số phiên đấu giá</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Bắt đầu:</span>
                  <strong>{dateText(auction.scheduledStartAt)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Kết thúc:</span>
                  <strong>{dateText(auction.scheduledEndAt)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Bước giá:</span>
                  <strong>{formatMoney(auction.bidStepAmount)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Uy tín tối thiểu:</span>
                  <strong>{auction.minReputationToBid} điểm</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Chống sniping:</span>
                  <strong>{auction.extensionCount}/{auction.maxExtensionCount} ({auction.antiSnipingExtensionMinutes} phút/lần)</strong>
                </div>
                {auction.leadingBidderDisplayName && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border)", paddingTop: "8px" }}>
                    <span style={{ color: "var(--muted)" }}>Người dẫn đầu:</span>
                    <strong>{auction.leadingBidderDisplayName}</strong>
                  </div>
                )}
                {role !== "seller" && saga.data && (
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border)", paddingTop: "8px" }}>
                    <span style={{ color: "var(--muted)" }}>Tiến trình đơn:</span>
                    <strong>{saga.data.currentState}</strong>
                  </div>
                )}
              </div>

              {role === "seller" && (
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <ButtonLink href={ROUTES.seller.auctionResult(id)} variant="secondary" small>
                    Xem kết quả
                  </ButtonLink>
                  {normalizeAuctionStatus(auction.status) === "FAILED" && (
                    <ButtonLink href={ROUTES.seller.recreateAuction(id)} variant="secondary" small>
                      Tạo lại phiên
                    </ButtonLink>
                  )}
                </div>
              )}
            </Card>

            {/* Khung can thiệp / Cưỡng chế hủy phiên */}
            {(isPrivileged || role === "seller") && (
              <Card
                className="card-pad"
                style={{
                  borderRadius: "10px",
                  border: isPrivileged ? "1px solid #fecaca" : undefined,
                  background: isPrivileged ? "#fffafa" : undefined,
                }}
              >
                <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 6px 0", color: isPrivileged ? "#b91c1c" : "inherit" }}>
                  {isPrivileged ? "Cưỡng chế hủy phiên" : "Hủy phiên"}
                </h2>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                  {role === "seller"
                    ? "Phiên đã có lượt đặt giá chỉ Admin/Staff được hủy."
                    : "Can thiệp khẩn cấp khi phát hiện gian lận giá hoặc sai sót kỹ thuật. Bắt buộc nhập lý do."}
                </p>

                <label className="field-wrap" style={{ marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>Lý do can thiệp *</span>
                  <input
                    className="field"
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setConfirmCancel(false);
                    }}
                    placeholder="Nhập căn cứ xử lý..."
                    style={{ fontSize: "13px" }}
                  />
                </label>

                {isPrivileged && confirmCancel && (
                  <p role="alert" className="notice" style={{ fontSize: "12px", marginBottom: "10px" }}>
                    Xác nhận hủy phiên này? Thao tác sẽ được ghi vào nhật ký kiểm toán và không thể hoàn tác.
                  </p>
                )}

                <div className="action-row" style={{ marginTop: 8, display: "flex", gap: "8px" }}>
                  <button
                    className={`button ${isPrivileged ? "auction-danger-button" : "button-secondary"}`}
                    type="button"
                    disabled={
                      busy ||
                      normalizeAuctionStatus(auction.status) === "CANCELLED" ||
                      ["ENDED", "SETTLED", "FAILED"].includes(normalizeAuctionStatus(auction.status)) ||
                      !reason.trim()
                    }
                    onClick={() => {
                      if (isPrivileged && !confirmCancel) {
                        setConfirmCancel(true);
                        return;
                      }
                      void cancel();
                    }}
                    style={{ width: "100%", padding: "9px 12px", fontSize: "13px", fontWeight: 600 }}
                  >
                    {busy
                      ? "Đang hủy…"
                      : isPrivileged
                      ? confirmCancel
                        ? "Xác nhận hủy ngay"
                        : "Cưỡng chế hủy phiên"
                      : "Hủy phiên"}
                  </button>
                  {isPrivileged && confirmCancel && (
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      style={{ fontSize: "13px", padding: "9px 12px" }}
                    >
                      Quay lại
                    </button>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <NoData title="Không có dữ liệu phiên" />
      )}
    </div>
  );
}

export function SellerAuctionResultScreen() { const id = String(useParams<{ id: string }>().id ?? ""); const resource = useApiResource(isAuctionId(id) ? `seller-result:${id}` : null, (signal) => auctionService.result(id, signal).then((response) => response.data)); const result = resource.data; return <div className="auction-surface"><PageHeading title="Kết quả phiên đấu giá" description={`Phiên ${id}`} />{resource.error && <p role="alert" className="notice">{message(resource.error)}</p>}{resource.loading ? <NoData title="Đang tải kết quả…" /> : result ? <Card className="card-pad"><Badge tone={auctionStatusTone(result.status)}>{statusLabel(result.status)}</Badge><h2>{result.hasWinner ? "Đã xác định người thắng" : "Chưa có người thắng"}</h2><div className="info-row"><span>Người thắng</span><strong>{result.winnerDisplayName ?? "—"}</strong></div><div className="info-row"><span>Giá cuối</span><strong>{formatMoney(result.finalPriceAmount)}</strong></div><div className="info-row"><span>Đơn hàng</span><strong>{result.orderId ?? "Chưa có"}</strong></div><div className="info-row"><span>Hạn thanh toán</span><strong>{dateText(result.paymentDeadlineAt)}</strong></div><ButtonLink href={ROUTES.seller.auction(id)} variant="secondary">Về chi tiết phiên</ButtonLink></Card> : <NoData title="Chưa có kết quả" />}</div>; }

function SellerBidHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const bids = useApiResource(`seller-bids:${id}:${page}`, (signal) => auctionService.bids(id, page, signal).then((response) => response.data));
  return <Card className="card-pad">
    <h2>Lịch sử đặt giá</h2>
    {bids.error && <p role="alert" className="notice">{message(bids.error)}</p>}
    {bids.loading ? <NoData title="Đang tải lịch sử đặt giá…" /> : bids.data?.items.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>#</th><th>Người đặt</th><th>Giá đặt</th><th>Trạng thái</th><th>Thời điểm</th></tr></thead><tbody>{bids.data.items.map((bid) => <tr key={bid.bidId}><td>{bid.sequenceNo}</td><td><strong>{bid.bidderDisplayName}</strong></td><td>{formatMoney(bid.amount)}</td><td><Badge tone={bid.isInvalidated ? "red" : bid.isWinning ? "green" : "slate"}>{bid.isInvalidated ? "Không hợp lệ" : bid.isWinning ? "Dẫn đầu" : bid.isOutbid ? "Đã bị vượt" : "Hợp lệ"}</Badge></td><td>{dateText(bid.placedAt)}</td></tr>)}</tbody></table></div> : <NoData title="Chưa có lượt đặt giá" />}
    <PaginationBar pagination={bids.data?.pagination} page={page} setPage={setPage} />
  </Card>;
}

export function AdminAuctionConfigsScreen() {
  return (
    <div className="auction-surface">
      <PageHeading
        title="Cấu hình quy tắc đấu giá"
        description="Thông tin các quy tắc vận hành và tham số hệ thống áp dụng cho các phiên đấu giá."
        action={
          <div className="action-row" style={{ display: "flex", gap: 8 }}>
            <ButtonLink href={ROUTES.admin.configs} variant="secondary">Cấu hình toàn sàn</ButtonLink>
            <ButtonLink href={ROUTES.admin.auctions} variant="secondary">Quản lý đấu giá</ButtonLink>
          </div>
        }
      />
      <Card className="card-pad">
        <h2>Tham số quy tắc đấu giá hệ thống</h2>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Khóa quy tắc</th>
                <th>Giá trị áp dụng</th>
                <th>Mô tả nghiệp vụ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>antiSnipingExtensionMinutes</code></td>
                <td><strong>5 phút / lần</strong></td>
                <td>Thời gian tự động gia hạn thêm khi có lượt đặt giá hợp lệ sát giờ kết thúc phiên.</td>
              </tr>
              <tr>
                <td><code>maxExtensionCount</code></td>
                <td><strong>Tối đa theo phiên</strong></td>
                <td>Số lần gia hạn chống sniping tối đa cho phép trong một phiên đấu giá.</td>
              </tr>
              <tr>
                <td><code>minReputationToBid</code></td>
                <td><strong>Theo cấu hình phiên</strong></td>
                <td>Điểm uy tín tối thiểu của Buyer để được phép tham gia đặt giá.</td>
              </tr>
              <tr>
                <td><code>minSellerReputationToCreate</code></td>
                <td><strong>50 điểm</strong></td>
                <td>Điểm uy tín tối thiểu của Seller để tạo hoặc mở lại phiên đấu giá mới.</td>
              </tr>
              <tr>
                <td><code>minAuctionDurationMinutes</code></td>
                <td><strong>60 phút</strong></td>
                <td>Thời lượng tối thiểu từ thời điểm bắt đầu đến thời điểm kết thúc dự kiến.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function localDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function SellerAuctionEditorScreen({ edit = false, recreate = false }: { edit?: boolean; recreate?: boolean }) {
  const id = String(useParams<{ id?: string }>().id ?? ""); const router = useRouter(); const { user } = useSession();
  const [productSearch, setProductSearch] = useState("");
  const [productKeyword, setProductKeyword] = useState("");
  const detail = useApiResource((edit || recreate) && isAuctionId(id) ? `edit-auction:${id}` : null, (signal) => auctionService.detail(id, signal).then((response) => response.data.data));
  const products = useApiResource(!edit && !recreate ? `seller-auction-products:${productKeyword}` : null, (signal) => catalogService.searchAuctionProducts(productKeyword, signal).then((response) => response.data.items.filter((product) => product.saleType.toUpperCase() === "AUCTION" && product.status.toUpperCase() === "ACTIVE")));
  const sellerProfile = useApiResource(!edit && !recreate ? "auction-seller-profile" : null, (signal) => sellerService.getProfile(signal).then((response) => "data" in response ? response.data : response));
  const [form, setForm] = useState({ productId: "", skuId: "", startPriceAmount: "", bidStepAmount: "", scheduledStartAt: "", scheduledEndAt: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const initial = (edit || recreate) && detail.data ? { productId: detail.data.productId, skuId: detail.data.skuId ?? "", startPriceAmount: String(detail.data.startPriceAmount), bidStepAmount: String(detail.data.bidStepAmount), scheduledStartAt: recreate ? "" : localDate(detail.data.scheduledStartAt), scheduledEndAt: recreate ? "" : localDate(detail.data.scheduledEndAt) } : null;
  const fields = initial && !form.productId ? initial : form;
  const selectedProduct = useApiResource(!edit && !recreate && fields.productId ? `auction-product:${fields.productId}` : null, (signal) => catalogService.getAuctionProduct(fields.productId, signal).then((response) => response.data));
  const productIsOwned = Boolean(selectedProduct.data && user && [user.id, sellerProfile.data?.shopId].includes(selectedProduct.data.sellerId) && selectedProduct.data.saleType.toUpperCase() === "AUCTION" && selectedProduct.data.status.toUpperCase() === "ACTIVE");
  const set = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...(initial && !previous.productId ? initial : previous), [key]: value }));
  async function submit(event: FormEvent) { event.preventDefault(); if (!edit && !recreate && user?.reputationScore !== undefined && user.reputationScore < 50) { setError("Điểm uy tín Seller phải đạt tối thiểu 50."); return; } if (!edit && !recreate && (!productIsOwned || !selectedProduct.data?.variants.some((variant) => variant.variantId === fields.skuId && variant.status.toUpperCase() === "ACTIVE"))) { setError("Sản phẩm/SKU phải thuộc gian hàng của bạn và đang hoạt động."); return; } const start = new Date(fields.scheduledStartAt); const end = new Date(fields.scheduledEndAt); if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= new Date() || end <= start || end.getTime() - start.getTime() < 3600000 || start.getTime() - Date.now() > 30 * 86400000) { setError("Lịch phiên phải bắt đầu trong 30 ngày tới và kéo dài ít nhất 1 giờ."); return; } if (Number(fields.startPriceAmount) < 0 || Number(fields.bidStepAmount) <= 0) { setError("Giá khởi điểm và bước giá không hợp lệ."); return; } setBusy(true); setError(""); try { const body = { startPriceAmount: Number(fields.startPriceAmount), bidStepAmount: Number(fields.bidStepAmount), scheduledStartAt: start.toISOString(), scheduledEndAt: end.toISOString() }; if (edit) { await auctionService.update(id, body); router.push(ROUTES.seller.auction(id)); } else if (recreate) { const response = await auctionService.recreate(id, body); router.push(ROUTES.seller.auction(response.data.auctionId)); } else { const response = await auctionService.create({ productId: fields.productId, skuId: fields.skuId, ...body }); router.push(ROUTES.seller.auction(response.data.auctionId)); } } catch (cause) { setError(message(cause as Error)); } finally { setBusy(false); } }
  if (edit && detail.data && normalizeAuctionStatus(detail.data.status) !== "SCHEDULED") return <NoData title="Chỉ phiên chưa bắt đầu mới được sửa" />;
  if (recreate && detail.data && normalizeAuctionStatus(detail.data.status) !== "FAILED") return <NoData title="Chỉ phiên không thành công mới được tạo lại" />;
  return <div className="auction-surface"><PageHeading title={edit ? "Sửa phiên đấu giá" : recreate ? "Tạo lại phiên đấu giá" : "Tạo phiên đấu giá"} description={`Điểm uy tín Seller tối thiểu: 50${user?.reputationScore !== undefined ? ` · Điểm hiện tại: ${user.reputationScore}` : ""}.`} />{detail.error && <p className="notice" role="alert">{message(detail.error)}</p>}{products.error && <p className="notice" role="alert">{message(products.error)}</p>}{sellerProfile.error && <p className="notice" role="alert">Không tải được hồ sơ gian hàng: {message(sellerProfile.error)}</p>}{selectedProduct.error && <p className="notice" role="alert">{message(selectedProduct.error)}</p>}{selectedProduct.data && !productIsOwned && !sellerProfile.loading && <p className="notice" role="alert">Sản phẩm không thuộc gian hàng của bạn hoặc chưa hoạt động.</p>}{error && <p className="notice" role="alert">{error}</p>}{(edit || recreate) && detail.loading ? <NoData title="Đang tải phiên…" /> : <form onSubmit={(event) => void submit(event)}><Card className="card-pad"><div className="form-grid">{!edit && !recreate && <><div className="auction-product-search"><label className="field-wrap">Tìm sản phẩm đấu giá<input className="field" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setProductKeyword(productSearch.trim()); setForm((previous) => ({ ...previous, productId: "", skuId: "" })); } }} /></label><button type="button" className="button button-secondary" onClick={() => { setProductKeyword(productSearch.trim()); setForm((previous) => ({ ...previous, productId: "", skuId: "" })); }}>Tìm</button></div><label className="field-wrap">Sản phẩm<select className="select-field" required value={fields.productId} onChange={(event) => { setForm((previous) => ({ ...previous, productId: event.target.value, skuId: "" })); }}><option value="">Chọn sản phẩm</option>{products.data?.map((product) => <option value={product.productId} key={product.productId}>{product.name}</option>)}</select></label><label className="field-wrap">SKU<select className="select-field" required value={fields.skuId} onChange={(event) => set("skuId", event.target.value)}><option value="">Chọn SKU</option>{selectedProduct.data?.variants?.filter((variant) => variant.status.toUpperCase() === "ACTIVE").map((variant) => <option key={variant.variantId} value={variant.variantId}>{variant.name || variant.skuCode}</option>)}</select></label></>}<label className="field-wrap">Giá khởi điểm<input className="field" type="number" min="0" required value={fields.startPriceAmount} onChange={(event) => set("startPriceAmount", event.target.value)} /></label><label className="field-wrap">Bước giá<input className="field" type="number" min="1" required value={fields.bidStepAmount} onChange={(event) => set("bidStepAmount", event.target.value)} /></label><label className="field-wrap">Bắt đầu<input className="field" type="datetime-local" required value={fields.scheduledStartAt} onChange={(event) => set("scheduledStartAt", event.target.value)} /></label><label className="field-wrap">Kết thúc<input className="field" type="datetime-local" required value={fields.scheduledEndAt} onChange={(event) => set("scheduledEndAt", event.target.value)} /></label></div><div className="action-row"><button className="button button-primary" disabled={busy || (!edit && !recreate && (!products.data?.length || !productIsOwned || !fields.skuId || (user?.reputationScore !== undefined && user.reputationScore < 50)))}>{edit ? "Lưu thay đổi" : recreate ? "Tạo lại phiên" : "Tạo phiên"}</button><ButtonLink href={ROUTES.seller.auctions} variant="secondary">Hủy</ButtonLink></div></Card></form>}</div>;
}













