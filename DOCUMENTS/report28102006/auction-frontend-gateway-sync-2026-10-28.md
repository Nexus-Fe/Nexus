# Báo cáo đồng bộ frontend đấu giá với Gateway — 28/10/2026

## Mốc và phạm vi

- Mốc Git: `c09db94461ece2dd9c74f555f3569c9a8fb5f212` (`dev`). Các thay đổi nêu dưới đây đang ở worktree, chưa commit.
- Phạm vi: luồng Buyer, Seller, Staff, Admin của module đấu giá; hợp đồng đối chiếu là `ApiGateway/Nexus.Gateway/Controllers/AuctionController.cs`, `Common/AuctionValidation.cs` và `Seeds/auction/*.json` trong `fsa-nexus-be`.
- Không thay đổi backend. `Auction.Api/Program.cs` hiện chỉ map `/health`; kết quả ở Gateway Real phụ thuộc REST handlers của Auction Service.

## Việc đã làm

1. Sửa `src/features/auction/validation.ts`: chấp nhận GUID dạng `8-4-4-4-12` gồm ký tự hex, không bắt buộc version/variant bits. Seed `a1000000-0000-0000-0000-000000000001` giờ đi qua route và các client resource dùng `isAuctionId`. Trước đó route gọi `notFound()` trước khi request detail.
2. Giữ `notFound()` tại route `/auctions/[id]` cho ID sai. Màn `not-found.tsx` và `AuctionUnavailableState` từ thay đổi trước hiển thị thông báo yêu cầu và nút về danh sách. Detail API trả 404 cũng dùng màn này; lỗi 401/403/5xx và mạng vẫn đi qua thông báo lỗi thông thường.
3. Đồng bộ `status-history`: Gateway dùng `GET /api/v1/auctions/{id}/status-history` và seed trả `{auctionId, items}` không có pagination. Frontend bỏ query page, state phân trang và type pagination của response này.
4. Đồng bộ cấu hình Admin: Gateway dùng `GET /api/v1/admin/auction-configs` không có pagination; seed trả `{items}`. Frontend bỏ query page, phân trang UI và sửa type response thành `AuctionConfigList`.
5. Đối chiếu phần còn lại: route danh sách, detail, bids, kết quả, Seller list/create/update/cancel/recreate, Admin force-cancel/saga/update-config khớp path và method trong controller. Các danh sách đi qua `ForwardPagedAsync`, vốn tạo metadata phân trang cho frontend. `Idempotency-Key` và `If-Match` vẫn được gửi khi đặt giá.
6. Chặn payload chi tiết có `auctionId` khác ID trong URL ngay ở `auctionService.detail`, áp dụng chung cho Buyer/Seller/Staff/Admin. Gateway Mock dùng một seed chi tiết `…001` cho nhiều ID trong danh sách; frontend giờ báo lỗi cụ thể thay vì hiển thị nhầm phiên. Sửa thông báo ETag xung đột thành “Đang tải lại thông tin” vì `reload()` chỉ kích hoạt fetch, không chờ fetch kết thúc.

## Kiểm tra và giới hạn

- `npm run typecheck`: đạt. `git diff --check`: đạt.
- `npm run lint`: đạt.
- `npm run build`: đạt sau khi cho phép Next ghi `.next`; route `/auctions/[id]` nằm trong output build.
- Đọc `http://localhost:3000/auctions/a1000000-0000-0000-0000-000000000001`: HTTP 200 sau khi sửa validator. `/auctions/not-a-uuid` render thông báo không khả dụng; Next streaming trả HTTP 200 trong lần đọc này. Request BFF `GET /api/gateway/api/v1/auctions/a1000000-0000-0000-0000-000000000001` hiện trả 502, nên chưa thể xác nhận chi tiết render từ backend ở môi trường local.
- Chưa xác nhận bằng browser rằng các màn 1440px/768px/390px và toàn bộ thao tác chạy với Gateway đang hoạt động. Đọc HTTP localhost được, nhưng Computer Use báo `Local browser use is disabled in Work settings`; quyền điều khiển Brave cũng bị từ chối. Không coi typecheck hay build là bằng chứng runtime của UI.
- Mock detail seed có một phiên cố định `…001`; các ID khác từ list bị frontend chặn khi response detail không khớp. Muốn xem chi tiết đúng cho mọi phiên trong Mock mode, Gateway cần fixture theo ID.
- Seed `RUNNING` có giờ kết thúc 26/10/2026, đã qua ở ngày báo cáo. Gateway Mock detail cũng chưa xác nhận cung cấp ETag. Vì vậy chưa thể nghiệm thu gửi giá từ fixture hiện tại; frontend không tự tạo ETag hoặc kéo dài phiên.
- `Auction.Api` chưa có REST handlers cho những endpoint này; Gateway Real có thể trả lỗi dù frontend đã đồng bộ hợp đồng Gateway.
- Review hai trục đã đọc worktree diff so với `HEAD`: Standards không thấy vi phạm quy tắc repo; lưu ý hàm `submit` trong `AuctionPages.tsx` còn dày, nên tách nhỏ khi chỉnh luồng đặt giá tiếp. Spec phát hiện mismatch `auctionId` giữa detail và URL; đã sửa ở service. Theo đúng cơ chế skill, `dev...HEAD` vẫn là diff commit rỗng nên chưa có review chính thức trên commit.
