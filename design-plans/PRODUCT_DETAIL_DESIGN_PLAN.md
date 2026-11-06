# Kế hoạch thiết kế trang chi tiết sản phẩm NEXUS

Written against: `nexus-dev` commit `21d87ac` (05/11/2026).

## Evidence chain

- Surface: `/catalog/[id]` → `src/app/(public)/catalog/[id]/page.tsx` → `src/features/catalog/CatalogScreens.tsx:111`.
- Vấn đề: giao diện chỉ hiển thị ảnh đầu tiên, tên, thương hiệu, giá, trạng thái kỹ thuật, số biến thể, chọn SKU, số lượng, thêm vào giỏ và mô tả. Ảnh sản phẩm, thuộc tính SKU, thông số và điểm đánh giá đã có trong response nhưng chưa được dùng. Ảnh chính dùng `object-fit: cover`, có thể cắt sản phẩm.
- Tham chiếu: [eBay Dell Latitude](https://www.ebay.com/itm/287704858362) đặt ảnh, tình trạng hàng, người bán, tồn, vận chuyển và đổi trả quanh quyết định mua; [Vmart AirPods](https://vmartplus.w2.exdomain.net/apple-airpods-pro-vn/a) đặt ảnh, giá, mua hàng và bảng thông số theo nhóm.
- Design evidence: NEXUS hiện dùng `--ink #0f172a`, `--sky #0284c7`, `--sky-dark #0369a1`, `--canvas #f8fafc`, `--line #e2e8f0`, `--surface #fff` và font Plus Jakarta Sans trong `src/styles/globals.css`. Các primitive `Badge`, `Card`, `SectionHeading`, `BackendImage` đã được trang dùng.
- Owner: `src/features/catalog/CatalogScreens.tsx`, `src/styles/globals.css`; nguồn dữ liệu `Catalog.Application/Services/Product/ProductDtos.cs` bên backend.
- Scope: trang chi tiết sản phẩm mua ngay của Buyer. Không áp dụng nguyên trạng cho trang đấu giá.
- Uncertainty: cần thử API đang chạy để xác nhận ảnh, thông số, rating và kho có dữ liệu thật; phải xác nhận quy tắc tổng hợp tồn qua nhiều kho trước khi hiển thị số lượng còn lại.

## Design decision

Xây trang theo trật tự quyết định mua: **nhận diện sản phẩm → chọn đúng SKU → biết giá và khả năng mua → hiểu đặc tính → biết người bán và điều kiện sau mua**. Giữ nhận diện xanh, trắng và nét chữ hiện có của NEXUS. Trên desktop, ảnh là điểm nhấn ở trái; thông tin và nút mua nằm ở phải. Dưới vùng mua là mô tả, thông số, thông tin người bán và sản phẩm liên quan. Trên mobile, xếp theo cùng trật tự đọc; nút thêm giỏ luôn rõ sau khi chọn SKU.

```text
Desktop
Breadcrumb: Trang chủ / Sản phẩm / Danh mục / Tên sản phẩm
┌─────────────────────────────┬──────────────────────────────┐
│ Ảnh lớn, giữ trọn sản phẩm   │ Tên, thương hiệu, điểm sao    │
│ Dải ảnh nhỏ, chuyển ảnh/SKU  │ Giá của SKU đang chọn         │
│                             │ Tùy chọn SKU + thuộc tính     │
│                             │ Tình trạng mua + số lượng     │
│                             │ [Thêm vào giỏ] [Xem giỏ]     │
│                             │ Người bán, vận chuyển/chính sách│
└─────────────────────────────┴──────────────────────────────┘
Mô tả · Thông số · Người bán · Sản phẩm liên quan

Mobile
Breadcrumb → Tên → Ảnh/dải ảnh → Giá/rating → SKU → Tồn/số lượng → CTA
→ Mô tả → Thông số → Người bán → Sản phẩm liên quan
```

## Nội dung cần hiển thị

| Nhóm | Nội dung | Nguồn và điều kiện |
| --- | --- | --- |
| Nhận diện | Tên, thương hiệu, danh mục, breadcrumb, mã SKU | Catalog có tên, brand, category, variants.skuCode; breadcrumb nhiều cấp cần dữ liệu danh mục cha. |
| Hình ảnh | Ảnh chính, thumbnail, ảnh theo biến thể, alt text; trạng thái không có ảnh | Catalog có `images`, `variants[].images`, `primaryImageUrl`, `variantId`, `isActive`, `sortOrder`. |
| Giá và lựa chọn | Giá SKU được chọn, thuộc tính như màu/kích cỡ, trạng thái SKU, số lượng hợp lệ | Catalog có `variants[].price/status/isActive/attributes`; không có giá gạch ngang hay mức giảm. |
| Khả năng mua | Còn hàng/hết hàng, giới hạn số lượng, nút thêm giỏ, phản hồi thành công/lỗi | Fulfillment có `GET /api/v1/inventories/{skuId}`; cần xác nhận ngữ nghĩa nếu một SKU ở nhiều kho. Commerce có thêm giỏ. |
| Nội dung sản phẩm | Mô tả, bảng thông số theo nhóm nếu dữ liệu có cấu trúc, tình trạng hàng nếu được khai báo | Catalog có `description` và `specifications` dạng chuỗi; chưa có trường tình trạng hàng. Không tự suy diễn hàng mới/chính hãng. |
| Tin cậy | Người bán, tên shop, logo, rating shop, trang shop | UserService có `GET /api/v1/sellers/{id}`; Catalog trả `sellerId`. Chỉ hiện các thuộc tính response cung cấp. |
| Đánh giá | Điểm trung bình và số lượt đánh giá | Catalog trả `rating.avgRating/reviewCount`; chưa xác minh được API danh sách bài đánh giá sản phẩm. Với 0 lượt, hiện “Chưa có đánh giá”. |
| Giao nhận và sau mua | Phí/ước tính giao, phạm vi giao, đổi trả, bảo hành, phương thức thanh toán | Chưa nằm trong ProductDetailDto; chỉ hiển thị khi có chính sách hoặc API tin cậy. |
| Khám phá tiếp | Sản phẩm cùng danh mục, loại trừ sản phẩm hiện tại, chỉ sản phẩm REGULAR đang bán | Có thể dùng tìm kiếm Catalog; không đưa carousel tràn lan lên trước vùng thông tin mua. |

Các tiện ích như lưu yêu thích, so sánh, chia sẻ, mua ngay và hỏi người bán là giai đoạn sau; chỉ triển khai khi hành động có đích và luồng hoàn chỉnh. eBay có cả “Make offer” vì đây là cơ chế giá của listing đó, không áp dụng mặc định cho sản phẩm niêm yết NEXUS.

## Reuse

- Token và kiểu chữ: `src/styles/globals.css:1` (`--sky`, `--ink`, `--muted`, `--canvas`, `--line`, `--surface`, `--font-ui`).
- UI: `BackendImage`, `Badge`, `Card`, `SectionHeading`, button/link và notice hiện có.
- Exemplar ảnh nhiều góc: gallery ở `src/features/auction/AuctionPages.tsx` và `.auction-gallery` trong `src/styles/globals.css`; học cách chuyển ảnh, nhưng tạo tên lớp riêng cho catalog nếu hành vi SKU khác nhau.
- Không tạo một bộ card mới chỉ để lặp lại phong cách trên cùng trang.

## Changes

1. `src/features/catalog/CatalogScreens.tsx`
   - Giữ `ProductDetailResponse` đầy đủ: `sellerId`, `saleType`, `specifications`, `rating`, `images`, `variants[].attributes/images/primaryImageUrl`; chuẩn hóa null và thứ tự ảnh tại biên API.
   - Render breadcrumb, gallery ảnh đang active, tên/brand/rating, thuộc tính và giá SKU đã chọn. Khi đổi SKU, chuyển sang ảnh tương ứng nếu có, nếu không giữ ảnh sản phẩm.
   - Hiển thị trạng thái mua bằng ngôn ngữ Buyer (“Còn hàng”, “Hết hàng”, “Chưa thể mua”) thay cho `ACTIVE` thô; chặn thêm giỏ với SKU không hợp lệ. Thông báo giá/tồn không rõ ràng khi API thiếu dữ liệu, không tự gán 0.
   - Giữ mô tả; render thông số chuỗi một cách an toàn. Chỉ chia bảng nhóm nếu định dạng nguồn rõ ràng; không dùng HTML trực tiếp từ chuỗi.
   - Kết nối profile shop công khai qua `sellerId`; xử lý loading/404 độc lập để lỗi shop không làm mất trang sản phẩm.
   - Thêm sản phẩm liên quan từ API tìm kiếm cùng category sau vùng nội dung chính, lọc id hiện tại và các sản phẩm không mua được.
2. `src/styles/globals.css`
   - Dùng layout hai cột cân đối trên desktop, `object-fit: contain` cho ảnh chính, thumbnail có trạng thái chọn rõ; giữ nền trắng và đường viền hiện có.
   - Ở màn hẹp, xếp một cột, giữ tên/giá/CTA nhìn rõ và tránh cuộn ngang. Bảo đảm focus và nhãn cho điều khiển gallery/SKU.
3. Hợp đồng dữ liệu cần quyết định trước khi mở rộng UI
   - Xác nhận `GET /api/v1/inventories/{skuId}` là tồn tổng hay một kho; nếu không tổng hợp đúng, chỉ hiện trạng thái từ nguồn được xác nhận hoặc chờ endpoint tổng hợp.
   - Bổ sung nguồn cho giao hàng, đổi trả, bảo hành, tình trạng hàng, đánh giá chi tiết, giá khuyến mãi và ETA nếu muốn hiển thị. Không điền văn bản quảng cáo mẫu hoặc dữ liệu giả.
   - Mở rộng form Seller cho `specifications` nếu muốn bảng thông số dùng được rộng rãi; hiện thao tác tạo mới gửi `specifications: null`.

## Scope

- Inherit: trang `/catalog/[id]` của Buyer.
- Verify: ảnh theo SKU, trạng thái không có ảnh, sản phẩm một/nhiều SKU, rating 0, giá null, mô tả dài, lỗi profile shop, lỗi tồn kho và sản phẩm hết hàng.
- Exclude: trang đấu giá, flow thanh toán, chính sách không có dữ liệu, giao diện Seller và nội dung không được API xác nhận.

## Validation

- Product: Buyer xác định được đúng SKU, giá và khả năng mua trước khi thêm giỏ; sau khi thêm, thông báo và giỏ nhất quán.
- Interface: desktop 1440px, tablet 768px, mobile 390px; ảnh ngang/dọc, tên rất dài, 1 và nhiều biến thể; bàn phím, focus và thông báo lỗi.
- System: dùng token và primitive NEXUS; không sao chép màu đỏ Vmart hay bố cục thương mại eBay nguyên xi.
- Repository: `cd nexus-dev; npm run typecheck; npm run lint; npm run build` → tất cả thành công sau khi triển khai.

## Stop conditions

- Dừng việc hiển thị số tồn, thời gian giao, bảo hành, hoàn trả hoặc giá giảm nếu dữ liệu nguồn không có hợp đồng rõ ràng.
- Dừng việc dùng thông số có cấu trúc khi chuỗi `specifications` thực tế không có định dạng ổn định.

## Design documentation

- Sau khi được chấp nhận và kiểm chứng: ghi quy tắc gallery theo SKU, thứ tự thông tin mua và trạng thái thiếu dữ liệu vào tài liệu thiết kế của NEXUS nếu nhóm duy trì tài liệu đó; hiện chưa tìm thấy `DESIGN.md` điều hành surface này.
