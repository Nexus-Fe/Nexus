"use client";

import { useState, type FormEvent } from "react";
import { ButtonLink } from "@/components/ui/Primitives";
import { ROUTES } from "@/constants/routes";
import { auctionOrderService } from "./services/auction-order.service";
import { useApiResource } from "@/lib/api/use-api-resource";
import { formatMoney } from "@/lib/presentation";

type AddressForm = { fullName: string; phoneNumber: string; addressLine: string; provinceName: string; districtName: string; wardName: string; ghnDistrictId: string; ghnWardCode: string };
const initialAddress: AddressForm = { fullName: "", phoneNumber: "", addressLine: "", provinceName: "", districtName: "", wardName: "", ghnDistrictId: "", ghnWardCode: "" };
const addressFields = [
  ["fullName", "Người nhận"], ["phoneNumber", "Số điện thoại"], ["addressLine", "Số nhà, đường"],
  ["provinceName", "Tỉnh/thành phố"], ["districtName", "Quận/huyện"], ["wardName", "Phường/xã"],
  ["ghnDistrictId", "Mã quận GHN"], ["ghnWardCode", "Mã phường GHN"],
] as const;

export function AuctionOrderPayment({ orderId, deadlinePassed }: { orderId: string; deadlinePassed: boolean }) {
  const order = useApiResource(`auction-order:${orderId}`, (signal) => auctionOrderService.detail(orderId, signal));
  const [shipping, setShipping] = useState<AddressForm>(initialAddress);
  const [busy, setBusy] = useState(false);
  const [confirmReceipt, setConfirmReceipt] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const status = order.data?.status.replace(/[^a-z]/gi, "").toUpperCase();
  const payable = status === "PENDINGPAYMENT" && !deadlinePassed;

  async function saveShipping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const district = Number(shipping.ghnDistrictId);
    if (!Number.isSafeInteger(district) || district < 1 || !/^\d{9,11}$/.test(shipping.phoneNumber)) {
      setError("Kiểm tra lại số điện thoại và mã quận GHN."); return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      await auctionOrderService.submitShipping(orderId, { ...shipping, ghnDistrictId: district });
      setSuccess("Đã lưu địa chỉ và tính phí giao hàng."); order.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu địa chỉ giao hàng."); }
    finally { setBusy(false); }
  }

  async function pay() {
    if (busy || !payable || !order.data?.totalAmount) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await auctionOrderService.pay(orderId);
      if (result.status.toUpperCase() === "PAID") setSuccess("Đã thanh toán bằng Ví Nexus.");
      order.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể thanh toán đơn đấu giá."); }
    finally { setBusy(false); }
  }

  async function receive() {
    if (busy || !["SHIPPED", "DELIVERED"].includes(status ?? "")) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await auctionOrderService.confirmReceipt(orderId);
      setSuccess("Đã xác nhận nhận hàng."); setConfirmReceipt(false); order.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xác nhận nhận hàng."); }
    finally { setBusy(false); }
  }

  return <section className="auction-order-payment" aria-label="Thanh toán đơn đấu giá">
    {order.loading && !order.data && <p>Đang tải đơn đấu giá…</p>}
    {order.error && <div role="alert" className="notice">{order.error.message} <button type="button" className="button button-secondary button-small" onClick={order.reload}>Tải lại</button></div>}
    {order.data && <>
      <div className="info-row"><span>Mã đơn</span><strong>{order.data.orderNo}</strong></div>
      <div className="info-row"><span>Giá trúng</span><strong>{formatMoney(order.data.winningAmount)}</strong></div>
      <div className="info-row"><span>Phí giao hàng</span><strong>{formatMoney(order.data.shippingFeeAmount)}</strong></div>
      <div className="info-row"><span>Tổng thanh toán</span><strong>{formatMoney(order.data.totalAmount)}</strong></div>
      <div className="info-row"><span>Trạng thái</span><strong>{order.data.status}</strong></div>
      {payable && !order.data.totalAmount && <form className="auction-shipping-form" onSubmit={(event) => void saveShipping(event)}>
        <h3>Địa chỉ nhận hàng</h3>
        {addressFields.map(([key, label]) => <label key={key} className="field-wrap">{label}<input className="field" required type={key === "ghnDistrictId" ? "number" : "text"} min={key === "ghnDistrictId" ? 1 : undefined} value={shipping[key]} onChange={(event) => setShipping((value) => ({ ...value, [key]: event.target.value }))} /></label>)}
        <button className="button button-secondary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu địa chỉ và tính phí"}</button>
      </form>}
      {payable && Boolean(order.data.totalAmount) && <><button type="button" className="button button-primary" disabled={busy} onClick={() => void pay()}>{busy ? "Đang xử lý…" : "Thanh toán bằng Ví Nexus"}</button><ButtonLink href={ROUTES.buyer.topUp} variant="secondary">Nạp tiền</ButtonLink></>}
      {status === "PAID" && <p role="status">Đã thanh toán, đang chờ người bán phản hồi{order.data.sellerRespondDeadlineAt ? ` trước ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.data.sellerRespondDeadlineAt))}` : ""}.</p>}
      {["SHIPPED", "DELIVERED"].includes(status ?? "") && <div className="auction-receipt"><p>Chỉ xác nhận sau khi bạn thực sự nhận hàng.</p>{confirmReceipt && <p role="alert">Xác nhận sẽ hoàn tất đơn và bắt đầu giải ngân cho người bán.</p>}<button type="button" className="button button-primary" disabled={busy} onClick={() => confirmReceipt ? void receive() : setConfirmReceipt(true)}>{confirmReceipt ? "Xác nhận đã nhận hàng" : "Tôi đã nhận hàng"}</button>{confirmReceipt && <button type="button" className="button button-secondary" onClick={() => setConfirmReceipt(false)}>Quay lại</button>}</div>}
      {deadlinePassed && status === "PENDINGPAYMENT" && <p role="status">Đã quá hạn thanh toán.</p>}
    </>}
    {error && <p role="alert" className="notice">{error}</p>}{success && <p role="status" className="form-success">{success}</p>}
  </section>;
}
