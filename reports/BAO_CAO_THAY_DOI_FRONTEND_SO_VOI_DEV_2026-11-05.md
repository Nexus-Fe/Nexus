# Báo cáo thay đổi frontend so với `dev`

Ngày rà soát: 05/11/2026. Repository: `nexus-dev`. Nhánh: `feature/cart-checkout-breadcrumbs`.

## Phạm vi và cách so sánh

- Mốc `dev`: `5f6f48efbc39a82a4cc5616806d6588dfbbf5e58` tại lúc rà soát.
- Phần đã commit: `git diff dev...HEAD -- src` (so với merge base), gồm 23 file, 1.171 dòng thêm và 149 dòng xóa.
- Phần chưa commit: `git diff -- src`, gồm 8 file đã được sửa tiếp trong workspace. Các thay đổi này chưa nằm trong commit của nhánh và có thể khác khi tạo PR.
- Đã kiểm kê toàn bộ 153 file dưới `src`, xem diff và mã hiện tại của các file khác `dev`. Báo cáo mô tả tác dụng của **mỗi file thay đổi**; các file không đổi không được phân tích từng dòng.

## File đã thay đổi trong commit của nhánh

| File | Thay đổi và tác dụng |
| --- | --- |
| `src/components/layout/Breadcrumbs.tsx` | Thêm breadcrumb theo đường dẫn và vai trò người dùng; giúp định vị trang và quay lại cấp trước. |
| `src/components/layout/Shells.tsx` | Gắn breadcrumb vào layout buyer và portal, bọc `Suspense` để xử lý phần đọc URL trên client. |
| `src/constants/navigation.ts` | Ẩn mục cấu hình đấu giá khỏi menu Admin khi màn này chưa có API vận hành. |
| `src/data/vietnam-administrative-units.json` | Lưu 34 tỉnh/thành và 3.321 phường/xã/đặc khu với mã định danh, dùng cho form địa chỉ checkout. Nguồn được khai trong file: Quyết định 19/2025/QĐ-TTg. |
| `src/features/auction/AuctionOperations.tsx` | Danh sách quản trị có tải lại khi lỗi; màn cấu hình đấu giá chuyển thành thông báo chưa khả dụng và liên kết về danh sách, tránh gọi API chưa hỗ trợ. |
| `src/features/auction/AuctionPages.tsx` | Dùng bộ chuẩn hóa trạng thái an toàn; hiển thị tên sản phẩm dự phòng khi dữ liệu thiếu. |
| `src/features/auction/contract.ts` | Kiểm tra JSON danh sách đấu giá tại runtime: phân trang, ID, trạng thái, giá, ngày và các trường khác; trả lỗi dữ liệu có thể hiển thị thay vì làm trang crash. |
| `src/features/auction/services/auction.service.ts` | Đưa response danh sách qua bộ kiểm tra hợp đồng; bỏ các phương thức cấu hình không có backend tương ứng. |
| `src/features/auction/types/index.ts` | Cập nhật kiểu nullable của SKU/tên sản phẩm và kiểu các trường bắt buộc để gần DTO hiện tại hơn. |
| `src/features/auth/AuthScreens.tsx` | Hồ sơ gửi `address` dạng chuỗi đúng với request backend; thay form mã tỉnh/quận/phường cũ bằng trường địa chỉ văn bản. |
| `src/features/catalog/CatalogScreens.tsx` | Tách phần chi tiết sản phẩm ra component riêng, giữ trang catalog làm điểm vào cho màn chi tiết. |
| `src/features/catalog/ProductDetailScreen.tsx` | Tạo trang chi tiết sản phẩm mới: ảnh, biến thể, thông số, gian hàng, tồn kho và thao tác thêm giỏ; hiển thị thông báo thêm giỏ dạng popup. |
| `src/features/commerce/BuyerCommerceScreens.tsx` | Làm lại giỏ hàng theo nhóm gian hàng, chọn sản phẩm, điều chỉnh số lượng và cảnh báo vượt tồn; bổ sung bước nhập địa chỉ checkout, danh sách đơn và chi tiết đơn. Phần checkout đã được sửa tiếp trong workspace, xem mục dưới. |
| `src/features/commerce/services/commerce.service.ts` | Chuyển đọc giỏ sang `/carts/me`, endpoint tạo giỏ rỗng cho buyer mới; thêm hàm gửi món vào giỏ. |
| `src/features/fulfillment/services/fulfillment.service.ts` | Dùng chung hàm bóc `ApiResponse`, giảm logic lặp trong service. |
| `src/features/seller/SellerProductDetailScreen.tsx` | Điều chỉnh thao tác và hiển thị chi tiết sản phẩm seller, gồm trạng thái và biến thể; có phần mở rộng lớn chưa commit. |
| `src/features/seller/SellerScreens.tsx` | Cập nhật form tạo sản phẩm, nhập tồn ban đầu và lựa chọn danh mục lá; các màn seller được mở rộng tiếp trong workspace. |
| `src/features/seller/services/catalog.service.ts` | Cập nhật request tạo sản phẩm/biến thể và luồng tồn kho để FE gọi đúng các API Catalog/Fulfillment; hiện có phần mở rộng lớn chưa commit. |
| `src/features/seller/services/category-options.ts` | Chỉ đưa danh mục lá còn hiệu lực vào lựa chọn tạo sản phẩm, hiển thị đường dẫn danh mục và giải thích lỗi danh mục không phải lá. |
| `src/features/seller/services/inventory-quantity.ts` | Kiểm tra số lượng tồn ban đầu là số nguyên trong giới hạn trước khi gửi API. |
| `src/lib/api/client.ts` | Thêm hàm chung xử lý wrapper `ApiResponse`, được nhiều service sử dụng. |
| `src/lib/api/use-api-resource.ts` | Bắt lỗi đồng bộ và Promise bị từ chối từ loader, giữ logic hủy request và cho phép tải lại. |
| `src/styles/globals.css` | Bổ sung CSS cho breadcrumb, trang chi tiết, giỏ, checkout, trạng thái tương tác và responsive; có phần sửa thêm chưa commit. |

## Sửa đổi `src` chưa commit trong workspace

| File | Tác dụng của phần sửa tiếp sau commit |
| --- | --- |
| `src/components/layout/Breadcrumbs.tsx` | Điều chỉnh cách xác định hoặc hiển thị nhãn breadcrumb. |
| `src/features/commerce/BuyerCommerceScreens.tsx` | Bổ sung phí giao cố định, lấy số dư Ví Nexus, báo giá và tạo đơn qua API; cập nhật danh sách/chi tiết đơn, xác nhận nhận hàng và kiểm tra địa chỉ theo tỉnh/phường. Đây là thay đổi chức năng đáng kể cần xem riêng khi tạo PR. |
| `src/features/seller/SellerProductDetailScreen.tsx` | Thêm form sửa thông tin/thông số, quản lý biến thể, nhập kho nhanh, ảnh chính và trạng thái sản phẩm. |
| `src/features/seller/SellerScreens.tsx` | Mở rộng form tạo sản phẩm nhiều biến thể/ảnh/thông số; thêm kho, danh sách và chi tiết đơn seller, vận chuyển, hồ sơ gian hàng. |
| `src/features/seller/services/catalog.service.ts` | Bổ sung kiểu DTO và các lời gọi cho sản phẩm, biến thể, ảnh, kho và kho hàng; là lớp API phục vụ hai màn seller trên. |
| `src/features/wallet/WalletOperationsScreens.tsx` | Mở rộng màn nạp tiền buyer, ví seller và yêu cầu rút tiền. |
| `src/features/wallet/WalletScreen.tsx` | Bổ sung nhãn loại/trạng thái giao dịch và trình bày số dư/lịch sử ví. |
| `src/styles/globals.css` | Thêm các style mới cho checkout, seller và wallet cùng điều chỉnh responsive. |

Ngoài `src`, `next.config.ts` cũng đang sửa chưa commit; các file trong `design-plans/` và `reports/` cũng chưa theo dõi. Chúng không thuộc bảng kiểm kê source phía trên.

## Ghi chú kiểm tra

- Sự có mặt của UI hoặc lời gọi API trong mã nguồn chưa xác nhận luồng chạy thành công với backend và dữ liệu thật.
- File `BuyerCommerceScreens.tsx`, `SellerScreens.tsx` và `SellerProductDetailScreen.tsx` hiện chứa nhiều màn cùng trong một file; các thay đổi chưa commit cần được review theo từng luồng trước khi nhập nhánh.
- Danh mục hành chính là ảnh chụp theo Quyết định 19/2025/QĐ-TTg; khi pháp lý thay đổi cần cập nhật file dữ liệu.

## Code review: Standards

`AGENTS.md` chỉ yêu cầu đọc tài liệu Next.js cục bộ trước khi viết mã; diff không đủ bằng chứng để kết luận có vi phạm. Ba nhận định dưới đây là vấn đề bảo trì theo heuristic, không phải lỗi lint:

1. **P3 · Logic lặp:** `SellerScreens.tsx:424` và `SellerProductDetailScreen.tsx:53` cùng chuyển dòng thông số thành JSON và lặp giao diện nhập thông số. Dùng chung bộ chuyển đổi để form tạo/sửa không lệch nhau.
2. **P3 · Nhiều trách nhiệm:** `SellerScreens.tsx` hơn 2.100 dòng, chứa tạo sản phẩm, kho, vận chuyển, đơn hàng và gian hàng. Nên tách theo màn khi tiếp tục phát triển.
3. **P3 · Logic lặp:** `BuyerCommerceScreens.tsx:68` và `SellerScreens.tsx:1660` cùng chuẩn hóa mã trạng thái bằng regex. Có thể dùng chung hàm chuẩn hóa, giữ nhãn theo vai trò.

Tổng Standards: **0 vi phạm quy ước đã chứng minh; 3 nhận định bảo trì**. Mức cao nhất: P3.

## Code review: Spec và hành vi

Không có một spec duy nhất cho toàn bộ nhánh; đối chiếu theo các yêu cầu trong chuỗi công việc. Phát hiện cụ thể trong phần checkout **chưa commit**:

1. **P1 · Tổng tiền nhiều gian hàng bị tính thiếu:** `BuyerCommerceScreens.tsx:374,476,606` dùng phí vận chuyển cố định 30.000 ₫ cho cả giỏ. `CommerceService/Commerce.Application/Services/Order/OrderService.cs:98-127` tính phí trên **từng gian hàng**, có thể gọi Fulfillment để nhận mức thực tế. Giỏ từ hai seller trở lên sẽ có tổng tiền và kiểm tra đủ số dư ví sai; màn thành công cũng hiển thị sai phí. Cần lấy tổng và phí từ response quote của backend, đồng thời trình bày số tiền trước quote là ước tính.

Tổng Spec: **1 lỗi hành vi đã xác minh**, mức cao nhất P1. Báo cáo này không sửa code sản phẩm.
