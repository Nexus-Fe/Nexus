"use client";

import { useState } from "react";
import { commerceService } from "@/features/commerce";
import { walletService } from "@/features/wallet";
import { ROUTES } from "@/constants/routes";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";

export function AuctionOrderPayment({ auctionId, orderId, deadlinePassed }: { auctionId: string; orderId: string; deadlinePassed: boolean }) {
  const order = useApiResource(`auction-order:${orderId}`, (signal) => commerceService.getOrderById(orderId, signal).then((response) => response.data));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bankCode, setBankCode] = useState("");
  const paid = order.data?.status === "PAID";
  const payable = order.data?.status === "PENDING_PAYMENT";
  const amount = order.data?.totalAmount;

  async function startPayment() {
    if (!amount || !Number.isFinite(amount) || deadlinePassed || !payable) return;
    setBusy(true);
    setError("");
    try {
      const response = await walletService.createDirectCheckout({
        orderId,
        amount,
        gateway: "VNPAY",
        ...(bankCode ? { bankCode } : {}),
        returnUrl: new URL(ROUTES.buyer.auctionPayment(auctionId), window.location.origin).toString(),
      });
      const paymentUrl = new URL(response.data.paymentUrl);
      if (paymentUrl.protocol !== "https:") throw new Error("Backend trả đường dẫn thanh toán không hợp lệ.");
      window.location.assign(paymentUrl.toString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo phiên thanh toán.");
      setBusy(false);
    }
  }

  return <section className="auction-order-payment" aria-label="Thanh toán đơn hàng">
    <div className="info-row"><span>Mã đơn hàng</span><strong>{orderId}</strong></div>
    {order.loading && !order.data && <p>Đang tải số tiền đơn hàng…</p>}
    {order.error && <p role="alert" className="notice">{order.error.message}</p>}
    {order.data && <>
      <div className="info-row"><span>Tổng tiền đơn hàng</span><strong>{formatMoney(amount ?? null)}</strong></div>
      <div className="info-row"><span>Trạng thái đơn</span><strong>{order.data.status}</strong></div>
      {paid ? <p role="status">Đơn hàng đã được thanh toán.</p> : deadlinePassed ? <p role="status">Đơn hàng đã quá hạn thanh toán.</p> : !payable ? <p role="status">Trạng thái đơn hàng hiện không cho phép thanh toán.</p> : <>
        <label className="field-wrap">Ngân hàng VNPay
          <select className="select-field" value={bankCode} onChange={(event) => setBankCode(event.target.value)}>
            <option value="">Chọn tại cổng VNPay</option>
            <option value="NCB">NCB</option>
          </select>
        </label>
        <button type="button" className="button button-primary" disabled={busy || !amount || amount <= 0} onClick={() => void startPayment()}>{busy ? "Đang tạo thanh toán…" : "Thanh toán qua VNPay"}</button>
      </>}
    </>}
    {error && <p role="alert" className="notice">{error}</p>}
  </section>;
}
