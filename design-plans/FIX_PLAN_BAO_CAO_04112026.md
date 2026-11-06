# Kế hoạch sửa theo báo cáo kiểm tra 04/11/2026

Written against: FE `nexus-dev@5f6f48e` (dev), BE `dev` mới nhất (CommerceService `49d559d`, Catalog `172209b`, Fulfillment `c5717d1`, Gateway `ee3d04a`, Wallet `133e9c3`).

Quyết định của chủ sản phẩm (ghi trong báo cáo): mục 1 → bật nút; mục 2 → khóa flow tại bước nhập địa chỉ; mục 3,4,6,7,8 → hoãn, dùng cùng phương án khóa; mục 5 → thống nhất 15 phút; mục 9 → tìm hướng sửa.

## Kết quả kiểm chứng báo cáo

| # | Mức | Kết luận | Bằng chứng đã đối chiếu |
|---|-----|----------|-------------------------|
| 1 | P0 FE | **Đúng** | `CatalogScreens.tsx:132` có `<button ... disabled>Thêm vào giỏ</button>`; `CartsController.cs:72` `POST me/items`; Gateway `carts-route`. Payload: `{ skuId, quantity, productId? }` (`AddCartItemRequest`). |
| 2 | P0 FE | **Đúng** | `BuyerCommerceScreens.tsx:41` checkbox `disabled`, `:45` nút "Tiếp tục thanh toán" `disabled`, `:58` 3 input `disabled`. BE: `OrdersController.cs:26` quote, `:39` create. `CreateOrderRequest` cần `QuoteId`. `commerce.service.ts` chưa có hàm quote/create. |
| 3 | P0 FE/BE | **Đúng một phần** | FE khóa nút (`:86`) đúng. Commerce không có `pay`/`simulate-webhook`. **Báo cáo bỏ sót**: Wallet đã có `POST /wallets/vnpay/ipn` (`WalletsController.cs:140`) và `POST /wallets/checkout/direct` (`:191`). Chưa chứng minh được IPN này hoàn tất đơn Commerce. Dòng `OrderService.cs:382` chưa đối chiếu. |
| 4 | P0 BE | **Đúng** | `FulfillmentClient.cs:382` gửi `new { subOrderId }`; `CreateShipmentRequest` bắt buộc `OrderId, SubOrderId, SellerId, RecipientName, RecipientPhone, ShippingAddress`; gọi tại `OrderService.cs:820` trong `SellerAcceptSubOrderAsync`, `catch {}` nuốt lỗi (`:822`). |
| 5 | P1 | **Đúng, nhưng hướng sửa nằm ở FE** | BE đã dùng 15 phút (`OrderService.cs:135,344,362,373`). Chỉ có text FE `BuyerCommerceScreens.tsx:56` nói "giữ kho 30 phút" là sai. Chưa kiểm tra TTL của quote và worker hết hạn. |
| 6 | P1 BE | **Đúng** | `FulfillmentClient.cs:34-38` mặc định `FailOpen = true`; `:137` trả tồn giả 100. Không có `StockPolicy:FailOpen` trong bất kỳ json/env nào của repo, nên hiệu lực mặc định là `true`. |
| 7 | P1 FE/Gateway | **Đúng về route, chưa xác nhận shape** | `Gateway appsettings.json:147-151` đưa `/api/v1/shipments/order/**` sang `commerce-cluster`; `OrdersController.cs:149` trả tracking của Commerce. FE `fulfillment.service.ts:6` ép kiểu `Shipment`. Cần đọc `GetShipmentTrackingAsync` để chốt DTO. |
| 8 | P1 FE/BE | **Đúng** | `SellerScreens.tsx` `SellerOrdersScreen` chỉ có `NoData`; nút accept/reject `disabled`. BE chỉ có list theo buyer (`OrdersController.cs:210`), không có list theo seller. Dòng số trong báo cáo (315) đã lệch vài dòng. |
| 9 | P2 FE | **Đúng** | `SellerScreens.tsx` select dùng toàn bộ danh mục; `ProductService.cs` ~277-283 ném `Products can only be assigned to a leaf category.` `ProductCategory` ở FE không có `parentId` dù `CategoryItemDto` trả `ParentId`/`Children`. |

Độ chính xác: 9/9 mục có căn cứ, 2 mục cần chỉnh nội dung (3 thiếu Wallet, 5 sai tầng sửa), 1 mục chưa chốt shape (7).

---

## Plan A — Bật "Thêm vào giỏ" (mục 1)

- Surface: `src/features/catalog/CatalogScreens.tsx` `ProductDetailScreen`
- Evidence: nút `disabled` cứng; state `selectedSkuId`/`selectedVariant` đã có sẵn; BE cần `skuId` + `quantity`.
- Owner: `src/features/commerce/services/commerce.service.ts`
- Changes:
  1. `commerce.service.ts`: thêm `addCartItem({ skuId, quantity, productId })` → `api.post("/api/v1/carts/me/items", ...)`, dùng lại `unwrap`.
  2. `CatalogScreens.tsx`: nút bật khi đã chọn variant `ACTIVE` có `price > 0`; thêm ô số lượng (min 1); trạng thái "Đang thêm…", thông báo thành công kèm link `ROUTES` giỏ hàng, hiển thị lỗi API. Nếu chỉ có một variant, chọn sẵn.
  3. Chưa đăng nhập hoặc không phải buyer: chuyển tới đăng nhập, không gọi API.
- Verify: thêm 1 SKU → `/buyer/cart` hiện đúng dòng, `itemCount` tăng. Nút vẫn khóa khi chưa chọn biến thể.

## Plan B — Khóa checkout tại bước địa chỉ (mục 2, 3, 4, 6, 7, 8)

- Surface: `src/features/commerce/BuyerCommerceScreens.tsx` (giỏ, checkout, chi tiết đơn)
- Decision: giữ nguyên "xem giỏ → Tiếp tục thanh toán → nhập thông tin giao hàng", dừng tại đó. Không gọi quote/order.
- Changes:
  1. Giỏ (`:41,45`): bật checkbox chọn dòng và nút "Tiếp tục thanh toán" khi có ≥1 dòng được chọn; truyền các `cartItemId` đã chọn sang trang checkout (state/query).
  2. Checkout (`:53-66`): bật 3 input người nhận / SĐT / địa chỉ với validation cục bộ; **giữ khóa** phần chọn phương thức thanh toán và nút "Đặt hàng", kèm một dòng giải thích ngắn "Thanh toán chưa mở trong bản demo này".
  3. Thay `notice` ở `:56` ("API báo giá... giữ kho 30 phút") bằng nội dung đúng: chỉ nhập thông tin giao hàng, thanh toán tạm khóa. Bỏ số "30 phút" (mục 5).
  4. Chi tiết đơn (`:86`), màn Seller đơn / vận đơn: giữ khóa, thay câu "Chưa có API…" bằng câu mô tả đúng trạng thái tạm hoãn (không còn khẳng định BE thiếu API khi BE đã có).
  5. Lưu thông tin địa chỉ: mặc định chỉ giữ trong state phiên, không gọi API. Cần chủ sản phẩm xác nhận (câu hỏi 1).
- Exclude: BE mục 4 (payload vận đơn), 6 (FailOpen), 7, 8 — ghi vào backlog, không làm trong đợt này.
- Verify: không có request tới `/checkouts/quote` hoặc `/orders` trong tab Network.

## Plan C — Thống nhất 15 phút (mục 5)

- Changes: (1) sửa text FE như Plan B.3; (2) đọc và xác nhận TTL của quote (`CheckoutQuote` expiry) và worker hết hạn reservation cũng là 15 phút; nếu lệch, báo lại để sửa BE.
- Stop condition: nếu quote hoặc worker không phải 15 phút, dừng và hỏi vì đó là thay đổi BE.

## Plan D — Chỉ cho chọn danh mục lá (mục 9)

- Surface: `src/features/seller/SellerScreens.tsx` `SellerProductEditorScreen`; `catalog.service.ts` `categories()`.
- Evidence: BE từ chối danh mục có con; `CategoryItemDto` có `ParentId`, `Children`.
- Changes:
  1. `ProductCategory` thêm `parentId?: string | null` (+ `isDisabled?`); `categories()` giữ nguyên phân trang.
  2. Tính tập lá: danh mục không xuất hiện làm `parentId` của danh mục khác và không `isDisabled`.
  3. `<select>`: dùng `<optgroup>` theo danh mục cha, chỉ `<option>` cho lá; hiển thị đường dẫn "Cha › Con" để phân biệt tên trùng.
  4. Hiển thị lỗi `leaf category` từ BE bằng câu tiếng Việt dễ hiểu phòng trường hợp lệch dữ liệu.
- Uncertainty: `/api/v1/categories` trả phẳng hay có cây; cần gọi thử để chốt cách tính lá.
- Verify: chọn danh mục cha không thể; lưu sản phẩm với danh mục lá thành công.

## Plan E — Hạng mục nhỏ kèm theo (code-review, không nằm trong báo cáo)

- `SellerScreens.tsx`: `window.location.assign` → `router.push` sau khi tạo sản phẩm.
- `unwrap` bị lặp ở `catalog.service.ts`, `commerce.service.ts`, `fulfillment.service.ts`, `SellerScreens.tsx` → gom về `@/lib/api/client`.
- Form tạo sản phẩm: thêm hai `SectionHeading` "Thông tin sản phẩm" / "Biến thể đầu tiên".

## Backlog BE (đã hoãn, ghi nhận để không mất)

1. Mục 4: `CreateShipmentAsync` cần gửi đủ `orderId, sellerId, recipient*, shippingAddress`; chuyển điểm kích hoạt sang sau thanh toán; không nuốt lỗi.
2. Mục 6: đặt `StockPolicy:FailOpen=false` ở môi trường demo hoặc đổi mặc định thành `false`.
3. Mục 7: chọn một — FE đọc DTO Commerce, hoặc Gateway bỏ route `commerce-shipments-order-route`.
4. Mục 8: thêm `GET /api/v1/orders/seller/{sellerId}` (hoặc `/sub-orders`) cho Seller.
5. Mục 3: xác minh Wallet IPN có gọi ngược Commerce để chuyển đơn khỏi `PENDING_PAYMENT`.

## Validation chung

- Repository: `npm run typecheck` và `npm run lint` trong `nexus-dev` → không lỗi.
- Product: chạy các luồng Plan A, B, D thủ công trên `http://localhost:3000`.
- System: dùng lại `Card`, `PageHeading`, `SectionHeading`, `button button-primary/secondary`, `notice`, `status-note`; không thêm component mới.

## Stop conditions

- Dừng nếu chủ sản phẩm muốn gọi API quote trong bước địa chỉ (sẽ phải xử lý TTL và giữ kho).
- Dừng nếu `/api/v1/categories` không trả `parentId`.

## Design documentation

- Sau khi nghiệm thu: không có `DESIGN.md`; không cần ghi tài liệu thiết kế.

