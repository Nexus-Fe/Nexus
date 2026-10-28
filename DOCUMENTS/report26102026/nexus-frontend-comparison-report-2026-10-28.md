# Báo cáo đối chiếu Nexus CSR với `fsa-nexus-fe` cũ

**Ngày lập:** 2026-10-28  
**Phạm vi:** So sánh mã nguồn frontend Nexus hiện tại với bản 22 màn hình trong `fsa-nexus-fe@d0817a8`, tập trung vào SSR/CSR, đăng nhập/đăng ký và kết nối API.

## 1. Mốc và phạm vi so sánh

Checkout `fsa-nexus-fe` hiện có trên máy đang ở `main@022afd4` và chỉ chứa bộ khung 19 route. Commit lịch sử `d0817a8eb02876d5bf25a4da1db33b777aca5750` trong Git object database là bộ giao diện 22 màn được nhắc đến. Commit này có parent là `022afd4`.

Báo cáo lấy commit `d0817a8` làm baseline đối chiếu với working tree Nexus hiện tại. Các thay đổi triển khai trong Nexus chưa được commit; do đó đây là so sánh cây mã nguồn, không phải diff giữa hai commit nhánh đã hoàn tất.

**Kết luận nhanh:** mã đăng nhập/đăng ký trong Nexus đã được viết để gọi API thật, nhưng chưa hoạt động end-to-end trong môi trường hiện tại. Gateway đang sẵn sàng, còn UserService đang dừng theo chỉ dẫn; chưa có phiên đăng nhập hay đăng ký nào được xác nhận thành công.

## 2. Khác biệt chính

| Hạng mục | `fsa-nexus-fe@d0817a8` | Nexus hiện tại |
|---|---|---|
| Rendering | Các screen dùng Server Components mặc định. Một số màn Catalog tải dữ liệu ở phía server; các màn còn lại phần lớn là giao diện tĩnh. | 22 screen và các shell được tải qua Client Components với `dynamic(..., { ssr: false })`. Next.js vẫn điều phối URL và phục vụ metadata, CSS, JavaScript; nội dung nghiệp vụ xuất hiện sau khi trình duyệt tải screen. |
| Định tuyến | Có ma trận 22 route. | Vẫn có 22 route, nhưng page/layout được nối qua client-only wrappers và shell theo vai trò. Route chi tiết hỗ trợ ID động. |
| Đăng nhập/đăng ký | Form chỉ để trình bày; nút dùng `DisabledAction`, không submit, không lưu phiên. | Form có submit, xử lý lỗi và trạng thái chờ. Đăng ký có bước xác minh OTP và gửi lại mã. |
| Nguồn dữ liệu | Phần Catalog dùng helper `server-only` để đọc Gateway và Catalog Service từ phía server. Các màn khác chưa có luồng API nghiệp vụ. | Browser gọi API qua BFF cùng origin `/api/gateway/...`; BFF chuyển tiếp đến Gateway và chỉ nhận phản hồi có `Real` cùng `Enforce`. Không có mock fallback. |
| Phiên người dùng | Không có đăng nhập hoạt động trong bộ 22 màn cũ. | Lưu access/refresh token trong `sessionStorage`; sau login lấy profile qua `/api/v1/me`. Có refresh token, logout và kiểm tra role ở client. |

Các screen và layout gốc được giữ lại phần lớn về mặt giao diện; thay đổi lớn nằm ở ranh giới rendering và luồng dữ liệu. Kế hoạch CSR trong Nexus cũng ghi nhận nguồn chuẩn là commit `d0817a8` và đủ 22 route: [`nexus-csr-implementation-plan.md`](nexus-csr-implementation-plan.md).

## 3. Đăng nhập và đăng ký: đã hoạt động đến đâu?

### Frontend đã triển khai

- Login gửi `username` và `password` lên `POST /api/v1/auth/login`, lưu hai token, rồi gọi `GET /api/v1/me` để lấy hồ sơ. Nếu lấy hồ sơ thất bại, frontend xóa token vừa lưu. Mã nằm trong [`AuthScreens.tsx`](../../src/features/auth/AuthScreens.tsx) và [`auth.service.ts`](../../src/features/auth/services/auth.service.ts).
- Register gửi thông tin tài khoản lên `POST /api/v1/auth/register`; khi request thành công, giao diện chuyển sang bước OTP. Xác minh và gửi lại mã lần lượt gọi `/api/v1/auth/otp/verify` và `/api/v1/auth/otp/resend`.
- Session khi tải lại trang được kiểm tra qua `/api/v1/me`. RoleGate chặn trải nghiệm truy cập theo role ở client; Gateway vẫn phải thực thi quyền ở backend.

### Runtime hiện tại chưa hoàn tất

- Kiểm tra gần nhất cho thấy Gateway `GET /health/ready` trả `200`; container nghiệp vụ duy nhất đang chạy là Gateway cùng hạ tầng dùng chung. Không có dịch vụ lắng nghe ở các cổng `8001–8009`.
- UserService đang dừng theo yêu cầu vì startup chạy `Database.Migrate()` lên PostgreSQL. Vì vậy frontend chưa thể hoàn tất login/register qua UserService. Đăng ký còn phụ thuộc database và SMTP để gửi OTP.
- Không gửi request login hoặc tạo tài khoản thử; chưa có kết quả xác thực bằng tài khoản thật.
- Có lệch route refresh: frontend/Gateway dùng `/api/v1/auth/refresh`, còn User API khai báo `/api/v1/auth/refresh-token`. Vì vậy refresh phiên chưa khớp hợp đồng hiện tại.

**Kết luận auth:** form và code gọi API đã có; đăng nhập, đăng ký và OTP chưa được xác nhận hoạt động thực tế trong môi trường này.

## 4. API được nối khác với bản cũ ra sao?

| Nhóm | Bản 22 màn cũ | Nexus hiện tại và tình trạng |
|---|---|---|
| Auth | Không gọi API; các nút bị vô hiệu hóa. | Gọi login/register/OTP/profile qua BFF. Các endpoint auth chính khớp User API theo audit; refresh bị lệch route và UserService hiện đang dừng. |
| Catalog | Đọc dữ liệu Catalog ở server, qua helper Gateway và Catalog Service. | Gọi từ browser các đường dẫn như `/api/v1/products`, `/api/v1/product/{id}`, `/api/v1/categories`. Gateway đang chạy Real/Enforce nhưng request đọc sản phẩm trả **504**; đường dẫn Gateway và Catalog downstream có mismatch. |
| Cart, checkout, orders | Giao diện tĩnh, không có thao tác nghiệp vụ. | Đã có request tới `/api/v1/cart*`, `/checkout/quote`, `/orders` và `/order/{id}`; Commerce API hiện chỉ có health endpoint, chưa có business REST API. |
| Auction, Fulfillment | Giao diện tĩnh. | Có request đấu giá, đặt giá và shipment; Auction/Fulfillment hiện chưa có business endpoint tương ứng. |
| Wallet | Giao diện tĩnh. | Wallet API phía backend chỉ công khai gRPC cho dữ liệu nghiệp vụ; màn Nexus hiện giải thích chưa khả dụng và không gửi giao dịch ví. |
| Staff/Admin | Giao diện tĩnh. | Có request tới seller registrations, reports, users và roles; User API hiện chưa có các controller quản trị tương ứng. |

Điểm khác biệt quan trọng là Nexus có đường truyền API thật, nhưng **có request trong frontend không đồng nghĩa endpoint downstream đã tồn tại**. Một số màn hiện bật thao tác ghi như tạo sản phẩm, nhập kho, đặt giá, tạo đơn hoặc cập nhật quyền dù audit chưa tìm thấy endpoint backend tương ứng; chúng có thể trả lỗi và chưa chứng minh thao tác thành công. Chi tiết route mismatch và endpoint còn thiếu nằm trong [`csr-real-backend-audit.md`](../../design-plans/csr-real-backend-audit.md).

Tài liệu kiến trúc yêu cầu request thuộc service của feature, nhưng một số screen hiện gọi generic `api` trực tiếp. Đây là điểm cần đối chiếu với ranh giới feature đã ghi trong [`src/features/README.md`](../../src/features/README.md).

## 5. Kiểm chứng và review hai trục

Production build đã tạo đủ 22 route; `lint`, `typecheck` và `build` đã qua trong lượt triển khai trước. Build chứng minh code biên dịch và route tồn tại, không chứng minh login hay nghiệp vụ backend chạy thành công. Request Catalog đọc-only gần nhất trả `504` với `X-Gateway-Mode: Real` và `X-Gateway-Auth: Enforce`.

### Standards

- **Khả năng lệch chuẩn kiến trúc:** `SessionProvider` gọi `/api/v1/me` qua generic API client thay vì dùng public `profileService` của feature profile. Chuẩn được ghi trong `src/features/README.md`.
- **Code smell — judgement call:** logic unwrap response envelope bị lặp ở Admin, Staff và Catalog; có thể gom thành adapter dùng chung.

### Spec

- **Chưa hoàn tất vận hành thật:** kế hoạch yêu cầu screen dùng API thật và thể hiện đúng loading/empty/error/retry. Nhiều màn chưa thể vận hành do Catalog mismatch và thiếu endpoint các domain khác.
- **Thao tác ghi chưa khớp điều kiện bật:** kế hoạch yêu cầu chỉ bật thao tác sau khi hợp đồng và endpoint thật được xác nhận; một số thao tác ghi hiện vẫn gửi request tới route chưa có downstream tương ứng.
- **Auth mới triển khai một phần:** frontend có login/register/OTP, nhưng runtime chưa hoàn tất với UserService; refresh-token path cũng không khớp.

**Tổng review:** Standards có 1 điểm kiến trúc cần xem xét và 1 smell mang tính judgement call; Spec có 3 phát hiện, trong đó vấn đề lớn nhất là các luồng nghiệp vụ chưa có backend tương ứng.
