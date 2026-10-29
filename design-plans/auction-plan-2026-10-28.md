# Đồng bộ frontend với hợp đồng đấu giá của Gateway

## Tóm tắt

Đồng bộ toàn bộ module đấu giá ở Buyer, Seller, Staff và Admin theo route, validation và dữ liệu mẫu runtime của Gateway REST. Mục tiêu gần nhất là mở được UUID mà backend chấp nhận, sau đó hiển thị ổn định danh sách, chi tiết, lịch sử, kết quả và dữ liệu vận hành theo đúng payload.

Mốc code-review sau triển khai: `c09db94461ece2dd9c74f555f3569c9a8fb5f212`.

## Thay đổi dự kiến

- **UUID:** sửa validator dùng chung để chấp nhận UUID dạng chuẩn `8-4-4-4-12` bất kể nibble version/variant. Dùng cùng validator ở route public, trang detail và các luồng Seller/Staff/Admin. Kiểm tra `a1000000-0000-0000-0000-000000000001`: Gateway dùng `Guid.TryParse` và trả fixture 200 cho ID này, nhưng regex frontend hiện từ chối trước khi gọi API.
- **Hợp đồng dữ liệu:** đối chiếu service và TypeScript types với JSON runtime trong `ApiGateway/Nexus.Gateway/Seeds/auction/` cho summary, detail, bids, kết quả, lịch sử, saga và cấu hình. Giữ nullable/optional đúng payload; không ép các trường không có vào UI. Ưu tiên route/controller behavior và mock seed payload làm chuẩn hiển thị; các response DTO trong `AuctionRequests.cs` hiện chỉ là cấu trúc Swagger rút gọn, không đại diện đầy đủ seed payload.
- **Request và trạng thái:** xác nhận query `page`, `pageSize`, `status`; các status enum; body tạo/sửa/hủy/tạo lại; và yêu cầu `Idempotency-Key` + `If-Match` khi đặt giá. Giữ cách xử lý lỗi riêng biệt giữa ID sai, phiên không tồn tại, lỗi quyền, lỗi mạng và lỗi dịch vụ.
- **Giao diện theo vai trò:** kiểm tra Buyer list/detail/bids/result; Seller list/detail/create/edit/recreate/result; Staff list/detail/history; Admin list/detail/saga/force-cancel/config. Mỗi màn chỉ hiển thị trường có trong payload tương ứng; giữ phân trang và hành động theo quyền/trạng thái hiện có.
- **Giới hạn backend:** không sửa backend theo phạm vi đã chọn. `Auction.Api/Program.cs` hiện chỉ map `/health`; vì vậy chế độ Gateway `Real` cần downstream REST handlers trước khi có thể xác nhận dữ liệu production. Không thêm dữ liệu giả hoặc fallback trong frontend.

## Kiểm tra nghiệm thu

- Dùng UUID mẫu `a1000000-0000-0000-0000-000000000001`: route không gọi `notFound()`, request detail được gửi và dữ liệu phiên render.
- UUID sai định dạng vẫn hiện màn không khả dụng; UUID hợp lệ nhưng API trả 404 hiện cùng trạng thái đó. Lỗi 401/403, mạng và 5xx giữ thông báo riêng.
- Đối chiếu response thực tế của từng seed với types và màn hình thuộc vai trò tương ứng; kiểm tra phân trang, trạng thái phiên, đặt giá với ETag/idempotency và hành động quản trị.
- Chạy lint, typecheck và build; kiểm tra giao diện tại 1440px, 768px và 390px.
- Sau khi có diff, review Standards và Spec riêng theo skill `code-review`, dùng mốc `c09db944…` và hợp đồng Gateway đã nêu ở trên.

## Giả định

- Phạm vi là toàn bộ frontend module đấu giá; backend không nằm trong thay đổi.
- Chuẩn hiển thị là Gateway REST và mock fixtures. Kết quả khi chạy Gateway `Real` phụ thuộc Auction Service triển khai các REST endpoints tương ứng.
- Không thay đổi quy tắc nghiệp vụ hoặc tự suy diễn giá trị chưa được backend trả về.
