"use client";

import { useState } from "react";
import { AdminPagination, Badge, ButtonLink, Card, NoData, PageHeading } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";
import { auctionOrderService } from "./services/auction-order.service";

export function SellerAuctionOrders() {
  const [page, setPage] = useState(1);
  const orders = useApiResource(`seller-auction-orders:${page}`, (signal) => auctionOrderService.sellerList(page, signal));
  return <div className="auction-surface">
    <PageHeading title="Đơn hàng đấu giá" description="Theo dõi thanh toán và phản hồi đơn của người thắng." />
    {orders.error && <div className="notice" role="alert">{orders.error.message} <button type="button" className="button button-secondary button-small" onClick={orders.reload}>Tải lại</button></div>}
    {orders.loading && !orders.data ? <NoData title="Đang tải đơn đấu giá…" /> : orders.data?.items.length ? <Card className="auction-table-card"><div className="table-scroll"><table className="data-table auction-operations-table"><thead><tr><th>Mã đơn</th><th>Sản phẩm</th><th>Giá trúng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{orders.data.items.map((order) => <tr key={order.id}><td>{order.orderNo}</td><td>{order.productName}</td><td>{formatMoney(order.winningAmount)}</td><td><Badge tone={order.status.toUpperCase() === "PAID" ? "sky" : order.status.toUpperCase() === "COMPLETED" ? "green" : order.status.toUpperCase().includes("CANCEL") ? "red" : "slate"}>{order.status}</Badge></td><td><ButtonLink href={ROUTES.seller.auctionResult(order.auctionId)} small variant="secondary">Xem đơn</ButtonLink></td></tr>)}</tbody></table></div></Card> : !orders.error && <NoData title="Chưa có đơn đấu giá" />}
    {orders.data && orders.data.totalPages > 1 && <AdminPagination page={page} pageSize={orders.data.pageSize} totalItems={orders.data.totalCount} totalPages={orders.data.totalPages} onPageChange={setPage} itemLabel="đơn đấu giá" />}
  </div>;
}
