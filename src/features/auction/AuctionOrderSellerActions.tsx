"use client";

import { useState } from "react";
import { auctionOrderService } from "./services/auction-order.service";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";

export function AuctionOrderSellerActions({ orderId }: { orderId: string }) {
  const order = useApiResource(`seller-auction-order:${orderId}`, (signal) => auctionOrderService.detail(orderId, signal));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const status = order.data?.status.replace(/[^a-z]/gi, "").toUpperCase();

  async function respond(accept: boolean) {
    if (busy || status !== "PAID") return;
    if (!accept && !reason.trim()) { setError("Nhập lý do từ chối đơn hàng."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      if (accept) await auctionOrderService.accept(orderId);
      else await auctionOrderService.reject(orderId, reason.trim());
      setNotice(accept ? "Đã tiếp nhận đơn đấu giá." : "Đã từ chối đơn. Hệ thống sẽ cập nhật hoàn tiền.");
      setRejecting(false); order.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xử lý đơn đấu giá."); }
    finally { setBusy(false); }
  }

  return <section className="auction-order-seller" aria-label="Xử lý đơn đấu giá">
    <h2>Đơn hàng thắng đấu giá</h2>
    {order.error && <div className="notice" role="alert">{order.error.message} <button type="button" className="button button-secondary button-small" onClick={order.reload}>Tải lại</button></div>}
    {error && <p className="notice" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
    {order.loading && !order.data && <p>Đang tải đơn hàng…</p>}
    {order.data && <><div className="info-row"><span>Mã đơn</span><strong>{order.data.orderNo}</strong></div><div className="info-row"><span>Giá trúng</span><strong>{formatMoney(order.data.winningAmount)}</strong></div><div className="info-row"><span>Trạng thái</span><strong>{order.data.status}</strong></div>{order.data.sellerRespondDeadlineAt && <div className="info-row"><span>Hạn phản hồi</span><strong>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.data.sellerRespondDeadlineAt))}</strong></div>}
      {status === "PAID" && <><div className="action-row"><button type="button" className="button button-primary" disabled={busy} onClick={() => void respond(true)}>{busy ? "Đang xử lý…" : "Tiếp nhận đơn"}</button><button type="button" className="button button-secondary" disabled={busy} onClick={() => setRejecting((value) => !value)}>Từ chối đơn</button></div>{rejecting && <div className="auction-reject-form"><label className="field-wrap">Lý do từ chối<input className="field" value={reason} onChange={(event) => setReason(event.target.value)} /></label><button type="button" className="button auction-danger-button" disabled={busy || !reason.trim()} onClick={() => void respond(false)}>Xác nhận từ chối</button></div>}</>}
    </>}
  </section>;
}
