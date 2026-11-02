"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { api, type ApiResponse } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/use-api-resource";

type PaymentOrder = { id: string; status: string; totalAmount: number; paymentDeadlineAt: string };

function PaymentResultContent() {
  const orderId = useSearchParams().get("orderId") ?? "";
  const order = useApiResource(orderId ? `/api/v1/orders/${orderId}` : null, async () => {
    const response = await api.get<ApiResponse<PaymentOrder> | PaymentOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}`);
    return "data" in response ? response.data : response;
  });
  const status = (order.data?.status ?? "").replace(/[^a-z]/gi, "").toUpperCase();
  return <main className="card card-pad">
    <h1>Kết quả thanh toán</h1>
    {!orderId ? <p>Thiếu mã đơn hàng để tra cứu.</p> : order.loading ? <p>Đang kiểm tra trạng thái đơn hàng…</p> : order.error ? <p role="alert">{order.error.message}</p> : status === "PAID" ? <p>Backend đã xác nhận thanh toán cho đơn {orderId}.</p> : <p>Backend chưa xác nhận thanh toán đơn. Trạng thái hiện tại: {order.data?.status ?? "Chưa rõ"}. Trang quay về từ cổng thanh toán không tự xác nhận đơn đã trả tiền.</p>}
    {orderId && <button className="button button-secondary" type="button" disabled={order.loading} onClick={() => order.reload()}>Kiểm tra lại trạng thái</button>}
    {orderId && <Link href={ROUTES.buyer.order(orderId)}>Xem chi tiết đơn hàng</Link>}
  </main>;
}

export default function PaymentResultPage() {
  return <Suspense fallback={<p>Đang kiểm tra đơn hàng…</p>}><PaymentResultContent /></Suspense>;
}
