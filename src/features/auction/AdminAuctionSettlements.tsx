"use client";

import { useState } from "react";
import { AdminPagination, Badge, ButtonLink, Card, NoData, PageHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { auctionService } from "./services/auction.service";

export function AdminAuctionSettlements() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [determinedFrom, setDeterminedFrom] = useState("");
  const settlements = useApiResource(`admin-auction-settlements:${page}:${status}:${determinedFrom}`, (signal) => auctionService.settlements(page, status, determinedFrom, signal));
  return <div className="auction-surface">
    <PageHeading title="Quyết toán đấu giá" description="Theo dõi người thắng, đơn hàng và tiến trình thanh toán của các phiên đã chốt." />
    <div className="auction-settlement-filters"><label className="field-wrap auction-settlement-filter">Trạng thái quyết toán<select className="select-field" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả</option><option value="PendingPayment">Chờ thanh toán</option><option value="Paid">Đã thanh toán</option><option value="Failed">Không thành công</option><option value="Expired">Hết hạn</option><option value="Cancelled">Đã hủy</option></select></label><label className="field-wrap auction-settlement-filter">Chốt từ ngày<input className="field" type="date" value={determinedFrom} onChange={(event) => { setDeterminedFrom(event.target.value); setPage(1); }} /></label></div>
    {settlements.error && <div role="alert" className="notice">{settlements.error.message} <button type="button" className="button button-secondary button-small" onClick={settlements.reload}>Tải lại</button></div>}
    {settlements.loading && !settlements.data ? <NoData title="Đang tải quyết toán…" /> : settlements.data?.items.length ? <Card className="auction-table-card"><div className="table-scroll"><table className="data-table auction-operations-table"><thead><tr><th>Phiên</th><th>Giá chốt</th><th>Trạng thái</th><th>Đơn hàng</th><th>Thao tác</th></tr></thead><tbody>{settlements.data.items.map((item) => <tr key={item.auctionId}><td>{item.productTitle}</td><td>{formatMoney(item.finalPriceAmount)}</td><td><Badge tone={item.status.toUpperCase() === "SETTLED" ? "green" : item.status.toUpperCase() === "FAILED" ? "red" : "slate"}>{item.settlementStatus}</Badge></td><td>{item.orderId ?? "Chưa tạo"}</td><td><ButtonLink href={ROUTES.admin.auction(item.auctionId)} variant="secondary" small>Chi tiết</ButtonLink></td></tr>)}</tbody></table></div></Card> : !settlements.error && <NoData title="Chưa có phiên đã chốt" />}
    {settlements.data && settlements.data.pagination.totalPages > 1 && <AdminPagination page={page} pageSize={settlements.data.pagination.pageSize} totalItems={settlements.data.pagination.totalCount} totalPages={settlements.data.pagination.totalPages} onPageChange={setPage} itemLabel="quyết toán" />}
  </div>;
}
