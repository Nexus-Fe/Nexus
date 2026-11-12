# Kế hoạch hoàn thiện luồng Auction (FE) và nối các endpoint BE chưa dùng

Written against: FE `ce8299e` (`origin/dev`), BE `dev` (AuctionService, CommerceService, WalletService mới nhất ngày 12/11/2026).
Phạm vi: `nexus-dev-fe/src/features/auction`, `src/widgets/payment`, các route auction dưới `src/app`.
Quy ước: kế hoạch này chỉ mô tả, chưa sửa mã nguồn. Người thực thi không có ngữ cảnh hội thoại nên mọi hợp đồng API được ghi đầy đủ bên dưới.

---

## 0. Bằng chứng hiện trạng

- Surface: các route auction ở `src/app/(public)/auctions`, `(dashboard)/{buyer,seller,staff,admin}/auctions`.
- Design language: `None documented` (không có `DESIGN.md`). Token thực tế nằm ở [globals.css](file:///c:/Users/wuann_/Desktop/new-nexus/nexus-dev-fe/src/styles/globals.css): `--font-ui` (Plus Jakarta Sans), `--ink`, `--muted`, `--sky`/`--sky-dark`/`--sky-soft`, `--indigo`, `--red*`, `--green*`, `--amber*`, `--canvas`, `--line`, `--surface`. Lớp `.auction-*` (khoảng 114 selector) đã có sẵn. Giữ nguyên nhận diện này, không tạo palette mới.
- Vấn đề chặn luồng:
  1. [auction.service.ts](file:///c:/Users/wuann_/Desktop/new-nexus/nexus-dev-fe/src/features/auction/services/auction.service.ts): `create`, `update`, `cancel`, `recreate`, `placeBid`, `saga` đều gọi `unsupportedWrite()` và ném lỗi.
  2. [AuctionPages.tsx](file:///c:/Users/wuann_/Desktop/new-nexus/nexus-dev-fe/src/features/auction/AuctionPages.tsx#L80-L82): `depositVerified = false` gán cứng, nút đặt giá luôn khóa. BE hiện **không có khái niệm đặt cọc đấu giá** (không có `/deposit`, không có `hasDeposited`), chỉ kiểm tra `minReputationToBid` và quyền bid. Điều kiện này phải bỏ.
  3. [AuctionOrderPayment.tsx](file:///c:/Users/wuann_/Desktop/new-nexus/nexus-dev-fe/src/widgets/payment/AuctionOrderPayment.tsx): gọi `commerceService.getOrderById` (đơn thường) và có `bankCode` kiểu VNPay. BE có controller riêng `api/v1/auction-orders`. WalletService đã chuyển sang Stripe.
  4. Kiểu dữ liệu lệch BE: `AuctionResult` ở FE có `hasWinner`, `winnerDisplayName`, `orderId`, `paymentDeadlineAt`, `paidAt` nhưng `AuctionResultDto` của BE chỉ có `Status, WinnerId, WinningBidId, FinalPriceAmount, DeterminedAt`. Các trường còn lại nằm ở `AuctionSettlementDto`. `AuctionDetail` FE thiếu `rowVersion` (cần cho `If-Match`).
- Uncertainty cần xác nhận với BE trước khi code (xem mục 6): format `ETag` / `If-Match`, quyền staff với force-cancel, nguồn của `ShippingAddress` (GHN id).

---

## 1. Hợp đồng API BE đã có (nguồn: controller và DTO ở `nexus-dev-be`)

### AuctionService
| Hành động | Endpoint | Request | Response |
|---|---|---|---|
| Tạo phiên | `POST /api/v1/auctions` | `skuId, startPriceAmount, bidStepAmount?, scheduledStartAt, scheduledEndAt` (productId lấy từ SKU) | `AuctionCreatedResponse` |
| Sửa phiên (SCHEDULED) | `PUT /api/v1/auctions/{id}` | `startPriceAmount?, bidStepAmount?, scheduledStartAt?, scheduledEndAt?` | `AuctionUpdatedResponse` |
| Hủy (seller) | `POST /api/v1/auctions/{id}/cancel` | `{ reason? }` (body có thể rỗng) | `AuctionCancelledResponse` |
| Tạo lại | `POST /api/v1/auctions/{id}/recreate` | giống Update | `AuctionRecreatedResponse` |
| Đặt giá | `POST /api/v1/auctions/{id}/bids` | `{ amount }` + header **`Idempotency-Key`**, **`If-Match` = RowVersion** | `PlaceBidResponse` (có `currentPriceAmount, scheduledEndAt, extensionCount, rowVersion`) |
| Phiên của seller | `GET /api/v1/seller/auctions?page&pageSize&status` | | `PagedData<AuctionSummaryDto>` |
| Offer cho người thắng | `GET /api/v1/me/auction-offers`, `POST /auctions/{id}/winner-offers/{offerId}/accept`, `.../decline` (`{reason?}`) | | `WinnerOfferDto`, `WinnerOfferResponse` |
| Settlement | `GET /api/v1/auctions/{id}/settlement`, `GET /api/v1/auction-settlements` | | `AuctionSettlementDto` |
| Admin | `GET /api/v1/admin/auctions/{id}/saga`, `POST .../force-cancel` | `{ reason }` | `AuctionSagaDto` |

### CommerceService, `api/v1/auction-orders`
| Hành động | Endpoint | Ghi chú |
|---|---|---|
| Xem chi tiết đơn | `GET /{auctionOrderId}` | `AuctionOrderDetailResponse` (`status`, `paymentDeadlineAt`, `sellerRespondDeadlineAt`, các mốc thời gian, `platformFeeAmount`, `sellerReceiveAmount`) |
| Nhập địa chỉ giao | `PUT /{id}/shipping` | `shippingAddress` (gồm `ghnDistrictId`, `ghnWardCode`) và `contactPhone` |
| Thanh toán bằng ví | `POST /{id}/pay` | `PayAuctionOrderResponse` |
| Seller chấp nhận / từ chối | `POST /{id}/accept` (`note?`), `POST /{id}/reject` (`reasonNote`, `reasonCode`) | `SellerRespondResponse` |
| Buyer xác nhận nhận hàng | `POST /{id}/confirm-receipt` | `ConfirmReceiptResponse` |
| Đơn của seller | `GET /seller?page&pageSize` | `PagedAuctionOrderSummary` |

Luồng nghiệp vụ theo BE: `SCHEDULED → RUNNING → ENDED → (settlement) → đơn auction chờ địa chỉ → chờ thanh toán trong hạn → PAID → seller accept/reject → giao hàng → confirm-receipt → SETTLED`. Nếu buyer không thanh toán kịp hoặc seller từ chối thì phát sinh `winner-offer` cho người trả giá kế tiếp.

---

## 2. Định hướng thiết kế (frontend-design)

Chủ đề: sàn đấu giá trực tiếp cho người mua và người bán. Việc chính của trang là để người dùng **biết giá đang ở đâu, còn bao lâu và việc tiếp theo cần làm là gì**. Giữ bảng màu sky/indigo/amber hiện có. Chỉ dồn sự chú ý vào một điểm: **khối giá và đồng hồ trong phòng đấu giá**.

Quyết định thiết kế:
- Phòng đấu giá `/auctions/[id]`: hai cột trên desktop (ảnh, mô tả và lịch sử bid bên trái; khối giá, đồng hồ và ô đặt giá dính bên phải), một cột trên mobile với thanh đặt giá cố định ở đáy.
- Đồng hồ đếm ngược là điểm nhấn duy nhất, dùng số tabular. Khi chống bắn tỉa gia hạn thì hiển thị `Đã gia hạn 5 phút (lần 1/3)` bằng một dòng chú thích. Không dùng hiệu ứng nháy.
- Bước giá nhanh bằng nút `+bidStep`, `+2×`, `+5×` tính từ `bidStepAmount` do BE trả về, không hard-code 10k/20k/50k.
- Tiến trình sau phiên là chuỗi tuần tự thật, nên dùng thanh bước (stepper) có ý nghĩa: `Thắng phiên → Nhập địa chỉ → Thanh toán → Chờ người bán xác nhận → Đang giao → Hoàn tất`. Mỗi bước hiển thị hạn chót lấy từ `paymentDeadlineAt` và `sellerRespondDeadlineAt`.
- Văn phong: động từ rõ ràng, một hành động giữ cùng một tên xuyên suốt (nút `Đặt giá` sinh thông báo `Đã đặt giá`; nút `Thanh toán bằng ví` sinh `Đã thanh toán`). Lỗi nêu nguyên nhân và cách xử lý, ví dụ `Giá của bạn đã bị vượt. Giá hiện tại là X, hãy đặt tối thiểu Y`.
- Tránh: nhãn viết hoa toàn bộ phía trên mỗi tiêu đề, thẻ bo tròn đồng loạt, gradient trang trí.

Wireframe phòng đấu giá (desktop):

```
+--------------------------------------+---------------------------+
| Ảnh lớn + dải ảnh nhỏ                | Tên sản phẩm              |
|                                      | Giá hiện tại   2.350.000  |
| Mô tả, thông số                      | Còn lại  00:12:41         |
|                                      | (gia hạn lần 1/3)         |
| Lịch sử đặt giá (sequenceNo, ẩn tên) | Giá tối thiểu  2.400.000  |
| #14  an***  2.350.000  isWinning     | [ 2.400.000 ] [Đặt giá]   |
| #13  bi***  2.300.000  outbid        | +50k  +100k  +250k        |
+--------------------------------------+---------------------------+
```

---

## 3. Kế hoạch triển khai theo giai đoạn

### Giai đoạn A: Nền tảng dịch vụ và kiểu dữ liệu
1. `src/features/auction/types/index.ts`
   - Thêm `rowVersion: number` vào `AuctionDetail`.
   - Thêm kiểu `PlaceBidResponse`, `AuctionSettlement`, `WinnerOffer`, `AuctionOrderDetail`, `AuctionOrderSummary`, `ShippingAddress`, `SubmitShippingInput`.
   - Sửa `AuctionResult` theo `AuctionResultDto`, và dùng `AuctionSettlement` cho `orderId`, `paymentDeadlineAt`, `paidAt`. Sửa `CreateAuctionRequest` còn `skuId` và bỏ `productId` nếu BE không nhận.
   - Verify: `npm run typecheck` không lỗi.
2. `src/features/auction/services/auction.service.ts`
   - Thay các hàm `unsupportedWrite` bằng lời gọi thật: `create`, `update`, `cancel`, `recreate`, `placeBid` (header `If-Match` và `Idempotency-Key` sinh bằng `crypto.randomUUID()` cho mỗi lần bấm), `saga`.
   - Thêm `sellerList` gọi `/api/v1/seller/auctions`, `settlement`, `myOffers`, `acceptOffer`, `declineOffer`, `settlements` (admin).
   - Preserve: `forceCancel`, `parseAuctionList` và `getWithMetadata` hiện có.
3. Tạo `src/features/auction/services/auction-order.service.ts` cho `/api/v1/auction-orders`: `detail`, `submitShipping`, `pay`, `accept`, `reject`, `confirmReceipt`, `sellerList`.
4. Thêm hook `useAuctionClock` (đồng bộ giờ theo header `Date` của response, hiển thị còn lại, cập nhật `scheduledEndAt` khi bid mới) vào `src/features/auction/hooks/`.

### Giai đoạn B: Luồng người mua (ưu tiên cao nhất)
1. **Phòng đấu giá** (`AuctionRoomScreen` trong `AuctionPages.tsx`)
   - Bỏ `depositVerified` và đoạn ghi chú `auction-deposit-unavailable`. Điều kiện bật nút: `RUNNING`, đã đăng nhập, không phải chủ phiên, `amount ≥ currentPrice + bidStep`.
   - Gọi `placeBid`; thành công thì cập nhật cục bộ từ `PlaceBidResponse` (giá, `scheduledEndAt`, `rowVersion`) rồi làm mới danh sách bid. Xử lý lỗi `409/412` (`If-Match` lệch) bằng cách tải lại chi tiết và giữ giá người dùng đã nhập. Lỗi uy tín (< `minReputationToBid`) hiển thị nêu rõ số điểm thiếu.
   - Cập nhật định kỳ (polling 3 đến 5 giây khi `RUNNING`, tạm dừng khi tab ẩn). Realtime qua WebSocket chỉ làm khi BE cung cấp.
2. **Phiên đã tham gia** (`MyAuctionsScreen`): dùng `me/bids`; trạng thái `Đang dẫn đầu / Bị vượt giá / Thắng / Thua` suy ra từ `isLeading` và `auctionStatus`. Thêm tab `Offer dành cho bạn` từ `me/auction-offers` với nút `Nhận` và `Từ chối` (có hạn `expiresAt`).
3. **Kết quả và thanh toán** (`BuyerAuctionResultScreen`, route `/buyer/auctions/[id]/result` và `/payment`)
   - Lấy `result` và `settlement`. Thua: hiển thị thông báo trung tính, không nhắc hoàn cọc (không có cọc). Thắng: hiển thị stepper và hạn thanh toán.
   - Viết lại `AuctionOrderPayment`: dùng `auction-order.service`; bước `Nhập địa chỉ giao` (form 2 cấp tỉnh/quận/phường lấy GHN id, tái sử dụng component địa chỉ checkout hiện có) rồi `Thanh toán bằng ví`. Bỏ `bankCode`. Nếu số dư ví không đủ, hiện nút `Nạp tiền` dẫn tới `/buyer/wallet/top-up`.
   - Sau khi `PAID`: hiển thị `Chờ người bán xác nhận trước <sellerRespondDeadlineAt>`; khi giao xong có nút `Xác nhận đã nhận hàng`.

### Giai đoạn C: Luồng người bán
1. `SellerAuctionEditorScreen` (`/seller/auctions/new`, `/edit`, `/recreate`): form chọn SKU của sản phẩm (từ `seller/products`), giá khởi điểm, bước giá, giờ bắt đầu và kết thúc. Kiểm tra phía client: bắt đầu trong tương lai, kết thúc sau bắt đầu. `edit` chỉ mở khi `SCHEDULED`; `recreate` điền sẵn từ phiên cũ. Bỏ `AuctionComingSoon` ở `AuctionOperations.tsx` (dòng 45) và `AuctionPages.tsx` (dòng 53).
2. `OperationsListScreen` (seller) gọi `sellerList`. Thêm hành động `Hủy phiên` (có hộp xác nhận và lý do) khi `SCHEDULED`.
3. `/seller/auctions/[id]/result`: dùng `settlement` (người thắng, giá chốt, `orderId`, trạng thái thanh toán).
4. **Mới** `src/features/auction/SellerAuctionOrders.tsx`, route `/seller/auction-orders`: danh sách `auction-orders/seller`, nút `Chấp nhận` và `Từ chối` (bắt buộc lý do). Thêm mục vào menu seller trong `constants/navigation.ts` và `constants/routes.ts`.

### Giai đoạn D: Vận hành staff và admin
1. Staff và admin `OperationsDetailScreen`: nối `saga` (hiển thị `steps`, `waitingFor`, `isOverdue`) và `force-cancel` (bắt buộc lý do).
2. **Mới** màn `Quyết toán đấu giá` cho admin dựa trên `GET /api/v1/auction-settlements` (lọc theo trạng thái và ngày). Chỉ làm sau khi Giai đoạn B và C hoàn tất.

### Giai đoạn E: Các endpoint BE đã có khác (ngoài auction)
Thực hiện sau auction, mỗi mục một PR nhỏ: `confirm-return` (seller), rút tiền `POST /wallets/withdrawals`, hiển thị uy tín (`/me/reputation`, `/users/{id}/reputation`), và audit log `/api/v1/logs`. Ví dụ Stripe: đọc `nexus-dev-be/WalletService/docs/api/stripe/frontend-gateway-handover.md` trước khi sửa `wallet.service.ts` (`topups/vnpay` và `checkout/direct` đã thay đổi hợp đồng).

---

## 4. Tái sử dụng

- Token: các biến trong `globals.css`; lớp `.auction-surface`, `.auction-action-note`, `.auction-reputation`.
- Component: `ButtonLink`, `Icon` (`@/components/ui/Primitives`, `@/components/ui/Icon`), `PaginationBar`, `StatusFilter`, `AuctionTile`, `dateText`, `message` trong `AuctionPages.tsx`.
- Hạ tầng: `api` và `ApiError` (`@/lib/api/client`), `useApiResource`.
- Exemplar: [AuctionOperations.tsx](file:///c:/Users/wuann_/Desktop/new-nexus/nexus-dev-fe/src/features/auction/AuctionOperations.tsx) cho bố cục danh sách và chi tiết dashboard.
- Thành phần mới được phép tạo: `AuctionStepper` (chuỗi bước thật, dùng chung cho buyer, seller và order), `useAuctionClock`. Chỉ tạo `AuctionStepper` khi có từ 2 màn trở lên dùng.

## 5. Định nghĩa hoàn thành (luồng auction chạy đầu-cuối)

1. Seller tạo phiên → phiên xuất hiện ở `/auctions` với trạng thái `SCHEDULED`.
2. Phiên chuyển `RUNNING` → hai buyer đặt giá, giá và đồng hồ cập nhật, chống bắn tỉa gia hạn đúng.
3. Phiên `ENDED` → buyer thắng thấy kết quả, nhập địa chỉ, thanh toán bằng ví.
4. Seller chấp nhận đơn → buyer xác nhận nhận hàng → phiên `SETTLED`.
5. Nhánh phụ: seller hủy phiên `SCHEDULED`; staff force-cancel phiên `RUNNING`; buyer bỏ thanh toán → xuất hiện offer cho người kế tiếp.

## 6. Cần BE xác nhận trước khi code

1. Giá trị `ETag` hay `RowVersion` trong body dùng cho `If-Match` (số nguyên hay chuỗi có dấu nháy kép).
2. Staff có được gọi `POST /api/v1/admin/auctions/{id}/force-cancel` không.
3. Có kênh realtime cho bid (SignalR/WebSocket) hay chỉ polling.
4. Danh sách tỉnh, quận, phường GHN lấy từ endpoint nào cho form địa chỉ auction.
5. Điều kiện nào sinh `winner-offer`, và buyer có cần nạp ví trước khi bid không.

## 7. Kiểm thử và rà soát mã (code-review)

- Repository: `npm run typecheck` và `npm run lint` → 0 lỗi sau mỗi giai đoạn.
- Mỗi giai đoạn rà soát hai trục: **Standards** (theo `AGENTS.md`, quy ước Next.js bản này, các smell cơ bản như Duplicated Code ở form seller và order) và **Spec** (đối chiếu bảng mục 1 và mục 5). Chạy `/code-review` với điểm mốc là commit `ce8299e`.
- Giao diện: kiểm tra các trạng thái rỗng, lỗi 409/412, hết hạn thanh toán, ví không đủ tiền; viewport 375px và 1280px; tên người bán dài; số tiền lớn.
- Không merge khi bất kỳ bước nào trong mục 5 chưa chạy được với BE `dev`.

## 8. Stop conditions

- Dừng nếu BE đổi hợp đồng bid (`If-Match`, `Idempotency-Key`) hoặc cần đặt cọc trở lại (khi đó phải thêm API cọc trước).
- Dừng nếu form địa chỉ GHN không có nguồn dữ liệu (chưa thể thanh toán đơn auction).
- Dừng và hỏi lại nếu phạm vi phải mở sang thay thế toàn bộ `AuctionOperations.tsx` thay vì chỉnh sửa.

## 9. Tài liệu thiết kế

- Sau khi nghiệm thu: tạo `DESIGN.md` ghi lại quyết định (stepper auction, quy tắc tên hành động, khối giá và đồng hồ là điểm nhấn duy nhất) và token đang dùng.
