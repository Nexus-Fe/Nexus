# Báo cáo sửa lỗi FE Phase 1 — 04/11/2026

## Phạm vi

Chỉ sửa mã trong `nexus-dev`. Không thay đổi mã, API, cấu hình gateway hay cơ sở dữ liệu của `nexus-dev-be`. Kết luận dưới đây dựa trên hợp đồng BE hiện có và kiểm tra mã FE; chưa có kiểm thử xuyên suốt với các service đang chạy.

## Lỗi và cách sửa

| Vấn đề trước khi sửa | Ảnh hưởng | Sửa ở frontend | Trạng thái |
| --- | --- | --- | --- |
| Form tạo sản phẩm và thêm biến thể không gửi `quantity`, khiến Catalog nhận mặc định `0`. | SKU mới được khai báo tồn `0`; kịch bản nhập 10 đơn vị rồi kích hoạt bị cản ở FE. | Thêm ô **Tồn ban đầu**, kiểm tra số nguyên trong khoảng `0..2147483647`, gửi `variants[].quantity` khi tạo sản phẩm và `quantity` khi thêm biến thể. | Đã sửa payload FE; cần kho Seller hoặc kho dự phòng hợp lệ để Catalog khởi tạo tồn. |
| FE bắt buộc tồn khả dụng dương mới cho kích hoạt, còn Catalog không yêu cầu số lượng dương. | SKU hết hàng bị khóa nút dù API trạng thái cho phép kích hoạt. | Bỏ điều kiện số lượng dương; FE vẫn đợi đọc được bản ghi tồn, hiển thị tồn và cảnh báo khi bằng 0. | Đã xử lý trường hợp tồn 0. Kiểm tra bản ghi tồn là lớp bảo vệ FE bổ sung so với điều kiện BE. |
| Buyer mới gọi `GET /carts/active`; BE trả `404 CART_NOT_FOUND` nếu chưa có cart. | Giỏ rỗng hiện thành lỗi tải giỏ. | Cả màn giỏ/checkout và commerce service chuyển sang `GET /carts/me`, endpoint tạo hoặc trả cart rỗng. | Đã sửa FE. |
| `PATCH /me` gửi `address` là object, trong khi UserService nhận string; `GET /me` cũng trả string. | Lưu hồ sơ bị lỗi validation, địa chỉ đã lưu không điền lại vào form. | Một trường **Địa chỉ liên hệ** tối đa 255 ký tự, điền từ `me.address` và gửi string. Bỏ nhãn “giao hàng mặc định” vì API chưa hỗ trợ địa chỉ giao hàng có cấu trúc. | Đã sửa FE. |
| Màn kho và kiểu TS giả định có `unavailableQuantity`; Fulfillment không trả trường này. | Ô “Không khả dụng” trống dù request thành công. | Bỏ ô đó; hiển thị đúng `totalQuantity`, `availableQuantity`, `reservedQuantity` và sửa kiểu FE theo DTO. | Đã sửa FE. |
| Nút nhập/điều chỉnh tồn của SKU đã có bị khóa, nhưng dòng giải thích nói Fulfillment không có action. | Người bán không thể nhập thêm; thông tin giao diện sai. | Bỏ nút giả và sửa lời giải thích về giới hạn API Seller. | Chưa thể triển khai thao tác nhập thêm chỉ bằng FE. |

## Đường API FE đang dùng sau khi sửa

| Luồng | Request FE | Hợp đồng BE liên quan |
| --- | --- | --- |
| Tạo sản phẩm/SKU | `POST /api/v1/products`, có `variants[].quantity` | Catalog `CreateVariantRequest.Quantity`; Catalog gọi Fulfillment để khai báo tồn ban đầu. |
| Thêm biến thể | `POST /api/v1/products/{productId}/variants`, có `quantity` | Catalog `CreateVariantRequest.Quantity`. |
| Kích hoạt | `PATCH /api/v1/products/{productId}/status` | Catalog kiểm tra biến thể hoạt động, giá và ảnh; không yêu cầu tồn dương. |
| Đọc giỏ Buyer | `GET /api/v1/carts/me` | Commerce `GetOrCreateActiveCartAsync`. |
| Lưu hồ sơ | `PATCH /api/v1/me`, `address` là string | UserService `UpdateProfileApiRequest.Address`. |
| Đọc tồn | `GET /api/v1/inventories/{skuId}` | Fulfillment trả tổng, đang giữ, có thể bán. |

## Giới hạn còn lại do ràng buộc không sửa BE

Nhập thêm hoặc điều chỉnh một SKU **đã có bản ghi tồn** chưa có endpoint Seller an toàn để FE gọi. `POST /api/v1/inventories/initialize` chỉ khai báo lần đầu và từ chối bản ghi trùng; gateway chỉ cho `GET /inventories/**`. `POST /api/v1/internal/inventories/adjust` là đường nội bộ và hiện không kiểm tra quyền sở hữu SKU của Seller. Cần BE cung cấp endpoint có xác thực, kiểm tra quyền sở hữu sản phẩm/SKU và gateway chuyển tiếp endpoint đó trước khi FE bật thao tác nhập thêm. Không nên gọi đường internal trực tiếp từ trình duyệt.

Hợp đồng đề xuất cho BE khi phạm vi được mở: `POST /api/v1/seller/products/{productId}/variants/{variantId}/inventory-adjustments`, nhận `{ "type": "Intake" | "Adjust", "quantity": <số nguyên>, "note"?: "..." }`. Catalog xác nhận Seller sở hữu sản phẩm và biến thể trước khi gọi nghiệp vụ Fulfillment; trả số dư mới và ID dòng sổ cái. Route `/api/v1/seller/products/**` đã có trên gateway.

Nếu Seller không có kho hoạt động và hệ thống không có kho dự phòng, Catalog có thể trả `502 FULFILLMENT_UNAVAILABLE` khi tạo sản phẩm dù FE đã gửi số lượng. Việc tạo kho và lỗi liên service nằm ngoài phạm vi FE của yêu cầu này.

## File đã chỉnh sửa

- `src/features/seller/SellerScreens.tsx`: ô tồn ban đầu, payload tạo sản phẩm, ba số liệu tồn và nội dung giới hạn nhập thêm.
- `src/features/seller/SellerProductDetailScreen.tsx`: số lượng khi thêm biến thể và điều kiện kích hoạt khớp Catalog.
- `src/features/seller/services/catalog.service.ts`: kiểu biến thể có `quantity`, kiểu tồn khớp response BE.
- `src/features/seller/services/inventory-quantity.ts`: kiểm tra số lượng ban đầu dùng chung cho hai form.
- `src/features/commerce/BuyerCommerceScreens.tsx`: đọc giỏ bằng `/carts/me`.
- `src/features/commerce/services/commerce.service.ts`: cùng endpoint giỏ.
- `src/features/auth/AuthScreens.tsx`: địa chỉ hồ sơ là string.
- `tests/inventory-quantity.test.mjs`: kiểm tra giá trị 0, 10 và các đầu vào không hợp lệ.
- `reports/BAO_CAO_SUA_LOI_FE_PHASE1_2026-11-04.md`: báo cáo này.

## Kiểm tra

- `npm run typecheck`: đạt.
- ESLint cho các file nguồn đã sửa: đạt.
- `npm run test:session`: 6/6 đạt; đây là test phiên đăng nhập, không phải test xuyên suốt bốn luồng trên.
- `node --experimental-transform-types --test tests/inventory-quantity.test.mjs`: 2/2 đạt.
- `git diff --check`: đạt.
- `npm run build`: không hoàn tất trong môi trường hiện tại vì không phân giải được `fonts.googleapis.com` và lỗi quyền tạo thư mục `.next/server/app/(dashboard)/admin` (`EPERM`). Đây không phải bằng chứng rằng build production hoặc luồng runtime đã đạt.

## Rà soát thay đổi

### Standards

Review trên diff worktree so với `HEAD`: **0 vi phạm quy ước frontend còn lại** trong các dòng đã sửa; TypeScript, ESLint và kiểm tra whitespace đều đạt. Phần kiểm tra số lượng lặp giữa hai form đã được gom vào một hàm.

### Spec

Các sửa FE đáp ứng việc nhập tồn ban đầu, giỏ Buyer mới, hợp đồng địa chỉ và số liệu tồn. **1 khoảng trống chức năng còn lại**: nhập thêm/điều chỉnh SKU đã tồn tại vẫn thiếu hợp đồng API Seller an toàn. Không thể khẳng định toàn bộ kịch bản kho đã hoạt động chỉ từ thay đổi FE. Chưa có bằng chứng runtime với BE và gateway đang chạy.
